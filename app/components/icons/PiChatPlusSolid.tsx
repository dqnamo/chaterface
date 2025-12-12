import React from "react";

/**
 * PiChatPlusSolid icon from the solid style in communication category.
 */
interface PiChatPlusSolidProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiChatPlusSolid({
  size = 24,
  className,
  ariaLabel = "chat-plus icon",
  ...props
}: PiChatPlusSolidProps) {
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
        fillRule="evenodd"
        d="M2 12a10 10 0 1 1 8.59 9.9l-1.86-.25H8.7l-.01-.01-.14-.01h-.2c-.12 0-.26 0-.64.04l-2.2.15q-.6.05-1.04.05a2.4 2.4 0 0 1-1.02-.2 2.4 2.4 0 0 1-1.12-1.12 2.4 2.4 0 0 1-.2-1.02q0-.45.05-1.05l.15-2.19.04-.64v-.2l-.01-.14v-.04l-.07-.49-.2-1.37Q2 12.72 2 12m11-3a1 1 0 1 0-2 0v2H9a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-2z"
        clipRule="evenodd"
        stroke="none"
      />
    </svg>
  );
}
