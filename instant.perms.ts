import type { InstantRules } from "@instantdb/react";

const rules = {
  $default: {
    allow: {
      $default: "false",
    },
  },
  $files: {
    bind: {
      isOwnerPath: "auth.id != null && data.path.startsWith(auth.id + '/')",
    },
    allow: {
      view: "isOwnerPath",
      create: "isOwnerPath",
      update: "false",
      delete: "isOwnerPath",
    },
  },
  $users: {
    allow: {
      view: "auth.id == data.id",
      create: "true",
      update: "false",
      delete: "false",
    },
  },
  factories: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  agents: {
    allow: {
      view: "auth.id in data.ref('factory.owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  secrets: {
    allow: {
      view: "auth.id in data.ref('factory.owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
    fields: {
      valueEncrypted: "false",
    },
  },
  workers: {
    allow: {
      view: "auth.id in data.ref('factory.owner.id')",
      create: "auth.id in data.ref('factory.owner.id')",
      update: "auth.id in data.ref('factory.owner.id')",
      delete: "false",
    },
  },
  events: {
    allow: {
      view: "auth.id in data.ref('worker.factory.owner.id')",
      create: "auth.id in data.ref('worker.factory.owner.id')",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
