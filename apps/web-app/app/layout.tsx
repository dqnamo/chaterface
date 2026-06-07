import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import AuthGate from "../components/AuthGate";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});
const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
	title: "Factoryplane",
	description: "Manage your factories, agents, and tasks.",
	applicationName: "Factoryplane",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Factoryplane",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	viewportFit: "cover",
	themeColor: "#ffffff",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} ${jetBrainsMono.variable} h-dvh w-full bg-grayscale-1`}>
				<AuthGate>{children}</AuthGate>
			</body>
		</html>
	);
}
