"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { DotsLoader } from "@/components/ui/dots-loader";

type ScrapedData = {
  sourceUrl: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  price?: string;
  images: string[];
  attributes: Record<string, string>;
  rawText?: string;
  rawMarkdown?: string;
  scrapedVia?: "apify" | "fetch";
};

type JobItem = {
  id: string;
  row_index: number;
  source_url: string;
  status: string;
  error: string | null;
  product_id: string | null;
};

type ProductDetail = {
  id: string;
  title: string | null;
  status: string;
  raw_data: { scraped?: ScrapedData | null; scrapeError?: string | null; csvRow?: Record<string, string> };
  failure_reason: string | null;
};

type JobDetail = {
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  items: JobItem[];
};

export default function ScrapeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [allDone, setAllDone] = useState(false);

  // Poll the job until it has at least one item with status=awaiting_review.
  // Phase A is fast (a single Apify call + DB writes), so 2s ticks are fine.
  // When this page is re-entered after publishing a draft, this same loop
  // automatically picks the *next* awaiting row in the CSV — implementing the
  // multi-product walk-through without any extra navigation logic.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Reset state if jobId changes (e.g. operator navigates to a different job).
    setProduct(null);
    setAllDone(false);
    setError(null);
    async function tick() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
        const data = (await res.json()) as JobDetail;
        if (!alive) return;
        setJob(data);
        const ready = data.items.find(
          (i) => i.status === "awaiting_review" && i.product_id,
        );
        if (ready?.product_id) {
          const r = await fetch(`/api/products/${ready.product_id}`);
          if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
          const p = (await r.json()) as ProductDetail;
          if (!alive) return;
          setProduct(p);
          return; // stop polling — operator now drives this row
        }
        // No awaiting_review items left. If everything is in a terminal state
        // (or already past awaiting_review), we're done.
        const stillScraping = data.items.some(
          (i) => i.status === "pending" || i.status === "running",
        );
        if (!stillScraping) {
          setAllDone(true);
          return;
        }
        timer = setTimeout(tick, 2000);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }
    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  async function handleContinue() {
    if (!product) return;
    setGenerating(true);
    setError(null);
    try {
      // Endpoint is fire-and-forget — it returns as soon as the worker is
      // dispatched. The progress page polls /api/products/:id to render the
      // 14-tile live grid.
      const res = await fetch(`/api/products/${product.id}/generate`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      router.push(`/dashboard/products/${product.id}/generating`);
    } catch (e) {
      setError((e as Error).message);
      setGenerating(false);
    }
  }

  const scraped = product?.raw_data?.scraped ?? null;
  const scrapeError = product?.raw_data?.scrapeError ?? null;

  if (error && !product) {
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
          {error}
        </div>
      </div>
    );
  }

  if (allDone) {
    const total = job?.total_items ?? 0;
    const done = job?.completed_items ?? 0;
    return (
      <div className="flex flex-col gap-lg max-w-2xl pb-[100px]">
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
        >
          <Icon name="chevron_left" size={18} />
          All jobs
        </Link>
        <div className="rounded-3xl border border-success/40 bg-success/10 p-xl text-center">
          <Icon name="check_circle" size={48} filled className="text-success mx-auto" />
          <h1 className="font-section-heading text-section-heading mt-md">
            All products processed
          </h1>
          <p className="text-text-muted mt-xs">
            {done}/{total} item{total === 1 ? "" : "s"} from this CSV reached a
            terminal state. Pick up any draft from your products list.
          </p>
          <div className="flex items-center justify-center gap-sm mt-lg flex-wrap">
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-primary text-on-primary font-ui-label text-ui-label hover:opacity-90 transition-opacity"
            >
              View products
              <Icon name="arrow_forward" size={16} />
            </Link>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-xs px-md py-sm rounded-full border border-border font-ui-label text-ui-label text-primary hover:bg-primary/5 transition-colors"
            >
              Start a new job
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    const pct =
      job && job.total_items > 0
        ? Math.round(
            ((job.completed_items + job.failed_items) / job.total_items) * 100,
          )
        : 0;
    return (
      <div className="flex flex-col gap-lg max-w-2xl pb-[200px]">
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
        >
          <Icon name="chevron_left" size={18} />
          Back
        </Link>
        <div>
          <p className="font-ui-label text-ui-label text-text-muted text-sm">
            Step 1 of 2 · Scraping supplier link
          </p>
          <h1 className="font-section-heading text-section-heading mt-xs">
            Reading what&apos;s in the link…
          </h1>
        </div>
        <div className="w-full bg-surface-variant rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="rounded-2xl border border-border/40 bg-warm-white p-lg flex items-center gap-md">
          <DotsLoader size="sm" />
          <div>
            <p className="font-ui-label">Fetching the page and extracting content</p>
            <p className="text-sm text-text-muted">
              {job?.status === "running"
                ? "Apify is rendering the page in headless Chrome — usually 20–60s."
                : "Queued…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl pb-[200px]">
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
      >
        <Icon name="chevron_left" size={18} />
        Back
      </Link>

      <div>
        <p className="font-ui-label text-ui-label text-text-muted text-sm">
          Step 1 of 2 · Review what was scraped
          {job && job.total_items > 1 && (
            <>
              {" · "}
              <span className="font-mono-data">
                Row {(job.completed_items + job.failed_items) + 1} of{" "}
                {job.total_items}
              </span>
            </>
          )}
        </p>
        <h1 className="font-section-heading text-section-heading mt-xs">
          {product.title || scraped?.title || "Scraped product"}
        </h1>
        {scraped?.sourceUrl && (
          <a
            href={scraped.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-xs text-sm text-text-muted hover:text-primary mt-xs"
          >
            <Icon name="open_in_new" size={14} />
            {scraped.sourceUrl}
          </a>
        )}
        {scraped?.scrapedVia && (
          <p className="text-xs text-text-muted mt-xs">
            scraped via <span className="font-mono">{scraped.scrapedVia}</span>
          </p>
        )}
      </div>

      {scrapeError && (
        <div className="rounded-2xl border border-error/30 bg-error-container/40 p-md text-sm text-on-error-container">
          Scrape returned an error: {scrapeError}. You can still continue —
          generation will fall back to the CSV data only.
        </div>
      )}

      {scraped?.images?.length ? (
        <section>
          <h2 className="font-section-heading text-base mb-sm">
            Images found ({scraped.images.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-sm">
            {scraped.images.slice(0, 12).map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="aspect-square rounded-2xl overflow-hidden bg-surface-variant border border-border/30 relative"
              >
                <Image
                  src={url}
                  alt={`Scraped image ${i + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 25vw"
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-warm-white p-md text-sm text-text-muted">
          No images extracted from this link.
        </div>
      )}

      {scraped?.title && (
        <section>
          <h2 className="font-section-heading text-base mb-sm">
            Title (from page)
          </h2>
          <div className="rounded-2xl border border-border/40 bg-warm-white p-md text-sm">
            {scraped.title}
          </div>
        </section>
      )}

      {scraped?.description && (
        <section>
          <h2 className="font-section-heading text-base mb-sm">
            Description / SEO meta
          </h2>
          <div className="rounded-2xl border border-border/40 bg-warm-white p-md text-sm whitespace-pre-wrap leading-relaxed">
            {scraped.description}
          </div>
        </section>
      )}

      {scraped?.price && (
        <section>
          <h2 className="font-section-heading text-base mb-sm">Price</h2>
          <div className="rounded-2xl border border-border/40 bg-warm-white p-md text-sm font-mono">
            {scraped.price}
          </div>
        </section>
      )}

      {scraped?.attributes && Object.keys(scraped.attributes).length > 0 && (
        <section>
          <h2 className="font-section-heading text-base mb-sm">
            Attributes (JSON-LD)
          </h2>
          <div className="rounded-2xl border border-border/40 bg-warm-white p-md">
            <dl className="grid grid-cols-2 gap-sm text-sm">
              {Object.entries(scraped.attributes).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-text-muted font-mono text-xs">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {scraped?.rawMarkdown && (
        <section>
          <h2 className="font-section-heading text-base mb-sm">
            Full page content
          </h2>
          <details className="rounded-2xl border border-border/40 bg-warm-white">
            <summary className="cursor-pointer p-md font-ui-label text-ui-label">
              Show raw page text
            </summary>
            <pre className="px-md pb-md text-xs whitespace-pre-wrap break-words text-text-muted max-h-[400px] overflow-y-auto">
              {scraped.rawMarkdown}
            </pre>
          </details>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-error/30 bg-error-container/40 p-md text-sm text-on-error-container">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 left-0 right-0 -mx-md sm:-mx-lg px-md sm:px-lg py-md bg-background/95 backdrop-blur-md border-t border-border/30 flex items-center justify-between gap-md">
        <p className="text-sm text-text-muted hidden sm:block">
          Continue to generate copy, SEO, and 14 product images.
        </p>
        <Button onClick={handleContinue} disabled={generating}>
          {generating ? (
            <>
              <DotsLoader size="sm" />
              Generating…
            </>
          ) : (
            <>Continue → Generate 14 images</>
          )}
        </Button>
      </div>
    </div>
  );
}
