import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RWS } from "./rules.ts";
import { bestAction, buildChart, dealerDistribution, insuranceEV, type Action } from "./strategy.ts";

const best = (cards: number[], up: number, opts: Partial<{ d: boolean; p: boolean; r: boolean }> = {}): Action =>
  bestAction(
    { cards, dealerUp: up, canDouble: opts.d ?? true, canSplit: opts.p ?? cards[0] === cards[1], canSurrender: opts.r ?? true },
    RWS,
  ).action;

describe("dealer model", () => {
  it("sums to 1 for every up-card", () => {
    for (let up = 1; up <= 10; up++) {
      const total = dealerDistribution(up, RWS).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(total - 1) < 1e-9, `up ${up}`);
    }
  });

  it("busts most often showing a 5 or 6", () => {
    const bust = (up: number) => dealerDistribution(up, RWS)[5];
    assert.ok(bust(6) > 0.4 && bust(5) > 0.4);
    assert.ok(bust(10) < 0.25);
  });
});

describe("basic strategy for RWS rules", () => {
  it("matches well-known hard-total plays", () => {
    assert.equal(best([10, 2], 2), "hit");
    assert.equal(best([10, 2], 4), "stand");
    assert.equal(best([10, 3], 2), "stand");
    assert.equal(best([10, 6], 7), "hit");
    assert.equal(best([5, 6], 6), "double");
    assert.equal(best([4, 6], 9), "double");
    assert.equal(best([4, 6], 10), "hit");
    assert.equal(best([4, 5], 3), "double");
    assert.equal(best([10, 7], 10), "stand");
  });

  it("surrenders hard 15–16 against a 10 but never against an Ace", () => {
    assert.equal(best([10, 6], 10), "surrender");
    assert.equal(best([10, 5], 10), "surrender");
    assert.notEqual(best([10, 6], 1), "surrender");
  });

  it("matches soft-total plays", () => {
    assert.equal(best([1, 7], 2), "stand");
    assert.equal(best([1, 7], 4), "double");
    assert.equal(best([1, 7], 4, { d: false }), "stand");
    assert.equal(best([1, 7], 9), "hit");
    assert.equal(best([1, 6], 3), "double");
    assert.equal(best([1, 8], 6), "stand");
  });

  it("matches pair plays", () => {
    assert.equal(best([1, 1], 6), "split");
    assert.equal(best([8, 8], 6), "split");
    assert.equal(best([10, 10], 6), "stand");
    assert.equal(best([9, 9], 7), "stand");
    assert.equal(best([9, 9], 6), "split");
    assert.equal(best([5, 5], 6), "double");
  });

  it("never stands below 12 (RWS rule 3.19)", () => {
    const v = bestAction({ cards: [4, 7], dealerUp: 6, canDouble: false, canSplit: false, canSurrender: false }, RWS).values;
    assert.equal(v.stand, undefined);
  });

  it("rejects insurance and even money", () => {
    assert.ok(insuranceEV(RWS) < 0);
  });

  it("builds a full chart", () => {
    const chart = buildChart(RWS);
    assert.deepEqual(chart.map((t) => t.rows.length), [10, 8, 10]);
    assert.ok(chart.every((t) => t.rows.every((r) => r.cells.length === 10)));
  });
});
