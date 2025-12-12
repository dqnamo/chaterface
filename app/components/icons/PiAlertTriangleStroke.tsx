import React from "react";

/**
 * PiAlertTriangleStroke icon from the stroke style in alerts category.
 */
interface PiAlertTriangleStrokeProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiAlertTriangleStroke({
  size = 24,
  className,
  ariaLabel = "alert-triangle icon",
  ...props
}: PiAlertTriangleStrokeProps) {
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
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 13V9m-1.39-5.72c.89-.37 1.9-.37 2.78 0 2.65 1.13 8.91 11.14 8.73 13.82a3.6 3.6 0 0 1-1.42 2.64c-2.22 1.68-15.18 1.68-17.4 0a3.6 3.6 0 0 1-1.42-2.64C1.7 14.42 7.96 4.4 10.6 3.28"
        fill="none"
      />
    </svg>
  );
}
