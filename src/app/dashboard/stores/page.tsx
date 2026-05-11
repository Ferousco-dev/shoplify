"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoreSummary } from "@/app/api/stores/route";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DotsLoader } from "@/components/ui/dots-loader";
import { EmptyClipboard } from "@/components/brand/empty-clipboard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export default function StoresPage() {
  const qc = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<StoreSummary | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/stores?id=${encodeURIComponent(id)}&mode=hard`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      setConfirmTarget(null);
    },
  });

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="font-section-heading text-section-heading text-text-primary">
            Connected Stores
          </h1>
          <p className="font-ui-label text-ui-label text-text-muted mt-xs">
            Manage your Shopify storefronts
          </p>
        </div>
        <Link href="/dashboard/connect">
          <Button size="md">
            <Icon name="add" size={18} />
            Connect Store
          </Button>
        </Link>
      </div>

      {storesQuery.isLoading ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex justify-center">
          <DotsLoader label="Loading stores…" />
        </div>
      ) : !storesQuery.data || storesQuery.data.length === 0 ? (
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl flex flex-col items-center text-center gap-sm">
          <EmptyClipboard className="w-32 h-32" />
          <p className="font-section-heading text-base text-text-primary">
            No stores connected
          </p>
          <p className="font-ui-label text-ui-label text-text-muted">
            Connect your Shopify store to get started.
          </p>
          <Link href="/dashboard/connect" className="mt-sm">
            <Button size="md">
              <Icon name="add" size={18} />
              Connect Your Store
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {storesQuery.data.map((store) => (
            <article
              key={store.id}
              className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm p-lg"
            >
              <div className="flex items-start justify-between gap-md mb-md">
                <div className="flex items-start gap-sm min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-primary-container/40 flex items-center justify-center flex-shrink-0">
                    <Icon name="storefront" size={24} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-section-heading text-base text-text-primary truncate">
                      {store.name}
                    </h3>
                    <p className="font-mono-data text-mono-data text-text-muted mt-xs truncate">
                      {store.shop_domain}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-xs mb-md">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    store.is_active ? "bg-success" : "bg-text-muted"
                  }`}
                />
                <span
                  className={`font-ui-label text-ui-label ${
                    store.is_active ? "text-success" : "text-text-muted"
                  }`}
                >
                  {store.is_active ? "Connected" : "Inactive"}
                </span>
              </div>

              <p className="font-ui-label text-ui-label text-text-muted mb-md">
                Connected {timeAgo(store.created_at)}
              </p>

              <div className="flex gap-sm">
                <Link href="/dashboard/products" className="flex-1">
                  <Button size="md" className="w-full">
                    View Products
                  </Button>
                </Link>
                <a
                  href={`https://${store.shop_domain}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Shopify admin"
                  className="px-md rounded-full border border-border text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors inline-flex items-center"
                >
                  <Icon name="open_in_new" size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(store)}
                  aria-label={`Delete ${store.name}`}
                  className="px-md rounded-full border border-border text-text-muted hover:text-error hover:border-error/40 hover:bg-error-container/30 transition-colors inline-flex items-center"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget ? `Delete ${confirmTarget.name}?` : "Delete store?"}
        description={
          confirmTarget
            ? `This removes ${confirmTarget.shop_domain} from your connected stores. Already-generated products stay; the encrypted token is wiped. You can reconnect at any time.`
            : ""
        }
        confirmLabel="Delete store"
        tone="danger"
        busy={deleteMutation.isPending}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) deleteMutation.mutate(confirmTarget.id);
        }}
      />

      <aside className="rounded-3xl p-lg bg-surface-container-low border-l-4 border-primary">
        <h3 className="font-section-heading text-base text-text-primary mb-xs">
          How to connect a store
        </h3>
        <ol className="font-ui-label text-ui-label text-text-muted space-y-1 list-decimal pl-5">
          <li>Go to your Shopify Admin → Settings → Apps and sales channels → Develop apps</li>
          <li>Create a new app and grant Admin API access</li>
          <li>Copy the access token and paste it on the home page</li>
          <li>Your store will appear here automatically</li>
        </ol>
      </aside>
    </div>
  );
}
