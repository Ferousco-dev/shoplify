import { NextResponse } from "next/server";
import { getSession, requireShopify, requireStore } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const anthropicApiKey = String(body.anthropicApiKey || "").trim() || undefined;
  const geminiApiKey = String(body.geminiApiKey || "").trim() || undefined;
  const higgsfieldApiKey = String(body.higgsfieldApiKey || "").trim() || undefined;
  const higgsfieldSecret = String(body.higgsfieldSecret || "").trim() || undefined;
  const airtablePat = String(body.airtablePat || "").trim() || undefined;
  const airtableBaseId = String(body.airtableBaseId || "").trim() || undefined;
  const airtableTableId = String(body.airtableTableId || "").trim() || undefined;

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
  session.higgsfieldApiKey = higgsfieldApiKey;
  session.higgsfieldSecret = higgsfieldSecret;
  session.airtablePat = airtablePat;
  session.airtableBaseId = airtableBaseId;
  session.airtableTableId = airtableTableId;
  await session.save();

  // Persist Airtable credentials to Supabase so webhook routes can access them
  // without a user session.
  if (airtablePat || airtableBaseId || airtableTableId) {
    const auth = await requireStore();
    if (!("error" in auth)) {
      await supabaseAdmin
        .from("store_integrations")
        .upsert(
          {
            store_id: auth.storeId,
            integration_type: "airtable",
            config: {
              pat: airtablePat,
              base_id: airtableBaseId,
              table_id: airtableTableId,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,integration_type" },
        )
        .select()
        .single();
    }
  }

  return NextResponse.json({
    ok: true,
    anthropicSource: anthropicApiKey ? "user" : "env",
    geminiSource: geminiApiKey ? "user" : "env",
    higgsfieldSource: higgsfieldApiKey ? "user" : "env",
    airtableSource: airtablePat ? "user" : "none",
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
