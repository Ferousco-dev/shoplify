import { SVGProps } from "react";

/**
 * Decorative success badge — sage circle with a check mark, framed by two
 * leaf sprouts and a few sparkles. Used at the top of the publish
 * confirmation page. Matches the "Soft Hours at Home" mood: warm, organic,
 * not screaming "VICTORY".
 */
export function SuccessBadge({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Soft sage halo behind the badge */}
      <circle cx="120" cy="100" r="58" fill="#caecc3" opacity="0.7" />

      {/* Inner sage ring */}
      <circle
        cx="120"
        cy="100"
        r="48"
        fill="#FDFAF4"
        stroke="#8faf8a"
        strokeWidth="2"
        opacity="0.9"
      />

      {/* Check mark */}
      <path
        d="M 100 102
           L 116 118
           L 142 86"
        stroke="#486646"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left leaf cluster (above-left of badge) */}
      <g transform="translate(54 36)">
        <path
          d="M 8 24
             C 6 14, 14 4, 24 4
             C 32 6, 38 16, 32 26
             C 28 30, 14 32, 8 24 Z"
          fill="#8faf8a"
          opacity="0.85"
        />
        <path
          d="M 14 22
             C 18 18, 22 14, 28 12"
          stroke="#486646"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </g>

      {/* Right leaf cluster (above-right of badge) */}
      <g transform="translate(168 28)">
        <path
          d="M 14 4
             C 22 4, 30 12, 28 22
             C 26 28, 18 32, 10 28
             C 4 24, 4 12, 14 4 Z"
          fill="#aecfa8"
          opacity="0.85"
        />
        <path
          d="M 18 8
             C 16 14, 14 20, 12 26"
          stroke="#486646"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
        {/* Tiny stem coming off the right side */}
        <path
          d="M 28 14
             C 36 16, 42 22, 44 30"
          stroke="#8faf8a"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
      </g>

      {/* Sparkles — bottom-left of badge */}
      <g fill="#486646" opacity="0.6">
        {/* 4-point star sparkle */}
        <path
          d="M 60 138
             L 64 142
             L 68 138
             L 64 134 Z"
        />
        <path
          d="M 60 138
             L 60 130
             M 60 138
             L 60 146
             M 60 138
             L 52 138
             M 60 138
             L 68 138"
          stroke="#486646"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="48" cy="158" r="2" />
        <circle cx="78" cy="148" r="1.5" opacity="0.4" />
      </g>

      {/* Sparkles — top-right small */}
      <g fill="#7f5160" opacity="0.45">
        <circle cx="200" cy="64" r="2" />
        <circle cx="208" cy="78" r="1.4" />
      </g>
    </svg>
  );
}
