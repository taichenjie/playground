/*
 * Sense Check: five quick perception tests, the same set for everyone each
 * day. Pure rules and scoring; no React or browser APIs.
 */
import { advanceStreak, mulberry32, type DailyStreak } from "../../../lib/daily.ts";

export type TestKind = "count" | "motion" | "angle" | "rhythm" | "proportion";

export const TESTS: { kind: TestKind; name: string; emoji: string; blurb: string }[] = [
  { kind: "count", name: "Head count", emoji: "🔢", blurb: "Dots flash for two seconds. How many were there?" },
  { kind: "motion", name: "Into the fog", emoji: "🏃", blurb: "The ball vanishes into the fog. Hit stop when it crosses the line." },
  { kind: "angle", name: "Right angle?", emoji: "📐", blurb: "Drag the arm to make the angle asked for. No protractor." },
  { kind: "rhythm", name: "Keep the beat", emoji: "🥁", blurb: "Watch the beat, then tap it eight times on your own." },
  { kind: "proportion", name: "Fair share", emoji: "📏", blurb: "Mark the fraction of the bar asked for. No ruler." },
];

export type Dot = { x: number; y: number; r: number };

export type DailyParams = {
  count: { dots: Dot[] };
  motion: { durationMs: number; fogStart: number };
  angle: { target: number };
  rhythm: { bpm: number };
  proportion: { numerator: number; denominator: number };
};

const FRACTIONS: [number, number][] = [
  [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [3, 8], [5, 8],
  [1, 6], [5, 6], [2, 7], [5, 7], [4, 9], [7, 10], [3, 10], [1, 5], [4, 5],
];

/** Today's tests. Seeded by puzzle number so everyone gets the same ones. */
export function paramsFor(puzzle: number): DailyParams {
  const rand = mulberry32(puzzle * 7919 + 104729);
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  // Non-overlapping dots in a 100x100 box.
  const total = between(28, 130);
  const dots: Dot[] = [];
  let attempts = 0;
  while (dots.length < total && attempts < 20_000) {
    attempts++;
    const r = 1.3 + rand() * 1.4;
    const x = 4 + rand() * 92;
    const y = 4 + rand() * 92;
    if (dots.every((d) => Math.hypot(d.x - x, d.y - y) > d.r + r + 0.8)) dots.push({ x, y, r });
  }

  const [numerator, denominator] = FRACTIONS[between(0, FRACTIONS.length - 1)];

  return {
    count: { dots },
    motion: { durationMs: between(1600, 3200), fogStart: 0.35 + rand() * 0.2 },
    angle: { target: between(12, 168) },
    rhythm: { bpm: between(72, 140) },
    proportion: { numerator, denominator },
  };
}

/* ---------- Scoring: every test returns 0–100 ---------- */

const clampScore = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/** 10% off scores 75; 40% off scores 0. */
export function scoreCount(guess: number, actual: number): number {
  return clampScore(100 - (Math.abs(guess - actual) / actual) * 250);
}

/** Milliseconds early (negative) or late (positive). 100 ms off scores 88. */
export function scoreMotion(errorMs: number): number {
  return clampScore(100 - Math.abs(errorMs) / 8);
}

/** Degrees off. 4° off scores 90; 40° off scores 0. */
export function scoreAngle(guess: number, target: number): number {
  return clampScore(100 - Math.abs(guess - target) * 2.5);
}

/**
 * Tap timestamps in ms. Scores how evenly the gaps match the beat:
 * 5% average drift scores 80.
 */
export function scoreRhythm(taps: number[], bpm: number): number {
  if (taps.length < 2) return 0;
  const period = 60_000 / bpm;
  const gaps = taps.slice(1).map((t, i) => t - taps[i]);
  const drift = gaps.reduce((sum, g) => sum + Math.abs(g - period) / period, 0) / gaps.length;
  return clampScore(100 - drift * 400);
}

/** Both as fractions 0–1. 2% off scores 88. */
export function scoreProportion(guess: number, target: number): number {
  return clampScore(100 - Math.abs(guess - target) * 600);
}

export type Grade = "S" | "A" | "B" | "C" | "D" | "F";

export function gradeFor(average: number): Grade {
  if (average >= 95) return "S";
  if (average >= 85) return "A";
  if (average >= 72) return "B";
  if (average >= 58) return "C";
  if (average >= 45) return "D";
  return "F";
}

export function average(scores: number[]): number {
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

/* ---------- Stats & sharing ---------- */

export type Stats = DailyStreak & { totalAverage: number; best: number };

export const EMPTY_STATS: Stats = {
  played: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastCompleted: null,
  totalAverage: 0,
  best: 0,
};

/** Every finished day counts toward the streak, whatever the score. */
export function recordResult(stats: Stats, puzzle: number, score: number): Stats {
  if (stats.lastCompleted === puzzle) return stats;
  const next = advanceStreak(stats, puzzle, true);
  return { ...next, totalAverage: stats.totalAverage + score, best: Math.max(stats.best, score) };
}

export function shareText(siteName: string, puzzle: number, scores: number[]): string {
  const avg = average(scores);
  const line = TESTS.map((t, i) => `${t.emoji} ${scores[i] ?? "–"}`).join("  ");
  return `${siteName} Sense Check #${puzzle} — ${gradeFor(avg)} (${avg})\n\n${line}`;
}
