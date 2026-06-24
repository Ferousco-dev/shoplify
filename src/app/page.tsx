import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { AlivioMark } from "@/components/brand/alivio-mark";
import { HeroDecor } from "@/components/brand/hero-decor";
import { OrganicBlob } from "@/components/brand/organic-blob";
import ConnectForm from "@/components/ConnectForm";

export default async function Home() {
  const s = await getSession();
  if (s.shopDomain) {
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
              One-time setup. Enter your store domain and we handle the rest —
              authentication happens automatically in the background, no tokens to copy.
            </p>

            <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg sm:p-xl">
              <ConnectForm />
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
