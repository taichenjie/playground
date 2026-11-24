"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ToyBox } from "@/components/home/toy-box";
import { Magnetic } from "@/components/motion/magnetic";
import { ProximityText } from "@/components/motion/proximity-text";
import { siteConfig } from "@/config/site";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.12fr_0.88fr]">
      <div>
        <motion.p
          className="brut-sm inline-block rounded-full bg-daily px-4 py-1.5 font-display text-[11px] tracking-wider sm:text-xs"
          initial={{ opacity: 0, scale: 0.6, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -3 }}
          transition={{ type: "spring", stiffness: 400, damping: 14 }}
        >
          {siteConfig.tagline}
        </motion.p>

        <ProximityText
          className="mt-6 text-[clamp(2.7rem,7.6vw,5.3rem)] leading-[0.95] tracking-[-0.02em] uppercase"
          words={[
            { text: "Your" },
            { text: "daily" },
            { text: "dose" },
            { text: "of" },
            {
              text: "play!",
              className:
                "wobble mt-2 rounded-2xl border-[3px] border-ink bg-pop px-[0.18em] pb-[0.04em] text-paper shadow-[6px_6px_0_0_var(--color-ink)]",
            },
          ]}
        />

        <motion.p
          className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {siteConfig.description}
        </motion.p>

        <motion.div
          className="mt-9 flex flex-wrap items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <Magnetic>
            <a
              href="#today"
              data-burst
              className="brut press inline-flex items-center gap-2 rounded-full bg-pop px-7 py-3.5 font-extrabold text-paper"
            >
              See today’s games <span aria-hidden>↓</span>
            </a>
          </Magnetic>
          <Magnetic>
            <Link
              href="/daily-games"
              className="brut press inline-flex items-center rounded-full bg-paper px-7 py-3.5 font-extrabold"
            >
              Browse puzzles
            </Link>
          </Magnetic>
        </motion.div>

        <motion.p
          className="relative mt-7 inline-block font-mono text-sm font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          No account needed. Just play.
          <svg viewBox="0 0 300 16" className="absolute -bottom-3 left-0 h-3 w-full" aria-hidden preserveAspectRatio="none">
            <motion.path
              d="M2 10 C 40 2, 70 14, 110 8 S 180 2, 220 9 S 280 12, 298 5"
              fill="none"
              stroke="var(--color-casino)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: "easeInOut" }}
            />
          </svg>
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, rotate: 6, y: 40 }}
        animate={{ opacity: 1, rotate: 1.5, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.3 }}
      >
        <ToyBox />
      </motion.div>
    </section>
  );
}
