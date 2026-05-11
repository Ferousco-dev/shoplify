import { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  fill?: string;
  variant?: "a" | "b" | "c";
};

/**
 * Soft organic blob shape. Three preset paths so multiple instances on the
 * same page look distinct rather than stamped. Use absolute positioning + a
 * blur class on the wrapper for the dreamy background effect, or unblurred
 * inline for crisper decorative use.
 */
export function OrganicBlob({
  className,
  fill = "#8faf8a",
  variant = "a",
  ...rest
}: Props) {
  const paths = {
    a: "M 60 10 C 90 10, 120 25, 130 60 C 138 90, 115 130, 75 135 C 35 138, 5 115, 8 75 C 12 38, 30 12, 60 10 Z",
    b: "M 70 8 C 105 12, 135 35, 132 75 C 130 110, 95 138, 60 132 C 28 126, 6 95, 12 60 C 18 28, 38 5, 70 8 Z",
    c: "M 50 12 C 90 8, 130 30, 130 70 C 130 110, 95 135, 55 130 C 18 125, 8 88, 18 55 C 25 32, 32 14, 50 12 Z",
  };
  return (
    <svg
      viewBox="0 0 140 140"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...rest}
    >
      <path d={paths[variant]} fill={fill} />
    </svg>
  );
}
