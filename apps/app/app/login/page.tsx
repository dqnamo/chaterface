"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

export default function LoginPage() {
  return <MagicCodeLogin instantDb={db} />;
}

function MagicCodeLogin({ instantDb }: { instantDb: AppDb }) {
  const router = useRouter();
  const { error: authError, isLoading, user } = instantDb.useAuth();
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/factories");
    }
  }, [isLoading, router, user]);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      await instantDb.auth.sendMagicCode({ email });
      setSentEmail(email);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code") ?? "").trim();

    try {
      await instantDb.auth.signInWithMagicCode({ email: sentEmail, code });
      router.replace("/factories");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthForm
        authError={authError?.message}
        error={error}
        isCodeStep={Boolean(sentEmail)}
        isSubmitting={isSubmitting}
        onSubmit={sentEmail ? verifyCode : sendCode}
        sentEmail={sentEmail}
      />
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "body" in error &&
    error.body &&
    typeof error.body === "object" &&
    "message" in error.body &&
    typeof error.body.message === "string"
  ) {
    return error.body.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
