interface TokenEntry {
  accessToken: string;
  expiresAt: number;
}

// In-process cache: survives for the lifetime of the Next.js server process.
// In serverless (Vercel), each instance has its own cache — tokens are
// re-fetched on cold starts, which is fine.
const tokenCache = new Map<string, TokenEntry>();

async function fetchNewToken(shopDomain: string): Promise<TokenEntry> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set in environment variables",
    );
  }

  const res = await fetch(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Shopify token request failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("Shopify token response did not include access_token");
  }

  // Refresh 60 seconds before actual expiry; default to 55 min if not provided.
  const expiresInSeconds = data.expires_in ?? 3600;
  const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;

  return { accessToken: data.access_token, expiresAt };
}

/**
 * Returns a valid access token for the given shop, fetching or refreshing
 * automatically as needed.
 */
export async function getShopifyToken(shopDomain: string): Promise<string> {
  const cached = tokenCache.get(shopDomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const entry = await fetchNewToken(shopDomain);
  tokenCache.set(shopDomain, entry);
  return entry.accessToken;
}

/** Clears the cached token for a shop (e.g. on disconnect). */
export function clearShopifyToken(shopDomain: string): void {
  tokenCache.delete(shopDomain);
}
