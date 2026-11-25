"use client";

import { AnimatePresence, motion } from "motion/react";
import { breakIntoChips, pileBreakdown } from "../economy.ts";

/** Colours per denomination: [face, edge stripes, text]. */
export const CHIP_COLOURS: Record<number, [string, string, string]> = {
  1: ["#f3ede2", "#3b5bff", "#141414"],
  5: ["#ff5a3c", "#f3ede2", "#141414"],
  25: ["#3dd68c", "#f3ede2", "#141414"],
  100: ["#141414", "#f3ede2", "#f3ede2"],
  500: ["#9b5de5", "#f3ede2", "#f3ede2"],
  1000: ["#ffc93c", "#141414", "#141414"],
  5000: ["#ff7eb6", "#141414", "#141414"],
  25000: ["#3b5bff", "#ffc93c", "#f3ede2"],
};

export const chipLabel = (v: number) => (v >= 1000 ? `${v / 1000}K` : String(v));

/** One chip seen from the front (for trays and buttons). */
export function ChipFace({ value, size = 48, label }: { value: number; size?: number; label?: string }) {
  const [face, edge, text] = CHIP_COLOURS[value] ?? CHIP_COLOURS[1];
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink font-display shadow-[2px_3px_0_0_var(--color-ink)]"
      style={{
        width: size,
        height: size,
        fontSize: size * (label && label.length > 3 ? 0.22 : 0.27),
        color: text,
        background: `repeating-conic-gradient(${face} 0deg 20deg, ${edge} 20deg 30deg)`,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full border-2 border-dashed"
        style={{ width: "66%", height: "66%", background: face, borderColor: edge }}
      >
        {label ?? chipLabel(value)}
      </span>
    </span>
  );
}

const MAX_PER_COLUMN = 10;

/**
 * A physical-looking stack of chips for an amount, one column per
 * denomination. New chips drop in from above; removed chips fly off.
 */
export function ChipStack({
  amount,
  size = 34,
  label = true,
  bigLabel = false,
  className = "",
  exitTo = { x: 0, y: -120 },
}: {
  amount: number;
  size?: number;
  label?: boolean;
  /** Larger amount tag (poker table). */
  bigLabel?: boolean;
  className?: string;
  /** Where chips fly when the stack shrinks (e.g. toward the dealer). */
  exitTo?: { x: number; y: number };
}) {
  const columns = breakIntoChips(amount);
  const thickness = size * 0.16;

  return (
    <div className={`inline-flex flex-col items-center ${className}`} aria-label={`${amount.toLocaleString()} chips`} role="img">
      <div className="flex items-end gap-0.5">
        <AnimatePresence>
          {columns.map(({ value, count }) => {
            const [face, edge] = CHIP_COLOURS[value];
            const shown = Math.min(count, MAX_PER_COLUMN);
            return (
              <motion.div
                key={value}
                layout
                className="relative"
                style={{ width: size, height: size * 0.55 + thickness * (shown - 1) }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: exitTo.x, y: exitTo.y, transition: { duration: 0.35 } }}
              >
                {Array.from({ length: shown }, (_, i) => (
                  <motion.span
                    key={i}
                    className="absolute left-0 rounded-[50%] border-2 border-ink"
                    style={{
                      width: size,
                      height: size * 0.55,
                      bottom: i * thickness,
                      background: `repeating-linear-gradient(90deg, ${face} 0 ${size * 0.18}px, ${edge} ${size * 0.18}px ${size * 0.26}px)`,
                      zIndex: i,
                    }}
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 24, delay: i * 0.025 }}
                  >
                    {i === shown - 1 && (
                      <span
                        className="absolute inset-[3px] rounded-[50%] border border-dashed"
                        style={{ background: face, borderColor: edge }}
                      />
                    )}
                  </motion.span>
                ))}
                {count > MAX_PER_COLUMN && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold">×{count}</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {label && amount > 0 && (
        <motion.span
          key={amount}
          className={`mt-1 rounded-full border-2 border-ink bg-ink font-mono font-bold text-paper ${bigLabel ? "px-2.5 py-0.5 text-sm" : "px-2 text-[11px]"}`}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
        >
          {amount.toLocaleString()}
        </motion.span>
      )}
    </div>
  );
}

const PILE_COLUMN = 7;

/**
 * The pot as a real pile of chips: smaller chips, many columns, so the pile
 * visibly grows as the pot does. Columns are arranged in two staggered rows.
 */
export function PotPile({ amount, unit, size = 32 }: { amount: number; unit: number; size?: number }) {
  const columns: number[][] = [];
  for (const { value, count } of pileBreakdown(amount, unit)) {
    for (let left = count; left > 0; left -= PILE_COLUMN) columns.push(Array(Math.min(PILE_COLUMN, left)).fill(value));
  }
  const thickness = size * 0.16;
  const back = columns.filter((_, i) => i % 2 === 1);
  const front = columns.filter((_, i) => i % 2 === 0);

  const row = (cols: number[][], offset: number) => (
    <div className="flex items-end justify-center" style={{ marginTop: offset }}>
      <AnimatePresence>
        {cols.map((col, ci) => (
          <motion.div
            key={`${col[0]}-${ci}`}
            className="relative -mx-[3px]"
            style={{ width: size, height: size * 0.55 + thickness * (col.length - 1) }}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            {col.map((value, i) => {
              const [face, edge] = CHIP_COLOURS[value];
              return (
                <span
                  key={i}
                  className="absolute left-0 rounded-[50%] border-2 border-ink"
                  style={{
                    width: size,
                    height: size * 0.55,
                    bottom: i * thickness,
                    background: `repeating-linear-gradient(90deg, ${face} 0 ${size * 0.18}px, ${edge} ${size * 0.18}px ${size * 0.26}px)`,
                    zIndex: i,
                  }}
                >
                  {i === col.length - 1 && (
                    <span className="absolute inset-[3px] rounded-[50%] border border-dashed" style={{ background: face, borderColor: edge }} />
                  )}
                </span>
              );
            })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Pot of ${amount.toLocaleString()} chips`}>
      {back.length > 0 && row(back, 0)}
      <div style={{ marginTop: back.length ? -size * 0.35 : 0 }}>{row(front, 0)}</div>
    </div>
  );
}
