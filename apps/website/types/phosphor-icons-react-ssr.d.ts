import type { SVGProps } from "react";

declare module "@phosphor-icons/react/dist/lib/types" {
	interface IconProps {
		className?: SVGProps<SVGSVGElement>["className"];
		role?: SVGProps<SVGSVGElement>["role"];
	}
}
