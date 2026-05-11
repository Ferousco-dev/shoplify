import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

// Prompts live inside the frontend bundle so Vercel deploys can find them.
// process.cwd() is the project root in both `next dev` and the deployed
// Lambda, so this resolves to `<project>/prompts`.
const PROMPTS_DIR = path.resolve(process.cwd(), "prompts");

export type LoadedPrompt = {
  name: string;
  body: string;
  meta: Record<string, unknown>;
};

const cache = new Map<string, LoadedPrompt>();

export async function loadPrompt(relPath: string): Promise<LoadedPrompt> {
  const cached = cache.get(relPath);
  if (cached) return cached;
  const full = path.join(PROMPTS_DIR, relPath);
  const raw = await fs.readFile(full, "utf8");
  const parsed = matter(raw);
  const lp: LoadedPrompt = {
    name: (parsed.data.name as string) || relPath,
    body: parsed.content,
    meta: parsed.data as Record<string, unknown>,
  };
  cache.set(relPath, lp);
  return lp;
}

/**
 * Minimal Jinja-ish renderer for our prompt files.
 *
 * Supports:
 *  - {{ var }}             — resolved via dot/bracket path on ctx
 *  - {{ var or 'default' }} — fallback when value is falsy
 *  - {{ var | tojson }}    — JSON.stringify the value
 *  - {{ a or (b + ', ' + c) }} — simple "or (concat)" with string literals and var refs
 *
 * Everything else inside {{ }} is treated as a path-expression and resolved.
 * If unresolvable, replaced with empty string.
 */
export function render(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_m, expr: string) => {
    try {
      return String(evalExpr(expr.trim(), ctx) ?? "");
    } catch {
      return "";
    }
  });
}

function evalExpr(expr: string, ctx: Record<string, unknown>): unknown {
  // Pipe filter: tojson
  if (expr.includes("|")) {
    const [left, ...filters] = expr.split("|").map((s) => s.trim());
    let v = evalExpr(left, ctx);
    for (const f of filters) {
      if (f === "tojson") v = JSON.stringify(v ?? null);
      else if (f === "trim") v = String(v ?? "").trim();
    }
    return v;
  }

  // 'or' chain — left preferred unless falsy
  if (/\bor\b/.test(expr)) {
    const parts = splitTopLevel(expr, " or ");
    for (const part of parts) {
      const v = evalExpr(part.trim(), ctx);
      if (v !== undefined && v !== null && v !== "" && v !== false) return v;
    }
    return "";
  }

  // Parenthesised concat: (a + ', ' + b)
  if (expr.startsWith("(") && expr.endsWith(")")) {
    return evalExpr(expr.slice(1, -1), ctx);
  }

  // String concatenation with +
  if (/[^=!<>]\+/.test(expr) || /^\+/.test(expr) === false && expr.includes(" + ")) {
    if (expr.includes(" + ")) {
      const parts = splitTopLevel(expr, " + ");
      return parts.map((p) => String(evalExpr(p.trim(), ctx) ?? "")).join("");
    }
  }

  // String literal
  if (
    (expr.startsWith("'") && expr.endsWith("'")) ||
    (expr.startsWith('"') && expr.endsWith('"'))
  ) {
    return expr.slice(1, -1);
  }

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);

  // Boolean / null literals
  if (expr === "true") return true;
  if (expr === "false") return false;
  if (expr === "null" || expr === "None") return null;

  // Path expression like foo.bar.baz or foo['bar']
  return resolvePath(expr, ctx);
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  let inStr: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      buf += ch;
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && s.slice(i, i + sep.length) === sep) {
      out.push(buf);
      buf = "";
      i += sep.length - 1;
      continue;
    }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

function resolvePath(expr: string, ctx: Record<string, unknown>): unknown {
  const parts = expr.replace(/\[(['"])(.+?)\1\]/g, ".$2").split(".");
  let v: unknown = ctx;
  for (const p of parts) {
    if (v == null) return undefined;
    if (typeof v !== "object") return undefined;
    v = (v as Record<string, unknown>)[p];
  }
  return v;
}
