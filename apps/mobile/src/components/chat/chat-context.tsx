import { createContext, use } from "react";

export type ChatContextValue = {
	input: string;
	setInput: (value: string) => void;
	/** True while a turn is in flight, which disables the submit button. */
	isGenerating: boolean;
	onSend: () => void;
	error?: Error | null;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider = ChatContext.Provider;

export function useChatContext() {
	const ctx = use(ChatContext);

	if (!ctx) {
		throw new Error("useChatContext must be used within <ChatProvider>");
	}

	return ctx;
}
