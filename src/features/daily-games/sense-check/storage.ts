import { readJSON, writeJSON } from "../../../lib/storage.ts";
import { EMPTY_STATS, type Stats } from "./logic.ts";
import type { TestResult } from "./components/tests";

const RUN_KEY = "pg:sense-check:v1:run";
const STATS_KEY = "pg:sense-check:v1:stats";
const HELP_KEY = "pg:sense-check:v1:seen-help";

export function loadRun(puzzle: number): TestResult[] {
  const saved = readJSON<{ puzzle: number; results: TestResult[] }>(RUN_KEY);
  if (!saved || saved.puzzle !== puzzle || !Array.isArray(saved.results)) return [];
  return saved.results.filter((r) => typeof r?.score === "number").slice(0, 5);
}

export function saveRun(puzzle: number, results: TestResult[]) {
  writeJSON(RUN_KEY, { puzzle, results });
}

export function loadStats(): Stats {
  return { ...EMPTY_STATS, ...(readJSON<Partial<Stats>>(STATS_KEY) ?? {}) };
}

export function saveStats(stats: Stats) {
  writeJSON(STATS_KEY, stats);
}

export const hasSeenHelp = () => readJSON<boolean>(HELP_KEY) === true;
export const markHelpSeen = () => writeJSON(HELP_KEY, true);
