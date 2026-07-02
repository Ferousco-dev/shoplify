"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { JobSummary } from "@/app/api/jobs/route";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { ProductThumbnail } from "@/components/brand/product-thumbnail";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "running" | "completed" | "failed";
type SourceFilter = "all" | "csv" | "manual";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

const ACTIVE = new Set([
  "pending",
  "running",
  "dispatched",
  "scraping",
  "scraped",
  "awaiting_review",
  "normalizing",
  "uploading_assets",
  "syncing_shopify",
  "generating",
  "generating_copy",
  "generating_images",
  "generating_seo",
]);

function isFailed(status: string) {
  return status === "failed" || status === "partial" || status === "cancelled" || status.startsWith("failed");
}

function simplifyStatus(status: string): "running" | "completed" | "failed" {
  if (ACTIVE.has(status)) return "running";
  if (isFailed(status)) return "failed";
  return "completed";
}

export default function JobHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [windowDays, setWindowDays] = useState(30);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const jobsQuery = useQuery<JobSummary[]>({
    queryKey: ["jobs", "all"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=200");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.jobs as JobSummary[];
    },
    refetchInterval: (q) => {
      const data = (q.state.data ?? []) as JobSummary[];
      const hasActive = data.some((j) => ACTIVE.has(j.status));
      return hasActive ? 5_000 : 30_000;
    },
  });

  const jobs = jobsQuery.data ?? [];

  const filtered = useMemo(() => {
    const cutoff = Date.now() - windowDays * 86_400_000;
    return jobs.filter((j) => {
      if (new Date(j.created_at).getTime() < cutoff) return false;
      const simple = simplifyStatus(j.status);
      if (statusFilter === "running" && simple !== "running") return false;
      if (statusFilter === "completed" && simple !== "completed") return false;
      if (statusFilter === "failed" && simple !== "failed") return false;
      if (sourceFilter === "manual") return false;
      return true;
    });
  }, [jobs, statusFilter, sourceFilter, windowDays]);

  const completed = jobs.filter((j) => simplifyStatus(j.status) === "completed").length;
  const active = jobs.filter((j) => ACTIVE.has(j.status)).length;
  const energyLevel = active === 0 ? "Calm" : active <= 2 ? "Steady" : "High";
  const energyTone =
    active === 0
      ? "text-success"
      : active <= 2
        ? "text-primary"
        : "text-processing";

  async function handleDelete(jobId: string) {
    setDeletingId(jobId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.setQueryData<JobSummary[]>(["jobs", "all"], (prev) =>
          (prev ?? []).filter((j) => j.id !== jobId),
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRetry(job: JobSummary) {
    setRetryingId(job.id);
    try {
      // Get fresh creds from the session via a lightweight endpoint
      const credsRes = await fetch("/api/shopify/creds");
      if (!credsRes.ok) return;
      const { shopDomain, accessToken } = await credsRes.json();
      await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", shopDomain, accessToken }),
      });
      await queryClient.invalidateQueries({ queryKey: ["jobs", "all"] });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-lg">
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
          <div className="bg-warm-white rounded-2xl shadow-xl p-lg max-w-sm w-full flex flex-col gap-md">
            <h2 className="font-section-heading text-base text-text-primary">Delete this job?</h2>
            <p className="font-ui-label text-ui-label text-text-muted">
              This will permanently remove the job and all its items. Products already pushed to Shopify are not affected.
            </p>
            <div className="flex gap-sm justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-md py-sm rounded-full font-ui-label text-ui-label text-text-muted bg-surface-container-low hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-md py-sm rounded-full font-ui-label text-ui-label text-on-error bg-error hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header>
        <p className="font-spoonie-italic text-spoonie-italic text-text-muted italic">
          Gentle Reflection
        </p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-md mt-xs">
          <div>
            <h1 className="font-section-heading text-[1.75rem] sm:text-section-heading text-text-primary leading-tight">
              Job History
            </h1>
            <p className="font-ui-label text-ui-label text-text-muted mt-xs max-w-xl">
              A soft record of everything Alivio has helped you with. No pressure,
              just progress at your own pace.
            </p>
          </div>
          <label className="inline-flex items-center gap-xs bg-warm-white border border-border rounded-full px-md py-sm font-ui-label text-ui-label cursor-pointer focus-within:ring-2 focus-within:ring-primary/30">
            <Icon name="calendar_today" size={16} className="text-text-muted" />
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value))}
              className="bg-transparent outline-none cursor-pointer"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={365}>Last year</option>
            </select>
          </label>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-sm sm:gap-md">
        <RefineCard
          status={statusFilter}
          source={sourceFilter}
          onStatusChange={setStatusFilter}
          onSourceChange={setSourceFilter}
          onReset={() => {
            setStatusFilter("all");
            setSourceFilter("all");
          }}
        />
        <StatCard
          icon="check_circle"
          label="Completed with ease"
          value={completed.toString()}
          tone="ready"
        />
        <StatCard
          icon="autorenew"
          label="Active moments"
          value={active.toString()}
          tone="running"
        />
        <StatCard
          icon="battery_charging_full"
          label="Current energy level"
          value={energyLevel}
          tone="muted"
          valueClassName={cn("font-section-heading text-4xl sm:text-5xl leading-tight", energyTone)}
        />
      </section>

      <section className="bg-warm-white rounded-2xl sm:rounded-3xl shadow-sm sm:shadow-card border border-border/40 overflow-hidden">
        {jobsQuery.isLoading ? (
          <div className="p-xl flex justify-center">
            <DotsLoader label="Loading job history" />
          </div>
        ) : jobsQuery.error ? (
          <div className="p-lg text-on-error-container bg-error-container/40">
            {(jobsQuery.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-xl flex flex-col items-center text-center gap-sm">
            <p className="font-section-heading text-base text-text-primary">
              {jobs.length === 0 ? "No jobs yet" : "No jobs match your filters"}
            </p>
            <p className="font-ui-label text-ui-label text-text-muted">
              {jobs.length === 0
                ? "Upload a CSV to generate your first batch of products."
                : "Try adjusting the status filter or time range."}
            </p>
            {jobs.length === 0 && (
              <Link
                href="/dashboard/new"
                className="mt-sm inline-flex items-center gap-xs h-10 px-lg rounded-full bg-primary text-on-primary font-ui-label text-ui-label font-medium hover:opacity-90 transition-all"
              >
                <Icon name="upload_file" size={16} />
                Upload CSV
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <ul className="md:hidden flex flex-col divide-y divide-border/30">
              {filtered.map((j) => {
                const simple = simplifyStatus(j.status);
                return (
                  <li key={j.id} className="px-md py-md">
                    <div className="flex items-start gap-sm">
                      <Link
                        href={j.status === "awaiting_review" ? `/dashboard/jobs/${j.id}/scrape-review` : `/dashboard/jobs/${j.id}`}
                        className="flex-1 min-w-0 flex items-start gap-sm hover:opacity-80 transition-opacity"
                      >
                        <ProductThumbnail src={null} alt={j.source_filename} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary truncate">
                            {j.source_filename}
                          </p>
                          <div className="flex flex-wrap items-center gap-xs mt-xs">
                            <StatusPill simple={simple} />
                            <span className="text-xs text-text-muted font-mono-data">
                              {j.completed_items}/{j.total_items}
                            </span>
                            <span className="text-xs text-text-muted">
                              · {relativeTime(j.created_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                      {simple === "failed" && (
                        <div className="flex gap-xs flex-shrink-0">
                          <button
                            onClick={() => handleRetry(j)}
                            disabled={retryingId === j.id}
                            title="Retry"
                            className="p-2 rounded-full text-primary hover:bg-surface-variant/40 transition-colors disabled:opacity-40"
                          >
                            <Icon name="refresh" size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(j.id)}
                            title="Delete"
                            className="p-2 rounded-full text-error hover:bg-error-container/40 transition-colors"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr className="text-text-muted font-ui-label text-[0.7rem] uppercase tracking-wider text-left">
                    <th className="px-lg py-md font-medium">Product / File</th>
                    <th className="px-lg py-md font-medium">Source</th>
                    <th className="px-lg py-md font-medium">Status</th>
                    <th className="px-lg py-md font-medium">Date</th>
                    <th className="px-lg py-md font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j) => {
                    const simple = simplifyStatus(j.status);
                    return (
                      <tr
                        key={j.id}
                        className="border-t border-border/30 hover:bg-surface-container-low/40 transition-colors"
                      >
                        <td className="px-lg py-md">
                          <div className="flex items-center gap-md">
                            <ProductThumbnail src={null} alt={j.source_filename} size="sm" />
                            <div className="min-w-0">
                              <div className="font-medium text-text-primary truncate max-w-[260px]">
                                {j.source_filename}
                              </div>
                              <div className="text-xs text-text-muted font-mono-data">
                                {j.completed_items}/{j.total_items} items
                                {j.failed_items > 0 && (
                                  <span className="text-error"> · {j.failed_items} failed</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-md text-text-muted text-sm">
                          <span className="inline-flex items-center gap-xs">
                            <Icon name="upload_file" size={14} />
                            CSV upload
                          </span>
                        </td>
                        <td className="px-lg py-md">
                          <StatusPill simple={simple} />
                        </td>
                        <td className="px-lg py-md text-sm">
                          <div className="text-text-primary">
                            {new Date(j.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-text-muted">
                            {relativeTime(j.created_at)}
                          </div>
                        </td>
                        <td className="px-lg py-md text-right">
                          <div className="inline-flex items-center gap-xs justify-end">
                            <Link
                              href={j.status === "awaiting_review" ? `/dashboard/jobs/${j.id}/scrape-review` : `/dashboard/jobs/${j.id}`}
                              className="text-primary text-xs font-ui-label hover:underline inline-flex items-center gap-xs px-sm py-1"
                            >
                              Open
                              <Icon name="arrow_forward" size={14} />
                            </Link>
                            {simple === "failed" && (
                              <>
                                <button
                                  onClick={() => handleRetry(j)}
                                  disabled={retryingId === j.id}
                                  title="Retry failed items"
                                  className="p-1.5 rounded-full text-primary hover:bg-surface-variant/40 transition-colors disabled:opacity-40"
                                >
                                  {retryingId === j.id ? (
                                    <span className="text-[10px] font-ui-label">…</span>
                                  ) : (
                                    <Icon name="refresh" size={15} />
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(j.id)}
                                  title="Delete job"
                                  className="p-1.5 rounded-full text-error hover:bg-error-container/40 transition-colors"
                                >
                                  <Icon name="delete" size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div className="px-md sm:px-lg py-sm sm:py-md flex items-center justify-between gap-sm border-t border-border/30 bg-surface-container-low text-xs sm:text-sm text-text-muted">
            <span className="truncate">
              Showing {filtered.length} of {jobs.length} {jobs.length === 1 ? "task" : "tasks"}
            </span>
            <Link
              href="/dashboard/new"
              className="text-primary font-ui-label hover:underline whitespace-nowrap"
            >
              + New Job
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function RefineCard({
  status,
  source,
  onStatusChange,
  onSourceChange,
  onReset,
}: {
  status: StatusFilter;
  source: SourceFilter;
  onStatusChange: (s: StatusFilter) => void;
  onSourceChange: (s: SourceFilter) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-warm-white rounded-3xl p-lg shadow-card border border-border/40 flex flex-col gap-md">
      <p className="font-ui-label text-[0.7rem] uppercase tracking-widest text-text-muted">
        Refine list
      </p>
      <div>
        <label className="block font-ui-label text-xs text-text-muted mb-xs">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          className="w-full bg-surface-container-low border border-border rounded-lg px-md py-sm font-ui-label text-ui-label cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="all">All</option>
          <option value="running">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div>
        <label className="block font-ui-label text-xs text-text-muted mb-xs">
          Source
        </label>
        <div className="flex flex-wrap gap-xs">
          {(["all", "csv", "manual"] as SourceFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSourceChange(s)}
              className={cn(
                "px-md py-1 rounded-full text-xs font-ui-label transition-colors capitalize",
                source === s
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-text-muted hover:bg-surface-container",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onReset}
        className="mt-auto bg-surface-container-low text-text-muted hover:text-primary font-ui-label text-ui-label py-sm rounded-full transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  valueClassName,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "ready" | "running" | "muted";
  valueClassName?: string;
}) {
  const palette =
    tone === "ready"
      ? "bg-badge-ready-bg text-badge-ready-text"
      : tone === "running"
        ? "bg-badge-running-bg text-badge-running-text"
        : "bg-surface-variant text-text-muted";

  return (
    <div
      className={cn(
        "rounded-3xl p-lg shadow-card border border-border/40 flex flex-col justify-between min-h-[180px]",
        palette,
      )}
    >
      <Icon name={icon} size={28} className="opacity-80" />
      <div>
        <div
          className={cn(
            "font-section-heading text-5xl leading-tight",
            valueClassName,
          )}
        >
          {value}
        </div>
        <p className="font-ui-label text-ui-label opacity-80 mt-xs">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ simple }: { simple: "running" | "completed" | "failed" }) {
  const tone =
    simple === "completed"
      ? "bg-badge-ready-bg text-badge-ready-text"
      : simple === "failed"
        ? "bg-error-container text-on-error-container"
        : "bg-badge-running-bg text-badge-running-text";

  const label =
    simple === "completed" ? "Completed" : simple === "failed" ? "Failed" : "Processing";

  return (
    <span
      className={cn(
        "inline-flex items-center px-sm py-1 rounded-full text-[12px] font-bold",
        tone,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5" />
      {label}
    </span>
  );
}
