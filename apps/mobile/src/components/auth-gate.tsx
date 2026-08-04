import { type ReactNode, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "@/components/tw";
import db from "@/lib/instant";

/**
 * Mirrors the web app's `AuthGate`: email magic code in, session out. InstantDB
 * persists the session itself, so a signed-in user stays signed in across
 * launches.
 */
export function AuthGate({ children }: { children: ReactNode }) {
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
		} catch (caught) {
			setError(getErrorMessage(caught, "Failed to send magic code"));
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
		} catch (caught) {
			setError(getErrorMessage(caught, "Failed to verify magic code"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const submit = () => {
		if (isSubmitting || !canSubmit) {
			return;
		}

		void (isCodeSent ? signInWithMagicCode() : sendMagicCode());
	};

	if (isLoading) {
		return (
			<AuthShell>
				<ActivityIndicator />
				<Text className="text-sm text-muted-foreground">
					Loading Chaterface...
				</Text>
			</AuthShell>
		);
	}

	if (authError) {
		return (
			<AuthShell>
				<Text className="text-lg font-medium text-foreground">
					Unable to authenticate
				</Text>
				<Text className="text-sm text-center text-muted-foreground">
					{authError.message}
				</Text>
			</AuthShell>
		);
	}

	if (user) {
		return <>{children}</>;
	}

	return (
		<AuthShell>
			<KeyboardAvoidingView
				behavior="padding"
				className="w-full max-w-md gap-4"
			>
				<View className="gap-1">
					<Text className="text-2xl font-semibold text-foreground text-center">
						Sign in to Chaterface
					</Text>
					<Text className="text-sm text-muted-foreground text-center">
						{isCodeSent
							? `Enter the code sent to ${trimmedEmail}.`
							: "Enter your email to receive a magic code."}
					</Text>
				</View>

				<View className="gap-3">
					<TextInput
						className="rounded-xl bg-card px-4 py-3 text-base text-foreground border-continuous"
						placeholder="you@example.com"
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						editable={!isSubmitting && !isCodeSent}
						value={email}
						onChangeText={setEmail}
						onSubmitEditing={submit}
					/>

					{isCodeSent ? (
						<TextInput
							className="rounded-xl bg-card px-4 py-3 text-base text-foreground border-continuous"
							placeholder="Magic code"
							autoCapitalize="none"
							autoComplete="one-time-code"
							keyboardType="number-pad"
							editable={!isSubmitting}
							value={code}
							onChangeText={setCode}
							onSubmitEditing={submit}
						/>
					) : null}

					{error ? (
						<Text className="text-xs text-red-500 px-1">{error}</Text>
					) : null}

					<Pressable
						className={
							canSubmit && !isSubmitting
								? "rounded-xl bg-foreground py-3.5 items-center"
								: "rounded-xl bg-secondary py-3.5 items-center"
						}
						disabled={!canSubmit || isSubmitting}
						onPress={submit}
					>
						<Text
							className={
								canSubmit && !isSubmitting
									? "text-base font-medium text-background"
									: "text-base font-medium text-muted-foreground"
							}
						>
							{isSubmitting
								? "Submitting..."
								: isCodeSent
									? "Verify code"
									: "Send code"}
						</Text>
					</Pressable>

					{isCodeSent ? (
						<Pressable
							disabled={isSubmitting}
							onPress={() => {
								setIsCodeSent(false);
								setCode("");
								setError(undefined);
							}}
						>
							<Text className="text-xs text-center text-muted-foreground">
								Use a different email
							</Text>
						</Pressable>
					) : null}
				</View>
			</KeyboardAvoidingView>
		</AuthShell>
	);
}

function AuthShell({ children }: { children: ReactNode }) {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 items-center justify-center gap-4 px-6">
				{children}
			</View>
		</SafeAreaView>
	);
}

function getErrorMessage(error: unknown, fallback: string) {
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
