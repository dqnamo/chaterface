import React from "react";

/**
 * PiStopFill icon.
 */
interface PiStopFillProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiStopFill({
  size = 24,
  className,
  ariaLabel = "stop icon",
  ...props
}: PiStopFillProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
        fill="currentColor"
      />
    </svg>
  );
}

