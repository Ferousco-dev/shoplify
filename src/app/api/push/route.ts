import { NextResponse } from "next/server";
import { productCreate, type MediaInput, type ProductInput } from "@/lib/shopify";
import { requireStore } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type Req = {
  draft: {
    title: string;
    handle?: string;
    descriptionHtml: string;
    seo?: { title?: string; description?: string };
    tags?: string[];
    metafields?: Array<{ namespace: string; key: string; type: string; value: string }>;
  };
  media: Array<{ resourceUrl: string; alt?: string }>;
  vendor?: string;
  productType?: string;
  productId?: string; // Optional Supabase product UUID; preferred over title match.
};

export async function POST(req: Request) {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json()) as Req;
  if (!body.draft?.title) {
    return NextResponse.json({ error: "draft.title required" }, { status: 400 });
  }

  const input: ProductInput = {
    title: body.draft.title,
    descriptionHtml: body.draft.descriptionHtml,
    handle: body.draft.handle,
    vendor: body.vendor || "Alivio Plus Co",
    productType: body.productType,
    tags: body.draft.tags,
    status: "DRAFT",
    seo: body.draft.seo,
    metafields: body.draft.metafields,
  };

  const media: MediaInput[] = (body.media || []).map((m) => ({
    originalSource: m.resourceUrl,
    alt: m.alt,
    mediaContentType: "IMAGE",
  }));

  let product: { id: string; handle: string; title: string; status: string };
  try {
    product = await productCreate(
      { shopDomain: auth.shopDomain, accessToken: auth.accessToken },
      input,
      media,
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const shopifyProductId = product.id.split("/").pop() ?? null;
  const adminUrl = `https://${auth.shopDomain.replace(".myshopify.com", "")}.myshopify.com/admin/products/${shopifyProductId}`;

  // Persist the published state to Supabase. We never let a DB failure mask a
  // successful Shopify create — that would tell the user "push failed" while
  // the product is live in their store. Failures here are logged and surfaced
  // as a non-fatal warning.
  let dbWarning: string | null = null;
  try {
    let updatedRows = 0;
    if (body.productId) {
      const { data, error } = await supabaseAdmin
        .from("products")
        .update({
          status: "published",
          shopify_product_id: shopifyProductId,
          shopify_handle: product.handle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.productId)
        .eq("store_id", auth.storeId)
        .select("id");
      if (error) throw error;
      updatedRows = data?.length ?? 0;
    }

    if (updatedRows === 0) {
      // Fall back to a title match within this store (last-write-wins on
      // titles that happen to collide; acceptable for the small expected scale).
      const { data, error } = await supabaseAdmin
        .from("products")
        .update({
          status: "published",
          shopify_product_id: shopifyProductId,
          shopify_handle: product.handle,
          updated_at: new Date().toISOString(),
        })
        .eq("title", body.draft.title)
        .eq("store_id", auth.storeId)
        .is("shopify_product_id", null)
        .select("id");
      if (error) throw error;
      updatedRows = data?.length ?? 0;
    }

    if (updatedRows === 0) {
      // No draft in our DB — insert a clean record so the product shows up in
      // /dashboard/products. Use the synthetic `source_url` shape that the
      // pipeline uses for manual entries, and keep the source supplier marker.
      const placeholder = `manual://${shopifyProductId ?? Date.now()}`;
      const { error } = await supabaseAdmin.from("products").insert({
        store_id: auth.storeId,
        source_url: placeholder,
        source_supplier: "manual",
        title: body.draft.title,
        description_raw: body.draft.descriptionHtml,
        shopify_handle: product.handle,
        shopify_product_id: shopifyProductId,
        status: "published",
        attributes: {
          seo: body.draft.seo,
          tags: body.draft.tags || [],
          metafields: body.draft.metafields || [],
          handle: body.draft.handle,
        },
      });
      if (error) throw error;
    }
  } catch (dbErr) {
    dbWarning = (dbErr as Error).message;
    console.warn("[push] DB write failed (Shopify push succeeded):", dbWarning);
  }

  return NextResponse.json({
    ok: true,
    product,
    adminUrl,
    ...(dbWarning ? { dbWarning } : {}),
  });
}
