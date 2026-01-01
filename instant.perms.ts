// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  conversations: {
    bind: [
      "isOwner",
      "auth.id in data.ref('user.id')",
    ],
    allow: {
      view: "isOwner",
      create: "auth.id != null",
      update: "isOwner",
      delete: "isOwner",
    },
  },
  messages: {
    bind: [
      "isConversationOwner",
      "auth.id in data.ref('conversation.user.id')",
    ],
    allow: {
      view: "isConversationOwner",
      create: "auth.id != null",
      update: "isConversationOwner",
      delete: "isConversationOwner",
    },
  },
  $users: {
    allow: {
      view: "auth.id == data.id",
      create: "false", // Users are created by the auth system
      update: "auth.id == data.id",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
