import { cn } from "@/helpers/classname-helper";

type ButtonSharedProps = {
	variant?: "primary" | "secondary";
	className?: string;
	children: React.ReactNode;
	shortcut?: string;
};

type ButtonProps =
	| (ButtonSharedProps & React.ComponentPropsWithoutRef<"button">)
	| (ButtonSharedProps &
			React.ComponentPropsWithoutRef<"a"> & {
				href: string;
			});

export default function Button(props: ButtonProps) {
	const { variant = "primary", className } = props;
	const baseClasses =
		"group relative flex h-8 min-w-0 cursor-pointer flex-row items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 text-grayscale-11 [&>svg]:shrink-0";

	const variantClasses = {
		primary:
			"border-grayscale-12 bg-grayscale-12 text-grayscale-1 hover:border-grayscale-11 hover:bg-grayscale-11",
		secondary:
			"border-grayscale-4 bg-grayscale-1 text-grayscale-12 hover:border-grayscale-5 hover:bg-grayscale-2",
	};

	const shortcutClasses =
		"hidden min-h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1.5 py-1 font-mono text-[11px] font-medium leading-none uppercase transition-colors sm:inline-flex";
	const shortcutVariantClasses = {
		primary:
			"border-grayscale-11 bg-grayscale-11 text-grayscale-1 hover:bg-grayscale-11 hover:text-grayscale-1 group-hover:bg-grayscale-11 group-hover:text-grayscale-1",
		secondary:
			"border-grayscale-4 bg-grayscale-2 text-grayscale-11 hover:bg-grayscale-3 group-hover:bg-grayscale-3 group-hover:text-grayscale-12",
	};

	const classes = cn(
		baseClasses,
		variantClasses[variant],
		props.shortcut ? "pr-1.5" : "",
		className,
	);

	if ("href" in props) {
		const {
			variant: _variant,
			className: _className,
			children,
			shortcut,
			...anchorProps
		} = props;

		return (
			<a className={classes} {...anchorProps}>
				{children}
				{shortcut && (
					<span
						className={cn(shortcutClasses, shortcutVariantClasses[variant])}
					>
						{shortcut}
					</span>
				)}
			</a>
		);
	}

	const {
		variant: _variant,
		className: _className,
		children,
		shortcut,
		...buttonProps
	} = props;

	return (
		<button className={classes} {...buttonProps}>
			{children}
			{shortcut && (
				<span className={cn(shortcutClasses, shortcutVariantClasses[variant])}>
					{shortcut}
				</span>
			)}
		</button>
	);
}
