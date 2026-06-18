import { init } from "@instantdb/react-native";
import schema from "./instant.schema";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId) {
	console.warn("Missing EXPO_PUBLIC_INSTANT_APP_ID for the mobile app.");
}

const db = init({
	appId: appId ?? "missing-instant-app-id",
	schema,
});

export default db;
export { id } from "@instantdb/react-native";
