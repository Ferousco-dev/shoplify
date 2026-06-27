import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getShopifyToken } from "@/lib/shopify-token";
import { verifyWebhookSecret } from "@/lib/webhook-secret";

export const runtime = "nodejs";
export const maxDuration = 30;

type SheetRow = Record<string, string>;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;

  let body: { secret?: string; rows?: SheetRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.secret || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: "secret and rows[] are required" },
      { status: 400 },
    );
  }

  if (!verifyWebhookSecret(storeId, body.secret)) {
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
  const label = `sheets-${now.slice(0, 10)}`;

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .insert({
      store_id: storeId,
      source_filename: `${label}.csv`,
      storage_key: `sheets://${Date.now()}`,
      status: "running",
      total_items: body.rows.length,
      started_at: now,
      meta: { source: "google_sheets" },
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: `Failed to create job: ${jobErr?.message}` },
      { status: 500 },
    );
  }

  const itemRows = body.rows.map((r, i) => ({
    job_id: job.id,
    row_index: i,
    source_url:
      r.alibaba1688 || r.amazon || r.aliexpress || r.alibaba || r.other || "",
    raw_row: r,
    status: "pending",
  }));

  const { error: itemErr } = await supabaseAdmin.from("job_items").insert(itemRows);
  if (itemErr) {
    return NextResponse.json(
      { error: `Failed to create job items: ${itemErr.message}` },
      { status: 500 },
    );
  }

  // Fire-and-forget — same pattern as /api/jobs POST
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
    console.error(`[sheets-webhook] runner kick-off failed for ${job.id}:`, e),
  );

  return NextResponse.json({ ok: true, jobId: job.id, rowsQueued: body.rows.length });
}
