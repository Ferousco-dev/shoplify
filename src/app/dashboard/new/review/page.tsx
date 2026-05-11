"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ImageItem = {
  shortKey: string;
  label: string;
  alt: string;
  resourceUrl: string;
  previewDataUrl?: string;
  category: "ecommerce" | "lifestyle" | "closeup" | "ugc";
};

type Metafield = { namespace: string; key: string; type: string; value: string };

type ProductDraft = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  seo: { title: string; description: string };
  tags: string[];
  metafields: Metafield[];
  images: ImageItem[];
};

type SectionKey = "images" | "copy" | "seo" | "shopify";

function categoryFromSlot(shortKey: string): "ecommerce" | "lifestyle" | "closeup" | "ugc" {
  if (shortKey.startsWith("ugc")) return "ugc";
  if (
    shortKey.startsWith("scale") ||
    shortKey.startsWith("human") ||
    shortKey.startsWith("ambient")
  )
    return "lifestyle";
  if (
    shortKey.startsWith("texture") ||
    shortKey.startsWith("functional") ||
    shortKey.startsWith("branding")
  )
    return "closeup";
  return "ecommerce";
}

function categoryBadge(c: ImageItem["category"]): { label: string; tone: string } {
  switch (c) {
    case "lifestyle":
      return { label: "LIFESTYLE", tone: "bg-badge-running-bg text-badge-running-text" };
    case "ecommerce":
      return { label: "E-COMMERCE", tone: "bg-badge-draft-bg text-badge-draft-text" };
    case "closeup":
      return { label: "CLOSEUP", tone: "bg-surface-variant text-text-muted" };
    case "ugc":
      return { label: "UGC", tone: "bg-badge-ready-bg text-badge-ready-text" };
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<SectionKey>("images");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("generatedDrafts");
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProductDraft[];
      // Hydrate category on each image (in case it wasn't set when generated).
      const withCats = parsed.map((p) => ({
        ...p,
        images: p.images.map((img) => ({
          ...img,
          category: img.category ?? categoryFromSlot(img.shortKey),
        })),
      }));
      setDrafts(withCats);
      setSelectedId(withCats[0]?.id ?? "");
    } catch {
      // ignore
    }
  }, []);

  const selected = drafts.find((d) => d.id === selectedId);

  const progressPct = useMemo(() => {
    if (drafts.length === 0) return 0;
    const idx = drafts.findIndex((d) => d.id === selectedId);
    return Math.round(((idx + 1) / drafts.length) * 100);
  }, [drafts, selectedId]);

  function updateDraft(id: string, patch: Partial<ProductDraft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setSavedAt(new Date());
  }

  function updateMeta(field: "seoTitle" | "seoDesc", value: string) {
    if (!selected) return;
    updateDraft(selected.id, {
      seo:
        field === "seoTitle"
          ? { ...selected.seo, title: value }
          : { ...selected.seo, description: value },
    });
  }

  async function publishAll() {
    setPubBusy(true);
    setPubError(null);
    try {
      for (const d of drafts) {
        const res = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: {
              title: d.title,
              handle: d.handle,
              descriptionHtml: d.descriptionHtml,
              seo: d.seo,
              tags: d.tags,
              metafields: d.metafields,
            },
            media: d.images.map((img) => ({
              resourceUrl: img.resourceUrl,
              alt: img.alt,
            })),
            vendor: "Alivio Plus Co",
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      }
      sessionStorage.removeItem("generatedDrafts");
      router.push("/dashboard/new/publish");
    } catch (e) {
      setPubError((e as Error).message);
    } finally {
      setPubBusy(false);
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-md max-w-2xl">
        <Link
          href="/dashboard/new/processing"
          className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted hover:text-primary transition-colors"
        >
          <Icon name="chevron_left" size={18} />
          Back
        </Link>
        <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-xl text-center">
          <p className="font-section-heading text-base text-text-primary">
            No generated drafts to review.
          </p>
          <p className="font-ui-label text-ui-label text-text-muted mt-xs">
            Start a new automation from{" "}
            <Link href="/dashboard/new" className="text-primary hover:underline">
              the upload page
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!selected) return null;

  const sections: { key: SectionKey; icon: string; label: string; count?: number }[] = [
    { key: "images", icon: "photo_library", label: "Images", count: selected.images.length },
    { key: "copy", icon: "description", label: "Copy & Meta" },
    { key: "seo", icon: "search", label: "SEO Tools" },
    { key: "shopify", icon: "storefront", label: "Shopify Sync" },
  ];

  return (
    <div className="flex flex-col gap-lg pb-[140px]">
      <header>
        <p className="font-ui-label text-[0.7rem] uppercase tracking-widest text-text-muted">
          Step 5 of 5
        </p>
        <h1 className="font-section-heading text-section-heading text-text-primary leading-tight mt-xs">
          Review Generated Content
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-lg">
        {/* === Left rail === */}
        <aside className="flex flex-col gap-md">
          {drafts.map((d) => {
            const isCurrent = d.id === selected.id;
            return (
              <div
                key={d.id}
                className={cn(
                  "rounded-2xl border bg-warm-white overflow-hidden",
                  isCurrent
                    ? "border-primary shadow-card"
                    : "border-border/40 shadow-sm",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className="w-full text-left px-md py-sm flex items-center gap-xs"
                >
                  <Icon
                    name="inventory_2"
                    size={18}
                    className={isCurrent ? "text-primary" : "text-text-muted"}
                  />
                  <span
                    className={cn(
                      "font-section-heading text-base truncate",
                      isCurrent ? "text-text-primary" : "text-text-muted",
                    )}
                  >
                    {d.title}
                  </span>
                </button>

                {isCurrent && (
                  <nav className="border-t border-border/40 p-xs flex flex-col gap-xs">
                    {sections.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setActiveSection(s.key)}
                        className={cn(
                          "w-full flex items-center gap-sm px-sm py-2 rounded-lg font-ui-label text-ui-label transition-colors",
                          activeSection === s.key
                            ? "bg-primary-container/40 text-primary"
                            : "text-text-muted hover:bg-surface-variant/40",
                        )}
                      >
                        <Icon name={s.icon} size={16} />
                        <span className="flex-1 text-left">{s.label}</span>
                        {typeof s.count === "number" && (
                          <span className="text-xs font-mono-data bg-surface-variant text-text-muted px-sm py-0.5 rounded-full">
                            {s.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            );
          })}

          <div className="rounded-2xl border border-border/40 bg-surface-container-low p-md">
            <p className="font-spoonie-italic text-spoonie-italic italic text-text-muted leading-relaxed">
              &ldquo;You&rsquo;re almost there. Take a breath, we&rsquo;ve handled the
              heavy lifting.&rdquo;
            </p>
            <div className="flex gap-xs mt-sm">
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i / 5 < progressPct / 100;
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      filled ? "bg-primary" : "bg-surface-variant",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </aside>

        {/* === Main content === */}
        <div className="flex flex-col gap-lg min-w-0">
          {activeSection === "images" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-sm mb-md">
                <h2 className="font-section-heading text-2xl text-text-primary">
                  Generated Visuals
                </h2>
                <div className="flex gap-xs">
                  <Button size="sm" variant="secondary" disabled>
                    <Icon name="upload" size={16} />
                    Upload Custom
                  </Button>
                  <Button size="sm" disabled>
                    <Icon name="auto_awesome" size={16} />
                    Generate More
                  </Button>
                </div>
              </div>
              {selected.images.length === 0 ? (
                <div className="rounded-3xl border border-border/40 bg-warm-white p-xl text-center font-ui-label text-ui-label text-text-muted">
                  No images generated for this product.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
                  {selected.images.map((img) => {
                    const badge = categoryBadge(img.category);
                    return (
                      <figure
                        key={img.shortKey}
                        className="relative rounded-3xl overflow-hidden border border-border/40 bg-warm-white shadow-sm aspect-square"
                      >
                        <span
                          className={cn(
                            "absolute top-sm left-sm z-10 inline-flex items-center px-sm py-0.5 rounded-full text-[10px] font-bold tracking-wider",
                            badge.tone,
                          )}
                        >
                          {badge.label}
                        </span>
                        {img.previewDataUrl || img.resourceUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.previewDataUrl ?? img.resourceUrl}
                            alt={img.alt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <Icon name="image" size={48} />
                          </div>
                        )}
                      </figure>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {(activeSection === "images" || activeSection === "copy") && (
            <section>
              <h2 className="font-section-heading text-2xl text-text-primary mb-md">
                Shopify Metafields
              </h2>
              <Accordion icon="title" title="SEO Title & Meta" defaultOpen>
                <div className="space-y-md">
                  <Field label="Page Title">
                    <input
                      value={selected.seo.title}
                      onChange={(e) => updateMeta("seoTitle", e.target.value)}
                      className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    />
                  </Field>
                  <Field label="Meta Description">
                    <textarea
                      value={selected.seo.description}
                      onChange={(e) => updateMeta("seoDesc", e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-surface-container-low p-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none"
                    />
                  </Field>
                </div>
              </Accordion>

              <Accordion icon="auto_awesome" title="Marketing Hooks">
                <ul className="space-y-xs font-ui-label text-ui-label text-text-primary">
                  {selected.metafields
                    .filter((m) =>
                      [
                        "hero_hook",
                        "hero_description",
                        "what_spoonies_love",
                        "top_benefits",
                      ].includes(m.key),
                    )
                    .map((m) => (
                      <li key={m.key} className="rounded-lg bg-surface-container-low p-sm">
                        <p className="font-mono-data text-mono-data text-text-muted">
                          alivio.{m.key}
                        </p>
                        <pre className="whitespace-pre-wrap break-words mt-xs">
                          {tryFormatValue(m.value)}
                        </pre>
                      </li>
                    ))}
                  {selected.metafields.filter((m) =>
                    [
                      "hero_hook",
                      "hero_description",
                      "what_spoonies_love",
                      "top_benefits",
                    ].includes(m.key),
                  ).length === 0 && (
                    <li className="font-ui-label text-ui-label text-text-muted">
                      No marketing copy generated for this product.
                    </li>
                  )}
                </ul>
              </Accordion>
            </section>
          )}

          {activeSection === "seo" && (
            <section>
              <h2 className="font-section-heading text-2xl text-text-primary mb-md">
                SEO Tools
              </h2>
              <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg space-y-md">
                <Field label="Page Title">
                  <input
                    value={selected.seo.title}
                    onChange={(e) => updateMeta("seoTitle", e.target.value)}
                    className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  />
                </Field>
                <Field label="Meta Description">
                  <textarea
                    value={selected.seo.description}
                    onChange={(e) => updateMeta("seoDesc", e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface-container-low p-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none"
                  />
                </Field>
                <Field label="URL Handle">
                  <input
                    value={selected.handle}
                    onChange={(e) =>
                      updateDraft(selected.id, { handle: e.target.value })
                    }
                    className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md font-mono-data text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  />
                </Field>
                <Field label="Tags">
                  <input
                    value={selected.tags.join(", ")}
                    onChange={(e) =>
                      updateDraft(selected.id, {
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    className="w-full h-11 rounded-lg border border-border bg-surface-container-low px-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                  />
                </Field>
              </div>
            </section>
          )}

          {activeSection === "shopify" && (
            <section>
              <h2 className="font-section-heading text-2xl text-text-primary mb-md">
                Shopify Sync
              </h2>
              <div className="rounded-3xl border border-border/40 bg-warm-white shadow-card p-lg">
                <p className="font-ui-label text-ui-label text-text-muted mb-sm">
                  When you publish, Alivio will create a draft product with these
                  metafields:
                </p>
                <ul className="space-y-xs">
                  {selected.metafields.map((m) => (
                    <li
                      key={`${m.namespace}.${m.key}`}
                      className="rounded-lg bg-surface-container-low p-sm"
                    >
                      <p className="font-mono-data text-mono-data text-text-muted">
                        {m.namespace}.{m.key}
                        <span className="ml-sm text-text-muted/70">({m.type})</span>
                      </p>
                      <pre className="whitespace-pre-wrap break-words text-sm text-text-primary mt-xs">
                        {tryFormatValue(m.value)}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {pubError && (
            <div className="rounded-3xl border border-error/30 bg-error-container/40 p-md text-on-error-container font-ui-label text-ui-label">
              {pubError}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[260px] bg-warm-white/95 backdrop-blur-xl border-t border-border px-md sm:px-lg py-sm sm:py-md pb-safe z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-sm">
          <Link
            href="/dashboard/new/processing"
            className="inline-flex items-center gap-xs h-11 px-lg rounded-full border border-border font-ui-label text-ui-label text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors"
          >
            <Icon name="arrow_back" size={18} />
            Back
          </Link>
          <div className="hidden md:block flex-1 ml-md">
            <p className="font-ui-label text-[10px] uppercase tracking-widest text-text-muted">
              {savedAt ? "Autosaved just now" : "Edits save automatically"}
            </p>
            {savedAt && (
              <button
                type="button"
                onClick={() => setSavedAt(null)}
                className="font-ui-label text-ui-label text-primary hover:underline"
              >
                Undo latest edit
              </button>
            )}
          </div>
          <div className="flex gap-sm">
            <Button
              size="md"
              variant="secondary"
              onClick={() => setSavedAt(new Date())}
              disabled={pubBusy}
            >
              Save All Edits
            </Button>
            <Button size="md" onClick={publishAll} disabled={pubBusy}>
              {pubBusy ? "Publishing…" : "Publish to Shopify"}
              <Icon name="arrow_forward" size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-ui-label text-[10px] uppercase tracking-widest text-text-muted mb-xs">
        {label}
      </label>
      {children}
    </div>
  );
}

function Accordion({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl border border-border/40 bg-warm-white shadow-sm overflow-hidden mb-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-sm px-lg py-md hover:bg-surface-container-low/40 transition-colors"
      >
        <span className="inline-flex items-center gap-sm">
          <Icon name={icon} size={18} className="text-primary" />
          <span className="font-section-heading text-base text-text-primary">{title}</span>
        </span>
        <Icon
          name="expand_more"
          size={20}
          className={cn("text-text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-lg pb-lg">{children}</div>}
    </div>
  );
}

function tryFormatValue(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(", ");
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
    return String(parsed);
  } catch {
    return raw;
  }
}
