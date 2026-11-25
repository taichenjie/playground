/*
 * Card counting trainer: Hi-Lo system. Pure rules, no browser APIs.
 *
 *   2–6 → +1   7–9 → 0   10, J, Q, K, A → −1
 *   True count = running count ÷ decks left in the shoe.
 *   Bet ramp: 1 unit at a true count of 1 or less, then (true count − 1) units, up to 8.
 */

import { createShoe, type Card } from "../cards.ts";

export const hiLo = (c: Card): -1 | 0 | 1 =>
  ["2", "3", "4", "5", "6"].includes(c.rank) ? 1 : ["7", "8", "9"].includes(c.rank) ? 0 : -1;

export const runningCount = (cards: Card[]) => cards.reduce((s, c) => s + hiLo(c), 0);

/** Decks left, to the nearest half deck (how players read the discard tray). */
export const decksLeft = (cardsLeft: number) => Math.max(0.5, Math.round((cardsLeft / 52) * 2) / 2);

export const trueCount = (rc: number, decks: number) => rc / decks;

/** Players floor, truncate or round the true count; any of those is accepted. */
export function acceptableTrueCounts(rc: number, decks: number): number[] {
  const tc = trueCount(rc, decks);
  return [...new Set([Math.floor(tc), Math.trunc(tc), Math.round(tc)])].map((n) => (Object.is(n, -0) ? 0 : n));
}

export const MAX_UNITS = 8;
export const betUnits = (tc: number) => Math.min(MAX_UNITS, Math.max(1, Math.floor(tc) - 1));

/* ---------- Drills ---------- */

export type Mode = "deck" | "shoe";

export const SPEEDS = [
  { id: "rookie", label: "Rookie", ms: 1400, mult: 1 },
  { id: "dealer", label: "Dealer", ms: 900, mult: 1.5 },
  { id: "pro", label: "Pro", ms: 550, mult: 2.2 },
  { id: "shark", label: "Shark", ms: 320, mult: 3.2 },
] as const;
export type SpeedId = (typeof SPEEDS)[number]["id"];

export type Check = { after: number; askTrue: boolean };

export type Drill = {
  mode: Mode;
  decks: number;
  /** Cards in the order they are shown. */
  cards: Card[];
  /** How many cards appear together at each step (1 for the deck countdown, a "hand" for the shoe drill). */
  groups: number[];
  /** Pause after this many cards to quiz the count. */
  checks: Check[];
};

export const SHOE_DECKS = 6;
export const SHOE_CARDS = 104;

export function makeDrill(mode: Mode, rand: () => number = Math.random): Drill {
  if (mode === "deck") {
    const cards = createShoe(1, rand);
    return {
      mode,
      decks: 1,
      cards,
      groups: cards.map(() => 1),
      checks: [13, 26, 39, 52].map((after) => ({ after, askTrue: false })),
    };
  }
  const cards = createShoe(SHOE_DECKS, rand).slice(0, SHOE_CARDS);
  const groups: number[] = [];
  const checks: Check[] = [];
  let dealt = 0;
  let rounds = 0;
  while (dealt < SHOE_CARDS) {
    const size = Math.min(SHOE_CARDS - dealt, 2 + Math.floor(rand() * 4)); // 2–5 cards, like a hand
    groups.push(size);
    dealt += size;
    rounds++;
    if (rounds % 4 === 0 || dealt === SHOE_CARDS) checks.push({ after: dealt, askTrue: checks.length % 2 === 1 || dealt === SHOE_CARDS });
  }
  return { mode, decks: SHOE_DECKS, cards, groups, checks };
}

/* ---------- Scoring ---------- */

export const POINTS = { running: 100, trueCount: 50, bet: 50 };

export function scoreFor(kind: keyof typeof POINTS, speed: SpeedId, streak: number) {
  const mult = SPEEDS.find((s) => s.id === speed)!.mult;
  return Math.round(POINTS[kind] * mult * (1 + Math.min(streak, 10) * 0.1));
}

export function grade(accuracy: number) {
  if (accuracy >= 0.97) return { letter: "S", title: "Card shark" };
  if (accuracy >= 0.9) return { letter: "A", title: "Casino ready" };
  if (accuracy >= 0.75) return { letter: "B", title: "Getting there" };
  if (accuracy >= 0.5) return { letter: "C", title: "Keep drilling" };
  return { letter: "D", title: "Slow it down" };
}
