// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  conversations: {
    bind: [
      "isOwner",
      "auth.id in data.ref('user.id')",
      // Allow access to conversations from linked guest users (after upgrade)
      "isGuestOwner",
      "data.ref('user.id')[0] in auth.ref('$user.linkedGuestUsers.id')",
    ],
    allow: {
      view: "isOwner || isGuestOwner",
      create: "auth.id != null",
      update: "isOwner || isGuestOwner",
      delete: "isOwner || isGuestOwner",
    },
  },
  messages: {
    bind: [
      "isConversationOwner",
      "auth.id in data.ref('conversation.user.id')",
      // Allow access to messages from linked guest users (after upgrade)
      "isGuestConversationOwner",
      "data.ref('conversation.user.id')[0] in auth.ref('$user.linkedGuestUsers.id')",
    ],
    allow: {
      view: "isConversationOwner || isGuestConversationOwner",
      create: "auth.id != null",
      update: "isConversationOwner || isGuestConversationOwner",
      delete: "isConversationOwner || isGuestConversationOwner",
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
  $files: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
} satisfies InstantRules;

export default rules;
