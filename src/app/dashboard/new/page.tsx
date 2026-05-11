"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { useQuery } from "@tanstack/react-query";
import type { StoreSummary } from "@/app/api/stores/route";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState("");

  const storesQuery = useQuery<StoreSummary[]>({
    queryKey: ["stores"],
    queryFn: async () => {
      const res = await fetch("/api/stores");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.stores as StoreSummary[];
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const activeStores = (storesQuery.data ?? []).filter((s) => s.is_active);

  useEffect(() => {
    if (!storeId && activeStores.length === 1) {
      setStoreId(activeStores[0].id);
    }
  }, [activeStores, storeId]);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRowCount(result.data.length);
        setParsedData(result.data);
      },
      error: (err) => setError(err.message),
    });
  }, []);

  const onPickClick = () => fileInputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleContinue = () => {
    if (!storeId) {
      setError("Pick a target store before continuing.");
      return;
    }
    if (parsedData && parsedData.length > 0) {
      sessionStorage.setItem("csvData", JSON.stringify(parsedData));
      sessionStorage.setItem("storeId", storeId);
      if (fileName) sessionStorage.setItem("csvFilename", fileName);
      router.push("/dashboard/new/configure");
    }
  };

  const canContinue = !!parsedData && parsedData.length > 0 && !!storeId;

  return (
    <div className="flex flex-col gap-lg max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
        >
          <Icon name="chevron_left" size={18} />
          Back
        </Link>
      </div>

      <div>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Step 1 — Add Your Products
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Upload a CSV of supplier URLs or add products one at a time.
        </p>
      </div>

      <div className="flex gap-xs">
        <span className="px-lg h-10 inline-flex items-center rounded-full bg-primary text-on-primary font-ui-label text-ui-label">
          CSV Upload
        </span>
        <Link
          href="/dashboard/new/manual"
          className="px-lg h-10 inline-flex items-center rounded-full border-[1.5px] border-primary text-primary font-ui-label text-ui-label hover:bg-primary/5 transition-colors"
        >
          Manual Entry
        </Link>
      </div>

      <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg">
        <label
          htmlFor="store-picker"
          className="block font-ui-label text-ui-label text-secondary mb-xs"
        >
          Target Shopify Store
        </label>
        {storesQuery.isLoading ? (
          <p className="font-ui-label text-ui-label text-text-muted">Loading stores…</p>
        ) : activeStores.length === 0 ? (
          <p className="font-ui-label text-ui-label text-text-muted">
            No connected stores yet.{" "}
            <Link href="/dashboard/connect" className="text-primary hover:underline">
              Connect one
            </Link>{" "}
            first.
          </p>
        ) : (
          <select
            id="store-picker"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full h-11 bg-surface-container-low border border-border rounded-lg px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
          >
            <option value="">Choose a store…</option>
            {activeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shop_domain})
              </option>
            ))}
          </select>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onInputChange}
        className="sr-only"
      />

      <button
        type="button"
        onClick={onPickClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "p-xl rounded-3xl text-center cursor-pointer transition-all w-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
          isDragging
            ? "bg-primary-container/30 border-2 border-primary"
            : "bg-warm-white border-2 border-dashed border-border hover:border-primary/60",
        )}
      >
        <Icon name="cloud_upload" size={48} className="text-primary block mx-auto mb-sm" />
        <p className="font-section-heading text-base text-text-primary mb-xs">
          Drop your CSV here, or click to browse
        </p>
        <p className="font-ui-label text-ui-label text-text-muted">
          Accepts .csv files • Max 50 products per run
        </p>
        {fileName && (
          <div className="mt-md inline-flex items-center gap-xs font-ui-label text-ui-label text-success">
            <Icon name="check_circle" size={16} filled />
            {fileName} ({rowCount} products)
          </div>
        )}
      </button>

      {error && (
        <div className="rounded-2xl border border-error/30 bg-error-container px-md py-sm font-ui-label text-ui-label text-on-error-container">
          {error}
        </div>
      )}

      <details>
        <summary className="cursor-pointer font-ui-label text-base text-text-primary font-medium">
          What should my CSV look like?
        </summary>
        <pre className="mt-sm p-md rounded-lg bg-surface-container-low font-mono-data text-mono-data text-text-primary overflow-x-auto leading-relaxed">
{`product_name | product_type | alibaba_url | aliexpress_url | amazon_url | url_1688 | primary_keyword | secondary_keywords | pairs_well_with`}
        </pre>
      </details>

      {fileName && (
        <div className="flex flex-wrap gap-sm pt-md border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFileName(null);
              setRowCount(0);
              setParsedData(null);
            }}
          >
            Clear File
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue to Configuration
            <Icon name="arrow_forward" size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
