"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GameHeader } from "@/components/games/game-header";
import { Toast, useToast } from "@/components/games/toast";
import { burst } from "@/components/motion/burst";
import { Drawer } from "@/components/ui/drawer";
import { useHydrated } from "@/lib/use-hydrated";
import { useProfile, withdraw } from "../../bankroll";
import { CasinoHud } from "../../components/casino-hud";
import { ChipFace, ChipStack } from "../../components/chip-stack";
import { DENOMINATIONS } from "../../economy.ts";
import { AVATARS, BOT_NAMES, EMPTY_READ, decide, makeTableStyles, type BotStyle, type Read } from "../bots.ts";
import { act, amountToCall, createTable, legalActions, potTotal, startHand, type Action, type Table } from "../engine.ts";
import { cashOut, clearSession, recoverSession, saveSession } from "../session.ts";
import { PokerTable, type SeatLook } from "./poker-table";
import { Setup, type TableConfig } from "./setup";

const HUMAN = 0;
const SEAT_COLOURS = ["#ffc93c", "#ff7eb6", "#3dd68c", "#8fd3ff", "#c79bff", "#ff8a3c", "#f3ede2", "#a3e635", "#fda4af"];

export function Poker() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-3 pt-3 pb-4 sm:px-4">
        <GameHeader title="Texas Hold’em" backHref="/casino" backLabel="Casino" />
        <div className="mt-4 h-[560px] animate-pulse rounded-[50%] bg-paper-deep" />
      </div>
    );
  }
  return <PokerGame />;
}

type Game = {
  config: TableConfig;
  table: Table;
  styles: BotStyle[];
  looks: SeatLook[];
  buyIns: number;
  hands: number;
  history: string[][];
};

function PokerGame() {
  const profile = useProfile();
  const [game, setGame] = useState<Game | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [raiseDraft, setRaiseDraft] = useState<number | null>(null);
  const [reads, setReads] = useState<Record<number, Read>>({});
  const [panel, setPanel] = useState<"rules" | "log" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { toast, show } = useToast();

  // Return chips from a session left open last time.
  const [recovered] = useState(() => recoverSession());
  useEffect(() => {
    if (recovered > 0) show(`◎ ${recovered.toLocaleString()} from your last table went back to your bankroll`, 3500);
  }, [recovered, show]);

  const commit = (next: Game | null) => {
    gameRef.current = next;
    setGame(next);
    if (next) saveSession({ stack: next.table.seats[HUMAN].stack, hands: next.hands });
  };

  /* ---------- sit down / leave ---------- */

  const sitDown = (config: TableConfig) => {
    if (!withdraw(config.buyIn)) return show("Not enough chips in your bankroll");
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const avatars = [...AVATARS].sort(() => Math.random() - 0.5);
    // A mix of personalities; never shown on screen, you have to read them yourself.
    const styles = makeTableStyles(config.players, config.difficulty);
    const seats = Array.from({ length: config.players }, (_, i) =>
      i === HUMAN
        ? { name: "You", isHuman: true, stack: config.buyIn }
        : {
            name: names[i - 1],
            isHuman: false,
            stack: Math.round((config.bb * (60 + Math.random() * 90)) / config.sb) * config.sb,
          },
    );
    const looks = seats.map((_, i) => ({
      avatar: i === HUMAN ? "😎" : avatars[i % avatars.length],
      colour: SEAT_COLOURS[i % SEAT_COLOURS.length],
    }));
    const table = startHand(createTable(seats, config.sb, config.bb));
    commit({ config, table, styles, looks, buyIns: config.buyIn, hands: 0, history: [] });
    setRaiseDraft(null);
  };

  const leave = () => {
    const g = gameRef.current;
    if (!g) return;
    const stack = g.table.seats[HUMAN].stack;
    cashOut({ stack, hands: g.hands });
    const net = stack - g.buyIns;
    show(`Cashed out ◎ ${stack.toLocaleString()} (${net >= 0 ? "+" : ""}${net.toLocaleString()})`, 3000);
    setLeaving(false);
    commit(null);
    clearSession();
  };

  const rebuy = () => {
    const g = gameRef.current;
    if (!g || !withdraw(g.config.buyIn)) return show("Not enough chips in your bankroll to rebuy");
    const seats = g.table.seats.map((s, i) => (i === HUMAN ? { ...s, stack: g.config.buyIn } : s));
    commit({ ...g, buyIns: g.buyIns + g.config.buyIn, table: startHand({ ...g.table, seats }) });
  };

  /* ---------- hand flow ---------- */

  const applyAction = (action: Action) => {
    const g = gameRef.current;
    if (!g) return;
    const before = g.table;
    const actor = before.toAct;
    let table = act(before, action);
    if (table === before) return;

    // Track the human's tendencies for expert bots.
    if (actor === HUMAN) {
      const r = reads[HUMAN] ?? EMPTY_READ;
      const voluntary = before.street === "preflop" && (action.type === "call" || action.type === "raise");
      setReads({
        ...reads,
        [HUMAN]: {
          ...r,
          voluntary: r.voluntary + (voluntary && !r.hands ? 1 : voluntary ? 1 : 0),
          aggressive: r.aggressive + (action.type === "raise" ? 1 : 0),
          passive: r.passive + (action.type === "call" ? 1 : 0),
        },
      });
    }

    let hands = g.hands;
    let history = g.history;
    if (table.phase === "done") {
      if (!table.seats[HUMAN].out) {
        hands += 1;
        setReads((prev) => ({ ...prev, [HUMAN]: { ...(prev[HUMAN] ?? EMPTY_READ), hands: (prev[HUMAN]?.hands ?? 0) + 1 } }));
      }
      history = [table.log, ...g.history].slice(0, 15);
      if (table.results.some((r) => r.winners.includes(HUMAN))) {
        burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.75, count: table.results[0].amount > table.bb * 30 ? 34 : 16 });
      }
    }
    table = { ...table };
    commit({ ...g, table, hands, history });
  };

  const nextHand = useEffectEvent(() => {
    const g = gameRef.current;
    if (!g || g.table.phase !== "done" || leaving) return;
    if (g.table.seats[HUMAN].stack <= 0) return; // busted: wait for rebuy/leave
    // Bots that bust reload to a fresh stack, like regulars at a cash table.
    const seats = g.table.seats.map((s, i) =>
      i !== HUMAN && s.stack < g.config.bb ? { ...s, stack: Math.round((g.config.bb * (80 + Math.random() * 60)) / g.config.sb) * g.config.sb } : s,
    );
    commit({ ...g, table: startHand({ ...g.table, seats }) });
    setRaiseDraft(null);
  });

  const botTurn = useEffectEvent(() => {
    const g = gameRef.current;
    if (!g || g.table.phase !== "playing" || g.table.toAct === HUMAN) return;
    const seat = g.table.toAct;
    const action = decide(g.table, seat, g.styles[seat], reads);
    applyAction(action);
  });

  useEffect(() => {
    if (!game) return;
    const t = game.table;
    if (t.phase === "playing" && t.toAct !== HUMAN && t.toAct >= 0) {
      // Bots take a human-ish moment, a little longer at the start of a new street.
      const newStreet = t.street !== "preflop" && t.seats.every((s) => s.bet === 0);
      const delay = 1200 + Math.random() * 1400 + (newStreet ? 900 : 0);
      const id = window.setTimeout(() => botTurn(), delay);
      return () => window.clearTimeout(id);
    }
    if (t.phase === "done") {
      const id = window.setTimeout(() => nextHand(), 4500);
      return () => window.clearTimeout(id);
    }
  }, [game]);

  /* ---------- human controls: tap chips to build a bet ---------- */

  const table = game?.table;
  const me = table?.seats[HUMAN];
  const myTurn = !!table && table.phase === "playing" && table.toAct === HUMAN;
  const legal = table && myTurn ? legalActions(table) : null;
  const toCall = table ? amountToCall(table, HUMAN) : 0;
  const pot = table ? potTotal(table) : 0;
  const isBet = !!table && table.currentBet === 0;
  const myStack = me?.stack ?? 0;
  const myBet = me?.bet ?? 0;
  const push = myTurn ? Math.min(raiseDraft ?? 0, myStack) : 0;
  const pushTo = myBet + push;

  type PushKind = "none" | "call" | "raise" | "allin" | "short";
  const pushKind: PushKind = !legal
    ? "none"
    : push === 0
      ? "none"
      : push === myStack
        ? "allin"
        : push === toCall
          ? "call"
          : legal.raise && pushTo >= legal.raise.min
            ? "raise"
            : "short";
  const shortBy = legal ? (push < toCall ? toCall - push : legal.raise ? legal.raise.min - pushTo : 0) : 0;

  const addChip = (value: number) => setRaiseDraft(Math.min(myStack, (raiseDraft ?? 0) + value));

  const preset = (fraction: number) => {
    if (!table || !legal?.raise) return;
    const target = isBet ? pot * fraction : table.currentBet + (pot + toCall) * fraction;
    const to = Math.max(legal.raise.min, Math.min(Math.round(target / table.sb) * table.sb, legal.raise.max));
    setRaiseDraft(to - myBet);
  };

  const humanAct = (action: Action) => {
    if (!myTurn) return;
    setRaiseDraft(null);
    applyAction(action);
  };

  const confirmPush = () => {
    if (!legal) return;
    if (pushKind === "call") humanAct({ type: "call" });
    else if (pushKind === "raise") humanAct({ type: "raise", to: pushTo });
    else if (pushKind === "allin") humanAct(legal.raise ? { type: "raise", to: legal.raise.max } : { type: "call" });
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!myTurn || !legal || panel || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "f" && legal.fold) humanAct({ type: "fold" });
    if (k === "c") humanAct(legal.check ? { type: "check" } : { type: "call" });
    if (k === "enter") confirmPush();
    if (k === "backspace") setRaiseDraft(null);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const busted = !!table && table.phase === "done" && (me?.stack ?? 0) <= 0;
  const net = game && me ? me.stack - game.buyIns : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 px-3 pt-2 pb-2 sm:px-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-baseline gap-2">
          <Link href="/casino" className="font-mono text-xs font-bold text-ink-soft hover:text-ink">
            ← Casino
          </Link>
          <h1 className="wide text-lg leading-none font-black uppercase sm:text-xl">Texas Hold’em</h1>
        </div>
        {game && (
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
            <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 text-paper capitalize">
              {game.config.sb}/{game.config.bb} · {game.config.difficulty} · #{game.table.handNo}
            </span>
            <span className={`rounded-full border-2 border-ink px-2.5 py-1 ${net >= 0 ? "bg-sports" : "bg-casino"}`}>
              Session {net >= 0 ? "+" : ""}
              {net.toLocaleString()}
            </span>
            <CasinoHud inline />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <button type="button" onClick={() => setPanel("rules")} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> Rules</span>
          </button>
          {game && (
            <>
              <button type="button" onClick={() => setPanel("log")} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
                🧾<span className="hidden sm:inline"> History</span>
              </button>
              <button
                type="button"
                onClick={() => (table?.phase === "playing" && !me?.folded ? setLeaving(true) : leave())}
                className="brut-sm press rounded-full bg-casino px-3 py-1 text-xs font-extrabold"
              >
                Leave table
              </button>
            </>
          )}
        </div>
      </div>

      {!game && <CasinoHud compact />}

      <div className="relative">
        <Toast toast={toast} />
        {!game ? (
          <div className="pt-2">
            {profile && <Setup league={profile.league} bankroll={profile.bankroll} onStart={sitDown} />}
          </div>
        ) : (
          <PokerTable
            table={game.table}
            looks={game.looks}
            thinking={game.table.phase === "playing" && game.table.toAct !== HUMAN ? game.table.toAct : null}
            pendingBet={push}
          />
        )}
      </div>

      {/* Action bar */}
      {game && (
        <div className="flex min-h-[4.25rem] flex-wrap items-center justify-center gap-x-3 gap-y-2" aria-live="polite">
          {busted ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <p className="font-display">You’re out of chips at this table.</p>
              <button type="button" onClick={rebuy} className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper">
                Rebuy ◎ {game.config.buyIn.toLocaleString()}
              </button>
              <button type="button" onClick={leave} className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold">
                Leave table
              </button>
            </div>
          ) : myTurn && legal ? (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {/* Your chips */}
              <div className="flex items-end gap-2">
                <ChipStack amount={myStack - push} size={26} label={false} />
                <div className="leading-tight">
                  <p className="font-mono text-[10px] font-bold text-ink-soft uppercase">Your chips</p>
                  <p className="font-display text-lg">◎ {(myStack - push).toLocaleString()}</p>
                </div>
              </div>

              {/* Tap chips to build a bet */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1.5">
                  {DENOMINATIONS.filter((v) => v >= game.table.sb && v <= Math.max(myStack, game.table.sb))
                    .slice(0, 6)
                    .reverse()
                    .map((v) => (
                      <motion.button
                        key={v}
                        type="button"
                        onClick={() => addChip(v)}
                        disabled={v > myStack - push}
                        aria-label={`Add a ${v} chip to your bet`}
                        whileHover={{ y: -5, rotate: -8 }}
                        whileTap={{ scale: 0.85 }}
                        className="rounded-full disabled:opacity-25"
                      >
                        <ChipFace value={v} size={44} />
                      </motion.button>
                    ))}
                </div>
                <div className="flex gap-1">
                  {legal.raise &&
                    (
                      [
                        ["½ pot", 0.5],
                        ["¾ pot", 0.75],
                        ["Pot", 1],
                      ] as const
                    ).map(([label, f]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => preset(f)}
                        className="rounded-full border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[10px] font-bold hover:bg-daily"
                      >
                        {label}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setRaiseDraft(myStack)}
                    className="rounded-full border-2 border-ink bg-casino px-2 py-0.5 font-mono text-[10px] font-bold"
                  >
                    All-in
                  </button>
                  {push > 0 && (
                    <button
                      type="button"
                      onClick={() => setRaiseDraft(null)}
                      className="rounded-full border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[10px] font-bold"
                    >
                      Clear ⌫
                    </button>
                  )}
                </div>
              </div>

              {/* Decisions */}
              <div className="flex items-center gap-2">
                {legal.fold && (
                  <button type="button" onClick={() => humanAct({ type: "fold" })} className="brut press rounded-2xl bg-paper px-4 py-3 font-extrabold">
                    Fold <span className="font-mono text-[10px] opacity-60">F</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => humanAct(legal.check ? { type: "check" } : { type: "call" })}
                  className="brut press rounded-2xl bg-daily px-4 py-3 font-extrabold"
                >
                  {legal.check ? "Check" : `Call ${legal.call.toLocaleString()}`} <span className="font-mono text-[10px] opacity-60">C</span>
                </button>
                <button
                  type="button"
                  onClick={confirmPush}
                  disabled={pushKind === "none" || pushKind === "short"}
                  className="brut press min-w-[8.5rem] rounded-2xl bg-pop px-4 py-3 font-extrabold text-paper disabled:bg-paper-deep disabled:text-ink-soft"
                >
                  {pushKind === "none"
                    ? isBet
                      ? "Tap chips to bet"
                      : "Tap chips to raise"
                    : pushKind === "short"
                      ? `Add ◎${shortBy} more`
                      : pushKind === "call"
                        ? `Call ${push.toLocaleString()}`
                        : pushKind === "allin"
                          ? `All-in ${pushTo.toLocaleString()}`
                          : `${isBet ? "Bet" : "Raise to"} ${pushTo.toLocaleString()}`}
                  {pushKind !== "none" && pushKind !== "short" && <span className="ml-1 font-mono text-[10px] opacity-70">⏎</span>}
                </button>
              </div>
            </div>
          ) : table?.phase === "done" ? (
            <p className="font-display text-sm">Next hand coming up…</p>
          ) : me?.folded ? (
            <p className="font-mono text-xs font-bold text-ink-soft">You folded — watching the hand play out.</p>
          ) : (
            <p className="font-mono text-xs font-bold text-ink-soft">Waiting for {table?.seats[table.toAct]?.name ?? "the deal"}…</p>
          )}
        </div>
      )}

      <p className="text-center font-mono text-[10px] text-ink-soft">Virtual chips only · no real money · 18+</p>

      {/* Leave mid-hand confirmation */}
      {leaving && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 p-4" onClick={() => setLeaving(false)}>
          <motion.div
            className="brut max-w-sm rounded-3xl bg-paper p-6 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-label="Leave mid-hand?"
          >
            <p className="font-display">Leave mid-hand?</p>
            <p className="mt-2 text-sm">Chips you’ve already put in this pot stay in it. The rest of your stack goes back to your bankroll.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={() => setLeaving(false)} className="brut-sm press rounded-full bg-paper px-5 py-2 font-extrabold">
                Stay
              </button>
              <button type="button" onClick={leave} className="brut press rounded-full bg-casino px-5 py-2 font-extrabold">
                Leave
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <Drawer open={panel === "rules"} onClose={() => setPanel(null)} title="How it plays">
        <PokerRules />
      </Drawer>
      <Drawer open={panel === "log"} onClose={() => setPanel(null)} title="Hand history">
        <div className="space-y-4 font-mono text-[11px]">
          {[game?.table.log ?? [], ...(game?.history ?? []).filter((h) => h !== game?.table.log)].filter((h) => h.length).map((h, i) => (
            <div key={i} className="rounded-xl border-2 border-ink bg-paper-deep p-3">
              {h.map((line, j) => (
                <p key={j} className={j === 0 ? "font-bold" : /wins|split/.test(line) ? "font-bold text-pop" : ""}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

const RANKINGS: [string, string][] = [
  ["Royal Flush", "A K Q J 10, same suit"],
  ["Straight Flush", "Five in a row, same suit"],
  ["Four of a Kind", "Four cards of one rank"],
  ["Full House", "Three of a kind + a pair"],
  ["Flush", "Five of the same suit"],
  ["Straight", "Five in a row (A can be low: A-2-3-4-5)"],
  ["Three of a Kind", "Three cards of one rank"],
  ["Two Pair", "Two different pairs"],
  ["Pair", "Two cards of one rank"],
  ["High Card", "None of the above"],
];

function PokerRules() {
  return (
    <div className="space-y-4 text-sm leading-snug">
      <section>
        <h3 className="font-display text-sm">The hand</h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Everyone gets two private cards. Five shared cards come out: the flop (3), the turn (1) and the river (1).</li>
          <li>Make the best five-card hand from your two cards and the five on the board.</li>
          <li>The two players left of the dealer button post the small and big blinds. The button moves one seat each hand.</li>
          <li>Heads-up, the button posts the small blind and acts first before the flop.</li>
        </ul>
      </section>
      <section>
        <h3 className="font-display text-sm">Betting (no-limit)</h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Fold, check, call, bet or raise. You can bet any amount up to your whole stack (all-in).</li>
          <li>A raise must be at least as big as the previous bet or raise on that street.</li>
          <li>An all-in that’s smaller than a full raise doesn’t let players who already acted raise again.</li>
          <li>If you’re all-in and others keep betting, side pots are made — you can only win the part you covered.</li>
          <li>Ties split the pot.</li>
        </ul>
      </section>
      <section>
        <h3 className="font-display text-sm">Hand rankings (best first)</h3>
        <ol className="mt-1.5 space-y-1">
          {RANKINGS.map(([name, desc], i) => (
            <li key={name} className="flex gap-2">
              <span className="w-5 font-mono text-xs font-bold text-ink-soft">{i + 1}.</span>
              <span>
                <strong>{name}</strong> — {desc}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <p className="font-mono text-[11px] text-ink-soft">Keys: F fold · C check/call · R raise. Virtual chips only.</p>
    </div>
  );
}
