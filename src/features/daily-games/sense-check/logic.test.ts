import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_STATS,
  average,
  gradeFor,
  paramsFor,
  recordResult,
  scoreAngle,
  scoreCount,
  scoreMotion,
  scoreProportion,
  scoreRhythm,
  shareText,
} from "./logic.ts";

describe("paramsFor", () => {
  it("is deterministic per puzzle and varies between days", () => {
    assert.deepEqual(paramsFor(5), paramsFor(5));
    assert.notDeepEqual(paramsFor(5), paramsFor(6));
  });

  it("stays within sensible ranges across a year of puzzles", () => {
    for (let p = 1; p <= 365; p++) {
      const params = paramsFor(p);
      assert.ok(params.count.dots.length >= 28 && params.count.dots.length <= 130, `dots on #${p}`);
      assert.ok(params.angle.target >= 12 && params.angle.target <= 168);
      assert.ok(params.rhythm.bpm >= 72 && params.rhythm.bpm <= 140);
      assert.ok(params.motion.durationMs >= 1600 && params.motion.durationMs <= 3200);
      assert.ok(params.proportion.numerator < params.proportion.denominator);
    }
  });

  it("places dots without overlap", () => {
    const { dots } = paramsFor(42).count;
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        assert.ok(Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y) > dots[i].r + dots[j].r);
      }
    }
  });
});

describe("scoring", () => {
  it("gives 100 for perfect answers", () => {
    assert.equal(scoreCount(80, 80), 100);
    assert.equal(scoreMotion(0), 100);
    assert.equal(scoreAngle(45, 45), 100);
    assert.equal(scoreProportion(0.375, 0.375), 100);
    assert.equal(scoreRhythm([0, 500, 1000, 1500], 120), 100);
  });

  it("falls off with error and never goes below 0", () => {
    assert.equal(scoreCount(88, 80), 75);
    assert.equal(scoreCount(500, 80), 0);
    assert.equal(scoreMotion(-100), 88);
    assert.equal(scoreMotion(2000), 0);
    assert.equal(scoreAngle(49, 45), 90);
    assert.equal(scoreProportion(0.395, 0.375), 88);
  });

  it("scores rhythm on gap consistency, not start time", () => {
    // 120 bpm = 500 ms; every gap 5% long.
    assert.equal(scoreRhythm([1000, 1525, 2050, 2575], 120), 80);
    assert.equal(scoreRhythm([0], 120), 0);
  });
});

describe("grades", () => {
  it("maps averages to letter grades", () => {
    assert.equal(gradeFor(97), "S");
    assert.equal(gradeFor(85), "A");
    assert.equal(gradeFor(80), "B");
    assert.equal(gradeFor(60), "C");
    assert.equal(gradeFor(50), "D");
    assert.equal(gradeFor(10), "F");
    assert.equal(average([100, 80, 60, 90, 70]), 80);
  });
});

describe("stats & share", () => {
  it("tracks streak, best and running total", () => {
    let s = recordResult(EMPTY_STATS, 1, 80);
    s = recordResult(s, 2, 90);
    assert.equal(s.currentStreak, 2);
    assert.equal(s.best, 90);
    assert.equal(s.totalAverage, 170);
    assert.equal(recordResult(s, 2, 10), s);
  });

  it("builds a share line with every test score", () => {
    assert.equal(
      shareText("PLAYGROUND", 3, [92, 71, 88, 95, 90]),
      "PLAYGROUND Sense Check #3 — A (87)\n\n🔢 92  🏃 71  📐 88  🥁 95  📏 90",
    );
  });
});
