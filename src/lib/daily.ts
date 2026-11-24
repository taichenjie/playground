/*
 * Shared helpers for daily games. Pure (no React) so Node's test runner can
 * import them; relative imports of this file keep the `.ts` extension.
 */

/** Puzzle #1 of every daily game is 24 November 2026. */
const LAUNCH_UTC = Date.UTC(2026, 10, 24);
const DAY_MS = 86_400_000;

/** Daily puzzle number for the visitor's local date. Changes at local midnight. */
export function puzzleNumberFor(date: Date): number {
  const localDayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.floor((localDayUtc - LAUNCH_UTC) / DAY_MS) + 1);
}

/** Small seeded PRNG: the same seed gives everyone the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic shuffle of 0..length-1 for a given seed. */
export function shuffledOrder(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Picks today's item from a list, cycling through a fixed shuffled order. */
export function dailyItem<T>(items: readonly T[], puzzle: number, seed: number): T {
  const order = shuffledOrder(items.length, seed);
  return items[order[(puzzle - 1) % items.length]];
}

/** Streak bookkeeping shared by daily games. */
export type DailyStreak = {
  played: number;
  currentStreak: number;
  maxStreak: number;
  lastCompleted: number | null;
};

export function advanceStreak<T extends DailyStreak>(stats: T, puzzle: number, kept: boolean): T {
  if (stats.lastCompleted === puzzle) return stats;
  const continues = stats.lastCompleted === puzzle - 1;
  const currentStreak = kept ? (continues ? stats.currentStreak + 1 : 1) : 0;
  return {
    ...stats,
    played: stats.played + 1,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastCompleted: puzzle,
  };
}
