import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://princeheadout.vercel.app"),
  title: {
    default: "PRINCE // WORLD",
    template: "%s — PRINCE // WORLD",
  },
  description:
    "An explorable real-time digital universe. Enter the world. Explore. Connect. Discover. Unlock. Meet Prince.",
  applicationName: "PRINCE // WORLD.OS",
  keywords: [
    "Prince",
    "PrinceAscending",
    "digital world",
    "explorable website",
    "WebGL",
    "interactive experience",
  ],
  authors: [{ name: "Prince", url: "https://github.com/PrinceAscending" }],
  openGraph: {
    title: "PRINCE // WORLD",
    description: "An explorable real-time digital universe.",
    url: "https://princeheadout.vercel.app",
    siteName: "PRINCE // WORLD",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "PRINCE // WORLD — an explorable real-time digital universe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PRINCE // WORLD",
    description: "An explorable real-time digital universe.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#04040a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${mono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
