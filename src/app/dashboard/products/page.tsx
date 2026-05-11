"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ProductSummary } from "@/app/api/products/route";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { EmptyClipboard } from "@/components/brand/empty-clipboard";
import { ProductThumbnail } from "@/components/brand/product-thumbnail";
import { Badge, statusBadgeTone, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

const FILTERS = ["all", "published", "draft", "archived"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(p: ProductSummary, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "published") return !!p.shopify_product_id;
  if (f === "archived") return p.status === "archived";
  if (f === "draft") return !p.shopify_product_id && p.status !== "archived";
  return true;
}

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

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const productsQuery = useQuery<ProductSummary[]>({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body.products as ProductSummary[];
    },
  });

  const filtered = useMemo(() => {
    if (!productsQuery.data) return [];
    const q = searchQuery.trim().toLowerCase();
    return productsQuery.data.filter((p) => {
      const titleMatch = q ? (p.title ?? "").toLowerCase().includes(q) : true;
      return titleMatch && matchesFilter(p, filter);
    });
  }, [productsQuery.data, searchQuery, filter]);

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Products
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          {productsQuery.data?.length ?? 0} products generated
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
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <div className="flex gap-xs flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-md py-2 rounded-full font-ui-label text-ui-label capitalize transition-colors",
                filter === f
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-warm-white text-text-muted border border-border hover:bg-surface-variant/40",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex justify-center">
          <DotsLoader label="Loading products…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex flex-col items-center text-center gap-sm">
          <EmptyClipboard className="w-32 h-32" />
          <p className="font-section-heading text-base text-text-primary">
            {productsQuery.data?.length ? "No products match" : "No products yet"}
          </p>
          <p className="font-ui-label text-ui-label text-text-muted">
            {productsQuery.data?.length
              ? "Try a different search or filter."
              : "Generate your first product to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {filtered.map((product) => {
            const published = !!product.shopify_product_id;
            const tone = product.status === "archived"
              ? "muted"
              : published
                ? "success"
                : "draft";
            return (
              <article
                key={product.id}
                className="rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 bg-warm-white shadow-sm hover:shadow-card transition-shadow flex flex-col"
              >
                <Link href={`/dashboard/products/${product.id}`} className="flex flex-col flex-1">
                  <ProductThumbnail
                    src={product.hero_url}
                    alt={product.title ?? "Product"}
                    size="lg"
                    className="w-full !rounded-none aspect-[4/3] h-auto"
                  />
                  <div className="p-md flex flex-col gap-sm flex-1">
                    <h3 className="font-section-heading text-base text-text-primary line-clamp-2">
                      {product.title ?? "Untitled product"}
                    </h3>
                    <div className="flex items-center justify-between font-ui-label text-ui-label text-text-muted">
                      <span className="capitalize">{product.source_supplier}</span>
                      <span>{timeAgo(product.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-sm mt-auto pt-xs">
                      <Badge tone={tone}>{published ? "published" : product.status}</Badge>
                      {product.shopify_handle && (
                        <a
                          href={`https://${product.shopify_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Open in Shopify"
                          className="p-2 rounded-full text-primary hover:bg-surface-variant/40 transition-colors"
                        >
                          <Icon name="open_in_new" size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
