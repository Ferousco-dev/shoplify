import { cn } from "@/lib/cn";

type Props = {
  /** Optional caption shown below/beside the dots. */
  label?: string;
  /** Visual size — sm fits inline, md is the default for page-level loaders. */
  size?: "sm" | "md" | "lg";
  /** Layout: dots + label inline (default), or stacked. */
  layout?: "row" | "column";
  className?: string;
};

const SIZE_PX: Record<Required<Props>["size"], string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

const GAP: Record<Required<Props>["size"], string> = {
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
};

/**
 * Three-dot bouncing loader in Alivio sage. Uses Tailwind's animate-bounce
 * with staggered delays so the dots cascade. Use this everywhere we'd
 * otherwise show plain "Loading…" text.
 */
export function DotsLoader({
  label,
  size = "md",
  layout = "row",
  className,
}: Props) {
  const dot = SIZE_PX[size];
  const gap = GAP[size];
  const dots = (
    <div className={cn("flex items-end", gap)} aria-hidden="true">
      <span
        className={cn(dot, "bg-primary rounded-full animate-bounce")}
        style={{ animationDelay: "0ms", animationDuration: "900ms" }}
      />
      <span
        className={cn(dot, "bg-primary-container rounded-full animate-bounce")}
        style={{ animationDelay: "150ms", animationDuration: "900ms" }}
      />
      <span
        className={cn(dot, "bg-secondary rounded-full animate-bounce")}
        style={{ animationDelay: "300ms", animationDuration: "900ms" }}
      />
    </div>
  );

  return (
    <div
      role="status"
      aria-label={label || "Loading"}
      className={cn(
        layout === "column"
          ? "flex flex-col items-center gap-sm"
          : "inline-flex items-center gap-sm",
        className,
      )}
    >
      {dots}
      {label && (
        <span className="font-ui-label text-ui-label text-text-muted">
          {label}
        </span>
      )}
    </div>
  );
}
