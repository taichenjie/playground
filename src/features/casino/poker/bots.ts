/*
 * Poker bots. Each decision combines:
 *  - preflop hand strength (Chen formula) adjusted for position;
 *  - postflop equity from Monte Carlo simulation against the remaining
 *    opponents, narrowing their likely hands when they've shown aggression;
 *  - pot odds, stack depth and a personality (tightness, aggression, bluffing);
 *  - at "expert", reads on opponents' tendencies (loose / aggressive).
 * Difficulty controls simulation depth, randomness and discipline.
 * Pure functions; `rand` is injectable for tests.
 */
import type { Card } from "../cards.ts";
import { amountToCall, legalActions, positionOf, potTotal, type Action, type Table } from "./engine.ts";
import { code, scoreCodes } from "./evaluator.ts";

export type Difficulty = "easy" | "medium" | "hard" | "expert";
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];

export type BotStyle = {
  difficulty: Difficulty;
  /** 0 = plays lots of hands, 1 = very selective. */
  tightness: number;
  /** 0 = checks/calls, 1 = bets/raises. */
  aggression: number;
  /** Bluff frequency, 0–1. */
  bluff: number;
  /** How often a big hand is slow-played (check/call instead of bet/raise), 0–1. */
  trap: number;
  /** Personality archetype (internal; never shown to the player). */
  archetype: Archetype;
  /** Monte Carlo samples per postflop decision. */
  sims: number;
  /** Random error added to equity estimates. */
  noise: number;
  /** Extra equity demanded before calling (negative = calls too loosely). */
  callMargin: number;
  /** Narrows opponents' hands after they raise. */
  usesRanges: boolean;
  readsOpponents: boolean;
};

type Personality = "tightness" | "aggression" | "bluff" | "trap" | "archetype";

/**
 * Playing styles, mixed at every difficulty so a table never plays one way.
 * Difficulty controls skill (simulation depth, discipline, hand reading);
 * the archetype controls style. Values are [min, max] ranges.
 */
export const ARCHETYPES = {
  /** Tight-aggressive: few hands, plays them hard. */
  shark: { tightness: [0.6, 0.85], aggression: [0.65, 0.9], bluff: [0.12, 0.22], trap: [0.05, 0.15] },
  /** Loose-aggressive: lots of hands, lots of pressure. */
  pirate: { tightness: [0.1, 0.35], aggression: [0.7, 0.95], bluff: [0.22, 0.38], trap: [0.02, 0.1] },
  /** Tight-passive: waits for big hands, rarely bluffs. */
  rock: { tightness: [0.75, 0.95], aggression: [0.15, 0.4], bluff: [0, 0.05], trap: [0.15, 0.3] },
  /** Loose-passive: calls far too often. */
  station: { tightness: [0.05, 0.3], aggression: [0.05, 0.3], bluff: [0.02, 0.08], trap: [0.05, 0.15] },
  /** Wild: raises and bluffs constantly. */
  maniac: { tightness: [0, 0.2], aggression: [0.85, 1], bluff: [0.35, 0.55], trap: [0, 0.05] },
  /** Honest regular: straightforward, almost never bluffs. */
  straight: { tightness: [0.4, 0.65], aggression: [0.4, 0.65], bluff: [0, 0.04], trap: [0, 0.05] },
  /** Trapper: loves slow-playing monsters, then pounces. */
  trapper: { tightness: [0.45, 0.7], aggression: [0.35, 0.6], bluff: [0.08, 0.16], trap: [0.4, 0.6] },
} as const;
export type Archetype = keyof typeof ARCHETYPES;

const BASE: Record<Difficulty, Omit<BotStyle, Personality>> = {
  easy: { difficulty: "easy", sims: 120, noise: 0.22, callMargin: -0.12, usesRanges: false, readsOpponents: false },
  medium: { difficulty: "medium", sims: 300, noise: 0.1, callMargin: -0.02, usesRanges: false, readsOpponents: false },
  hard: { difficulty: "hard", sims: 600, noise: 0.05, callMargin: 0.02, usesRanges: true, readsOpponents: false },
  expert: { difficulty: "expert", sims: 900, noise: 0.02, callMargin: 0.03, usesRanges: true, readsOpponents: true },
};

/** A bot with a random personality; `difficulty` sets how well it plays. */
export function makeStyle(difficulty: Difficulty, rand: () => number = Math.random, archetype?: Archetype): BotStyle {
  const names = Object.keys(ARCHETYPES) as Archetype[];
  const kind = archetype ?? names[Math.floor(rand() * names.length)];
  const a = ARCHETYPES[kind];
  const pick = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo);
  return {
    ...BASE[difficulty],
    archetype: kind,
    tightness: pick(a.tightness),
    aggression: pick(a.aggression),
    bluff: pick(a.bluff),
    trap: pick(a.trap),
  };
}

/** Deals a table of varied personalities (no style repeated until all have been used). */
export function makeTableStyles(count: number, difficulty: Difficulty, rand: () => number = Math.random): BotStyle[] {
  const names = Object.keys(ARCHETYPES) as Archetype[];
  const deck: Archetype[] = [];
  while (deck.length < count) deck.push(...[...names].sort(() => rand() - 0.5));
  return deck.slice(0, count).map((k) => makeStyle(difficulty, rand, k));
}

/** Observed tendencies of a player (expert bots adapt to these). */
export type Read = { hands: number; voluntary: number; aggressive: number; passive: number };
export const EMPTY_READ: Read = { hands: 0, voluntary: 0, aggressive: 0, passive: 0 };

/* ---------- hand strength ---------- */

/** Chen formula on card codes (rank*4+suit). Roughly −1 (72o) … 20 (AA). */
export function chen(a: number, b: number): number {
  const ra = a >> 2;
  const rb = b >> 2;
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  const highPoints = (r: number) => (r === 14 ? 10 : r === 13 ? 8 : r === 12 ? 7 : r === 11 ? 6 : r / 2);
  let score = highPoints(hi);
  if (ra === rb) return Math.ceil(Math.max(5, score * 2));
  if ((a & 3) === (b & 3)) score += 2;
  const gap = hi - lo - 1;
  score -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && hi < 12) score += 1;
  return Math.ceil(score);
}

/**
 * Chance to win (ties count as a share) against `opponents` random hands.
 * `minChen` per opponent narrows their hands to stronger starting cards.
 */
export function equity(hole: Card[], board: Card[], minChen: number[], sims: number, rand: () => number): number {
  const known = new Set([...hole, ...board].map(code));
  const deck: number[] = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) if (!known.has(r * 4 + s)) deck.push(r * 4 + s);
  const mine = hole.map(code);
  const boardCodes = board.map(code);
  const need = 5 - board.length;
  let total = 0;

  for (let i = 0; i < sims; i++) {
    const pool = deck.slice();
    let top = pool.length;
    const draw = () => {
      const j = Math.floor(rand() * top);
      const c = pool[j];
      pool[j] = pool[--top];
      return c;
    };
    const opps: number[][] = [];
    for (const min of minChen) {
      let a = draw();
      let b = draw();
      // Rejection-sample a stronger hand for opponents who've shown strength.
      for (let tries = 0; min > 0 && chen(a, b) < min && tries < 12; tries++) {
        pool[top++] = a;
        pool[top++] = b;
        a = draw();
        b = draw();
      }
      opps.push([a, b]);
    }
    const full = boardCodes.slice();
    for (let k = 0; k < need; k++) full.push(draw());
    const me = scoreCodes([...mine, ...full]);
    let best = 0;
    let ties = 0;
    let beaten = false;
    for (const o of opps) {
      const s = scoreCodes([...o, ...full]);
      if (s > me) {
        beaten = true;
        break;
      }
      if (s === me) ties++;
      best = Math.max(best, s);
    }
    if (!beaten) total += ties ? 1 / (ties + 1) : 1;
  }
  return total / sims;
}

/* ---------- decisions ---------- */

const roundTo = (n: number, unit: number) => Math.max(unit, Math.round(n / unit) * unit);

function raiseTo(t: Table, seat: number, to: number): Action {
  const legal = legalActions(t);
  if (!legal.raise) return legal.call ? { type: "call" } : { type: "check" };
  const target = Math.max(legal.raise.min, Math.min(roundTo(to, t.sb), legal.raise.max));
  // Commit fully if the raise leaves a tiny stack behind.
  const remaining = t.seats[seat].stack - (target - t.seats[seat].bet);
  return { type: "raise", to: remaining < t.bb * 3 ? legal.raise.max : target };
}

function passive(t: Table): Action {
  const legal = legalActions(t);
  return legal.check ? { type: "check" } : { type: "fold" };
}

export function decide(
  t: Table,
  seatIndex: number,
  style: BotStyle,
  reads: Record<number, Read> = {},
  rand: () => number = Math.random,
): Action {
  const legal = legalActions(t);
  const me = t.seats[seatIndex];
  const toCall = amountToCall(t, seatIndex);
  const pot = potTotal(t);
  const opponents = t.seats.filter((s) => s.id !== seatIndex && !s.out && !s.folded);
  const stackBB = me.stack / t.bb;
  const pos = positionOf(t, seatIndex);

  // How loose/aggressive are the opponents still in? (expert only)
  let oppLoose = 0.25;
  let oppAggro = 0.3;
  if (style.readsOpponents) {
    const rs = opponents.map((o) => reads[o.id]).filter((r): r is Read => !!r && r.hands >= 8);
    if (rs.length) {
      oppLoose = rs.reduce((s, r) => s + r.voluntary / r.hands, 0) / rs.length;
      oppAggro = rs.reduce((s, r) => s + r.aggressive / Math.max(1, r.aggressive + r.passive), 0) / rs.length;
    }
  }

  /* ----- preflop ----- */
  if (t.street === "preflop") {
    const [a, b] = me.cards.map(code);
    const posBonus = { early: -1, middle: 0, late: 1.5, button: 2, blinds: 0.5 }[pos];
    const strength = chen(a, b) + posBonus + (rand() - 0.5) * style.noise * 10;
    const raisedTo = t.currentBet / t.bb; // 1 = unraised
    const openAt = 8.5 + style.tightness * 2.5 - (opponents.length <= 2 ? 1.5 : 0);
    const callAt = openAt - 1.5 - (1 - style.tightness) * 2;

    // Short stack: push or fold.
    if (stackBB <= 12) {
      return strength >= 8 + style.tightness * 2 ? raiseTo(t, seatIndex, me.bet + me.stack) : passive(t);
    }

    if (raisedTo <= 1) {
      if (strength >= openAt || (rand() < style.bluff * 0.5 && (pos === "button" || pos === "late"))) {
        const limpers = t.seats.filter((s) => s.id !== seatIndex && s.bet === t.bb && s.id !== t.bbSeat).length;
        return raiseTo(t, seatIndex, t.bb * (2.5 + style.aggression + limpers));
      }
      if (legal.check) return { type: "check" };
      if (strength >= callAt && style.difficulty === "easy") return { type: "call" };
      if (strength >= callAt + 1 && pos !== "early") return { type: "call" };
      return passive(t);
    }

    // Facing a raise.
    const threeBetAt = 12 + Math.min(raisedTo, 12) * 0.25 - style.aggression * 1.5 - oppLoose * 2;
    const callRaiseAt = callAt + 1 + Math.min(raisedTo, 15) * 0.2 - (pos === "blinds" ? 1 : 0) + style.callMargin * 10;
    if (strength >= threeBetAt) return raiseTo(t, seatIndex, t.currentBet * (2.8 + style.aggression * 0.6));
    if (strength >= callRaiseAt && toCall <= me.stack * (style.difficulty === "easy" ? 0.6 : 0.35)) return { type: "call" };
    if (strength >= callRaiseAt + 2) return { type: "call" };
    return passive(t);
  }

  /* ----- postflop ----- */
  const minChen = opponents.map((o) => {
    if (!style.usesRanges) return 0;
    const raised = /Raise|Bet|All-in/.test(o.lastAction ?? "") || o.committed >= t.bb * 4;
    return raised ? 7 : o.committed > t.bb ? 4 : 0;
  });
  let eq = equity(me.cards, t.board, minChen, style.sims, rand);
  eq += (rand() - 0.5) * style.noise;

  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const drawsLeft = t.street !== "river";
  const inPosition = pos === "button" || pos === "late";
  const headsUp = opponents.length === 1;
  const valueAt = 0.62 - style.aggression * 0.08 - (oppLoose > 0.4 ? 0.06 : 0) + (opponents.length - 1) * 0.04;
  const bluffChance = style.bluff * (headsUp ? 1 : 0.35) * (inPosition ? 1.2 : 0.7) * (oppLoose > 0.45 ? 0.4 : 1);

  // Slow-play: with a monster and cards to come, trappers sometimes just check or call.
  const slowPlay = drawsLeft && eq >= 0.8 && rand() < style.trap;

  if (toCall === 0) {
    if (eq >= valueAt && !slowPlay) {
      const size = eq > 0.85 ? 0.75 + rand() * 0.25 : 0.5 + rand() * 0.25;
      return raiseTo(t, seatIndex, pot * size);
    }
    if (drawsLeft && eq > 0.32 && rand() < style.aggression * 0.35) return raiseTo(t, seatIndex, pot * 0.55); // semi-bluff
    if (rand() < bluffChance) return raiseTo(t, seatIndex, pot * (0.4 + rand() * 0.3));
    return { type: "check" };
  }

  // Facing a bet.
  const callMargin = style.callMargin - (oppAggro > 0.55 ? 0.05 : 0);
  const raiseAt = 0.78 - style.aggression * 0.1 + (opponents.length - 1) * 0.05;
  if (eq >= raiseAt && legal.raise && !slowPlay) {
    return raiseTo(t, seatIndex, t.currentBet * 2.5 + pot * 0.25);
  }
  if (eq >= potOdds + callMargin) return legal.call ? { type: "call" } : { type: "check" };
  if (drawsLeft && headsUp && eq > 0.3 && rand() < style.bluff * 0.4 && legal.raise) {
    return raiseTo(t, seatIndex, t.currentBet * 2.5); // semi-bluff raise
  }
  return passive(t);
}

/* ---------- names & looks ---------- */

export const BOT_NAMES = [
  "RiverRat", "NitNora", "LuckyLu", "BluffBarry", "CallingCarl", "SharkSam", "FoldingFay", "AllInAl",
  "TiltedTom", "SlowRollSue", "PocketPete", "ChipChloe", "DonkDan", "GrinderGus", "ValueVic", "SnapCallSam",
];
export const AVATARS = ["🦊", "🐙", "🦉", "🐯", "🐸", "🐼", "🦄", "🐨", "🦁", "🐧", "🐺", "🐲"];
