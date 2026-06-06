import { id, init } from "@instantdb/admin";
import schema from "@repo/db/schema";

const db = init({
	appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
	adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
	schema: schema,
});

export { id };
export default db;
