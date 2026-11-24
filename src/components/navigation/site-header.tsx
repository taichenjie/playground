"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { SectionIcon } from "@/components/ui/section-icon";
import { sections } from "@/features/sections";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Close the mobile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeSlug = sections.find((s) => isActive(s.href))?.slug ?? null;
  const highlighted = hovered ?? activeSlug;

  return (
    <header className="sticky top-0 z-50 border-b-[2.5px] border-ink bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Sections" className="hidden md:block">
          <ul
            className="brut-sm flex items-center gap-1 rounded-full bg-paper p-1"
            onPointerLeave={() => setHovered(null)}
          >
            {sections.map((s) => {
              const active = isActive(s.href);
              return (
                <li key={s.slug} className="relative">
                  {highlighted === s.slug && (
                    <motion.span
                      layoutId="nav-pill"
                      className={`absolute inset-0 rounded-full border-2 border-ink ${s.accent.bg}`}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    onPointerEnter={() => setHovered(s.slug)}
                    onFocus={() => setHovered(s.slug)}
                    onBlur={() => setHovered(null)}
                    className="relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
                  >
                    <SectionIcon slug={s.slug} className="size-4" />
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="brut-sm press inline-flex size-11 items-center justify-center rounded-xl bg-daily md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden>
            <motion.path initial={false} animate={menuOpen ? { d: "M6 6L18 18" } : { d: "M4 7L20 7" }} />
            <motion.path initial={false} animate={{ opacity: menuOpen ? 0 : 1, scaleX: menuOpen ? 0 : 1 }} d="M4 12L20 12" />
            <motion.path initial={false} animate={menuOpen ? { d: "M6 18L18 6" } : { d: "M4 17L20 17" }} />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-nav"
            aria-label="Sections"
            className="overflow-hidden border-t-[2.5px] border-ink md:hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <ul className="mx-auto grid max-w-6xl gap-3 px-4 py-4">
              {sections.map((s, i) => {
                const active = isActive(s.href);
                return (
                  <motion.li
                    key={s.slug}
                    initial={{ x: -40, opacity: 0, rotate: -4 }}
                    animate={{ x: 0, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 * i }}
                  >
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={`brut-sm press flex items-center gap-3 rounded-2xl px-4 py-3 text-lg font-extrabold ${s.accent.bg}`}
                    >
                      <span className="font-mono text-xs">{s.number}</span>
                      <SectionIcon slug={s.slug} className="size-5" />
                      {s.name}
                      {active && <span className="ml-auto font-display text-xs">YOU ARE HERE</span>}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
