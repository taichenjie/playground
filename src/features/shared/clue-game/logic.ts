/*
 * Engine for "guess it from clues" daily games (Guess the Song, Guess the
 * Player, Mystery Career). One clue is shown at the start; every wrong guess
 * or skip reveals the next. Pure, no browser APIs.
 */
import { advanceStreak, type DailyStreak } from "../../../lib/daily.ts";

/** A guess, or `null` for a skip. */
export type Attempt = string | null;
export type ClueStatus = "playing" | "won" | "lost";

/** Lower-case, drop accents/punctuation, "&" → "and", and a leading "the". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
}

export function isCorrect(guess: string, accepted: string[]): boolean {
  const g = normalize(guess);
  return g.length > 0 && accepted.some((a) => normalize(a) === g);
}

export function statusFor(attempts: Attempt[], accepted: string[], maxAttempts: number): ClueStatus {
  if (attempts.some((a) => a !== null && isCorrect(a, accepted))) return "won";
  return attempts.length >= maxAttempts ? "lost" : "playing";
}

/** Clues visible: one to start, plus one per attempt so far (all once finished). */
export function cluesShown(attempts: Attempt[], total: number, status: ClueStatus): number {
  return status === "playing" ? Math.min(total, attempts.length + 1) : total;
}

/** Points: max for the first clue, down to 1 for the last; 0 for a loss. */
export function pointsFor(attempts: Attempt[], status: ClueStatus, maxAttempts: number): number {
  return status === "won" ? maxAttempts - attempts.length + 1 : 0;
}

/** Suggestions for the guess box: starts-with matches first, then contains. */
export function suggest(input: string, options: string[], limit = 6): string[] {
  const q = normalize(input);
  if (!q) return [];
  const starts = options.filter((o) => normalize(o).startsWith(q));
  const contains = options.filter((o) => !starts.includes(o) && normalize(o).includes(q));
  return [...starts, ...contains].slice(0, limit);
}

/* ---------- Stats & sharing ---------- */

export type ClueStats = DailyStreak & { wins: number; distribution: number[] };

export const emptyStats = (maxAttempts: number): ClueStats => ({
  played: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastCompleted: null,
  wins: 0,
  distribution: Array(maxAttempts).fill(0),
});

export function recordResult(stats: ClueStats, puzzle: number, won: boolean, attemptsUsed: number): ClueStats {
  if (stats.lastCompleted === puzzle) return stats;
  const next = advanceStreak(stats, puzzle, won);
  const distribution = [...stats.distribution];
  if (won) distribution[attemptsUsed - 1] = (distribution[attemptsUsed - 1] ?? 0) + 1;
  return { ...next, wins: stats.wins + (won ? 1 : 0), distribution };
}

export function shareText(
  label: string,
  puzzle: number,
  attempts: Attempt[],
  accepted: string[],
  maxAttempts: number,
): string {
  const won = statusFor(attempts, accepted, maxAttempts) === "won";
  const squares = Array.from({ length: maxAttempts }, (_, i) => {
    const a = attempts[i];
    if (a === undefined) return "⬛";
    if (a === null) return "⬜";
    return isCorrect(a, accepted) ? "🟩" : "🟥";
  }).join("");
  return `${label} #${puzzle} ${won ? attempts.length : "X"}/${maxAttempts}\n\n${squares}`;
}
