"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { Toast, useToast } from "@/components/games/toast";
import { Drawer } from "@/components/ui/drawer";
import { useHydrated } from "@/lib/use-hydrated";
import { readJSON, writeJSON } from "@/lib/storage";
import { settle, useProfile, withdraw } from "../../bankroll";
import { ChipFace } from "../../components/chip-stack";
import { PlayingCard } from "../../components/playing-card";
import { ResultStrip } from "../../components/result-strip";
import { DENOMINATIONS, LEAGUES } from "../../economy.ts";
import {
  BET_KEYS,
  BET_LABEL,
  COMMISSION,
  PAYS,
  limitsFor,
  maxFor,
  newShoe,
  playCoup,
  settleBets,
  shoeDone,
  totalOf,
  type BetKey,
  type Bets,
  type RoadEntry,
  type Round,
  type Shoe,
} from "../logic.ts";
import { Roads } from "./roads";

const STATE_KEY = "pg:baccarat:v1:table";
const PENDING_KEY = "pg:baccarat:v1:pending";

type Stats = { hands: number; net: number; best: number };
type Saved = { shoe: Shoe; roads: RoadEntry[]; owed: number; stats: Stats; squeeze: boolean };

const BLUE = "#2f5bd8";
const RED = "#d8342f";
const GREEN = "#1f9d55";

const sumBets = (b: Bets) => BET_KEYS.reduce((s, k) => s + (b[k] ?? 0), 0);
const short = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));

type Phase = "betting" | "dealing" | "result";

export function Baccarat() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-3 pt-3 pb-4 sm:px-4">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Baccarat</h1>
        <div className="mt-4 h-[460px] animate-pulse rounded-[40px]" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }
  return <BaccaratTable />;
}

function loadSaved(): Saved {
  const s = readJSON<Partial<Saved>>(STATE_KEY);
  if (s && Array.isArray(s.shoe?.cards) && Array.isArray(s.roads)) {
    return { owed: 0, squeeze: false, stats: { hands: 0, net: 0, best: 0 }, ...s } as Saved;
  }
  return { shoe: newShoe(), roads: [], owed: 0, stats: { hands: 0, net: 0, best: 0 }, squeeze: false };
}

function BaccaratTable() {
  const profile = useProfile();
  const { toast, show } = useToast();

  const [saved, setSaved] = useState<Saved>(loadSaved);
  const persist = (next: Saved) => {
    setSaved(next);
    writeJSON(STATE_KEY, next);
  };

  const [tableLeague, setTableLeague] = useState<number | null>(null);
  const leagueIndex = Math.min(tableLeague ?? profile?.league ?? 0, profile?.league ?? 0);
  const limits = limitsFor(LEAGUES[leagueIndex]);
  const chips: number[] = DENOMINATIONS.filter((v) => v <= limits.maxMain && v >= (leagueIndex > 1 ? 5 : 1)).reverse().slice(0, 6);
  const [chip, setChip] = useState(5);
  const chipValue = chips.includes(chip) ? chip : chips[Math.min(1, chips.length - 1)];

  const [bets, setBets] = useState<Bets>({});
  const [undo, setUndo] = useState<Bets[]>([]);
  const [lastBets, setLastBets] = useState<Bets | null>(null);

  const [phase, setPhase] = useState<Phase>("betting");
  const [round, setRound] = useState<Round | null>(null);
  const [roundId, setRoundId] = useState(0);
  const [dealt, setDealt] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [squeezeSide, setSqueezeSide] = useState<"player" | "banker" | null>(null);
  const [payout, setPayout] = useState<{ paid: number; commission: number; byBet: Bets }>({ paid: 0, commission: 0, byBet: {} });
  const [panel, setPanel] = useState<"rules" | "stats" | null>(null);

  // A coup interrupted by leaving the page still pays out on return.
  useEffect(() => {
    const pending = readJSON<{ paid: number }>(PENDING_KEY);
    if (pending) {
      window.localStorage.removeItem(PENDING_KEY);
      settle(pending.paid, 1);
    }
  }, []);

  const bankroll = profile?.bankroll ?? 0;
  const staked = sumBets(bets);
  const available = bankroll - (phase === "betting" ? staked : 0);

  const place = (key: BetKey) => {
    if (phase !== "betting") return;
    const room = maxFor(key, limits) - (bets[key] ?? 0);
    const add = Math.min(chipValue, room, available);
    if (room <= 0) return show(`Table limit on ${BET_LABEL[key]} is ${maxFor(key, limits).toLocaleString()}`);
    if (add <= 0) return show("Not enough chips in your bankroll");
    setUndo((u) => [...u.slice(-40), bets]);
    setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + add }));
  };

  const undoLast = () => {
    const prev = undo.at(-1);
    if (!prev) return;
    setUndo(undo.slice(0, -1));
    setBets(prev);
  };

  const deal = (withBets: Bets = bets) => {
    if (phase !== "betting") return;
    const total = sumBets(withBets);
    if (total < limits.min) return show(`Minimum ${limits.min} per hand`);
    if (BET_KEYS.some((k) => (withBets[k] ?? 0) > maxFor(k, limits))) return show("Over this table's limits");
    if (!withdraw(total)) return show("Not enough chips in your bankroll");

    let shoe = saved.shoe;
    let roads = saved.roads;
    if (shoeDone(shoe)) {
      shoe = newShoe();
      roads = [];
      show("Cut card reached — fresh shoe, new scoreboard", 2200);
    }
    const { round: r, used } = playCoup(shoe.cards);
    const s = settleBets(withBets, r);
    const owed = saved.owed + s.commission;
    const collect = Math.floor(owed + 1e-9);
    const paid = s.returns - collect;
    const net = paid - total;

    writeJSON(PENDING_KEY, { paid });
    persist({
      ...saved,
      shoe: { ...shoe, cards: shoe.cards.slice(used) },
      roads: [...roads, { outcome: r.outcome, playerPair: r.playerPair, bankerPair: r.bankerPair, total: r.outcome === "player" ? r.playerTotal : r.bankerTotal }],
      owed: owed - collect,
      stats: { hands: saved.stats.hands + 1, net: saved.stats.net + net, best: Math.max(saved.stats.best, net) },
    });

    const p = withBets.player ?? 0;
    const b = withBets.banker ?? 0;
    setSqueezeSide(saved.squeeze && (p || b) ? (b > p ? "banker" : "player") : null);
    setPayout({ paid, commission: collect, byBet: s.byBet });
    setBets(withBets);
    setLastBets(withBets);
    setUndo([]);
    setRound(r);
    setDealt(0);
    setRevealed(r.order.map(() => false));
    setRoundId((id) => id + 1);
    setPhase("dealing");
  };

  const reveal = (i: number) => setRevealed((rv) => rv.map((v, j) => (j === i ? true : v)));
  const revealSide = () => setRevealed((rv) => rv.map((v, j) => (j < dealt ? true : v)));

  const finish = useEffectEvent(() => {
    window.localStorage.removeItem(PENDING_KEY);
    settle(payout.paid, 1);
    setPhase("result");
    if (payout.paid > staked) burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.4, count: payout.paid >= staked * 5 ? 70 : 34 });
  });

  // The deal: four cards, a pause, then any third cards. Squeezed cards wait for you.
  const step = useEffectEvent(() => {
    if (!round) return;
    const i = dealt;
    setDealt(i + 1);
    if (round.order[i].side !== squeezeSide) reveal(i);
  });
  useEffect(() => {
    if (phase !== "dealing" || !round) return;
    const waiting = dealt >= 4 && revealed.slice(0, dealt).some((v) => !v);
    if (waiting) return;
    const n = round.order.length;
    const delay = dealt < 4 ? (dealt === 0 ? 250 : 520) : dealt < n ? 950 : 650;
    const t = window.setTimeout(() => (dealt < n ? step() : finish()), delay);
    return () => window.clearTimeout(t);
  }, [phase, round, dealt, revealed]);

  const autoClear = useEffectEvent(() => {
    setBets({});
    setRound(null);
    setPhase("betting");
  });
  useEffect(() => {
    if (phase !== "result") return;
    const t = window.setTimeout(autoClear, 5000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key === " " || e.key === "Enter") {
      if (phase === "betting" && staked) {
        e.preventDefault();
        deal();
      } else if (phase === "dealing") {
        e.preventDefault();
        revealSide();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") undoLast();
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // What's visible on the felt
  const shown = round ? round.order.slice(0, dealt).map((o, i) => ({ ...o, i, up: revealed[i] })) : [];
  const sideCards = (side: "player" | "banker") => shown.filter((c) => c.side === side);
  const sideTotal = (side: "player" | "banker") => {
    const up = sideCards(side).filter((c) => c.up);
    return up.length ? totalOf(up.map((c) => c.card)) : null;
  };
  const waitingSqueeze = phase === "dealing" && shown.some((c) => !c.up);
  const done = phase === "result" && round;
  const visibleRoads = phase === "dealing" ? saved.roads.slice(0, -1) : saved.roads;
  const shoeLeft = saved.shoe.cards.length / saved.shoe.size;

  const outcomeText = done
    ? round.outcome === "tie"
      ? `Tie ${round.playerTotal}–${round.bankerTotal}`
      : `${round.outcome === "player" ? "Player" : "Banker"} wins ${Math.max(round.playerTotal, round.bankerTotal)}–${Math.min(round.playerTotal, round.bankerTotal)}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2.5 px-3 pt-2.5 pb-3 sm:px-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Baccarat</h1>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper">
          8 decks · min {limits.min} · Player/Banker max {limits.maxMain.toLocaleString()} · side bets max {limits.maxSide}
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
                  {l.name} table · min {limitsFor(l).min}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={saved.squeeze}
            onClick={() => persist({ ...saved, squeeze: !saved.squeeze })}
            className={`brut-sm press rounded-full px-3 py-1 text-xs font-extrabold ${saved.squeeze ? "bg-gold" : "bg-paper"}`}
            title="Deal your side's cards face down and peel them yourself"
          >
            🤏 Squeeze {saved.squeeze ? "on" : "off"}
          </button>
          <button type="button" onClick={() => setPanel("rules")} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> Rules &amp; odds</span>
          </button>
          <button type="button" onClick={() => setPanel("stats")} className="brut-sm press rounded-full bg-daily px-3 py-1 text-xs font-extrabold">
            📈<span className="hidden sm:inline"> Stats</span>
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_290px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          {/* Felt */}
          <div
            className="relative overflow-hidden rounded-t-[140px] rounded-b-[36px] border-[3px] border-ink px-4 pt-5 pb-4 text-paper sm:px-8"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, #1b7a55 0%, #11573c 60%, #0b4430 100%)",
              boxShadow: "inset 0 0 0 6px #0a3523, inset 0 0 0 8px #e8b84a66, 0 14px 30px rgba(0,0,0,0.5)",
            }}
          >
            <Toast toast={toast} />

            {/* Shoe */}
            <div className="absolute top-5 right-[7%] flex flex-col items-center gap-1" title="Cards left in the shoe">
              <div className="relative h-12 w-9 overflow-hidden rounded-md border-2 border-ink" style={{ background: "rgba(0,0,0,0.4)" }}>
                <motion.div
                  className="absolute inset-x-0 bottom-0"
                  style={{ background: "repeating-linear-gradient(0deg, #3b5bff 0 3px, #f3ede2 3px 5px)" }}
                  animate={{ height: `${shoeLeft * 100}%` }}
                />
                <div className="absolute inset-x-0 h-0.5 bg-casino" style={{ bottom: `${(1 - 0.85) * 100}%` }} />
              </div>
              <span className="font-mono text-[9px] font-bold">SHOE</span>
            </div>

            {/* Hands */}
            <div className="grid grid-cols-2 gap-4 sm:gap-10">
              {(["player", "banker"] as const).map((side) => {
                const total = sideTotal(side);
                const won = done && round.outcome === side;
                const tied = done && round.outcome === "tie";
                const colour = side === "player" ? BLUE : RED;
                return (
                  <div key={side} className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full border-2 border-ink px-3 py-0.5 font-display text-sm text-paper"
                        style={{ background: colour }}
                      >
                        {side === "player" ? "Player" : "Banker"}
                      </span>
                      <AnimatePresence mode="popLayout">
                        {total !== null && (
                          <motion.span
                            key={`${roundId}-${total}`}
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="flex size-9 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-lg text-ink"
                            style={won ? { boxShadow: "0 0 18px 4px rgba(255,214,120,0.9)" } : undefined}
                          >
                            {total}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <motion.div
                      className="relative flex min-h-[8.4rem] items-center justify-center gap-2 rounded-2xl px-3 py-2"
                      animate={{
                        boxShadow: won ? `0 0 0 3px #ffd678, 0 0 34px 6px ${colour}cc` : tied ? "0 0 0 3px #1f9d55" : "0 0 0 2px rgba(243,237,226,0.25)",
                        scale: won ? 1.04 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                      {sideCards(side).length === 0 && (
                        <span className="font-mono text-[11px] font-bold" style={{ color: "rgba(243,237,226,0.45)" }}>
                          {phase === "betting" ? "Place your bets" : ""}
                        </span>
                      )}
                      {sideCards(side).map((c, k) => (
                        <motion.button
                          key={c.card.id}
                          type="button"
                          disabled={c.up}
                          onClick={() => reveal(c.i)}
                          aria-label={c.up ? undefined : "Squeeze this card"}
                          className={`rounded-xl ${k === 2 ? "mx-4 rotate-90 sm:mx-6" : ""} ${!c.up ? "cursor-pointer" : "cursor-default"}`}
                          animate={!c.up ? { y: [0, -4, 0] } : { y: 0 }}
                          transition={!c.up ? { duration: 1.2, repeat: Infinity } : undefined}
                          whileHover={!c.up ? { rotate: k === 2 ? 84 : -6, scale: 1.05 } : undefined}
                        >
                          <PlayingCard card={c.card} faceDown={!c.up} size="lg" />
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Outcome banner */}
            <div className="pointer-events-none relative z-10 flex h-9 items-center justify-center">
              <AnimatePresence>
                {waitingSqueeze && (
                  <motion.p
                    key="sq"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="font-display text-sm text-gold"
                  >
                    Tap your cards to squeeze · Space reveals all
                  </motion.p>
                )}
                {outcomeText && (
                  <motion.p
                    key={`o-${roundId}`}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14 }}
                    className="rounded-full border-2 border-ink px-5 py-1 font-display text-lg text-paper"
                    style={{ background: round?.outcome === "player" ? BLUE : round?.outcome === "banker" ? RED : GREEN, boxShadow: "0 0 24px rgba(255,214,120,0.6)" }}
                  >
                    {outcomeText}
                    {round?.natural ? " · natural" : ""}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Betting layout */}
            <div className="mt-1 grid grid-cols-4 gap-2">
              {(["playerPair", "tie", "superSix", "bankerPair"] as const).map((k) => (
                <BetSpot key={k} k={k} amount={bets[k] ?? 0} onPlace={place} disabled={phase !== "betting"} result={done ? payout.byBet[k] : undefined} small />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["player", "banker"] as const).map((k) => (
                <BetSpot key={k} k={k} amount={bets[k] ?? 0} onPlace={place} disabled={phase !== "betting"} result={done ? payout.byBet[k] : undefined} />
              ))}
            </div>
          </div>

          <ResultStrip
            state={phase === "betting" ? "betting" : phase === "dealing" ? "playing" : "done"}
            staked={staked}
            paid={payout.paid}
            available={available}
            roundId={roundId}
            playingLabel={waitingSqueeze ? "Squeeze!" : "Dealing…"}
            note={payout.commission ? `after ◎${payout.commission} commission` : undefined}
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
                  <ChipFace value={v} size={46} />
                </motion.button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={undoLast} disabled={phase !== "betting" || !undo.length} className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40">
                ↶ Undo
              </button>
              <button
                type="button"
                onClick={() => {
                  setUndo((u) => [...u, bets]);
                  setBets({});
                }}
                disabled={phase !== "betting" || !staked}
                className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold disabled:opacity-40"
              >
                Clear
              </button>
              {phase === "dealing" && waitingSqueeze ? (
                <button type="button" onClick={revealSide} className="brut press rounded-full bg-gold px-6 py-2.5 font-extrabold">
                  Reveal
                </button>
              ) : (
                <button
                  type="button"
                  data-burst
                  onClick={() => (staked ? deal() : lastBets && sumBets(lastBets) <= bankroll && deal(lastBets))}
                  disabled={phase !== "betting" || (!staked && !lastBets)}
                  className="brut press min-w-[9rem] rounded-full bg-casino px-6 py-2.5 font-extrabold disabled:opacity-50"
                >
                  {phase === "dealing" ? "Dealing…" : phase === "result" ? "Next hand soon…" : staked ? (
                    <>Deal · <CountUp value={staked} duration={0.3} /></>
                  ) : lastBets ? (
                    `Rebet & deal ${sumBets(lastBets)}`
                  ) : (
                    "Place a bet"
                  )}
                </button>
              )}
            </div>
          </div>
          <p className="text-center font-mono text-[10px] text-ink-soft">Space to deal · Ctrl+Z to undo · Virtual chips only · no real money · 18+</p>
        </div>

        {/* Scoreboard */}
        <aside className="rounded-2xl border-2 p-3" style={{ borderColor: "rgba(232,184,74,0.45)", background: "rgba(0,0,0,0.35)" }} aria-label="Scoreboard">
          <p className="mb-2 font-display text-sm text-gold">Scoreboard · this shoe</p>
          <Roads entries={visibleRoads} />
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-soft">
            Commission box: ◎{saved.owed.toFixed(2)} owed. Banker wins pay 0.95 to 1 — the 5% is tracked here and taken in whole chips.
          </p>
        </aside>
      </div>

      <Drawer open={panel === "rules"} onClose={() => setPanel(null)} title="Rules & odds" width={460}>
        <RulesPanel />
      </Drawer>
      <Drawer open={panel === "stats"} onClose={() => setPanel(null)} title="Your baccarat stats">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Hands", value: saved.stats.hands.toLocaleString() },
            { label: "Net", value: `${saved.stats.net >= 0 ? "+" : ""}${saved.stats.net.toLocaleString()}` },
            { label: "Best hand", value: `+${saved.stats.best.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border-2 border-ink bg-paper-deep py-2">
              <dt className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">{s.label}</dt>
              <dd className="font-display text-lg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm leading-relaxed text-ink-soft">
          Patterns on the scoreboard don’t predict the next hand — every coup is dealt from a shuffled shoe. Banker is the
          best bet on the table (1.06% house edge), Player next (1.24%); Tie and the side bets cost far more.
        </p>
      </Drawer>
    </div>
  );
}

function BetSpot({
  k,
  amount,
  onPlace,
  disabled,
  result,
  small = false,
}: {
  k: BetKey;
  amount: number;
  onPlace: (k: BetKey) => void;
  disabled: boolean;
  result: number | undefined;
  small?: boolean;
}) {
  const colour = k === "player" || k === "playerPair" ? BLUE : k === "banker" || k === "bankerPair" ? RED : k === "tie" ? GREEN : "#b8860b";
  const pays = k === "banker" ? "0.95 to 1" : `${PAYS[k]} to 1`;
  const won = result !== undefined && result > amount;
  const pushed = result !== undefined && result === amount && amount > 0;
  const lost = result !== undefined && result === 0;
  return (
    <motion.button
      type="button"
      onClick={() => onPlace(k)}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 text-paper transition-[filter] hover:brightness-125 disabled:hover:brightness-100 ${small ? "h-14" : "h-[4.6rem]"}`}
      style={{ borderColor: `${colour}`, background: `${colour}${small ? "33" : "55"}` }}
      animate={won ? { boxShadow: ["0 0 0 0 #ffd67800", "0 0 26px 8px #ffd678cc", "0 0 12px 3px #ffd67888"] } : { boxShadow: "0 0 0 0 #0000" }}
      transition={{ duration: 0.8 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
    >
      <span className={`font-display leading-none ${small ? "text-xs sm:text-sm" : "text-xl sm:text-2xl"}`}>{BET_LABEL[k]}</span>
      <span className="mt-0.5 font-mono text-[10px] font-bold opacity-80">{pays}</span>
      <AnimatePresence>
        {amount > 0 && (
          <motion.span
            key={`${k}-chip`}
            className={`absolute ${small ? "-top-2 right-1" : "top-1/2 right-4 -translate-y-1/2"}`}
            initial={{ scale: 1.6, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: lost ? 0.25 : 1, y: 0 }}
            exit={{ scale: 0.4, opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <motion.span key={amount} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="block">
              <ChipFace value={DENOMINATIONS.find((d) => d <= amount) ?? 1} size={small ? 28 : 36} label={short(amount)} />
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
      {won && (
        <motion.span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-gold px-2 font-display text-xs text-ink"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          +{(result - amount).toLocaleString()}
        </motion.span>
      )}
      {pushed && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-paper px-2 font-mono text-[10px] font-bold text-ink">
          push
        </span>
      )}
    </motion.button>
  );
}

const BETS: { k: BetKey; pays: string; how: string }[] = [
  { k: "player", pays: "1 to 1", how: "Player’s hand wins" },
  { k: "banker", pays: "0.95 to 1", how: "Banker’s hand wins (5% commission)" },
  { k: "tie", pays: "8 to 1", how: "Both hands end level" },
  { k: "playerPair", pays: "11 to 1", how: "Player’s first two cards same rank" },
  { k: "bankerPair", pays: "11 to 1", how: "Banker’s first two cards same rank" },
  { k: "superSix", pays: "15 to 1", how: "Banker wins with 6" },
];

function RulesPanel() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <ul className="list-disc space-y-1 pl-5">
        <li>Bet on which hand ends closer to 9: Player or Banker.</li>
        <li>A = 1, 2–9 face value, 10 and pictures = 0. Only the last digit counts (7 + 8 = 5).</li>
        <li>Each hand gets two cards; a third is drawn automatically by the house rules. 8 or 9 on two cards is a natural.</li>
        <li>On a tie, Player and Banker bets are returned.</li>
      </ul>
      <table className="w-full text-left text-xs">
        <tbody>
          {BETS.map((b) => (
            <tr key={b.k} className="border-t border-ink/15">
              <td className="py-1.5 font-display text-[13px]">{BET_LABEL[b.k]}</td>
              <td className="py-1.5 font-mono font-bold whitespace-nowrap">{b.pays}</td>
              <td className="py-1.5 text-ink-soft">{b.how}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-soft">
        RWS Commission Baccarat with Super Six rules, 8 decks. Commission is {COMMISSION * 100}% of a winning Banker bet.
        Virtual chips only.
      </p>
    </div>
  );
}
