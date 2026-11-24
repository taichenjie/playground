/*
 * Blackjack round, following the RWS rules in rules.ts. Pure state machine:
 * every action returns a new state. Chips are tracked as stakes on the table
 * and `returned` (what goes back to the player at settlement).
 *
 * Deal order (rule 3.11): player, dealer (face up), player. No hole card —
 * the dealer's second card is drawn after all players have acted.
 */
import { createShoe, type Card } from "../cards.ts";
import type { Rules } from "./rules.ts";
import { handTotal } from "./strategy.ts";

export const cardValue = (c: Card) => (c.rank === "A" ? 1 : c.rank === "J" || c.rank === "Q" || c.rank === "K" ? 10 : Number(c.rank));
export const values = (cards: Card[]) => cards.map(cardValue);
export const totalOf = (cards: Card[]) => handTotal(values(cards));

export type Outcome = "blackjack" | "win" | "push" | "lose" | "bust" | "surrender" | "evenMoney";

export type Hand = {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  done: boolean;
  surrendered: boolean;
  evenMoney: boolean;
  outcome?: Outcome;
  payout?: number;
};

export type SideBets = { pair: number; under13: number; over13: number };
export type SideResults = { pair: number; under13: number; over13: number };

export type Phase = "betting" | "insurance" | "player" | "dealer" | "settled";

export type GameState = {
  shoe: Card[];
  shoeSize: number;
  /** Set when the cut card came out; the shoe is replaced before the next round. */
  reshuffleDue: boolean;
  phase: Phase;
  hands: Hand[];
  active: number;
  dealer: Card[];
  initialBet: number;
  side: SideBets;
  /** Chips returned by each side bet (stake + win), settled straight after the deal. */
  sideReturns: SideResults;
  insurance: number;
  /** Total chips handed back at settlement (hands + insurance + side bets). */
  returned: number;
};

export const NO_SIDE: SideBets = { pair: 0, under13: 0, over13: 0 };

export function newShoe(rules: Rules, rand?: () => number) {
  const shoe = createShoe(rules.decks, rand);
  return { shoe, shoeSize: shoe.length, reshuffleDue: false };
}

/**
 * A table with no shoe yet — safe to create during render (no randomness).
 * The first `deal` shuffles a fresh shoe.
 */
export function idleGame(rules: Rules): GameState {
  return { ...emptyGame(rules, () => 0), shoe: [], reshuffleDue: true };
}

export function emptyGame(rules: Rules, rand?: () => number): GameState {
  return {
    ...newShoe(rules, rand),
    phase: "betting",
    hands: [],
    active: 0,
    dealer: [],
    initialBet: 0,
    side: NO_SIDE,
    sideReturns: { pair: 0, under13: 0, over13: 0 },
    insurance: 0,
    returned: 0,
  };
}

function draw(s: GameState, rules: Rules): [Card, GameState] {
  const [card, ...rest] = s.shoe;
  const dealt = s.shoeSize - rest.length;
  return [card, { ...s, shoe: rest, reshuffleDue: s.reshuffleDue || dealt >= s.shoeSize * rules.penetration }];
}

export const isBlackjack = (h: { cards: Card[]; fromSplit?: boolean }) =>
  !h.fromSplit && h.cards.length === 2 && totalOf(h.cards).total === 21;

/** Total chips on the table for this round. */
export const totalStaked = (s: GameState) =>
  s.hands.reduce((sum, h) => sum + h.bet, 0) + s.side.pair + s.side.under13 + s.side.over13 + s.insurance;

/* ---------- Deal ---------- */

export function deal(state: GameState, bet: number, side: SideBets, rules: Rules, rand?: () => number): GameState {
  let s: GameState = state.reshuffleDue || state.shoe.length < 20 ? { ...state, ...newShoe(rules, rand) } : state;
  s = { ...s, hands: [], dealer: [], active: 0, insurance: 0, returned: 0, initialBet: bet, side };

  const [c1, s1] = draw(s, rules);
  const [up, s2] = draw(s1, rules);
  const [c2, s3] = draw(s2, rules);
  s = s3;

  const hand: Hand = { cards: [c1, c2], bet, doubled: false, fromSplit: false, done: false, surrendered: false, evenMoney: false };

  // Side bets settle immediately (rule 3.13). Aces count 1; blackjack counts as under 13.
  const pairWin = c1.rank === c2.rank;
  const raw = cardValue(c1) + cardValue(c2);
  const sideReturns = {
    pair: pairWin ? side.pair * (rules.sideBets.playerPair + 1) : 0,
    under13: raw < 13 ? side.under13 * (rules.sideBets.under13 + 1) : 0,
    over13: raw > 13 ? side.over13 * (rules.sideBets.over13 + 1) : 0,
  };

  s = { ...s, dealer: [up], hands: [hand], sideReturns };

  if (cardValue(up) === 1) return { ...s, phase: "insurance" };
  return afterInitial(s, rules);
}

/** After any insurance decision: pay naturals immediately when the dealer can't have blackjack (rule 3.15). */
function afterInitial(s: GameState, rules: Rules): GameState {
  const hand = s.hands[0];
  if (isBlackjack(hand)) {
    const up = cardValue(s.dealer[0]);
    const done = { ...s, hands: [{ ...hand, done: true }] };
    return up === 1 || up === 10 ? { ...done, phase: "dealer" } : settle(done, rules);
  }
  return { ...s, phase: "player" };
}

/** Dealer shows an Ace. `take` = insurance (or even money if you hold blackjack). Caller pays the insurance stake. */
export function decideInsurance(s: GameState, take: boolean, rules: Rules): GameState {
  if (s.phase !== "insurance") return s;
  const hand = s.hands[0];
  if (isBlackjack(hand)) {
    if (take) {
      const paid = { ...hand, done: true, evenMoney: true };
      return { ...s, hands: [paid], phase: "dealer" };
    }
    return afterInitial(s, rules);
  }
  return afterInitial({ ...s, insurance: take ? Math.floor(s.initialBet / 2) : 0 }, rules);
}

/* ---------- Player actions ---------- */

const active = (s: GameState) => s.hands[s.active];

function replace(s: GameState, hand: Hand): GameState {
  return { ...s, hands: s.hands.map((h, i) => (i === s.active ? hand : h)) };
}

function advance(s: GameState, rules: Rules): GameState {
  const next = s.hands.findIndex((h) => !h.done);
  if (next !== -1) {
    // A split hand waiting for its second card gets it now (rule 3.21.2).
    let state = { ...s, active: next };
    const h = state.hands[next];
    if (h.cards.length === 1) {
      let c: Card;
      [c, state] = draw(state, rules);
      const cards = [...h.cards, c];
      const aces = cardValue(h.cards[0]) === 1 && rules.splitAcesOnce;
      state = replace(state, { ...h, cards, done: aces || totalOf(cards).total === 21 });
      return advance(state, rules);
    }
    return state;
  }
  return { ...s, phase: "dealer" };
}

export type Allowed = Record<"hit" | "stand" | "double" | "split" | "surrender", boolean>;

export function allowedActions(s: GameState, rules: Rules): Allowed {
  const none = { hit: false, stand: false, double: false, split: false, surrender: false };
  if (s.phase !== "player") return none;
  const h = active(s);
  const { total, soft } = totalOf(h.cards);
  const two = h.cards.length === 2;
  const splitAces = h.fromSplit && cardValue(h.cards[0]) === 1;
  return {
    hit: total < 21,
    stand: soft || total >= rules.mustHitBelow,
    double: two && total < 21 && !splitAces && (!h.fromSplit || rules.doubleAfterSplit),
    split:
      two &&
      cardValue(h.cards[0]) === cardValue(h.cards[1]) &&
      s.hands.length < rules.maxHands &&
      !(cardValue(h.cards[0]) === 1 && h.fromSplit && rules.splitAcesOnce),
    surrender:
      rules.surrender === "notVsAce" && cardValue(s.dealer[0]) !== 1 && s.hands.length === 1 && two && !h.fromSplit,
  };
}

export function hit(s: GameState, rules: Rules): GameState {
  if (!allowedActions(s, rules).hit) return s;
  let c: Card;
  [c, s] = draw(s, rules);
  const h = active(s);
  const cards = [...h.cards, c];
  return advance(replace(s, { ...h, cards, done: totalOf(cards).total >= 21 }), rules);
}

export function stand(s: GameState, rules: Rules): GameState {
  if (!allowedActions(s, rules).stand) return s;
  return advance(replace(s, { ...active(s), done: true }), rules);
}

/** Caller pays the extra stake (equal to the hand's bet). */
export function double(s: GameState, rules: Rules): GameState {
  if (!allowedActions(s, rules).double) return s;
  let c: Card;
  [c, s] = draw(s, rules);
  const h = active(s);
  return advance(replace(s, { ...h, cards: [...h.cards, c], bet: h.bet * 2, doubled: true, done: true }), rules);
}

/** Caller pays the second stake. The first new hand gets its card now, the next one when you reach it. */
export function split(s: GameState, rules: Rules): GameState {
  if (!allowedActions(s, rules).split) return s;
  const h = active(s);
  const base = { bet: h.bet, doubled: false, fromSplit: true, done: false, surrendered: false, evenMoney: false };
  const first: Hand = { ...base, cards: [h.cards[0]] };
  const second: Hand = { ...base, cards: [h.cards[1]] };
  const hands = [...s.hands.slice(0, s.active), first, second, ...s.hands.slice(s.active + 1)];
  return advance({ ...s, hands }, rules);
}

export function surrender(s: GameState, rules: Rules): GameState {
  if (!allowedActions(s, rules).surrender) return s;
  return advance(replace(s, { ...active(s), done: true, surrendered: true }), rules);
}

/* ---------- Dealer & settlement ---------- */

/** True when no hand still needs the dealer's total (all bust or surrendered). */
const nothingToPlayFor = (s: GameState) =>
  s.insurance === 0 &&
  s.hands.every((h) => h.surrendered || h.evenMoney || totalOf(h.cards).total > 21);

/** Dealer draws one card per call (for animation). Settles when finished. */
export function dealerStep(s: GameState, rules: Rules): GameState {
  if (s.phase !== "dealer") return s;
  if (s.dealer.length === 1) {
    let c: Card;
    [c, s] = draw(s, rules);
    s = { ...s, dealer: [...s.dealer, c] };
    if (isBlackjack({ cards: s.dealer }) || nothingToPlayFor(s)) return settle(s, rules);
    return s;
  }
  const { total, soft } = totalOf(s.dealer);
  const hits = total < 17 || (total === 17 && soft && rules.dealerHitsSoft17);
  if (!hits) return settle(s, rules);
  let c: Card;
  [c, s] = draw(s, rules);
  return { ...s, dealer: [...s.dealer, c] };
}

export function settle(s: GameState, rules: Rules): GameState {
  const dealerBJ = isBlackjack({ cards: s.dealer });
  const dealerTotal = totalOf(s.dealer).total;
  let originalBetTaken = false;

  const hands = s.hands.map((h): Hand => {
    const total = totalOf(h.cards).total;
    let outcome: Outcome;
    let payout: number;
    if (h.surrendered) [outcome, payout] = ["surrender", h.bet - Math.floor(h.bet / 2)];
    else if (h.evenMoney) [outcome, payout] = ["evenMoney", h.bet * 2];
    else if (total > 21) [outcome, payout] = ["bust", 0];
    else if (isBlackjack(h)) {
      [outcome, payout] = dealerBJ ? ["push", h.bet] : ["blackjack", h.bet + Math.round(h.bet * rules.blackjackPays)];
    } else if (dealerBJ) {
      // Original bets only: across all live hands you lose just the initial bet.
      const loss = rules.originalBetsOnly ? (originalBetTaken ? 0 : Math.min(h.bet, s.initialBet)) : h.bet;
      originalBetTaken = true;
      [outcome, payout] = ["lose", h.bet - loss];
    } else if (dealerTotal > 21 || total > dealerTotal) [outcome, payout] = ["win", h.bet * 2];
    else if (total === dealerTotal) [outcome, payout] = ["push", h.bet];
    else [outcome, payout] = ["lose", 0];
    return { ...h, outcome, payout, done: true };
  });

  const insuranceReturn = dealerBJ ? s.insurance * (rules.insurancePays + 1) : 0;
  const sideReturn = s.sideReturns.pair + s.sideReturns.under13 + s.sideReturns.over13;
  const returned = hands.reduce((sum, h) => sum + (h.payout ?? 0), 0) + insuranceReturn + sideReturn;
  return { ...s, phase: "settled", hands, returned };
}
