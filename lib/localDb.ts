import Dexie, { Table } from 'dexie';

export interface LocalMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Plain text locally
  model?: string;
  reasoning?: string; // Plain text locally
  createdAt: string;
  usage?: any;
  annotations?: any[];
}

export interface LocalConversation {
  id: string;
  name: string; // Plain text locally
  createdAt: string;
  updatedAt: string;
}

export class ChatDB extends Dexie {
  conversations!: Table<LocalConversation>;
  messages!: Table<LocalMessage>;

  constructor() {
    super('ChaterfaceDB');
    this.version(1).stores({
      conversations: 'id, createdAt',
      messages: 'id, conversationId, createdAt'
    });
  }
}

export const localDb = new ChatDB();
