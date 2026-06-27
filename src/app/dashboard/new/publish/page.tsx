"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

type ImageItem = {
  shortKey: string;
  label: string;
  alt: string;
  resourceUrl: string;
  previewDataUrl?: string;
};

type ProductDraft = {
  id: string;
  title: string;
  handle: string;
  images: ImageItem[];
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function PublishPage() {
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("generatedDrafts");
      if (raw) setDrafts(JSON.parse(raw) as ProductDraft[]);
      const start = sessionStorage.getItem("pipelineStartTime");
      if (start) {
        const elapsed = Math.round((Date.now() - parseInt(start, 10)) / 1000);
        setElapsedSeconds(elapsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const totalImages = drafts.reduce((sum, d) => sum + d.images.length, 0);

  const stats = [
    { label: "Products Published", value: drafts.length > 0 ? String(drafts.length) : "—", icon: "inventory_2" },
    { label: "Images Generated", value: totalImages > 0 ? String(totalImages) : "—", icon: "image" },
    { label: "Processing Time", value: elapsedSeconds > 0 ? formatTime(elapsedSeconds) : "—", icon: "timer" },
  ];

  return (
    <div className="flex flex-col items-center gap-xl max-w-2xl mx-auto py-xl">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-badge-ready-bg flex items-center justify-center">
        <Icon name="check_circle" size={48} filled className="text-success" />
      </div>

      <div className="text-center">
        <h1 className="font-section-heading text-section-heading text-text-primary">
          All Set!
        </h1>
        <p className="font-ui-label text-base text-text-muted mt-xs max-w-sm mx-auto">
          Your products have been successfully generated and published to Shopify.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-md w-full">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/40 bg-warm-white shadow-sm p-md text-center"
          >
            <Icon name={stat.icon} size={24} className="text-primary mx-auto mb-xs" />
            <p className="font-section-heading text-2xl text-primary">{stat.value}</p>
            <p className="font-ui-label text-ui-label text-text-muted mt-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Published products list */}
      {drafts.length > 0 && (
        <div className="w-full">
          <h2 className="font-section-heading text-xl text-text-primary mb-md">
            Published Products
          </h2>
          <div className="flex flex-col gap-sm">
            {drafts.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-md p-md rounded-2xl border border-border/40 bg-warm-white shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-badge-ready-bg flex items-center justify-center flex-shrink-0">
                  <Icon name="inventory_2" size={20} className="text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-section-heading text-base text-text-primary truncate">
                    {d.title}
                  </p>
                  <p className="font-ui-label text-ui-label text-text-muted">
                    {d.images.length} image{d.images.length !== 1 ? "s" : ""} · Published
                  </p>
                </div>
                <Icon name="check_circle" size={18} filled className="text-success flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-sm flex-wrap justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-sm h-12 px-xl rounded-full bg-primary text-on-primary font-ui-label text-ui-label font-medium shadow-card hover:opacity-90 transition-all"
        >
          <Icon name="dashboard" size={18} />
          Back to Dashboard
        </Link>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-sm h-12 px-xl rounded-full border-[1.5px] border-primary text-primary font-ui-label text-ui-label font-medium hover:bg-primary/5 transition-all"
        >
          <Icon name="add" size={18} />
          Create Another Job
        </Link>
      </div>
    </div>
  );
}
