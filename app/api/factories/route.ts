import { id } from "@instantdb/admin";
import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import { BASIC_BILLING_PLAN, getTrialEndsAt } from "@/lib/billing";
import { applyGithubSetup } from "@/lib/codex/github-setup";
import { createDefaultFactoryCheckpoint } from "@/lib/codex/sandbox-auth";
import { encryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";
import { parseGithubSettingsInput } from "@/lib/factory/github-settings";
import { createFactorySandbox } from "@/lib/sandbox/service";

export const runtime = "nodejs";

type CreateFactoryRequest = {
  codexAgent?: {
    authJson?: unknown;
    enabled?: boolean;
  };
  github?: unknown;
  name?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: CreateFactoryRequest;

  try {
    body = (await request.json()) as CreateFactoryRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();

  if (!name) {
    return Response.json(
      { error: "Factory name is required" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  const agentId = id();
  const factoryId = id();
  const now = new Date();
  const nowIso = now.toISOString();
  const shouldCreateCodexAgent = body.codexAgent?.enabled === true;
  const codexAuthJson =
    shouldCreateCodexAgent && body.codexAgent ? body.codexAgent.authJson : null;

  if (shouldCreateCodexAgent && !isJsonObject(codexAuthJson)) {
    return Response.json(
      { error: "Codex auth JSON file is required" },
      { status: 400 },
    );
  }

  const githubSettings = parseGithubSettingsInput(body.github);

  if ("error" in githubSettings) {
    return Response.json({ error: githubSettings.error }, { status: 400 });
  }

  try {
    const sandbox = await createFactorySandbox(factoryId);
    await applyGithubSetup(sandbox, githubSettings);
    const checkpoint = await createDefaultFactoryCheckpoint({
      factoryId,
      sandbox,
    });
    const factoryTransactions = [
      db.tx.factories[factoryId].update({
        billingPlan: BASIC_BILLING_PLAN,
        billingUpdatedAt: nowIso,
        createdAt: nowIso,
        defaultSandboxCheckpointId: checkpoint.id,
        name,
        status: "ready",
        trialEndsAt: getTrialEndsAt(now),
      }),
      db.tx.factories[factoryId].link({
        owner: user.id,
      }),
      db.tx.factoryStripeBillings[factoryId].update({
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      db.tx.factoryStripeBillings[factoryId].link({
        factory: factoryId,
      }),
      db.tx.factoryGithubSettings[factoryId].update({
        appliedAt: nowIso,
        createdAt: nowIso,
        gitEmail: githubSettings.gitEmail,
        gitName: githubSettings.gitName,
        hasToken: Boolean(githubSettings.token),
        repositories: githubSettings.repositories,
        status: "applied",
        ...(githubSettings.token
          ? { tokenEncrypted: encryptSecretValue(githubSettings.token) }
          : {}),
        updatedAt: nowIso,
      }),
      db.tx.factoryGithubSettings[factoryId].link({
        factory: factoryId,
      }),
    ];
    const transactions = shouldCreateCodexAgent
      ? [
          ...factoryTransactions,
          db.tx.agents[agentId].update({
            authEncrypted: encryptSecretValue(codexAuthJson),
            codexModel: "gpt-5.5",
            codexReasoningLevel: "medium",
            codexSpeed: "standard",
            ...(githubSettings.gitEmail
              ? { gitEmail: githubSettings.gitEmail }
              : {}),
            ...(githubSettings.gitName
              ? { gitName: githubSettings.gitName }
              : {}),
            type: "codex",
          }),
          db.tx.agents[agentId].link({
            factory: factoryId,
          }),
        ]
      : factoryTransactions;

    await db.transact(transactions);

    return Response.json({
      agentId: shouldCreateCodexAgent ? agentId : undefined,
      factoryId,
      checkpointId: checkpoint.id,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Factory could not be created",
      },
      { status: 500 },
    );
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
