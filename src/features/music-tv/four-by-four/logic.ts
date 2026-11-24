/* Four by Four rules: find four groups of four. Pure, no browser APIs. */
import { advanceStreak, shuffledOrder, type DailyStreak } from "../../../lib/daily.ts";
import type { Puzzle } from "./puzzles.ts";

export const MAX_MISTAKES = 4;

export type GuessResult = { kind: "correct"; group: number } | { kind: "oneAway" } | { kind: "wrong" };

/** Which group (index) an item belongs to. */
export const groupOf = (puzzle: Puzzle, item: string) => puzzle.groups.findIndex((g) => g.items.includes(item));

export function checkGuess(puzzle: Puzzle, selection: string[]): GuessResult {
  const counts = puzzle.groups.map((g) => selection.filter((s) => g.items.includes(s)).length);
  const exact = counts.indexOf(4);
  if (exact !== -1) return { kind: "correct", group: exact };
  return counts.includes(3) ? { kind: "oneAway" } : { kind: "wrong" };
}

/** All 16 items in a stable shuffled order for the day. */
export function dailyLayout(puzzle: Puzzle, seed: number): string[] {
  const items = puzzle.groups.flatMap((g) => g.items);
  return shuffledOrder(items.length, seed).map((i) => items[i]);
}

export type State = { guesses: string[][] };

export function solvedGroups(puzzle: Puzzle, state: State): number[] {
  return state.guesses
    .map((g) => checkGuess(puzzle, g))
    .filter((r): r is { kind: "correct"; group: number } => r.kind === "correct")
    .map((r) => r.group);
}

export const mistakes = (puzzle: Puzzle, state: State) =>
  state.guesses.filter((g) => checkGuess(puzzle, g).kind !== "correct").length;

export function statusOf(puzzle: Puzzle, state: State): "playing" | "won" | "lost" {
  if (solvedGroups(puzzle, state).length === 4) return "won";
  return mistakes(puzzle, state) >= MAX_MISTAKES ? "lost" : "playing";
}

/** True if this exact set was already tried. */
export const alreadyGuessed = (state: State, selection: string[]) =>
  state.guesses.some((g) => g.length === selection.length && g.every((x) => selection.includes(x)));

const LEVEL_EMOJI = ["🟨", "🟩", "🟦", "🟪"];

export function shareText(siteName: string, puzzleNo: number, puzzle: Puzzle, state: State): string {
  const rows = state.guesses.map((g) => g.map((item) => LEVEL_EMOJI[puzzle.groups[groupOf(puzzle, item)].level]).join(""));
  const m = mistakes(puzzle, state);
  return `${siteName} Four by Four #${puzzleNo} — ${statusOf(puzzle, state) === "won" ? `solved, ${m} mistake${m === 1 ? "" : "s"}` : "not today"}\n\n${rows.join("\n")}`;
}

export type Stats = DailyStreak & { wins: number; perfect: number };
export const EMPTY_STATS: Stats = { played: 0, currentStreak: 0, maxStreak: 0, lastCompleted: null, wins: 0, perfect: 0 };

export function recordResult(stats: Stats, puzzleNo: number, won: boolean, mistakeCount: number): Stats {
  if (stats.lastCompleted === puzzleNo) return stats;
  const next = advanceStreak(stats, puzzleNo, won);
  return { ...next, wins: stats.wins + (won ? 1 : 0), perfect: stats.perfect + (won && mistakeCount === 0 ? 1 : 0) };
}
