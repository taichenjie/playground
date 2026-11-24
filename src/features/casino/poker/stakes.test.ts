import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUES } from "../economy.ts";
import { allowedDifficulties } from "./stakes.ts";

describe("difficulty by stakes", () => {
  it("keeps easy bots at the smallest tables only", () => {
    assert.deepEqual(allowedDifficulties(2), ["easy", "medium", "hard", "expert"]);
    assert.deepEqual(allowedDifficulties(5), ["medium", "hard", "expert"]);
    assert.deepEqual(allowedDifficulties(10), ["hard", "expert"]);
  });

  it("always leaves at least one difficulty for every league table", () => {
    for (const league of LEAGUES) for (const s of league.poker) assert.ok(allowedDifficulties(s.bb).length > 0);
  });
});
