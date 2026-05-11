import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type ShopifySession = {
  shopDomain?: string;
  accessToken?: string;
  shopName?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
};

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
