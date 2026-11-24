"use client";

import { useSyncExternalStore } from "react";
import { puzzleNumberFor } from "@/lib/daily";
import { readJSON, writeJSON } from "@/lib/storage";
import {
  LEAGUES,
  NEW_PROFILE,
  applyResult,
  claimRefill,
  transfer,
  type LeagueChange,
  type Profile,
} from "./economy.ts";

/*
 * The player's casino profile (bankroll + league), stored in this browser.
 * All casino games read and write it through these helpers.
 */

const KEY = "pg:casino:v2:profile";
const CHANGE = "pg:casino-profile";
const LEAGUE_EVENT = "pg:league-change";

const today = () => puzzleNumberFor(new Date());

let cacheRaw: string | null | undefined;
let cacheValue: Profile = NEW_PROFILE;

/** Returns the same object until storage changes, as useSyncExternalStore requires. */
function read(): Profile {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    const saved = raw ? readJSON<Partial<Profile>>(KEY) : null;
    const merged = { ...NEW_PROFILE, ...saved };
    cacheValue =
      Number.isFinite(merged.bankroll) && merged.bankroll >= 0 && merged.league >= 0 && merged.league < LEAGUES.length
        ? merged
        : NEW_PROFILE;
  }
  return cacheValue;
}

function write(profile: Profile) {
  writeJSON(KEY, profile);
  window.dispatchEvent(new Event(CHANGE));
}

export const getProfile = () => read();

/** Records a finished hand/round. Announces promotions and relegations. */
export function settle(delta: number, hands = 1): LeagueChange {
  const { profile, change } = applyResult(read(), delta, hands, today());
  write(profile);
  if (change) window.dispatchEvent(new CustomEvent<LeagueChange>(LEAGUE_EVENT, { detail: change }));
  return change;
}

/** Takes chips off the bankroll (e.g. a bet or a poker buy-in). Returns false if unaffordable. */
export function withdraw(amount: number): boolean {
  const next = transfer(read(), -amount, today());
  if (!next) return false;
  write(next);
  return true;
}

/** Puts chips back on the bankroll without counting a hand (e.g. poker cash-out). */
export function deposit(amount: number) {
  const next = transfer(read(), amount, today());
  if (next) write(next);
}

export function claimDailyRefill() {
  write(claimRefill(read(), today()));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Live profile; `null` during the server render. */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function onLeagueChange(handler: (change: NonNullable<LeagueChange>) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<LeagueChange>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(LEAGUE_EVENT, listener);
  return () => window.removeEventListener(LEAGUE_EVENT, listener);
}

export const todayNumber = today;
