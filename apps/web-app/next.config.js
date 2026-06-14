/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: [
		"app.interface.ngrok.pro",
		"api.interface.ngrok.pro",
		"*.interface.ngrok.pro",
		"*.previews.factoryplane.com",
	],
};

export default nextConfig;
