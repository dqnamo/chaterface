// Docs: https://www.instantdb.com/docs/modeling-data

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
      settings: i.json().optional(),
    }),
    interfaces: i.entity({
      subdomain: i.string().unique().indexed(),
      openrouterApiKey: i.string().optional(),
      name: i.string(),
      createdAt: i.date().indexed(),
    }),
    conversations: i.entity({
      name: i.string(),
      createdAt: i.date().indexed(),
      updatedAt: i.date().indexed(),
    }),
    messages: i.entity({
      createdAt: i.date().indexed(),
      content: i.string(),
      role: i.string(),
      model: i.string().optional(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    interfaceConversations: {
      forward: {
        on: "conversations",
        has: "one",
        label: "interface",
      },
      reverse: {
        on: "interfaces",
        has: "many",
        label: "conversations",
      },
    },
    userConversations: {
      forward: {
        on: "conversations",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "conversations",
      },
    },
    conversationMessages: {
      forward: {
        on: "messages",
        has: "one",
        label: "conversation",
      },
      reverse: {
        on: "conversations",
        has: "many",
        label: "messages",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
