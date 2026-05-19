import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Pirata_One } from "next/font/google";
import "../styles/globals.css";
import PwaRegister from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Factory",
  description: "A Next.js starter using Chord UI, InstantDB, and Trigger.dev",
  applicationName: "FactoryPlane",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FactoryPlane",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${pirataOne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-grayscale-1 text-grayscale-12">
        <ThemeProvider>
          <PwaRegister />
          <div className="root">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
