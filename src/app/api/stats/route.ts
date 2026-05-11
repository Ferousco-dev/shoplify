import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type DashboardStats = {
  productsGenerated: number;
  imagesCreated: number;
  draftsPublished: number;
};

export async function GET() {
  const [products, drafts, images] = await Promise.all([
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .not("shopify_product_id", "is", null),
    supabaseAdmin
      .from("product_assets")
      .select("id", { count: "exact", head: true })
      .eq("kind", "generated"),
  ]);

  const stats: DashboardStats = {
    productsGenerated: products.count ?? 0,
    imagesCreated: images.count ?? 0,
    draftsPublished: drafts.count ?? 0,
  };
  return NextResponse.json(stats);
}
