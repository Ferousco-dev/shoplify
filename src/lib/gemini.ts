import { getSession } from "@/lib/session";

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

async function resolveApiKey(): Promise<string> {
  const session = await getSession();
  if (session.geminiApiKey) return session.geminiApiKey;
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey) throw new Error("GEMINI_API_KEY not configured");
  return envKey;
}

type GeminiTextResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

/**
 * Generate text via Gemini. Used as the final fallback in the AI chain:
 *  Claude (Sonnet) → Groq (Llama) → Gemini (Flash).
 *
 * Returns the concatenated text from the first candidate. Throws on HTTP
 * errors or when Gemini returns no text part.
 */
export async function geminiText(opts: {
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = await resolveApiKey();
  const url = `${BASE}/models/${opts.model || TEXT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      ...(opts.system
        ? { systemInstruction: { parts: [{ text: opts.system }] } }
        : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.6,
        // Default 8192 to match Claude's safe ceiling for the copy schema —
        // the spoonie metafield block can easily exceed 4K tokens.
        maxOutputTokens: opts.maxTokens ?? 8192,
        responseMimeType: "text/plain",
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini text ${res.status}: ${text.slice(0, 400)}`);
  }
  const body = (await res.json()) as GeminiTextResponse;
  const parts = body.candidates?.[0]?.content?.parts || [];
  const out = parts
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!out) throw new Error("Gemini returned no text part");
  return out;
}

export type GeminiImageResult = {
  bytes: Uint8Array;
  mimeType: string;
};

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type InlineData = { data?: string; mimeType?: string; mime_type?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; inlineData?: InlineData; inline_data?: InlineData }>;
    };
  }>;
};

/**
 * Generate one image via Gemini (Nano Banana).
 * Accepts optional reference images (e.g. supplier product photos) which Gemini
 * uses as visual anchors — important for keeping the product consistent.
 */
export async function geminiImage(opts: {
  prompt: string;
  referenceImages?: Array<{ bytes: Uint8Array; mimeType: string }>;
  model?: string;
}): Promise<GeminiImageResult> {
  const apiKey = await resolveApiKey();

  const parts: Part[] = [{ text: opts.prompt }];
  for (const ref of opts.referenceImages || []) {
    parts.push({
      inline_data: {
        mime_type: ref.mimeType || "image/jpeg",
        data: bytesToBase64(ref.bytes),
      },
    });
  }

  const url = `${BASE}/models/${opts.model || MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 400)}`);
  }

  const body = (await res.json()) as GeminiResponse;
  const candidate = body.candidates?.[0];
  const respParts = candidate?.content?.parts || [];
  for (const p of respParts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      return { bytes: base64ToBytes(inline.data), mimeType: mime };
    }
  }
  throw new Error("Gemini returned no image part");
}

export async function fetchReferenceImage(
  url: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`reference image ${url}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { bytes: buf, mimeType: mime };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return Buffer.from(bin, "binary").toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
