import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getShopifyToken } from "@/lib/shopify-token";
import { verifyAirtableWebhookSecret } from "@/lib/webhook-secret";

export const runtime = "nodejs";
export const maxDuration = 30;

type AirtablePayload = {
  secret?: string;
  record_id?: string;
  fields?: Record<string, string>;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  let body: AirtablePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.secret || !body.record_id || !body.fields) {
    return NextResponse.json(
      { error: "secret, record_id, and fields are required" },
      { status: 400 },
    );
  }

  if (!verifyAirtableWebhookSecret(storeId, body.secret)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const { data: store, error: storeErr } = await supabaseAdmin
    .from("stores")
    .select("id, shop_domain, is_active")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !store || !store.is_active) {
    return NextResponse.json({ error: "Store not found or inactive" }, { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = await getShopifyToken(store.shop_domain as string);
  } catch (e) {
    return NextResponse.json(
      { error: `Shopify auth failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .insert({
      store_id: storeId,
      source_filename: `airtable-${now.slice(0, 10)}.csv`,
      storage_key: `airtable://${Date.now()}`,
      status: "running",
      total_items: 1,
      started_at: now,
      meta: { source: "airtable" },
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: `Failed to create job: ${jobErr?.message}` },
      { status: 500 },
    );
  }

  // Map exact Airtable column names → CsvRow keys the pipeline expects.
  const f = body.fields;
  const csvRow = {
    product_name: f["product_name"] || "",
    amazon:       f["product url amazon"] || "",
    alibaba1688:  f["product_url 1688"] || "",
    aliexpress:   f["Product_url Aliexpress"] || "",
    alibaba:      f["product_url ALIBABA"] || "",
    other:        f["Other"] || f["Other "] || "",
    category:     f["category"] || "",
    target_market: f["target_market"] || "",
  };

  const { error: itemErr } = await supabaseAdmin.from("job_items").insert({
    job_id: job.id,
    row_index: 0,
    source_url:
      csvRow.amazon || csvRow.alibaba1688 || csvRow.aliexpress || csvRow.alibaba || csvRow.other || "",
    raw_row: csvRow,
    status: "pending",
    meta: { airtable_record_id: body.record_id, source: "airtable" },
  });

  if (itemErr) {
    return NextResponse.json(
      { error: `Failed to create job item: ${itemErr.message}` },
      { status: 500 },
    );
  }

  const origin = new URL(req.url).origin;
  const runnerSecret = process.env.RUNNER_SECRET || process.env.SESSION_SECRET || "";
  void fetch(`${origin}/api/jobs/${job.id}/run-next-row`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-runner-secret": runnerSecret,
    },
    body: JSON.stringify({ shopDomain: store.shop_domain, accessToken }),
  }).catch((e) =>
    console.error(`[airtable-webhook] runner kick-off failed for ${job.id}:`, e),
  );

  return NextResponse.json({ ok: true, jobId: job.id });
}
