import { NextResponse } from "next/server";
import { getSession, requireShopify } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const anthropicApiKey = String(body.anthropicApiKey || "").trim() || undefined;
  const geminiApiKey = String(body.geminiApiKey || "").trim() || undefined;

  // Validate keys by making test API calls
  if (anthropicApiKey) {
    try {
      await validateAnthropicKey(anthropicApiKey);
    } catch (e) {
      return NextResponse.json(
        { error: `Invalid Anthropic key: ${(e as Error).message}` },
        { status: 400 },
      );
    }
  }

  if (geminiApiKey) {
    try {
      await validateGeminiKey(geminiApiKey);
    } catch (e) {
      return NextResponse.json(
        { error: `Invalid Gemini key: ${(e as Error).message}` },
        { status: 400 },
      );
    }
  }

  const session = await getSession();
  session.anthropicApiKey = anthropicApiKey;
  session.geminiApiKey = geminiApiKey;
  await session.save();

  return NextResponse.json({
    ok: true,
    anthropicSource: anthropicApiKey ? "user" : "alivio",
    geminiSource: geminiApiKey ? "user" : "alivio",
  });
}

async function validateAnthropicKey(key: string): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: "ok" }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
  }
}

async function validateGeminiKey(key: string): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "ok" }] }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
  }
}

export async function GET() {
  try {
    await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const session = await getSession();
  return NextResponse.json({
    anthropicSource: session.anthropicApiKey ? "user" : "alivio",
    geminiSource: session.geminiApiKey ? "user" : "alivio",
    hasUserKeys: !!(session.anthropicApiKey || session.geminiApiKey),
  });
}
