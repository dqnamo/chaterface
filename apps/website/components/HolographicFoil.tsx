"use client";

import {
	type ComponentPropsWithoutRef,
	type CSSProperties,
	useEffect,
	useRef,
} from "react";
import { cn } from "@/helpers/classname-helper";
import styles from "./HolographicFoil.module.css";

type HolographicFoilStyle = CSSProperties & {
	"--foil-shift": string;
	"--foil-y-shift": string;
	"--foil-x": string;
	"--foil-y": string;
	"--glare-x": string;
	"--glare-y": string;
	"--pointer-x": string;
	"--pointer-y": string;
	"--shine-angle": string;
	"--shine-opacity": string;
};

type HolographicFoilProps = ComponentPropsWithoutRef<"div">;

const initialStyle: HolographicFoilStyle = {
	"--foil-shift": "0%",
	"--foil-y-shift": "0%",
	"--foil-x": "50%",
	"--foil-y": "50%",
	"--glare-x": "50%",
	"--glare-y": "50%",
	"--pointer-x": "50%",
	"--pointer-y": "50%",
	"--shine-angle": "135deg",
	"--shine-opacity": "0.62",
};

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function HolographicFoil({
	children,
	className,
	style,
	...props
}: HolographicFoilProps) {
	const foilRef = useRef<HTMLDivElement>(null);
	const frameRef = useRef<number | null>(null);
	const pointerRef = useRef({ x: 0.5, y: 0.5 });

	useEffect(() => {
		const foil = foilRef.current;

		if (!foil) {
			return;
		}

		const applyEffect = () => {
			const { x, y } = pointerRef.current;
			const rect = foil.getBoundingClientRect();
			const visibleScrollRange = window.innerHeight + rect.height;
			const scrollProgress =
				visibleScrollRange > 0
					? clamp((window.innerHeight - rect.top) / visibleScrollRange, 0, 1)
					: 0;

			foil.style.setProperty("--pointer-x", `${x * 100}%`);
			foil.style.setProperty("--pointer-y", `${y * 100}%`);
			foil.style.setProperty("--foil-x", `${44 + x * 12}%`);
			foil.style.setProperty("--foil-y", `${44 + y * 12}%`);
			foil.style.setProperty(
				"--foil-shift",
				`${scrollProgress * 82 + (x - 0.5) * 18}%`,
			);
			foil.style.setProperty(
				"--foil-y-shift",
				`${scrollProgress * 28 + (y - 0.5) * 12}%`,
			);
			foil.style.setProperty("--glare-x", `${x * 100}%`);
			foil.style.setProperty("--glare-y", `${y * 100}%`);
			foil.style.setProperty(
				"--shine-angle",
				`${105 + scrollProgress * 80 + (x - 0.5) * 28}deg`,
			);
			foil.style.setProperty(
				"--shine-opacity",
				`${0.56 + Math.abs(x - 0.5) * 0.24 + scrollProgress * 0.12}`,
			);

			frameRef.current = null;
		};

		const scheduleEffect = () => {
			if (frameRef.current !== null) {
				return;
			}

			frameRef.current = window.requestAnimationFrame(applyEffect);
		};

		const handlePointerMove = (event: PointerEvent) => {
			pointerRef.current = {
				x: clamp(event.clientX / window.innerWidth, 0, 1),
				y: clamp(event.clientY / window.innerHeight, 0, 1),
			};

			scheduleEffect();
		};

		const handleScroll = () => {
			scheduleEffect();
		};

		window.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("scroll", handleScroll, { passive: true });
		scheduleEffect();

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("scroll", handleScroll);

			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current);
			}
		};
	}, []);

	return (
		<div
			{...props}
			ref={foilRef}
			className={cn(styles.surface, className)}
			style={{ ...initialStyle, ...style }}
		>
			<span aria-hidden className={styles.foil} />
			<span aria-hidden className={styles.film} />
			<span aria-hidden className={styles.pearl} />
			<div className={styles.content}>{children}</div>
			<span aria-hidden className={styles.shine} />
			<span aria-hidden className={styles.glare} />
		</div>
	);
}
