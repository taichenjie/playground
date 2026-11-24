import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalize } from "../../shared/clue-game/logic.ts";
import { PUZZLES } from "./puzzles.ts";
import { EMPTY_STATS, alreadyGuessed, checkGuess, dailyLayout, mistakes, recordResult, shareText, statusOf } from "./logic.ts";

const p = PUZZLES[0];

describe("puzzle data", () => {
  it("every puzzle has 16 unique items in four groups of four, one per level", () => {
    PUZZLES.forEach((puzzle, n) => {
      const items = puzzle.groups.flatMap((g) => g.items.map(normalize));
      assert.equal(new Set(items).size, 16, `puzzle ${n + 1} has duplicate items`);
      assert.deepEqual(puzzle.groups.map((g) => g.level).sort(), [0, 1, 2, 3]);
    });
  });
});

describe("guessing", () => {
  it("recognises a correct group, a near miss and a wrong guess", () => {
    assert.deepEqual(checkGuess(p, ["Friends", "Seinfeld", "Frasier", "Cheers"]), { kind: "correct", group: 0 });
    assert.deepEqual(checkGuess(p, ["Friends", "Seinfeld", "Frasier", "Adele"]), { kind: "oneAway" });
    assert.deepEqual(checkGuess(p, ["Friends", "Seinfeld", "Adele", "Rihanna"]), { kind: "wrong" });
  });

  it("wins with four groups and loses after four mistakes", () => {
    const all = p.groups.map((g) => [...g.items]);
    assert.equal(statusOf(p, { guesses: all }), "won");
    const bad = ["Friends", "Seinfeld", "Adele", "Rihanna"];
    const state = { guesses: [bad, bad, bad, bad] };
    assert.equal(mistakes(p, state), 4);
    assert.equal(statusOf(p, state), "lost");
  });

  it("spots repeated guesses in any order", () => {
    assert.ok(alreadyGuessed({ guesses: [["A", "B", "C", "D"]] }, ["D", "C", "B", "A"]));
    assert.ok(!alreadyGuessed({ guesses: [["A", "B", "C", "D"]] }, ["A", "B", "C", "E"]));
  });

  it("lays out all 16 items deterministically", () => {
    const layout = dailyLayout(p, 9);
    assert.equal(layout.length, 16);
    assert.deepEqual(layout, dailyLayout(p, 9));
  });
});

describe("share & stats", () => {
  it("shares colour rows without names", () => {
    const text = shareText("PLAYGROUND", 2, p, {
      guesses: [["Friends", "Seinfeld", "Frasier", "Adele"], [...p.groups[0].items]],
    });
    assert.equal(text, "PLAYGROUND Four by Four #2 — not today\n\n🟨🟨🟨🟦\n🟨🟨🟨🟨");
    assert.ok(!text.includes("Friends"));
  });

  it("counts perfect games", () => {
    const s = recordResult(EMPTY_STATS, 1, true, 0);
    assert.equal(s.perfect, 1);
    assert.equal(s.wins, 1);
  });
});
