import { NextResponse } from "next/server";
import { processProductGenerate } from "@/lib/pipeline";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { writeBackToAirtable } from "@/lib/airtable";

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
    // Best-effort Airtable write-back — don't fail the response if it errors.
    await maybeWriteBackToAirtable(id, body.storeId).catch((e) =>
      console.error(`[generate/run ${id}] airtable write-back failed:`, e),
    );
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

async function maybeWriteBackToAirtable(productId: string, storeId: string): Promise<void> {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, title, description, job_item_id")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.job_item_id) return;

  const { data: jobItem } = await supabaseAdmin
    .from("job_items")
    .select("meta")
    .eq("id", product.job_item_id)
    .maybeSingle();

  const meta = (jobItem?.meta ?? {}) as { airtable_record_id?: string };
  if (!meta.airtable_record_id) return;

  const { data: integration } = await supabaseAdmin
    .from("store_integrations")
    .select("config")
    .eq("store_id", storeId)
    .eq("integration_type", "airtable")
    .maybeSingle();

  const config = (integration?.config ?? {}) as {
    pat?: string;
    base_id?: string;
    table_id?: string;
  };
  if (!config.pat || !config.base_id || !config.table_id) return;

  const { data: assets } = await supabaseAdmin
    .from("product_assets")
    .select("public_url")
    .eq("product_id", productId)
    .eq("kind", "generated")
    .not("public_url", "is", null)
    .limit(14);

  const imageUrls = (assets ?? [])
    .map((a) => a.public_url as string)
    .filter(Boolean);

  await writeBackToAirtable({
    pat: config.pat,
    baseId: config.base_id,
    tableId: config.table_id,
    recordId: meta.airtable_record_id,
    fields: {
      generatedTitle: product.title || undefined,
      generatedDescription: product.description || undefined,
      imageUrls,
      status: "Completed",
    },
  });
}
