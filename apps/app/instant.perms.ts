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
    bind: {
      avatarColorIsSupported: `!('avatarColor' in request.modifiedFields) || newData.avatarColor in [${supportedFactoryColors}]`,
      onlyModifiesAvatarColor:
        "request.modifiedFields.all(field, field in ['avatarColor'])",
    },
    allow: {
      view: "auth.id == data.id",
      create: "true",
      update:
        "auth.id == data.id && onlyModifiesAvatarColor && avatarColorIsSupported",
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
        "auth.email == data.email && data.status == 'invited' && newData.status == 'active' && request.modifiedFields.all(field, field in ['acceptedAt', 'status', 'updatedAt', 'user'])",
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
    bind: {
      codexModelIsSupported:
        "!('codexModel' in request.modifiedFields) || newData.codexModel in ['gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex-spark']",
      codexReasoningLevelIsSupported:
        "!('codexReasoningLevel' in request.modifiedFields) || newData.codexReasoningLevel in ['low', 'medium', 'high', 'xhigh']",
      codexSpeedIsSupported:
        "!('codexSpeed' in request.modifiedFields) || newData.codexSpeed in ['standard', 'fast']",
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
      onlyUpdatesAgentSettings:
        "request.modifiedFields.all(field, field in ['codexModel', 'codexReasoningLevel', 'codexSpeed', 'gitEmail', 'gitName', 'name']) && codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "isFactoryMember && onlyUpdatesAgentSettings",
      delete: "false",
    },
    fields: {
      authEncrypted: "false",
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
    bind: {
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "false",
      delete: "isFactoryMember",
    },
    fields: {
      valueEncrypted: "false",
    },
  },
  workers: {
    bind: {
      codexModelIsSupported:
        "!('codexModel' in request.modifiedFields) || newData.codexModel in ['gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex-spark']",
      codexReasoningLevelIsSupported:
        "!('codexReasoningLevel' in request.modifiedFields) || newData.codexReasoningLevel in ['low', 'medium', 'high', 'xhigh']",
      codexSpeedIsSupported:
        "!('codexSpeed' in request.modifiedFields) || newData.codexSpeed in ['standard', 'fast']",
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
      onlyCreatesClientWorker:
        "request.modifiedFields.all(field, field in ['activityMessage', 'agent', 'codexModel', 'codexReasoningLevel', 'codexSpeed', 'createdAt', 'factory', 'name', 'retiredAt', 'status', 'updatedAt']) && data.status == 'queued' && data.retiredAt == null && codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported",
      onlyQueuesClientWorker:
        "request.modifiedFields.all(field, field in ['codexModel', 'codexReasoningLevel', 'codexSpeed', 'retiredAt', 'status', 'updatedAt']) && newData.retiredAt == null && newData.status in ['queued', 'running'] && codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported",
      onlyRetiresClientWorker:
        "request.modifiedFields.all(field, field in ['activeCommandId', 'activePid', 'retiredAt', 'status', 'updatedAt']) && newData.activeCommandId == null && newData.activePid == null && newData.status == 'retired' && newData.retiredAt != null",
      onlyUnretiresClientWorker:
        "request.modifiedFields.all(field, field in ['activeCommandId', 'activePid', 'retiredAt', 'status', 'updatedAt']) && data.status == 'retired' && newData.activeCommandId == null && newData.activePid == null && newData.retiredAt == null && newData.status == 'idle'",
    },
    allow: {
      view: "isFactoryMember",
      create: "isFactoryMember && onlyCreatesClientWorker",
      update:
        "isFactoryMember && (onlyQueuesClientWorker || onlyRetiresClientWorker || onlyUnretiresClientWorker)",
      delete: "false",
    },
  },
  factorySkills: {
    bind: {
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryGithubSettings: {
    bind: {
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "false",
      delete: "false",
    },
    fields: {
      tokenEncrypted: "false",
    },
  },
  factoryMcpServers: {
    bind: {
      isFactoryMember:
        "auth.id in data.ref('factory.owner.id') || auth.id in data.ref('factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  factoryMcpCapabilities: {
    bind: {
      isFactoryMember:
        "auth.id in data.ref('mcpServer.factory.owner.id') || auth.id in data.ref('mcpServer.factory.supervisors.user.id')",
    },
    allow: {
      view: "isFactoryMember",
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
      onlyCreatesClientMessageEvent:
        "request.modifiedFields.all(field, field in ['attachments', 'createdAt', 'data', 'source', 'type', 'worker']) && data.source == 'factory' && data.type in ['user_message', 'queued_user_message']",
    },
    allow: {
      view: "isFactoryMember",
      create: "isFactoryMember && onlyCreatesClientMessageEvent",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
