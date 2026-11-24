import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { card } from "../cards.ts";
import { bestFive, categoryOf, describeScore, scoreCards } from "./evaluator.ts";

const h = (codes: string) => codes.split(" ").map((c, i) => card(c, i));
const s = (codes: string) => scoreCards(h(codes));

describe("categories", () => {
  const cases: [string, number, string][] = [
    ["10♠ J♠ Q♠ K♠ A♠ 2♥ 3♦", 8, "Royal Flush"],
    ["A♥ 2♥ 3♥ 4♥ 5♥ K♠ K♦", 8, "Straight Flush, Five high"],
    ["9♠ 9♥ 9♦ 9♣ 2♠ 2♥ 2♦", 7, "Four Nines"],
    ["K♠ K♥ K♦ 4♣ 4♠ 4♥ 2♦", 6, "Full House, Kings over Fours"],
    ["2♣ 7♣ 9♣ J♣ K♣ K♦ K♥", 5, "Flush, King high"],
    ["A♠ 2♥ 3♦ 4♣ 5♠ 9♥ 9♦", 4, "Straight, Five high"],
    ["10♠ J♥ Q♦ K♣ A♠ A♥ 2♦", 4, "Straight, Ace high"],
    ["7♠ 7♥ 7♦ K♣ 2♠ 4♥ 9♦", 3, "Three Sevens"],
    ["3♠ 3♥ 8♦ 8♣ A♠ A♥ 2♦", 2, "Two Pair, Aces and Eights"],
    ["J♠ J♥ 4♦ 8♣ 2♠ 6♥ 9♦", 1, "Pair of Jacks"],
    ["Q♠ K♥ A♦ 2♣ 3♠ 7♥ 9♦", 0, "Ace high"],
  ];
  for (const [cards, cat, name] of cases) {
    it(`${cards} → ${name}`, () => {
      const score = s(cards);
      assert.equal(categoryOf(score), cat);
      assert.equal(describeScore(score), name);
    });
  }
});

describe("comparisons", () => {
  it("ranks kickers", () => {
    assert.ok(s("A♠ A♥ K♦ 8♣ 2♠") > s("A♦ A♣ Q♦ 8♥ 2♥"));
    assert.ok(s("K♠ K♥ 9♦ 9♣ A♠") > s("K♦ K♣ 9♥ 9♠ Q♠"));
  });

  it("detects splits on the board", () => {
    const board = "A♠ K♠ Q♦ J♣ 10♥";
    assert.equal(s(`${board} 2♣ 3♦`), s(`${board} 4♣ 5♦`));
  });

  it("uses the board when it plays", () => {
    assert.equal(s("2♣ 3♦ 9♠ 9♥ 9♦ K♣ K♥"), s("4♣ 5♦ 9♠ 9♥ 9♦ K♣ K♥"));
  });

  it("prefers the higher straight and the wheel is lowest", () => {
    assert.ok(s("2♠ 3♥ 4♦ 5♣ 6♠") > s("A♠ 2♥ 3♦ 4♣ 5♠"));
  });

  it("beats a flush with a full house even when both exist", () => {
    assert.equal(categoryOf(s("K♥ K♠ K♦ 4♥ 4♠ 9♥ 2♥")), 6);
  });

  it("picks the best five cards", () => {
    const five = bestFive(h("A♠ A♥ 7♦ 7♣ 7♠ 2♦ 3♣"));
    assert.equal(five.length, 5);
    assert.equal(categoryOf(scoreCards(five)), 6);
  });
});
