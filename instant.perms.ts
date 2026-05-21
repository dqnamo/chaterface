import type { InstantRules } from "@instantdb/react";
import { FACTORY_COLOR_OPTIONS } from "./helpers/factory-colors";

const supportedFactoryColors = FACTORY_COLOR_OPTIONS.map(
  (option) => `'${option.id}'`,
).join(", ");

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
    bind: {
      colorIsSupported: `!('color' in request.modifiedFields) || newData.color in [${supportedFactoryColors}]`,
      isOwner: "auth.id in data.ref('owner.id')",
      onlyModifiesColor:
        "request.modifiedFields.all(field, field in ['color'])",
    },
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "false",
      update: "isOwner && onlyModifiesColor && colorIsSupported",
      delete: "isOwner",
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
  factorySkills: {
    allow: {
      view: "auth.id in data.ref('factory.owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpServers: {
    allow: {
      view: "auth.id in data.ref('factory.owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpCapabilities: {
    allow: {
      view: "auth.id in data.ref('mcpServer.factory.owner.id')",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpCredentials: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpOauthStates: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpWorkerTokens: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
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
