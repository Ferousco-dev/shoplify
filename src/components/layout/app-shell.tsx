"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { OrganicBlob } from "@/components/brand/organic-blob";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/new", label: "New Job", icon: "auto_fix_high" },
  { href: "/dashboard/jobs", label: "Jobs", icon: "list_alt" },
  { href: "/dashboard/products", label: "Products", icon: "inventory_2" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "inventory" },
  { href: "/dashboard/automation", label: "Automation", icon: "bolt" },
  { href: "/dashboard/stores", label: "Stores", icon: "storefront" },
];

const FOOTER_NAV: NavItem[] = [
  { href: "/dashboard/guide", label: "Guide", icon: "menu_book" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

type ConnectStatus =
  | { connected: false }
  | { connected: true; shop: { name?: string; domain?: string } };

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const shopQuery = useQuery<ConnectStatus>({
    queryKey: ["shop-status"],
    queryFn: async () => {
      const res = await fetch("/api/shopify/connect");
      if (!res.ok) return { connected: false };
      return (await res.json()) as ConnectStatus;
    },
    staleTime: 60_000,
  });
  const shopName = shopQuery.data?.connected
    ? shopQuery.data.shop?.name || shopQuery.data.shop?.domain
    : null;

  const isActive = (href: string) => {
    // Dashboard root only matches its exact path; otherwise it'd light up on
    // every /dashboard/* subroute and steal highlighting from the real nav item.
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Close drawer when route changes (i.e. user tapped a link).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Close on Escape, and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <div className="bg-background text-text-primary min-h-screen relative overflow-x-hidden">
      {/* Skip to main content — keyboard-only users tab here first. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:bg-primary focus:text-on-primary focus:px-md focus:py-sm focus:rounded-full focus:shadow-md focus:font-ui-label focus:text-ui-label"
      >
        Skip to main content
      </a>
      {/* Brand decorative layers.
       *
       * `blur(N)` on a fullscreen element is expensive on low-end mobile
       * (GPU repaints every scroll frame). We hide the blobs entirely on
       * mobile and only show ONE on >=md — keeps the brand atmosphere
       * without the perf cost. soft-grain is a fixed CSS background which
       * is essentially free.
       */}
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

      {/* === Side Navigation ===
       * Desktop: fixed at left, always visible.
       * Mobile: same panel rendered as a slide-in drawer toggled by the
       * hamburger button in the topbar. We render it once and let media
       * queries + a mobileNavOpen-controlled translate handle both modes.
       */}
      <SideNav
        pathname={pathname}
        mobileNavOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        isActive={isActive}
      />

      {/* Mobile backdrop. Solid translucent fill rather than blur — blur
       * on a full-screen overlay is expensive on low-end Android. The
       * darker tint reads cleanly without the GPU cost. */}
      <button
        type="button"
        aria-hidden={!mobileNavOpen}
        tabIndex={mobileNavOpen ? 0 : -1}
        aria-label="Close navigation"
        onClick={() => setMobileNavOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-text-primary/55 transition-opacity duration-200 md:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* === Topbar (fixed) ===
       * Pinned to the viewport top so it never scrolls away. Width adapts:
       * full-width on mobile, offset by the sidebar on >=md. We use
       * `position: fixed` rather than `sticky` because the root has
       * `overflow-x-hidden` (needed for the organic blobs), which breaks
       * sticky scroll-containment in some browsers.
       *
       * `pt-safe` respects the iOS notch / Dynamic Island. `px-md` on
       * mobile drops to a comfortable 16px, expanding to 24px from md up.
       */}
      <header
        className="fixed top-0 right-0 left-0 md:left-[288px] z-30 flex justify-between items-center gap-sm px-md md:px-lg py-md pt-safe bg-background/90 backdrop-blur-md border-b border-border/30"
      >
        <div className="flex items-center gap-sm min-w-0">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden -ml-2 p-2 rounded-full text-text-primary hover:bg-surface-variant/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="menu" size={24} />
          </button>
          {shopName ? (
            <span className="inline-flex items-center gap-xs font-ui-label text-ui-label text-text-muted truncate">
              <Icon name="storefront" size={16} className="text-primary" />
              <span className="font-mono-data text-text-primary truncate">{shopName}</span>
            </span>
          ) : (
            <span className="font-ui-label text-ui-label text-text-muted truncate">
              Alivio Studio
            </span>
          )}
        </div>
        <div className="flex items-center gap-md">
          <button
            type="button"
            aria-label="Notifications"
            className="p-2 -m-2 text-text-muted hover:text-primary transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="notifications" size={22} />
          </button>
          <button
            type="button"
            aria-label="Help"
            className="p-2 -m-2 text-text-muted hover:text-primary transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Icon name="help_outline" size={22} />
          </button>
          <div
            role="img"
            aria-label="Operator profile"
            className="w-10 h-10 rounded-full bg-primary-container border-2 border-primary-fixed flex items-center justify-center text-on-primary-container font-ui-label"
          >
            A
          </div>
        </div>
      </header>

      {/* Main panel.
       *
       * `pt-[64px] sm:pt-[72px]` reserves the fixed topbar height plus
       * iOS safe-area at the top.
       *
       * `pb-[120px]` reserves enough room for any sticky bottom-bar + iOS
       * home indicator. Pages without a bottom bar look slightly tall on
       * mobile but the visual cost is small; the alternative (per-page
       * pb tuning) was a maintenance trap.
       */}
      <main
        id="main-content"
        className="md:ml-[288px] min-h-screen flex flex-col pt-[calc(64px+env(safe-area-inset-top))] sm:pt-[calc(72px+env(safe-area-inset-top))]"
      >
        {/* Content padding scales: 16px on small phones → 24px from sm →
            40px from xl. Bottom padding holds the home indicator + any
            sticky footer so content never lives behind them. */}
        <div className="px-md sm:px-lg xl:px-xl pb-[calc(120px+env(safe-area-inset-bottom))] pt-md md:pt-lg flex flex-col gap-lg sm:gap-xl max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

function SideNav({
  pathname: _pathname,
  mobileNavOpen,
  onCloseMobile,
  isActive,
}: {
  pathname: string;
  mobileNavOpen: boolean;
  onCloseMobile: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <aside
      id="mobile-nav"
      role="navigation"
      aria-label="Primary"
      className={cn(
        "fixed left-0 top-0 h-screen w-[288px] bg-surface-container flex flex-col gap-md p-lg border-r border-border z-50",
        // On desktop the sidebar is always shown; on mobile it slides off-
        // screen and is brought in via the hamburger.
        "transform transition-transform duration-200 ease-out",
        mobileNavOpen
          ? "translate-x-0 shadow-2xl"
          : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="mb-xl flex items-start justify-between gap-sm">
        <div>
          <h1 className="font-section-heading text-section-heading text-primary font-semibold leading-none">
            Alivio Plus
          </h1>
          <p className="font-ui-label text-ui-label text-text-muted mt-xs">
            Gently automating your shop
          </p>
        </div>
        {/* Close button — mobile only. Desktop sidebar is always pinned so
            no close affordance is needed. */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="md:hidden -mr-2 -mt-1 p-2 rounded-full text-text-muted hover:text-primary hover:bg-surface-variant/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <nav className="flex-grow flex flex-col gap-xs overflow-y-auto -mx-xs px-xs">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-xl flex items-center px-md py-3 transition-colors duration-150 group",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-text-muted hover:bg-surface-variant",
              )}
            >
              <Icon
                name={item.icon}
                size={22}
                filled={active}
                className={cn(
                  "mr-md",
                  !active && "group-hover:text-primary transition-colors",
                )}
              />
              <span className="font-ui-label text-[0.95rem] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-xs border-t border-border pt-md">
        {FOOTER_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-xl flex items-center px-md py-3 transition-colors duration-150",
                active
                  ? "bg-primary-container text-on-primary-container"
                  : "text-text-muted hover:bg-surface-variant",
              )}
            >
              <Icon name={item.icon} size={22} className="mr-md" />
              <span className="font-ui-label text-[0.95rem] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
