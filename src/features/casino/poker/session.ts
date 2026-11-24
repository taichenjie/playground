"use client";

import { readJSON, writeJSON } from "@/lib/storage";
import { settle } from "../bankroll";

/*
 * A poker session moves chips from the bankroll onto the table. The table
 * stack is saved after every action so that closing the page mid-session
 * still returns the chips (minus anything already in the pot) next time.
 */

const KEY = "pg:poker:v1:session";

export type Session = { stack: number; hands: number };

export function saveSession(s: Session) {
  writeJSON(KEY, s);
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Cash out: chips back to the bankroll, hands counted toward league promotion. */
export function cashOut(s: Session) {
  settle(s.stack, Math.max(0, s.hands));
  clearSession();
}

/** If a previous session was left open, return its chips. Returns the amount refunded. */
export function recoverSession(): number {
  const s = readJSON<Session>(KEY);
  if (!s || typeof s.stack !== "number") return 0;
  cashOut(s);
  return s.stack;
}
