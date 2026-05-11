"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  JobDetail,
  JobItemSummary,
  JobProductSummary,
} from "@/app/api/jobs/[id]/route";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductThumbnail } from "@/components/brand/product-thumbnail";
import { cn } from "@/lib/cn";

const ACTIVE = new Set([
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

function pillTone(status: string): string {
  if (status === "completed") return "bg-badge-ready-bg text-badge-ready-text";
  if (status === "failed" || status.startsWith("failed"))
    return "bg-error-container text-on-error-container";
  if (status === "cancelled") return "bg-surface-variant text-text-muted";
  if (ACTIVE.has(status)) return "bg-badge-running-bg text-badge-running-text";
  return "bg-surface-variant text-text-muted";
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);

  const detailQuery = useQuery<JobDetail>({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as JobDetail;
    },
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && ACTIVE.has(data.status) ? 3000 : 30_000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs", id] });
      setConfirm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      router.push("/dashboard/jobs");
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="p-xl flex justify-center">
        <DotsLoader label="Loading job…" />
      </div>
    );
  }

  if (detailQuery.error) {
    return (
      <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg text-on-error-container">
        {(detailQuery.error as Error).message}
      </div>
    );
  }

  const job = detailQuery.data!;
  const pct = job.total_items
    ? Math.round((job.completed_items / job.total_items) * 100)
    : 0;
  const isActive = ACTIVE.has(job.status);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
        >
          <Icon name="chevron_left" size={18} />
          Back to jobs
        </Link>
        <div className="flex gap-xs">
          {isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirm("cancel")}
              disabled={cancelMutation.isPending}
            >
              <Icon name="block" size={16} />
              Cancel job
            </Button>
          )}
          {!isActive && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirm("delete")}
              disabled={deleteMutation.isPending}
            >
              <Icon name="delete" size={16} />
              Delete job
            </Button>
          )}
        </div>
      </div>

      <header>
        <p className="font-spoonie-italic text-spoonie-italic text-text-muted italic">
          Job Detail
        </p>
        <h1 className="font-section-heading text-section-heading text-text-primary leading-tight mt-xs">
          {job.source_filename}
        </h1>
        <div className="flex flex-wrap items-center gap-sm mt-sm">
          <span
            className={cn(
              "inline-flex items-center px-sm py-1 rounded-full text-xs font-bold",
              pillTone(job.status),
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5" />
            {job.status}
          </span>
          {job.store && (
            <span className="font-ui-label text-ui-label text-text-muted inline-flex items-center gap-xs">
              <Icon name="storefront" size={14} />
              {job.store.name} ({job.store.shop_domain})
            </span>
          )}
          <span className="font-ui-label text-ui-label text-text-muted">
            · Created {relativeTime(job.created_at)}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-sm sm:gap-md">
        <Stat label="Total items" value={job.total_items.toString()} icon="list_alt" />
        <Stat
          label="Completed"
          value={job.completed_items.toString()}
          icon="check_circle"
          tone="success"
        />
        <Stat
          label="Failed"
          value={job.failed_items.toString()}
          icon="error"
          tone={job.failed_items > 0 ? "error" : "default"}
        />
        <Stat
          label="Progress"
          value={`${pct}%`}
          icon="trending_up"
          tone={isActive ? "running" : "default"}
        />
      </section>

      {job.total_items > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {job.error && (
        <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg">
          <p className="font-ui-label text-ui-label font-semibold text-on-error-container mb-xs">
            Job error
          </p>
          <p className="font-mono-data text-mono-data text-on-error-container whitespace-pre-wrap">
            {job.error}
          </p>
        </div>
      )}

      {job.products.length > 0 && (
        <section>
          <h2 className="font-section-heading text-lg text-text-primary mb-md">
            Generated Products ({job.products.length})
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {job.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-section-heading text-lg text-text-primary mb-md">
          Items ({job.items.length})
        </h2>
        <div className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm overflow-hidden">
          {job.items.length === 0 ? (
            <div className="p-lg text-center font-ui-label text-ui-label text-text-muted">
              No items yet. The job will populate items as it dispatches.
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {job.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this job?"
        description="Marks the job and any pending items as cancelled. Items that already finished keep their generated copy and images."
        confirmLabel="Cancel job"
        busy={cancelMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => cancelMutation.mutate()}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this job permanently?"
        description="Removes the job and every item row. Already-generated products and Shopify drafts are kept. This cannot be undone."
        confirmLabel="Delete forever"
        tone="danger"
        busy={deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "default" | "success" | "error" | "running";
}) {
  const palette =
    tone === "success"
      ? "bg-badge-ready-bg text-badge-ready-text"
      : tone === "error"
        ? "bg-error-container/60 text-on-error-container"
        : tone === "running"
          ? "bg-badge-running-bg text-badge-running-text"
          : "bg-warm-white text-text-primary border border-border/40";
  return (
    <div className={cn("rounded-2xl p-md shadow-sm", palette)}>
      <Icon name={icon} size={20} className="opacity-80" />
      <div className="font-section-heading text-2xl mt-xs">{value}</div>
      <p className="font-ui-label text-ui-label opacity-80">{label}</p>
    </div>
  );
}

function ProductCard({ product }: { product: JobProductSummary }) {
  const published = !!product.shopify_product_id;
  return (
    <li className="rounded-2xl border border-border/40 bg-warm-white shadow-sm overflow-hidden flex flex-col">
      <ProductThumbnail
        src={product.hero_url}
        alt={product.title ?? "Product"}
        size="lg"
        className="w-full !rounded-none aspect-[4/3] h-auto"
      />
      <div className="p-md flex flex-col gap-xs flex-1">
        <h3 className="font-section-heading text-base text-text-primary line-clamp-2">
          {product.title ?? "Untitled"}
        </h3>
        <p className="font-ui-label text-ui-label text-text-muted capitalize">
          {product.source_supplier} · {product.asset_count} images
        </p>
        <div className="flex items-center justify-between mt-auto pt-xs">
          <span
            className={cn(
              "inline-flex items-center px-sm py-1 rounded-full text-[11px] font-bold",
              pillTone(product.status),
            )}
          >
            {published ? "published" : product.status}
          </span>
          {product.shopify_handle && (
            <a
              href={`https://${product.shopify_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-ui-label text-ui-label inline-flex items-center gap-xs"
            >
              View
              <Icon name="open_in_new" size={14} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function ItemRow({ item }: { item: JobItemSummary }) {
  return (
    <li className="px-md py-sm flex items-start gap-sm">
      <span className="font-mono-data text-mono-data text-text-muted w-8 flex-shrink-0">
        #{item.row_index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="font-ui-label text-ui-label text-text-primary truncate"
          title={item.source_url}
        >
          {item.source_url}
        </p>
        {item.error && (
          <p className="font-mono-data text-xs text-error mt-xs whitespace-pre-wrap">
            {item.error}
          </p>
        )}
      </div>
      <span
        className={cn(
          "inline-flex items-center px-sm py-0.5 rounded-full text-[10px] font-bold flex-shrink-0",
          pillTone(item.status),
        )}
      >
        {item.status}
      </span>
    </li>
  );
}
