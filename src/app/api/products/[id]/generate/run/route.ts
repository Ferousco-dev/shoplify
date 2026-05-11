import { NextResponse } from "next/server";
import { processProductGenerate } from "@/lib/pipeline";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// Copy (≈30s) + 14 images at 3-way concurrency (≈90s) fits comfortably under
// 300s. Vercel Pro is required (Hobby caps at 60s).
export const maxDuration = 300;

type Body = {
  shopDomain?: string;
  accessToken?: string;
  storeId?: string;
};

/**
 * Internal worker for phase B (Claude copy + 14 Gemini images).
 *
 * The entrypoint `POST /api/products/[id]/generate` (auth-gated) fires this
 * route in the background via fetch + a shared secret. We deliberately
 * separate the two so the operator's browser doesn't hold open a 180s
 * request.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const secret = process.env.RUNNER_SECRET || process.env.SESSION_SECRET || "";
  const headerSecret = req.headers.get("x-runner-secret");
  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.shopDomain || !body.accessToken || !body.storeId) {
    return NextResponse.json(
      { error: "shopDomain + accessToken + storeId required" },
      { status: 400 },
    );
  }

  try {
    await processProductGenerate({
      productId: id,
      storeId: body.storeId,
      creds: { shopDomain: body.shopDomain, accessToken: body.accessToken },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[generate/run ${id}] failed:`, msg);
    // Defensive: ensure the product isn't left in a transitional status that
    // the recovery sweep can't reason about.
    await supabaseAdmin
      .from("products")
      .update({
        status: "failed_images",
        failure_reason: msg.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, productId: id });
}
