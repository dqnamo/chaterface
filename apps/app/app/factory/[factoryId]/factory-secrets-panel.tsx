"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { type ClipboardEvent, type FormEvent, useMemo, useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import Input from "@/components/public/Input";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

const secretNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const maxSecretNameLength = 128;
const maxSecretValueLength = 64 * 1024;

type SecretRecord = {
  createdAt?: string;
  id: string;
  name?: string;
  updatedAt?: string;
};

type FactoryWithSecretsRecord = {
  id: string;
  secrets?: SecretRecord[];
};

type ParsedSecret = {
  name: string;
  value: string;
};

type ParsedEnvFile = {
  secrets: ParsedSecret[];
  skippedLineCount: number;
};

export function FactorySecretsPanel({ factoryId }: { factoryId: string }) {
  return <FactorySecretsPanelContent factoryId={factoryId} instantDb={db} />;
}

function parseEnvFile(text: string): ParsedEnvFile {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const parsedSecrets = new Map<string, string>();
  let skippedLineCount = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const assignmentLine = trimmedLine.startsWith("export ")
      ? trimmedLine.slice("export ".length).trimStart()
      : trimmedLine;
    const equalsIndex = assignmentLine.indexOf("=");

    if (equalsIndex === -1) {
      skippedLineCount += 1;
      continue;
    }

    const name = assignmentLine.slice(0, equalsIndex).trim();

    if (name.length > maxSecretNameLength || !secretNamePattern.test(name)) {
      skippedLineCount += 1;
      continue;
    }

    const parsedValue = parseEnvValue({
      firstLine: assignmentLine.slice(equalsIndex + 1),
      lineIndex,
      lines,
    });

    lineIndex = parsedValue.lineIndex;

    if (parsedValue.value.length > maxSecretValueLength) {
      skippedLineCount += 1;
      continue;
    }

    parsedSecrets.delete(name);
    parsedSecrets.set(name, parsedValue.value);
  }

  return {
    secrets: Array.from(parsedSecrets, ([name, value]) => ({ name, value })),
    skippedLineCount,
  };
}

function parseEnvValue({
  firstLine,
  lineIndex,
  lines,
}: {
  firstLine: string;
  lineIndex: number;
  lines: string[];
}) {
  const trimmedValue = firstLine.trimStart();
  const quote = trimmedValue[0];

  if (quote !== '"' && quote !== "'" && quote !== "`") {
    return {
      lineIndex,
      value: stripUnquotedComment(firstLine).trim(),
    };
  }

  let currentLine = trimmedValue.slice(1);
  let value = "";
  let currentIndex = lineIndex;

  while (true) {
    const closingQuoteIndex = findClosingQuote(currentLine, quote);

    if (closingQuoteIndex !== -1) {
      value += currentLine.slice(0, closingQuoteIndex);
      break;
    }

    value += currentLine;

    if (currentIndex >= lines.length - 1) {
      break;
    }

    currentIndex += 1;
    currentLine = lines[currentIndex];
    value += "\n";
  }

  return {
    lineIndex: currentIndex,
    value: quote === '"' ? unescapeDoubleQuotedValue(value) : value,
  };
}

function findClosingQuote(value: string, quote: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== quote) {
      continue;
    }

    if (quote === "'" || !isEscaped(value, index)) {
      return index;
    }
  }

  return -1;
}

function isEscaped(value: string, index: number) {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (value[cursor] !== "\\") {
      break;
    }

    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function stripUnquotedComment(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "#" && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }

  return value;
}

function unescapeDoubleQuotedValue(value: string) {
  return value.replace(/\\([nrt"\\])/g, (_match, escaped: string) => {
    switch (escaped) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return escaped;
    }
  });
}

function FactorySecretsPanelContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const { user } = instantDb.useAuth();
  const { data, error, isLoading } = instantDb.useQuery(
    user?.id
      ? {
          factories: {
            $: { where: { id: factoryId } },
            secrets: {},
          },
        }
      : null,
  );
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSecretId, setDeletingSecretId] = useState<string | null>(null);

  const factory = data?.factories?.[0] as FactoryWithSecretsRecord | undefined;
  const secrets = useMemo(
    () =>
      [...(factory?.secrets ?? [])].sort((first, second) =>
        (first.name ?? "").localeCompare(second.name ?? ""),
      ),
    [factory?.secrets],
  );

  async function saveSecret(secret: ParsedSecret, refreshToken: string) {
    const response = await fetch(`/api/factories/${factoryId}/secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(secret),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(body?.error ?? "Secret could not be saved.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.refresh_token) {
      setFormError("You must be signed in to save secrets.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      await saveSecret({ name, value }, user.refresh_token);

      setName("");
      setValue("");
    } catch (saveError) {
      console.error(saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Secret could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePastedSecrets(parsedEnvFile: ParsedEnvFile) {
    if (!user?.refresh_token) {
      setFormError("You must be signed in to save secrets.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      for (const secret of parsedEnvFile.secrets) {
        await saveSecret(secret, user.refresh_token);
      }

      setName("");
      setValue("");
      setStatusMessage(
        [
          `Added ${parsedEnvFile.secrets.length} ${
            parsedEnvFile.secrets.length === 1 ? "secret" : "secrets"
          }.`,
          parsedEnvFile.skippedLineCount > 0
            ? `Skipped ${parsedEnvFile.skippedLineCount} ${
                parsedEnvFile.skippedLineCount === 1 ? "line" : "lines"
              } that could not be parsed.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (saveError) {
      console.error(saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Secrets could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function onSecretPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData("text");
    const parsedEnvFile = parseEnvFile(pastedText);
    const shouldSaveParsedSecrets =
      parsedEnvFile.secrets.length > 0 &&
      (parsedEnvFile.secrets.length > 1 ||
        pastedText.includes("\n") ||
        event.currentTarget.name === "name");

    if (!shouldSaveParsedSecrets) {
      return;
    }

    event.preventDefault();
    void savePastedSecrets(parsedEnvFile);
  }

  async function onDelete(secretId: string) {
    if (!user?.id) {
      setFormError("You must be signed in to delete secrets.");
      return;
    }

    setDeletingSecretId(secretId);
    setFormError(null);
    setStatusMessage(null);

    try {
      await instantDb.transact(instantDb.tx.secrets[secretId].delete());
    } catch (deleteError) {
      console.error(deleteError);
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Secret could not be deleted.",
      );
    } finally {
      setDeletingSecretId(null);
    }
  }

  return (
    <Card layer={0} className="w-full max-w-2xl gap-4 p-1.5 rounded-[16px]">
      <Card
        layer={1}
        className="w-full max-w-2xl gap-4 p-2 rounded-[13px] small-shadow bg-grayscale-1 dark:bg-grayscale-2"
      >
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={onSubmit}
        >
          <Input
            aria-label="Secret name"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="w-full bg-grayscale-1 font-mono p-1 px-2 bg-grayscale-2 border-grayscale-4"
            name="name"
            onChange={(event) => setName(event.target.value)}
            onPaste={onSecretPaste}
            pattern="[A-Za-z_][A-Za-z0-9_]*"
            placeholder="OPENAI_API_KEY"
            spellCheck={false}
            value={name}
          />
          <Input
            aria-label="Secret value"
            autoComplete="off"
            className="w-full bg-grayscale-1 font-mono p-1 px-2 bg-grayscale-2 border-grayscale-4"
            name="value"
            onChange={(event) => setValue(event.target.value)}
            onPaste={onSecretPaste}
            placeholder="Value"
            type="password"
            value={value}
          />
          <Button
            className="justify-center items-center"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving" : "Save"}
          </Button>
        </form>
        {formError ? (
          <p className="text-red-600 text-sm dark:text-red-400">{formError}</p>
        ) : null}
        {statusMessage ? (
          <p className="text-grayscale-10 text-sm">{statusMessage}</p>
        ) : null}
        {error ? (
          <p className="text-red-600 text-sm dark:text-red-400">
            {error.message}
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          {isLoading ? (
            <p className="text-grayscale-10 text-sm">Loading secrets...</p>
          ) : secrets.length > 0 ? (
            secrets.map((secret) => (
              <div
                className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-grayscale-3 bg-grayscale-1 px-3"
                key={secret.id}
              >
                <span className="min-w-0 truncate font-mono text-grayscale-12 text-sm">
                  {secret.name}
                </span>
                <button
                  aria-label={`Delete ${secret.name ?? "secret"}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-grayscale-10 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={deletingSecretId === secret.id}
                  onClick={() => onDelete(secret.id)}
                  type="button"
                >
                  <TrashIcon aria-hidden="true" size={16} weight="bold" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-16 flex flex-col items-center justify-center">
              <p className="text-grayscale-11 font-medium text-sm">
                No secrets yet.
              </p>
              <p className="text-grayscale-10 text-xs max-w-sm text-center text-balance">
                You can paste in an entire list and we will automatically parse
                and add them all.
              </p>
            </div>
          )}
        </div>
      </Card>
    </Card>
  );
}
