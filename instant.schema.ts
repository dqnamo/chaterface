import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    factories: i.entity({
      status: i.string(),
      name: i.string(),
      billingPlan: i.string().indexed().optional(),
      billingUpdatedAt: i.string().indexed().optional(),
      color: i.string().optional(),
      capabilitySandboxId: i.string().indexed().optional(),
      capabilityBoxId: i.string().indexed().optional(),
      createdAt: i.string().indexed().optional(),
      defaultSandboxCheckpointId: i.string().optional(),
      defaultSanpshotId: i.string().optional(),
      trialEndsAt: i.string().indexed().optional(),
    }),
    factoryStripeBillings: i.entity({
      cancelAtPeriodEnd: i.boolean().optional(),
      createdAt: i.string().indexed(),
      currentPeriodEnd: i.string().indexed().optional(),
      lastWebhookEventId: i.string().unique().indexed().optional(),
      stripeCustomerId: i.string().indexed().optional(),
      stripeSubscriptionId: i.string().unique().indexed().optional(),
      stripeSubscriptionItemId: i.string().indexed().optional(),
      stripeSubscriptionStatus: i.string().indexed().optional(),
      updatedAt: i.string().indexed(),
    }),
    supervisors: i.entity({
      acceptedAt: i.string().indexed().optional(),
      email: i.string().indexed(),
      inviteEmailError: i.string().optional(),
      inviteEmailSentAt: i.string().indexed().optional(),
      invitedAt: i.string().indexed(),
      invitedByEmail: i.string().optional(),
      resendEmailId: i.string().optional(),
      status: i.string().indexed(),
      updatedAt: i.string().indexed(),
    }),
    agents: i.entity({
      type: i.string(),
      authEncrypted: i.string(),
    }),
    secrets: i.entity({
      createdAt: i.string().indexed(),
      name: i.string().indexed(),
      updatedAt: i.string().indexed(),
      valueEncrypted: i.string(),
    }),
    workers: i.entity({
      activeCommandId: i.string().indexed().optional(),
      activePid: i.number().optional(),
      codexSessionId: i.string().indexed().optional(),
      codexSessionConfigVersion: i.string().indexed().optional(),
      createdAt: i.string().indexed().optional(),
      name: i.string().indexed().optional(),
      retiredAt: i.string().indexed().optional(),
      sandboxId: i.string().indexed().optional(),
      status: i.string(),
      updatedAt: i.string().indexed().optional(),
    }),
    ports: i.entity({
      authType: i.string().indexed().optional(),
      createdAt: i.string().indexed(),
      port: i.number().indexed(),
      updatedAt: i.string().indexed(),
      url: i.string(),
      workerIdPort: i.string().unique().indexed(),
    }),
    factorySkills: i.entity({
      installedAt: i.string().indexed().optional(),
      lastError: i.string().optional(),
      name: i.string().indexed(),
      repoUrl: i.string().indexed(),
      skillPath: i.string().optional(),
      status: i.string().indexed(),
    }),
    factoryMcpServers: i.entity({
      authStatus: i.string().indexed().optional(),
      authType: i.string().indexed().optional(),
      authenticatedAt: i.string().indexed().optional(),
      enabled: i.boolean().optional(),
      lastError: i.string().optional(),
      lastSyncAt: i.string().indexed().optional(),
      loginUrl: i.string().optional(),
      name: i.string().indexed(),
      scopes: i.string().optional(),
      status: i.string().indexed(),
      syncStatus: i.string().indexed().optional(),
      url: i.string().indexed(),
    }),
    factoryMcpCredentials: i.entity({
      connectionId: i.string().indexed(),
      createdAt: i.string().indexed(),
      credentialType: i.string().indexed(),
      encryptedBearerToken: i.string().optional(),
      updatedAt: i.string().indexed(),
    }),
    factoryMcpCapabilities: i.entity({
      capabilityType: i.string().indexed(),
      createdAt: i.string().indexed(),
      description: i.string().optional(),
      enabled: i.boolean(),
      inputSchema: i.json().optional(),
      mcpServerId: i.string().indexed(),
      namespacedName: i.string().unique().indexed(),
      outputSchema: i.json().optional(),
      updatedAt: i.string().indexed(),
      upstreamName: i.string().indexed(),
    }),
    factoryMcpOauthStates: i.entity({
      authorizationUrl: i.string().optional(),
      connectionId: i.string().indexed(),
      createdAt: i.string().indexed(),
      discoveryState: i.json().optional(),
      encryptedClientInformation: i.string().optional(),
      encryptedCodeVerifier: i.string().optional(),
      encryptedTokens: i.string().optional(),
      state: i.string().unique().indexed(),
      updatedAt: i.string().indexed(),
    }),
    factoryMcpWorkerTokens: i.entity({
      capabilityIds: i.json().optional(),
      createdAt: i.string().indexed(),
      expiresAt: i.string().indexed(),
      factoryId: i.string().indexed(),
      revokedAt: i.string().indexed().optional(),
      tokenHash: i.string().unique().indexed(),
      workerId: i.string().indexed(),
    }),
    factoryWorkerApiTokens: i.entity({
      createdAt: i.string().indexed(),
      factoryId: i.string().indexed(),
      revokedAt: i.string().indexed().optional(),
      tokenHash: i.string().unique().indexed(),
      workerId: i.string().indexed(),
    }),
    events: i.entity({
      createdAt: i.string().indexed().optional(),
      data: i.json(),
      source: i.string().indexed(),
      type: i.string().indexed(),
    }),
  },
  links: {
    userFactories: {
      forward: {
        on: "factories",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "ownedFactories",
      },
    },
    factoryAgents: {
      forward: {
        on: "agents",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "agents",
      },
    },
    factoryStripeBilling: {
      forward: {
        on: "factoryStripeBillings",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "one",
        label: "stripeBilling",
      },
    },
    factorySupervisors: {
      forward: {
        on: "supervisors",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "supervisors",
      },
    },
    supervisorUsers: {
      forward: {
        on: "supervisors",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "supervisedMemberships",
      },
    },
    factorySecrets: {
      forward: {
        on: "secrets",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "secrets",
      },
    },
    factoryWorkers: {
      forward: {
        on: "workers",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "workers",
      },
    },
    factorySkills: {
      forward: {
        on: "factorySkills",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "skills",
      },
    },
    factoryMcpServers: {
      forward: {
        on: "factoryMcpServers",
        has: "one",
        label: "factory",
      },
      reverse: {
        on: "factories",
        has: "many",
        label: "mcpServers",
      },
    },
    factoryMcpServerCapabilities: {
      forward: {
        on: "factoryMcpCapabilities",
        has: "one",
        label: "mcpServer",
      },
      reverse: {
        on: "factoryMcpServers",
        has: "many",
        label: "capabilities",
      },
    },
    workerEvents: {
      forward: {
        on: "events",
        has: "one",
        label: "worker",
      },
      reverse: {
        on: "workers",
        has: "many",
        label: "events",
      },
    },
    eventAttachments: {
      forward: {
        on: "events",
        has: "many",
        label: "attachments",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "event",
      },
    },
    workerPorts: {
      forward: {
        on: "ports",
        has: "one",
        label: "worker",
      },
      reverse: {
        on: "workers",
        has: "many",
        label: "ports",
      },
    },
  },
});

export default _schema;
