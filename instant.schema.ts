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
      defaultSanpshotId: i.string().optional(),
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
      createdAt: i.string().indexed().optional(),
      name: i.string().indexed().optional(),
      sandboxId: i.string().indexed().optional(),
      status: i.string(),
      updatedAt: i.string().indexed().optional(),
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
  },
});

export default _schema;
