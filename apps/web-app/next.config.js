import { resolve } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: [
		"app.interface.ngrok.pro",
		"api.interface.ngrok.pro",
		"*.interface.ngrok.pro",
		"*.previews.chaterface.com",
	],
	outputFileTracingRoot: resolve(process.cwd(), "../.."),
};

export default nextConfig;
