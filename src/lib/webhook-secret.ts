import crypto from "crypto";

function base(): string {
  return process.env.SESSION_SECRET || process.env.RUNNER_SECRET || "dev-secret";
}

export function generateWebhookSecret(storeId: string): string {
  return crypto
    .createHmac("sha256", base())
    .update(`sheets-webhook:${storeId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyWebhookSecret(storeId: string, received: string): boolean {
  const expected = generateWebhookSecret(storeId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
