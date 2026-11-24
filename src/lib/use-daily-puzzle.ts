"use client";

import { useSyncExternalStore } from "react";
import { puzzleNumberFor } from "./daily";

function subscribeToClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

/**
 * Today's puzzle number, from the visitor's local date. `null` during the
 * server render (the date is only known in the browser); re-renders at midnight.
 */
export function useDailyPuzzle(): number | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => puzzleNumberFor(new Date()),
    () => null,
  );
}
