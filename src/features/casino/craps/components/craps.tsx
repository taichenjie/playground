"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { Toast, useToast } from "@/components/games/toast";
import { Drawer } from "@/components/ui/drawer";
import { useHydrated } from "@/lib/use-hydrated";
import { readJSON, writeJSON } from "@/lib/storage";
import { deposit, settle, useProfile, withdraw } from "../../bankroll";
import { ChipFace } from "../../components/chip-stack";
import { DENOMINATIONS, LEAGUES } from "../../economy.ts";
import {
  FIELD_NUMBERS,
  HARD_PAYS,
  HOUSE_EDGE,
  NEW_TABLE,
  ODDS_MULTIPLE,
  PLACE_PAYS,
  POINTS,
  canTakeDown,
  labelOf,
  limitsFor,
  needsMin,
  resolveRoll,
  rollDice,
  roomFor,
  takeDown,
  totalOf,
  type Bets,
  type Dice,
  type Hard,
  type Outcome,
  type Point,
  type RollResult,
  type Table,
} from "../logic.ts";
import { Die, ThrownDice } from "./dice";

const STATE_KEY = "pg:craps:v1:table";
const PENDING_KEY = "pg:craps:v1:pending";

type Stats = { rolls: number; net: number; best: number; pointsMade: number; longestHand: number };
type Saved = { table: Table; history: Dice[]; handRolls: number; stats: Stats; lastLost: Bets | null };
const NEW_STATS: Stats = { rolls: 0, net: 0, best: 0, pointsMade: 0, longestHand: 0 };

const GOLD = "#e8b84a";
const short = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const chipFor = (amount: number) => DENOMINATIONS.find((d) => d <= amount) ?? 1;
const WORD: Record<number, string> = { 4: "FOUR", 5: "FIVE", 6: "SIX", 8: "EIGHT", 9: "NINE", 10: "TEN" };

function loadSaved(): Saved {
  const s = readJSON<Partial<Saved>>(STATE_KEY);
  if (s && s.table && typeof s.table.bets === "object") {
    return { history: [], handRolls: 0, stats: NEW_STATS, lastLost: null, ...s } as Saved;
  }
  return { table: NEW_TABLE, history: [], handRolls: 0, stats: NEW_STATS, lastLost: null };
}

export function Craps() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-3 pt-3 pb-4 sm:px-4">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Craps</h1>
        <div className="mt-4 h-[480px] animate-pulse rounded-[36px]" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }
  return <CrapsTable />;
}

type Phase = "betting" | "rolling" | "result";

function CrapsTable() {
  const profile = useProfile();
  const { toast, show } = useToast();
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const persist = (next: Saved) => {
    setSaved(next);
    writeJSON(STATE_KEY, next);
  };
  const table = saved.table;

  const [tableLeague, setTableLeague] = useState<number | null>(null);
  const leagueIndex = Math.min(tableLeague ?? profile?.league ?? 0, profile?.league ?? 0);
  const limits = limitsFor(LEAGUES[leagueIndex]);
  const chips: number[] = DENOMINATIONS.filter((v) => v <= limits.max && v >= (leagueIndex > 1 ? 5 : 1)).reverse().slice(0, 6);
  const [chip, setChip] = useState(5);
  const chipValue = chips.includes(chip) ? chip : chips[Math.min(1, chips.length - 1)];

  const [phase, setPhase] = useState<Phase>("betting");
  const [roll, setRoll] = useState<RollResult | null>(null);
  const [rollId, setRollId] = useState(0);
  const [takeMode, setTakeMode] = useState(false);
  const [panel, setPanel] = useState<"rules" | "stats" | null>(null);

  // A roll interrupted by leaving the page still pays out on return.
  useEffect(() => {
    const pending = readJSON<{ returned: number; hands: number }>(PENDING_KEY);
    if (pending) {
      window.localStorage.removeItem(PENDING_KEY);
      settle(pending.returned, pending.hands);
    }
  }, []);

  const bankroll = profile?.bankroll ?? 0;
  const onFelt = totalOf(table.bets);
  const busy = phase === "rolling";

  const setTable = (t: Table, extra: Partial<Saved> = {}) => persist({ ...saved, ...extra, table: t });

  /** Adds the selected chip to a bet (or takes it down in take-down mode). */
  const place = (key: string) => {
    if (busy) return;
    if (phase === "result") setPhase("betting");
    if (takeMode) return remove(key);
    const room = roomFor(table, key, limits);
    if (room <= 0) {
      if (/Odds/.test(key)) return show(table.point ? "Odds go behind a line or Come bet, up to 3-4-5x" : "Odds need a point first");
      if (key === "pass" || key === "dontPass") return show("Line bets go down before the come-out roll");
      if (key === "come" || key === "dontCome") return show("Come bets need a point — use the Pass Line first");
      return show(`Table limit on ${labelOf(key)} reached`);
    }
    const add = Math.min(chipValue, room, bankroll);
    if (add <= 0) return show("Not enough chips in your bankroll");
    if (!withdraw(add)) return show("Not enough chips in your bankroll");
    setTable({ ...table, bets: { ...table.bets, [key]: (table.bets[key] ?? 0) + add } });
  };

  const remove = (key: string) => {
    if (busy || !table.bets[key]) return;
    if (phase === "result") setPhase("betting");
    if (!canTakeDown(table, key)) return show(`${labelOf(key)} is a contract bet once it has a point — it stays until it wins or loses`);
    const { table: t, returned } = takeDown(table, key);
    deposit(returned);
    setTable(t);
  };

  const clearAll = () => {
    if (busy) return;
    let t = table;
    let back = 0;
    for (const key of Object.keys(t.bets)) {
      if (!canTakeDown(t, key)) continue;
      const r = takeDown(t, key);
      t = r.table;
      back += r.returned;
    }
    if (!back) return;
    deposit(back);
    setTable(t);
  };

  const rebet = () => {
    if (busy || !saved.lastLost) return;
    const bets = { ...table.bets };
    let spent = 0;
    for (const [key, amount] of Object.entries(saved.lastLost)) {
      const t = { ...table, bets };
      const add = Math.min(amount, roomFor(t, key, limits));
      if (add <= 0) continue;
      bets[key] = (bets[key] ?? 0) + add;
      spent += add;
    }
    if (!spent) return;
    if (!withdraw(spent)) return show("Not enough chips in your bankroll");
    setTable({ ...table, bets }, { lastLost: null });
  };

  const throwDice = () => {
    if (busy) return;
    const small = Object.entries(table.bets).find(([k, v]) => needsMin(k) && v > 0 && v < limits.min);
    if (small) return show(`Minimum ${limits.min} on ${labelOf(small[0])}`);
    const r = resolveRoll(table, rollDice());
    const hands = r.outcomes.some((o) => o.result !== "move") ? 1 : 0;
    const won = r.outcomes.reduce((s, o) => s + o.won, 0);
    const net = won - r.lost;
    const sevenOut = r.event === "seven-out";
    const handRolls = sevenOut ? 0 : saved.handRolls + 1;
    // Remember what a seven-out swept away, for a one-tap rebet.
    const lostBets: Bets = {};
    for (const o of r.outcomes) if (o.result === "lose" && !/Odds/.test(o.key) && !/^(come|dontCome)\d+$/.test(o.key)) lostBets[o.key] = o.stake;
    writeJSON(PENDING_KEY, { returned: r.returned, hands });
    persist({
      table: r.table,
      history: [...saved.history, r.dice].slice(-60),
      handRolls,
      lastLost: sevenOut && Object.keys(lostBets).length ? lostBets : r.event === "point-set" ? null : saved.lastLost,
      stats: {
        rolls: saved.stats.rolls + 1,
        net: saved.stats.net + net,
        best: Math.max(saved.stats.best, net),
        pointsMade: saved.stats.pointsMade + (r.event === "point-made" ? 1 : 0),
        longestHand: Math.max(saved.stats.longestHand, saved.handRolls + 1),
      },
    });
    setRoll(r);
    setRollId((id) => id + 1);
    setPhase("rolling");
  };

  const landed = () => {
    if (!roll) return;
    window.localStorage.removeItem(PENDING_KEY);
    const hands = roll.outcomes.some((o) => o.result !== "move") ? 1 : 0;
    if (roll.returned || hands) settle(roll.returned, hands);
    setPhase("result");
    const won = roll.outcomes.reduce((s, o) => s + o.won, 0);
    if (won > 0) burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.6, count: won >= 200 ? 60 : 28 });
  };

  // Results stay on the felt until the next bet or roll.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      throwDice();
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const shownRoll = phase === "result" ? roll : null;
  const outcomeOf = (key: string): Outcome | undefined => shownRoll?.outcomes.find((o) => o.key === key && o.result !== "move");
  const spot = (key: string) => ({
    amount: table.bets[key] ?? 0,
    outcome: outcomeOf(key),
    onClick: () => place(key),
    onRemove: () => remove(key),
    disabled: busy,
  });

  const won = shownRoll ? shownRoll.outcomes.reduce((s, o) => s + o.won, 0) : 0;
  const lost = shownRoll?.lost ?? 0;
  const last = saved.history.at(-1);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2.5 px-3 pt-2.5 pb-3 sm:px-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Craps</h1>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper">
          3-4-5x odds · min {limits.min} · max {limits.max.toLocaleString()} · props max {limits.maxProp}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {profile && profile.league > 0 && (
            <select
              aria-label="Table"
              value={leagueIndex}
              disabled={onFelt > 0}
              onChange={(e) => setTableLeague(Number(e.target.value))}
              className="brut-sm rounded-full bg-paper px-2.5 py-1 text-xs font-bold"
              title={onFelt > 0 ? "Take your bets down to change tables" : undefined}
            >
              {LEAGUES.slice(0, profile.league + 1).map((l, i) => (
                <option key={l.id} value={i}>
                  {l.name} table · min {limitsFor(l).min}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={takeMode}
            onClick={() => setTakeMode((m) => !m)}
            className={`brut-sm press rounded-full px-3 py-1 text-xs font-extrabold ${takeMode ? "bg-gold" : "bg-paper"}`}
            title="Tap a bet to take it down (or right-click it)"
          >
            ✋ Take down {takeMode ? "on" : "off"}
          </button>
          <button type="button" onClick={() => setPanel("rules")} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> Rules &amp; odds</span>
          </button>
          <button type="button" onClick={() => setPanel("stats")} className="brut-sm press rounded-full bg-daily px-3 py-1 text-xs font-extrabold">
            📈<span className="hidden sm:inline"> Stats</span>
          </button>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_250px]">
        {/* Felt */}
        <div
          className="relative overflow-hidden rounded-[36px] border-[3px] border-ink p-3 text-paper sm:p-4"
          style={{
            background: "radial-gradient(ellipse at 40% 20%, #6a3290 0%, #4a1f6a 55%, #2c1240 100%)",
            boxShadow: "inset 0 0 0 6px #22102f, inset 0 0 0 8px #e8b84a66, 0 14px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Toast toast={toast} />
          <div className="grid gap-2 md:grid-cols-[1fr_minmax(0,210px)]">
            <div className="flex min-w-0 flex-col gap-2">
              {/* Don't Come + number boxes */}
              <div className="grid grid-cols-[minmax(0,0.7fr)_repeat(6,minmax(0,1fr))] gap-1.5">
                <Spot {...spot("dontCome")} className="h-full min-h-[6.4rem]" vertical>
                  <span className="font-display text-[11px] leading-tight sm:text-sm">DON’T COME</span>
                  <span className="font-mono text-[9px] font-bold opacity-75">BAR 12</span>
                </Spot>
                {POINTS.map((n) => (
                  <NumberBox
                    key={n}
                    n={n}
                    isPoint={table.point === n}
                    bets={table.bets}
                    outcome={outcomeOf}
                    onPlace={place}
                    onRemove={remove}
                    disabled={busy}
                  />
                ))}
              </div>

              {/* Come */}
              <Spot {...spot("come")} className="h-10">
                <span className="font-display text-2xl tracking-[0.3em]">COME</span>
              </Spot>

              {/* Field */}
              <Spot {...spot("field")} className="h-12">
                <span className="flex flex-col items-center leading-none">
                  <span className="flex items-center gap-2 font-display text-sm sm:text-lg">
                    {FIELD_NUMBERS.map((x) => (
                      <span key={x} className={x === 2 || x === 12 ? "flex size-7 items-center justify-center rounded-full border-2 border-gold text-gold" : ""}>
                        {x}
                      </span>
                    ))}
                  </span>
                  <span className="mt-1 font-mono text-[9px] font-bold opacity-80">FIELD · 2 PAYS DOUBLE · 12 PAYS TRIPLE</span>
                </span>
              </Spot>

              {/* Don't Pass + odds */}
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Spot {...spot("dontPass")} className="h-10">
                  <span className="font-display text-base tracking-widest sm:text-lg">DON’T PASS BAR</span>
                  <span className="ml-2 font-mono text-[10px] font-bold opacity-80">12 pushes</span>
                </Spot>
                <Spot {...spot("dontOdds")} className="h-10 w-24" dashed>
                  <span className="font-mono text-[10px] font-bold">LAY ODDS</span>
                </Spot>
              </div>

              {/* Pass line + odds */}
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <Spot {...spot("pass")} className="h-12" strong>
                  <span className="font-display text-2xl tracking-[0.25em] sm:text-3xl">PASS LINE</span>
                </Spot>
                <Spot {...spot("passOdds")} className="h-12 w-24" dashed>
                  <span className="flex flex-col items-center leading-tight">
                    <span className="font-mono text-[10px] font-bold">TAKE ODDS</span>
                    {table.point && table.bets.pass ? <span className="font-mono text-[9px] opacity-75">up to {ODDS_MULTIPLE[table.point]}×</span> : null}
                  </span>
                </Spot>
              </div>
            </div>

            {/* Proposition box */}
            <div className="flex flex-col gap-1.5 rounded-2xl border-2 p-1.5" style={{ borderColor: `${GOLD}88`, background: "rgba(0,0,0,0.25)" }}>
              <Spot {...spot("any7")} className="h-9" prop>
                <span className="font-display text-sm text-[#ff8a80]">ANY 7</span>
                <Pays>4 to 1</Pays>
              </Spot>
              <div className="grid grid-cols-2 gap-1.5">
                {([6, 10, 8, 4] as Hard[]).map((n) => (
                  <Spot key={n} {...spot(`hard${n}`)} className="h-12" prop>
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex gap-0.5">
                        <Die value={n / 2} size={18} />
                        <Die value={n / 2} size={18} />
                      </span>
                      <Pays>{HARD_PAYS[n]} to 1</Pays>
                    </span>
                  </Spot>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["aces", [1, 1], "30"],
                    ["aceDeuce", [1, 2], "15"],
                    ["yo", [5, 6], "15"],
                    ["boxcars", [6, 6], "30"],
                  ] as const
                ).map(([k, d, p]) => (
                  <Spot key={k} {...spot(k)} className="h-11" prop>
                    <span className="flex flex-col items-center gap-0.5">
                      <span className="flex gap-0.5">
                        <Die value={d[0]} size={16} />
                        <Die value={d[1]} size={16} />
                      </span>
                      <Pays>{p} to 1</Pays>
                    </span>
                  </Spot>
                ))}
              </div>
              <Spot {...spot("anyCraps")} className="h-9" prop>
                <span className="font-display text-sm">ANY CRAPS</span>
                <Pays>7 to 1</Pays>
              </Spot>
            </div>
          </div>

          {/* Dice and the call */}
          <div className="pointer-events-none absolute inset-x-0 top-[36%] z-20 flex flex-col items-center gap-2">
            {roll && (phase === "rolling" || phase === "result") && (
              <ThrownDice key={rollId} dice={roll.dice} rollId={rollId} onLanded={landed} />
            )}
            <AnimatePresence>
              {phase === "result" && roll && (
                <motion.div
                  key={`call-${rollId}`}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                  className="rounded-full border-2 border-ink px-5 py-1 font-display text-lg text-paper"
                  style={{ background: callColour(roll), boxShadow: "0 0 24px rgba(255,214,120,0.55)" }}
                >
                  {callFor(roll)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side: rail */}
        <aside className="flex flex-col gap-2.5">
          <div className="rounded-2xl border-2 p-3" style={{ borderColor: `${GOLD}77`, background: "rgba(0,0,0,0.35)" }}>
            <p className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(243,237,226,0.7)" }}>
              {table.point ? "Point is on" : "Come-out roll"}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span
                className="flex size-12 items-center justify-center rounded-full border-[3px] border-ink font-display text-sm"
                style={{ background: table.point ? "#f3ede2" : "#141414", color: table.point ? "#141414" : "#f3ede2" }}
              >
                {table.point ? "ON" : "OFF"}
              </span>
              <span className="font-display text-3xl text-paper">{table.point ?? "—"}</span>
              {last && (
                <span className="ml-auto flex gap-1">
                  <Die value={last[0]} size={26} />
                  <Die value={last[1]} size={26} />
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] text-ink-soft">
              {table.point
                ? `Pass wins on ${table.point}, loses on 7. Place bets and hardways are working.`
                : "7 or 11 wins the Pass Line, 2, 3 or 12 loses. Place bets and hardways are off."}
            </p>
          </div>

          <div className="rounded-2xl border-2 p-3" style={{ borderColor: `${GOLD}77`, background: "rgba(0,0,0,0.35)" }}>
            <p className="font-mono text-[10px] font-bold tracking-wider text-ink-soft uppercase">Last rolls</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {saved.history.length === 0 && <span className="font-mono text-[11px] text-ink-soft">No rolls yet</span>}
              {saved.history
                .slice(-16)
                .reverse()
                .map((d, i) => {
                  const t = d[0] + d[1];
                  return (
                    <span
                      key={saved.history.length - i}
                      className="flex size-7 items-center justify-center rounded-full border-2 border-ink font-display text-xs"
                      style={{ background: t === 7 ? "#d8342f" : d[0] === d[1] ? GOLD : "#f3ede2", color: t === 7 ? "#f3ede2" : "#141414", opacity: 1 - i * 0.04 }}
                      title={`${d[0]} + ${d[1]}`}
                    >
                      {t}
                    </span>
                  );
                })}
            </div>
            <p className="mt-2 font-mono text-[10px] text-ink-soft">This shooter: {saved.handRolls} roll{saved.handRolls === 1 ? "" : "s"}</p>
          </div>
        </aside>
      </div>

      {/* Read-out */}
      <div className="grid grid-cols-3 gap-2" aria-live="polite">
        <ReadOut label="On the felt" value={`◎ ${onFelt.toLocaleString()}`} colour="#f3ede2" />
        <ReadOut label="Won last roll" value={shownRoll ? `+◎ ${won.toLocaleString()}` : "—"} colour={won ? "#3dd68c" : "#f3ede2"} glow={won > 0} />
        <ReadOut label="Lost last roll" value={shownRoll ? `−◎ ${lost.toLocaleString()}` : "—"} colour={lost ? "#ff5a3c" : "#f3ede2"} />
      </div>

      {/* Chips + actions */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Chip value">
          {chips.map((v) => (
            <motion.button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === chipValue}
              aria-label={`${v} chip`}
              onClick={() => {
                setChip(v);
                setTakeMode(false);
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.88 }}
              animate={{ y: v === chipValue && !takeMode ? -8 : 0, scale: v === chipValue && !takeMode ? 1.12 : 1 }}
              className={`rounded-full ${v === chipValue && !takeMode ? "ring-4 ring-gold ring-offset-2 ring-offset-transparent" : ""}`}
            >
              <ChipFace value={v} size={42} />
            </motion.button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={clearAll} disabled={busy || !onFelt} className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40">
            Take down all
          </button>
          {saved.lastLost && !table.point && (
            <button type="button" onClick={rebet} disabled={busy} className="brut-sm press rounded-full bg-gold px-4 py-2 text-sm font-extrabold disabled:opacity-40">
              ↻ Rebet ◎{totalOf(saved.lastLost).toLocaleString()}
            </button>
          )}
          <button
            type="button"
            data-burst
            onClick={throwDice}
            disabled={busy}
            className="brut press min-w-[9rem] rounded-full bg-casino px-6 py-2.5 font-extrabold disabled:opacity-50"
          >
            {busy ? "Rolling…" : onFelt ? (
              <>
                Roll the dice · <CountUp value={onFelt} duration={0.3} />
              </>
            ) : (
              "Roll the dice"
            )}
          </button>
        </div>
      </div>
      <p className="text-center font-mono text-[10px] text-ink-soft">
        Space to roll · right-click a bet to take it down · bets stay up after they win · Virtual chips only · no real money · 18+
      </p>

      <Drawer open={panel === "rules"} onClose={() => setPanel(null)} title="Rules & odds" width={480}>
        <RulesPanel />
      </Drawer>
      <Drawer open={panel === "stats"} onClose={() => setPanel(null)} title="Your craps stats">
        <dl className="grid grid-cols-2 gap-2 text-center">
          {[
            { label: "Rolls", value: saved.stats.rolls.toLocaleString() },
            { label: "Net", value: `${saved.stats.net >= 0 ? "+" : ""}${saved.stats.net.toLocaleString()}` },
            { label: "Best roll", value: `+${saved.stats.best.toLocaleString()}` },
            { label: "Points made", value: saved.stats.pointsMade.toLocaleString() },
            { label: "Longest hand", value: `${saved.stats.longestHand} rolls` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border-2 border-ink bg-paper-deep py-2">
              <dt className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">{s.label}</dt>
              <dd className="font-display text-lg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          The dice have no memory: a hot or cold table doesn’t change the next roll. The best value on the table is a Pass or
          Don’t Pass bet with full odds behind it; the proposition box in the middle costs the most.
        </p>
      </Drawer>
    </div>
  );
}

function callFor(r: RollResult) {
  const [a, b] = r.dice;
  const t = r.total;
  const hard = a === b && [4, 6, 8, 10].includes(t) ? `Hard ${t}` : null;
  switch (r.event) {
    case "natural":
      return t === 7 ? "7 — front line winner!" : "Yo 11 — winner!";
    case "craps":
      return t === 2 ? "Aces — craps" : t === 3 ? "Ace-deuce — craps" : "Boxcars — craps";
    case "point-set":
      return `${hard ?? t} — the point is ${t}`;
    case "point-made":
      return `${hard ?? t} — winner! Point made`;
    case "seven-out":
      return "7 out — line away";
    default:
      return hard ? `${hard}!` : t === 11 ? "Yo 11" : t === 2 ? "Aces" : t === 12 ? "Boxcars" : t === 3 ? "Ace-deuce" : `${t}${[4, 6, 8, 10].includes(t) ? " the easy way" : ""}`;
  }
}

function callColour(r: RollResult) {
  if (r.event === "seven-out" || r.event === "craps") return "#d8342f";
  if (r.event === "natural" || r.event === "point-made") return "#1f9d55";
  return "#3b1f5c";
}

function Pays({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[9px] font-bold opacity-80">{children}</span>;
}

function ReadOut({ label, value, colour, glow = false }: { label: string; value: string; colour: string; glow?: boolean }) {
  return (
    <motion.div
      key={value}
      initial={{ scale: 0.95, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl border-2 px-3 py-1.5 text-center"
      style={{ borderColor: glow ? colour : "rgba(232,184,74,0.45)", background: glow ? `${colour}22` : "rgba(0,0,0,0.35)", boxShadow: glow ? `0 0 24px ${colour}66` : undefined }}
    >
      <p className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(243,237,226,0.7)" }}>
        {label}
      </p>
      <p className="font-display text-[clamp(1.1rem,2.2vw,1.75rem)] leading-tight" style={{ color: colour }}>
        {value}
      </p>
    </motion.div>
  );
}

/** A betting area on the felt with its chips and win/lose marker. */
function Spot({
  amount,
  outcome,
  onClick,
  onRemove,
  disabled,
  className = "",
  children,
  strong = false,
  dashed = false,
  prop = false,
  vertical = false,
}: {
  amount: number;
  outcome: Outcome | undefined;
  onClick: () => void;
  onRemove: () => void;
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
  strong?: boolean;
  dashed?: boolean;
  prop?: boolean;
  vertical?: boolean;
}) {
  const won = outcome?.result === "win";
  const lost = outcome?.result === "lose";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
      disabled={disabled}
      className={`relative flex items-center justify-center gap-x-2 rounded-xl border-2 px-2 text-paper transition-[filter] hover:brightness-125 disabled:hover:brightness-100 ${vertical ? "flex-col" : ""} ${dashed ? "border-dashed" : ""} ${className}`}
      style={{
        borderColor: strong ? GOLD : `${GOLD}aa`,
        background: prop ? "rgba(0,0,0,0.25)" : strong ? "rgba(232,184,74,0.12)" : "rgba(255,255,255,0.05)",
      }}
      animate={won ? { boxShadow: ["0 0 0 0 #ffd67800", "0 0 26px 8px #ffd678cc", "0 0 12px 3px #ffd67888"] } : { boxShadow: "0 0 0 0 #0000" }}
      transition={{ duration: 0.8 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      {children}
      <BetChip amount={amount} className="absolute top-1/2 right-1.5 -translate-y-1/2" />
      {lost && outcome && <LostMark amount={outcome.stake} />}
      {won && outcome && <WonMark amount={outcome.won} />}
    </motion.button>
  );
}

function BetChip({ amount, className = "", size = 30 }: { amount: number; className?: string; size?: number }) {
  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.span
          className={`pointer-events-none ${className}`}
          initial={{ scale: 1.6, opacity: 0, y: -16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.4, opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          <motion.span key={amount} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="block">
            <ChipFace value={chipFor(amount)} size={size} label={short(amount)} />
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function WonMark({ amount }: { amount: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-ink bg-gold px-2 font-display text-xs whitespace-nowrap text-ink"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      +{amount.toLocaleString()}
    </motion.span>
  );
}

function LostMark({ amount }: { amount: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full border-2 border-ink bg-casino px-2 font-mono text-[10px] font-bold whitespace-nowrap text-ink"
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      −{amount.toLocaleString()}
    </motion.span>
  );
}

/** A number box: Don't Come bets on top, the Place bet in the middle, Come bets and their odds below. */
function NumberBox({
  n,
  isPoint,
  bets,
  outcome,
  onPlace,
  onRemove,
  disabled,
}: {
  n: Point;
  isPoint: boolean;
  bets: Bets;
  outcome: (key: string) => Outcome | undefined;
  onPlace: (key: string) => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  const [a, b] = PLACE_PAYS[n];
  const come = bets[`come${n}`] ?? 0;
  const comeOdds = bets[`comeOdds${n}`] ?? 0;
  const dc = bets[`dontCome${n}`] ?? 0;
  const dcOdds = bets[`dontComeOdds${n}`] ?? 0;
  const mark = (keys: string[]) => {
    const os = keys.map(outcome).filter(Boolean) as Outcome[];
    const w = os.filter((o) => o.result === "win").reduce((s, o) => s + o.won, 0);
    const l = os.filter((o) => o.result === "lose").reduce((s, o) => s + o.stake, 0);
    return w ? <WonMark amount={w} /> : l ? <LostMark amount={l} /> : null;
  };
  const sub = (key: string, oddsKey: string, flat: number, odds: number, label: string, name: string) => (
    <button
      type="button"
      disabled={disabled || !flat}
      onClick={() => onPlace(oddsKey)}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove(odds ? oddsKey : key);
      }}
      title={flat ? `${name} on ${n}: ◎${flat}${odds ? ` + odds ◎${odds}` : ""}. Click to add odds.` : undefined}
      className="relative flex h-6 items-center justify-center gap-0.5 rounded-md border border-dashed text-[9px] font-bold disabled:cursor-default"
      style={{ borderColor: `${GOLD}55`, background: flat ? "rgba(0,0,0,0.25)" : "transparent" }}
    >
      {flat ? (
        <>
          <ChipFace value={chipFor(flat)} size={20} label={short(flat)} />
          {odds > 0 && <ChipFace value={chipFor(odds)} size={20} label={short(odds)} />}
        </>
      ) : (
        <span className="font-mono opacity-40">{label}</span>
      )}
      {mark([key, oddsKey])}
    </button>
  );
  return (
    <div className="relative flex min-w-0 flex-col gap-1 rounded-xl border-2 p-1" style={{ borderColor: isPoint ? "#f3ede2" : `${GOLD}aa`, background: "rgba(255,255,255,0.04)" }}>
      <AnimatePresence>
        {isPoint && (
          <motion.span
            key="puck"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="absolute -top-3 -left-2 z-10 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-[9px] text-ink shadow-[0_0_14px_rgba(255,255,255,0.7)]"
            title={`The point is ${WORD[n].toLowerCase()}`}
          >
            ON
          </motion.span>
        )}
      </AnimatePresence>
      {sub(`dontCome${n}`, `dontComeOdds${n}`, dc, dcOdds, "DC", "Don’t Come bet")}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => onPlace(`place${n}`)}
        onContextMenu={(e) => {
          e.preventDefault();
          onRemove(`place${n}`);
        }}
        className="relative flex h-12 flex-col items-center justify-center rounded-lg transition-[filter] hover:brightness-125"
        style={{ background: "rgba(0,0,0,0.18)" }}
        animate={outcome(`place${n}`)?.result === "win" ? { boxShadow: ["0 0 0 0 #ffd67800", "0 0 22px 6px #ffd678cc", "0 0 10px 2px #ffd67888"] } : { boxShadow: "0 0 0 0 #0000" }}
      >
        <span className="font-display text-xl leading-none sm:text-2xl">{n === 6 ? "SIX" : n === 9 ? "NINE" : n}</span>
        <span className="font-mono text-[8px] font-bold opacity-70">
          {a}:{b}
        </span>
        <BetChip amount={bets[`place${n}`] ?? 0} size={24} className="absolute right-0.5 bottom-0.5" />
        {mark([`place${n}`])}
      </motion.button>
      {sub(`come${n}`, `comeOdds${n}`, come, comeOdds, "COME", "Come bet")}
    </div>
  );
}

function RulesPanel() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Come-out roll:</b> Pass Line wins on 7 or 11, loses on 2, 3 or 12. Any other number becomes the <b>point</b>.
        </li>
        <li>
          <b>Point on:</b> Pass wins if the point rolls again before a 7. A 7 first is a “seven-out” and the dice pass on.
        </li>
        <li>
          <b>Come</b> works the same way, starting on any roll once there’s a point; it moves to the number it lands on.{" "}
          <b>Don’t</b> bets are the reverse, with 12 a push.
        </li>
        <li>
          <b>Odds</b> go behind a line or Come bet once it has a point and pay true odds: 3× on 4/10, 4× on 5/9, 5× on 6/8.
          Click a Come chip on a number to add its odds.
        </li>
        <li>Place bets and hardways are off on the come-out roll. Field and the middle box are one-roll bets.</li>
        <li>Winning bets stay up and you’re paid the winnings. Pass and Come bets can’t come down once they have a point.</li>
      </ul>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="font-mono text-[10px] text-ink-soft uppercase">
            <th className="pb-1">Bet</th>
            <th className="pb-1">Pays</th>
            <th className="pb-1 text-right">House edge</th>
          </tr>
        </thead>
        <tbody>
          {HOUSE_EDGE.map((h) => (
            <tr key={h.bet} className="border-t border-ink/15 align-top" title={h.how}>
              <td className="py-1.5 font-display text-[13px]">{h.bet}</td>
              <td className="py-1.5 font-mono font-bold">{h.pays}</td>
              <td className="py-1.5 text-right font-mono font-bold">{(h.edge * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-soft">
        Winnings are paid in whole chips, rounded down — bet Place 6/8 in multiples of 6 and Place 5/9 or 4/10 in multiples
        of 5 to be paid in full. Standard Las Vegas rules with 3-4-5x odds. Virtual chips only.
      </p>
    </div>
  );
}
