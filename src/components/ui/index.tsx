"use client";
import { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

/* === Card primitives ===
 * Migrated to Alivio brand tokens. Older pages that still import these
 * (products list, stores, prompts, job detail) automatically inherit the
 * new look without their own changes.
 */

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  // Slightly tighter radius + softer shadow on mobile so cards don't feel
  // bubble-heavy on small viewports.
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm sm:shadow-card",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-md sm:p-lg border-b border-border/30", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-section-heading text-base sm:text-lg text-text-primary leading-tight",
        className,
      )}
      {...rest}
    />
  );
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-md sm:p-lg", className)} {...rest} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface-container-low px-md py-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
        "disabled:opacity-50 transition-colors",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("font-ui-label text-ui-label text-secondary", className)}
      {...rest}
    />
  );
}

/* === Status badges === */

type BadgeTone = "default" | "success" | "warn" | "danger" | "muted" | "draft";
const badgeTones: Record<BadgeTone, string> = {
  default: "bg-surface-container text-text-primary",
  success: "bg-badge-ready-bg text-badge-ready-text",
  warn: "bg-badge-running-bg text-badge-running-text",
  danger: "bg-error-container text-on-error-container",
  muted: "bg-surface-variant text-text-muted",
  draft: "bg-badge-draft-bg text-badge-draft-text",
};

export function Badge({
  tone = "default",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-sm py-0.5 text-[0.7rem] font-bold uppercase tracking-wider",
        badgeTones[tone],
        className,
      )}
      {...rest}
    />
  );
}

/* === Table primitives === */

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-sm", className)} {...rest} />;
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-border/30 bg-surface-container-low text-left text-text-muted",
        className,
      )}
      {...rest}
    />
  );
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border/30", className)} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "hover:bg-surface-container-low/50 transition-colors",
        className,
      )}
      {...rest}
    />
  );
}

export function TH({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-md py-2.5 font-ui-label text-[0.7rem] uppercase tracking-wider font-medium",
        className,
      )}
      {...rest}
    />
  );
}

export function TD({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-md py-3 align-top", className)} {...rest} />;
}

export function statusBadgeTone(status: string): BadgeTone {
  if (status === "completed") return "success";
  if (status.startsWith("failed")) return "danger";
  if (status === "partial") return "warn";
  if (
    status === "pending" ||
    status === "dispatched" ||
    status === "running" ||
    status.startsWith("generating") ||
    status === "scraping" ||
    status === "scraped" ||
    status === "normalizing" ||
    status === "uploading_assets" ||
    status === "syncing_shopify"
  ) {
    return "warn";
  }
  return "muted";
}
