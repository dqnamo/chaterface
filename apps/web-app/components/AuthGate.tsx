"use client";

import db from "@repo/db/client";
import type { ReactNode } from "react";
import { useState } from "react";

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

	const sendMagicCode = async () => {
		setError(undefined);
		setIsSubmitting(true);

		try {
			await db.auth.sendMagicCode({ email });
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
			await db.auth.signInWithMagicCode({ email, code });
		} catch (error) {
			setError(getErrorMessage(error, "Failed to verify magic code"));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (authError) {
		return <div>Uh oh! {authError.message}</div>;
	}

	if (user) {
		return children;
	}

	return (
		<main>
			<h1>Sign in</h1>
			<p>Enter your email and we&apos;ll send you a magic code.</p>

			<div className="flex flex-col gap-4">
				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>

				{isCodeSent ? (
					<input
						type="text"
						placeholder="Magic code"
						value={code}
						onChange={(event) => setCode(event.target.value)}
					/>
				) : null}

				{error ? <p>{error}</p> : null}

				<button
					type="button"
					disabled={isSubmitting}
					onClick={() => {
						if (isCodeSent) {
							signInWithMagicCode();
							return;
						}

						sendMagicCode();
					}}
				>
					{isSubmitting
						? "Submitting..."
						: isCodeSent
							? "Verify code"
							: "Send code"}
				</button>
			</div>
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
