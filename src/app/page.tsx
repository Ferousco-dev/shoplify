import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { AlivioMark } from "@/components/brand/alivio-mark";
import { HeroDecor } from "@/components/brand/hero-decor";
import { OrganicBlob } from "@/components/brand/organic-blob";
import ConnectForm from "@/components/ConnectForm";

export default async function Home() {
  const s = await getSession();
  if (s.shopDomain && s.accessToken) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-text-primary relative overflow-x-hidden">
      <div className="soft-grain" />
      <OrganicBlob
        variant="a"
        fill="#8faf8a"
        className="absolute -top-32 -left-32 w-[520px] h-[520px] blur-[80px] opacity-20 -z-10 hidden md:block"
        aria-hidden="true"
      />
      <OrganicBlob
        variant="b"
        fill="#eadeca"
        className="absolute top-1/3 -right-24 w-[420px] h-[420px] blur-[80px] opacity-25 -z-10 hidden xl:block"
        aria-hidden="true"
      />

      <main className="mx-auto max-w-6xl px-md sm:px-lg py-xl">
        <header className="flex items-center justify-between mb-xl">
          <div className="flex items-center gap-sm">
            <AlivioMark className="w-10 h-10" />
            <div>
              <h1 className="font-section-heading text-section-heading text-primary font-semibold leading-none">
                Alivio Plus
              </h1>
              <p className="font-spoonie-italic text-spoonie-italic text-primary italic">
                By/For/With Spoonies
              </p>
            </div>
          </div>
          <Link
            href="/tutorial"
            className="inline-flex items-center gap-xs font-ui-label text-ui-label text-primary hover:underline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              play_circle
            </span>
            Watch how it works
          </Link>
        </header>

        <section className="grid lg:grid-cols-2 gap-xl items-center">
          <div className="space-y-md">
            <h2 className="font-section-heading text-display-hero-mobile lg:text-display-hero text-text-primary leading-tight">
              Connect your Shopify store
            </h2>
            <p className="text-base text-text-muted leading-relaxed max-w-md">
              One-time setup. Create a custom app in your Shopify admin and paste the
              access token. Your credentials live in an encrypted httpOnly cookie on
              this device only — never on a server.
            </p>

            <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg sm:p-xl">
              <ConnectForm />

              <details className="mt-lg text-sm">
                <summary className="cursor-pointer font-ui-label text-ui-label text-text-primary">
                  How to get a token
                </summary>
                <ol className="mt-sm list-decimal space-y-1 pl-5 text-text-muted">
                  <li>
                    In your Shopify admin: <strong>Settings → Apps and sales channels → Develop apps</strong>.
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
                    Install the app, then copy the <strong>Admin API access token</strong>.
                  </li>
                </ol>
              </details>
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroDecor className="w-full h-auto rounded-3xl shadow-card" />
          </div>
        </section>
      </main>
    </div>
  );
}
