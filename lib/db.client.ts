import { init } from "@instantdb/react";
import schema from "@/instant.schema";

const instantAppId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;

export const hasInstantConfig = Boolean(instantAppId);

export const db = instantAppId
  ? init({
      appId: instantAppId,
      schema,
      useDateObjects: true,
    })
  : null;

export type AppDb = NonNullable<typeof db>;
