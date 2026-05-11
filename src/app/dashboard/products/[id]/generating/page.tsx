"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ProductDetail, ProductAsset } from "@/app/api/products/[id]/route";

// Mirrors lib/slots.ts so the grid renders consistent labels even before any
// asset has come back from Gemini. Order matches the visual flow you'd expect
// on a Shopify PDP: hero first, then orbit angles, then lifestyle/closeups.
const SLOT_GRID: { shortKey: string; label: string }[] = [
  { shortKey: "front", label: "Front Hero" },
  { shortKey: "three_quarter", label: "Three-Quarter" },
  { shortKey: "profile", label: "Profile" },
  { shortKey: "birds_eye", label: "Birds Eye" },
  { shortKey: "flatlay", label: "Hero Flatlay" },
  { shortKey: "scale_correct", label: "Lifestyle · Scale" },
  { shortKey: "human_perspective", label: "Lifestyle · POV" },
  { shortKey: "ambient", label: "Lifestyle · Ambient" },
  { shortKey: "rear", label: "Rear / Base" },
  { shortKey: "texture", label: "Texture" },
  { shortKey: "functional", label: "Functional" },
  { shortKey: "branding", label: "Branding" },
  { shortKey: "ugc_routine", label: "UGC · Routine" },
  { shortKey: "ugc_use", label: "UGC · In Use" },
];

const COPY_STATUSES = new Set([
  "generating_copy",
  "generating_seo",
  "generating_lifestyle_prompts",
]);
const IMAGE_STATUSES = new Set([
  "generating_images",
  "uploading_assets",
  "syncing_shopify",
]);
const DONE = new Set(["completed"]);
const FAILED = (s: string) => s.startsWith("failed");

export default function GeneratingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

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
      if (!s) return 2000;
      if (DONE.has(s) || FAILED(s)) return false;
      return 2000;
    },
  });

  const product = productQuery.data;

  // Index generated assets by slot so we can render them in the grid in
  // realtime as Gemini comes back with each one.
  const assetsBySlot = useMemo(() => {
    const map: Record<string, ProductAsset> = {};
    if (!product) return map;
    for (const a of product.assets) {
      if (a.kind === "generated" && a.slot && a.public_url) {
        map[a.slot] = a;
      }
    }
    return map;
  }, [product]);

  const filled = SLOT_GRID.filter((s) => assetsBySlot[s.shortKey]).length;
  const total = SLOT_GRID.length;
  const pct = Math.round((filled / total) * 100);

  const isCopyPhase = product && COPY_STATUSES.has(product.status);
  const isImagePhase = product && IMAGE_STATUSES.has(product.status);
  const isDone = product && DONE.has(product.status);
  const isFailed = product && FAILED(product.status);

  // Auto-redirect to the product detail page on completion. The detail page
  // is where the "Push to Shopify" button lives, so this is the natural
  // landing spot for the operator.
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => router.push(`/dashboard/products/${id}`), 800);
      return () => clearTimeout(t);
    }
  }, [isDone, id, router]);

  if (productQuery.error) {
    return (
      <div className="flex flex-col gap-md max-w-2xl">
        <BackLink />
        <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg text-on-error-container">
          {(productQuery.error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl pb-[200px]">
      <BackLink />

      <div>
        <p className="font-ui-label text-ui-label text-text-muted text-sm">
          Step 2 of 2 ·{" "}
          {isCopyPhase
            ? "Writing copy & SEO"
            : isImagePhase
              ? "Generating images"
              : isDone
                ? "Done"
                : isFailed
                  ? "Failed"
                  : "Starting…"}
        </p>
        <h1 className="font-section-heading text-section-heading mt-xs">
          {product?.title || "Generating product…"}
        </h1>
      </div>

      <div className="rounded-2xl border border-border/40 bg-warm-white p-lg flex items-center gap-md">
        {isDone ? (
          <Icon name="check_circle" size={32} filled className="text-success" />
        ) : isFailed ? (
          <Icon name="error" size={32} className="text-error" />
        ) : (
          <DotsLoader size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-ui-label text-base">
            {isCopyPhase &&
              "Claude is drafting your product copy, tags, metafields, and image prompts."}
            {isImagePhase && (
              <>
                Gemini is generating <strong>{total} images</strong> at three at
                a time. <span className="text-text-muted">{filled}/{total} done.</span>
              </>
            )}
            {isDone && "All images ready. Redirecting to the product page…"}
            {isFailed && (
              <>Generation failed: <span className="text-text-muted">{product?.failure_reason || "unknown error"}</span></>
            )}
            {!product && "Connecting to the server…"}
          </p>
          <div className="w-full bg-surface-variant rounded-full h-2 mt-sm">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${isCopyPhase ? 10 : isImagePhase ? Math.max(15, pct) : isDone ? 100 : 5}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* The 14-box grid. Each tile transitions from a placeholder skeleton
        * (while pending) to the generated image (filled). Errors per-slot
        * surface as an inline icon — they don't fail the whole run. */}
      <section>
        <h2 className="font-section-heading text-base mb-sm">
          Images ({filled}/{total})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-sm">
          {SLOT_GRID.map((slot) => {
            const asset = assetsBySlot[slot.shortKey];
            const ready = !!asset;
            return (
              <figure
                key={slot.shortKey}
                className={cn(
                  "aspect-square rounded-2xl overflow-hidden border bg-surface-variant relative flex items-center justify-center transition-all duration-300",
                  ready
                    ? "border-success/40 shadow-sm"
                    : "border-border/30 animate-pulse",
                )}
              >
                {ready && asset.public_url ? (
                  <Image
                    src={asset.public_url}
                    alt={(asset as { meta?: { alt?: string } }).meta?.alt || slot.label}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : isImagePhase ? (
                  <DotsLoader size="sm" />
                ) : (
                  <Icon name="hourglass_empty" size={20} className="text-text-muted/50" />
                )}
                <figcaption className="absolute bottom-0 left-0 right-0 px-xs py-1 bg-background/85 backdrop-blur-sm text-[10px] uppercase tracking-wider text-text-muted text-center font-mono">
                  {slot.label}
                  {ready && (
                    <Icon
                      name="check_circle"
                      size={10}
                      filled
                      className="text-success inline-block ml-1 -mt-px"
                    />
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {isFailed && (
        <div className="flex gap-sm">
          <Button onClick={() => router.refresh()}>Reload</Button>
          <Link
            href={`/dashboard/products/${id}`}
            className="inline-flex items-center gap-xs px-md py-sm rounded-full border border-border font-ui-label text-ui-label text-primary hover:bg-primary/5"
          >
            Inspect product →
          </Link>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/jobs"
      className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
    >
      <Icon name="chevron_left" size={18} />
      All jobs
    </Link>
  );
}
