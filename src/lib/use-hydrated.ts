"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during the server render and hydration, true afterwards. Use it to gate UI that reads browser storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
