import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "./components/AppLayout";
import { ModalProvider } from "./providers/ModalProvider";
import WebAnalytics from "./components/WebAnalytics";
import { headers } from "next/headers";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Chaterface",
  description: "Interface To Intelligence.",
  appleWebApp: {
    title: "Chaterface",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

async function AnalyticsWrapper() {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") || undefined;
  const city = headersList.get("x-vercel-ip-city") || undefined;
  const region = headersList.get("x-vercel-ip-country-region") || undefined;

  return <WebAnalytics country={country} city={city} region={region} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-gray-2 dark:bg-neutral-950`}
      >
        <Suspense>
          <AnalyticsWrapper />
        </Suspense>
        <ModalProvider>
          <AppLayout>{children}</AppLayout>
        </ModalProvider>
      </body>
    </html>
  );
}
