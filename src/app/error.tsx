"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlivioMark } from "@/components/brand/alivio-mark";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-md gap-lg">
      <Link href="/" className="flex items-center gap-sm mb-sm">
        <AlivioMark className="w-10 h-10" />
        <span className="font-section-heading text-lg text-primary font-semibold">Alivio Plus</span>
      </Link>
      <div className="max-w-xl w-full rounded-3xl border border-error/30 bg-error-container/40 p-lg">
        <h2 className="font-section-heading text-xl text-on-error-container mb-xs">
          Something went wrong
        </h2>
        <p className="font-ui-label text-ui-label text-on-error-container mb-md">
          {error.message}
        </p>
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
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center h-11 px-lg rounded-full bg-primary text-on-primary font-ui-label text-ui-label font-medium shadow-sm hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
