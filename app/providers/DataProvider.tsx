"use client";

import { init, User } from "@instantdb/react";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import schema from "@/instant.schema";

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
  devtool: false,
});

interface DataContextType {
  conversations: InstaQLEntity<
    AppSchema,
    "conversations",
    { messages: object }
  >[];
  db: typeof db;
  user: User | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  isGuest: boolean;
}

export const DataContext = createContext<DataContextType>({
  conversations: [],
  db,
  user: null,
  isLoading: true,
  isAuthLoading: true,
  isGuest: false,
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading, user } = db.useAuth();
  const [guestSignInState, setGuestSignInState] = useState<
    "idle" | "signing-in" | "done"
  >("idle");
  const isSigningInRef = useRef(false);

  // Auto sign-in as guest if no user after auth check completes
  useEffect(() => {
    if (!isAuthLoading && !user) {
      alert("Signing in as guest");
      db.auth.signInAsGuest();
    }
  }, [isAuthLoading, user]);

  // Reset state if user signs out
  useEffect(() => {
    if (user) {
      isSigningInRef.current = false;
    }
  }, [user]);

  const { isLoading, data } = db.useQuery(
    user
      ? {
          conversations: {
            $: {
              where: {
                "user.id": user.id,
              },
              order: {
                serverCreatedAt: "desc",
              },
            },
            messages: {},
          },
        }
      : null
  );

  const isGuest = user ? "isGuest" in user && !!user.isGuest : false;

  // Still loading if: auth is loading, or we're signing in as guest
  const effectiveAuthLoading =
    isAuthLoading || (!user && guestSignInState !== "done");

  return (
    <DataContext.Provider
      value={{
        conversations: data?.conversations || [],
        db,
        user: user ?? null,
        isLoading: isLoading,
        isAuthLoading: effectiveAuthLoading,
        isGuest,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
