/*
 * Casino economy: one persistent bankroll of virtual chips for every casino
 * game, plus leagues. Pure rules — no browser APIs.
 *
 * Chips are play money. They can never be bought, sold, withdrawn or swapped
 * for anything of value. Going broke unlocks a small free refill the next day.
 */

export const STARTING_BANKROLL = 1000;
export const DAILY_REFILL = 100;

export type LeagueId = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type BotLevel = "easy" | "medium" | "hard" | "expert";

export type League = {
  id: LeagueId;
  name: string;
  /** Bankroll needed (together with `handsToPromote`) to move up into this league. */
  promoteAt: number;
  /** Hands that must be played in the league below before promotion. */
  handsToPromote: number;
  /** Drop back to the previous league below this bankroll. */
  relegateBelow: number;
  blackjack: { min: number; max: number };
  /** Poker cash-game stakes offered (small blind / big blind). */
  poker: { sb: number; bb: number }[];
  /** Bots in this league play at least this well. */
  bots: BotLevel;
  colour: string;
};

export const LEAGUES: League[] = [
  {
    id: "bronze", name: "Bronze", promoteAt: 0, handsToPromote: 0, relegateBelow: 0,
    blackjack: { min: 5, max: 100 }, poker: [{ sb: 1, bb: 2 }, { sb: 2, bb: 5 }], bots: "easy", colour: "#d08b4f",
  },
  {
    id: "silver", name: "Silver", promoteAt: 2500, handsToPromote: 100, relegateBelow: 800,
    blackjack: { min: 25, max: 500 }, poker: [{ sb: 5, bb: 10 }, { sb: 10, bb: 25 }], bots: "medium", colour: "#b7bcc6",
  },
  {
    id: "gold", name: "Gold", promoteAt: 10000, handsToPromote: 250, relegateBelow: 3000,
    blackjack: { min: 100, max: 2000 }, poker: [{ sb: 25, bb: 50 }, { sb: 50, bb: 100 }], bots: "hard", colour: "#ffc93c",
  },
  {
    id: "platinum", name: "Platinum", promoteAt: 40000, handsToPromote: 500, relegateBelow: 12000,
    blackjack: { min: 500, max: 10000 }, poker: [{ sb: 100, bb: 200 }, { sb: 250, bb: 500 }], bots: "expert", colour: "#8fd3ff",
  },
  {
    id: "diamond", name: "Diamond", promoteAt: 150000, handsToPromote: 1000, relegateBelow: 50000,
    blackjack: { min: 2500, max: 50000 }, poker: [{ sb: 500, bb: 1000 }, { sb: 1000, bb: 2500 }], bots: "expert", colour: "#c79bff",
  },
];

export type Profile = {
  bankroll: number;
  /** Index into LEAGUES. */
  league: number;
  /** Hands played since joining the current league. */
  handsInLeague: number;
  totalHands: number;
  peak: number;
  /** Day (puzzle number) on which the player went broke; refill unlocks the day after. */
  brokeOn: number | null;
};

export const NEW_PROFILE: Profile = {
  bankroll: STARTING_BANKROLL,
  league: 0,
  handsInLeague: 0,
  totalHands: 0,
  peak: STARTING_BANKROLL,
  brokeOn: null,
};

/** Below this you can't play anything (the smallest blackjack bet; poker buy-ins are larger). */
export const MIN_STAKE = LEAGUES[0].blackjack.min;

export const isBroke = (p: Profile) => p.bankroll < MIN_STAKE;
export const canClaimRefill = (p: Profile, today: number) => isBroke(p) && p.brokeOn !== null && today > p.brokeOn;

export type LeagueChange = { kind: "promoted" | "relegated"; to: League } | null;

/**
 * Applies a settled result: `delta` chips won (negative = lost) over `hands`
 * hands. Handles going broke, promotion and relegation.
 */
export function applyResult(p: Profile, delta: number, hands: number, today: number): { profile: Profile; change: LeagueChange } {
  const bankroll = Math.max(0, Math.round(p.bankroll + delta));
  let next: Profile = {
    ...p,
    bankroll,
    handsInLeague: p.handsInLeague + hands,
    totalHands: p.totalHands + hands,
    peak: Math.max(p.peak, bankroll),
    brokeOn: bankroll < MIN_STAKE ? (p.brokeOn ?? today) : null,
  };
  let change: LeagueChange = null;

  const up = LEAGUES[next.league + 1];
  if (up && next.bankroll >= up.promoteAt && next.handsInLeague >= up.handsToPromote) {
    next = { ...next, league: next.league + 1, handsInLeague: 0 };
    change = { kind: "promoted", to: up };
  } else if (next.league > 0 && next.bankroll < LEAGUES[next.league].relegateBelow) {
    next = { ...next, league: next.league - 1, handsInLeague: 0 };
    change = { kind: "relegated", to: LEAGUES[next.league] };
  }
  return { profile: next, change };
}

/** Moves chips between the bankroll and a table (poker buy-in / cash-out). Fails if unaffordable. */
export function transfer(p: Profile, amount: number, today: number): Profile | null {
  if (p.bankroll + amount < 0) return null;
  const bankroll = p.bankroll + amount;
  return { ...p, bankroll, peak: Math.max(p.peak, bankroll), brokeOn: bankroll < MIN_STAKE ? (p.brokeOn ?? today) : null };
}

export function claimRefill(p: Profile, today: number): Profile {
  if (!canClaimRefill(p, today)) return p;
  return { ...p, bankroll: p.bankroll + DAILY_REFILL, brokeOn: null };
}

/** Progress toward the next league, 0–1 for bankroll and hands. */
export function promotionProgress(p: Profile) {
  const up = LEAGUES[p.league + 1];
  if (!up) return null;
  return {
    to: up,
    bankroll: Math.min(1, p.bankroll / up.promoteAt),
    hands: up.handsToPromote ? Math.min(1, p.handsInLeague / up.handsToPromote) : 1,
  };
}

/* ---------- Chip denominations (for drawing stacks) ---------- */

export const DENOMINATIONS = [25000, 5000, 1000, 500, 100, 25, 5, 1] as const;

/** Splits an amount into chips, largest first: 135 → {100:1, 25:1, 5:2}. */
export function breakIntoChips(amount: number): { value: number; count: number }[] {
  let rest = Math.max(0, Math.floor(amount));
  const out: { value: number; count: number }[] = [];
  for (const value of DENOMINATIONS) {
    const count = Math.floor(rest / value);
    if (count) {
      out.push({ value, count });
      rest -= count * value;
    }
  }
  return out;
}

/**
 * Chips for a pot pile that grows like a real one: use chips no bigger than
 * ~10 big blinds, stepping up to bigger chips only when the pile would
 * exceed `maxChips`.
 */
export function pileBreakdown(amount: number, unit: number, maxChips = 48): { value: number; count: number }[] {
  const ascending = [...DENOMINATIONS].reverse();
  let cap = ascending.filter((v) => v <= Math.max(unit * 10, 5)).pop() ?? 1;
  for (;;) {
    let rest = Math.max(0, Math.floor(amount));
    const out: { value: number; count: number }[] = [];
    for (const value of DENOMINATIONS) {
      if (value > cap) continue;
      const count = Math.floor(rest / value);
      if (count) {
        out.push({ value, count });
        rest -= count * value;
      }
    }
    const total = out.reduce((s, c) => s + c.count, 0);
    const bigger = ascending.find((v) => v > cap);
    if (total <= maxChips || !bigger) return out;
    cap = bigger;
  }
}
