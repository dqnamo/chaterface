import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_FACTORY_KEY = "factoryplane:last-factory";

type LastFactory = {
	factoryId: string;
	orgHandle: string;
	userId: string;
};

export async function rememberLastFactory(lastFactory: LastFactory) {
	await AsyncStorage.setItem(LAST_FACTORY_KEY, JSON.stringify(lastFactory));
}

export async function getRememberedFactory(userId: string) {
	const raw = await AsyncStorage.getItem(LAST_FACTORY_KEY);

	if (!raw) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<LastFactory>;

		if (
			parsed.userId === userId &&
			typeof parsed.factoryId === "string" &&
			typeof parsed.orgHandle === "string"
		) {
			return parsed as LastFactory;
		}
	} catch {
		return undefined;
	}
}
