"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSection } from "@/features/sections";
import { CasinoHud } from "./casino-hud";

const casino = getSection("casino");

/**
 * The strip at the top of every casino page: game tabs on the left, the
 * shared bankroll and league progress on the right. The lobby shows the
 * full league panel instead, so the bar hides its bankroll there.
 */
export function CasinoBar() {
  const pathname = usePathname();
  const inLobby = pathname === casino.href;
  const tabs = [{ name: "Lobby", href: casino.href }, ...casino.planned.map((g) => ({ name: g.short ?? g.name, href: g.href }))];

  return (
    <div
      className="border-b-2 border-gold/50"
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25))" }}
    >
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 py-2 sm:px-4">
        <nav aria-label="Casino games" className="-mx-1 max-w-full overflow-x-auto">
          <ul className="flex items-center gap-1 px-1 py-0.5">
            {tabs.map((t) => {
              const active = t.href === pathname;
              if (!t.href) {
                return (
                  <li key={t.name}>
                    <span
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap opacity-45"
                      title="Coming soon"
                    >
                      {t.name}
                      <span className="font-mono text-[9px] uppercase">soon</span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={t.name} className="relative">
                  {active && (
                    <motion.span
                      layoutId="casino-tab"
                      className="absolute inset-0 rounded-full border-2 border-ink"
                      style={{ background: "var(--color-gold)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative block rounded-full px-3 py-1 text-xs font-extrabold whitespace-nowrap transition-colors ${
                      active ? "text-ink" : "hover:text-gold"
                    }`}
                  >
                    {t.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {!inLobby && <CasinoHud compact />}
      </div>
    </div>
  );
}
