import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_WORKSPACE_KEY = "chaterface:last-workspace";

type LastWorkspace = {
	workspaceId: string;
	workspaceHandle: string;
	userId: string;
};

export async function rememberLastWorkspace(lastWorkspace: LastWorkspace) {
	await AsyncStorage.setItem(LAST_WORKSPACE_KEY, JSON.stringify(lastWorkspace));
}

export async function getRememberedWorkspace(userId: string) {
	const raw = await AsyncStorage.getItem(LAST_WORKSPACE_KEY);

	if (!raw) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<LastWorkspace>;

		if (
			parsed.userId === userId &&
			typeof parsed.workspaceId === "string" &&
			typeof parsed.workspaceHandle === "string"
		) {
			return parsed as LastWorkspace;
		}
	} catch {
		return undefined;
	}
}
