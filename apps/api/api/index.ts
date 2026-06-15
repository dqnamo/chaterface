import { createApp } from "../src/app.js";

const appPromise = createApp();

export default {
	async fetch(request: Request) {
		const app = await appPromise;

		return app.fetch(request);
	},
};
