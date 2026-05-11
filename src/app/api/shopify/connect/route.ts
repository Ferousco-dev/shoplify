import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyShop } from "@/lib/shopify";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawDomain = String(body.shopDomain || "").trim().toLowerCase();
  const accessToken = String(body.accessToken || "").trim();

  if (!rawDomain || !accessToken) {
    return NextResponse.json({ error: "shopDomain and accessToken are required" }, { status: 400 });
  }

  let shopDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!shopDomain.includes(".")) shopDomain = `${shopDomain}.myshopify.com`;

  try {
    const shop = await verifyShop({ shopDomain, accessToken });
    const finalDomain = shop.myshopifyDomain || shopDomain;

    const session = await getSession();
    session.shopDomain = finalDomain;
    session.accessToken = accessToken;
    session.shopName = shop.name;
    await session.save();

    const { error: upsertError } = await supabaseAdmin
      .from("stores")
      .upsert(
        {
          name: shop.name,
          shop_domain: finalDomain,
          access_token_encrypted: accessToken,
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
      { error: `Could not verify store. ${(e as Error).message}` },
      { status: 401 },
    );
  }
}

export async function GET() {
  const s = await getSession();
  if (!s.shopDomain || !s.accessToken) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    shop: { name: s.shopName, domain: s.shopDomain },
  });
}
