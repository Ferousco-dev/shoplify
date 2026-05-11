import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ShopifySession = {
  shopDomain?: string;
  accessToken?: string;
  shopName?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
};

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
) {
  throw new Error(
    "SESSION_SECRET must be set to a 32+ character value in production",
  );
}

const sessionPassword =
  process.env.SESSION_SECRET ||
  "alivio-dev-only-secret-please-set-SESSION_SECRET-in-env-32chars+";

if (sessionPassword.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters");
}

const options: SessionOptions = {
  password: sessionPassword,
  cookieName: "alivio_shopify_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<ShopifySession>(cookieStore, options);
}

export async function requireShopify() {
  const s = await getSession();
  if (!s.shopDomain || !s.accessToken) {
    throw new Error("Not connected to Shopify");
  }
  return { shopDomain: s.shopDomain, accessToken: s.accessToken };
}

/**
 * Resolve the active session AND the corresponding active store row in one
 * step. Every data-fetching API route should call this and then filter every
 * Supabase query by the returned `storeId` — otherwise authenticated users
 * still see other tenants' jobs/products.
 *
 * Returns the JSON response object to send when unauthorized; the caller
 * should `if ("error" in r) return NextResponse.json(r, { status: r.status })`.
 */
export type SessionStore = {
  shopDomain: string;
  accessToken: string;
  storeId: string;
};

export async function requireStore(): Promise<
  | SessionStore
  | { error: string; status: 401 | 403 }
> {
  const s = await getSession();
  if (!s.shopDomain || !s.accessToken) {
    return { error: "Not connected to Shopify", status: 401 };
  }
  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("id, is_active")
    .eq("shop_domain", s.shopDomain)
    .maybeSingle();
  if (error || !store) {
    return { error: "Store record not found for current session", status: 403 };
  }
  if (!store.is_active) {
    return { error: "Store is inactive", status: 403 };
  }
  return {
    shopDomain: s.shopDomain,
    accessToken: s.accessToken,
    storeId: store.id as string,
  };
}
