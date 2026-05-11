"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export default function ProcessingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the actual error to the browser console so the user can see it.
    // Next's error boundary swallows it by default, which makes "blank page"
    // bugs impossible to diagnose without this.
    console.error("[processing] runtime error:", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-md max-w-2xl">
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary"
      >
        <Icon name="chevron_left" size={18} />
        Back to upload
      </Link>
      <div className="rounded-3xl border border-error/30 bg-error-container/40 p-lg">
        <h2 className="font-section-heading text-lg text-on-error-container mb-xs inline-flex items-center gap-xs">
          <Icon name="error" size={20} />
          Processing crashed
        </h2>
        <p className="font-ui-label text-ui-label text-on-error-container mb-sm">
          {error.message}
        </p>
        {error.digest && (
          <p className="font-mono-data text-mono-data text-text-muted mb-md">
            digest: {error.digest}
          </p>
        )}
        {error.stack && (
          <details className="mb-md">
            <summary className="cursor-pointer font-ui-label text-ui-label text-text-muted">
              Stack trace
            </summary>
            <pre className="mt-xs font-mono-data text-mono-data text-text-primary whitespace-pre-wrap max-h-64 overflow-y-auto">
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-sm">
          <Button onClick={() => reset()}>Try again</Button>
          <Link href="/dashboard/new">
            <Button variant="secondary">Start over</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
