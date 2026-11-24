/*
 * Blackjack house rules. The default table follows the official
 * "Blackjack (RWS) Game Rules, Version 5" approved by Singapore's Gambling
 * Regulatory Authority (effective 11 June 2019):
 * https://www.gra.gov.sg/ → Game Rules for Casinos (RWS) → Blackjack and Pontoon Games
 *
 * Kept as data so other casinos (e.g. Resorts World Genting) can be added as
 * extra tables once their rules are confirmed.
 */

export type Rules = {
  id: string;
  name: string;
  /** RWS allows 4–8 decks; we deal 6. */
  decks: number;
  /** Reshuffle once this share of the shoe has been dealt. */
  penetration: number;
  /** Dealer draws to 16 and stands on all 17s (rule 3.23). */
  dealerHitsSoft17: boolean;
  /** No hole card: the dealer's second card comes after players act (rule 3.11). */
  holeCard: boolean;
  /** If the dealer makes blackjack, non-busted hands lose only the initial bet (rules 3.21.3, 3.22.2). */
  originalBetsOnly: boolean;
  blackjackPays: number;
  /** Players must hit hard totals below this (rule 3.19). */
  mustHitBelow: number;
  /** Split up to this many hands (rule 3.21.2). */
  maxHands: number;
  /** Aces split once, one card each (rule 3.21.2). */
  splitAcesOnce: boolean;
  doubleAfterSplit: boolean;
  /** Surrender for half, except against a dealer Ace, before any extra cards (rule 3.16). */
  surrender: "none" | "notVsAce";
  insurancePays: number;
  sideBets: { playerPair: number; under13: number; over13: number };
};

export const RWS: Rules = {
  id: "rws",
  name: "Resorts World Sentosa",
  decks: 6,
  penetration: 0.75,
  dealerHitsSoft17: false,
  holeCard: false,
  originalBetsOnly: true,
  blackjackPays: 1.5,
  mustHitBelow: 12,
  maxHands: 4,
  splitAcesOnce: true,
  doubleAfterSplit: true,
  surrender: "notVsAce",
  insurancePays: 2,
  sideBets: { playerPair: 11, under13: 1, over13: 1 },
};
