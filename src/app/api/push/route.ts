import { NextResponse } from "next/server";
import { productCreate, type MediaInput, type ProductInput } from "@/lib/shopify";
import { requireShopify } from "@/lib/session";
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
};

export async function POST(req: Request) {
  let creds: { shopDomain: string; accessToken: string };
  try {
    creds = await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
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

  try {
    const product = await productCreate(creds, input, media);
    const adminUrl = `https://${creds.shopDomain.replace(".myshopify.com", "")}.myshopify.com/admin/products/${product.id.split("/").pop()}`;

    // Save to Supabase (update draft to published)
    const shopifyProductId = product.id.split("/").pop();
    try {
      await supabaseAdmin
        .from("products")
        .update({
          status: "published",
          attributes: {
            seo: body.draft.seo,
            tags: body.draft.tags || [],
            metafields: body.draft.metafields || [],
            handle: body.draft.handle,
          },
        })
        .eq("title", body.draft.title);

      // If no matching draft found, create new record
      try {
        await supabaseAdmin
          .from("products")
          .insert({
            title: body.draft.title,
            status: "published",
            source_supplier: "manual",
            attributes: {
              seo: body.draft.seo,
              tags: body.draft.tags || [],
              metafields: body.draft.metafields || [],
              handle: body.draft.handle,
            },
            raw_data: { shopify_product_id: shopifyProductId },
          });
      } catch {
        // Already saved, ignore
      }
    } catch (dbError) {
      console.warn("Failed to save to Supabase:", dbError);
      // Don't fail the request if DB save fails - product was already created in Shopify
    }

    return NextResponse.json({
      ok: true,
      product,
      adminUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
