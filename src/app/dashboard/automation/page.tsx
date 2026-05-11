"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { JobSummary } from "@/app/api/jobs/route";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { EmptyClipboard } from "@/components/brand/empty-clipboard";
import { Button } from "@/components/ui/button";

const ACTIVE_STATUSES = ["pending", "running", "dispatched", "scraping", "scraped", "normalizing", "uploading_assets", "syncing_shopify", "generating", "generating_copy", "generating_images", "generating_seo"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function statusTone(status: string): { icon: string; color: string; label: string } {
  if (status === "completed") return { icon: "task_alt", color: "text-success", label: "Completed" };
  if (status.startsWith("failed")) return { icon: "error", color: "text-error", label: "Failed" };
  if (ACTIVE_STATUSES.includes(status)) return { icon: "progress_activity", color: "text-processing", label: "Running" };
  return { icon: "schedule", color: "text-text-muted", label: status };
}

export default function AutomationPage() {
  const jobsQuery = useQuery<JobSummary[]>({
    queryKey: ["jobs", "automation"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=50");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.jobs as JobSummary[];
    },
    refetchInterval: 3000,
  });

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="font-section-heading text-section-heading text-text-primary">
            Automation
          </h1>
          <p className="font-ui-label text-ui-label text-text-muted mt-xs">
            Real-time product generation pipeline
          </p>
        </div>
        <Link href="/dashboard/new">
          <Button size="md">
            <Icon name="bolt" size={18} />
            New Automation
          </Button>
        </Link>
      </div>

      {jobsQuery.isLoading ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex justify-center">
          <DotsLoader label="Loading…" />
        </div>
      ) : jobsQuery.error ? (
        <div className="rounded-3xl border border-error/30 bg-error-container p-lg text-on-error-container">
          {(jobsQuery.error as Error).message}
        </div>
      ) : !jobsQuery.data || jobsQuery.data.length === 0 ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex flex-col items-center text-center gap-sm">
          <EmptyClipboard className="w-32 h-32" />
          <p className="font-section-heading text-base text-text-primary">No active automations</p>
          <p className="font-ui-label text-ui-label text-text-muted">
            Upload a CSV to kick off your first automation.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {jobsQuery.data.map((job) => {
            const tone = statusTone(job.status);
            const pct = job.total_items
              ? Math.round((job.completed_items / job.total_items) * 100)
              : 0;
            return (
              <li
                key={job.id}
                className="rounded-2xl border border-border/40 bg-warm-white shadow-sm p-md sm:p-lg"
              >
                <div className="flex items-start gap-md mb-md">
                  <Icon
                    name={tone.icon}
                    size={22}
                    filled
                    className={`${tone.color} ${ACTIVE_STATUSES.includes(job.status) ? "animate-spin" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-section-heading text-base text-text-primary truncate">
                      {job.source_filename}
                    </h3>
                    <p className="font-ui-label text-ui-label text-text-muted mt-xs">
                      Started {timeAgo(job.created_at)}
                      {job.finished_at && ` • Completed ${timeAgo(job.finished_at)}`}
                    </p>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-variant mb-xs">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-ui-label text-ui-label">
                  <span className={tone.color}>{tone.label}</span>
                  <span className="font-mono-data text-text-muted">
                    {job.completed_items}/{job.total_items} · {pct}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
