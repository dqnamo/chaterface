const LOGO_PATTERN = [
	false,
	true,
	true,
	true,
	false,
	false,
	false,
	true,
	false,
	true,
	false,
	false,
];
const LOGO_KEYS = LOGO_PATTERN.map(
	(_cell, index) => `factoryplane-logo-cell-${index}`,
);

type LogoProps = {
	size?: number;
};

export default function Logo({ size = 4 }: LogoProps) {
	const cellStyle = {
		width: size,
		height: size,
		borderRadius: Math.max(1, size * 0.2),
	};

	return (
		<div
			className="grid w-max grid-cols-3"
			style={{ gap: Math.max(1, size * 0.25) }}
			aria-hidden="true"
		>
			{LOGO_PATTERN.map((isFilled, index) => (
				<div
					key={LOGO_KEYS[index]}
					className={isFilled ? "bg-accent-9" : "bg-transparent"}
					style={cellStyle}
				/>
			))}
		</div>
	);
}
