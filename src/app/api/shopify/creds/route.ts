import { NextResponse } from "next/server";
import { requireShopify } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  let creds: { shopDomain: string; accessToken: string };
  try {
    creds = await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
  }
  return NextResponse.json({ shopDomain: creds.shopDomain, accessToken: creds.accessToken });
}
