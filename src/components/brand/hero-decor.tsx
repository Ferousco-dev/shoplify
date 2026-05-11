import { SVGProps } from "react";

/**
 * Dashboard hero decorative illustration. Soft Hours at Home aesthetic —
 * flowing organic shapes in sage/sand/rose with a sun-like motif suggesting
 * "calm afternoon". Sits in the hero's right column on >=lg screens. Very
 * intentionally not a literal "product photo" — it's mood, not content.
 */
export function HeroDecor({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      {...rest}
    >
      <defs>
        <linearGradient id="hero-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCF6E8" />
          <stop offset="100%" stopColor="#eadeca" />
        </linearGradient>
        <linearGradient id="hero-sage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#caecc3" />
          <stop offset="100%" stopColor="#8faf8a" />
        </linearGradient>
        <linearGradient id="hero-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0b7c8" />
          <stop offset="100%" stopColor="#ce98a8" />
        </linearGradient>
      </defs>

      {/* Background warm wash */}
      <rect width="480" height="480" fill="url(#hero-warm)" />

      {/* Sun / soft circle, low afternoon */}
      <circle cx="350" cy="180" r="90" fill="#fff9eb" />
      <circle cx="350" cy="180" r="90" stroke="#caecc3" strokeWidth="2" opacity="0.4" />

      {/* Rolling sage hill — back layer */}
      <path
        d="M0 360
           C 80 320, 160 340, 240 330
           C 320 320, 400 350, 480 330
           L 480 480 L 0 480 Z"
        fill="url(#hero-sage)"
        opacity="0.55"
      />

      {/* Rolling sand hill — mid layer */}
      <path
        d="M0 400
           C 100 370, 180 390, 280 380
           C 360 372, 420 400, 480 388
           L 480 480 L 0 480 Z"
        fill="#eadeca"
      />

      {/* Foreground leaf cluster — bottom-left */}
      <g opacity="0.85">
        <path
          d="M40 440
             C 30 410, 50 380, 80 380
             C 110 380, 130 410, 120 440
             Z"
          fill="#8faf8a"
        />
        <path
          d="M55 425
             C 60 405, 80 395, 95 410"
          stroke="#486646"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </g>

      {/* Soft rose blob — top-left, blurred-feel */}
      <ellipse
        cx="100"
        cy="120"
        rx="80"
        ry="60"
        fill="url(#hero-rose)"
        opacity="0.45"
      />

      {/* Floating organic shape — center, brand mark accent */}
      <path
        d="M220 250
           C 200 220, 220 190, 250 195
           C 280 200, 290 235, 270 260
           C 260 275, 235 270, 220 250 Z"
        fill="#caecc3"
        opacity="0.7"
      />
      <path
        d="M235 215
           C 240 235, 250 250, 265 250"
        stroke="#486646"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Tiny stars / light specks */}
      <g fill="#486646" opacity="0.35">
        <circle cx="180" cy="80" r="2" />
        <circle cx="420" cy="60" r="1.5" />
        <circle cx="140" cy="200" r="1.5" />
        <circle cx="400" cy="290" r="2" />
      </g>
    </svg>
  );
}
