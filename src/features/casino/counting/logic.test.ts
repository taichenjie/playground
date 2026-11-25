import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card } from "../cards.ts";
import { SHOE_CARDS, acceptableTrueCounts, betUnits, decksLeft, hiLo, makeDrill, runningCount, scoreFor } from "./logic.ts";

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe("Hi-Lo", () => {
  it("tags cards +1, 0 or −1", () => {
    assert.deepEqual(["2♠", "6♥", "7♦", "9♣", "10♠", "K♥", "A♦"].map((c) => hiLo(card(c))), [1, 1, 0, 0, -1, -1, -1]);
  });

  it("balances to zero over a full deck", () => {
    assert.equal(runningCount(makeDrill("deck", rand).cards), 0);
  });
});

describe("true count and betting", () => {
  it("reads decks left to the nearest half", () => {
    assert.equal(decksLeft(312), 6);
    assert.equal(decksLeft(130), 2.5);
    assert.equal(decksLeft(10), 0.5);
  });

  it("accepts floored, truncated or rounded true counts", () => {
    assert.deepEqual(acceptableTrueCounts(7, 2).sort(), [3, 4]);
    assert.deepEqual(acceptableTrueCounts(-7, 2).sort(), [-3, -4].sort());
    assert.deepEqual(acceptableTrueCounts(6, 3), [2]);
    assert.deepEqual(acceptableTrueCounts(1, 5), [0]);
  });

  it("ramps bets from 1 to 8 units", () => {
    assert.equal(betUnits(-3), 1);
    assert.equal(betUnits(1), 1);
    assert.equal(betUnits(3), 2);
    assert.equal(betUnits(5.9), 4);
    assert.equal(betUnits(20), 8);
  });
});

describe("drills", () => {
  it("builds a deck countdown with quarter-deck checks", () => {
    const d = makeDrill("deck", rand);
    assert.equal(d.cards.length, 52);
    assert.deepEqual(d.checks.map((c) => c.after), [13, 26, 39, 52]);
  });

  it("deals the shoe drill in hand-sized groups with a final true-count check", () => {
    const d = makeDrill("shoe", rand);
    assert.equal(d.cards.length, SHOE_CARDS);
    assert.equal(d.groups.reduce((s, g) => s + g, 0), SHOE_CARDS);
    assert.ok(d.groups.every((g) => g >= 1 && g <= 5));
    assert.equal(d.checks.at(-1)!.after, SHOE_CARDS);
    assert.ok(d.checks.at(-1)!.askTrue);
    assert.ok(d.checks.some((c) => !c.askTrue));
  });

  it("scores faster speeds and streaks higher", () => {
    assert.ok(scoreFor("running", "shark", 0) > scoreFor("running", "rookie", 0));
    assert.ok(scoreFor("running", "rookie", 5) > scoreFor("running", "rookie", 0));
  });
});
