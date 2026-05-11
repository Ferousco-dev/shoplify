import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStore } from "@/lib/session";

async function ensureOwnedJob(jobId: string) {
  const auth = await requireStore();
  if ("error" in auth) {
    return {
      error: NextResponse.json({ error: auth.error }, { status: auth.status }),
    };
  }
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select("id, store_id")
    .eq("id", jobId)
    .maybeSingle();
  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!job) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  if (job.store_id !== auth.storeId) {
    return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  }
  return { auth };
}

export type JobDetail = {
  id: string;
  store_id: string | null;
  source_filename: string;
  storage_key: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  store: { id: string; name: string; shop_domain: string } | null;
  items: JobItemSummary[];
  products: JobProductSummary[];
};

export type JobItemSummary = {
  id: string;
  row_index: number;
  source_url: string;
  status: string;
  error: string | null;
  product_id: string | null;
  created_at: string;
};

export type JobProductSummary = {
  id: string;
  title: string | null;
  status: string;
  source_url: string;
  source_supplier: string;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  hero_url: string | null;
  asset_count: number;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await ensureOwnedJob(id);
  if ("error" in guard) return guard.error;

  const [jobRes, storeRes, itemsRes, productsRes] = await Promise.all([
    supabaseAdmin.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("jobs")
      .select("store_id, stores(id, name, shop_domain)")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("job_items")
      .select("id, row_index, source_url, status, error, product_id, created_at")
      .eq("job_id", id)
      .order("row_index", { ascending: true }),
    supabaseAdmin
      .from("job_items")
      .select(
        "products(id, title, status, source_url, source_supplier, shopify_product_id, shopify_handle, product_assets(public_url, kind, slot))",
      )
      .eq("job_id", id),
  ]);

  if (jobRes.error) {
    return NextResponse.json({ error: jobRes.error.message }, { status: 500 });
  }
  if (!jobRes.data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const storeData = storeRes.data as unknown as
    | {
        stores:
          | { id: string; name: string; shop_domain: string }
          | { id: string; name: string; shop_domain: string }[]
          | null;
      }
    | null;
  const rawStore = storeData?.stores ?? null;
  const store = Array.isArray(rawStore) ? rawStore[0] ?? null : rawStore;

  type AssetRef = { public_url: string | null; kind: string; slot: string | null };
  type ProductRef = {
    id: string;
    title: string | null;
    status: string;
    source_url: string;
    source_supplier: string;
    shopify_product_id: string | null;
    shopify_handle: string | null;
    product_assets?: AssetRef[];
  };

  const rawProductRows = (productsRes.data ?? []) as unknown as Array<{
    products: ProductRef | ProductRef[] | null;
  }>;
  const products: JobProductSummary[] = rawProductRows
    .flatMap((row) =>
      Array.isArray(row.products) ? row.products : row.products ? [row.products] : [],
    )
    .map((p) => {
      const generated = (p.product_assets ?? []).filter((a) => a.kind === "generated");
      const hero =
        generated.find((a) => a.slot === "ecommerce_front")?.public_url ??
        generated[0]?.public_url ??
        null;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        source_url: p.source_url,
        source_supplier: p.source_supplier,
        shopify_product_id: p.shopify_product_id,
        shopify_handle: p.shopify_handle,
        hero_url: hero,
        asset_count: generated.length,
      };
    });

  const detail: JobDetail = {
    ...(jobRes.data as Omit<JobDetail, "store" | "items" | "products">),
    store,
    items: (itemsRes.data ?? []) as JobItemSummary[],
    products,
  };

  return NextResponse.json(detail);
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "running",
  "dispatched",
  "scraping",
  "scraped",
  "normalizing",
  "uploading_assets",
  "syncing_shopify",
  "generating",
  "generating_copy",
  "generating_images",
  "generating_seo",
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await ensureOwnedJob(id);
  if ("error" in guard) return guard.error;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action !== "cancel") {
    return NextResponse.json(
      { error: "Unsupported action. Use { action: 'cancel' }." },
      { status: 400 },
    );
  }

  const { data: job, error: fetchErr } = await supabaseAdmin
    .from("jobs")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (!ACTIVE_STATUSES.has(job.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a job in '${job.status}' state.` },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("jobs")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("job_items")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("job_id", id)
    .in("status", Array.from(ACTIVE_STATUSES));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const guard = await ensureOwnedJob(id);
  if ("error" in guard) return guard.error;
  const { error } = await supabaseAdmin.from("jobs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
