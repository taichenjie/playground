"use client";

import { motion } from "motion/react";

const COLOURS = ["bg-daily", "bg-music", "bg-sports", "bg-casino"];

/** Big letter tiles that drop from above and land with a bounce. Drag them. */
export function FallingTiles({ text }: { text: string }) {
  return (
    <div className="flex justify-center gap-4" aria-label={text} role="img">
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          drag
          dragSnapToOrigin
          dragElastic={0.6}
          initial={{ y: -420, rotate: i % 2 ? 40 : -40, opacity: 0 }}
          animate={{ y: 0, rotate: i % 2 ? 5 : -6, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 11, delay: 0.15 * i }}
          whileHover={{ scale: 1.06 }}
          className={`brut flex size-28 cursor-grab touch-none items-center justify-center rounded-3xl font-display text-7xl sm:size-36 sm:text-8xl ${
            COLOURS[i % COLOURS.length]
          }`}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}
