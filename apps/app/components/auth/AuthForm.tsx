import type { FormEvent } from "react";
import Button from "../public/Button";
import Card from "../public/Card";
import Input from "../public/Input";

type AuthFormProps = {
  authError?: string;
  error?: string;
  isCodeStep: boolean;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sentEmail: string;
};

export function AuthForm({
  authError,
  error,
  isCodeStep,
  isSubmitting,
  onSubmit,
  sentEmail,
}: AuthFormProps) {
  return (
    <Card
      layer={0}
      className="w-full max-w-lg bg-white p-0! dark:bg-grayscale-2"
    >
      <form onSubmit={onSubmit}>
        <div className="flex flex-col p-4">
          <h2 className="font-medium text-grayscale-12">Login</h2>
          <p className="text-grayscale-11 text-sm">
            We will log in or create an account for you.
          </p>
          {sentEmail ? (
            <p className="text-grayscale-11 text-sm">
              Code sent to {sentEmail}
            </p>
          ) : null}
          {authError ? <p className="text-sm">{authError}</p> : null}
          {error ? <p className="text-sm">{error}</p> : null}
        </div>
        <Input
          key={isCodeStep ? "code" : "email"}
          variant="underline"
          className="w-full px-4"
          autoComplete={isCodeStep ? "one-time-code" : "email"}
          inputMode={isCodeStep ? "numeric" : "email"}
          name={isCodeStep ? "code" : "email"}
          placeholder={isCodeStep ? "123456" : "email@example.com"}
          required
          type={isCodeStep ? "text" : "email"}
        />
        <div className="flex flex-row items-center justify-end p-2">
          <Button disabled={isSubmitting} type="submit" variant="primary">
            {isCodeStep ? "Verify code" : "Login"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
