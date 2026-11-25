"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { Toast, useToast } from "@/components/games/toast";
import { Drawer } from "@/components/ui/drawer";
import { useHydrated } from "@/lib/use-hydrated";
import { readJSON, writeJSON } from "@/lib/storage";
import { settle, useProfile, withdraw } from "../../bankroll";
import { ChipFace } from "../../components/chip-stack";
import { ResultStrip } from "../../components/result-strip";
import { DENOMINATIONS, LEAGUES } from "../../economy.ts";
import {
  HOUSE_EDGE,
  colourOf,
  isOutside,
  labelOf,
  limitsFor,
  numbersFor,
  payoutOf,
  pocketAngle,
  returnsFor,
  roomOn,
  spinWheel,
  totalOf,
  type Bets,
} from "../logic.ts";
import { Board } from "./board";
import { Wheel } from "./wheel";

const STATS_KEY = "pg:roulette:v1:stats";
const PENDING_KEY = "pg:roulette:v1:pending";

type Stats = { spins: number; net: number; biggestWin: number; history: number[] };
const NEW_STATS: Stats = { spins: 0, net: 0, biggestWin: 0, history: [] };

const SWATCH = { red: "#c4182b", black: "#161616", green: "#0e8a4f" } as const;

type Phase = "betting" | "spinning" | "result";

export function Roulette() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 pt-3 pb-4 sm:px-4">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Roulette</h1>
        <div className="mt-4 h-[420px] animate-pulse rounded-[40px]" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }
  return <RouletteTable />;
}

function RouletteTable() {
  const profile = useProfile();
  const { toast, show } = useToast();

  const [tableLeague, setTableLeague] = useState<number | null>(null);
  const leagueIndex = Math.min(tableLeague ?? profile?.league ?? 0, profile?.league ?? 0);
  const limits = limitsFor(LEAGUES[leagueIndex]);
  const chips: number[] = DENOMINATIONS.filter((v) => v <= limits.maxOutside && v >= (leagueIndex > 1 ? 5 : 1)).reverse().slice(0, 6);

  const [chip, setChip] = useState<number>(5);
  const chipValue = chips.includes(chip) ? chip : chips[Math.min(1, chips.length - 1)];

  const [bets, setBets] = useState<Bets>({});
  const [undo, setUndo] = useState<Bets[]>([]);
  const [lastBets, setLastBets] = useState<Bets | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("betting");
  const [result, setResult] = useState<number | null>(null);
  const [win, setWin] = useState(0);
  const [spinId, setSpinId] = useState(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [pending, setPending] = useState<{ result: number; returns: number; staked: number } | null>(null);

  const [stats, setStats] = useState<Stats>(() => ({ ...NEW_STATS, ...readJSON<Stats>(STATS_KEY) }));
  const [panel, setPanel] = useState<"rules" | "stats" | null>(null);

  // A spin interrupted by leaving the page still pays out on return.
  useEffect(() => {
    const saved = readJSON<{ returns: number }>(PENDING_KEY);
    if (saved) {
      window.localStorage.removeItem(PENDING_KEY);
      settle(saved.returns, 1);
    }
  }, []);

  const bankroll = profile?.bankroll ?? 0;
  const staked = totalOf(bets);
  const available = bankroll - (phase === "betting" ? staked : 0);

  const place = (key: string, amount = chipValue) => {
    if (phase !== "betting") return;
    const room = roomOn(bets, key, limits);
    const add = Math.min(amount, room, available);
    if (room <= 0) return show(`Table limit on this bet is ${isOutside(key) ? limits.maxOutside : limits.maxInside}`);
    if (add <= 0) return show("Not enough chips in your bankroll");
    setUndo((u) => [...u.slice(-40), bets]);
    setBets({ ...bets, [key]: (bets[key] ?? 0) + add });
  };

  const clearBets = () => {
    if (!staked) return;
    setUndo((u) => [...u, bets]);
    setBets({});
  };

  const undoLast = () => {
    const prev = undo.at(-1);
    if (!prev) return;
    setUndo(undo.slice(0, -1));
    setBets(prev);
  };

  const applyBets = (next: Bets) => {
    const room = Object.entries(next).every(([k, v]) => v <= (isOutside(k) ? limits.maxOutside : limits.maxInside));
    if (!room) return show("Over this table's limits");
    if (totalOf(next) > bankroll) return show("Not enough chips for that");
    setUndo((u) => [...u, bets]);
    setBets(next);
    return true;
  };

  const doubleBets = () => applyBets(Object.fromEntries(Object.entries(bets).map(([k, v]) => [k, v * 2])));

  const spin = (withBets = bets) => {
    if (phase !== "betting") return;
    const total = totalOf(withBets);
    if (total < limits.minSpin) return show(`Minimum ${limits.minSpin} per spin`);
    if (!withdraw(total)) return show("Not enough chips in your bankroll");

    const n = spinWheel();
    const returns = returnsFor(withBets, n);
    writeJSON(PENDING_KEY, { returns });

    const nextWheel = wheelAngle - 360 * 3 - Math.floor(Math.random() * 360);
    const target = (((pocketAngle(n) + nextWheel - ballAngle) % 360) + 360) % 360;
    setWheelAngle(nextWheel);
    setBallAngle(ballAngle + 360 * 6 + target);
    setPending({ result: n, returns, staked: total });
    setBets(withBets);
    setLastBets(withBets);
    setUndo([]);
    setHover(null);
    setResult(null);
    setPhase("spinning");
    setSpinId((id) => id + 1);
  };

  const landed = () => {
    if (!pending) return;
    window.localStorage.removeItem(PENDING_KEY);
    settle(pending.returns, 1);
    const net = pending.returns - pending.staked;
    const nextStats: Stats = {
      spins: stats.spins + 1,
      net: stats.net + net,
      biggestWin: Math.max(stats.biggestWin, net),
      history: [pending.result, ...stats.history].slice(0, 100),
    };
    setStats(nextStats);
    writeJSON(STATS_KEY, nextStats);
    setResult(pending.result);
    setWin(pending.returns);
    setPhase("result");
    if (pending.returns > 0) burst({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: pending.returns >= pending.staked * 5 ? 60 : 30 });
    setPending(null);
  };

  const newRound = () => {
    setBets({});
    setResult(null);
    setPhase("betting");
  };

  // After a result, clear the felt so the next round can start.
  const autoClear = useEffectEvent(() => newRound());
  useEffect(() => {
    if (phase !== "result") return;
    const t = window.setTimeout(autoClear, 4500);
    return () => window.clearTimeout(t);
  }, [phase]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key === " " && phase === "betting" && staked) {
      e.preventDefault();
      spin();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") undoLast();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const info = hover ?? null;

  // The wheel fills its box, which CSS sizes to the viewport.
  const wheelBox = useRef<HTMLDivElement>(null);
  const [wheelSize, setWheelSize] = useState(0);
  useLayoutEffect(() => {
    const el = wheelBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWheelSize(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const recent = stats.history.slice(0, 18);
  const last40 = stats.history.slice(0, 40);
  const share = (c: "red" | "black" | "green") =>
    last40.length ? Math.round((last40.filter((n) => colourOf(n) === c).length / last40.length) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2.5 px-3 pt-2.5 pb-3 sm:px-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Roulette</h1>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper">
          Single zero · min {limits.minSpin} · inside max {limits.maxInside} · outside max {limits.maxOutside.toLocaleString()}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {profile && profile.league > 0 && (
            <select
              aria-label="Table"
              value={leagueIndex}
              disabled={phase !== "betting" || staked > 0}
              onChange={(e) => setTableLeague(Number(e.target.value))}
              className="brut-sm rounded-full bg-paper px-2.5 py-1 text-xs font-bold"
            >
              {LEAGUES.slice(0, profile.league + 1).map((l, i) => (
                <option key={l.id} value={i}>
                  {l.name} table · min {limitsFor(l).minSpin}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setPanel("rules")} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> Rules &amp; odds</span>
          </button>
          <button type="button" onClick={() => setPanel("stats")} className="brut-sm press rounded-full bg-daily px-3 py-1 text-xs font-extrabold">
            📈<span className="hidden sm:inline"> Stats</span>
          </button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[auto_1fr]">
        {/* Wheel + recent numbers */}
        <div className="relative flex flex-col items-center gap-2">
          <Toast toast={toast} />
          <div
            ref={wheelBox}
            className="relative aspect-square"
            style={{ width: "min(92vw, 480px, calc(100dvh - 262px))", minWidth: 260 }}
          >
            {wheelSize > 0 && (
              <Wheel
                size={wheelSize}
                wheelAngle={wheelAngle}
                ballAngle={ballAngle}
                spinId={spinId}
                spinning={phase === "spinning"}
                result={phase === "result" ? result : null}
                onLanded={landed}
              />
            )}
            <AnimatePresence>
              {phase === "result" && result !== null && (
                <motion.div
                  key={`r-${spinId}`}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
                >
                  <div
                    className="flex size-[30%] flex-col items-center justify-center rounded-full border-4 border-gold text-paper"
                    style={{ background: SWATCH[colourOf(result)], boxShadow: "0 0 40px 8px rgba(255,214,120,0.75)" }}
                  >
                    <span className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-none">{result}</span>
                    <span className="font-mono text-[11px] font-bold uppercase">{colourOf(result)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent numbers */}
          <div className="flex w-full items-center gap-2" aria-label="Recent numbers">
            <p className="shrink-0 font-mono text-[10px] font-bold tracking-wider text-ink-soft uppercase">Last</p>
            <div className="flex min-h-8 flex-1 items-center gap-1 overflow-hidden">
              {recent.length === 0 && <span className="font-mono text-[11px] text-ink-soft">No spins yet</span>}
              <AnimatePresence initial={false}>
                {recent.map((n, i) => (
                  <motion.span
                    key={stats.spins - i}
                    layout
                    initial={{ scale: 0, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    className={`flex shrink-0 items-center justify-center rounded-md border border-paper/40 font-display text-paper ${i === 0 ? "size-8 text-sm ring-2 ring-gold" : "size-6 text-[10px]"}`}
                    style={{ background: SWATCH[colourOf(n)] }}
                  >
                    {n}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Board + controls */}
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="overflow-x-auto pb-1">
            <div
              className="relative mx-auto min-w-[620px] rounded-2xl p-3"
              style={{
                maxWidth: "calc((100dvh - 372px) * 2.15)",
                background: "radial-gradient(ellipse at 50% 30%, #1d8a59, #0e5636)",
                boxShadow: "inset 0 0 0 3px #0a3f27, 0 10px 30px rgba(0,0,0,0.45)",
              }}
            >
              <Board
                bets={bets}
                hover={phase === "betting" ? hover : null}
                onHover={setHover}
                onPlace={place}
                result={phase === "result" ? result : null}
                disabled={phase !== "betting"}
              />
              <AnimatePresence>
                {phase === "spinning" && (
                  <motion.div
                    key={`nmb-${spinId}`}
                    className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ background: "rgba(10,20,14,0.35)" }}
                  >
                    <motion.span
                      className="font-display text-[clamp(1.6rem,4vw,3.2rem)] whitespace-nowrap text-gold"
                      style={{ textShadow: "0 0 18px rgba(232,184,74,0.8), 0 3px 0 #141414" }}
                      initial={{ x: "-120%", skewX: -12 }}
                      animate={{ x: ["-120%", "0%", "0%", "130%"], skewX: [-12, 0, 0, 12] }}
                      transition={{ duration: 2.2, times: [0, 0.25, 0.75, 1], ease: "easeInOut" }}
                    >
                      No more bets
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* What the hovered spot covers */}
          <p className="min-h-4 text-center font-mono text-[11px] font-bold" aria-live="polite">
            {phase === "betting" && info ? (
              <>
                <span className="text-gold">{labelOf(info)}</span> · pays {payoutOf(info)} to 1 · wins{" "}
                {((numbersFor(info).length / 37) * 100).toFixed(1)}% of spins
                {bets[info] ? ` · on it: ${bets[info]}` : ""}
              </>
            ) : phase === "betting" ? (
              <span className="text-ink-soft">Tap a number, a line between numbers, or an outside box. Hover to see what a spot covers.</span>
            ) : null}
          </p>

          <ResultStrip
            state={phase === "betting" ? "betting" : phase === "spinning" || result === null ? "playing" : "done"}
            staked={staked}
            paid={win}
            available={available}
            roundId={spinId}
            playingLabel="Spinning…"
          />

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
                  onClick={() => setChip(v)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.88 }}
                  animate={{ y: v === chipValue ? -8 : 0, scale: v === chipValue ? 1.12 : 1 }}
                  className={`rounded-full ${v === chipValue ? "ring-4 ring-gold ring-offset-2 ring-offset-transparent" : ""}`}
                >
                  <ChipFace value={v} size={48} />
                </motion.button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={undoLast}
                disabled={phase !== "betting" || !undo.length}
                className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                onClick={clearBets}
                disabled={phase !== "betting" || !staked}
                className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40"
              >
                Clear
              </button>
              {staked > 0 ? (
                <button
                  type="button"
                  onClick={doubleBets}
                  disabled={phase !== "betting"}
                  className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40"
                >
                  ×2
                </button>
              ) : (
                lastBets && (
                  <button
                    type="button"
                    onClick={() => applyBets(lastBets)}
                    disabled={phase !== "betting"}
                    className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40"
                  >
                    Rebet {totalOf(lastBets)}
                  </button>
                )
              )}
              {phase === "result" ? (
                <button type="button" onClick={newRound} className="brut press rounded-full bg-gold px-6 py-2.5 font-extrabold">
                  New bets
                </button>
              ) : (
                <button
                  type="button"
                  data-burst
                  onClick={() => (staked ? spin() : lastBets && totalOf(lastBets) <= bankroll && spin(lastBets))}
                  disabled={phase !== "betting" || (!staked && !lastBets)}
                  className="brut press min-w-[9rem] rounded-full bg-casino px-6 py-2.5 font-extrabold disabled:opacity-50"
                >
                  {phase === "spinning" ? "Spinning…" : staked ? (
                    <>Spin · <CountUp value={staked} duration={0.3} /></>
                  ) : lastBets ? (
                    `Rebet & spin ${totalOf(lastBets)}`
                  ) : (
                    "Place a bet"
                  )}
                </button>
              )}
            </div>
          </div>
          <p className="text-center font-mono text-[10px] text-ink-soft">
            Space to spin · Ctrl+Z to undo · Virtual chips only · no real money · 18+
          </p>
        </div>
      </div>

      <Drawer open={panel === "rules"} onClose={() => setPanel(null)} title="Rules & odds" width={460}>
        <RulesPanel />
      </Drawer>
      <Drawer open={panel === "stats"} onClose={() => setPanel(null)} title="Your roulette stats">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Spins", value: stats.spins.toLocaleString() },
            { label: "Net", value: `${stats.net >= 0 ? "+" : ""}${stats.net.toLocaleString()}` },
            { label: "Best win", value: `+${stats.biggestWin.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border-2 border-ink bg-paper-deep py-2">
              <dt className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">{s.label}</dt>
              <dd className="font-display text-lg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 font-mono text-xs font-bold">Last {last40.length} spins</p>
        <div className="mt-2 flex h-5 overflow-hidden rounded-full border-2 border-ink">
          {(["red", "black", "green"] as const).map((c) => (
            <span key={c} style={{ width: `${share(c)}%`, background: SWATCH[c] }} title={`${c} ${share(c)}%`} />
          ))}
        </div>
        <p className="mt-1 flex justify-between font-mono text-[11px]">
          <span>Red {share("red")}%</span>
          <span>Black {share("black")}%</span>
          <span>Zero {share("green")}%</span>
        </p>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          Every spin is independent: past numbers don’t change the next one. Over time every bet loses{" "}
          {(HOUSE_EDGE * 100).toFixed(2)}% of what you stake — streaks are just luck.
        </p>
      </Drawer>
    </div>
  );
}

const PAYOUTS: { key: string; name: string; how: string }[] = [
  { key: "17", name: "Straight", how: "One number, including 0." },
  { key: "17-20", name: "Split", how: "Two neighbouring numbers — put the chip on the line between them." },
  { key: "1-2-3", name: "Street", how: "A row of three — chip on the outer edge of the row." },
  { key: "1-2-4-5", name: "Corner", how: "Four numbers meeting at a corner." },
  { key: "0-1-2-3", name: "First four", how: "0, 1, 2 and 3 — chip on the corner where 0 meets 1." },
  { key: "1-2-3-4-5-6", name: "Six line", how: "Two rows of three — chip on the outer corner between them." },
  { key: "dozen1", name: "Dozen", how: "1–12, 13–24 or 25–36." },
  { key: "column1", name: "Column", how: "Twelve numbers in a line, using the 2 to 1 boxes." },
  { key: "red", name: "Even money", how: "Red/Black, Odd/Even, 1–18/19–36." },
];

function RulesPanel() {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      <section>
        <h3 className="font-display text-sm">How it works</h3>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>European wheel: numbers 1–36 plus a single green 0.</li>
          <li>Place chips, then spin. Once the ball is spinning, no more bets.</li>
          <li>Winning bets are paid at the odds below and you keep the stake. Everything else is lost.</li>
          <li>When 0 comes up, every outside bet loses — that single pocket is the house’s {(HOUSE_EDGE * 100).toFixed(2)}% edge.</li>
          <li>Each spot has a table limit; the minimum is per spin, across all your bets.</li>
        </ul>
      </section>
      <section>
        <h3 className="font-display text-sm">Bets and payouts</h3>
        <ul className="mt-2 space-y-2">
          {PAYOUTS.map((p) => (
            <li key={p.key} className="rounded-xl border-2 border-ink bg-paper-deep px-3 py-2">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-display text-sm">{p.name}</span>
                <span className="font-mono text-xs font-bold">
                  pays {payoutOf(p.key)} to 1 · hits {((numbersFor(p.key).length / 37) * 100).toFixed(1)}%
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{p.how}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">
          Straight bets pay the most and hit the least. Every bet has the same house edge, so no bet is “better” — only
          riskier or safer.
        </p>
      </section>
    </div>
  );
}
