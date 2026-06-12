"use client";

import db from "@repo/db/client";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/Button";
import CornerCubes from "@/components/CornerCubes";
import { Input } from "@/components/Input";
import Logo from "@/components/Logo";

type AuthGateProps = {
	children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
	const { isLoading, user, error: authError } = db.useAuth();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const trimmedEmail = email.trim();
	const trimmedCode = code.trim();
	const canSubmit =
		trimmedEmail.length > 0 && (!isCodeSent || trimmedCode.length > 0);

	const sendMagicCode = async () => {
		setError(undefined);
		setIsSubmitting(true);

		try {
			await db.auth.sendMagicCode({ email: trimmedEmail });
			setIsCodeSent(true);
		} catch (error) {
			setError(getErrorMessage(error, "Failed to send magic code"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const signInWithMagicCode = async () => {
		setError(undefined);
		setIsSubmitting(true);

		try {
			await db.auth.signInWithMagicCode({
				email: trimmedEmail,
				code: trimmedCode,
			});
		} catch (error) {
			setError(getErrorMessage(error, "Failed to verify magic code"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const submitAuth = () => {
		if (isSubmitting || !canSubmit) {
			return;
		}

		if (isCodeSent) {
			void signInWithMagicCode();
			return;
		}

		void sendMagicCode();
	};

	if (isLoading) {
		return (
			<AuthShell>
				<div className="flex flex-col items-center gap-4">
					<Logo size={6} />
					<p className="text-sm text-grayscale-11">Loading Factoryplane...</p>
				</div>
			</AuthShell>
		);
	}

	if (authError) {
		return (
			<AuthShell>
				<div className="flex flex-col items-center gap-4">
					<Logo size={6} />
					<div className="flex max-w-md flex-col items-center gap-1 text-center">
						<h1 className="text-lg font-medium text-grayscale-12">
							Unable to authenticate
						</h1>
						<p className="text-sm text-red-11">{authError.message}</p>
					</div>
				</div>
			</AuthShell>
		);
	}

	if (user) {
		return children;
	}

	return (
		<AuthShell>
			<Logo size={6} />
			<div className="flex flex-col items-center justify-center gap-px text-center">
				<h1 className="text-lg font-medium text-grayscale-12">
					Sign in to Factoryplane
				</h1>
				<p className="text-sm text-grayscale-11">
					Enter your email to receive a magic code.
				</p>
			</div>
			<form
				className="relative flex w-full max-w-md flex-col border border-grayscale-4 bg-grayscale-1"
				onSubmit={(event) => {
					event.preventDefault();
					submitAuth();
				}}
			>
				<CornerCubes
					placement="outside"
					spacing={3}
					translate={12}
					size={6}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="flex flex-col gap-3 p-3">
					<div className="flex flex-col">
						<p className="text-xs text-grayscale-11">Email</p>
						<p className="text-xs text-grayscale-10">
							Where your sign-in code will be sent.
						</p>
					</div>
					<Input
						type="email"
						required
						autoComplete="email"
						className="text-sm"
						placeholder="you@example.com"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						disabled={isSubmitting || isCodeSent}
					/>
				</div>

				{isCodeSent ? (
					<div className="flex flex-col gap-3 p-3">
						<div className="flex flex-col">
							<p className="text-xs text-grayscale-11">Magic code</p>
							<p className="text-xs text-grayscale-10">
								Enter the code sent to {trimmedEmail}.
							</p>
						</div>
						<Input
							type="text"
							required
							autoComplete="one-time-code"
							className="text-sm"
							placeholder="Magic code"
							value={code}
							onChange={(event) => setCode(event.target.value)}
							disabled={isSubmitting}
						/>
					</div>
				) : null}

				{error ? (
					<div className="px-3 pb-3">
						<p className="border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
							{error}
						</p>
					</div>
				) : null}

				<div className="flex flex-row items-center justify-between gap-3 p-3">
					{isCodeSent ? (
						<button
							type="button"
							className="text-xs text-grayscale-10 transition-colors hover:text-grayscale-12"
							disabled={isSubmitting}
							onClick={() => {
								setIsCodeSent(false);
								setCode("");
								setError(undefined);
							}}
						>
							Use a different email
						</button>
					) : (
						<span />
					)}
					<Button
						type="submit"
						disabled={isSubmitting || !canSubmit}
						className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
					>
						{isSubmitting
							? "Submitting..."
							: isCodeSent
								? "Verify code"
								: "Send code"}
					</Button>
				</div>
			</form>
		</AuthShell>
	);
}

function AuthShell({ children }: { children: ReactNode }) {
	return (
		<main className="flex h-full w-full flex-col items-center justify-center gap-4 px-4">
			{children}
		</main>
	);
}

const getErrorMessage = (error: unknown, fallback: string) => {
	if (isRecord(error)) {
		const body = error.body;

		if (isRecord(body) && typeof body.message === "string") {
			return body.message;
		}

		if (typeof error.message === "string") {
			return error.message;
		}
	}

	return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
