"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Pill shapes + Alivio brand tokens. Touch targets meet WCAG 44px minimum
// at sizes md and lg.
const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:opacity-90 shadow-sm hover:translate-y-[-1px] active:translate-y-0",
  secondary:
    "bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary/5",
  ghost: "bg-transparent text-text-muted hover:text-primary hover:bg-surface-variant/40",
  danger: "bg-error text-on-error hover:opacity-90 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-md text-xs",
  md: "h-11 px-lg text-sm",
  lg: "h-12 px-xl text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-xs rounded-full font-ui-label font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
