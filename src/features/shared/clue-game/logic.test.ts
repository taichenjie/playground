import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cluesShown,
  emptyStats,
  isCorrect,
  normalize,
  pointsFor,
  recordResult,
  shareText,
  statusFor,
  suggest,
} from "./logic.ts";

describe("matching", () => {
  it("normalises case, accents, punctuation and a leading 'the'", () => {
    assert.equal(normalize("  Stayin' Alive! "), "stayin alive");
    assert.equal(normalize("The Killers"), "killers");
    assert.equal(normalize("Beyoncé"), "beyonce");
    assert.equal(normalize("Guns N' Roses & Friends"), "guns n roses and friends");
  });

  it("accepts any listed spelling", () => {
    assert.ok(isCorrect("sweet child of mine", ["Sweet Child o' Mine", "Sweet Child of Mine"]));
    assert.ok(isCorrect("ZIDANE", ["Zinedine Zidane", "Zidane"]));
    assert.ok(!isCorrect("", ["Zidane"]));
    assert.ok(!isCorrect("Zidan", ["Zidane"]));
  });
});

describe("game flow", () => {
  const accepted = ["Hey Jude"];

  it("reveals one more clue per attempt and all at the end", () => {
    assert.equal(cluesShown([], 6, "playing"), 1);
    assert.equal(cluesShown(["Help", null], 6, "playing"), 3);
    assert.equal(cluesShown(["hey jude"], 6, "won"), 6);
  });

  it("detects wins and losses, counting skips as attempts", () => {
    assert.equal(statusFor(["Help", "hey jude"], accepted, 6), "won");
    assert.equal(statusFor([null, null, null, null, null, "Help"], accepted, 6), "lost");
    assert.equal(statusFor([null], accepted, 6), "playing");
  });

  it("scores more for fewer clues", () => {
    assert.equal(pointsFor(["hey jude"], "won", 6), 6);
    assert.equal(pointsFor([null, null, "hey jude"], "won", 6), 4);
    assert.equal(pointsFor(Array(6).fill(null), "lost", 6), 0);
  });

  it("suggests starts-with matches first", () => {
    assert.deepEqual(suggest("ro", ["Heroes", "Roxanne", "Rolling in the Deep"]), [
      "Roxanne",
      "Rolling in the Deep",
      "Heroes",
    ]);
    assert.deepEqual(suggest("", ["Roxanne"]), []);
  });
});

describe("stats & share", () => {
  it("records wins into the distribution and breaks streaks on a loss", () => {
    let s = recordResult(emptyStats(6), 1, true, 2);
    s = recordResult(s, 2, false, 6);
    assert.deepEqual(s.distribution, [0, 1, 0, 0, 0, 0]);
    assert.equal(s.currentStreak, 0);
    assert.equal(s.maxStreak, 1);
    assert.equal(s.wins, 1);
  });

  it("shares coloured squares without the answer", () => {
    const text = shareText("Guess the Song", 4, ["Help", null, "Hey Jude"], ["Hey Jude"], 6);
    assert.equal(text, "Guess the Song #4 3/6\n\n🟥⬜🟩⬛⬛⬛");
  });
});
