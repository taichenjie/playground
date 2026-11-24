import type { Metadata, Viewport } from "next";
import { Archivo, Bungee, Space_Mono } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { BurstLayer } from "@/components/motion/burst";
import { Cursor } from "@/components/motion/cursor";
import { MotionProviders } from "@/components/motion/providers";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SiteHeader } from "@/components/navigation/site-header";
import { siteConfig } from "@/config/site";
import "./globals.css";

/** Variable font with weight and width axes (used for the swelling headlines). */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

/** Arcade-signage display face for the logo, labels and tickers. */
const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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
