import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANSWERS } from "./answers.ts";
import {
  EMPTY_STATS,
  answerFor,
  evaluateGuess,
  keyboardMarks,
  puzzleNumberFor,
  recordResult,
  shareText,
  statusFor,
} from "./logic.ts";
import { VALID_GUESSES } from "./valid-guesses.ts";

describe("evaluateGuess", () => {
  it("marks exact, misplaced and absent letters", () => {
    assert.deepEqual(evaluateGuess("crane", "cargo"), ["hit", "near", "near", "miss", "miss"]);
  });

  it("marks a fully correct guess as all hits", () => {
    assert.deepEqual(evaluateGuess("pizza", "pizza"), Array(5).fill("hit"));
  });

  it("does not over-count a repeated guess letter", () => {
    // "angle" has one L and one A: only the first misplaced L and A get "near".
    assert.deepEqual(evaluateGuess("llama", "angle"), ["near", "miss", "near", "miss", "miss"]);
  });

  it("prefers the exact match over an earlier misplaced copy", () => {
    // Answer "spell" has two Ls at the end; guess "lolly" has Ls at 0, 2 and 3.
    // Position 3 is an exact hit; one L is left over for position 0; position 2 misses.
    assert.deepEqual(evaluateGuess("lolly", "spell"), ["near", "miss", "miss", "hit", "miss"]);
  });

  it("handles repeated letters in the answer", () => {
    assert.deepEqual(evaluateGuess("eerie", "sheep"), ["near", "near", "miss", "miss", "miss"]);
  });
});

describe("keyboardMarks", () => {
  it("keeps the best mark seen for each letter", () => {
    const marks = keyboardMarks(["crane", "cargo"], "cargo");
    assert.equal(marks.c, "hit");
    assert.equal(marks.a, "hit");
    assert.equal(marks.r, "hit");
    assert.equal(marks.n, "miss");
  });
});

describe("statusFor", () => {
  it("detects wins, losses and games in progress", () => {
    assert.equal(statusFor(["crane"], "crane"), "won");
    assert.equal(statusFor(["crane"], "cargo"), "playing");
    assert.equal(statusFor(Array(6).fill("crane"), "cargo"), "lost");
  });
});

describe("daily puzzle", () => {
  it("starts at #1 on launch day and advances at local midnight", () => {
    assert.equal(puzzleNumberFor(new Date(2026, 10, 24, 0, 0, 1)), 1);
    assert.equal(puzzleNumberFor(new Date(2026, 10, 24, 23, 59, 59)), 1);
    assert.equal(puzzleNumberFor(new Date(2026, 10, 25, 0, 0, 0)), 2);
    assert.equal(puzzleNumberFor(new Date(2027, 10, 24)), 366);
  });

  it("gives a stable answer per puzzle and no repeats in a full cycle", () => {
    assert.equal(answerFor(1), answerFor(1));
    const cycle = new Set(Array.from({ length: ANSWERS.length }, (_, i) => answerFor(i + 1)));
    assert.equal(cycle.size, ANSWERS.length);
  });
});

describe("word lists", () => {
  it("every answer is five letters and can be guessed", () => {
    const valid = new Set(VALID_GUESSES.match(/.{5}/g));
    for (const word of ANSWERS) {
      assert.match(word, /^[a-z]{5}$/);
      assert.ok(valid.has(word), `${word} missing from valid guesses`);
    }
  });
});

describe("recordResult", () => {
  it("builds streaks on consecutive wins and resets on a loss", () => {
    let s = recordResult(EMPTY_STATS, 1, true, 3);
    s = recordResult(s, 2, true, 4);
    assert.equal(s.currentStreak, 2);
    assert.equal(s.maxStreak, 2);
    assert.deepEqual(s.distribution, [0, 0, 1, 1, 0, 0]);
    s = recordResult(s, 3, false, 6);
    assert.equal(s.currentStreak, 0);
    assert.equal(s.maxStreak, 2);
    assert.equal(s.played, 3);
    assert.equal(s.wins, 2);
  });

  it("restarts the streak after a skipped day", () => {
    let s = recordResult(EMPTY_STATS, 1, true, 3);
    s = recordResult(s, 3, true, 2);
    assert.equal(s.currentStreak, 1);
  });

  it("ignores finishing the same puzzle twice", () => {
    const s = recordResult(EMPTY_STATS, 1, true, 3);
    assert.equal(recordResult(s, 1, true, 3), s);
  });
});

describe("shareText", () => {
  it("renders an emoji grid without revealing letters", () => {
    const text = shareText("PLAYGROUND", 7, ["crane", "cargo"], "cargo");
    assert.equal(text, "PLAYGROUND Word Guess #7 2/6\n\n🟩🟦🟦⬜⬜\n🟩🟩🟩🟩🟩");
    assert.ok(!/cargo|crane/i.test(text));
  });
});
