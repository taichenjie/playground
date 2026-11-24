import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card } from "../cards.ts";
import { DIFFICULTIES, chen, decide, equity, makeStyle, makeTableStyles } from "./bots.ts";
import { act, createTable, legalActions, startHand, type Table } from "./engine.ts";
import { code } from "./evaluator.ts";

const h = (codes: string) => codes.split(" ").map((c, i) => card(c, i));
let seed = 11;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe("hand strength", () => {
  it("scores the Chen formula", () => {
    const c = (s: string) => {
      const [a, b] = h(s).map(code);
      return chen(a, b);
    };
    assert.equal(c("A♠ A♥"), 20);
    assert.equal(c("A♠ K♠"), 12);
    assert.equal(c("2♠ 2♥"), 5);
    assert.ok(c("7♠ 2♥") <= 0);
  });

  it("estimates equity sensibly", () => {
    const aa = equity(h("A♠ A♥"), [], [0], 2000, rand);
    assert.ok(aa > 0.8 && aa < 0.9, `AA vs random ≈ 85% (got ${aa})`);
    const nuts = equity(h("A♠ K♠"), h("Q♠ J♠ 10♠"), [0, 0], 500, rand);
    assert.equal(nuts, 1);
    const multi = equity(h("A♠ A♥"), [], [0, 0, 0, 0], 2000, rand);
    assert.ok(multi < aa, "equity drops against more players");
  });
});

/** Force seat 0's hole cards and return to the decision point. */
function withHole(t: Table, seat: number, cards: string): Table {
  const next = { ...t, seats: t.seats.map((s) => ({ ...s })) };
  next.seats[seat].cards = h(cards);
  return next;
}

describe("decisions", () => {
  it("raises premium hands and folds trash to a raise", () => {
    let t = startHand(createTable([0, 1, 2, 3, 4, 5].map((i) => ({ name: `B${i}`, isHuman: false, stack: 200 })), 1, 2), rand);
    const style = { ...makeStyle("hard", rand), noise: 0, bluff: 0 };
    const first = t.toAct;
    assert.equal(decide(withHole(t, first, "A♠ A♥"), first, style, {}, rand).type, "raise");
    t = act(t, { type: "raise", to: 8 });
    const next = t.toAct;
    assert.equal(decide(withHole(t, next, "7♠ 2♥"), next, style, {}, rand).type, "fold");
  });

  it("checks instead of folding when checking is free", () => {
    let t = startHand(createTable([0, 1, 2].map((i) => ({ name: `B${i}`, isHuman: false, stack: 200 })), 1, 2), rand);
    t = act(act(t, { type: "call" }), { type: "call" }); // BB to act with option
    const style = { ...makeStyle("medium", rand), noise: 0, bluff: 0 };
    const a = decide(withHole(t, t.toAct, "7♠ 2♥"), t.toAct, style, {}, rand);
    assert.notEqual(a.type, "fold");
  });

  it("only ever chooses legal actions, at every level, over many hands", () => {
    for (const d of DIFFICULTIES) {
      for (let g = 0; g < 40; g++) {
        const styles = [0, 1, 2, 3, 4, 5].map(() => makeStyle(d, rand));
        let t = startHand(createTable(styles.map((_, i) => ({ name: `B${i}`, isHuman: false, stack: 50 + Math.floor(rand() * 300) })), 1, 2), rand);
        let steps = 0;
        while (t.phase === "playing" && steps++ < 300) {
          const action = decide(t, t.toAct, { ...styles[t.toAct], sims: 40 }, {}, rand);
          const l = legalActions(t);
          if (action.type === "fold") assert.ok(l.fold, `${d}: illegal fold`);
          if (action.type === "check") assert.ok(l.check, `${d}: illegal check`);
          if (action.type === "call") assert.ok(l.call > 0, `${d}: illegal call`);
          if (action.type === "raise") assert.ok(l.raise, `${d}: illegal raise`);
          t = act(t, action);
        }
        assert.equal(t.phase, "done");
      }
    }
  });
});

describe("personalities", () => {
  it("mixes styles at every difficulty, including expert", () => {
    for (const d of DIFFICULTIES) {
      const styles = makeTableStyles(8, d, rand);
      const kinds = new Set(styles.map((s) => s.archetype));
      assert.ok(kinds.size >= 6, `${d}: only ${kinds.size} styles`);
      const loose = styles.filter((s) => s.tightness < 0.4).length;
      const tight = styles.filter((s) => s.tightness > 0.6).length;
      const passive = styles.filter((s) => s.aggression < 0.45).length;
      assert.ok(loose > 0 && tight > 0 && passive > 0, `${d}: styles not varied`);
      assert.ok(styles.every((s) => s.difficulty === d));
    }
  });

  it("keeps skill tied to difficulty, not style", () => {
    const easy = makeStyle("easy", rand, "shark");
    const expert = makeStyle("expert", rand, "station");
    assert.ok(expert.sims > easy.sims);
    assert.ok(expert.noise < easy.noise);
    assert.ok(expert.readsOpponents && !easy.readsOpponents);
  });
});
