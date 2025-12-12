import React from "react";

/**
 * PiSendPlaneSlantSolid icon from the solid style in communication category.
 */
interface PiSendPlaneSlantSolidProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiSendPlaneSlantSolid({
  size = 24,
  className,
  ariaLabel = "send-plane-slant icon",
  ...props
}: PiSendPlaneSlantSolidProps) {
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
      <path
        fill="currentColor"
        d="M18.53 2c.83-.04 1.77.12 2.56.9.8.8.95 1.74.9 2.57-.04.57-.19 1.2-.3 1.68q-.07.23-.1.42a52 52 0 0 1-4.6 12.8 3.02 3.02 0 0 1-5.34.05l-2-3.65a1 1 0 0 1 .18-1.19l3.72-3.72a1 1 0 0 0-1.4-1.41l-3.73 3.72a1 1 0 0 1-1.19.17l-3.65-1.99a3.02 3.02 0 0 1 .05-5.34 52 52 0 0 1 13.22-4.7c.49-.11 1.11-.26 1.68-.3"
        stroke="none"
      />
    </svg>
  );
}
