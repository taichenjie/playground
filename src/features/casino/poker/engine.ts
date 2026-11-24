/*
 * No-limit Texas Hold'em cash-game engine. Pure state machine: every
 * function returns a new table. No UI, no timers, no browser APIs — so the
 * same engine can later run on a game server for multiplayer.
 *
 * Rules implemented:
 *  - Button, small blind, big blind; heads-up the button posts the small
 *    blind and acts first before the flop.
 *  - No-limit betting with minimum raises; an all-in that is less than a
 *    full raise does not reopen betting for players who already acted.
 *  - Side pots, split pots (odd chips go to the first winner left of the
 *    button), uncalled bets returned.
 */
import { createShoe, type Card } from "../cards.ts";
import { describeScore, scoreCards } from "./evaluator.ts";

export type Street = "preflop" | "flop" | "turn" | "river";

export type Seat = {
  id: number;
  name: string;
  isHuman: boolean;
  stack: number;
  /** Chips put in on the current street. */
  bet: number;
  /** Chips put in this hand (all streets). */
  committed: number;
  cards: Card[];
  folded: boolean;
  allIn: boolean;
  /** Has acted since the last full raise (so can't re-raise an incomplete all-in). */
  acted: boolean;
  /** Not dealt in (e.g. broke). */
  out: boolean;
  lastAction: string | null;
};

export type PotResult = {
  amount: number;
  winners: number[];
  /** Hand description for showdown pots; null when won uncontested. */
  hand: string | null;
};

export type Table = {
  seats: Seat[];
  sb: number;
  bb: number;
  button: number;
  handNo: number;
  deck: Card[];
  board: Card[];
  street: Street;
  /** Index of the seat to act, or -1 when nobody can act. */
  toAct: number;
  /** Highest bet on this street. */
  currentBet: number;
  /** Size of the last full raise on this street. */
  minRaise: number;
  sbSeat: number;
  bbSeat: number;
  phase: "playing" | "done";
  /** Filled when the hand is over. */
  results: PotResult[];
  /** Seats that showed cards at showdown. */
  shown: number[];
  log: string[];
};

export type SeatInit = { name: string; isHuman: boolean; stack: number };

export function createTable(seats: SeatInit[], sb: number, bb: number): Table {
  return {
    seats: seats.map((s, id) => ({
      id,
      ...s,
      bet: 0,
      committed: 0,
      cards: [],
      folded: false,
      allIn: false,
      acted: false,
      out: false,
      lastAction: null,
    })),
    sb,
    bb,
    button: seats.length - 1, // first hand moves it to seat 0
    handNo: 0,
    deck: [],
    board: [],
    street: "preflop",
    toAct: -1,
    currentBet: 0,
    minRaise: bb,
    sbSeat: -1,
    bbSeat: -1,
    phase: "done",
    results: [],
    shown: [],
    log: [],
  };
}

/* ---------- helpers ---------- */

const clone = (t: Table): Table => ({ ...t, seats: t.seats.map((s) => ({ ...s })), board: [...t.board], log: [...t.log] });

/** Next seat index after `from` matching `pred`, wrapping around; -1 if none. */
function nextSeat(t: Table, from: number, pred: (s: Seat) => boolean): number {
  const n = t.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (pred(t.seats[idx])) return idx;
  }
  return -1;
}

const inHand = (s: Seat) => !s.out && !s.folded;
const canAct = (s: Seat) => inHand(s) && !s.allIn;
export const potTotal = (t: Table) => t.seats.reduce((sum, s) => sum + s.committed, 0);

function putIn(seat: Seat, amount: number) {
  const a = Math.min(amount, seat.stack);
  seat.stack -= a;
  seat.bet += a;
  seat.committed += a;
  if (seat.stack === 0) seat.allIn = true;
  return a;
}

/* ---------- starting a hand ---------- */

/** Deals a new hand. Seats with no chips sit out. Returns the table unchanged if fewer than two can play. */
export function startHand(table: Table, rand?: () => number): Table {
  const t = clone(table);
  for (const s of t.seats) {
    Object.assign(s, { bet: 0, committed: 0, cards: [], folded: false, allIn: false, acted: false, lastAction: null });
    s.out = s.stack <= 0;
  }
  const players = t.seats.filter((s) => !s.out);
  if (players.length < 2) return { ...t, phase: "done" };

  t.handNo += 1;
  t.button = nextSeat(t, t.button, (s) => !s.out);
  const headsUp = players.length === 2;
  t.sbSeat = headsUp ? t.button : nextSeat(t, t.button, (s) => !s.out);
  t.bbSeat = nextSeat(t, t.sbSeat, (s) => !s.out);
  t.deck = createShoe(1, rand);
  t.board = [];
  t.street = "preflop";
  t.results = [];
  t.shown = [];
  t.phase = "playing";
  t.log = [`Hand #${t.handNo} — blinds ${t.sb}/${t.bb}`];

  const sb = t.seats[t.sbSeat];
  const bbSeat = t.seats[t.bbSeat];
  putIn(sb, t.sb);
  sb.lastAction = `SB ${sb.bet}`;
  putIn(bbSeat, t.bb);
  bbSeat.lastAction = `BB ${bbSeat.bet}`;
  t.log.push(`${sb.name} posts ${sb.bet}`, `${bbSeat.name} posts ${bbSeat.bet}`);

  // Two cards each, starting left of the button.
  for (let round = 0; round < 2; round++) {
    let idx = t.button;
    for (let k = 0; k < players.length; k++) {
      idx = nextSeat(t, idx, (s) => !s.out);
      t.seats[idx].cards.push(t.deck.shift()!);
    }
  }

  t.currentBet = t.bb;
  t.minRaise = t.bb;
  t.toAct = nextSeat(t, t.bbSeat, canAct);
  return settleIfNoAction(t);
}

/* ---------- actions ---------- */

export type Action = { type: "fold" } | { type: "check" } | { type: "call" } | { type: "raise"; to: number };

export type Legal = {
  fold: boolean;
  check: boolean;
  call: number; // 0 if not callable
  /** Raise-to bounds; null when raising isn't allowed. */
  raise: { min: number; max: number } | null;
};

export function legalActions(t: Table): Legal {
  const none: Legal = { fold: false, check: false, call: 0, raise: null };
  if (t.phase !== "playing" || t.toAct < 0) return none;
  const s = t.seats[t.toAct];
  const owe = t.currentBet - s.bet;
  const call = Math.min(owe, s.stack);
  const maxTo = s.bet + s.stack;
  const othersCanRespond = t.seats.some((o) => o.id !== s.id && canAct(o));
  const canRaise = !s.acted && s.stack > owe && othersCanRespond;
  const minTo = Math.min(t.currentBet + t.minRaise, maxTo);
  return {
    fold: owe > 0,
    check: owe <= 0,
    call: owe > 0 ? call : 0,
    raise: canRaise ? { min: minTo, max: maxTo } : null,
  };
}

export function act(table: Table, action: Action): Table {
  const legal = legalActions(table);
  const t = clone(table);
  const s = t.seats[t.toAct];
  if (!s) return table;

  switch (action.type) {
    case "fold":
      if (!legal.fold) return table;
      s.folded = true;
      s.lastAction = "Fold";
      t.log.push(`${s.name} folds`);
      break;
    case "check":
      if (!legal.check) return table;
      s.lastAction = "Check";
      t.log.push(`${s.name} checks`);
      break;
    case "call": {
      if (!legal.call) return table;
      putIn(s, legal.call);
      s.lastAction = s.allIn ? `All-in ${s.bet}` : `Call ${s.bet}`;
      t.log.push(`${s.name} calls ${legal.call}${s.allIn ? " (all-in)" : ""}`);
      break;
    }
    case "raise": {
      if (!legal.raise) return table;
      const to = Math.max(legal.raise.min, Math.min(Math.round(action.to), legal.raise.max));
      const raiseBy = to - t.currentBet;
      const wasBet = t.currentBet === 0;
      putIn(s, to - s.bet);
      if (raiseBy >= t.minRaise) {
        // Full raise: everyone else may act again.
        t.minRaise = raiseBy;
        for (const o of t.seats) if (o.id !== s.id) o.acted = false;
      }
      t.currentBet = Math.max(t.currentBet, s.bet);
      s.lastAction = s.allIn ? `All-in ${s.bet}` : `${wasBet ? "Bet" : "Raise"} ${s.bet}`;
      t.log.push(`${s.name} ${wasBet ? "bets" : "raises to"} ${s.bet}${s.allIn ? " (all-in)" : ""}`);
      break;
    }
  }
  s.acted = true;
  return advance(t);
}

/* ---------- flow ---------- */

function roundComplete(t: Table): boolean {
  return t.seats.filter(canAct).every((s) => s.acted && s.bet === t.currentBet);
}

function advance(t: Table): Table {
  if (t.seats.filter(inHand).length === 1) return finishUncontested(t);
  if (!roundComplete(t)) {
    t.toAct = nextSeat(t, t.toAct, (s) => canAct(s) && (!s.acted || s.bet < t.currentBet));
    return t;
  }
  return nextStreet(t);
}

/** If one or zero players can still bet, deal out the board and show down. */
function settleIfNoAction(t: Table): Table {
  const actors = t.seats.filter(canAct);
  const facing = actors.filter((s) => s.bet < t.currentBet);
  if (actors.length <= 1 && facing.length === 0) return runOut(t);
  return t;
}

function nextStreet(t: Table): Table {
  for (const s of t.seats) {
    s.bet = 0;
    s.acted = false;
    if (inHand(s) && !s.allIn) s.lastAction = null;
  }
  t.currentBet = 0;
  t.minRaise = t.bb;

  if (t.street === "river") return showdown(t);
  const next: Record<Street, Street> = { preflop: "flop", flop: "turn", turn: "river", river: "river" };
  t.street = next[t.street];
  const count = t.street === "flop" ? 3 : 1;
  t.deck.shift(); // burn
  t.board.push(...t.deck.splice(0, count));
  t.log.push(`${t.street[0].toUpperCase()}${t.street.slice(1)}: ${t.board.map((c) => c.rank + c.suit).join(" ")}`);

  if (t.seats.filter(canAct).length <= 1) return runOut(t);
  t.toAct = nextSeat(t, t.button, canAct);
  return t;
}

function runOut(t: Table): Table {
  t.toAct = -1;
  for (const s of t.seats) s.bet = 0;
  while (t.board.length < 5) {
    t.deck.shift();
    t.board.push(...t.deck.splice(0, t.board.length === 0 ? 3 : 1));
  }
  t.street = "river";
  return showdown(t);
}

function finishUncontested(t: Table): Table {
  const winner = t.seats.find(inHand)!;
  const amount = potTotal(t);
  winner.stack += amount;
  t.results = [{ amount, winners: [winner.id], hand: null }];
  t.log.push(`${winner.name} wins ${amount}`);
  for (const s of t.seats) s.bet = 0;
  t.toAct = -1;
  t.phase = "done";
  return t;
}

/** Splits contributions into main and side pots. */
export function buildPots(seats: Seat[]): { amount: number; eligible: number[] }[] {
  const levels = [...new Set(seats.filter((s) => s.committed > 0).map((s) => s.committed))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: number[] }[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = seats.reduce((sum, s) => sum + Math.max(0, Math.min(s.committed, level) - prev), 0);
    const eligible = seats.filter((s) => inHand(s) && s.committed >= level).map((s) => s.id);
    if (amount > 0) {
      // Merge into the previous pot when the same players are eligible.
      const last = pots[pots.length - 1];
      if (last && last.eligible.join() === eligible.join()) last.amount += amount;
      else pots.push({ amount, eligible });
    }
    prev = level;
  }
  return pots.filter((p) => p.eligible.length > 0);
}

function showdown(t: Table): Table {
  t.toAct = -1;
  const scores = new Map<number, number>();
  for (const s of t.seats) if (inHand(s)) scores.set(s.id, scoreCards([...s.cards, ...t.board]));
  t.shown = [...scores.keys()];

  const results: PotResult[] = [];
  for (const pot of buildPots(t.seats)) {
    const best = Math.max(...pot.eligible.map((id) => scores.get(id)!));
    // Winners ordered starting left of the button (odd chips go first).
    const ordered: number[] = [];
    for (let i = 1; i <= t.seats.length; i++) {
      const id = (t.button + i) % t.seats.length;
      if (pot.eligible.includes(id) && scores.get(id) === best) ordered.push(id);
    }
    const share = Math.floor(pot.amount / ordered.length);
    let odd = pot.amount - share * ordered.length;
    for (const id of ordered) {
      t.seats[id].stack += share + (odd > 0 ? 1 : 0);
      odd = Math.max(0, odd - 1);
    }
    const hand = pot.eligible.length > 1 ? describeScore(best) : null;
    results.push({ amount: pot.amount, winners: ordered, hand });
    t.log.push(
      `${ordered.map((id) => t.seats[id].name).join(" & ")} ${ordered.length > 1 ? "split" : "wins"} ${pot.amount}${hand ? ` with ${hand}` : ""}`,
    );
  }
  t.results = results;
  t.phase = "done";
  return t;
}

/* ---------- info for players & bots ---------- */

export const amountToCall = (t: Table, seat: number) => Math.max(0, Math.min(t.currentBet - t.seats[seat].bet, t.seats[seat].stack));

/** Position relative to the button: 0 = button, 1 = SB, 2 = BB, then early → late. */
export function positionOf(t: Table, seat: number): "button" | "blinds" | "early" | "middle" | "late" {
  if (seat === t.button) return "button";
  if (seat === t.sbSeat || seat === t.bbSeat) return "blinds";
  const active = t.seats.filter((s) => !s.out).length;
  let dist = 0;
  let idx = t.bbSeat;
  while (idx !== seat && dist < t.seats.length) {
    idx = nextSeat(t, idx, (s) => !s.out);
    dist++;
  }
  const afterBB = active - 3; // seats between BB and button
  if (afterBB <= 0) return "late";
  const frac = dist / afterBB;
  return frac <= 0.34 ? "early" : frac <= 0.67 ? "middle" : "late";
}
