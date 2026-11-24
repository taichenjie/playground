/*
 * Tiny defensive wrapper around localStorage. Storage can be unavailable
 * (private mode, blocked) or hold stale data, so reads never throw.
 */

export function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game still works, it just won't persist.
  }
}
