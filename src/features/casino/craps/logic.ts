/*
 * Craps. Pure rules: bets, what each roll does to them, payouts, limits.
 *
 * Standard Las Vegas rules with 3-4-5x odds:
 * - Pass / Come win on 7 or 11 straight out, lose on 2, 3, 12; any other
 *   number becomes their point, which then has to repeat before a 7.
 * - Don't Pass / Don't Come are the reverse, with 12 a push ("bar 12").
 * - Odds behind a line bet pay true odds (no house edge): 2:1 on 4/10,
 *   3:2 on 5/9, 6:5 on 6/8. Taking odds is capped at 3x the line bet on
 *   4/10, 4x on 5/9 and 5x on 6/8; laying odds is capped at 6x.
 * - Place bets and hardways are off on the come-out roll; Come odds are off
 *   on the come-out too (returned if the Come bet resolves then).
 * - Field and proposition bets are one-roll bets and always work.
 *
 * Bets stay on the felt after a win (you're paid the winnings), except a
 * Come bet's flat and any odds, which come back to you with the win, as at
 * a real table. Winnings are paid in whole chips, rounded down.
 */

import type { League } from "../economy.ts";

export type Point = 4 | 5 | 6 | 8 | 9 | 10;
export const POINTS: Point[] = [4, 5, 6, 8, 9, 10];
export type Hard = 4 | 6 | 8 | 10;
export const HARDS: Hard[] = [4, 6, 8, 10];

export const ONE_ROLL = ["field", "any7", "anyCraps", "yo", "aces", "aceDeuce", "boxcars"] as const;
export type OneRoll = (typeof ONE_ROLL)[number];

/**
 * Bet keys: "pass", "passOdds", "dontPass", "dontOdds", "come", "dontCome",
 * "come6" / "comeOdds6" (a Come bet that moved to 6), "dontCome6" /
 * "dontComeOdds6", "place6", "hard6", and the one-roll bets above.
 */
export type Bets = Record<string, number>;

export type Table = { point: Point | null; bets: Bets };

export const NEW_TABLE: Table = { point: null, bets: {} };

export const totalOf = (bets: Bets) => Object.values(bets).reduce((s, v) => s + v, 0);

/* ---------- Payouts ---------- */

/** Odds bets pay true odds: [win, per stake]. */
export const TRUE_ODDS: Record<Point, [number, number]> = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] };
/** Laying odds pays the reverse. */
export const LAY_ODDS: Record<Point, [number, number]> = { 4: [1, 2], 10: [1, 2], 5: [2, 3], 9: [2, 3], 6: [5, 6], 8: [5, 6] };
export const PLACE_PAYS: Record<Point, [number, number]> = { 4: [9, 5], 10: [9, 5], 5: [7, 5], 9: [7, 5], 6: [7, 6], 8: [7, 6] };
export const HARD_PAYS: Record<Hard, number> = { 4: 7, 10: 7, 6: 9, 8: 9 };
export const PROP_PAYS: Record<Exclude<OneRoll, "field">, number> = { any7: 4, anyCraps: 7, yo: 15, aces: 30, aceDeuce: 15, boxcars: 30 };
export const FIELD_NUMBERS = [2, 3, 4, 9, 10, 11, 12];
/** Field pays double on 2 and triple on 12, even money otherwise. */
export const fieldPays = (total: number) => (total === 2 ? 2 : total === 12 ? 3 : 1);

/** Maximum odds as a multiple of the line bet ("3-4-5x"). */
export const ODDS_MULTIPLE: Record<Point, number> = { 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 };
export const LAY_MULTIPLE = 6;

const win = (stake: number, [a, b]: [number, number]) => Math.floor((stake * a) / b + 1e-9);

/* ---------- Labels and house edges ---------- */

export function labelOf(key: string): string {
  const n = key.match(/\d+$/)?.[0];
  const base = key.replace(/\d+$/, "");
  const names: Record<string, string> = {
    pass: "Pass Line",
    passOdds: "Pass odds",
    dontPass: "Don’t Pass",
    dontOdds: "Don’t Pass odds",
    come: "Come",
    dontCome: "Don’t Come",
    comeOdds: "Come odds",
    dontComeOdds: "Don’t Come odds",
    place: "Place",
    hard: "Hard",
    field: "Field",
    any7: "Any 7",
    anyCraps: "Any Craps",
    yo: "Yo 11",
    aces: "Aces (2)",
    aceDeuce: "Ace-Deuce (3)",
    boxcars: "Boxcars (12)",
  };
  return n ? `${names[base] ?? base} ${n}` : (names[key] ?? key);
}

/** House edge per bet, as a fraction of the amount bet. */
export const HOUSE_EDGE: { bet: string; pays: string; edge: number; how: string }[] = [
  { bet: "Pass Line / Come", pays: "1 to 1", edge: 0.0141, how: "7 or 11 wins first roll; 2, 3, 12 lose; otherwise the point must repeat before a 7" },
  { bet: "Don’t Pass / Don’t Come", pays: "1 to 1", edge: 0.0136, how: "The reverse: 2 or 3 wins, 12 pushes, 7 or 11 lose; then 7 must come before the point" },
  { bet: "Odds (take or lay)", pays: "True odds", edge: 0, how: "Added behind a line bet once it has a point. The only bet with no house edge" },
  { bet: "Place 6 or 8", pays: "7 to 6", edge: 0.0152, how: "Number rolls before a 7" },
  { bet: "Place 5 or 9", pays: "7 to 5", edge: 0.04, how: "Number rolls before a 7" },
  { bet: "Place 4 or 10", pays: "9 to 5", edge: 0.0667, how: "Number rolls before a 7" },
  { bet: "Field", pays: "1 to 1 · 2 pays 2 · 12 pays 3", edge: 0.0278, how: "Next roll is 2, 3, 4, 9, 10, 11 or 12" },
  { bet: "Hard 6 or 8", pays: "9 to 1", edge: 0.0909, how: "Rolled as a pair before a 7 or the easy way" },
  { bet: "Hard 4 or 10", pays: "7 to 1", edge: 0.1111, how: "Rolled as a pair before a 7 or the easy way" },
  { bet: "Any Craps", pays: "7 to 1", edge: 0.1111, how: "Next roll is 2, 3 or 12" },
  { bet: "Yo 11 / Ace-Deuce", pays: "15 to 1", edge: 0.1111, how: "Next roll is 11 (or 3)" },
  { bet: "Aces / Boxcars", pays: "30 to 1", edge: 0.1389, how: "Next roll is 2 (or 12)" },
  { bet: "Any 7", pays: "4 to 1", edge: 0.1667, how: "Next roll is 7" },
];

/* ---------- What you can bet when ---------- */

export type Limits = { min: number; max: number; maxProp: number };

export function limitsFor(league: League): Limits {
  return { min: league.blackjack.min, max: league.blackjack.max * 2, maxProp: Math.max(league.blackjack.min, league.blackjack.max / 4) };
}

const isProp = (key: string) => key.startsWith("hard") || (ONE_ROLL as readonly string[]).includes(key) && key !== "field";
const isOdds = (key: string) => /Odds/.test(key);

/** Bets that need at least the table minimum when the dice roll. */
export const needsMin = (key: string) => !isProp(key) && !isOdds(key);

/**
 * How much more can go on a bet right now (0 = not allowed). Odds are capped
 * by the line bet they sit behind.
 */
export function roomFor(t: Table, key: string, limits: Limits): number {
  const on = t.bets[key] ?? 0;
  const n = Number(key.match(/\d+$/)?.[0]) as Point;
  switch (key.replace(/\d+$/, "")) {
    case "pass":
    case "dontPass":
      return t.point === null ? limits.max - on : 0; // only before the point is set
    case "come":
    case "dontCome":
      return t.point !== null ? limits.max - on : 0; // only once there's a point
    case "passOdds":
      return t.point && t.bets.pass ? t.bets.pass * ODDS_MULTIPLE[t.point] - on : 0;
    case "dontOdds":
      return t.point && t.bets.dontPass ? t.bets.dontPass * LAY_MULTIPLE - on : 0;
    case "comeOdds":
      return t.bets[`come${n}`] ? t.bets[`come${n}`] * ODDS_MULTIPLE[n] - on : 0;
    case "dontComeOdds":
      return t.bets[`dontCome${n}`] ? t.bets[`dontCome${n}`] * LAY_MULTIPLE - on : 0;
    case "place":
      return POINTS.includes(n) ? limits.max - on : 0;
    case "hard":
      return HARDS.includes(n as Hard) ? limits.maxProp - on : 0;
    case "field":
      return limits.max - on;
    default:
      return (ONE_ROLL as readonly string[]).includes(key) ? limits.maxProp - on : 0;
  }
}

/** Whether a bet can be taken back. Pass and Come bets are locked once they have a point. */
export function canTakeDown(t: Table, key: string): boolean {
  if (!t.bets[key]) return false;
  if (key === "pass") return t.point === null;
  if (/^come\d+$/.test(key)) return false;
  return true;
}

/** Takes a bet down, along with the odds that depend on it. Returns the chips that come back. */
export function takeDown(t: Table, key: string): { table: Table; returned: number } {
  if (!canTakeDown(t, key)) return { table: t, returned: 0 };
  const bets = { ...t.bets };
  const dependent = key === "pass" ? "passOdds" : key === "dontPass" ? "dontOdds" : key.startsWith("dontCome") && /\d$/.test(key) && !isOdds(key) ? key.replace("dontCome", "dontComeOdds") : null;
  let returned = bets[key];
  delete bets[key];
  if (dependent && bets[dependent]) {
    returned += bets[dependent];
    delete bets[dependent];
  }
  return { table: { ...t, bets }, returned };
}

/* ---------- Rolling ---------- */

export type Dice = [number, number];
export const rollDice = (rand: () => number = Math.random): Dice => [1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 6)];

export type Outcome = { key: string; stake: number; result: "win" | "lose" | "push" | "move"; won: number; label: string };

export type RollResult = {
  table: Table;
  dice: Dice;
  total: number;
  /** Chips that go back to the bankroll: winnings plus any stakes that come down. */
  returned: number;
  /** Chips lost on this roll. */
  lost: number;
  outcomes: Outcome[];
  /** What happened to the point. */
  event: "natural" | "craps" | "point-set" | "point-made" | "seven-out" | null;
};

/**
 * Applies a roll to the table. Bets were already taken from the bankroll
 * when placed, so `returned` is what goes back and `lost` is what's gone.
 */
export function resolveRoll(t: Table, dice: Dice): RollResult {
  const [a, b] = dice;
  const total = a + b;
  const pair = a === b;
  const comeOut = t.point === null;
  const bets: Bets = { ...t.bets };
  const outcomes: Outcome[] = [];
  let returned = 0;
  let lost = 0;

  /** A winning bet: pays `won`; `down` takes the stake back too. */
  const pay = (key: string, won: number, down: boolean) => {
    const stake = bets[key];
    outcomes.push({ key, stake, result: "win", won, label: labelOf(key) });
    returned += won + (down ? stake : 0);
    if (down) delete bets[key];
  };
  const lose = (key: string) => {
    const stake = bets[key];
    outcomes.push({ key, stake, result: "lose", won: 0, label: labelOf(key) });
    lost += stake;
    delete bets[key];
  };
  const push = (key: string, down: boolean) => {
    const stake = bets[key];
    outcomes.push({ key, stake, result: "push", won: 0, label: labelOf(key) });
    if (down) {
      returned += stake;
      delete bets[key];
    }
  };
  const has = (key: string) => (bets[key] ?? 0) > 0;

  // One-roll bets
  if (has("field")) {
    if (FIELD_NUMBERS.includes(total)) pay("field", bets.field * fieldPays(total), false);
    else lose("field");
  }
  const props: [OneRoll, boolean][] = [
    ["any7", total === 7],
    ["anyCraps", total === 2 || total === 3 || total === 12],
    ["yo", total === 11],
    ["aces", total === 2],
    ["aceDeuce", total === 3],
    ["boxcars", total === 12],
  ];
  for (const [key, hit] of props) {
    if (!has(key)) continue;
    if (hit) pay(key, bets[key] * PROP_PAYS[key as Exclude<OneRoll, "field">], false);
    else lose(key);
  }

  // Place bets and hardways: off on the come-out roll.
  if (!comeOut) {
    for (const n of POINTS) {
      const k = `place${n}`;
      if (!has(k)) continue;
      if (total === n) pay(k, win(bets[k], PLACE_PAYS[n]), false);
      else if (total === 7) lose(k);
    }
    for (const n of HARDS) {
      const k = `hard${n}`;
      if (!has(k)) continue;
      if (total === n && pair) pay(k, bets[k] * HARD_PAYS[n], false);
      else if (total === n || total === 7) lose(k);
    }
  }

  // Come and Don't Come bets already on a number.
  for (const n of POINTS) {
    const c = `come${n}`;
    const co = `comeOdds${n}`;
    if (has(c)) {
      if (total === n) {
        pay(c, bets[c], true);
        // Come odds are off on the come-out roll.
        if (has(co) && comeOut) push(co, true);
        else if (has(co)) pay(co, win(bets[co], TRUE_ODDS[n]), true);
      } else if (total === 7) {
        lose(c);
        if (has(co) && comeOut) push(co, true);
        else if (has(co)) lose(co);
      }
    }
    const d = `dontCome${n}`;
    const dodds = `dontComeOdds${n}`;
    if (has(d)) {
      if (total === 7) {
        pay(d, bets[d], true);
        if (has(dodds)) pay(dodds, win(bets[dodds], LAY_ODDS[n]), true);
      } else if (total === n) {
        lose(d);
        if (has(dodds)) lose(dodds);
      }
    }
  }

  // New Come / Don't Come bets in the box act like a come-out line bet.
  const movers: [string, number][] = [];
  if (has("come")) {
    if (total === 7 || total === 11) pay("come", bets.come, true);
    else if (total === 2 || total === 3 || total === 12) lose("come");
    else movers.push(["come", total]);
  }
  if (has("dontCome")) {
    if (total === 2 || total === 3) pay("dontCome", bets.dontCome, true);
    else if (total === 12) push("dontCome", false);
    else if (total === 7 || total === 11) lose("dontCome");
    else movers.push(["dontCome", total]);
  }

  // The line bets and the point.
  let point = t.point;
  let event: RollResult["event"] = null;
  const p = t.point;
  if (p === null) {
    if (total === 7 || total === 11) {
      event = "natural";
      if (has("pass")) pay("pass", bets.pass, false);
      if (has("dontPass")) lose("dontPass");
    } else if (total === 2 || total === 3 || total === 12) {
      event = "craps";
      if (has("pass")) lose("pass");
      if (has("dontPass") && total === 12) push("dontPass", false);
      else if (has("dontPass")) pay("dontPass", bets.dontPass, false);
    } else {
      event = "point-set";
      point = total as Point;
    }
  } else if (total === p) {
    event = "point-made";
    point = null;
    if (has("pass")) pay("pass", bets.pass, false);
    if (has("passOdds")) pay("passOdds", win(bets.passOdds, TRUE_ODDS[p]), true);
    if (has("dontPass")) lose("dontPass");
    if (has("dontOdds")) lose("dontOdds");
  } else if (total === 7) {
    event = "seven-out";
    point = null;
    if (has("pass")) lose("pass");
    if (has("passOdds")) lose("passOdds");
    if (has("dontPass")) pay("dontPass", bets.dontPass, false);
    if (has("dontOdds")) pay("dontOdds", win(bets.dontOdds, LAY_ODDS[p]), true);
  }

  // Move Come bets to their numbers last, so they don't also resolve this roll.
  for (const [key, n] of movers) {
    const to = `${key}${n}`;
    outcomes.push({ key, stake: bets[key], result: "move", won: 0, label: `${labelOf(key)} → ${n}` });
    bets[to] = (bets[to] ?? 0) + bets[key];
    delete bets[key];
  }

  return { table: { point, bets }, dice, total, returned, lost, outcomes, event };
}
