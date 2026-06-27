import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { AlivioMark } from "@/components/brand/alivio-mark";
import ConnectForm from "@/components/ConnectForm";

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "AI-written content",
    desc: "Titles, descriptions, and SEO copy written by Claude — tuned to your brand.",
  },
  {
    icon: "image",
    title: "Studio-quality images",
    desc: "Gemini generates product photos in seconds. No photographer needed.",
  },
  {
    icon: "rocket_launch",
    title: "Pushes straight to Shopify",
    desc: "Products land in your store automatically, ready to go live.",
  },
];

export default async function Home() {
  const s = await getSession();
  if (s.shopDomain) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background flex flex-col">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-md sm:px-xl py-sm border-b border-border/50 bg-background">
        <AlivioMark className="h-9 w-auto" />
        <Link
          href="/tutorial"
          className="inline-flex items-center gap-xs text-sm text-text-muted hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_circle</span>
          <span className="hidden sm:inline">Watch how it works</span>
          <span className="sm:hidden">Tutorial</span>
        </Link>
      </header>

      {/* ── Mobile hero (hidden on desktop) ── */}
      <div className="lg:hidden px-md pt-lg pb-md">
        <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Shopify AI Automation
        </span>
        <h1 className="font-section-heading text-display-hero-mobile text-text-primary leading-tight mt-sm">
          Your store,<br />on autopilot.
        </h1>
        <p className="text-sm text-text-muted leading-relaxed mt-sm max-w-sm">
          Drop a supplier link — Alivio writes, images, and publishes to your Shopify automatically.
        </p>
      </div>

      {/* ── Body ── */}
      <main className="flex-1 lg:grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px]">

        {/* Left — desktop value props (hidden on mobile) */}
        <section className="hidden lg:flex flex-col justify-center px-xl 2xl:px-2xl py-2xl">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-md">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Shopify AI Automation
            </span>
            <h1 className="font-section-heading text-display-hero text-text-primary leading-tight mb-md">
              Your store,<br />on autopilot.
            </h1>
            <p className="text-base text-text-muted leading-relaxed mb-xl max-w-md">
              Drop a supplier link. Alivio scrapes the product, writes the copy,
              generates the images, and pushes straight to your Shopify — all while you rest.
            </p>
            <ul className="flex flex-col gap-md">
              {FEATURES.map((f) => (
                <li key={f.icon} className="flex items-start gap-md">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                      {f.icon}
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{f.title}</p>
                    <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right — form panel */}
        <section className="flex flex-col justify-start lg:justify-center items-center px-md sm:px-xl py-md lg:py-xl lg:border-l lg:border-border/40 lg:bg-warm-white">
          <div className="w-full max-w-sm">

            {/* Form card */}
            <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-white shadow-card p-lg sm:p-xl">
              <h2 className="font-section-heading text-xl sm:text-2xl text-text-primary mb-xs">
                Connect your store
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-lg">
                Enter your Shopify domain. Auth happens automatically — nothing to copy.
              </p>

              <ConnectForm />

              <div className="mt-lg pt-md border-t border-border/40 flex items-center gap-xs">
                <span className="material-symbols-outlined text-success" style={{ fontSize: 15 }}>lock</span>
                <p className="text-xs text-text-muted">Encrypted session — never logged or shared.</p>
              </div>
            </div>

            {/* Mobile feature list (below form only) */}
            <ul className="lg:hidden mt-lg flex flex-col gap-md pb-lg">
              {FEATURES.map((f) => (
                <li key={f.icon} className="flex items-start gap-sm">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                      {f.icon}
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{f.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 px-md sm:px-xl py-md flex flex-col sm:flex-row items-center justify-between gap-sm text-xs text-text-muted bg-background">
        <div className="flex items-center gap-xs">
          <AlivioMark className="h-5 w-auto" />
          <span>© {new Date().getFullYear()} Alivio Plus</span>
        </div>
        <div className="flex items-center gap-lg">
          <Link href="/tutorial" className="hover:text-primary transition-colors">Tutorial</Link>
          <Link href="/dashboard/guide" className="hover:text-primary transition-colors">Guide</Link>
        </div>
      </footer>
    </div>
  );
}
