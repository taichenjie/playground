import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILY_REFILL,
  LEAGUES,
  NEW_PROFILE,
  applyResult,
  breakIntoChips,
  canClaimRefill,
  claimRefill,
  isBroke,
  pileBreakdown,
  transfer,
} from "./economy.ts";

describe("bankroll", () => {
  it("goes broke and unlocks a refill only on a later day", () => {
    const { profile } = applyResult(NEW_PROFILE, -998, 1, 10);
    assert.ok(isBroke(profile));
    assert.equal(profile.brokeOn, 10);
    assert.ok(!canClaimRefill(profile, 10));
    assert.ok(canClaimRefill(profile, 11));
    const refilled = claimRefill(profile, 11);
    assert.equal(refilled.bankroll, 2 + DAILY_REFILL);
    assert.equal(refilled.brokeOn, null);
    assert.equal(claimRefill(refilled, 12), refilled);
  });

  it("never goes negative and tracks the peak", () => {
    const { profile } = applyResult(NEW_PROFILE, -5000, 1, 1);
    assert.equal(profile.bankroll, 0);
    const up = applyResult(NEW_PROFILE, 700, 1, 1).profile;
    assert.equal(up.peak, 1700);
  });

  it("refuses transfers the bankroll can't cover", () => {
    assert.equal(transfer(NEW_PROFILE, -1500, 1), null);
    assert.equal(transfer(NEW_PROFILE, -400, 1)!.bankroll, 600);
  });
});

describe("leagues", () => {
  it("promotes only with enough bankroll and enough hands", () => {
    const rich = { ...NEW_PROFILE, bankroll: 3000 };
    assert.equal(applyResult(rich, 0, 1, 1).change, null);
    const r = applyResult({ ...rich, handsInLeague: 99 }, 0, 1, 1);
    assert.equal(r.change?.kind, "promoted");
    assert.equal(r.profile.league, 1);
    assert.equal(r.profile.handsInLeague, 0);
  });

  it("relegates when the bankroll falls too far", () => {
    const silver = { ...NEW_PROFILE, league: 1, bankroll: 1000 };
    const r = applyResult(silver, -300, 1, 1);
    assert.equal(r.change?.kind, "relegated");
    assert.equal(r.profile.league, 0);
  });

  it("keeps table minimums rising with each league", () => {
    for (let i = 1; i < LEAGUES.length; i++) {
      assert.ok(LEAGUES[i].blackjack.min > LEAGUES[i - 1].blackjack.min);
      assert.ok(LEAGUES[i].poker[0].bb > LEAGUES[i - 1].poker[0].bb);
      assert.ok(LEAGUES[i].relegateBelow >= LEAGUES[i].blackjack.min * 20, `${LEAGUES[i].name} relegation leaves room to play`);
    }
  });
});

describe("chips", () => {
  it("breaks amounts into the fewest chips", () => {
    assert.deepEqual(breakIntoChips(135), [
      { value: 100, count: 1 },
      { value: 25, count: 1 },
      { value: 5, count: 2 },
    ]);
    assert.deepEqual(breakIntoChips(0), []);
  });
});

describe("pot piles", () => {
  it("grows with the pot and stays a sensible size", () => {
    const chips = (amount: number) => pileBreakdown(amount, 2).reduce((s, c) => s + c.count, 0);
    assert.ok(chips(3) < chips(40));
    assert.ok(chips(40) < chips(200));
    assert.ok(chips(5000) <= 48);
    const total = (amount: number) => pileBreakdown(amount, 2).reduce((s, c) => s + c.value * c.count, 0);
    for (const a of [3, 47, 199, 1234, 99999]) assert.equal(total(a), a);
  });
});
