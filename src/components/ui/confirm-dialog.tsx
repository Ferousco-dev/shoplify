"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows a red confirm button. */
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Minimal accessible confirmation modal. Used for cancel/delete flows so
 * the operator gets a deliberate "yes I meant that" before destructive
 * actions. Closes on backdrop click, Escape, and Confirm/Cancel buttons.
 * Locks body scroll while open.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && document.activeElement === confirmRef.current) {
        onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Auto-focus the confirm button so Enter == confirm.
    confirmRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onConfirm, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-desc" : undefined}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-md"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm"
      />
      {/* Card */}
      <div className="relative bg-warm-white rounded-3xl shadow-card border border-border/40 max-w-md w-full p-lg">
        <div className="flex items-start gap-md mb-md">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              tone === "danger"
                ? "bg-error-container text-on-error-container"
                : "bg-primary-container/40 text-primary",
            )}
          >
            <Icon name={tone === "danger" ? "warning" : "help"} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-title"
              className="font-section-heading text-lg text-text-primary mb-xs"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-desc"
                className="text-sm text-text-muted leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-lg py-sm rounded-full font-ui-label text-ui-label text-text-muted hover:text-primary hover:bg-surface-variant/40 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "px-lg py-sm rounded-full font-ui-label text-ui-label shadow-sm transition-all disabled:opacity-50",
              tone === "danger"
                ? "bg-error text-on-error hover:opacity-90"
                : "bg-primary text-on-primary hover:opacity-90",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
