import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyShop } from "@/lib/shopify";
import { getShopifyToken } from "@/lib/shopify-token";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawDomain = String(body.shopDomain || "").trim().toLowerCase();

  if (!rawDomain) {
    return NextResponse.json({ error: "shopDomain is required" }, { status: 400 });
  }

  // Handle full admin URLs: https://admin.shopify.com/store/my-store → my-store
  let shopDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const adminMatch = shopDomain.match(/^admin\.shopify\.com\/store\/([^/]+)/);
  if (adminMatch) shopDomain = adminMatch[1];
  // Strip any remaining path
  shopDomain = shopDomain.split("/")[0];
  // Auto-append .myshopify.com if bare store name given
  if (!shopDomain.includes(".")) shopDomain = `${shopDomain}.myshopify.com`;

  try {
    // Obtain token via Client Credentials — no manual token needed from the user.
    const accessToken = await getShopifyToken(shopDomain);
    const shop = await verifyShop({ shopDomain, accessToken });
    const finalDomain = shop.myshopifyDomain || shopDomain;

    const session = await getSession();
    session.shopDomain = finalDomain;
    session.shopName = shop.name;
    await session.save();

    const { error: upsertError } = await supabaseAdmin
      .from("stores")
      .upsert(
        {
          name: shop.name,
          shop_domain: finalDomain,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "shop_domain" },
      );

    if (upsertError) {
      console.warn("stores upsert failed:", upsertError.message);
    }

    return NextResponse.json({ ok: true, shop: { name: shop.name, domain: finalDomain } });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not connect to store. ${(e as Error).message}` },
      { status: 401 },
    );
  }
}

export async function GET() {
  const s = await getSession();
  if (!s.shopDomain) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    shop: { name: s.shopName, domain: s.shopDomain },
  });
}
