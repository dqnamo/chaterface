import "server-only";

import { init } from "@instantdb/admin";
import schema from "@/instant.schema";

let adminDb: ReturnType<typeof init<typeof schema>> | null = null;

export function getAdminDb() {
  const appId =
    process.env.INSTANT_APP_ID ?? process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  const adminToken =
    process.env.INSTANT_APP_ADMIN_TOKEN ?? process.env.INSTANT_ADMIN_TOKEN;

  if (!appId) {
    throw new Error("Missing INSTANT_APP_ID or NEXT_PUBLIC_INSTANT_APP_ID");
  }

  if (!adminToken) {
    throw new Error("Missing INSTANT_APP_ADMIN_TOKEN or INSTANT_ADMIN_TOKEN");
  }

  if (!adminDb) {
    adminDb = init({
      adminToken,
      appId,
      schema,
    });
  }

  return adminDb;
}
