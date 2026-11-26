import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "../economy.ts";
import { HOUSE_EDGE, canTakeDown, limitsFor, resolveRoll, roomFor, takeDown, type Dice, type Point, type Table } from "./logic.ts";

const ALL_DICE: Dice[] = Array.from({ length: 36 }, (_, i) => [1 + Math.floor(i / 6), 1 + (i % 6)]);

/**
 * Exact expected result of one bet, per chip staked: rolls that don't affect
 * it are skipped, and bets that move or wait on a point are followed through.
 */
function value(t: Table, key: string, depth = 0): number {
  let sum = 0;
  let count = 0;
  for (const d of ALL_DICE) {
    const r = resolveRoll(t, d);
    const o = r.outcomes.find((x) => x.key === key);
    if (o?.result === "win") sum += o.won;
    else if (o?.result === "lose") sum -= o.stake;
    else if (o?.result === "push") sum += 0;
    else if (o?.result === "move") sum += value({ point: r.table.point, bets: { [`${key}${r.total}`]: o.stake } }, `${key}${r.total}`, depth + 1);
    else if (r.table.point !== t.point && /^(pass|dontPass)$/.test(key) && depth < 3) sum += value({ point: r.table.point, bets: { [key]: t.bets[key] } }, key, depth + 1);
    else continue;
    count++;
  }
  return sum / count;
}
const edge = (t: Table, key: string) => -value(t, key) / t.bets[key];

describe("house edges match the published figures", () => {
  const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.0006, `${actual} vs ${expected}`);
  it("line bets", () => {
    close(edge({ point: null, bets: { pass: 10 } }, "pass"), 0.0141);
    close(edge({ point: null, bets: { dontPass: 10 } }, "dontPass"), 0.0136);
    close(edge({ point: 6, bets: { come: 10 } }, "come"), 0.0141);
    close(edge({ point: 6, bets: { dontCome: 10 } }, "dontCome"), 0.0136);
  });
  it("odds pay true odds", () => {
    for (const p of [4, 5, 6, 8, 9, 10] as Point[]) {
      close(edge({ point: p, bets: { pass: 10, passOdds: 30 } }, "passOdds"), 0);
      close(edge({ point: p, bets: { dontPass: 10, dontOdds: 60 } }, "dontOdds"), 0);
    }
  });
  it("place, field, hardways and props", () => {
    close(edge({ point: 4, bets: { place6: 6 } }, "place6"), 0.0152);
    close(edge({ point: 4, bets: { place5: 5 } }, "place5"), 0.04);
    close(edge({ point: 5, bets: { place10: 5 } }, "place10"), 0.0667);
    close(edge({ point: null, bets: { field: 10 } }, "field"), 0.0278);
    close(edge({ point: 4, bets: { hard8: 10 } }, "hard8"), 0.0909);
    close(edge({ point: 6, bets: { hard10: 10 } }, "hard10"), 0.1111);
    close(edge({ point: null, bets: { any7: 10 } }, "any7"), 0.1667);
    close(edge({ point: null, bets: { anyCraps: 10 } }, "anyCraps"), 0.1111);
    close(edge({ point: null, bets: { yo: 10 } }, "yo"), 0.1111);
    close(edge({ point: null, bets: { boxcars: 10 } }, "boxcars"), 0.1389);
  });
  it("the rules table agrees", () => {
    assert.equal(HOUSE_EDGE.find((h) => h.bet.startsWith("Odds"))!.edge, 0);
  });
});

describe("a shooter's hand", () => {
  it("sets a point, pays odds on making it, and keeps the line bet up", () => {
    let t: Table = { point: null, bets: { pass: 10 } };
    let r = resolveRoll(t, [3, 3]);
    assert.equal(r.event, "point-set");
    assert.equal(r.table.point, 6);
    t = { ...r.table, bets: { ...r.table.bets, passOdds: 50, place8: 12 } };
    r = resolveRoll(t, [4, 4]);
    assert.equal(r.outcomes.find((o) => o.key === "place8")!.won, 14);
    assert.equal(r.table.bets.place8, 12, "place bets stay up");
    r = resolveRoll(r.table, [5, 1]);
    assert.equal(r.event, "point-made");
    assert.equal(r.returned, 10 + 60 + 50, "line win, odds win, odds stake back");
    assert.equal(r.table.bets.pass, 10);
    assert.equal(r.table.bets.passOdds, undefined);
    assert.equal(r.table.point, null);
  });

  it("sevens out: line, odds and place bets lose, the don'ts win", () => {
    const t: Table = { point: 9, bets: { pass: 10, passOdds: 20, place6: 6, dontCome5: 10, dontComeOdds5: 15, hard4: 5 } };
    const r = resolveRoll(t, [3, 4]);
    assert.equal(r.event, "seven-out");
    assert.equal(r.lost, 10 + 20 + 6 + 5);
    assert.equal(r.returned, 10 + 10 + 10 + 15);
    assert.deepEqual(r.table.bets, {});
  });

  it("keeps place bets and hardways off on the come-out roll", () => {
    const r = resolveRoll({ point: null, bets: { place6: 6, hard6: 5, pass: 10 } }, [3, 4]);
    assert.equal(r.event, "natural");
    assert.equal(r.table.bets.place6, 6);
    assert.equal(r.table.bets.hard6, 5);
    assert.equal(r.returned, 10);
  });

  it("moves Come bets to their number, and returns their odds on a come-out seven", () => {
    let r = resolveRoll({ point: 4, bets: { come: 10 } }, [2, 3]);
    assert.deepEqual(r.table.bets, { come5: 10 });
    r = resolveRoll({ point: null, bets: { come5: 10, comeOdds5: 20 } }, [3, 4]);
    assert.equal(r.lost, 10);
    assert.equal(r.returned, 20);
  });

  it("pushes Don't Pass on a come-out 12 and leaves it up", () => {
    const r = resolveRoll({ point: null, bets: { dontPass: 10 } }, [6, 6]);
    assert.equal(r.outcomes[0].result, "push");
    assert.equal(r.table.bets.dontPass, 10);
  });

  it("pays the field double on 2 and triple on 12", () => {
    assert.equal(resolveRoll({ point: null, bets: { field: 10 } }, [1, 1]).returned, 20);
    assert.equal(resolveRoll({ point: null, bets: { field: 10 } }, [6, 6]).returned, 30);
    assert.equal(resolveRoll({ point: null, bets: { field: 10 } }, [3, 2]).lost, 10);
  });

  it("rounds odd winnings down to whole chips", () => {
    const r = resolveRoll({ point: 4, bets: { place6: 5 } }, [2, 4]);
    assert.equal(r.outcomes[0].won, 5); // 5 × 7/6 = 5.83
  });
});

describe("what you can bet", () => {
  const limits = limitsFor(LEAGUES[0]);
  it("allows line bets before the point and come bets after", () => {
    assert.ok(roomFor({ point: null, bets: {} }, "pass", limits) > 0);
    assert.equal(roomFor({ point: 6, bets: {} }, "pass", limits), 0);
    assert.equal(roomFor({ point: null, bets: {} }, "come", limits), 0);
    assert.ok(roomFor({ point: 6, bets: {} }, "come", limits) > 0);
  });
  it("caps odds at 3-4-5x taken and 6x laid", () => {
    assert.equal(roomFor({ point: 4, bets: { pass: 10 } }, "passOdds", limits), 30);
    assert.equal(roomFor({ point: 5, bets: { pass: 10 } }, "passOdds", limits), 40);
    assert.equal(roomFor({ point: 8, bets: { pass: 10, passOdds: 20 } }, "passOdds", limits), 30);
    assert.equal(roomFor({ point: 8, bets: { dontPass: 10 } }, "dontOdds", limits), 60);
    assert.equal(roomFor({ point: 8, bets: {} }, "passOdds", limits), 0);
  });
  it("locks Pass and Come bets once they have a point", () => {
    assert.ok(!canTakeDown({ point: 6, bets: { pass: 10 } }, "pass"));
    assert.ok(canTakeDown({ point: null, bets: { pass: 10 } }, "pass"));
    assert.ok(!canTakeDown({ point: 6, bets: { come5: 10 } }, "come5"));
    assert.ok(canTakeDown({ point: 6, bets: { dontPass: 10 } }, "dontPass"));
    const { table, returned } = takeDown({ point: 6, bets: { dontPass: 10, dontOdds: 30 } }, "dontPass");
    assert.equal(returned, 40);
    assert.deepEqual(table.bets, {});
  });
});
