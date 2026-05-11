import Image from "next/image";
import { cn } from "@/lib/cn";

type Props = {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Width/height in pixels for next/image — must be exact for the optimizer.
const SIZES: Record<Required<Props>["size"], { class: string; px: number }> = {
  sm: { class: "w-10 h-10 rounded-lg", px: 40 },
  md: { class: "w-14 h-14 rounded-xl", px: 56 },
  lg: { class: "w-20 h-20 rounded-2xl", px: 80 },
};

/**
 * Rectangular product image used in tables/queues. Uses `next/image` so
 * Supabase storage images go through Next.js's optimizer (auto WebP +
 * proper width-based variants). When `src` is missing the brand-aware
 * fallback shows: cream (#FCF6E8) tint, soft sage gradient, and a tiny
 * SVG sprout that matches the rest of the Alivio language.
 */
export function ProductThumbnail({ src, alt, size = "sm", className }: Props) {
  const { class: sizeClass, px } = SIZES[size];

  if (src) {
    return (
      <div className={cn("relative overflow-hidden flex-shrink-0 bg-surface-variant", sizeClass, className)}>
        <Image
          src={src}
          alt={alt}
          width={px}
          height={px}
          loading="lazy"
          sizes={`${px}px`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex-shrink-0 overflow-hidden flex items-center justify-center",
        sizeClass,
        className,
      )}
      role="img"
      aria-label={alt || "Awaiting generated image"}
    >
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`pt-grad-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FCF6E8" />
            <stop offset="100%" stopColor="#eadeca" />
          </linearGradient>
        </defs>
        <rect width="60" height="60" fill={`url(#pt-grad-${size})`} />
        {/* sage soft circle */}
        <circle cx="42" cy="22" r="11" fill="#caecc3" opacity="0.55" />
        {/* simple sprout silhouette */}
        <path
          d="M24 44
             C 20 36, 24 28, 30 26
             C 36 28, 40 36, 36 44 Z"
          fill="#8faf8a"
          opacity="0.85"
        />
        <path
          d="M30 26 L 30 44"
          stroke="#486646"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
