import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "../economy.ts";
import {
  HOUSE_EDGE,
  OUTSIDE,
  WHEEL,
  colourOf,
  insideKey,
  isValidBet,
  kindOf,
  limitsFor,
  payoutOf,
  returnsFor,
  roomOn,
  spinWheel,
} from "./logic.ts";

describe("wheel", () => {
  it("has every number once, alternating red and black", () => {
    assert.equal(WHEEL.length, 37);
    assert.equal(new Set(WHEEL).size, 37);
    for (let i = 1; i < WHEEL.length - 1; i++) assert.notEqual(colourOf(WHEEL[i]), colourOf(WHEEL[i + 1]));
    assert.equal(colourOf(0), "green");
    assert.equal(OUTSIDE.red.numbers.length, 18);
  });

  it("can land on every pocket", () => {
    let i = 0;
    const seen = new Set(Array.from({ length: 37 }, () => spinWheel(() => (i++ + 0.5) / 37)));
    assert.equal(seen.size, 37);
  });
});

describe("bets", () => {
  it("pays the standard table", () => {
    assert.equal(payoutOf("17"), 35);
    assert.equal(payoutOf("17-20"), 17);
    assert.equal(payoutOf("1-2-3"), 11);
    assert.equal(payoutOf("1-2-4-5"), 8);
    assert.equal(payoutOf("0-1-2-3"), 8);
    assert.equal(payoutOf("1-2-3-4-5-6"), 5);
    assert.equal(payoutOf("dozen2"), 2);
    assert.equal(payoutOf("column1"), 2);
    assert.equal(payoutOf("red"), 1);
  });

  it("names bets", () => {
    assert.equal(kindOf("0-1-2-3"), "First four");
    assert.equal(kindOf("2-3-5-6"), "Corner");
    assert.equal(kindOf("high"), "Even money");
  });

  it("accepts only bets on the layout", () => {
    for (const k of ["0", "36", "1-4", "2-3", "0-2-3", "31-32-33-34-35-36", "32-33-35-36"]) assert.ok(isValidBet(k), k);
    for (const k of ["3-4", "1-5", "34-37", "1-2-3-4", "33-34-36-37", "0-4", "1-1", "red-1", ""]) assert.ok(!isValidBet(k), k);
    assert.equal(insideKey([20, 17]), "17-20");
  });

  it("returns stake plus winnings, and zero loses outside bets", () => {
    const bets = { "17": 10, red: 20, "0-1-2-3": 5 };
    assert.equal(returnsFor(bets, 17), 360);
    assert.equal(returnsFor(bets, 1), 40 + 45);
    assert.equal(returnsFor(bets, 0), 45);
    assert.equal(returnsFor(bets, 2), 45);
    assert.equal(returnsFor(bets, 4), 0);
  });

  it("gives every bet the same 2.7% house edge", () => {
    for (const key of ["17", "1-4", "1-2-3", "1-2-4-5", "1-2-3-4-5-6", "dozen1", "column3", "red", "low"]) {
      let back = 0;
      for (const n of WHEEL) back += returnsFor({ [key]: 1 }, n);
      assert.ok(Math.abs(1 - back / 37 - HOUSE_EDGE) < 1e-9, key);
    }
  });
});

describe("limits", () => {
  it("rise with the league and cap each spot", () => {
    const bronze = limitsFor(LEAGUES[0]);
    assert.deepEqual(bronze, { minSpin: 5, maxInside: 25, maxOutside: 200 });
    assert.ok(limitsFor(LEAGUES[2]).maxInside > bronze.maxInside);
    assert.equal(roomOn({ "17": 20 }, "17", bronze), 5);
    assert.equal(roomOn({ red: 200 }, "red", bronze), 0);
  });
});
