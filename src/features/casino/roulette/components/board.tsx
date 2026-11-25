"use client";

import { AnimatePresence, motion } from "motion/react";
import { DENOMINATIONS } from "../../economy.ts";
import { ChipFace } from "../../components/chip-stack";
import { OUTSIDE, colourOf, insideKey, numbersFor, type Bets } from "../logic.ts";

/*
 * The betting layout, drawn on a 14 × 5 grid of units:
 *   x 0      zero (rows 0–2)
 *   x 1–12   numbers, three rows (top row 3, 6 … 36; bottom row 1, 4 … 34)
 *   x 13     the three "2 to 1" column bets
 *   row 3    dozens, row 4 the even-money bets
 * Thin hit zones on the lines between numbers place splits, streets,
 * corners and six lines, just like sliding a chip onto a line at a table.
 */

const COLS = 14;
const ROWS = 5;
const ROW_H = 1.3; // cell height relative to width

type Zone = { key: string; cx: number; cy: number; w: number; h: number; edge: boolean };

const cellOf = (n: number) => ({ x: 1 + Math.floor((n - 1) / 3), y: 2 - ((n - 1) % 3) });

function buildZones(): Zone[] {
  const zones: Zone[] = [];
  const box = (key: string, x: number, y: number, w: number, h: number) =>
    zones.push({ key, cx: x + w / 2, cy: y + h / 2, w, h, edge: false });
  const line = (ns: number[], cx: number, cy: number, w: number, h: number) =>
    zones.push({ key: insideKey(ns), cx, cy, w, h, edge: true });

  box("0", 0, 0, 1, 3);
  for (let n = 1; n <= 36; n++) {
    const { x, y } = cellOf(n);
    box(String(n), x, y, 1, 1);
  }
  box("column3", 13, 0, 1, 1);
  box("column2", 13, 1, 1, 1);
  box("column1", 13, 2, 1, 1);
  ["dozen1", "dozen2", "dozen3"].forEach((k, i) => box(k, 1 + i * 4, 3, 4, 1));
  ["low", "even", "red", "black", "odd", "high"].forEach((k, i) => box(k, 1 + i * 2, 4, 2, 1));

  const E = 0.34; // thickness of a line zone, in units
  for (let n = 1; n <= 36; n++) {
    const { x, y } = cellOf(n);
    const lastCol = n > 33;
    if (!lastCol) line([n, n + 3], x + 1, y + 0.5, E, 0.55);
    if (n % 3 !== 0) line([n, n + 1], x + 0.5, y, 0.6, E);
    if (n % 3 !== 0 && !lastCol) line([n, n + 1, n + 3, n + 4], x + 1, y, E, E);
    if (n % 3 === 1) line([n, n + 1, n + 2], x + 0.5, 3, 0.6, E);
    if (n % 3 === 1 && !lastCol) line([n, n + 1, n + 2, n + 3, n + 4, n + 5], x + 1, 3, E, E);
    if (x === 1) line([0, n], 1, y + 0.5, E, 0.55);
  }
  line([0, 1, 2], 1, 2, E, E);
  line([0, 2, 3], 1, 1, E, E);
  line([0, 1, 2, 3], 1, 3, E, E);
  return zones;
}

export const ZONES = buildZones();
const CENTRE = new Map(ZONES.map((z) => [z.key, z]));

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

const CELL_BG = { red: "#b3192b", black: "#161616", green: "#0e8a4f" } as const;

function largestChip(amount: number) {
  return DENOMINATIONS.find((d) => d <= amount) ?? 1;
}

export function Board({
  bets,
  hover,
  onHover,
  onPlace,
  result,
  disabled,
}: {
  bets: Bets;
  hover: string | null;
  onHover: (key: string | null) => void;
  onPlace: (key: string) => void;
  result: number | null;
  disabled: boolean;
}) {
  const lit = new Set(hover ? numbersFor(hover) : []);
  const winners = result === null ? null : new Set(Object.keys(bets).filter((k) => numbersFor(k).includes(result)));

  const boxStyle = (x: number, y: number, w: number, h: number) => ({
    left: pct(x, COLS),
    top: pct(y, ROWS),
    width: pct(w, COLS),
    height: pct(h, ROWS),
  });

  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: `${COLS} / ${ROWS * ROW_H}` }}
      onPointerLeave={() => onHover(null)}
    >
      {/* Painted layout */}
      <div className="absolute inset-0 overflow-hidden rounded-xl border-[3px] border-gold/80" aria-hidden>
        {ZONES.filter((z) => !z.edge).map((z) => {
          const x = z.cx - z.w / 2;
          const y = z.cy - z.h / 2;
          const isNumber = !Number.isNaN(Number(z.key));
          const n = Number(z.key);
          const covered = isNumber ? lit.has(n) : hover === z.key;
          const won = result !== null && isNumber && n === result;
          return (
            <div
              key={z.key}
              className="absolute flex items-center justify-center border border-paper/60 font-display text-paper transition-[filter,box-shadow] duration-150"
              style={{
                ...boxStyle(x, y, z.w, z.h),
                background: isNumber ? CELL_BG[colourOf(n)] : "transparent",
                fontSize: "clamp(10px, 1.5vw, 17px)",
                filter: covered ? "brightness(1.45)" : undefined,
                boxShadow: won
                  ? "inset 0 0 0 3px #ffd678, 0 0 22px 6px rgba(255,214,120,0.8)"
                  : covered
                    ? "inset 0 0 0 2px #ffd678"
                    : undefined,
                zIndex: won ? 2 : undefined,
                borderTopLeftRadius: z.key === "0" ? "40% 50%" : undefined,
                borderBottomLeftRadius: z.key === "0" ? "40% 50%" : undefined,
              }}
            >
              {isNumber ? (
                z.key
              ) : z.key === "red" || z.key === "black" ? (
                <span
                  className="block h-[42%] w-[38%] border border-paper/70"
                  style={{ background: CELL_BG[z.key], clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
                />
              ) : (
                <span className="text-center text-[clamp(8px,1.1vw,13px)] leading-tight">
                  {z.key.startsWith("column") ? "2 to 1" : OUTSIDE[z.key].label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hit zones (boxes first, line zones on top) */}
      {[...ZONES.filter((z) => !z.edge), ...ZONES.filter((z) => z.edge)].map((z) => (
        <button
          key={`hit-${z.key}`}
          type="button"
          disabled={disabled}
          aria-label={`Bet on ${z.key}`}
          className="absolute z-10 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{ ...boxStyle(z.cx - z.w / 2, z.cy - z.h / 2, z.w, z.h), zIndex: z.edge ? 11 : 10 }}
          onPointerEnter={() => onHover(z.key)}
          onFocus={() => onHover(z.key)}
          onClick={() => onPlace(z.key)}
        />
      ))}

      {/* Chips */}
      <AnimatePresence>
        {Object.entries(bets).map(([key, amount]) => {
          const z = CENTRE.get(key);
          if (!z) return null;
          const lost = winners !== null && !winners.has(key);
          return (
            <motion.div
              key={key}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: pct(z.cx, COLS), top: pct(z.cy, ROWS) }}
              initial={{ scale: 1.6, opacity: 0, y: -24 }}
              animate={
                winners?.has(key)
                  ? { scale: [1, 1.25, 1], opacity: 1, y: 0 }
                  : { scale: 1, opacity: lost ? 0.25 : 1, y: 0 }
              }
              exit={{ scale: 0.4, opacity: 0, y: -30 }}
              transition={
                winners?.has(key) ? { duration: 0.6, repeat: 2 } : { type: "spring", stiffness: 420, damping: 22 }
              }
            >
              <motion.div key={amount} initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
                <ChipFace value={largestChip(amount)} size={28} label={amount >= 1000 ? `${+(amount / 1000).toFixed(1)}K` : String(amount)} />
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
