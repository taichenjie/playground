"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

const TILE_COLOURS = ["bg-daily", "bg-music", "bg-sports", "bg-casino", "bg-paper"];

/**
 * The wordmark as a row of letter tiles. They flip in on load and do a
 * Mexican wave on hover.
 */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const letters = siteConfig.name.split("");
  const tile =
    size === "lg"
      ? "size-[clamp(1.9rem,8.5vw,5.5rem)] text-[clamp(1.1rem,5.4vw,3.6rem)] border-[3px] rounded-[clamp(4px,1vw,12px)]"
      : "size-[22px] text-[12px] border-2 rounded-[4px] sm:size-[25px] sm:text-[14px]";

  return (
    <Link href="/" aria-label={`${siteConfig.name} home`} className="inline-block">
      <motion.span className="flex gap-[3px]" initial="hidden" animate="shown" whileHover="wave" aria-hidden>
        {letters.map((ch, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={{
              hidden: { rotateY: 90, opacity: 0 },
              shown: (n: number) => ({
                rotateY: 0,
                opacity: 1,
                y: 0,
                transition: { delay: 0.05 * n, type: "spring", stiffness: 300, damping: 18 },
              }),
              wave: (n: number) => ({
                y: [0, -7, 0],
                rotate: [0, n % 2 ? 8 : -8, 0],
                transition: { delay: 0.035 * n, duration: 0.4 },
              }),
            }}
            className={`flex items-center justify-center border-ink font-display leading-none text-ink ${tile} ${
              TILE_COLOURS[i % TILE_COLOURS.length]
            }`}
          >
            {ch}
          </motion.span>
        ))}
      </motion.span>
    </Link>
  );
}
