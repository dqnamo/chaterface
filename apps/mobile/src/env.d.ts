declare namespace NodeJS {
	interface ProcessEnv {
		EXPO_PUBLIC_INSTANT_APP_ID?: string;
	}
}

declare const process: {
	env: NodeJS.ProcessEnv;
};
