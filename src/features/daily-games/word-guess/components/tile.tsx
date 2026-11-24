"use client";

import { motion } from "motion/react";
import type { Mark } from "../logic.ts";

/** Colours as hex so Motion can animate between them (keep in sync with globals.css). */
export const MARK_COLOURS: Record<Mark | "empty", { bg: string; fg: string }> = {
  empty: { bg: "#f3ede2", fg: "#141414" },
  hit: { bg: "#3dd68c", fg: "#141414" },
  near: { bg: "#3b5bff", fg: "#f3ede2" },
  miss: { bg: "#a39b8e", fg: "#f3ede2" },
};

const BASE =
  "flex aspect-square w-full items-center justify-center rounded-[10px] border-[2.5px] border-ink font-display text-[clamp(1.4rem,7vw,2rem)] leading-none uppercase select-none";

type Props = {
  letter?: string;
  mark?: Mark;
  /** Index within the row, used to stagger animations. */
  index: number;
  /** Play the flip-to-reveal animation. */
  reveal?: boolean;
  /** Play the victory hop. */
  bounce?: boolean;
};

export function Tile({ letter = "", mark, index, reveal = false, bounce = false }: Props) {
  // A submitted tile.
  if (mark) {
    const colours = MARK_COLOURS[mark];
    const delay = index * 0.25;
    return (
      <motion.div
        className={BASE}
        style={reveal ? undefined : { backgroundColor: colours.bg, color: colours.fg }}
        initial={reveal ? { rotateX: 0, backgroundColor: MARK_COLOURS.empty.bg, color: MARK_COLOURS.empty.fg } : false}
        animate={{
          rotateX: reveal ? [0, 90, 0] : 0,
          backgroundColor: colours.bg,
          color: colours.fg,
          y: bounce ? [0, -22, 0, -6, 0] : 0,
        }}
        transition={{
          rotateX: { duration: 0.5, delay, times: [0, 0.5, 1], ease: "easeInOut" },
          backgroundColor: { duration: 0, delay: reveal ? delay + 0.25 : 0 },
          color: { duration: 0, delay: reveal ? delay + 0.25 : 0 },
          y: { duration: 0.6, delay: index * 0.09, ease: "easeOut" },
        }}
      >
        {letter}
      </motion.div>
    );
  }

  // A tile in the row being typed, or an empty one.
  return (
    <motion.div
      key={letter || "empty"}
      className={`${BASE} bg-paper ${letter ? "shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/25"}`}
      initial={letter ? { scale: 0.75 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 700, damping: 18 }}
    >
      {letter}
    </motion.div>
  );
}
