import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card } from "../cards.ts";
import {
  NO_SIDE,
  allowedActions,
  dealerStep,
  deal,
  decideInsurance,
  double,
  emptyGame,
  hit,
  split,
  stand,
  surrender,
  type GameState,
} from "./logic.ts";
import { RWS } from "./rules.ts";

/** Shoe that deals these cards first: player, dealer, player, then draws in order. */
function rigged(...codes: string[]): GameState {
  const base = emptyGame(RWS, () => 0.42);
  return { ...base, shoe: [...codes.map((c, i) => card(c, 1000 + i)), ...base.shoe] };
}

const playDealer = (s: GameState) => {
  while (s.phase === "dealer") s = dealerStep(s, RWS);
  return s;
};

describe("deal & naturals", () => {
  it("deals player, dealer, player with one dealer card face up", () => {
    const s = deal(rigged("9♠", "6♥", "7♦"), 10, NO_SIDE, RWS);
    assert.equal(s.hands[0].cards.length, 2);
    assert.equal(s.dealer.length, 1);
    assert.equal(s.phase, "player");
  });

  it("pays a blackjack 3:2 at once when the dealer shows 2–9", () => {
    const s = deal(rigged("A♠", "6♥", "K♦"), 10, NO_SIDE, RWS);
    assert.equal(s.phase, "settled");
    assert.equal(s.hands[0].outcome, "blackjack");
    assert.equal(s.returned, 25);
  });

  it("waits for the dealer's card on a 10, and pushes against a dealer blackjack", () => {
    let s = deal(rigged("A♠", "K♥", "Q♦", "A♣"), 10, NO_SIDE, RWS);
    assert.equal(s.phase, "dealer");
    s = playDealer(s);
    assert.equal(s.hands[0].outcome, "push");
    assert.equal(s.returned, 10);
  });

  it("offers even money against an Ace", () => {
    let s = deal(rigged("A♠", "A♥", "K♦", "5♣"), 10, NO_SIDE, RWS);
    assert.equal(s.phase, "insurance");
    s = playDealer(decideInsurance(s, true, RWS));
    assert.equal(s.hands[0].outcome, "evenMoney");
    assert.equal(s.returned, 20);
  });

  it("pays insurance 2:1 when the dealer makes blackjack", () => {
    let s = deal(rigged("10♠", "A♥", "8♦", "K♣"), 10, NO_SIDE, RWS);
    s = decideInsurance(s, true, RWS);
    assert.equal(s.insurance, 5);
    s = stand(s, RWS);
    s = playDealer(s);
    assert.equal(s.hands[0].outcome, "lose");
    assert.equal(s.returned, 15);
  });
});

describe("player options (RWS)", () => {
  it("forbids standing below 12", () => {
    const s = deal(rigged("4♠", "9♥", "7♦"), 10, NO_SIDE, RWS);
    assert.equal(allowedActions(s, RWS).stand, false);
    assert.equal(stand(s, RWS), s);
  });

  it("allows surrender except against an Ace, returning half", () => {
    let s = deal(rigged("10♠", "10♥", "6♦", "7♣"), 10, NO_SIDE, RWS);
    assert.ok(allowedActions(s, RWS).surrender);
    s = playDealer(surrender(s, RWS));
    assert.equal(s.hands[0].outcome, "surrender");
    assert.equal(s.returned, 5);
    const vsAce = decideInsurance(deal(rigged("10♠", "A♥", "6♦", "7♣"), 10, NO_SIDE, RWS), false, RWS);
    assert.equal(allowedActions(vsAce, RWS).surrender, false);
  });

  it("splits any two ten-value cards, up to four hands", () => {
    let s = deal(rigged("K♠", "6♥", "10♦", "J♣", "Q♣", "K♥", "5♦"), 10, NO_SIDE, RWS);
    assert.ok(allowedActions(s, RWS).split);
    s = split(s, RWS); // K | 10 → K gets J
    s = split(s, RWS); // K J → K | J → K gets Q
    s = split(s, RWS); // K Q → K | Q → K gets K
    assert.equal(s.hands.length, 4);
    assert.equal(allowedActions(s, RWS).split, false);
  });

  it("gives split aces one card each and never a blackjack", () => {
    let s = deal(rigged("A♠", "6♥", "A♦", "K♣", "9♣"), 10, NO_SIDE, RWS);
    s = split(s, RWS);
    assert.equal(s.phase, "dealer");
    assert.ok(s.hands.every((h) => h.done && h.cards.length === 2));
    s = playDealer(s); // dealer 6 + draws…
    assert.notEqual(s.hands[0].outcome, "blackjack");
  });

  it("doubles after a split", () => {
    let s = deal(rigged("8♠", "6♥", "8♦", "3♣", "2♣"), 10, NO_SIDE, RWS);
    s = split(s, RWS); // first hand 8+3 = 11
    assert.ok(allowedActions(s, RWS).double);
    s = double(s, RWS);
    assert.equal(s.hands[0].bet, 20);
    assert.equal(s.active, 1);
  });
});

describe("original bets only", () => {
  it("loses only the initial bet on a doubled hand when the dealer makes blackjack", () => {
    let s = deal(rigged("6♠", "10♥", "5♦", "9♣", "A♣"), 10, NO_SIDE, RWS);
    s = double(s, RWS); // 6+5+9 = 20, bet 20
    s = playDealer(s); // dealer 10 + A = blackjack
    assert.equal(s.hands[0].outcome, "lose");
    assert.equal(s.returned, 10); // the extra 10 comes back
  });

  it("loses only one initial bet across split hands", () => {
    let s = deal(rigged("8♠", "10♥", "8♦", "10♣", "9♦", "A♣"), 10, NO_SIDE, RWS);
    s = split(s, RWS);
    s = stand(s, RWS); // 18
    s = stand(s, RWS); // 17
    s = playDealer(s);
    assert.equal(s.returned, 10); // staked 20, lost 10
  });

  it("still loses the full bet on a busted hand", () => {
    let s = deal(rigged("10♠", "10♥", "6♦", "9♣", "A♣"), 10, NO_SIDE, RWS);
    s = hit(s, RWS); // 25 bust
    assert.equal(s.hands[0].outcome ?? "bust", "bust");
    s = playDealer(s);
    assert.equal(s.returned, 0);
  });
});

describe("side bets", () => {
  it("pays a pair 11:1 and Under 13 even money", () => {
    const s = deal(rigged("5♠", "9♥", "5♦"), 10, { pair: 5, under13: 5, over13: 5 }, RWS);
    assert.deepEqual(s.sideReturns, { pair: 60, under13: 10, over13: 0 });
  });

  it("lets the house win both on exactly 13, and counts blackjack as under", () => {
    assert.deepEqual(deal(rigged("6♠", "9♥", "7♦"), 10, { pair: 0, under13: 5, over13: 5 }, RWS).sideReturns, {
      pair: 0, under13: 0, over13: 0,
    });
    assert.equal(deal(rigged("A♠", "9♥", "K♦"), 10, { pair: 0, under13: 5, over13: 0 }, RWS).sideReturns.under13, 10);
  });
});
