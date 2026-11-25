/*
 * European single-zero roulette. Pure rules: wheel, bets, payouts, limits.
 *
 * A bet is identified by a key. Inside bets use their numbers ("17",
 * "17-20", "0-1-2-3"); outside bets use a name ("red", "dozen1"). Every bet
 * pays 36 / (numbers covered) − 1 to one, which gives the standard table:
 * straight 35, split 17, street 11, corner 8, six line 5, dozen/column 2,
 * even-money 1. The single zero gives the house its 2.70% edge.
 */

import type { League } from "../economy.ts";

/** Pocket order clockwise around a European wheel, starting at zero. */
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
] as const;

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Colour = "red" | "black" | "green";
export const colourOf = (n: number): Colour => (n === 0 ? "green" : RED.has(n) ? "red" : "black");

export const HOUSE_EDGE = 1 / 37;

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const OUTSIDE: Record<string, { label: string; numbers: number[] }> = {
  red: { label: "Red", numbers: [...RED].sort((a, b) => a - b) },
  black: { label: "Black", numbers: range(1, 36).filter((n) => !RED.has(n)) },
  odd: { label: "Odd", numbers: range(1, 36).filter((n) => n % 2 === 1) },
  even: { label: "Even", numbers: range(1, 36).filter((n) => n % 2 === 0) },
  low: { label: "1 to 18", numbers: range(1, 18) },
  high: { label: "19 to 36", numbers: range(19, 36) },
  dozen1: { label: "1st 12", numbers: range(1, 12) },
  dozen2: { label: "2nd 12", numbers: range(13, 24) },
  dozen3: { label: "3rd 12", numbers: range(25, 36) },
  // Columns as they appear on the layout: column 1 holds 1, 4, 7 …
  column1: { label: "Column 1", numbers: range(1, 36).filter((n) => n % 3 === 1) },
  column2: { label: "Column 2", numbers: range(1, 36).filter((n) => n % 3 === 2) },
  column3: { label: "Column 3", numbers: range(1, 36).filter((n) => n % 3 === 0) },
};

export const isOutside = (key: string) => key in OUTSIDE;

/** Key for an inside bet on these numbers. */
export const insideKey = (numbers: number[]) => [...numbers].sort((a, b) => a - b).join("-");

export function numbersFor(key: string): number[] {
  if (isOutside(key)) return OUTSIDE[key].numbers;
  return key.split("-").map(Number);
}

/** Every inside bet on the layout. */
const VALID_INSIDE = (() => {
  const keys = new Set<string>();
  const add = (ns: number[]) => keys.add(insideKey(ns));
  for (let n = 0; n <= 36; n++) add([n]);
  for (let n = 1; n <= 36; n++) {
    if (n % 3 !== 0) add([n, n + 1]); // split up the column
    if (n <= 33) add([n, n + 3]); // split across
    if (n % 3 === 1) add([n, n + 1, n + 2]); // street
    if (n % 3 !== 0 && n <= 33) add([n, n + 1, n + 3, n + 4]); // corner
    if (n % 3 === 1 && n <= 31) add(range(n, n + 5)); // six line
  }
  add([0, 1]);
  add([0, 2]);
  add([0, 3]);
  add([0, 1, 2]);
  add([0, 2, 3]);
  add([0, 1, 2, 3]); // first four
  return keys;
})();

/** Checks that a key is a bet the layout actually offers. */
export function isValidBet(key: string): boolean {
  if (isOutside(key)) return true;
  if (!/^\d+(-\d+)*$/.test(key)) return false;
  return VALID_INSIDE.has(key);
}

export type BetKind = "Straight" | "Split" | "Street" | "Corner" | "First four" | "Six line" | "Dozen" | "Column" | "Even money";

export function kindOf(key: string): BetKind {
  if (key.startsWith("dozen")) return "Dozen";
  if (key.startsWith("column")) return "Column";
  if (isOutside(key)) return "Even money";
  const ns = numbersFor(key);
  if (ns.length === 1) return "Straight";
  if (ns.length === 2) return "Split";
  if (ns.length === 3) return "Street";
  if (ns.length === 4) return ns[0] === 0 ? "First four" : "Corner";
  return "Six line";
}

/** Pays this many to one. */
export const payoutOf = (key: string) => 36 / numbersFor(key).length - 1;

export function labelOf(key: string): string {
  if (isOutside(key)) return OUTSIDE[key].label;
  const kind = kindOf(key);
  return kind === "Straight" ? `Number ${key}` : `${kind} ${numbersFor(key).join("/")}`;
}

export type Bets = Record<string, number>;

export const totalOf = (bets: Bets) => Object.values(bets).reduce((s, v) => s + v, 0);

/** Chips returned for a result: winning stakes plus their winnings. */
export function returnsFor(bets: Bets, result: number): number {
  let total = 0;
  for (const [key, amount] of Object.entries(bets)) {
    if (numbersFor(key).includes(result)) total += amount * (payoutOf(key) + 1);
  }
  return total;
}

export function winningKeys(bets: Bets, result: number): string[] {
  return Object.keys(bets).filter((k) => numbersFor(k).includes(result));
}

/* ---------- Table limits (scale with the league's blackjack table) ---------- */

export type Limits = { minSpin: number; maxInside: number; maxOutside: number };

export function limitsFor(league: League): Limits {
  return {
    minSpin: league.blackjack.min,
    maxInside: Math.max(league.blackjack.min, league.blackjack.max / 4),
    maxOutside: league.blackjack.max * 2,
  };
}

/** The most that can still go on this bet without breaking its limit. */
export function roomOn(bets: Bets, key: string, limits: Limits) {
  const max = isOutside(key) ? limits.maxOutside : limits.maxInside;
  return Math.max(0, max - (bets[key] ?? 0));
}

/* ---------- Wheel geometry ---------- */

export const POCKET_DEG = 360 / WHEEL.length;

/** Angle of a pocket's centre, measured clockwise from the top of the wheel. */
export const pocketAngle = (n: number) => (WHEEL as readonly number[]).indexOf(n) * POCKET_DEG;

/** A fair spin. */
export const spinWheel = (rand: () => number = Math.random) => WHEEL[Math.floor(rand() * WHEEL.length)];
