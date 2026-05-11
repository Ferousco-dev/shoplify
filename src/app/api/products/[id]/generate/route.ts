import { NextResponse } from "next/server";
import { requireStore } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Kicks off phase B (copy + 14 image generations) for one product.
 *
 * The actual work is heavy (~90-180s) so we do NOT block the browser. We
 * mark the product `generating_copy` synchronously, fire-and-forget the
 * worker route, and return immediately. The UI polls
 * `/api/products/[id]` for status + asset accumulation and renders the
 * 14-box progress grid live.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("id, store_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!product || product.store_id !== auth.storeId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const allowed = new Set(["awaiting_review", "failed_copy", "failed_images"]);
  if (!allowed.has(product.status)) {
    return NextResponse.json(
      { error: `Product is in '${product.status}' — cannot start generation now.` },
      { status: 409 },
    );
  }

  // Mark it queued so the UI can show "starting…" immediately.
  await supabaseAdmin
    .from("products")
    .update({
      status: "generating_copy",
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  const secret = process.env.RUNNER_SECRET || process.env.SESSION_SECRET || "";
  if (!secret) {
    return NextResponse.json(
      { error: "RUNNER_SECRET or SESSION_SECRET must be set" },
      { status: 500 },
    );
  }

  // Fire-and-forget the worker. On Vercel each invocation is its own
  // serverless function so this gets its own 300s budget.
  const origin = new URL(req.url).origin;
  void fetch(`${origin}/api/products/${id}/generate/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-runner-secret": secret,
    },
    body: JSON.stringify({
      shopDomain: auth.shopDomain,
      accessToken: auth.accessToken,
      storeId: auth.storeId,
    }),
  }).catch((e) => {
    console.error(`[generate] failed to dispatch ${id}:`, e);
  });

  return NextResponse.json({ ok: true, productId: id, started: true });
}
