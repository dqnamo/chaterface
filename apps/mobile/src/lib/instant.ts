import { init } from "@instantdb/react-native";
import schema from "@repo/db/schema";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId) {
	throw new Error(
		"EXPO_PUBLIC_INSTANT_APP_ID is not set. Copy .env.example to .env and fill it in.",
	);
}

/**
 * The mobile app talks to InstantDB directly, exactly like the web app does.
 * Tasks, turns, and agent events are all plain transactions against this
 * client — the API service is only needed for sandbox-side work.
 */
const db = init({ appId, schema });

export default db;
