import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireShopify, requireStore } from "@/lib/session";

export type JobSummary = {
  id: string;
  store_id: string | null;
  source_filename: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: Request) {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, store_id, source_filename, status, total_items, completed_items, failed_items, started_at, finished_at, error, created_at, updated_at",
    )
    .eq("store_id", auth.storeId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: (data ?? []) as JobSummary[] });
}

type CreateBody = {
  storeId: string;
  filename: string;
  rows: Record<string, string>[];
};

export async function POST(req: Request) {
  let creds: { shopDomain: string; accessToken: string };
  try {
    creds = await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body || !body.storeId || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json(
      { error: "storeId, filename, and non-empty rows are required" },
      { status: 400 },
    );
  }

  const { data: store, error: storeErr } = await supabaseAdmin
    .from("stores")
    .select("id, shop_domain, is_active")
    .eq("id", body.storeId)
    .maybeSingle();
  if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 });
  if (!store || !store.is_active) {
    return NextResponse.json({ error: "Target store not found or inactive" }, { status: 404 });
  }
  if (store.shop_domain !== creds.shopDomain) {
    return NextResponse.json(
      { error: "Session shop domain does not match selected store" },
      { status: 403 },
    );
  }

  const now = new Date().toISOString();
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .insert({
      store_id: body.storeId,
      source_filename: body.filename || "manual.csv",
      storage_key: `inline://${Date.now()}`,
      status: "running",
      total_items: body.rows.length,
      started_at: now,
      meta: { source: "csv-inline" },
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    return NextResponse.json(
      { error: `create job: ${jobErr?.message || "unknown"}` },
      { status: 500 },
    );
  }

  // Insert one job_item per CSV row, stashing the raw row in raw_row jsonb.
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
      { error: `insert job_items: ${itemErr.message}` },
      { status: 500 },
    );
  }

  // Fire-and-forget kick off the runner. We use the request's own origin so it
  // works in dev (localhost:3000) and prod (vercel.app) without config.
  const origin = new URL(req.url).origin;
  const runnerSecret = process.env.RUNNER_SECRET || process.env.SESSION_SECRET || "";
  if (!runnerSecret) {
    return NextResponse.json(
      { error: "RUNNER_SECRET or SESSION_SECRET must be set on the server" },
      { status: 500 },
    );
  }
  // Don't await — this returns instantly so the browser can navigate away.
  void fetch(`${origin}/api/jobs/${job.id}/run-next-row`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-runner-secret": runnerSecret,
    },
    body: JSON.stringify({
      shopDomain: creds.shopDomain,
      accessToken: creds.accessToken,
    }),
  }).catch((e) => {
    console.error(`[jobs] failed to kick off runner for ${job.id}:`, e);
  });

  return NextResponse.json({ jobId: job.id });
}
