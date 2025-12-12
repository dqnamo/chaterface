import React from "react";

/**
 * PiUserSettingsSolid icon from the solid style in users category.
 */
interface PiUserSettingsSolidProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PiUserSettingsSolid({
  size = 24,
  color,
  className,
  ariaLabel = "user-settings icon",
  ...props
}: PiUserSettingsSolidProps) {
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
        d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10M8 14a5 5 0 0 0-5 5 3 3 0 0 0 3 3h6.4a3 3 0 0 1-.23-1.14v-.44l-.31-.32a3 3 0 0 1 0-4.2l.3-.32.01-.44a3 3 0 0 1 .24-1.14zm10 3a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2z"
        stroke="none"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M18.7 13.29a1 1 0 0 0-1.4 0l-.9.87-1.24.01a1 1 0 0 0-.99 1l-.01 1.24-.87.89a1 1 0 0 0 0 1.4l.87.9.01 1.24a1 1 0 0 0 1 .99l1.24.01.89.87a1 1 0 0 0 1.4 0l.9-.87 1.24-.01a1 1 0 0 0 .99-1l.01-1.24.87-.89a1 1 0 0 0 0-1.4l-.87-.9-.01-1.24a1 1 0 0 0-1-.99l-1.24-.01zm-1.18 2.58.48-.47.48.47a1 1 0 0 0 .69.28l.67.01v.67q0 .4.3.7l.46.47-.47.48a1 1 0 0 0-.28.69l-.01.67h-.67a1 1 0 0 0-.7.3l-.47.46-.48-.47a1 1 0 0 0-.69-.28l-.67-.01v-.67a1 1 0 0 0-.3-.7L15.4 18l.47-.48a1 1 0 0 0 .28-.69l.01-.67h.67a1 1 0 0 0 .7-.3"
        clipRule="evenodd"
        stroke="none"
      />
    </svg>
  );
}
