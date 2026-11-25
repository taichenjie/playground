import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card, type Card } from "../cards.ts";
import { LEAGUES } from "../economy.ts";
import { bankerDraws, bigRoad, limitsFor, newShoe, playCoup, pointOf, settleBets, shoeDone, totalOf, type RoadEntry } from "./logic.ts";

const cards = (codes: string) => codes.split(" ").map((c, i) => card(c, i));

describe("card values", () => {
  it("counts A as 1, pictures and tens as 0, and keeps the last digit", () => {
    assert.deepEqual(cards("A♠ 9♥ 10♦ K♣").map(pointOf), [1, 9, 0, 0]);
    assert.equal(totalOf(cards("7♠ 8♥")), 5);
    assert.equal(totalOf(cards("K♠ 9♥")), 9);
  });
});

describe("Table of Play", () => {
  it("matches the RWS banker drawing table", () => {
    const table: Record<number, number[]> = {
      3: [0, 1, 2, 3, 4, 5, 6, 7, 9],
      4: [2, 3, 4, 5, 6, 7],
      5: [4, 5, 6, 7],
      6: [6, 7],
    };
    for (const [total, draws] of Object.entries(table)) {
      for (let third = 0; third <= 9; third++) assert.equal(bankerDraws(Number(total), third), draws.includes(third), `${total} vs ${third}`);
    }
    for (let third = 0; third <= 9; third++) {
      for (const t of [0, 1, 2]) assert.ok(bankerDraws(t, third));
      assert.ok(!bankerDraws(7, third));
    }
    // Player stood: banker draws on 0–5, stands on 6–7.
    assert.ok(bankerDraws(5, null));
    assert.ok(!bankerDraws(6, null));
  });

  it("deals P, B, P, B and stops on a natural", () => {
    const { round, used } = playCoup(cards("8♠ 2♥ K♦ 3♣ 5♠ 5♥"));
    assert.equal(used, 4);
    assert.ok(round.natural);
    assert.equal(round.outcome, "player");
  });

  it("draws third cards by the rules", () => {
    // Player 2+3=5 draws a 4; Banker 3+K=3 draws (third card 4); banker gets 6 → 9.
    const { round, used } = playCoup(cards("2♠ 3♥ 3♦ K♣ 4♠ 6♥"));
    assert.equal(used, 6);
    assert.equal(round.playerTotal, 9);
    assert.equal(round.bankerTotal, 9);
    assert.equal(round.outcome, "tie");
  });

  it("produces the textbook odds", () => {
    // Infinite-deck enumeration over all six-card sequences.
    const ranks = ["K", "A", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
    const weight = [4, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((w) => w / 13);
    const tally = { player: 0, banker: 0, tie: 0 };
    const seq: Card[] = [];
    const walk = (depth: number, p: number) => {
      if (depth === 6) {
        tally[playCoup(seq).round.outcome] += p;
        return;
      }
      for (let v = 0; v < 10; v++) {
        seq[depth] = card(`${ranks[v]}♠`, depth);
        walk(depth + 1, p * weight[v]);
      }
    };
    walk(0, 1);
    assert.ok(Math.abs(tally.banker - 0.4586) < 0.002, `banker ${tally.banker}`);
    assert.ok(Math.abs(tally.player - 0.4462) < 0.002, `player ${tally.player}`);
    assert.ok(Math.abs(tally.tie - 0.0952) < 0.002, `tie ${tally.tie}`);
  });
});

describe("settlement", () => {
  it("pays the RWS table and pushes main bets on a tie", () => {
    const tie = playCoup(cards("2♠ 3♥ 3♦ K♣ 4♠ 6♥")).round;
    const s = settleBets({ player: 10, banker: 20, tie: 5 }, tie);
    assert.deepEqual(s.byBet, { player: 10, banker: 20, tie: 45 });
    assert.equal(s.commission, 0);
  });

  it("charges 5% commission on a winning Banker bet", () => {
    const banker = playCoup(cards("2♠ 9♥ 3♦ K♣ K♠")).round; // P 5 draws K → 5; B 9 natural? no: 9+K = 9 natural
    assert.equal(banker.outcome, "banker");
    const s = settleBets({ banker: 100, player: 50 }, banker);
    assert.equal(s.byBet.banker, 200);
    assert.equal(s.byBet.player, 0);
    assert.equal(s.commission, 5);
  });

  it("pays pairs 11 to 1 and Super Six 15 to 1", () => {
    const r = playCoup(cards("Q♠ 3♥ Q♦ 3♣ 2♠ 8♥")).round;
    // Player Q Q = 0 draws 2 → 2; Banker 3 3 = 6, player third 2 → banker stands on 6. Banker wins with 6.
    assert.ok(r.playerPair && r.bankerPair && r.superSix);
    const s = settleBets({ playerPair: 5, bankerPair: 5, superSix: 5 }, r);
    assert.deepEqual(s.byBet, { playerPair: 60, bankerPair: 60, superSix: 80 });
  });

  it("only calls same-rank cards a pair", () => {
    assert.ok(!playCoup(cards("10♠ 2♥ K♦ 3♣ 5♠ 5♥")).round.playerPair);
  });
});

describe("shoe and limits", () => {
  it("uses eight decks and ends at the cut card", () => {
    const s = newShoe();
    assert.equal(s.size, 416);
    assert.ok(!shoeDone(s));
    assert.ok(shoeDone({ ...s, cards: s.cards.slice(0, 60) }));
  });

  it("scales limits with the league", () => {
    assert.deepEqual(limitsFor(LEAGUES[0]), { min: 5, maxMain: 200, maxSide: 25 });
  });
});

describe("big road", () => {
  const e = (o: string): RoadEntry => ({ outcome: o === "P" ? "player" : o === "B" ? "banker" : "tie", playerPair: false, bankerPair: false, total: 0 });
  it("starts a column per streak, marks ties and turns a long streak right", () => {
    const cells = bigRoad("B B T P B B B B B B B B".split(" ").map(e));
    assert.deepEqual(cells.slice(0, 3).map((c) => [c.col, c.row, c.ties]), [[0, 0, 0], [0, 1, 1], [1, 0, 0]]);
    const tail = cells.slice(3);
    assert.deepEqual(tail.map((c) => [c.col, c.row]), [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 5], [4, 5]]);
  });
});
