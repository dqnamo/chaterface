import { cn } from "@/helpers/classname-helper";

type LogoProps = {
	className?: string;
};

export default function Logo({ className }: LogoProps) {
	return (
		<svg
			aria-label="Chaterface logomark"
			className={cn("block size-10 shrink-0 text-accent-9", className)}
			fill="none"
			role="img"
			viewBox="0 0 629 654"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M495 326.956H445.873V386.499C445.873 462.871 403.085 509.802 330.803 509.802V144.154C378.786 144.154 413.782 164.807 431.831 201.06L433.767 204.971L495 326.956Z"
				className="fill-current"
			/>
			<path
				d="M330.803 581.956C210.099 581.956 135 511.911 135 385.136V268.864C135 141.342 210.099 72 330.803 72V144.154C258.522 144.154 215.734 191.085 215.734 267.458V386.542C215.734 462.915 258.522 509.846 330.803 509.846V582V581.956Z"
				className="fill-current"
			/>
		</svg>
	);
}
