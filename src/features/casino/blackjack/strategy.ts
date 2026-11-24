/*
 * Basic strategy computed from the table rules rather than copied from a
 * chart: for every decision we calculate the expected value (EV) of each
 * legal action and pick the best.
 *
 * Model: infinite deck (each rank's probability is fixed), which matches
 * 6-deck basic strategy almost everywhere. Split hands are valued without
 * re-splitting. With no hole card + "original bets only", a dealer blackjack
 * costs the initial bet whatever you do (busted doubles aside), so every
 * action shares the same dealer-blackjack term — except surrender, which
 * always returns half.
 *
 * EVs are in units of the initial bet.
 */
import type { Rules } from "./rules.ts";

export type Action = "hit" | "stand" | "double" | "split" | "surrender";

/** Card values 1 (ace) … 10. */
const P: number[] = [0, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 1 / 13, 4 / 13];
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function add(total: number, soft: boolean, card: number): [number, boolean] {
  let t = total + card;
  let s = soft;
  if (card === 1 && t + 10 <= 21) {
    t += 10;
    s = true;
  }
  if (t > 21 && s) {
    t -= 10;
    s = false;
  }
  return [t, s];
}

export function handTotal(values: number[]): { total: number; soft: boolean } {
  let t = 0;
  let s = false;
  for (const v of values) [t, s] = add(t, s, v);
  return { total: t, soft: s };
}

export const dealerBlackjackChance = (up: number) => (up === 1 ? P[10] : up === 10 ? P[1] : 0);

/** Dealer final totals [17,18,19,20,21,bust], given no dealer blackjack. */
const distCache = new Map<string, number[]>();
export function dealerDistribution(up: number, rules: Rules): number[] {
  const key = `${up}-${rules.dealerHitsSoft17}`;
  const hit = distCache.get(key);
  if (hit) return hit;
  const out = [0, 0, 0, 0, 0, 0];
  const pBJ = dealerBlackjackChance(up);
  const walk = (total: number, soft: boolean, cards: number, p: number) => {
    if (total > 21) return void (out[5] += p);
    const standsHere = total > 17 || (total === 17 && !(soft && rules.dealerHitsSoft17));
    if (standsHere) return void (out[total - 17] += p);
    for (const c of VALUES) {
      let q = P[c];
      if (cards === 1 && pBJ > 0) {
        if ((up === 1 && c === 10) || (up === 10 && c === 1)) continue;
        q = P[c] / (1 - pBJ);
      }
      const [t, s] = add(total, soft, c);
      walk(t, s, cards + 1, p * q);
    }
  };
  const [t0, s0] = add(0, false, up);
  walk(t0, s0, 1, 1);
  distCache.set(key, out);
  return out;
}

function standEV(total: number, dist: number[]): number {
  if (total > 21) return -1;
  let ev = dist[5];
  for (let d = 17; d <= 21; d++) {
    const p = dist[d - 17];
    if (total > d) ev += p;
    else if (total < d) ev -= p;
  }
  return ev;
}

type Ctx = { dist: number[]; rules: Rules; memo: Map<string, number> };

/** Best EV from (total, soft) when only hit/stand are allowed. */
function hitOrStand(total: number, soft: boolean, ctx: Ctx): number {
  if (total > 21) return -1;
  const stand = !soft && total < ctx.rules.mustHitBelow ? -Infinity : standEV(total, ctx.dist);
  if (total === 21) return stand;
  return Math.max(stand, hitEV(total, soft, ctx));
}

function hitEV(total: number, soft: boolean, ctx: Ctx): number {
  const key = `h${total}${soft}`;
  const cached = ctx.memo.get(key);
  if (cached !== undefined) return cached;
  let ev = 0;
  for (const c of VALUES) {
    const [t, s] = add(total, soft, c);
    ev += P[c] * hitOrStand(t, s, ctx);
  }
  ctx.memo.set(key, ev);
  return ev;
}

function doubleEV(total: number, soft: boolean, ctx: Ctx): number {
  let ev = 0;
  for (const c of VALUES) {
    const [t] = add(total, soft, c);
    ev += P[c] * (t > 21 ? -2 : 2 * standEV(t, ctx.dist));
  }
  return ev;
}

/** EV of one hand that starts as a single split card. */
function splitHandEV(card: number, ctx: Ctx): number {
  let ev = 0;
  for (const c of VALUES) {
    const [t, s] = add(...add(0, false, card), c);
    if (card === 1 && ctx.rules.splitAcesOnce) {
      ev += P[c] * standEV(t, ctx.dist); // one card only; A+10 is 21, not blackjack
      continue;
    }
    let best = hitOrStand(t, s, ctx);
    if (ctx.rules.doubleAfterSplit && t < 21) best = Math.max(best, doubleEV(t, s, ctx));
    ev += P[c] * best;
  }
  return ev;
}

export type Situation = {
  /** Card values in the hand (ace = 1, picture = 10). */
  cards: number[];
  dealerUp: number;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
};

/** EV of every legal action, including the dealer-blackjack risk. */
export function actionValues(sit: Situation, rules: Rules): Partial<Record<Action, number>> {
  const dist = dealerDistribution(sit.dealerUp, rules);
  const ctx: Ctx = { dist, rules, memo: new Map() };
  const { total, soft } = handTotal(sit.cards);
  const pBJ = rules.holeCard ? 0 : dealerBlackjackChance(sit.dealerUp);
  const withBJ = (evNoBJ: number) => pBJ * -1 + (1 - pBJ) * evNoBJ;

  const out: Partial<Record<Action, number>> = {};
  if (soft || total >= rules.mustHitBelow) out.stand = withBJ(standEV(total, dist));
  if (total < 21) out.hit = withBJ(hitEV(total, soft, ctx));
  if (sit.canDouble && sit.cards.length === 2 && total < 21) out.double = withBJ(doubleEV(total, soft, ctx));
  if (sit.canSplit && sit.cards.length === 2 && sit.cards[0] === sit.cards[1]) {
    out.split = withBJ(2 * splitHandEV(sit.cards[0], ctx));
  }
  if (sit.canSurrender && rules.surrender === "notVsAce" && sit.dealerUp !== 1) out.surrender = -0.5;
  return out;
}

export function bestAction(sit: Situation, rules: Rules): { action: Action; values: Partial<Record<Action, number>> } {
  const values = actionValues(sit, rules);
  let action: Action = "stand";
  let best = -Infinity;
  for (const [a, v] of Object.entries(values) as [Action, number][]) {
    if (v > best + 1e-12) {
      best = v;
      action = a;
    }
  }
  return { action, values };
}

/** Insurance / even money EV per unit of the initial bet (insurance = half the bet). Always negative here. */
export function insuranceEV(rules: Rules): number {
  const p = P[10];
  return 0.5 * (rules.insurancePays * p - (1 - p));
}

/* ---------- Strategy chart ---------- */

export type ChartCode = "H" | "S" | "D" | "Ds" | "P" | "Rh" | "Rs" | "Rp";
export const DEALER_UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1];

function code(cards: number[], up: number, rules: Rules, pair: boolean): ChartCode {
  const full = bestAction({ cards, dealerUp: up, canDouble: true, canSplit: pair, canSurrender: true }, rules).action;
  const noSurrender = () => bestAction({ cards, dealerUp: up, canDouble: true, canSplit: pair, canSurrender: false }, rules).action;
  const noDouble = () => bestAction({ cards, dealerUp: up, canDouble: false, canSplit: false, canSurrender: false }, rules).action;
  switch (full) {
    case "split":
      return "P";
    case "double":
      return noDouble() === "stand" ? "Ds" : "D";
    case "surrender": {
      const alt = noSurrender();
      return alt === "split" ? "Rp" : alt === "stand" ? "Rs" : "Rh";
    }
    case "stand":
      return "S";
    default:
      return "H";
  }
}

/** Representative two-card hands for each chart row. */
const HARD_ROWS: [string, number[]][] = [
  ["8 or less", [3, 5]], ["9", [4, 5]], ["10", [4, 6]], ["11", [5, 6]], ["12", [10, 2]], ["13", [10, 3]],
  ["14", [10, 4]], ["15", [10, 5]], ["16", [10, 6]], ["17+", [10, 7]],
];
const SOFT_ROWS: [string, number[]][] = [2, 3, 4, 5, 6, 7, 8, 9].map((x) => [`A,${x}`, [1, x]]);
const PAIR_ROWS: [string, number[]][] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1].map((x) => [
  x === 1 ? "A,A" : x === 10 ? "10,10" : `${x},${x}`,
  [x, x],
]);

export type Chart = { title: string; rows: { label: string; cells: ChartCode[] }[] }[];

export function buildChart(rules: Rules): Chart {
  const table = (rows: [string, number[]][], pair: boolean) =>
    rows.map(([label, cards]) => ({ label, cells: DEALER_UPS.map((up) => code(cards, up, rules, pair)) }));
  return [
    { title: "Hard totals", rows: table(HARD_ROWS, false) },
    { title: "Soft totals", rows: table(SOFT_ROWS, false) },
    { title: "Pairs", rows: table(PAIR_ROWS, true) },
  ];
}

/** Which chart row a live hand belongs to, for highlighting. */
export function chartRowFor(values: number[], canSplit: boolean): { table: number; label: string } {
  if (canSplit && values.length === 2 && values[0] === values[1]) {
    const x = values[0];
    return { table: 2, label: x === 1 ? "A,A" : x === 10 ? "10,10" : `${x},${x}` };
  }
  const { total, soft } = handTotal(values);
  if (soft && total < 21) return { table: 1, label: `A,${total - 11}` };
  if (total <= 8) return { table: 0, label: "8 or less" };
  if (total >= 17) return { table: 0, label: "17+" };
  return { table: 0, label: String(total) };
}
