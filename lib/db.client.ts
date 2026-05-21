import { init } from "@instantdb/react";
import schema from "@/instant.schema";

const instantAppId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;

if (!instantAppId) {
  throw new Error("Missing NEXT_PUBLIC_INSTANT_APP_ID");
}

export const db = init({
  appId: instantAppId,
  schema,
  useDateObjects: true,
});

export type AppDb = typeof db;
