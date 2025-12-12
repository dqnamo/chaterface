import React from "react";

/**
 * PiSidebarDefaultSolid icon from the solid style in general category.
 */
interface PiSidebarDefaultSolidProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiSidebarDefaultSolid({
  size = 24,
  color,
  className,
  ariaLabel = "sidebar-default icon",
  ...props
}: PiSidebarDefaultSolidProps) {
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
        d="M18.72 2.65a6 6 0 0 0-2.35-.58q-1.3-.09-3.33-.07H11l-2 .01c-1.54.03-2.71.13-3.71.64a6 6 0 0 0-2.63 2.63 6 6 0 0 0-.58 2.35C2 8.51 2 9.6 2 10.96v2.08c0 1.37 0 2.45.07 3.33.07.9.23 1.65.58 2.35a6 6 0 0 0 2.63 2.63c1 .5 2.17.6 3.7.64L11 22h2.05c1.37 0 2.45 0 3.33-.07.9-.07 1.65-.23 2.35-.58a6 6 0 0 0 2.63-2.63c.35-.7.5-1.46.58-2.35.07-.88.07-1.96.07-3.33v-2.08c0-1.37 0-2.45-.07-3.33a6 6 0 0 0-.58-2.35 6 6 0 0 0-2.63-2.63M13 4c1.42 0 2.42 0 3.2.06.77.07 1.25.19 1.62.38a4 4 0 0 1 1.74 1.74c.2.37.31.85.38 1.62.06.78.06 1.78.06 3.2v2c0 1.42 0 2.42-.06 3.2a4 4 0 0 1-.38 1.62 4 4 0 0 1-1.74 1.74c-.37.2-.85.31-1.62.38-.78.06-1.78.06-3.2.06h-3V4z"
        stroke="none"
      />
    </svg>
  );
}
