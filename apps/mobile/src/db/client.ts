import "react-native-get-random-values";

import { init } from "@instantdb/react-native";
import schema from "../../../web-app/instant.schema";

const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

const db = init({
	appId: appId || "missing-expo-public-instant-app-id",
	schema,
});

export default db;
