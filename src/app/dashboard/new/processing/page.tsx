"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { DotsLoader } from "@/components/ui/dots-loader";
import { cn } from "@/lib/cn";
import { rateLimitQueue } from "@/lib/rate-limit";

type CsvRow = Record<string, string>;

type SlotMeta = {
  shortKey: string;
  label: string;
  promptPath: string;
  alt: string;
};

type GenerateTextResponse = {
  title: string;
  handle: string;
  descriptionHtml: string;
  seo: { title: string; description: string };
  tags: string[];
  metafields: { namespace: string; key: string; type: string; value: string }[];
  slots: SlotMeta[];
  referenceImages: string[];
  lifestylePrompts: Record<string, string>;
  promptCtx: {
    title: string;
    attributes: Record<string, unknown>;
    category: string;
  };
};

type GenerateImageResponse = {
  shortKey: string;
  label: string;
  alt: string;
  resourceUrl: string;
  mimeType: string;
  previewDataUrl: string;
};

type ImageState = {
  shortKey: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  preview?: string;
  resourceUrl?: string;
  alt?: string;
};

type ProductState = {
  id: string;
  rowIndex: number;
  rawRow: CsvRow;
  productName: string;
  status: "pending" | "generating_text" | "generating_images" | "done" | "error";
  log: string[];
  textResult?: GenerateTextResponse;
  images: ImageState[];
  error?: string;
};

const IMAGE_CONCURRENCY = 3;

function rowName(row: CsvRow): string {
  return (
    row.product_name ||
    row["Product Name"] ||
    row.name ||
    row.title ||
    "Unnamed product"
  );
}

function normaliseRow(row: CsvRow): CsvRow {
  const out: CsvRow = {};

  for (const [k, v] of Object.entries(row)) {
    out[k] = v ?? "";
    const lk = k.toLowerCase().trim().replace(/\s+/g, "_");
    if (!out[lk] && v) out[lk] = v;
  }

  out.product_name = rowName(row);
  out.amazon = out.amazon || out.product_url_amazon || out.amazon_url || out.amazon_link || "";
  out.aliexpress = out.aliexpress || out.product_url_aliexpress || out.aliexpress_url || out.aliexpress_link || "";
  out.alibaba = out.alibaba || out.product_url_alibaba || out.alibaba_url || out.alibaba_link || "";
  out.alibaba1688 = out.alibaba1688 || out.product_url_1688 || out["1688_url"] || out.url_1688 || out.alibaba_1688_url || "";
  out.category = out.category || out.product_category || "";
  out.primary_keyword = out.primary_keyword || out.primary_keywords || out.keyword || "";
  out.secondary_keywords = out.secondary_keywords || out.secondary_keyword || out.keywords || "";
  out.lifestyle_usage_rules = out.lifestyle_usage_rules || out.usage_rules || out.instructions || out.how_to_use || "";
  out.pairs_well_with = out.pairs_well_with || out.complements || out.accessories || "";

  return out;
}

/**
 * Retry transient failures only. Rate-limit / credit / quota errors are
 * pointless to retry — they just burn through the next-tier provider's
 * remaining tokens. Server-side fallback chain (Claude → Groq → Gemini) is a
 * better safety net than client-side spam.
 */
function isTransient(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes("rate limit") || msg.includes("rate_limit")) return false;
  if (msg.includes("quota") || msg.includes("credit balance")) return false;
  if (msg.includes("all ai providers failed")) return false;
  return true;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 1): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isTransient(e) || i >= attempts) break;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError;
}

function categoryFromSlot(shortKey: string): "ecommerce" | "lifestyle" | "closeup" | "ugc" {
  if (shortKey.startsWith("ugc")) return "ugc";
  if (shortKey.startsWith("scale") || shortKey.startsWith("human") || shortKey.startsWith("ambient"))
    return "lifestyle";
  if (shortKey.startsWith("texture") || shortKey.startsWith("functional") || shortKey.startsWith("branding"))
    return "closeup";
  return "ecommerce";
}

export default function ProcessingPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [products, setProducts] = useState<ProductState[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const csvRaw = sessionStorage.getItem("csvData");
      if (!csvRaw) {
        setGlobalError("No CSV data found. Go back to upload.");
        return;
      }
      const rows = JSON.parse(csvRaw) as CsvRow[];
      const initial: ProductState[] = rows.map((r, i) => ({
        id: `row-${i}`,
        rowIndex: i,
        rawRow: r,
        productName: rowName(r),
        status: "pending",
        log: [],
        images: [],
      }));
      setProducts(initial);
    } catch (e) {
      setGlobalError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    if (products.length === 0) return;
    startedRef.current = true;
    void runPipeline();
  }, [products.length]);

  function patchProduct(id: string, patch: Partial<ProductState>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function appendLog(id: string, line: string) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, log: [...p.log, line] } : p))
    );
  }

  function patchImage(productId: string, shortKey: string, patch: Partial<ImageState>) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id !== productId
          ? p
          : {
              ...p,
              images: p.images.map((img) =>
                img.shortKey === shortKey ? { ...img, ...patch } : img
              ),
            }
      )
    );
  }

  async function runPipeline() {
    setPhase("running");

    const finalDrafts: Array<{
      id: string;
      title: string;
      handle: string;
      descriptionHtml: string;
      seo: { title: string; description: string };
      tags: string[];
      metafields: { namespace: string; key: string; type: string; value: string }[];
      images: {
        shortKey: string;
        label: string;
        alt: string;
        resourceUrl: string;
        previewDataUrl?: string;
        category: "ecommerce" | "lifestyle" | "closeup" | "ugc";
      }[];
    }> = [];

    for (const product of products) {
      patchProduct(product.id, { status: "generating_text" });
      appendLog(product.id, "Scraping supplier + generating copy & SEO…");

      let textRes: GenerateTextResponse;
      try {
        const normRow = normaliseRow(product.rawRow);
        appendLog(product.id, `Normalized CSV: product=${normRow.product_name}, keyword=${normRow.primary_keyword}`);

        textRes = await withRetry(async () => {
          const res = await fetch("/api/generate-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(normRow),
          });
          const body = await res.json();
          if (!res.ok) {
            const errMsg = body.error || `HTTP ${res.status}`;
            appendLog(product.id, `API Error: ${errMsg}`);
            throw new Error(errMsg);
          }
          return body as GenerateTextResponse;
        });
      } catch (e) {
        const msg = (e as Error).message;
        appendLog(product.id, `✗ Generation failed: ${msg}`);
        patchProduct(product.id, { status: "error", error: msg });
        continue;
      }

      appendLog(product.id, `✓ Copy & SEO done · ${textRes.slots.length} image slots`);
      patchProduct(product.id, {
        status: "generating_images",
        textResult: textRes,
        images: textRes.slots.map((s) => ({
          shortKey: s.shortKey,
          label: s.label,
          status: "pending",
        })),
      });

      const completedImages: GenerateImageResponse[] = [];
      const queue = [...textRes.slots];

      async function worker() {
        while (queue.length > 0) {
          const slot = queue.shift();
          if (!slot) return;
          patchImage(product.id, slot.shortKey, { status: "running" });
          try {
            const r = await rateLimitQueue.add(async () => {
              const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  shortKey: slot.shortKey,
                  promptCtx: textRes.promptCtx,
                  alt: slot.alt,
                  referenceImages: textRes.referenceImages,
                  lifestylePrompt: textRes.lifestylePrompts[slot.shortKey],
                }),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
              return body as GenerateImageResponse;
            });
            completedImages.push(r);
            patchImage(product.id, slot.shortKey, {
              status: "done",
              preview: r.previewDataUrl,
              resourceUrl: r.resourceUrl,
              alt: r.alt,
            });
            appendLog(product.id, `✓ ${slot.label}`);
          } catch (e) {
            const msg = (e as Error).message;
            patchImage(product.id, slot.shortKey, { status: "error", error: msg });
            appendLog(product.id, `✗ ${slot.label}: ${msg}`);
          }
        }
      }

      await Promise.all(
        Array.from({ length: IMAGE_CONCURRENCY }, () => worker())
      );

      patchProduct(product.id, { status: "done" });

      finalDrafts.push({
        id: product.id,
        title: textRes.title,
        handle: textRes.handle,
        descriptionHtml: textRes.descriptionHtml,
        seo: textRes.seo,
        tags: textRes.tags,
        metafields: textRes.metafields,
        images: completedImages.map((img) => ({
          shortKey: img.shortKey,
          label: img.label,
          alt: img.alt,
          resourceUrl: img.resourceUrl,
          previewDataUrl: img.previewDataUrl,
          category: categoryFromSlot(img.shortKey),
        })),
      });
    }

    sessionStorage.setItem("generatedDrafts", JSON.stringify(finalDrafts));
    setPhase(finalDrafts.length > 0 ? "done" : "error");
  }

  const totalProducts = products.length;
  const doneProducts = products.filter((p) => p.status === "done").length;
  const failedProducts = products.filter((p) => p.status === "error").length;
  const overallPct = totalProducts
    ? Math.round(((doneProducts + failedProducts) / totalProducts) * 100)
    : 0;

  if (globalError) {
    return (
      <div className="flex flex-col gap-md max-w-2xl">
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
        >
          <Icon name="chevron_left" size={18} />
          Back
        </Link>
        <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg text-on-error-container">
          {globalError}
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col gap-lg max-w-2xl">
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
        >
          <Icon name="chevron_left" size={18} />
          Back
        </Link>
        <div className="flex items-center gap-md">
          <Icon name="check_circle" size={40} filled className="text-success" />
          <div>
            <h1 className="font-section-heading text-section-heading">Generated!</h1>
            <p className="font-ui-label text-ui-label text-text-muted">
              {doneProducts}/{totalProducts} products ready for review
            </p>
          </div>
        </div>
        <Button onClick={() => window.location.href = "/dashboard/new/review"}>
          Review Products →
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg max-w-4xl pb-[200px]">
      <div>
        <p className="font-ui-label text-ui-label text-text-muted text-sm">
          {overallPct}% complete
        </p>
        <h1 className="font-section-heading text-section-heading mt-xs">Generating…</h1>
      </div>

      <div className="w-full bg-surface-variant rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      <div className="space-y-md max-h-[600px] overflow-y-auto">
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-border/40 bg-warm-white p-md"
          >
            <div className="flex items-center gap-md mb-md">
              {product.status === "error" ? (
                <Icon name="error" size={24} className="text-error" />
              ) : product.status === "done" ? (
                <Icon name="check_circle" size={24} filled className="text-success" />
              ) : (
                <DotsLoader size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-ui-label text-ui-label font-medium truncate">
                  {product.productName}
                </h3>
                <p className="text-xs text-text-muted capitalize">{product.status}</p>
              </div>
            </div>

            {product.log.length > 0 && (
              <div className="text-xs font-mono text-text-muted space-y-1 bg-surface-container-low p-sm rounded max-h-32 overflow-y-auto">
                {product.log.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
