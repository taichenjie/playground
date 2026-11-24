import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_SKILL, WINDOW, finishShoe, rating, recordDecision, recordHand } from "./skill.ts";

describe("skill", () => {
  it("tracks streaks, EV lost and a rolling accuracy window", () => {
    let s = EMPTY_SKILL;
    for (let i = 0; i < 12; i++) s = recordDecision(s, true, 0);
    s = recordDecision(s, false, 3.5);
    assert.equal(s.streak, 0);
    assert.equal(s.bestStreak, 12);
    assert.equal(s.lifetime.evLost, 3.5);
    assert.equal(rating(s).letter, "B"); // 12/13 ≈ 92%
    for (let i = 0; i < 200; i++) s = recordDecision(s, true, 0);
    assert.equal(s.recent.length, WINDOW);
    assert.equal(rating(s).letter, "S");
  });

  it("closes a shoe into a report", () => {
    let s = recordHand(recordDecision(EMPTY_SKILL, true, 0), 25);
    const { skill, report } = finishShoe(s);
    assert.equal(report.hands, 1);
    assert.equal(report.net, 25);
    assert.equal(skill.shoe.hands, 0);
    assert.equal(skill.lifetime.hands, 1);
    s = skill;
    assert.equal(s.shoesCompleted, 1);
  });

  it("needs a few decisions before rating", () => {
    assert.equal(rating(EMPTY_SKILL).letter, "–");
  });
});
