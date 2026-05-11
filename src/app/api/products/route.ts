import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ProductSummary = {
  id: string;
  store_id: string;
  source_url: string;
  source_supplier: string;
  title: string | null;
  category: string | null;
  status: string;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  created_at: string;
  updated_at: string;
  hero_url: string | null;
};

type AssetRef = {
  public_url: string | null;
  kind: string;
  slot: string | null;
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, store_id, source_url, source_supplier, title, category, status, shopify_product_id, shopify_handle, created_at, updated_at, product_assets(public_url, kind, slot)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products: ProductSummary[] = (data ?? []).map(
    (p: Omit<ProductSummary, "hero_url"> & { product_assets?: AssetRef[] }) => {
      const generated = (p.product_assets ?? []).filter((a) => a.kind === "generated");
      const hero =
        generated.find((a) => a.slot === "ecommerce_front")?.public_url ??
        generated[0]?.public_url ??
        null;
      const { product_assets: _drop, ...rest } = p as typeof p & {
        product_assets?: AssetRef[];
      };
      void _drop;
      return { ...rest, hero_url: hero };
    },
  );

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    status?: string;
    title?: string | null;
    shopify_product_id?: string | null;
    shopify_handle?: string | null;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) update.status = body.status;
  if (body.title !== undefined) update.title = body.title;
  if (body.shopify_product_id !== undefined) update.shopify_product_id = body.shopify_product_id;
  if (body.shopify_handle !== undefined) update.shopify_handle = body.shopify_handle;

  const { error } = await supabaseAdmin.from("products").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
