"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";

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
				"group relative flex flex-row items-center gap-2 rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs font-medium text-grayscale-11 transition-colors duration-150 hover:border-grayscale-7 hover:bg-grayscale-2 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
		>
			<SignOutIcon weight="bold" className="size-4 shrink-0" />
			<span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
		</button>
	);
}
