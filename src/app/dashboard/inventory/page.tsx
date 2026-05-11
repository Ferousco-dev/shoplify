"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { EmptyClipboard } from "@/components/brand/empty-clipboard";
import { Badge, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { InventoryItem } from "@/app/api/inventory/route";

type Stock = "in-stock" | "low-stock" | "out-of-stock";

function stockLevel(qty: number, tracks: boolean): Stock {
  if (!tracks) return "in-stock";
  if (qty <= 0) return "out-of-stock";
  if (qty < 5) return "low-stock";
  return "in-stock";
}

function stockTone(s: Stock): "success" | "warn" | "danger" {
  if (s === "in-stock") return "success";
  if (s === "low-stock") return "warn";
  return "danger";
}

function stockLabel(s: Stock): string {
  return { "in-stock": "In Stock", "low-stock": "Low Stock", "out-of-stock": "Out of Stock" }[s];
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Stock>("all");

  const invQuery = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.items as InventoryItem[];
    },
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!invQuery.data) return [];
    const q = searchQuery.trim().toLowerCase();
    return invQuery.data.filter((item) => {
      const matchSearch = q
        ? item.title.toLowerCase().includes(q) ||
          (item.sku ?? "").toLowerCase().includes(q)
        : true;
      const level = stockLevel(item.quantity, item.tracksInventory);
      const matchFilter = filter === "all" || level === filter;
      return matchSearch && matchFilter;
    });
  }, [invQuery.data, searchQuery, filter]);

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Inventory
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Live inventory from your connected Shopify store
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-sm">
        <div className="relative flex-1 min-w-0">
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            type="text"
            placeholder="Search by name or SKU…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <div className="flex gap-xs flex-wrap">
          {(["all", "in-stock", "low-stock", "out-of-stock"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-md py-2 rounded-full font-ui-label text-ui-label capitalize transition-colors whitespace-nowrap",
                filter === f
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-warm-white text-text-muted border border-border hover:bg-surface-variant/40",
              )}
            >
              {f === "all" ? "All" : f.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {invQuery.isLoading ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex justify-center">
          <DotsLoader label="Loading inventory…" />
        </div>
      ) : invQuery.error ? (
        <div className="rounded-3xl border border-error/30 bg-error-container p-lg text-on-error-container">
          {(invQuery.error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex flex-col items-center text-center gap-sm">
          <EmptyClipboard className="w-32 h-32" />
          <p className="font-section-heading text-base text-text-primary">
            {invQuery.data?.length ? "No items match" : "No inventory yet"}
          </p>
          <p className="font-ui-label text-ui-label text-text-muted">
            {invQuery.data?.length
              ? "Try a different search or filter."
              : "Publish products to your Shopify store to see inventory here."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-border/30">
                <tr className="text-left font-ui-label text-[0.7rem] uppercase tracking-wider font-medium text-text-muted">
                  <th className="px-md py-3">Product</th>
                  <th className="px-md py-3">SKU</th>
                  <th className="px-md py-3 text-center">Quantity</th>
                  <th className="px-md py-3">Status</th>
                  <th className="px-md py-3">Type</th>
                  <th className="px-md py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((item) => {
                  const level = stockLevel(item.quantity, item.tracksInventory);
                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-md py-3 text-text-primary">{item.title}</td>
                      <td className="px-md py-3 font-mono-data text-text-muted">
                        {item.sku ?? "—"}
                      </td>
                      <td className="px-md py-3 text-center font-medium text-text-primary">
                        {item.tracksInventory ? item.quantity : "—"}
                      </td>
                      <td className="px-md py-3">
                        <Badge tone={stockTone(level)}>{stockLabel(level)}</Badge>
                      </td>
                      <td className="px-md py-3 text-text-muted">
                        {item.productType || "—"}
                      </td>
                      <td className="px-md py-3 text-right">
                        <Icon name="chevron_right" size={18} className="text-text-muted inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
