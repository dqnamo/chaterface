"use client";

import { init } from "@instantdb/react";
import { createContext, useContext, useEffect } from "react";
import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";
import schema from "@/instant.schema";
import { DateTime } from "luxon";

const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  schema,
  devtool: false,
});

export const DataContext = createContext({
  conversations: [] as InstaQLEntity<AppSchema, "conversations", object>[],
  db,
  // user: null as InstaQLEntity<AppSchema, "$users", object> | null,
  isLoading: true,
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // const { user } = useAuth();

  const query = {
    conversations: {},
  };

  const { isLoading, error, data } = db.useQuery(query);

  // Consider it loading if we don't have a user yet or if the query is loading
  // const effectiveIsLoading = !user || isLoading;

  return (
    <DataContext.Provider
      value={{
        conversations: (data?.conversations || []) as InstaQLEntity<
          AppSchema,
          "conversations",
          object
        >[],
        db,
        isLoading: isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
