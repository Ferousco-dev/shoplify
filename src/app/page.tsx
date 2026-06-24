import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { AlivioMark } from "@/components/brand/alivio-mark";
import ConnectForm from "@/components/ConnectForm";

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "AI-written content",
    desc: "Titles, descriptions, and SEO copy — written by Claude, tailored to your brand voice.",
  },
  {
    icon: "image",
    title: "Studio-quality images",
    desc: "Gemini generates product photos in seconds. No photographer, no shoot.",
  },
  {
    icon: "rocket_launch",
    title: "Publishes straight to Shopify",
    desc: "Products land in your store automatically, ready to go live.",
  },
];

export default async function Home() {
  const s = await getSession();
  if (s.shopDomain) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-lg sm:px-xl py-md border-b border-border/50 bg-background/80 sticky top-0 z-10 backdrop-blur-none">
        <div className="flex items-center gap-sm">
          <AlivioMark className="w-9 h-9 flex-shrink-0" />
          <div className="leading-none">
            <p className="font-semibold text-sm text-text-primary">Alivio Plus</p>
            <p className="font-spoonie-italic text-spoonie-italic text-text-muted italic leading-none mt-0.5">
              By/For/With Spoonies
            </p>
          </div>
        </div>
        <Link
          href="/tutorial"
          className="hidden sm:inline-flex items-center gap-xs text-sm text-text-muted hover:text-primary transition-colors duration-150"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
          Watch how it works
        </Link>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px]">

        {/* Left — value props */}
        <section className="flex flex-col justify-center px-lg sm:px-xl lg:px-2xl py-xl order-2 lg:order-1">
          <div className="max-w-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-xs px-md py-xs rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Shopify AI Automation
            </div>

            {/* Headline */}
            <h1 className="font-section-heading text-display-hero-mobile lg:text-display-hero text-text-primary leading-tight mb-md">
              Your store,<br className="hidden sm:block" /> on autopilot.
            </h1>

            <p className="text-base text-text-muted leading-relaxed mb-xl max-w-md">
              Drop a supplier link. Alivio scrapes the product, writes the copy,
              generates the images, and pushes straight to your Shopify — all while you rest.
            </p>

            {/* Feature list */}
            <ul className="space-y-lg">
              {FEATURES.map((f) => (
                <li key={f.icon} className="flex items-start gap-md">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: 18 }}
                    >
                      {f.icon}
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary leading-snug">{f.title}</p>
                    <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right — connect card */}
        <section className="flex flex-col justify-center items-center px-lg py-xl border-l border-border/40 bg-warm-white order-1 lg:order-2">
          <div className="w-full max-w-sm">
            {/* Card */}
            <div className="rounded-3xl border border-border/60 bg-surface-container-lowest shadow-card p-xl">
              <div className="mb-lg">
                <h2 className="font-section-heading text-2xl text-text-primary mb-xs">
                  Connect your store
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Enter your Shopify domain. Authentication happens automatically — nothing to copy.
                </p>
              </div>

              <ConnectForm />

              <div className="mt-lg pt-lg border-t border-border/40 flex items-start gap-xs">
                <span
                  className="material-symbols-outlined text-success flex-shrink-0"
                  style={{ fontSize: 16 }}
                >
                  lock
                </span>
                <p className="text-xs text-text-muted leading-relaxed">
                  Credentials are encrypted and stored only in your session — never logged or shared.
                </p>
              </div>
            </div>

            {/* Tutorial link — mobile only */}
            <p className="text-center text-xs text-text-muted mt-lg sm:hidden">
              <Link href="/tutorial" className="underline underline-offset-2 hover:text-primary transition-colors">
                Watch how it works
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
