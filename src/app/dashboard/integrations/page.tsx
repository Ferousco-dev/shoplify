"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";

type SheetsSetup = {
  webhookUrl: string;
  secret: string;
  storeId: string;
  appsScript: string;
};

type AirtableSetup = {
  webhookUrl: string;
  secret: string;
  storeId: string;
  sampleBody: string;
};

function CopyField({
  label,
  value,
  mono = false,
  secret = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const display = secret && !revealed ? "•".repeat(24) : value;

  return (
    <div className="space-y-xs">
      <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-xs">
        <div
          className={`flex-1 min-w-0 rounded-xl border border-border bg-surface-container-low px-md py-sm text-sm truncate ${mono ? "font-mono" : ""} text-text-primary`}
        >
          {display}
        </div>
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex-shrink-0 p-2 rounded-lg border border-border text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors"
            aria-label={revealed ? "Hide" : "Show"}
          >
            <Icon name={revealed ? "visibility_off" : "visibility"} size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className="flex-shrink-0 p-2 rounded-lg border border-border text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors"
          aria-label="Copy"
        >
          <Icon name={copied ? "check" : "content_copy"} size={18} className={copied ? "text-success" : ""} />
        </button>
      </div>
    </div>
  );
}

function ScriptBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="relative">
      <pre className="rounded-2xl bg-surface-container-low border border-border p-md text-xs font-mono text-text-primary overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-sm right-sm flex items-center gap-xs px-sm py-1 rounded-lg bg-surface-container text-xs font-ui-label text-text-muted hover:text-primary border border-border hover:bg-surface-variant/40 transition-colors"
      >
        <Icon name={copied ? "check" : "content_copy"} size={14} className={copied ? "text-success" : ""} />
        {copied ? "Copied!" : "Copy script"}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-md">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-ui-label text-sm font-bold mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-ui-label text-base font-semibold text-text-primary mb-xs">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { data, isLoading, error } = useQuery<SheetsSetup>({
    queryKey: ["sheets-setup"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/sheets");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as SheetsSetup;
    },
    staleTime: Infinity,
  });

  const {
    data: airtableData,
    isLoading: airtableLoading,
    error: airtableError,
  } = useQuery<AirtableSetup>({
    queryKey: ["airtable-setup"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/airtable");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as AirtableSetup;
    },
    staleTime: Infinity,
  });

  return (
    <div className="flex flex-col gap-lg max-w-3xl">
      <header>
        <h1 className="font-section-heading text-section-heading text-text-primary">
          Integrations
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Connect external tools to automate your product pipeline.
        </p>
      </header>

      {/* Google Sheets card */}
      <section className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-md p-lg border-b border-border/30">
          <div className="w-10 h-10 rounded-xl bg-[#0f9d58]/10 flex items-center justify-center flex-shrink-0">
            <Icon name="table_chart" size={22} className="text-[#0f9d58]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-ui-label text-base font-semibold text-text-primary">Google Sheets</p>
            <p className="font-ui-label text-ui-label text-text-muted">
              Auto-generate products whenever a row is added or updated
            </p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-xs px-sm py-1 rounded-full bg-badge-ready-bg text-badge-ready-text text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Active
          </span>
        </div>

        <div className="p-lg space-y-xl">
          {isLoading && (
            <p className="text-sm text-text-muted">Loading your connection details…</p>
          )}
          {error && (
            <div className="rounded-2xl bg-error-container/40 border border-error/30 p-md text-sm text-on-error-container">
              {(error as Error).message}
            </div>
          )}

          {data && (
            <>
              {/* Credentials */}
              <div className="space-y-md">
                <CopyField label="Webhook URL" value={data.webhookUrl} mono />
                <CopyField label="Secret Token" value={data.secret} mono secret />
              </div>

              <hr className="border-border/30" />

              {/* Steps */}
              <div className="space-y-lg">
                <p className="font-ui-label text-sm font-semibold text-text-muted uppercase tracking-wider">
                  Setup — takes about 2 minutes
                </p>

                <Step n={1} title="Open your Google Sheet">
                  <p className="text-sm text-text-muted">
                    Go to the Google Sheet where you track your products. Make sure the first row is a header row with column names matching your CSV format (e.g. <span className="font-mono bg-surface-container-low px-1 rounded text-xs">product_name</span>, <span className="font-mono bg-surface-container-low px-1 rounded text-xs">amazon</span>, <span className="font-mono bg-surface-container-low px-1 rounded text-xs">category</span>, etc.)
                  </p>
                </Step>

                <Step n={2} title='Go to Extensions → Apps Script'>
                  <p className="text-sm text-text-muted">
                    In the top menu, click <strong>Extensions</strong> → <strong>Apps Script</strong>. A new tab will open with a code editor.
                  </p>
                </Step>

                <Step n={3} title="Paste the script below">
                  <p className="text-sm text-text-muted mb-sm">
                    Delete everything in the editor and paste this script. Your webhook URL and secret are already included.
                  </p>
                  <ScriptBlock code={data.appsScript} />
                </Step>

                <Step n={4} title='Click Save, then run "alivioSetup"'>
                  <p className="text-sm text-text-muted">
                    Press <strong>Ctrl+S</strong> (or ⌘S) to save, then click the <strong>Run</strong> button with <code className="text-xs bg-surface-container-low px-1 rounded">alivioSetup</code> selected in the dropdown. Accept the permissions dialog when it appears — this is a one-time step.
                  </p>
                  <p className="text-sm text-text-muted mt-xs">
                    You&apos;ll see a confirmation popup in your sheet: <em>&ldquo;✅ Alivio Plus connected!&rdquo;</em>
                  </p>
                </Step>

                <Step n={5} title="Done — add a product row to test it">
                  <p className="text-sm text-text-muted">
                    Type a new product row in your sheet and press Enter. Within seconds, Alivio will pick it up, generate the copy and images, and push it straight to your Shopify store. You&apos;ll see it appear in <strong>Jobs</strong> automatically.
                  </p>
                </Step>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Airtable card */}
      <section className="rounded-2xl sm:rounded-3xl border border-border/40 bg-warm-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-md p-lg border-b border-border/30">
          <div className="w-10 h-10 rounded-xl bg-[#FCB400]/10 flex items-center justify-center flex-shrink-0">
            <Icon name="grid_view" size={22} className="text-[#FCB400]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-ui-label text-base font-semibold text-text-primary">Airtable</p>
            <p className="font-ui-label text-ui-label text-text-muted">
              Trigger generation from Airtable rows — images write back automatically
            </p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-xs px-sm py-1 rounded-full bg-badge-ready-bg text-badge-ready-text text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Active
          </span>
        </div>

        <div className="p-lg space-y-xl">
          {airtableLoading && (
            <p className="text-sm text-text-muted">Loading your connection details…</p>
          )}
          {airtableError && (
            <div className="rounded-2xl bg-error-container/40 border border-error/30 p-md text-sm text-on-error-container">
              {(airtableError as Error).message}
            </div>
          )}

          {airtableData && (
            <>
              <div className="space-y-md">
                <CopyField label="Webhook URL" value={airtableData.webhookUrl} mono />
                <CopyField label="Secret Token" value={airtableData.secret} mono secret />
              </div>

              <hr className="border-border/30" />

              <div className="space-y-lg">
                <p className="font-ui-label text-sm font-semibold text-text-muted uppercase tracking-wider">
                  Setup — takes about 3 minutes
                </p>

                <Step n={1} title="Add Airtable credentials in Settings">
                  <p className="text-sm text-text-muted">
                    Go to <strong>Settings</strong> and fill in your Airtable{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Personal Access Token</span>,{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Base ID</span>, and{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Table ID</span>. Save. These let us write generated images back to your records.
                  </p>
                </Step>

                <Step n={2} title="Add generated-image columns to your table">
                  <p className="text-sm text-text-muted">
                    In your Airtable base, add these columns if they don&apos;t exist:{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Generated Title</span> (Single line text),{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Generated Description</span> (Long text),{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">Generated Images</span> (Attachment),{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">AI Status</span> (Single line text).
                  </p>
                </Step>

                <Step n={3} title="Create an Automation in Airtable">
                  <p className="text-sm text-text-muted">
                    In your base, click <strong>Automations</strong> → <strong>+ New automation</strong>.
                    Set the trigger to <strong>"When a record is created"</strong> (or updated).
                  </p>
                </Step>

                <Step n={4} title='Add a "Send a webhook" action'>
                  <p className="text-sm text-text-muted mb-sm">
                    Add action → <strong>Send a webhook</strong>. Set method to <strong>POST</strong>,
                    URL to the webhook URL above, and paste this JSON body. Map each{" "}
                    <span className="font-mono bg-surface-container-low px-1 rounded text-xs">{"{{Field}}"}</span> placeholder to your actual Airtable field.
                  </p>
                  <ScriptBlock code={airtableData.sampleBody} />
                </Step>

                <Step n={5} title="Done — add a row to test it">
                  <p className="text-sm text-text-muted">
                    Create a new row in your table. Alivio will automatically scrape the product URL,
                    generate copy and 14 images, then write the results back to your Airtable record under
                    <strong> Generated Title</strong>, <strong>Generated Description</strong>, and{" "}
                    <strong>Generated Images</strong>.
                  </p>
                </Step>
              </div>
            </>
          )}
        </div>
      </section>

      {/* More integrations placeholder */}
      <section className="rounded-2xl sm:rounded-3xl border border-dashed border-border/50 p-lg flex items-center gap-md text-text-muted">
        <Icon name="add_circle" size={24} className="flex-shrink-0 opacity-40" />
        <p className="font-ui-label text-ui-label">
          More integrations coming soon — Notion, direct URL import.
        </p>
      </section>
    </div>
  );
}
