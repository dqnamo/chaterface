"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import db from "@repo/db/client";
import { useState } from "react";
import { cn } from "@/helpers/classname-helper";
import CornerBrackets from "./CornerBrackets";

type SignOutButtonProps = {
	className?: string;
};

export default function SignOutButton({ className }: SignOutButtonProps) {
	const [isSigningOut, setIsSigningOut] = useState(false);

	const signOut = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await db.auth.signOut();
		} catch (error) {
			console.error("Failed to sign out", {
				error: error instanceof Error ? error.message : String(error),
			});
			setIsSigningOut(false);
		}
	};

	return (
		<button
			type="button"
			disabled={isSigningOut}
			onClick={() => {
				void signOut();
			}}
			className={cn(
				"group relative flex flex-row items-center gap-2 bg-grayscale-2 px-2 py-1.5 text-xs font-medium text-grayscale-11 transition-colors duration-150 hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
		>
			<CornerBrackets placement="inside" color="grayscale-8" size={6} />
			<SignOutIcon weight="bold" className="size-4 shrink-0" />
			<span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
		</button>
	);
}
