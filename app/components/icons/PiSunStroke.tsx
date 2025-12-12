import React from "react";

/**
 * PiSunStroke icon from the stroke style in weather category.
 */
interface PiSunStrokeProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiSunStroke({
  size = 24,
  className,
  ariaLabel = "sun icon",
  ...props
}: PiSunStrokeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <g clipPath="url(#a)" fill="none">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 23v-1m-7.78-2.22.7-.7M1 12h1m2.22-7.78.7.7M12 2V1m7.07 3.93.7-.7M22 12h1m-3.93 7.07.7.7M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0"
          fill="none"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path d="M0 0h24v24H0z" fill="none" />
        </clipPath>
      </defs>
    </svg>
  );
}
