import { NextResponse } from "next/server";
import { requireStore } from "@/lib/session";
import { generateAirtableWebhookSecret } from "@/lib/webhook-secret";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(req.url).origin);

  const secret = generateAirtableWebhookSecret(auth.storeId);
  const webhookUrl = `${origin}/api/webhooks/airtable/${auth.storeId}`;

  return NextResponse.json({
    webhookUrl,
    secret,
    storeId: auth.storeId,
    sampleBody: buildSampleBody(secret),
  });
}

function buildSampleBody(secret: string): string {
  return JSON.stringify(
    {
      secret,
      record_id: "{{Record ID}}",
      fields: {
        product_name: "{{Product Name}}",
        amazon: "{{Amazon URL}}",
        category: "{{Category}}",
      },
    },
    null,
    2,
  );
}
