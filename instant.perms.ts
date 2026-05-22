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
      isFactoryMember:
        "auth.id in data.ref('owner.id') || auth.id in data.ref('supervisors.user.id') || auth.email in data.ref('supervisors.email')",
      isOwner: "auth.id in data.ref('owner.id')",
      onlyModifiesColor:
        "request.modifiedFields.all(field, field in ['color'])",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "isOwner && onlyModifiesColor && colorIsSupported",
      delete: "isOwner",
    },
  },
  supervisors: {
    bind: {
      basicSupervisorLimitAllowsInvite:
        "size(data.ref('factory.supervisors.status').filter(status, status != 'removed')) <= 3",
      canAcceptInvite:
        "auth.email == data.email && data.status == 'invited' && newData.status == 'active' && request.modifiedFields.all(field, field in ['acceptedAt', 'status', 'updatedAt'])",
      canCreateInvite:
        "auth.id in data.ref('factory.owner.id') && data.status == 'invited' && data.email != auth.email && factoryBillingAllowsInvite",
      canRemoveInvite:
        "isOwner && newData.status == 'removed' && request.modifiedFields.all(field, field in ['status', 'updatedAt'])",
      factoryBillingAllowsInvite:
        "factoryIsPro || factoryIsTrialing || basicSupervisorLimitAllowsInvite",
      factoryIsPro: "'pro' in data.ref('factory.billingPlan')",
      factoryIsTrialing:
        "data.ref('factory.trialEndsAt').exists(trialEndsAt, timestamp(trialEndsAt) > request.time)",
      isInvitedEmail: "auth.email == data.email",
      isLinkedSupervisor: "auth.id in data.ref('user.id')",
      isOwner: "auth.id in data.ref('factory.owner.id')",
    },
    allow: {
      view: "isOwner || isLinkedSupervisor || isInvitedEmail",
      create: "canCreateInvite",
      update: "canAcceptInvite || canRemoveInvite",
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
  factoryStripeBillings: {
    allow: {
      view: "false",
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
    bind: {
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "isFactoryMember",
      update: "isFactoryMember",
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
    bind: {
      isFactoryMember:
        "auth.id in data.ref('worker.factory.owner.id') || auth.id in data.ref('worker.factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "isFactoryMember",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
