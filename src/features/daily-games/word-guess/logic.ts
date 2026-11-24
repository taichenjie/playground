/*
 * Pure game rules for Word Guess. No React, no browser APIs, so it can be
 * unit-tested with `npm run test`. Relative imports keep their `.ts`
 * extension so Node's test runner can load them directly.
 */
import { puzzleNumberFor, shuffledOrder } from "../../../lib/daily.ts";
import { ANSWERS } from "./answers.ts";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** hit = right letter, right spot · near = in the word, wrong spot · miss = not in the word */
export type Mark = "hit" | "near" | "miss";
export type GameStatus = "playing" | "won" | "lost";

/**
 * Scores a guess against the answer, handling repeated letters the way
 * players expect: exact matches are claimed first, then each remaining
 * letter in the answer can satisfy at most one "near".
 */
export function evaluateGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(guess.length).fill("miss");
  const leftover = new Map<string, number>();

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = "hit";
    else leftover.set(answer[i], (leftover.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "hit") continue;
    const count = leftover.get(guess[i]) ?? 0;
    if (count > 0) {
      marks[i] = "near";
      leftover.set(guess[i], count - 1);
    }
  }
  return marks;
}

const RANK: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };

/** The best mark each letter has earned so far, for colouring the keyboard. */
export function keyboardMarks(guesses: string[], answer: string): Record<string, Mark> {
  const result: Record<string, Mark> = {};
  for (const guess of guesses) {
    evaluateGuess(guess, answer).forEach((mark, i) => {
      const letter = guess[i];
      const current = result[letter];
      if (!current || RANK[mark] > RANK[current]) result[letter] = mark;
    });
  }
  return result;
}

export function statusFor(guesses: string[], answer: string): GameStatus {
  if (guesses.includes(answer)) return "won";
  if (guesses.length >= MAX_GUESSES) return "lost";
  return "playing";
}

/* ---------- Daily puzzle ---------- */

// Puzzle numbering is shared by all daily games (see src/lib/daily.ts).
export { puzzleNumberFor };

/** Fixed shuffled order of the answers; the seed must never change. */
const ORDER: number[] = shuffledOrder(ANSWERS.length, 20261124);

export function answerFor(puzzle: number): string {
  return ANSWERS[ORDER[(puzzle - 1) % ORDER.length]];
}

/* ---------- Stats ---------- */

export type Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[n] = games won in n + 1 guesses */
  distribution: number[];
  lastCompleted: number | null;
};

export const EMPTY_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array(MAX_GUESSES).fill(0),
  lastCompleted: null,
};

/** Returns new stats after finishing `puzzle`. Finishing the same puzzle twice is a no-op. */
export function recordResult(stats: Stats, puzzle: number, won: boolean, guessCount: number): Stats {
  if (stats.lastCompleted === puzzle) return stats;
  const continues = stats.lastCompleted === puzzle - 1;
  const currentStreak = won ? (continues ? stats.currentStreak + 1 : 1) : 0;
  const distribution = [...stats.distribution];
  if (won) distribution[guessCount - 1] += 1;
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastCompleted: puzzle,
  };
}

/* ---------- Sharing ---------- */

const EMOJI: Record<Mark, string> = { hit: "🟩", near: "🟦", miss: "⬜" };

export function shareText(siteName: string, puzzle: number, guesses: string[], answer: string): string {
  const won = guesses.includes(answer);
  const score = won ? guesses.length : "X";
  const grid = guesses.map((g) => evaluateGuess(g, answer).map((m) => EMOJI[m]).join("")).join("\n");
  return `${siteName} Word Guess #${puzzle} ${score}/${MAX_GUESSES}\n\n${grid}`;
}
