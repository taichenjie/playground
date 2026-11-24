"use client";

import { motion } from "motion/react";

/** Springs its content up into place the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  rotate = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  rotate?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, rotate }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A rubber stamp that slams onto the page when it scrolls into view. */
export function Stamp({
  children,
  className = "",
  rotate = -10,
  delay = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  delay?: number;
}) {
  return (
    <motion.span
      className={`inline-block shrink-0 rounded-md border-2 border-current px-2 py-0.5 font-display whitespace-nowrap text-[11px] tracking-wider uppercase ${className}`}
      initial={{ opacity: 0, scale: 2.6, rotate: rotate - 14 }}
      whileInView={{ opacity: 1, scale: 1, rotate }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 520, damping: 20, delay }}
    >
      {children}
    </motion.span>
  );
}
