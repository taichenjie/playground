/*
 * Anti-farming rule: the softer the bots, the smaller the blinds.
 * Easy bots only play at the lowest stakes, Medium up to 2/5, and Hard or
 * Expert at any stakes. Winning big chips therefore means beating strong
 * opponents.
 */
import type { Difficulty } from "./bots.ts";

export const DIFFICULTY_MAX_BB: Record<Difficulty, number> = {
  easy: 2,
  medium: 5,
  hard: Infinity,
  expert: Infinity,
};

export function allowedDifficulties(bb: number): Difficulty[] {
  return (Object.keys(DIFFICULTY_MAX_BB) as Difficulty[]).filter((d) => bb <= DIFFICULTY_MAX_BB[d]);
}

export function stakeLimitLabel(d: Difficulty): string {
  const max = DIFFICULTY_MAX_BB[d];
  return max === Infinity ? "Any stakes" : max === 2 ? "1/2 tables only" : `Up to ${max === 5 ? "2/5" : `${max / 2}/${max}`}`;
}
