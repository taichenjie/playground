/* Shared playing-card helpers for casino games. Pure, no browser APIs. */

export const SUITS = ["♠", "♥", "♦", "♣"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type Card = { rank: Rank; suit: Suit; id: number };

export const isRed = (card: Card) => card.suit === "♥" || card.suit === "♦";

/** A shuffled shoe of `decks` standard decks. `rand` is injectable for tests. */
export function createShoe(decks: number, rand: () => number = Math.random): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit, id: id++ });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Shorthand for tests: card("A♠"), card("10♥"). */
export function card(code: string, id = 0): Card {
  return { rank: code.slice(0, -1) as Rank, suit: code.slice(-1) as Suit, id };
}
