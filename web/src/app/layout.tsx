import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Providers } from "@/components/providers";
import { parseTheme, THEME_COLOR, THEME_COOKIE } from "@/lib/theme";
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

/** Browser UI colour follows the person's theme choice, or the system setting. */
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  if (theme !== "system") return { themeColor: THEME_COLOR[theme], colorScheme: theme };
  return {
    colorScheme: "light dark",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
      { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  // Explicit choices render server-side; "system" leaves it to the CSS media query. No flash either way.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      data-theme={theme === "system" ? undefined : theme}
      className={`${bricolage.variable} ${geist.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
