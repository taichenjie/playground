import { EMPTY_STATS, type Stats } from "./logic.ts";

/*
 * Progress and stats live in this browser's localStorage. There are no
 * accounts yet, so clearing site data resets them. Every read is defensive:
 * storage can be unavailable (private mode) or hold old/corrupt data.
 */

const GAME_KEY = "pg:word-guess:v1:game";
const STATS_KEY = "pg:word-guess:v1:stats";
const HELP_KEY = "pg:word-guess:v1:seen-help";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game still works, it just won't persist.
  }
}

export function loadGuesses(puzzle: number): string[] {
  const saved = read<{ puzzle: number; guesses: unknown }>(GAME_KEY);
  if (!saved || saved.puzzle !== puzzle || !Array.isArray(saved.guesses)) return [];
  return saved.guesses.filter((g): g is string => typeof g === "string" && /^[a-z]{5}$/.test(g)).slice(0, 6);
}

export function saveGuesses(puzzle: number, guesses: string[]) {
  write(GAME_KEY, { puzzle, guesses });
}

export function loadStats(): Stats {
  const saved = read<Partial<Stats>>(STATS_KEY);
  if (!saved) return EMPTY_STATS;
  return {
    ...EMPTY_STATS,
    ...saved,
    distribution:
      Array.isArray(saved.distribution) && saved.distribution.length === EMPTY_STATS.distribution.length
        ? saved.distribution
        : EMPTY_STATS.distribution,
  };
}

export function saveStats(stats: Stats) {
  write(STATS_KEY, stats);
}

export function hasSeenHelp(): boolean {
  return read<boolean>(HELP_KEY) === true;
}

export function markHelpSeen() {
  write(HELP_KEY, true);
}
