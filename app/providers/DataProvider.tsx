"use client";

import { init, User } from "@instantdb/react";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import schema from "@/instant.schema";
import { localDb } from "@/lib/localDb";
import { useLiveQuery } from "dexie-react-hooks";
import {
  generateMasterKey,
  importMasterKey,
  decryptData,
} from "@/lib/encryption";

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
  devtool: false,
});

export interface ChatConversation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  source: "local" | "cloud";
  messages?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface DataContextType {
  conversations: ChatConversation[];
  db: typeof db;
  localDb: typeof localDb;
  user: User | null;
  isLoading: boolean;
  masterKey: string | null; // Changed from CryptoKey to string
}

export const DataContext = createContext<DataContextType>({
  conversations: [],
  db,
  localDb,
  user: null,
  isLoading: true,
  masterKey: null,
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = db.useAuth();
  const [masterKey, setMasterKey] = useState<string | null>(null);

  // 1. Key Management
  useEffect(() => {
    async function initKey() {
      if (typeof window === "undefined") return;
      let storedKey = localStorage.getItem("chaterface_master_key");
      if (!storedKey) {
        storedKey = await generateMasterKey();
        localStorage.setItem("chaterface_master_key", storedKey);
      }
      const key = await importMasterKey(storedKey);
      setMasterKey(key);
    }
    initKey();
  }, []);

  // 2. Fetch Cloud Data
  const { isLoading: isCloudLoading, data: cloudData } = db.useQuery(
    user
      ? ({
          conversations: {
            $: {
              where: { "user.id": user.id },
              order: { createdAt: "desc" },
            },
          },
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      : null
  );

  // 3. Fetch Local Data
  const localConversations = useLiveQuery(() =>
    localDb.conversations.orderBy("createdAt").reverse().toArray()
  );

  // 4. Decrypt & Merge
  // We use a state/effect here to handle async decryption of the list
  const [decryptedCloudConvos, setDecryptedCloudConvos] = useState<
    ChatConversation[]
  >([]);

  useEffect(() => {
    async function decrypt() {
      if (!(cloudData as any)?.conversations || !masterKey) {
        setDecryptedCloudConvos([]);
        return;
      }

      const decrypted = await Promise.all(
        (cloudData as any).conversations.map(async (c: any) => ({
          ...c,
          name: await decryptData(c.name, masterKey), // Decrypt Name
          source: "cloud" as const,
          createdAt: c.createdAt as string,
          updatedAt: c.updatedAt as string | undefined, // Cast to fix type mismatch
        }))
      );
      setDecryptedCloudConvos(decrypted);
    }
    decrypt();
  }, [cloudData, masterKey]);

  const conversations = useMemo(() => {
    const local = (localConversations || []).map((c) => ({
      ...c,
      source: "local" as const,
    }));

    return [...decryptedCloudConvos, ...local].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [decryptedCloudConvos, localConversations]);

  const isLoading =
    (user ? isCloudLoading : false) || !localConversations || !masterKey;

  return (
    <DataContext.Provider
      value={{
        conversations,
        db,
        localDb,
        user: user ?? null,
        isLoading,
        masterKey,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
