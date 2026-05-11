"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui";
import { cn } from "@/lib/cn";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type Credentials = {
  anthropicApiKey: string;
  geminiApiKey: string;
  googleSerpApiKey: string;
  storeUrl: string;
};

type Preferences = {
  lowEnergyMode: boolean;
  targetMarket: string;
};

const PREFS_KEY = "alivio.preferences";

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<Credentials>({
    anthropicApiKey: "",
    geminiApiKey: "",
    googleSerpApiKey: "",
    storeUrl: "",
  });
  const [preferences, setPreferences] = useState<Preferences>({
    lowEnergyMode: false,
    targetMarket: "United States & Canada",
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.preferences) setPreferences(parsed.preferences);
        if (parsed.credentials) {
          setCredentials((c) => ({
            ...c,
            googleSerpApiKey: parsed.credentials.googleSerpApiKey ?? "",
            storeUrl: parsed.credentials.storeUrl ?? "",
          }));
        }
      }
    } catch {
      // localStorage is best-effort — ignore parse errors.
    }
  }, []);

  const handleCredentialChange = (key: keyof Credentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handlePreferenceChange = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSecret = (key: string) =>
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitStatus("submitting");
      setErrorMessage("");

      try {
        const res = await fetch("/api/settings/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anthropicApiKey: credentials.anthropicApiKey || undefined,
            geminiApiKey: credentials.geminiApiKey || undefined,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            preferences,
            credentials: {
              googleSerpApiKey: credentials.googleSerpApiKey,
              storeUrl: credentials.storeUrl,
            },
          }),
        );

        setSubmitStatus("success");
        setTimeout(() => setSubmitStatus("idle"), 3000);
      } catch (err) {
        setErrorMessage((err as Error).message);
        setSubmitStatus("error");
      }
    },
    [credentials, preferences],
  );

  const apiKeyFields: { label: string; key: keyof Credentials }[] = [
    { label: "Anthropic API Key", key: "anthropicApiKey" },
    { label: "Gemini API Key", key: "geminiApiKey" },
    { label: "Google SERP API Key", key: "googleSerpApiKey" },
  ];

  return (
    <div className="flex flex-col gap-lg max-w-3xl">
      <header>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Settings
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Customize your space to match your energy levels today.
        </p>
      </header>

      {submitStatus === "success" && (
        <Banner tone="success" icon="check_circle" title="Settings saved">
          Your settings have been updated.
        </Banner>
      )}
      {submitStatus === "error" && (
        <Banner tone="error" icon="error" title="Failed to save">
          {errorMessage}
        </Banner>
      )}

      <form onSubmit={onSubmit} className="space-y-xl">
        <Section icon="vpn_key" title="API CREDENTIALS" subtitle="Manage your search and intelligence engines">
          <div className="space-y-md">
            {apiKeyFields.map(({ label, key }) => (
              <div key={key} className="space-y-xs">
                <Label htmlFor={key}>{label}</Label>
                <div className="flex gap-sm">
                  <Input
                    id={key}
                    type={showSecrets[key] ? "text" : "password"}
                    value={credentials[key]}
                    onChange={(e) => handleCredentialChange(key, e.target.value)}
                    placeholder="•••••••••••••"
                    autoComplete="off"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret(key)}
                    className="px-md rounded-lg border border-border text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors"
                    aria-label={showSecrets[key] ? "Hide" : "Show"}
                  >
                    <Icon name={showSecrets[key] ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="storefront" title="SHOPIFY CONFIGURATION">
          <div className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                value={credentials.storeUrl}
                onChange={(e) => handleCredentialChange("storeUrl", e.target.value)}
                placeholder="mystore.myshopify.com"
              />
            </div>
            <p className="font-ui-label text-ui-label text-text-muted">
              To change your active connection, disconnect and re-pair from the home page.
            </p>
          </div>
        </Section>

        <Section icon="tune" title="APP PREFERENCES" subtitle="Tailor the experience to your daily energy">
          <div className="space-y-lg">
            <div className="flex items-center justify-between gap-md">
              <div>
                <p className="font-ui-label text-base text-text-primary font-medium">
                  Low Energy Mode
                </p>
                <p className="font-ui-label text-ui-label text-text-muted">
                  Reduces visual complexity and prioritizes critical tasks
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.lowEnergyMode}
                onClick={() => handlePreferenceChange("lowEnergyMode", !preferences.lowEnergyMode)}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                  preferences.lowEnergyMode ? "bg-primary" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm",
                    preferences.lowEnergyMode ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="market">Default Target Market</Label>
              <select
                id="market"
                value={preferences.targetMarket}
                onChange={(e) => handlePreferenceChange("targetMarket", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface-container-low px-md py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              >
                <option>North America</option>
                <option>United States & Canada</option>
                <option>Europe</option>
                <option>Asia Pacific</option>
                <option>Global</option>
              </select>
            </div>
          </div>
        </Section>

        <div className="pt-md border-t border-border/40">
          <Button type="submit" size="lg" disabled={submitStatus === "submitting"} className="w-full">
            {submitStatus === "submitting" ? (
              <>
                <Icon name="progress_activity" size={18} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save All Settings"
            )}
          </Button>
        </div>
      </form>

      <aside className="rounded-3xl p-lg bg-surface-container-low border-l-4 border-primary">
        <p className="font-spoonie-italic text-spoonie-italic italic text-text-muted">
          &quot;Gentleness is also a form of efficiency.&quot;
        </p>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Your settings are saved automatically as you navigate, ensuring no work is lost if you need to step away.
        </p>
      </aside>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-sm mb-xs">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-on-primary">
          <Icon name={icon} size={16} />
        </span>
        <h2 className="font-ui-label text-ui-label text-text-primary font-bold tracking-wider">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="font-ui-label text-ui-label text-text-muted mb-md">{subtitle}</p>
      )}
      <div className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white p-lg shadow-sm">
        {children}
      </div>
    </section>
  );
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: "success" | "error";
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-md flex gap-sm items-start",
        tone === "success"
          ? "bg-badge-ready-bg border border-primary/30"
          : "bg-error-container border border-error/40",
      )}
    >
      <Icon
        name={icon}
        size={20}
        filled
        className={tone === "success" ? "text-success" : "text-error"}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-ui-label text-ui-label font-semibold",
            tone === "success" ? "text-badge-ready-text" : "text-on-error-container",
          )}
        >
          {title}
        </p>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">{children}</p>
      </div>
    </div>
  );
}
