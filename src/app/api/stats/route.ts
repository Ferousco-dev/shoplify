import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStore } from "@/lib/session";

export type DashboardStats = {
  productsGenerated: number;
  imagesCreated: number;
  draftsPublished: number;
};

export async function GET() {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const [products, drafts, assets] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", auth.storeId),
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", auth.storeId)
      .not("shopify_product_id", "is", null),
    // product_assets has no store_id column; filter through the products join.
    supabaseAdmin
      .from("product_assets")
      .select("id, products!inner(store_id)", { count: "exact", head: true })
      .eq("kind", "generated")
      .eq("products.store_id", auth.storeId),
  ]);

  const stats: DashboardStats = {
    productsGenerated: products.count ?? 0,
    imagesCreated: assets.count ?? 0,
    draftsPublished: drafts.count ?? 0,
  };
  return NextResponse.json(stats);
}
