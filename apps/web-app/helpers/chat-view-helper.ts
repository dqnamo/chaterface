export const CHAT_VIEW_MODES = ["minified", "full"] as const;

export type ChatViewMode = (typeof CHAT_VIEW_MODES)[number];

export const DEFAULT_CHAT_VIEW_MODE: ChatViewMode = "full";

const CHAT_VIEW_MODE_STORAGE_KEY = "factoryplane.chat.defaultView";

export function toChatViewMode(value: unknown): ChatViewMode {
	return value === "minified" || value === "full"
		? value
		: DEFAULT_CHAT_VIEW_MODE;
}

export function getStoredDefaultChatViewMode(): ChatViewMode {
	if (typeof window === "undefined") {
		return DEFAULT_CHAT_VIEW_MODE;
	}

	return toChatViewMode(
		window.localStorage.getItem(CHAT_VIEW_MODE_STORAGE_KEY),
	);
}

export function setStoredDefaultChatViewMode(value: ChatViewMode) {
	window.localStorage.setItem(CHAT_VIEW_MODE_STORAGE_KEY, value);
}
