import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Providers } from "@/components/providers";
import { wagmiConfig } from "@/lib/wagmi";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ShwUp — RSVPs that mean it", template: "%s · ShwUp" },
  description: "Hold your spot with a small deposit. Get it back the second you walk in. Built on Arc.",
  applicationName: "ShwUp",
  appleWebApp: { capable: true, title: "ShwUp", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
