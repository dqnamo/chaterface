import { init } from "@instantdb/react";
import schema from "./instant.schema";

const db = init({
	appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
	schema,
});

export default db;
