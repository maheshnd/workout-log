import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  fallback: ["system-ui", "sans-serif"],
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cond",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Gym Log",
  description: "What did I lift last time, and what should I try today?",
  applicationName: "Gym Log",
  appleWebApp: { capable: true, title: "Gym Log", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: `${BASE}/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${BASE}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C252C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
