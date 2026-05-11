import Anthropic from "@anthropic-ai/sdk";
import JSON5 from "json5";
import { getSession } from "@/lib/session";
import { geminiText } from "@/lib/gemini";

const DEFAULT_MODEL = process.env.CLAUDE_COPY_MODEL || "claude-sonnet-4-5";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest";

type ClaudeOpts = {
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** When true, request JSON-only output from providers that support it. */
  jsonMode?: boolean;
};

type Provider = "anthropic" | "mistral" | "groq" | "gemini";

/**
 * Categorise an error so the fallback chain knows whether to skip to the next
 * provider (recoverable) or bubble up (real bug).
 *
 * Recoverable: empty/missing key, exhausted credit, rate limit, quota,
 * upstream 5xx. Anything else throws so we don't silently mask real bugs.
 */
function isFallbackError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("not configured") ||
    msg.includes("no api key") ||
    msg.includes("credit balance") ||
    msg.includes("insufficient_credits") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("overloaded")
  );
}

async function resolveAnthropicKey(): Promise<string | null> {
  const session = await getSession();
  return session.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}

/**
 * Per-provider wall-clock cap. Generous enough for a real response under
 * load, tight enough that a single slow provider can't burn the whole
 * request budget. Override via PROVIDER_TIMEOUT_MS env var if needed.
 */
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 90_000);

async function tryAnthropic(opts: ClaudeOpts): Promise<string> {
  const key = await resolveAnthropicKey();
  if (!key) throw new Error("Anthropic API key not configured");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create(
      {
        model: opts.model || DEFAULT_MODEL,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.6,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      },
      { signal: controller.signal },
    );
    return msg.content
      .map((b) => ("text" in b ? b.text : ""))
      .join("")
      .trim();
  } finally {
    clearTimeout(t);
  }
}

async function tryMistral(opts: ClaudeOpts): Promise<string> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("Mistral API key not configured");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.6,
        ...(opts.jsonMode
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Mistral ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(t);
  }
}

async function tryGroq(opts: ClaudeOpts): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq API key not configured");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.6,
        ...(opts.jsonMode
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(t);
  }
}

async function tryGemini(opts: ClaudeOpts): Promise<string> {
  return geminiText({
    prompt: opts.prompt,
    system: opts.system,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
}

const PROVIDER_FNS: Record<Provider, (opts: ClaudeOpts) => Promise<string>> = {
  anthropic: tryAnthropic,
  mistral: tryMistral,
  groq: tryGroq,
  gemini: tryGemini,
};

/**
 * Four-tier fallback chain: Claude → Mistral → Groq → Gemini.
 *
 * Each tier is tried in order. On a recoverable error (credit / rate-limit /
 * quota / 5xx) we move to the next provider. The error from the *last* tried
 * provider is surfaced — so the user always sees the most specific failure.
 *
 * Empty bodies count as a failure too — a blank string would crash the JSON
 * parser in claudeJson() anyway.
 */
async function callWithFallback(opts: ClaudeOpts): Promise<{ text: string; provider: Provider }> {
  const errors: Array<{ provider: Provider; error: unknown }> = [];

  for (const provider of ["anthropic", "mistral", "groq", "gemini"] as const) {
    try {
      const text = await PROVIDER_FNS[provider](opts);
      if (!text) {
        errors.push({ provider, error: new Error(`${provider} returned empty response`) });
        continue;
      }
      return { text, provider };
    } catch (e) {
      errors.push({ provider, error: e });
      if (!isFallbackError(e)) {
        // Non-recoverable error (e.g. bad request, auth issue with a working
        // key) — don't silently mask it by trying the next tier.
        throw e;
      }
      console.warn(
        `[claude] ${provider} failed (${(e as Error).message.slice(0, 120)}), falling back…`,
      );
    }
  }

  const lastErr = errors[errors.length - 1]?.error;
  const summary = errors
    .map((x) => `${x.provider}: ${(x.error as Error).message.split("\n")[0].slice(0, 120)}`)
    .join(" | ");
  throw new Error(`All AI providers failed → ${summary}`, {
    cause: lastErr,
  });
}

export async function claudeText(opts: ClaudeOpts): Promise<string> {
  const { text } = await callWithFallback(opts);
  return text;
}

export async function claudeJson<T = unknown>(opts: ClaudeOpts): Promise<T> {
  // JSON tasks need significant headroom. The copy schema has 24 alivio
  // metafields, many being long string arrays + FAQs — easily 8-12K output
  // tokens. Caller-supplied maxTokens is treated as a *floor*; we always
  // ensure at least 16384 so truncation doesn't silently corrupt the JSON.
  const maxTokens = Math.max(opts.maxTokens ?? 16384, 8192);
  const text = await claudeText({
    ...opts,
    maxTokens,
    temperature: opts.temperature ?? 0.3,
    // Force JSON mode on providers that support it (Mistral, Groq) — drops
    // the rate of markdown-fence-wrapped or partially-invalid output to ~0.
    jsonMode: true,
  });
  return parseJsonLoose<T>(text);
}

export async function getClaudeKeySource(): Promise<
  "alivio" | "user" | "mistral" | "groq" | "gemini"
> {
  const session = await getSession();
  if (session.anthropicApiKey) return "user";
  if (process.env.ANTHROPIC_API_KEY) return "alivio";
  if (process.env.MISTRAL_API_KEY) return "mistral";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY || session.geminiApiKey) return "gemini";
  return "alivio";
}

/**
 * Tolerant JSON extractor. Handles:
 *  - Markdown fences (```json ... ```)
 *  - Prose before/after the JSON block
 *  - Common LLM truncation (closes dangling strings / arrays / objects)
 *  - The `{ metafields: { ... } }` and `{ output: { ... } }` wrapper patterns
 *    some models fall into despite the prompt asking for a flat object.
 */
function parseJsonLoose<T>(text: string): T {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const firstBrace = Math.min(
    ...[t.indexOf("{"), t.indexOf("[")]
      .filter((i) => i >= 0)
      .concat([Number.POSITIVE_INFINITY]),
  );
  const lastBrace = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (firstBrace !== Number.POSITIVE_INFINITY && lastBrace > firstBrace) {
    t = t.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  parsed = tryParseChain(t);
  if (parsed === PARSE_FAIL) {
    throw new Error(
      `AI returned invalid JSON (${text.length} chars). Last 400 chars:\n${text.slice(-400)}`,
    );
  }

  // Some models wrap the schema in an outer key. Unwrap if there's exactly one
  // top-level key with an object value AND the inner object looks like our
  // expected shape (any "alivio.*" or "seo_title"-ish keys).
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    Object.keys(parsed).length === 1
  ) {
    const onlyKey = Object.keys(parsed)[0];
    const inner = (parsed as Record<string, unknown>)[onlyKey];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const innerKeys = Object.keys(inner as Record<string, unknown>);
      const looksLikeOurSchema = innerKeys.some(
        (k) => k.startsWith("alivio.") || k === "seo_title" || k === "handle",
      );
      if (looksLikeOurSchema) parsed = inner;
    }
  }

  return parsed as T;
}

/**
 * Best-effort repair of LLM-truncated JSON. Tries to close any open string
 * literal, then balances braces/brackets. Not foolproof — if the cut landed
 * mid-key it's gone — but recovers from the common "cut in the middle of a
 * value" case.
 */
/**
 * Best-effort repair of LLM-truncated JSON.
 *
 * Strategy: walk back from the end to the last "safe" cut point — the last
 * comma that's not inside a string. Anything after that is partial garbage
 * (mid-key, mid-value, dangling colon) — drop it. Then balance braces.
 *
 * This works for ANY cut shape: mid-key like `"alivio.hero_descrip`, mid-
 * value, dangling colon, half-closed array. The cost is dropping the last
 * field — but a corrupt last field would have crashed JSON.parse anyway.
 */
// Sentinel for the recovery chain to signal "all parses failed".
const PARSE_FAIL = Symbol("PARSE_FAIL");

/**
 * Run a cascade of progressively-more-lenient JSON parses against the LLM
 * output. The cascade is:
 *   1. Strict JSON.parse — fast path, matches well-behaved models.
 *   2. Escape raw control chars inside string literals.
 *   3. Truncation repair (trim to last safe comma + balance braces).
 *   4. Both repairs combined.
 *   5. Strip trailing commas (common LLM JSON tic).
 *   6. JSON5.parse — handles single-quoted keys/values, unquoted keys,
 *      trailing commas, comments, etc. — the most forgiving of all.
 *   7. JSON5 + truncation repair + control-char escape combined.
 *
 * Returns the parsed value, or the PARSE_FAIL sentinel if every layer rejects.
 */
function tryParseChain(t: string): unknown {
  // 1. Strict
  try { return JSON.parse(t); } catch {}
  // 2. Control-char escape
  try { return JSON.parse(escapeControlCharsInJsonStrings(t)); } catch {}
  // 3. Truncation repair
  let trunc: string;
  try {
    trunc = repairTruncatedJson(t);
    return JSON.parse(trunc);
  } catch {
    trunc = repairTruncatedJson(t);
  }
  // 4. Combined repairs
  try {
    return JSON.parse(escapeControlCharsInJsonStrings(trunc));
  } catch {}
  // 5. Strip trailing commas
  const noTrailing = (s: string) => s.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(noTrailing(t)); } catch {}
  try { return JSON.parse(noTrailing(escapeControlCharsInJsonStrings(t))); } catch {}
  // 6. JSON5 (handles single quotes, unquoted keys, trailing commas, comments)
  try { return JSON5.parse(t); } catch {}
  try { return JSON5.parse(escapeControlCharsInJsonStrings(t)); } catch {}
  // 7. JSON5 + truncation repair
  try { return JSON5.parse(trunc); } catch {}
  try { return JSON5.parse(escapeControlCharsInJsonStrings(trunc)); } catch {}
  return PARSE_FAIL;
}

/**
 * Walk a JSON string and escape raw control chars (newline, tab, CR, BS, FF,
 * vertical tab) that appear *inside* string literals. Fallback LLM providers
 * frequently emit these unescaped — strict JSON.parse rejects them but
 * substituting the proper \\n / \\t / etc. recovers cleanly.
 *
 * Outside string literals the source is left untouched, so this is safe to
 * run unconditionally before parsing.
 */
function escapeControlCharsInJsonStrings(src: string): string {
  let out = "";
  let inStr = false;
  let escape = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (escape) {
      out += c;
      escape = false;
      continue;
    }
    if (c === "\\") {
      out += c;
      escape = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      out += c;
      continue;
    }
    if (inStr) {
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") {
        out += "\\r";
        continue;
      }
      if (c === "\t") {
        out += "\\t";
        continue;
      }
      if (c === "\b") {
        out += "\\b";
        continue;
      }
      if (c === "\f") {
        out += "\\f";
        continue;
      }
      // Any other ASCII control char — strip it.
      const code = c.charCodeAt(0);
      if (code < 0x20) continue;
    }
    out += c;
  }
  return out;
}

function repairTruncatedJson(src: string): string {
  // Walk through src tracking string state and bracket depth, recording the
  // index of every comma that occurs at the outermost-property level. The
  // last such comma is our safe cut point.
  let inStr = false;
  let escape = false;
  const depthStack: Array<"{" | "["> = [];
  // safe[depth] = last comma index at this nesting depth
  let lastTopLevelComma = -1;
  // Also remember the position of the matching opening brace/bracket so we
  // know whether trimming to a comma keeps us at a valid spot.
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "{" || c === "[") {
      depthStack.push(c as "{" | "[");
    } else if (c === "}" || c === "]") {
      depthStack.pop();
    } else if (c === "," && depthStack.length === 1) {
      // We're inside the outer object/array — this is a property boundary.
      lastTopLevelComma = i;
    }
  }

  let s: string;
  if (lastTopLevelComma > 0) {
    // Truncate to the byte just before the last comma — that drops the
    // half-written final property.
    s = src.slice(0, lastTopLevelComma);
  } else {
    // No safe comma found. Fall back to: close any open string + balance.
    s = src;
    if (inStr) s += '"';
  }

  // Strip any leftover trailing whitespace/comma/colon dribble.
  s = s.replace(/[\s,:]+$/u, "");
  // If a trailing `"key"` (with no colon yet) got left in, drop it.
  s = s.replace(/,?\s*"[^"]*"\s*$/u, "");
  s = s.replace(/[\s,]+$/u, "");

  // Balance braces by walking again — count what's still open and append
  // closers in reverse.
  inStr = false;
  escape = false;
  const order: Array<"{" | "["> = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "{") order.push("{");
    else if (c === "[") order.push("[");
    else if (c === "}" || c === "]") order.pop();
  }
  for (let i = order.length - 1; i >= 0; i--) {
    s += order[i] === "{" ? "}" : "]";
  }
  return s;
}
