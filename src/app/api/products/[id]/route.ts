import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStore } from "@/lib/session";

export type ProductAsset = {
  id: string;
  kind: string;
  slot: string | null;
  public_url: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type GenerationEntry = {
  id: string;
  kind: string;
  slot: string | null;
  status: string;
  model: string;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
};

export type ProductDetail = {
  id: string;
  store_id: string;
  source_url: string;
  source_supplier: string;
  title: string | null;
  description_raw: string | null;
  category: string | null;
  attributes: Record<string, unknown>;
  status: string;
  failure_reason: string | null;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  created_at: string;
  updated_at: string;
  assets: ProductAsset[];
  recent_generations: GenerationEntry[];
};

async function ensureOwnedProduct(productId: string, storeId: string) {
  const { data: row, error } = await supabaseAdmin
    .from("products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row || row.store_id !== storeId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const ownership = await ensureOwnedProduct(id, auth.storeId);
  if (ownership) return ownership;

  const [productRes, assetsRes, gensRes] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("product_assets")
      .select("id, kind, slot, public_url, mime_type, width, height, created_at")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("generations")
      .select("id, kind, slot, status, model, latency_ms, error, created_at")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (productRes.error)
    return NextResponse.json({ error: productRes.error.message }, { status: 500 });
  if (!productRes.data)
    return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const detail: ProductDetail = {
    ...(productRes.data as Omit<ProductDetail, "assets" | "recent_generations">),
    assets: (assetsRes.data ?? []) as ProductAsset[],
    recent_generations: (gensRes.data ?? []) as GenerationEntry[],
  };
  return NextResponse.json(detail);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const ownership = await ensureOwnedProduct(id, auth.storeId);
  if (ownership) return ownership;
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
