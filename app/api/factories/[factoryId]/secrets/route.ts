import { id } from "@instantdb/admin";
import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

const secretNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const maxSecretNameLength = 128;
const maxSecretValueLength = 64 * 1024;

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type CreateSecretRequest = {
  name?: unknown;
  value?: unknown;
};

type FactoryWithSecrets = {
  owner?: { id?: string };
  secrets?: Array<{
    createdAt?: string;
    id: string;
    name?: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: CreateSecretRequest;

  try {
    body = (await request.json()) as CreateSecretRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!name) {
    return Response.json({ error: "Secret name is required" }, { status: 400 });
  }

  if (name.length > maxSecretNameLength || !secretNamePattern.test(name)) {
    return Response.json(
      {
        error:
          "Secret name must be a valid environment variable name, like OPENAI_API_KEY.",
      },
      { status: 400 },
    );
  }

  if (!value) {
    return Response.json(
      { error: "Secret value is required" },
      { status: 400 },
    );
  }

  if (value.length > maxSecretValueLength) {
    return Response.json(
      { error: "Secret value must be 64 KB or smaller" },
      { status: 400 },
    );
  }

  const { factoryId } = await context.params;
  const factory = await getOwnedFactory<FactoryWithSecrets>(factoryId, user, {
    secrets: {},
  });

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const existingSecret = factory.secrets?.find(
    (secret) => secret.name === name,
  );
  const secretId = existingSecret?.id ?? id();
  const db = getAdminDb();
  const transactions = [
    db.tx.secrets[secretId].update({
      ...(existingSecret ? {} : { createdAt: now }),
      name,
      updatedAt: now,
      valueEncrypted: encryptSecretValue(value),
    }),
  ];

  if (!existingSecret) {
    transactions.push(
      db.tx.secrets[secretId].link({
        factory: factoryId,
      }),
    );
  }

  await db.transact(transactions);

  return Response.json({
    secret: {
      createdAt: existingSecret?.createdAt ?? now,
      id: secretId,
      name,
      updatedAt: now,
    },
  });
}
