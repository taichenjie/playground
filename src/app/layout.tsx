import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/layout/site-footer";
import { BurstLayer } from "@/components/motion/burst";
import { Cursor } from "@/components/motion/cursor";
import { MotionProviders } from "@/components/motion/providers";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SiteHeader } from "@/components/navigation/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

/*
 * Fonts are bundled in ./fonts (SIL Open Font License, see the OFL files there)
 * so the site never depends on reaching Google Fonts at build or run time.
 */

/** Variable font with weight and width axes (used for the swelling headlines). */
const archivo = localFont({
  variable: "--font-archivo",
  src: [{ path: "./fonts/archivo-latin-wdth-normal.woff2", weight: "100 900", style: "normal" }],
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** Arcade-signage display face for the logo, labels and tickers. */
const bungee = localFont({
  variable: "--font-bungee",
  src: [{ path: "./fonts/bungee-latin-400-normal.woff2", weight: "400", style: "normal" }],
});

const spaceMono = localFont({
  variable: "--font-space-mono",
  src: [
    { path: "./fonts/space-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/space-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#f3ede2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bungee.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="dots flex min-h-full flex-col overflow-x-clip font-sans">
        <MotionProviders>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
          >
            Skip to content
          </a>
          <ScrollProgress />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BurstLayer />
          <Cursor />
        </MotionProviders>
      </body>
    </html>
  );
}
