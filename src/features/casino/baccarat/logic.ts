/*
 * Commission Baccarat with Super Six, following the GRA-approved
 * "Commission Baccarat with Super Six (RWS)" game rules, Version 4
 * (w.e.f. 16 September 2019). Pure rules: no browser APIs.
 *
 *   Player 1 to 1 · Banker 0.95 to 1 (5% commission) · Tie 8 to 1
 *   Player Pair / Banker Pair 11 to 1 · Super Six 15 to 1
 *   A Tie returns Player and Banker bets.
 */

import { createShoe, type Card } from "../cards.ts";
import type { League } from "../economy.ts";

export const DECKS = 8;
/** Cut card: a fresh shoe once this share has been dealt. */
export const PENETRATION = 0.85;
export const COMMISSION = 0.05;

export type BetKey = "player" | "banker" | "tie" | "playerPair" | "bankerPair" | "superSix";
export const BET_KEYS: BetKey[] = ["player", "banker", "tie", "playerPair", "bankerPair", "superSix"];
export type Bets = Partial<Record<BetKey, number>>;

/** Pays this many to one (Banker before commission). */
export const PAYS: Record<BetKey, number> = {
  player: 1,
  banker: 1,
  tie: 8,
  playerPair: 11,
  bankerPair: 11,
  superSix: 15,
};

export const BET_LABEL: Record<BetKey, string> = {
  player: "Player",
  banker: "Banker",
  tie: "Tie",
  playerPair: "Player Pair",
  bankerPair: "Banker Pair",
  superSix: "Super Six",
};

/** A = 1, 2–9 face value, 10 and pictures 0. */
export const pointOf = (c: Card) => (c.rank === "A" ? 1 : ["10", "J", "Q", "K"].includes(c.rank) ? 0 : Number(c.rank));
export const totalOf = (cards: Card[]) => cards.reduce((s, c) => s + pointOf(c), 0) % 10;

/** Banker's third-card decision when the Player drew `third` (null if the Player stood). */
export function bankerDraws(bankerTotal: number, third: number | null): boolean {
  if (third === null) return bankerTotal <= 5;
  switch (bankerTotal) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return third !== 8;
    case 4:
      return third >= 2 && third <= 7;
    case 5:
      return third >= 4 && third <= 7;
    case 6:
      return third === 6 || third === 7;
    default:
      return false;
  }
}

export type Outcome = "player" | "banker" | "tie";

export type Round = {
  player: Card[];
  banker: Card[];
  /** All cards in the order they leave the shoe. */
  order: { side: "player" | "banker"; card: Card }[];
  playerTotal: number;
  bankerTotal: number;
  outcome: Outcome;
  natural: boolean;
  playerPair: boolean;
  bankerPair: boolean;
  superSix: boolean;
};

/** Deals one coup from the top of `cards`: P, B, P, B, then third cards by the Table of Play. */
export function playCoup(cards: Card[]): { round: Round; used: number } {
  let i = 0;
  const next = () => cards[i++];
  const p1 = next();
  const b1 = next();
  const p2 = next();
  const b2 = next();
  const player = [p1, p2];
  const banker = [b1, b2];
  const order: Round["order"] = [
    { side: "player", card: p1 },
    { side: "banker", card: b1 },
    { side: "player", card: p2 },
    { side: "banker", card: b2 },
  ];

  const natural = totalOf(player) >= 8 || totalOf(banker) >= 8;
  if (!natural) {
    let third: number | null = null;
    if (totalOf(player) <= 5) {
      const c = next();
      player.push(c);
      order.push({ side: "player", card: c });
      third = pointOf(c);
    }
    if (bankerDraws(totalOf(banker), third)) {
      const c = next();
      banker.push(c);
      order.push({ side: "banker", card: c });
    }
  }

  const playerTotal = totalOf(player);
  const bankerTotal = totalOf(banker);
  const outcome: Outcome = playerTotal > bankerTotal ? "player" : bankerTotal > playerTotal ? "banker" : "tie";
  return {
    round: {
      player,
      banker,
      order,
      playerTotal,
      bankerTotal,
      outcome,
      natural,
      playerPair: p1.rank === p2.rank,
      bankerPair: b1.rank === b2.rank,
      superSix: outcome === "banker" && bankerTotal === 6,
    },
    used: i,
  };
}

export type Settlement = {
  /** Chips returned for each bet: stake plus winnings, the stake alone for a push, 0 for a loss. */
  byBet: Partial<Record<BetKey, number>>;
  /** Total returned before commission. */
  returns: number;
  /** 5% commission due on a winning Banker bet (may be fractional). */
  commission: number;
};

export function wins(key: BetKey, r: Round): boolean | "push" {
  switch (key) {
    case "player":
      return r.outcome === "tie" ? "push" : r.outcome === "player";
    case "banker":
      return r.outcome === "tie" ? "push" : r.outcome === "banker";
    case "tie":
      return r.outcome === "tie";
    case "playerPair":
      return r.playerPair;
    case "bankerPair":
      return r.bankerPair;
    case "superSix":
      return r.superSix;
  }
}

export function settleBets(bets: Bets, r: Round): Settlement {
  const byBet: Settlement["byBet"] = {};
  let returns = 0;
  let commission = 0;
  for (const key of BET_KEYS) {
    const stake = bets[key] ?? 0;
    if (!stake) continue;
    const w = wins(key, r);
    const back = w === "push" ? stake : w ? stake * (PAYS[key] + 1) : 0;
    byBet[key] = back;
    returns += back;
    if (key === "banker" && w === true) commission += stake * COMMISSION;
  }
  return { byBet, returns, commission };
}

/* ---------- Shoe ---------- */

export type Shoe = { cards: Card[]; size: number };

export const newShoe = (rand?: () => number): Shoe => {
  const cards = createShoe(DECKS, rand);
  return { cards, size: cards.length };
};

export const shoeDone = (s: Shoe) => s.cards.length < 6 || s.size - s.cards.length >= s.size * PENETRATION;

/* ---------- Limits (scale with the league's blackjack table) ---------- */

export type Limits = { min: number; maxMain: number; maxSide: number };

export function limitsFor(league: League): Limits {
  return { min: league.blackjack.min, maxMain: league.blackjack.max * 2, maxSide: Math.max(league.blackjack.min, league.blackjack.max / 4) };
}

export const isMain = (k: BetKey) => k === "player" || k === "banker";
export const maxFor = (k: BetKey, l: Limits) => (isMain(k) ? l.maxMain : l.maxSide);

/* ---------- Scoreboard roads ---------- */

export type RoadEntry = { outcome: Outcome; playerPair: boolean; bankerPair: boolean; total: number };

export type BigRoadCell = { col: number; row: number; outcome: "player" | "banker"; ties: number; playerPair: boolean; bankerPair: boolean };

/**
 * The Big Road: a new column each time the winner changes, six rows deep;
 * a long streak turns right along the bottom ("dragon tail"). Ties are
 * marked on the cell before them.
 */
export function bigRoad(entries: RoadEntry[], rows = 6): BigRoadCell[] {
  const cells: BigRoadCell[] = [];
  const taken = new Set<string>();
  let leadingTies = 0;
  let col = -1;
  let row = 0;
  let streakCol = -1;
  let turned = false;
  for (const e of entries) {
    if (e.outcome === "tie") {
      if (cells.length) cells[cells.length - 1].ties++;
      else leadingTies++;
      continue;
    }
    const last = cells.at(-1);
    if (!last || last.outcome !== e.outcome) {
      streakCol++;
      col = streakCol;
      row = 0;
      turned = false;
      while (taken.has(`${col},${row}`)) col++;
    } else if (!turned && row + 1 < rows && !taken.has(`${col},${row + 1}`)) {
      row++;
    } else {
      turned = true;
      col++;
    }
    taken.add(`${col},${row}`);
    cells.push({ col, row, outcome: e.outcome, ties: leadingTies, playerPair: e.playerPair, bankerPair: e.bankerPair });
    leadingTies = 0;
  }
  return cells;
}
