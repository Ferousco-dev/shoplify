import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processJobItemScrape, recoverStuckItems, type CsvRow } from "@/lib/pipeline";

export const runtime = "nodejs";
// One row's worth of work fits well under 300s on Vercel Pro (~45s scrape+copy
// + ~30s for 15 images at 3-way concurrency). On Hobby (60s cap) it'll skirt
// the limit; reduce CSV row count or upgrade if you hit timeouts there.
export const maxDuration = 300;

type RunBody = {
  shopDomain?: string;
  accessToken?: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await ctx.params;

  // Shared-secret auth: this endpoint is internal-only. Without this any
  // attacker could trigger AI generation at our expense.
  const secret =
    process.env.RUNNER_SECRET || process.env.SESSION_SECRET || "";
  const headerSecret = req.headers.get("x-runner-secret");
  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as RunBody;
  if (!body.shopDomain || !body.accessToken) {
    return NextResponse.json(
      { error: "shopDomain + accessToken required in body" },
      { status: 400 },
    );
  }

  // Check the job is still active (could have been cancelled while waiting).
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .select("id, status, store_id")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === "cancelled" || job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ ok: true, stopped: true, reason: job.status });
  }

  // Sweep any items left in `running` for too long. A previous serverless
  // invocation may have died mid-flight; without this sweep the row stays
  // running forever and the job is permanently stuck.
  if (job.store_id) {
    await recoverStuckItems(job.store_id as string).catch((e) => {
      console.warn(`[runner ${jobId}] recoverStuckItems failed:`, e);
    });
  }

  // Pick the next pending row. Sequential order so the UI feels coherent.
  const { data: nextItem, error: itemErr } = await supabaseAdmin
    .from("job_items")
    .select("id, row_index, raw_row")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("row_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (itemErr) {
    return NextResponse.json({ error: itemErr.message }, { status: 500 });
  }
  if (!nextItem) {
    // No more pending items. The counter logic inside processJobItem already
    // flips job status to completed/partial/failed when the last one finishes.
    return NextResponse.json({ ok: true, done: true });
  }

  try {
    // Phase A only: scrape and persist raw scraped data. Image generation
    // happens later, on user "Continue" via /api/products/:id/generate.
    await processJobItemScrape({
      jobId,
      itemId: nextItem.id,
      storeId: job.store_id as string,
      row: (nextItem.raw_row ?? {}) as CsvRow,
    });
  } catch (e) {
    const msg = (e as Error).message;
    // Mark the item failed defensively so the runner never gets stuck in a
    // retry loop on the same row.
    await supabaseAdmin
      .from("job_items")
      .update({
        status: "failed",
        error: msg.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", nextItem.id);
    console.error(`[runner ${jobId}] item ${nextItem.id} threw:`, msg);
  }

  // Re-fire ourselves to pick up the next row. Fire-and-forget so the current
  // function can return immediately and free its execution slot.
  const origin = new URL(req.url).origin;
  void fetch(`${origin}/api/jobs/${jobId}/run-next-row`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-runner-secret": secret,
    },
    body: JSON.stringify({
      shopDomain: body.shopDomain,
      accessToken: body.accessToken,
    }),
  }).catch((e) => {
    console.error(`[runner ${jobId}] failed to chain:`, e);
  });

  return NextResponse.json({ ok: true, processedItem: nextItem.id });
}
