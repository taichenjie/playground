"use client";

import { motion } from "motion/react";
import { useEffect } from "react";

/**
 * Page transition. A template re-mounts on every navigation, so each new
 * page is revealed by colour panels sliding away. Skipped on the very
 * first load so the page isn't hidden while JavaScript starts up.
 */
let hasNavigated = false;

const PANELS = ["bg-daily", "bg-music", "bg-sports", "bg-faces", "bg-casino"];

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = hasNavigated;

  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <>
      {animate && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] flex">
          {PANELS.map((bg, i) => (
            <motion.div
              key={bg}
              className={`h-full flex-1 origin-top border-x border-ink ${bg}`}
              initial={{ scaleY: 1 }}
              animate={{ scaleY: 0 }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: i * 0.06 }}
            />
          ))}
        </div>
      )}
      <motion.div
        initial={animate ? { opacity: 0, y: 24 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}
