"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { StoreSummary } from "@/app/api/stores/route";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ProductThumbnail } from "@/components/brand/product-thumbnail";
import { cn } from "@/lib/cn";

type QueueItem = {
  id: string;
  name: string;
  supplier: string;
  status: "ready" | "scraping" | "pending";
  thumb: string | null;
};

type CsvRow = Record<string, string>;

function detectSupplier(row: CsvRow): string {
  const cols = Object.entries(row).filter(([, v]) => v && /^https?:\/\//.test(String(v)));
  for (const [k] of cols) {
    const key = k.toLowerCase();
    if (key.includes("amazon")) return "amazon_us";
    if (key.includes("aliexpress")) return "aliexpress";
    if (key.includes("alibaba")) return "alibaba";
    if (key.includes("1688")) return "1688";
    if (key.includes("etsy")) return "etsy_local";
    if (key.includes("ebay")) return "ebay_global";
    if (key.includes("shopify")) return "shopify_crawl";
  }
  return "other";
}

function rowName(row: CsvRow): string {
  return (
    row.product_name ||
    row["Product Name"] ||
    row.name ||
    row.title ||
    "Unnamed product"
  );
}

export default function ConfigurePage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string>("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [targetMarket, setTargetMarket] = useState("North America (EN)");

  const [toggles, setToggles] = useState({
    generateCopy: true,
    generateImages: true,
    generateSeo: false,
  });

  const [expanded, setExpanded] = useState({
    seo: true,
    shopify: false,
  });

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("csvData");
      const storeRaw = sessionStorage.getItem("storeId");
      if (storeRaw) setStoreId(storeRaw);
      if (!raw) return;
      const rows = JSON.parse(raw) as CsvRow[];
      const items: QueueItem[] = rows.map((r, i) => ({
        id: `row-${i}`,
        name: rowName(r),
        supplier: detectSupplier(r),
        status: i < 3 ? "ready" : i === 3 ? "scraping" : "pending",
        thumb: null,
      }));
      setQueue(items);
      setSelectedId(items[0]?.id ?? null);
    } catch {
      // ignore
    }
  }, []);

  const storesQuery = useQuery<StoreSummary[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.stores as StoreSummary[];
    },
  });

  const activeStores = (storesQuery.data ?? []).filter((s) => s.is_active);
  const currentStore = activeStores.find((s) => s.id === storeId);

  const stats = useMemo(() => {
    const ready = queue.filter((q) => q.status === "ready").length;
    const pending = queue.filter((q) => q.status === "pending" || q.status === "scraping").length;
    return { ready, pending };
  }, [queue]);

  const enabledCount = Object.values(toggles).filter(Boolean).length;
  const spoonCredits = queue.length * 2; // rough estimate: 2 credits per product
  const estimatedMin = Math.max(1, Math.ceil((queue.length * enabledCount * 20) / 60));

  async function handleStart() {
    setStartError(null);
    if (starting) return;
    if (!storeId) {
      setStartError("Pick a target store first.");
      return;
    }

    const csvRaw = sessionStorage.getItem("csvData");
    if (!csvRaw) {
      setStartError("No CSV data found. Go back to the upload step.");
      return;
    }

    let rows: CsvRow[] = [];
    try {
      rows = JSON.parse(csvRaw) as CsvRow[];
    } catch (e) {
      setStartError(`CSV parse failed: ${(e as Error).message}`);
      return;
    }

    setStarting(true);
    try {
      // Persist options for any UI that wants them later (review page reads
      // these too). The actual work happens server-side from here on.
      sessionStorage.setItem(
        "generationOptions",
        JSON.stringify({ toggles, openAiKey, targetMarket, storeId }),
      );

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          filename:
            sessionStorage.getItem("csvFilename") || `inline-${Date.now()}.csv`,
          rows,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      // Free the sessionStorage so a back-tap doesn't re-dispatch the same job.
      sessionStorage.removeItem("csvData");

      // Phase A (scrape) runs server-side from here. Take the user to the
      // review page that polls until the first row is ready, then shows the
      // scraped content + a Continue button to kick off phase B (Gemini).
      router.push(`/dashboard/jobs/${body.jobId}/scrape-review`);
    } catch (e) {
      setStartError((e as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-lg pb-[140px]">
      <header>
        <h1 className="font-section-heading text-section-heading text-text-primary leading-tight">
          Configure Step
        </h1>
        <p className="font-spoonie-italic text-spoonie-italic italic text-text-muted mt-xs">
          Take a deep breath. We&rsquo;re almost ready to start.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1.4fr] gap-lg">
        {/* === Left: Extraction Queue === */}
        <section>
          <div className="flex items-center justify-between gap-sm mb-sm">
            <h2 className="font-ui-label text-[0.7rem] uppercase tracking-widest text-text-muted">
              Extraction Queue ({queue.length})
            </h2>
            <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full bg-warm-white border border-border/40 font-ui-label text-xs">
              <span className="text-success font-bold">{stats.ready}</span>
              <span className="text-text-muted">Ready</span>
              <span className="text-text-muted">·</span>
              <span className="text-processing font-bold">{stats.pending}</span>
              <span className="text-text-muted">Pending</span>
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="rounded-3xl border border-border/40 bg-warm-white p-lg text-center font-ui-label text-ui-label text-text-muted">
              No CSV data found. <Link href="/dashboard/new" className="text-primary hover:underline">Go back to upload.</Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-sm max-h-[600px] overflow-y-auto pr-xs">
              {queue.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full text-left rounded-2xl border bg-warm-white p-sm flex items-center gap-sm transition-all",
                      selectedId === item.id
                        ? "border-primary shadow-card"
                        : "border-border/40 hover:border-border",
                    )}
                  >
                    <ProductThumbnail src={item.thumb} alt={item.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-section-heading text-base text-text-primary truncate">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-xs mt-xs">
                        <span className="font-ui-label text-[10px] uppercase tracking-wider px-sm py-0.5 rounded-full bg-surface-variant text-text-muted">
                          {item.supplier}
                        </span>
                        <StatusChip status={item.status} />
                      </div>
                    </div>
                    <StatusIcon status={item.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* === Right: Generation Options === */}
        <section className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg sm:p-xl">
          <h2 className="font-section-heading text-xl text-text-primary mb-lg">
            Generation Options
          </h2>

          <div className="flex flex-col gap-sm">
            <ToggleRow
              icon="description"
              title="Generate Product Copy"
              subtitle="AI-crafted descriptions with your brand voice."
              checked={toggles.generateCopy}
              onChange={(v) => setToggles((t) => ({ ...t, generateCopy: v }))}
            />
            <ToggleRow
              icon="photo_library"
              title="Generate Images"
              subtitle="High-quality lifestyle renderings of your products."
              checked={toggles.generateImages}
              onChange={(v) => setToggles((t) => ({ ...t, generateImages: v }))}
            />
            <ToggleRow
              icon="key"
              title="Generate SEO Keywords"
              subtitle="Optimize for organic search effortlessly."
              checked={toggles.generateSeo}
              onChange={(v) => setToggles((t) => ({ ...t, generateSeo: v }))}
            />
          </div>

          <Collapsible
            icon="search"
            title="SEO CONFIGURATION"
            open={expanded.seo}
            onToggle={() => setExpanded((e) => ({ ...e, seo: !e.seo }))}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div>
                <label
                  htmlFor="openai-key"
                  className="block font-ui-label text-ui-label text-text-muted mb-xs"
                >
                  OpenAI API Key
                </label>
                <input
                  id="openai-key"
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md font-mono-data text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="market"
                  className="block font-ui-label text-ui-label text-text-muted mb-xs"
                >
                  Target Market
                </label>
                <select
                  id="market"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                >
                  <option>North America (EN)</option>
                  <option>United Kingdom (EN)</option>
                  <option>Europe (EN)</option>
                  <option>Asia Pacific</option>
                  <option>Global</option>
                </select>
              </div>
            </div>
          </Collapsible>

          <Collapsible
            icon="storefront"
            title="SHOPIFY DESTINATION"
            open={expanded.shopify}
            onToggle={() => setExpanded((e) => ({ ...e, shopify: !e.shopify }))}
          >
            <div>
              <label
                htmlFor="dest-store"
                className="block font-ui-label text-ui-label text-text-muted mb-xs"
              >
                Target Store
              </label>
              {activeStores.length === 0 ? (
                <p className="font-ui-label text-ui-label text-text-muted">
                  No active stores.{" "}
                  <Link href="/dashboard/connect" className="text-primary hover:underline">
                    Connect one
                  </Link>
                  .
                </p>
              ) : (
                <select
                  id="dest-store"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                >
                  <option value="">Choose a store…</option>
                  {activeStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shop_domain})
                    </option>
                  ))}
                </select>
              )}
              {currentStore && (
                <p className="font-ui-label text-ui-label text-text-muted mt-xs">
                  Drafts will be created in{" "}
                  <span className="font-mono-data text-text-primary">
                    {currentStore.shop_domain}
                  </span>
                  .
                </p>
              )}
            </div>
          </Collapsible>

          <div className="mt-lg rounded-2xl border-l-4 border-primary bg-badge-ready-bg/40 p-md flex items-start gap-sm">
            <Icon name="info" size={18} className="text-primary mt-[2px]" />
            <p className="font-ui-label text-ui-label text-text-primary leading-relaxed">
              You&rsquo;re currently using <strong>{spoonCredits} Spoon Credits</strong>{" "}
              for this generation. Your shop automation is optimized for energy
              conservation.
            </p>
          </div>
        </section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[260px] bg-warm-white/95 backdrop-blur-xl border-t border-border px-md sm:px-lg py-sm sm:py-md pb-safe z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-sm">
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
          >
            <Icon name="arrow_back" size={18} />
            Back
          </Link>
          <div className="hidden md:block text-right">
            <p className="font-ui-label text-[10px] uppercase tracking-widest text-text-muted">
              Ready to generate
            </p>
            <p className="font-ui-label text-ui-label font-bold text-primary">
              {queue.length} Items · Estimated {estimatedMin}m
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleStart}
            disabled={
              starting || queue.length === 0 || enabledCount === 0 || !storeId
            }
          >
            {starting ? (
              <>
                <Icon name="progress_activity" size={18} className="animate-spin" />
                Dispatching…
              </>
            ) : (
              <>
                Start Generation
                <Icon name="auto_awesome" size={18} />
              </>
            )}
          </Button>
        </div>
        {startError && (
          <div className="max-w-7xl mx-auto mt-sm rounded-2xl border border-error/30 bg-error-container/40 px-md py-sm text-on-error-container font-ui-label text-ui-label flex items-start gap-sm">
            <Icon name="error" size={16} className="mt-0.5 flex-shrink-0" />
            <span className="min-w-0 flex-1">{startError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn(
        "rounded-2xl border p-md flex items-center gap-md text-left transition-all",
        checked
          ? "border-primary/40 bg-badge-ready-bg/40"
          : "border-border/40 bg-surface-container-low hover:border-border",
      )}
    >
      <span
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          checked ? "bg-primary-container text-primary" : "bg-surface-variant text-text-muted",
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-section-heading text-base text-text-primary">{title}</p>
        <p className="font-ui-label text-ui-label text-text-muted">{subtitle}</p>
      </div>
      <span
        className={cn(
          "relative w-12 h-7 rounded-full flex-shrink-0 transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}

function Collapsible({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-md rounded-2xl border border-border/40 bg-surface-container-low overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-sm px-md py-sm hover:bg-surface-container transition-colors"
      >
        <span className="inline-flex items-center gap-sm">
          <Icon name={icon} size={18} className="text-primary" />
          <span className="font-ui-label text-ui-label font-bold tracking-wider">
            {title}
          </span>
        </span>
        <Icon
          name="expand_more"
          size={20}
          className={cn("text-text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-md pb-md pt-xs">{children}</div>}
    </div>
  );
}

function StatusChip({ status }: { status: QueueItem["status"] }) {
  const text =
    status === "ready" ? "READY" : status === "scraping" ? "SCRAPING…" : "PENDING";
  const tone =
    status === "ready"
      ? "bg-badge-ready-bg text-badge-ready-text"
      : status === "scraping"
        ? "bg-badge-running-bg text-badge-running-text"
        : "bg-surface-variant text-text-muted";
  return (
    <span
      className={cn(
        "font-ui-label text-[10px] uppercase tracking-wider px-sm py-0.5 rounded-full",
        tone,
      )}
    >
      {text}
    </span>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  if (status === "ready") {
    return <Icon name="check_circle" size={20} filled className="text-success" />;
  }
  if (status === "scraping") {
    return (
      <Icon name="progress_activity" size={20} className="text-processing animate-spin" />
    );
  }
  return <Icon name="schedule" size={20} className="text-text-muted" />;
}
