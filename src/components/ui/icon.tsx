"use client";

import { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  style?: CSSProperties;
};

export function Icon({
  name,
  className,
  filled = false,
  size = 24,
  weight = 400,
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined select-none", filled && "filled", className)}
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
