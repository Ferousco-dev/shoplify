"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { JobSummary } from "@/app/api/jobs/route";
import type { DashboardStats } from "@/app/api/stats/route";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
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
  if (ACTIVE.has(status)) return "bg-badge-running-bg text-badge-running-text";
  return "bg-surface-variant text-text-muted";
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardHome({
  shopName,
  shopDomain,
}: {
  shopName: string;
  shopDomain: string;
}) {
  const jobsQuery = useQuery<JobSummary[]>({
    queryKey: ["jobs", shopDomain, "recent"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=5");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.jobs as JobSummary[];
    },
  });

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", shopDomain],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as DashboardStats;
    },
  });

  const jobs = jobsQuery.data ?? [];
  const activeCount = jobs.filter((j) => ACTIVE.has(j.status)).length;
  const spoonsUsed = Math.min(12, activeCount * 2 + 6);

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-lg">
        {/* === Main column === */}
        <div className="flex flex-col gap-lg min-w-0">
          {/* Hero card */}
          <section className="rounded-3xl bg-warm-white border border-border/40 shadow-card p-lg sm:p-xl">
            <p className="font-spoonie-italic text-spoonie-italic italic text-primary">
              By/For/With Spoonies
            </p>
            <h1 className="font-section-heading text-display-hero-mobile sm:text-[3.25rem] lg:text-[3.75rem] text-text-primary leading-[1.05] mt-sm">
              Turn supplier links into Shopify listings{" "}
              <span className="font-spoonie-italic italic text-primary">
                without the flare.
              </span>
            </h1>
            <p className="font-ui-label text-base text-text-muted mt-md max-w-xl leading-relaxed">
              Low-energy tools for high-impact inventory management. We handle the
              heavy lifting so you can save your spoons for what matters.
            </p>
            <div className="flex flex-wrap gap-sm mt-lg">
              <Link
                href="/dashboard/new"
                className="inline-flex items-center gap-sm h-12 px-xl rounded-full bg-primary text-on-primary font-ui-label text-ui-label font-medium shadow-card hover:opacity-90 transition-all"
              >
                <Icon name="upload_file" size={18} />
                Upload CSV
              </Link>
              <Link
                href="/dashboard/new/manual"
                className="inline-flex items-center gap-sm h-12 px-xl rounded-full border-[1.5px] border-primary text-primary font-ui-label text-ui-label font-medium hover:bg-primary/5 transition-all"
              >
                <Icon name="edit" size={18} />
                Add Product Manually
              </Link>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <StatTile
              icon="inventory_2"
              label="Products Generated"
              value={statsQuery.data?.productsGenerated ?? 0}
              tone="ready"
              loading={statsQuery.isLoading}
            />
            <StatTile
              icon="image"
              label="Images Created"
              value={statsQuery.data?.imagesCreated ?? 0}
              tone="sand"
              loading={statsQuery.isLoading}
            />
          </section>

          {/* Recent Jobs table */}
          <section className="rounded-3xl border border-border/40 bg-warm-white shadow-card overflow-hidden">
            <header className="flex items-center justify-between px-lg py-md border-b border-border/30">
              <h2 className="font-section-heading text-xl text-text-primary">
                Recent Jobs
              </h2>
              <Link
                href="/dashboard/jobs"
                className="font-ui-label text-ui-label text-primary hover:underline"
              >
                View all
              </Link>
            </header>

            {jobsQuery.isLoading ? (
              <div className="p-lg flex justify-center">
                <DotsLoader label="Loading jobs…" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-xl text-center font-ui-label text-ui-label text-text-muted">
                Nothing here yet. Upload a CSV or add a product manually to get started.
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="text-text-muted font-ui-label text-[0.7rem] uppercase tracking-wider text-left">
                        <th className="px-lg py-sm font-medium">Product Name</th>
                        <th className="px-lg py-sm font-medium">Source</th>
                        <th className="px-lg py-sm font-medium">Status</th>
                        <th className="px-lg py-sm font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {jobs.map((j) => (
                        <tr
                          key={j.id}
                          className="hover:bg-surface-container-low/40 transition-colors"
                        >
                          <td className="px-lg py-md">
                            <Link
                              href={`/dashboard/jobs/${j.id}`}
                              className="flex items-center gap-md"
                            >
                              <ProductThumbnail
                                src={null}
                                alt={j.source_filename}
                                size="sm"
                              />
                              <span className="font-section-heading text-base text-text-primary truncate max-w-[280px]">
                                {j.source_filename}
                              </span>
                            </Link>
                          </td>
                          <td className="px-lg py-md font-mono-data text-mono-data text-text-muted">
                            CSV upload
                          </td>
                          <td className="px-lg py-md">
                            <span
                              className={cn(
                                "inline-flex items-center px-sm py-1 rounded-full text-xs font-bold",
                                pillTone(j.status),
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5" />
                              {j.status}
                            </span>
                          </td>
                          <td className="px-lg py-md text-right font-ui-label text-ui-label text-text-muted">
                            {dateLabel(j.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <ul className="md:hidden divide-y divide-border/30">
                  {jobs.map((j) => (
                    <li key={j.id}>
                      <Link
                        href={`/dashboard/jobs/${j.id}`}
                        className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-low/40 transition-colors"
                      >
                        <ProductThumbnail src={null} alt={j.source_filename} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-section-heading text-base text-text-primary truncate">
                            {j.source_filename}
                          </p>
                          <div className="flex items-center gap-xs mt-xs">
                            <span
                              className={cn(
                                "inline-flex items-center px-sm py-0.5 rounded-full text-[10px] font-bold",
                                pillTone(j.status),
                              )}
                            >
                              {j.status}
                            </span>
                            <span className="font-ui-label text-ui-label text-text-muted">
                              · {dateLabel(j.created_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* === Side panel === */}
        <aside className="flex flex-col gap-md">
          <div className="rounded-3xl border border-border/40 bg-surface-container-low p-lg">
            <p className="font-spoonie-italic text-spoonie-italic italic text-text-primary leading-relaxed">
              &ldquo;You&rsquo;ve done a lot today. It&rsquo;s okay to let the
              automation handle the rest while you rest.&rdquo;
            </p>
          </div>

          <div className="rounded-3xl border border-border/40 bg-warm-white shadow-sm p-lg">
            <p className="font-ui-label text-ui-label text-text-muted mb-sm">
              Low Energy Tasks
            </p>
            <ul className="flex flex-col gap-sm">
              {[
                { label: "Review 5 AI descriptions", href: "/dashboard/products" },
                { label: "Categorize loose links", href: "/dashboard/products" },
                { label: "Check Shopify draft status", href: "/dashboard/inventory" },
              ].map((t) => (
                <li key={t.label}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-sm font-ui-label text-ui-label text-text-primary hover:text-primary transition-colors"
                  >
                    <span className="w-4 h-4 border border-border rounded flex-shrink-0" />
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border/40 bg-warm-white shadow-sm p-lg">
            <p className="font-ui-label text-ui-label text-text-muted mb-sm">
              Current Spoon Status
            </p>
            <div className="flex items-center gap-sm">
              <Icon name="mood" size={20} className="text-primary" />
              <div className="relative h-3 flex-1 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                  style={{ width: `${(spoonsUsed / 12) * 100}%` }}
                />
              </div>
              <span className="font-mono-data text-mono-data text-text-muted">
                {spoonsUsed}/12
              </span>
            </div>
            <p className="font-ui-label text-ui-label text-text-muted mt-sm">
              Connected to{" "}
              <span className="font-mono-data text-text-primary">{shopName}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: string;
  label: string;
  value: number;
  tone: "ready" | "sand";
  loading: boolean;
}) {
  const palette =
    tone === "ready"
      ? "bg-badge-ready-bg/40"
      : "bg-surface-variant/60";
  return (
    <div className={cn("rounded-2xl border border-border/40 p-lg flex items-center gap-md", palette)}>
      <span className="w-12 h-12 rounded-2xl bg-warm-white flex items-center justify-center text-primary flex-shrink-0">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="font-ui-label text-ui-label text-text-muted">{label}</p>
        <p className="font-section-heading text-3xl text-text-primary leading-tight">
          {loading ? "—" : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
