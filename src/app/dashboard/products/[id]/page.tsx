"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ProductAsset,
  ProductDetail,
  GenerationEntry,
} from "@/app/api/products/[id]/route";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { DotsLoader } from "@/components/ui/dots-loader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

const IMAGE_SLOTS = [
  "ecommerce_front",
  "ecommerce_45",
  "ecommerce_side",
  "ecommerce_birds_eye",
  "ecommerce_back",
  "lifestyle_scale_correct",
  "lifestyle_human_perspective",
  "lifestyle_ambient",
  "closeup_texture",
  "closeup_functional",
  "closeup_branding",
  "ugc_unboxing",
  "ugc_in_use",
  "ugc_in_routine",
] as const;

const SLOT_LABELS: Record<string, string> = {
  ecommerce_front: "Front",
  ecommerce_45: "45°",
  ecommerce_side: "Side",
  ecommerce_birds_eye: "Birds-eye",
  ecommerce_back: "Back",
  lifestyle_scale_correct: "Lifestyle · Scale",
  lifestyle_human_perspective: "Lifestyle · POV",
  lifestyle_ambient: "Lifestyle · Ambient",
  closeup_texture: "Closeup · Texture",
  closeup_functional: "Closeup · Functional",
  closeup_branding: "Closeup · Branding",
  ugc_unboxing: "UGC · Unboxing",
  ugc_in_use: "UGC · In use",
  ugc_in_routine: "UGC · In routine",
};

type StageKey = "scrape" | "copy" | "image_prompts" | "images" | "seo" | "shopify";

const STAGES: { key: StageKey; label: string; icon: string }[] = [
  { key: "scrape", label: "Scraping", icon: "language" },
  { key: "copy", label: "Copy", icon: "edit_note" },
  { key: "image_prompts", label: "Image Prompts", icon: "auto_awesome" },
  { key: "images", label: "Image Gen", icon: "image" },
  { key: "seo", label: "SEO", icon: "search" },
  { key: "shopify", label: "Shopify Draft", icon: "shopping_bag" },
];

const PIPELINE_ORDER = [
  "pending",
  "scraping",
  "scraped",
  "normalizing",
  "generating_copy",
  "generating_seo",
  "generating_lifestyle_prompts",
  "generating_images",
  "uploading_assets",
  "syncing_shopify",
  "completed",
] as const;

const TERMINAL = new Set(["completed", "cancelled"]);

function isFailed(status: string): boolean {
  return status.startsWith("failed");
}

function stageState(
  stage: StageKey,
  status: string,
): "done" | "running" | "waiting" | "error" {
  if (status === "failed_scrape" || status === "failed_normalize") {
    return stage === "scrape" ? "error" : "waiting";
  }
  if (status === "failed_copy")
    return stage === "copy" ? "error" : stage === "scrape" ? "done" : "waiting";
  if (status === "failed_lifestyle")
    return stage === "image_prompts" ? "error" : isPast(stage, "image_prompts") ? "done" : "waiting";
  if (status === "failed_seo")
    return stage === "seo" ? "error" : isPast(stage, "seo") ? "done" : "waiting";
  if (status === "failed_images")
    return stage === "images" ? "error" : isPast(stage, "images") ? "done" : "waiting";
  if (status === "failed_shopify") return stage === "shopify" ? "error" : "done";

  const RUNNING: Record<StageKey, string[]> = {
    scrape: ["pending", "scraping", "scraped", "normalizing"],
    copy: ["generating_copy"],
    image_prompts: ["generating_lifestyle_prompts"],
    images: ["generating_images"],
    seo: ["generating_seo"],
    shopify: ["uploading_assets", "syncing_shopify"],
  };
  const DONE_AT: Record<StageKey, number> = {
    scrape: PIPELINE_ORDER.indexOf("generating_copy"),
    copy: PIPELINE_ORDER.indexOf("generating_seo"),
    image_prompts: PIPELINE_ORDER.indexOf("generating_images"),
    images: PIPELINE_ORDER.indexOf("uploading_assets"),
    seo: PIPELINE_ORDER.indexOf("generating_lifestyle_prompts"),
    shopify: PIPELINE_ORDER.indexOf("completed"),
  };
  const idx = PIPELINE_ORDER.indexOf(status as (typeof PIPELINE_ORDER)[number]);
  if (status === "completed") return "done";
  if (RUNNING[stage].includes(status)) return "running";
  if (idx >= DONE_AT[stage]) return "done";
  return "waiting";
}

function isPast(stage: StageKey, ref: StageKey): boolean {
  const order: StageKey[] = [
    "scrape",
    "copy",
    "image_prompts",
    "images",
    "seo",
    "shopify",
  ];
  return order.indexOf(stage) < order.indexOf(ref);
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(true);
  const [confirm, setConfirm] = useState<"delete" | null>(null);

  const productQuery = useQuery<ProductDetail>({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as ProductDetail;
    },
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (!s) return 4000;
      if (TERMINAL.has(s) || isFailed(s)) return 30_000;
      return 3000;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      router.push("/dashboard/products");
    },
  });

  if (productQuery.isLoading) {
    return (
      <div className="py-2xl flex justify-center">
        <DotsLoader label="Loading product" layout="column" size="lg" />
      </div>
    );
  }
  if (productQuery.error || !productQuery.data) {
    return (
      <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg text-on-error-container">
        {(productQuery.error as Error | undefined)?.message ?? "Product not found"}
      </div>
    );
  }

  const product = productQuery.data;
  const generated = product.assets.filter((a) => a.kind === "generated");
  const generatedBySlot: Record<string, ProductAsset> = {};
  for (const a of generated) {
    if (a.slot) generatedBySlot[a.slot] = a;
  }
  const generatedCount = generated.length;
  const totalSlots = IMAGE_SLOTS.length;
  const isTerminal = TERMINAL.has(product.status) || isFailed(product.status);
  const overallPct = Math.round((generatedCount / totalSlots) * 100);

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-md">
        <div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
          >
            <Icon name="chevron_left" size={18} />
            Back to products
          </Link>
          <h1 className="font-section-heading text-section-heading text-text-primary leading-tight mt-xs">
            {product.title || "Untitled product"}
          </h1>
          <p className="font-spoonie-italic text-spoonie-italic italic text-text-muted mt-xs">
            Take a breath. We&rsquo;re handling the heavy lifting for you.
          </p>
        </div>
        <div className="flex items-center gap-xs flex-wrap">
          {product.shopify_product_id && (
            <span className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-badge-ready-bg text-badge-ready-text font-ui-label text-xs font-bold uppercase tracking-wider">
              <Icon name="check_circle" size={14} />
              In Shopify
            </span>
          )}
          {product.shopify_handle && (
            <a
              href={`https://${product.shopify_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-xs px-md py-sm rounded-full border border-border font-ui-label text-ui-label text-primary hover:bg-primary/5 transition-colors"
            >
              View in Shopify
              <Icon name="open_in_new" size={14} />
            </a>
          )}
          {isTerminal && (
            <Button size="sm" variant="danger" onClick={() => setConfirm("delete")}>
              <Icon name="delete" size={16} />
              Delete
            </Button>
          )}
        </div>
      </header>

      {/* Stage cards */}
      <section className="grid grid-cols-3 lg:grid-cols-6 gap-xs sm:gap-md">
        {STAGES.map((s) => {
          const state = stageState(s.key, product.status);
          return (
            <StageCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              state={state}
              progressLabel={
                s.key === "images" && (state === "running" || state === "done")
                  ? `${generatedCount}/${totalSlots}`
                  : undefined
              }
            />
          );
        })}
      </section>

      {/* Overall progress bar (image generation specifically — the most visible step) */}
      <div>
        <div className="flex items-center justify-between font-ui-label text-ui-label text-text-muted mb-xs">
          <span>Image generation</span>
          <span className="font-mono-data text-text-primary">
            {generatedCount}/{totalSlots} · {overallPct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {product.failure_reason && (
        <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg">
          <p className="font-ui-label text-ui-label font-bold text-on-error-container mb-xs inline-flex items-center gap-xs">
            <Icon name="error" size={16} />
            Pipeline error
          </p>
          <p className="font-mono-data text-mono-data text-on-error-container whitespace-pre-wrap">
            {product.failure_reason}
          </p>
        </div>
      )}

      {/* Image slot grid */}
      <section>
        <h2 className="font-section-heading text-xl text-text-primary mb-md">
          Image Slots ({generatedCount}/{totalSlots})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-sm">
          {IMAGE_SLOTS.map((slot) => {
            const asset = generatedBySlot[slot];
            const isImagesStage = stageState("images", product.status) === "running";
            const slotPending = !asset && isImagesStage;
            return (
              <figure
                key={slot}
                className={cn(
                  "rounded-2xl overflow-hidden border bg-warm-white aspect-square relative",
                  asset
                    ? "border-border/40 shadow-sm"
                    : "border-dashed border-border/60",
                )}
              >
                {asset?.public_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.public_url}
                    alt={SLOT_LABELS[slot] ?? slot}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-xs p-xs text-center">
                    {slotPending ? (
                      <Icon
                        name="progress_activity"
                        size={20}
                        className="text-processing animate-spin"
                      />
                    ) : (
                      <Icon name="image" size={20} className="text-text-muted/60" />
                    )}
                    <span className="font-ui-label text-[10px] uppercase tracking-wider text-text-muted">
                      {slotPending ? "Generating" : "Pending"}
                    </span>
                  </div>
                )}
                <figcaption className="absolute bottom-0 left-0 right-0 px-xs py-1 bg-text-primary/70 text-warm-white font-ui-label text-[10px] uppercase tracking-wider truncate">
                  {SLOT_LABELS[slot] ?? slot}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* Live log */}
      <section className="rounded-3xl border border-border/40 bg-warm-white shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-sm px-lg py-md hover:bg-surface-container-low/40 transition-colors"
        >
          <span className="inline-flex items-center gap-sm">
            <Icon name="terminal" size={18} className="text-primary" />
            <span className="font-ui-label text-ui-label font-bold uppercase tracking-wider">
              Live Processing Log
            </span>
            <span className="font-ui-label text-ui-label text-text-muted">
              ({product.recent_generations.length})
            </span>
          </span>
          <Icon
            name="expand_more"
            size={20}
            className={cn("text-text-muted transition-transform", !logOpen && "-rotate-90")}
          />
        </button>
        {logOpen && (
          <div className="px-lg pb-lg max-h-72 overflow-y-auto font-mono-data text-mono-data text-text-primary">
            {product.recent_generations.length === 0 ? (
              <p className="text-center text-text-muted py-md">
                No generations yet. They&rsquo;ll appear here as the pipeline runs.
              </p>
            ) : (
              <ul className="space-y-1">
                {product.recent_generations.map((g) => (
                  <LogLine key={g.id} entry={g} />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this product?"
        description="Removes the product, all its images, and pipeline history. The Shopify draft (if any) is kept. This cannot be undone."
        confirmLabel="Delete forever"
        tone="danger"
        busy={deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function StageCard({
  icon,
  label,
  state,
  progressLabel,
}: {
  icon: string;
  label: string;
  state: "done" | "running" | "waiting" | "error";
  progressLabel?: string;
}) {
  const palette = {
    done: "bg-badge-ready-bg text-badge-ready-text border-success/20",
    running: "bg-badge-running-bg text-badge-running-text border-processing/30 animate-pulse-soft",
    waiting: "bg-surface-container-low text-text-muted border-border/40",
    error: "bg-error-container text-on-error-container border-error/30",
  }[state];

  const stateIcon =
    state === "done"
      ? "check_circle"
      : state === "error"
        ? "error"
        : state === "running"
          ? "progress_activity"
          : "schedule";

  return (
    <div
      className={cn(
        "rounded-2xl border p-sm sm:p-md flex flex-col items-start gap-xs",
        palette,
      )}
    >
      <div className="flex items-center justify-between w-full">
        <Icon name={icon} size={20} className="opacity-80" />
        <Icon
          name={stateIcon}
          size={16}
          filled={state === "done"}
          className={cn(
            "opacity-90",
            state === "running" && "animate-spin",
          )}
        />
      </div>
      <p className="font-ui-label text-ui-label font-medium leading-tight">{label}</p>
      {progressLabel && (
        <p className="font-mono-data text-[10px] opacity-70">{progressLabel}</p>
      )}
    </div>
  );
}

function LogLine({ entry }: { entry: GenerationEntry }) {
  const tone =
    entry.status === "completed" || entry.status === "succeeded"
      ? "text-success"
      : entry.status === "failed"
        ? "text-error"
        : "text-processing";
  return (
    <li className="flex items-start gap-sm whitespace-pre">
      <span className="text-text-muted shrink-0">{relativeTime(entry.created_at).padStart(7)}</span>
      <span className={cn("shrink-0 uppercase font-bold", tone)}>{entry.status}</span>
      <span className="text-text-muted shrink-0">{entry.kind}</span>
      {entry.slot && <span className="shrink-0">{entry.slot}</span>}
      {entry.error && <span className="text-error truncate">{entry.error}</span>}
    </li>
  );
}
