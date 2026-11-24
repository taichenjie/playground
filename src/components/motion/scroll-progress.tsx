"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Four-colour progress bar across the top of the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-1.5 origin-left"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, var(--color-daily) 0 25%, var(--color-music) 25% 50%, var(--color-sports) 50% 75%, var(--color-casino) 75% 100%)",
      }}
    />
  );
}
