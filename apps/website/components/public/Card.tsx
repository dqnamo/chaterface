import { cn } from "@/helpers/classname-helper";

export default function Card({
	children,
	layer: _layer,
	...props
}: {
	children: React.ReactNode;
	layer?: number;
} & React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col bg-grayscale-2 border border-grayscale-3 rounded-xl p-1.5",
				props.className,
			)}
		>
			{children}
		</div>
	);
}
