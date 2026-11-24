/*
 * Texas Hold'em hand evaluator. Scores the best 5-card hand from 5–7 cards
 * as a single number: higher is better, equal means a split pot.
 * Fast enough for thousands of bot simulations per decision.
 */
import type { Card, Rank } from "../cards.ts";

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};
const SUIT_INDEX = { "♠": 0, "♥": 1, "♦": 2, "♣": 3 } as const;

/** Compact card code for fast evaluation: rank (2–14) * 4 + suit (0–3). */
export const code = (c: Card) => RANK_VALUE[c.rank] * 4 + SUIT_INDEX[c.suit];

export const CATEGORY = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
] as const;

/** Highest straight in a rank bitmask (bit r set for rank r), or 0. Handles A-2-3-4-5. */
function straightHigh(mask: number): number {
  for (let high = 14; high >= 6; high--) {
    const run = 0b11111 << (high - 4);
    if ((mask & run) === run) return high;
  }
  // Wheel: A,2,3,4,5
  const wheel = (1 << 14) | 0b111100;
  return (mask & wheel) === wheel ? 5 : 0;
}

const pack = (category: number, kickers: number[]) => {
  let score = category;
  for (let i = 0; i < 5; i++) score = score * 16 + (kickers[i] ?? 0);
  return score;
};

/** Scores 5–7 card codes. */
export function scoreCodes(codes: number[]): number {
  const counts = new Array<number>(15).fill(0);
  const suitCounts = [0, 0, 0, 0];
  const suitMasks = [0, 0, 0, 0];
  let mask = 0;
  for (const c of codes) {
    const r = c >> 2;
    const s = c & 3;
    counts[r]++;
    suitCounts[s]++;
    suitMasks[s] |= 1 << r;
    mask |= 1 << r;
  }

  // Flush / straight flush
  for (let s = 0; s < 4; s++) {
    if (suitCounts[s] >= 5) {
      const sf = straightHigh(suitMasks[s]);
      if (sf) return pack(8, [sf]);
      const ranks: number[] = [];
      for (let r = 14; r >= 2 && ranks.length < 5; r--) if (suitMasks[s] & (1 << r)) ranks.push(r);
      // A flush can't coexist with quads/full house in 7 cards from one deck? It can't beat them, so check those first.
      const quadsOrBoat = counts.some((n) => n >= 4) || (counts.some((n) => n >= 3) && counts.filter((n) => n >= 2).length >= 2);
      if (!quadsOrBoat) return pack(5, ranks);
    }
  }

  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 14; r >= 2; r--) {
    const n = counts[r];
    if (n === 4) quads.push(r);
    else if (n === 3) trips.push(r);
    else if (n === 2) pairs.push(r);
    else if (n === 1) singles.push(r);
  }

  if (quads.length) {
    const kicker = Math.max(...[...trips, ...pairs, ...singles, ...quads.slice(1)], 0);
    return pack(7, [quads[0], kicker]);
  }
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const pairRank = Math.max(trips[1] ?? 0, pairs[0] ?? 0);
    return pack(6, [trips[0], pairRank]);
  }
  // Flush beats straight; re-check flush when quads/boat weren't present (handled above) — here none exist.
  for (let s = 0; s < 4; s++) {
    if (suitCounts[s] >= 5) {
      const ranks: number[] = [];
      for (let r = 14; r >= 2 && ranks.length < 5; r--) if (suitMasks[s] & (1 << r)) ranks.push(r);
      return pack(5, ranks);
    }
  }
  const st = straightHigh(mask);
  if (st) return pack(4, [st]);
  if (trips.length) return pack(3, [trips[0], ...singles.slice(0, 2)]);
  if (pairs.length >= 2) {
    const kicker = Math.max(pairs[2] ?? 0, singles[0] ?? 0);
    return pack(2, [pairs[0], pairs[1], kicker]);
  }
  if (pairs.length === 1) return pack(1, [pairs[0], ...singles.slice(0, 3)]);
  return pack(0, singles.slice(0, 5));
}

export const scoreCards = (cards: Card[]) => scoreCodes(cards.map(code));

export const categoryOf = (score: number) => Math.floor(score / 16 ** 5);

const NAME: Record<number, string> = {
  2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens", 8: "Eights", 9: "Nines",
  10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces",
};
const ONE: Record<number, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine",
  10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace",
};

/** Human-readable name, e.g. "Two Pair, Kings and Fours". */
export function describeScore(score: number): string {
  const cat = categoryOf(score);
  const k = (i: number) => Math.floor(score / 16 ** (4 - i)) % 16;
  switch (cat) {
    case 8:
      return k(0) === 14 ? "Royal Flush" : `Straight Flush, ${ONE[k(0)]} high`;
    case 7:
      return `Four ${NAME[k(0)]}`;
    case 6:
      return `Full House, ${NAME[k(0)]} over ${NAME[k(1)]}`;
    case 5:
      return `Flush, ${ONE[k(0)]} high`;
    case 4:
      return `Straight, ${ONE[k(0)]} high`;
    case 3:
      return `Three ${NAME[k(0)]}`;
    case 2:
      return `Two Pair, ${NAME[k(0)]} and ${NAME[k(1)]}`;
    case 1:
      return `Pair of ${NAME[k(0)]}`;
    default:
      return `${ONE[k(0)]} high`;
  }
}

/** The five cards that make the best hand (for highlighting). */
export function bestFive(cards: Card[]): Card[] {
  if (cards.length <= 5) return cards;
  let best: Card[] = cards.slice(0, 5);
  let bestScore = -1;
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const five = [cards[a], cards[b], cards[c], cards[d], cards[e]];
            const s = scoreCards(five);
            if (s > bestScore) {
              bestScore = s;
              best = five;
            }
          }
  return best;
}
