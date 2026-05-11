import { NextResponse } from "next/server";
import { requireStore } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processProductGenerate } from "@/lib/pipeline";

export const runtime = "nodejs";
// Copy (≈30s) + 14 images at 3-way concurrency (≈90s) fits within 300s with
// significant headroom even on slow days. Vercel Pro is required.
export const maxDuration = 300;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Ownership check before doing any work.
  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("id, store_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!product || product.store_id !== auth.storeId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  // Only allow generation when scrape is done and there's no live run.
  const allowed = new Set([
    "awaiting_review",
    "failed_copy",
    "failed_images",
  ]);
  if (!allowed.has(product.status)) {
    return NextResponse.json(
      { error: `Product is in '${product.status}' — cannot start generation now.` },
      { status: 409 },
    );
  }

  try {
    await processProductGenerate({
      productId: id,
      storeId: auth.storeId,
      creds: { shopDomain: auth.shopDomain, accessToken: auth.accessToken },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, productId: id });
}
