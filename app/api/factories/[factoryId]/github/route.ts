import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  getFactoryCapabilitySandbox,
  snapshotFactoryCapabilities,
} from "@/lib/codex/factory-capabilities";
import {
  applyGithubSetup,
  type GithubRepositorySetup,
} from "@/lib/codex/github-setup";
import { decryptSecretValue, encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";
import { parseGithubSettingsInput } from "@/lib/factory/github-settings";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type GithubSettingsRecord = {
  createdAt?: string;
  tokenEncrypted?: string;
};

type FactoryWithGithubSettings = {
  capabilitySandboxId?: string;
  defaultSandboxCheckpointId?: string;
  githubSettings?: GithubSettingsRecord;
  id: string;
  owner?: { id?: string };
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseGithubSettingsInput(body);

  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { factoryId } = await context.params;
  const db = getAdminDb();
  const factory = await getOwnedFactory<FactoryWithGithubSettings>(
    factoryId,
    user,
    {
      githubSettings: {},
    },
  );

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const token =
    parsed.token ??
    decryptSecretValue<string>(factory.githubSettings?.tokenEncrypted);

  try {
    const sandbox = await getFactoryCapabilitySandbox({
      factory,
      factoryId,
    });

    await applyGithubSetup(sandbox, {
      gitEmail: parsed.gitEmail,
      gitName: parsed.gitName,
      repositories: parsed.repositories as GithubRepositorySetup[],
      token,
    });
    await snapshotFactoryCapabilities({ factoryId, sandbox });

    await db.transact([
      db.tx.factoryGithubSettings[factoryId].update({
        appliedAt: now,
        createdAt: factory.githubSettings?.createdAt ?? now,
        gitEmail: parsed.gitEmail,
        gitName: parsed.gitName,
        hasToken: Boolean(token),
        lastError: null,
        repositories: parsed.repositories,
        status: "applied",
        ...(parsed.token
          ? { tokenEncrypted: encryptSecretValue(parsed.token) }
          : factory.githubSettings?.tokenEncrypted
            ? { tokenEncrypted: factory.githubSettings.tokenEncrypted }
            : {}),
        updatedAt: now,
      }),
      db.tx.factoryGithubSettings[factoryId].link({
        factory: factoryId,
      }),
    ]);

    return Response.json({
      appliedAt: now,
      repositories: parsed.repositories,
      status: "applied",
    });
  } catch (error) {
    console.error(error);
    const lastError =
      error instanceof Error
        ? error.message
        : "GitHub setup could not be saved";

    try {
      await db.transact([
        db.tx.factoryGithubSettings[factoryId].update({
          createdAt: factory.githubSettings?.createdAt ?? now,
          gitEmail: parsed.gitEmail,
          gitName: parsed.gitName,
          hasToken: Boolean(token),
          lastError,
          repositories: parsed.repositories,
          status: "failed",
          ...(parsed.token
            ? { tokenEncrypted: encryptSecretValue(parsed.token) }
            : factory.githubSettings?.tokenEncrypted
              ? { tokenEncrypted: factory.githubSettings.tokenEncrypted }
              : {}),
          updatedAt: now,
        }),
        db.tx.factoryGithubSettings[factoryId].link({
          factory: factoryId,
        }),
      ]);
    } catch (writeError) {
      console.error(writeError);
    }

    return Response.json({ error: lastError }, { status: 500 });
  }
}
