import { SVGProps } from "react";

/**
 * Alivio Plus logomark — a soft "spoon-leaf" form. Stylised so it reads as
 * both a spoon (spoonie-themed) and a leaf bud (the wellness/plant-care side).
 * Drawn on a 40x40 viewBox so it scales cleanly next to the wordmark.
 */
export function AlivioMark({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Soft circular background pad */}
      <circle cx="20" cy="20" r="19" fill="#caecc3" opacity="0.6" />
      {/* Leaf body — sage primary */}
      <path
        d="M20 6
           C 12 6, 8 13, 8 19
           C 8 26, 13 32, 20 33
           C 27 32, 32 26, 32 19
           C 32 13, 28 6, 20 6 Z"
        fill="#8faf8a"
      />
      {/* Leaf inner curve / spine — primary darker */}
      <path
        d="M20 8
           C 16 11, 14 16, 14 22
           C 14 27, 17 31, 20 32"
        stroke="#486646"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Highlight bud at top — cream */}
      <ellipse cx="22" cy="11" rx="3" ry="2" fill="#FCF6E8" opacity="0.7" />
    </svg>
  );
}
