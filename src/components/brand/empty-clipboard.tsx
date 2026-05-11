import { SVGProps } from "react";

/**
 * Empty-state illustration — line-art clipboard with a tiny plant on top.
 * Calm, hand-drawn feel using soft sage stroke. Used wherever we have
 * "Nothing here yet" copy (dashboard, jobs list, products list).
 */
export function EmptyClipboard({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Plant — leaves */}
      <path
        d="M105 35
           C 95 25, 80 25, 75 38
           C 75 50, 90 55, 100 50"
        stroke="#8faf8a"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="#caecc3"
        fillOpacity="0.5"
      />
      <path
        d="M100 38
           C 110 28, 125 30, 128 42
           C 128 53, 115 58, 105 52"
        stroke="#486646"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="#8faf8a"
        fillOpacity="0.4"
      />
      {/* Plant stem */}
      <path
        d="M100 50 L 100 70"
        stroke="#486646"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Pot */}
      <path
        d="M88 70 L 112 70 L 108 86 L 92 86 Z"
        fill="#eadeca"
        stroke="#7A7167"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Clipboard top clip */}
      <rect
        x="92"
        y="86"
        width="16"
        height="8"
        rx="2"
        fill="#7A7167"
      />

      {/* Clipboard body */}
      <rect
        x="55"
        y="92"
        width="90"
        height="80"
        rx="6"
        fill="#FDFAF4"
        stroke="#7A7167"
        strokeWidth="2"
      />

      {/* Lines on clipboard — empty rows */}
      <g stroke="#DDD4C0" strokeWidth="2" strokeLinecap="round">
        <line x1="68" y1="112" x2="132" y2="112" />
        <line x1="68" y1="128" x2="120" y2="128" />
        <line x1="68" y1="144" x2="125" y2="144" />
        <line x1="68" y1="160" x2="115" y2="160" />
      </g>

      {/* Tiny soft shadow under clipboard */}
      <ellipse
        cx="100"
        cy="180"
        rx="55"
        ry="4"
        fill="#7A7167"
        opacity="0.12"
      />
    </svg>
  );
}
