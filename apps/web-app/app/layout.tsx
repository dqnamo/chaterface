import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import AuthGate from "../components/AuthGate";
import ThemeProvider from "../components/ThemeProvider";
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
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#111113" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning={true}>
			<body
				className={`${inter.variable} ${jetBrainsMono.variable} h-dvh w-full bg-grayscale-1`}
			>
				<ThemeProvider>
					<AuthGate>{children}</AuthGate>
				</ThemeProvider>
			</body>
		</html>
	);
}
