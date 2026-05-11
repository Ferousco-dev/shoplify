"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui";

export default function ConnectForm({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, accessToken }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["stores"] });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-md space-y-md">
      <div className="space-y-xs">
        <Label htmlFor="shop-domain">Store domain</Label>
        <Input
          id="shop-domain"
          placeholder="your-store.myshopify.com"
          value={shopDomain}
          onChange={(e) => setShopDomain(e.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-xs">
        <Label htmlFor="access-token">Admin API access token</Label>
        <Input
          id="access-token"
          className="font-mono-data"
          placeholder="shpat_********************"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          autoComplete="off"
          type="password"
          required
        />
      </div>
      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container px-md py-sm text-sm text-on-error-container">
          {error}
        </div>
      )}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Connecting…" : "Connect Shopify"}
      </Button>
    </form>
  );
}
