"use client";

import {
	type CSSProperties,
	memo,
	type PointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/helpers/classname-helper";

interface PixelTrailProps {
	pixelSize?: number;
	pixelGap?: number;
	fadeDuration?: number;
	delay?: number;
	className?: string;
	pixelClassName?: string;
}

type Dimensions = {
	height: number;
	width: number;
};

type PixelElement = HTMLDivElement & {
	animatePixel?: () => void;
};

export default function PixelTrail({
	pixelSize = 28,
	pixelGap = 4,
	fadeDuration = 650,
	delay = 0,
	className,
	pixelClassName,
}: PixelTrailProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const dimensions = useDimensions(containerRef);
	const trailId = useId().replaceAll(":", "");

	const columns = useMemo(
		() => Math.ceil(dimensions.width / pixelSize),
		[dimensions.width, pixelSize],
	);
	const rows = useMemo(
		() => Math.ceil(dimensions.height / pixelSize),
		[dimensions.height, pixelSize],
	);
	const rowKeys = useMemo(
		() => Array.from({ length: rows }, (_, rowIndex) => `row-${rowIndex}`),
		[rows],
	);
	const columnKeys = useMemo(
		() =>
			Array.from(
				{ length: columns },
				(_, columnIndex) => `column-${columnIndex}`,
			),
		[columns],
	);

	const handlePointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			if (!containerRef.current) {
				return;
			}

			const rect = containerRef.current.getBoundingClientRect();
			const x = Math.floor((event.clientX - rect.left) / pixelSize);
			const y = Math.floor((event.clientY - rect.top) / pixelSize);
			const pixelElement = document.getElementById(
				`${trailId}-pixel-${x}-${y}`,
			) as PixelElement | null;

			pixelElement?.animatePixel?.();
		},
		[pixelSize, trailId],
	);

	return (
		<div
			aria-hidden="true"
			className={cn("absolute inset-0 h-full w-full", className)}
			onPointerMove={handlePointerMove}
			ref={containerRef}
		>
			{rowKeys.map((rowKey, rowIndex) => (
				<div className="flex" key={rowKey}>
					{columnKeys.map((columnKey, columnIndex) => (
						<PixelDot
							className={pixelClassName}
							delay={delay}
							fadeDuration={fadeDuration}
							gap={pixelGap}
							id={`${trailId}-pixel-${columnIndex}-${rowIndex}`}
							key={`${columnKey}-${rowKey}`}
							size={pixelSize}
						/>
					))}
				</div>
			))}
		</div>
	);
}

function useDimensions(ref: RefObject<HTMLElement | null>) {
	const [dimensions, setDimensions] = useState<Dimensions>({
		height: 0,
		width: 0,
	});

	useEffect(() => {
		if (!ref.current) {
			return;
		}

		const element = ref.current;
		const updateDimensions = () => {
			const rect = element.getBoundingClientRect();
			setDimensions({
				height: rect.height,
				width: rect.width,
			});
		};

		updateDimensions();

		const resizeObserver = new ResizeObserver(updateDimensions);
		resizeObserver.observe(element);

		return () => {
			resizeObserver.disconnect();
		};
	}, [ref]);

	return dimensions;
}

interface PixelDotProps {
	id: string;
	size: number;
	gap: number;
	fadeDuration: number;
	delay: number;
	className?: string;
}

const PixelDot = memo(function PixelDot({
	id,
	size,
	gap,
	fadeDuration,
	delay,
	className,
}: PixelDotProps) {
	const animatePixel = useCallback(
		(node: PixelElement) => {
			node.style.transition = "none";
			node.style.opacity = "1";
			void node.offsetWidth;
			node.style.transition = `opacity ${fadeDuration}ms ease-out ${delay}ms`;
			node.style.opacity = "0";
		},
		[fadeDuration, delay],
	);

	const ref = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) {
				return;
			}

			const pixelElement = node as PixelElement;
			pixelElement.animatePixel = () => animatePixel(pixelElement);
		},
		[animatePixel],
	);

	const inset = gap / 2;
	const cellStyle: CSSProperties = {
		height: `${size}px`,
		width: `${size}px`,
	};
	const pixelStyle: CSSProperties = {
		inset: `${inset}px`,
	};

	return (
		<div className="relative" style={cellStyle}>
			<div
				className={cn("absolute opacity-0", className)}
				id={id}
				ref={ref}
				style={pixelStyle}
			/>
		</div>
	);
});
