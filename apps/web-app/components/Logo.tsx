type LogoProps = {
	size?: number;
};

export default function Logo({ size = 4 }: LogoProps) {
	const dimension = size * 3.5;

	return (
		<svg
			aria-hidden="true"
			className="block shrink-0 text-accent-9"
			fill="none"
			height={dimension}
			viewBox="0 0 629 654"
			width={dimension}
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
