import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalize } from "../shared/clue-game/logic.ts";
import { PLAYERS, careerSpan, initials } from "./players.ts";

describe("player data", () => {
  it("has unique names and no alias that clashes with another player", () => {
    const owner = new Map<string, string>();
    for (const p of PLAYERS) {
      for (const n of [p.name, ...(p.aka ?? [])]) {
        const key = normalize(n);
        assert.ok(!owner.has(key) || owner.get(key) === p.name, `"${n}" used by ${owner.get(key)} and ${p.name}`);
        owner.set(key, p.name);
      }
    }
  });

  it("has well-formed, chronological careers", () => {
    for (const p of PLAYERS) {
      assert.ok(p.career.length > 0, p.name);
      p.career.forEach((s, i) => {
        assert.ok(s.to === null || s.to >= s.from, `${p.name}: ${s.team}`);
        if (i > 0) assert.ok(s.from >= p.career[i - 1].from, `${p.name}: order at ${s.team}`);
      });
      assert.ok(p.career[0].from - p.born >= 15, `${p.name} debut age`);
    }
  });

  it("formats helpers", () => {
    assert.equal(initials("Thierry Henry"), "T. H.");
    assert.equal(careerSpan(PLAYERS.find((p) => p.name === "LeBron James")!), "2003–present");
  });
});
