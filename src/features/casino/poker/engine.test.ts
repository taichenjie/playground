import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card, createShoe } from "../cards.ts";
import { act, buildPots, createTable, legalActions, potTotal, startHand, type Table } from "./engine.ts";

const seats = (...stacks: number[]) => stacks.map((stack, i) => ({ name: `P${i}`, isHuman: i === 0, stack }));
const chips = (t: Table) => t.seats.reduce((s, x) => s + x.stack, 0) + potTotal(t) * (t.phase === "done" ? 0 : 1);

/** Replace the deck so hands are predictable: cards dealt in seat order twice, then burn/board. */
function withDeck(t: Table, codes: string[]): Table {
  const rest = createShoe(1, () => 0.5).filter((c) => !codes.includes(c.rank + c.suit));
  return { ...t, deck: [...codes.map((c, i) => card(c, 900 + i)), ...rest] };
}

describe("blinds & order", () => {
  it("posts blinds left of the button and starts action under the gun", () => {
    const t = startHand(createTable(seats(100, 100, 100, 100), 1, 2), () => 0.3);
    assert.equal(t.button, 0);
    assert.equal(t.sbSeat, 1);
    assert.equal(t.bbSeat, 2);
    assert.equal(t.toAct, 3);
    assert.equal(potTotal(t), 3);
    assert.ok(t.seats.every((s) => s.cards.length === 2));
  });

  it("heads-up: the button is the small blind and acts first", () => {
    const t = startHand(createTable(seats(100, 100), 1, 2), () => 0.3);
    assert.equal(t.sbSeat, t.button);
    assert.equal(t.toAct, t.button);
  });

  it("moves the button each hand", () => {
    let t = startHand(createTable(seats(100, 100, 100), 1, 2), () => 0.3);
    const first = t.button;
    t = act(act(t, { type: "fold" }), { type: "fold" });
    t = startHand(t, () => 0.3);
    assert.equal(t.button, (first + 1) % 3);
  });
});

describe("betting", () => {
  it("lets the big blind check an unraised pot and moves to the flop", () => {
    let t = startHand(createTable(seats(100, 100, 100), 1, 2), () => 0.3);
    t = act(t, { type: "call" }); // button
    t = act(t, { type: "call" }); // SB
    assert.ok(legalActions(t).check);
    t = act(t, { type: "check" }); // BB
    assert.equal(t.street, "flop");
    assert.equal(t.board.length, 3);
    assert.equal(t.toAct, t.sbSeat);
  });

  it("enforces the minimum raise", () => {
    let t = startHand(createTable(seats(100, 100, 100), 1, 2), () => 0.3);
    t = act(t, { type: "raise", to: 3 }); // too small → bumped to 4
    assert.equal(t.currentBet, 4);
    const legal = legalActions(t);
    assert.equal(legal.raise?.min, 6);
  });

  it("does not reopen betting after an incomplete all-in raise", () => {
    let t = startHand(createTable(seats(100, 100, 13), 1, 2), () => 0.3);
    // Seat 0 is button and acts first in 3-handed.
    t = act(t, { type: "raise", to: 10 }); // raise of 8
    t = act(t, { type: "call" }); // SB calls 10
    t = act(t, { type: "raise", to: 13 }); // BB all-in for 13: only +3, not a full raise
    assert.equal(t.toAct, 0);
    assert.equal(legalActions(t).raise, null);
    assert.equal(legalActions(t).call, 3);
  });

  it("conserves chips through a full hand", () => {
    let t = startHand(createTable(seats(100, 100, 100), 1, 2), () => 0.3);
    const total = 300;
    while (t.phase === "playing") {
      const l = legalActions(t);
      t = act(t, l.check ? { type: "check" } : { type: "call" });
    }
    assert.equal(t.seats.reduce((s, x) => s + x.stack, 0), total);
    assert.ok(chips(t) === total);
  });
});

describe("fuzz", () => {
  it("conserves chips and always finishes over 2,000 random hands", () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let game = 0; game < 2000; game++) {
      const n = 2 + Math.floor(rand() * 8);
      const stacks = Array.from({ length: n }, () => 1 + Math.floor(rand() * 300));
      const total = stacks.reduce((a, b) => a + b, 0);
      let t = startHand(createTable(seats(...stacks), 1, 2), rand);
      let steps = 0;
      while (t.phase === "playing" && steps++ < 500) {
        const l = legalActions(t);
        const r = rand();
        let a: Parameters<typeof act>[1];
        if (l.raise && r < 0.25) a = { type: "raise", to: l.raise.min + Math.floor(rand() * (l.raise.max - l.raise.min + 1)) };
        else if (l.fold && r < 0.45) a = { type: "fold" };
        else if (l.check) a = { type: "check" };
        else a = { type: "call" };
        const next = act(t, a);
        assert.notEqual(next, t, `illegal action stalled game ${game}`);
        t = next;
      }
      assert.equal(t.phase, "done", `game ${game} did not finish`);
      assert.equal(t.seats.reduce((s, x) => s + x.stack, 0), total, `chips not conserved in game ${game}`);
      assert.ok(t.seats.every((s) => s.stack >= 0));
    }
  });
});

describe("pots & showdown", () => {
  it("awards the pot when everyone folds", () => {
    let t = startHand(createTable(seats(100, 100, 100), 1, 2), () => 0.3);
    t = act(t, { type: "raise", to: 6 });
    t = act(t, { type: "fold" });
    t = act(t, { type: "fold" });
    assert.equal(t.phase, "done");
    assert.equal(t.seats[0].stack, 103);
    assert.equal(t.results[0].hand, null);
  });

  it("builds side pots for short all-ins", () => {
    const base = createTable(seats(100, 30, 100), 1, 2).seats;
    const s = base.map((x, i) => ({ ...x, committed: [100, 30, 100][i] }));
    const pots = buildPots(s);
    assert.deepEqual(pots, [
      { amount: 90, eligible: [0, 1, 2] },
      { amount: 140, eligible: [0, 2] },
    ]);
  });

  it("returns an uncalled excess as its own pot to the bettor", () => {
    const base = createTable(seats(100, 100), 1, 2).seats;
    const s = base.map((x, i) => ({ ...x, committed: [80, 50][i] }));
    assert.deepEqual(buildPots(s), [
      { amount: 100, eligible: [0, 1] },
      { amount: 30, eligible: [0] },
    ]);
  });

  it("runs out the board when players are all-in and pays the best hand", () => {
    // Heads-up: button (seat 0) gets A A, seat 1 gets K K; board blanks.
    let t = createTable(seats(50, 50), 1, 2);
    t = startHand(t, () => 0.3);
    t.seats[0].cards = [card("A♠", 1), card("A♥", 2)];
    t.seats[1].cards = [card("K♠", 3), card("K♥", 4)];
    // burn, flop, burn, turn, burn, river — no straights or flushes possible.
    t = withDeck(t, ["5♦", "2♣", "7♦", "9♥", "6♠", "J♠", "8♣", "4♣"]);
    t = act(t, { type: "raise", to: 50 }); // button all-in
    t = act(t, { type: "call" });
    assert.equal(t.phase, "done");
    assert.equal(t.board.length, 5);
    assert.equal(t.seats[0].stack, 100);
    assert.equal(t.results[0].hand, "Pair of Aces");
  });

  it("splits a tied pot", () => {
    let t = createTable(seats(50, 50), 1, 2);
    t = startHand(t, () => 0.3);
    t.seats[0].cards = [card("2♠", 1), card("3♥", 2)];
    t.seats[1].cards = [card("2♦", 3), card("3♣", 4)];
    t.deck = [
      card("4♣", 50), card("A♠", 5), card("K♠", 6), card("Q♦", 7),
      card("4♦", 51), card("J♣", 8), card("4♥", 52), card("10♥", 9), ...t.deck,
    ];
    t = act(t, { type: "raise", to: 50 });
    t = act(t, { type: "call" });
    assert.equal(t.seats[0].stack, 50);
    assert.equal(t.seats[1].stack, 50);
  });

  it("sits out players with no chips", () => {
    const t = startHand(createTable(seats(100, 0, 100), 1, 2), () => 0.3);
    assert.ok(t.seats[1].out);
    assert.equal(t.seats[1].cards.length, 0);
  });
});
