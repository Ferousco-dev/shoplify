import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { HeroDecor } from "@/components/brand/hero-decor";
import ConnectForm from "@/components/ConnectForm";

export default function ConnectStorePage() {
  return (
    <div className="flex flex-col gap-lg max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/stores"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
        >
          <Icon name="chevron_left" size={18} />
          Back to stores
        </Link>
      </div>

      <div>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Connect a Shopify store
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Paste your store domain and Admin API access token. Credentials are stored in
          an encrypted httpOnly cookie on this device only.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-lg items-start">
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg sm:p-xl">
          <ConnectForm redirectTo="/dashboard/stores" />

          <details className="mt-lg">
            <summary className="cursor-pointer font-ui-label text-ui-label text-text-primary font-medium">
              How to get a token
            </summary>
            <ol className="mt-sm list-decimal space-y-1 pl-5 font-ui-label text-ui-label text-text-muted">
              <li>
                Shopify admin →{" "}
                <strong>Settings → Apps and sales channels → Develop apps</strong>.
              </li>
              <li>
                Click <strong>Create an app</strong> → name it &quot;Alivio Studio&quot;.
              </li>
              <li>
                Under <strong>Admin API integration</strong> grant:{" "}
                <code className="font-mono-data text-xs">read_products</code>,{" "}
                <code className="font-mono-data text-xs">write_products</code>,{" "}
                <code className="font-mono-data text-xs">write_files</code>,{" "}
                <code className="font-mono-data text-xs">read_files</code>.
              </li>
              <li>
                Install the app, then copy the <strong>Admin API access token</strong>{" "}
                (starts with <code className="font-mono-data text-xs">shpat_</code>).
              </li>
            </ol>
          </details>
        </div>

        <div className="hidden lg:block">
          <HeroDecor className="w-full h-auto rounded-3xl shadow-card" />
        </div>
      </div>
    </div>
  );
}
