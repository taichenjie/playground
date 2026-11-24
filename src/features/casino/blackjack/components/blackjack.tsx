"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GameHeader } from "@/components/games/game-header";
import { Toast, useToast } from "@/components/games/toast";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { InfoTip } from "@/components/ui/info-tip";
import { Modal } from "@/components/ui/modal";
import { readJSON, writeJSON } from "@/lib/storage";
import { useHydrated } from "@/lib/use-hydrated";
import { settle as settleBankroll, useProfile, withdraw } from "../../bankroll";
import { CasinoHud, LeagueBadge } from "../../components/casino-hud";
import { ChipFace, ChipStack } from "../../components/chip-stack";
import { PlayingCard } from "../../components/playing-card";
import { DENOMINATIONS, LEAGUES } from "../../economy.ts";
import {
  NO_SIDE,
  allowedActions,
  cardValue,
  dealerStep,
  deal,
  decideInsurance,
  double,
  idleGame,
  hit,
  isBlackjack,
  split,
  stand,
  surrender,
  totalOf,
  totalStaked,
  values,
  type GameState,
  type Outcome,
  type SideBets,
} from "../logic.ts";
import { RWS } from "../rules.ts";
import {
  EMPTY_SKILL,
  MILESTONES,
  accuracy,
  finishShoe,
  rating,
  recordDecision,
  recordHand,
  type Skill,
  type Tally,
} from "../skill.ts";
import { bestAction, chartRowFor, insuranceEV, type Action } from "../strategy.ts";
import { ChartDrawer, type ChartFocus } from "./chart-drawer";
import { RulesDrawer } from "./rules-drawer";

const rules = RWS;
const SKILL_KEY = "pg:blackjack:v2:skill";
const PREFS_KEY = "pg:blackjack:v2:prefs";

type Spot = keyof SideBets | "main";
type Coach = "off" | "feedback" | "hints";
type Draft = { main: number } & SideBets;
const EMPTY_DRAFT: Draft = { main: 0, ...NO_SIDE };

const ACTION_LABEL: Record<Action, string> = { hit: "Hit", stand: "Stand", double: "Double", split: "Split", surrender: "Surrender" };
const ACTION_KEY: Record<Action, string> = { hit: "H", stand: "S", double: "D", split: "P", surrender: "R" };
const ACTION_STYLE: Record<Action, string> = {
  hit: "bg-daily",
  stand: "bg-casino",
  double: "bg-pop text-paper",
  split: "bg-music",
  surrender: "bg-paper",
};
const OUTCOME_LABEL: Record<Outcome, string> = {
  blackjack: "Blackjack!",
  win: "Win",
  push: "Stand off",
  lose: "Lose",
  bust: "Bust",
  surrender: "Surrendered",
  evenMoney: "Even money",
};
const OUTCOME_STYLE: Record<Outcome, string> = {
  blackjack: "bg-daily",
  win: "bg-sports",
  push: "bg-paper",
  lose: "bg-casino",
  bust: "bg-casino",
  surrender: "bg-paper",
  evenMoney: "bg-sports",
};
const SPOT_LABEL: Record<keyof SideBets, string> = { pair: "Pair 11:1", under13: "Under 13", over13: "Over 13" };
const SPOT_INFO: Record<Spot, { title: string; text: string }> = {
  main: {
    title: "Main bet",
    text: "Your blackjack hand. Beat the dealer without going over 21. Wins pay 1:1, blackjack pays 3:2.",
  },
  pair: {
    title: "Player Pair · pays 11:1",
    text: "Wins if your first two cards are the same rank (e.g. 7 & 7, or K & K). Settled straight after the deal and doesn’t affect your hand. Up to your main bet.",
  },
  under13: {
    title: "Under 13 · pays 1:1",
    text: "Wins if your first two cards add up to less than 13. Aces count as 1, so a blackjack counts as under. Exactly 13 loses. Up to your main bet.",
  },
  over13: {
    title: "Over 13 · pays 1:1",
    text: "Wins if your first two cards add up to more than 13. Aces count as 1. Exactly 13 loses. Up to your main bet.",
  },
};
const INSURANCE_INFO =
  "When the dealer shows an Ace you can bet up to half your stake that the dealer makes blackjack. It pays 2:1. Over time it loses money — the best play is to decline.";
const EVEN_MONEY_INFO =
  "You have blackjack and the dealer shows an Ace. Even money pays you 1:1 now instead of risking a stand-off if the dealer also has blackjack. It’s insurance in disguise — the best play is to decline and wait for 3:2.";

const describe = (cards: { total: number; soft: boolean }) =>
  cards.soft && cards.total < 21 ? `${cards.total - 10}/${cards.total}` : String(cards.total);

export function Blackjack() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-2.5 px-3 pt-3 pb-4 sm:px-4">
        <GameHeader title="Blackjack" backHref="/casino" backLabel="Casino" />
        <div className="h-[520px] animate-pulse rounded-t-[200px] rounded-b-[40px] bg-paper-deep" />
      </div>
    );
  }
  return <BlackjackTable />;
}

function BlackjackTable() {
  const profile = useProfile();
  const [game, setGame] = useState<GameState>(() => idleGame(rules));
  const gameRef = useRef(game);
  const [tableLeague, setTableLeague] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [lastDraft, setLastDraft] = useState<Draft | null>(null);
  const [spot, setSpot] = useState<Spot>("main");
  const [coach, setCoach] = useState<Coach>(() => readJSON<{ coach: Coach }>(PREFS_KEY)?.coach ?? "feedback");
  const [skill, setSkill] = useState<Skill>(() => ({ ...EMPTY_SKILL, ...readJSON<Skill>(SKILL_KEY) }));
  const [chartOpen, setChartOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dialog, setDialog] = useState<"stats" | null>(null);
  const [report, setReport] = useState<Tally | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast, show } = useToast();

  const leagueIndex = Math.min(tableLeague ?? profile?.league ?? 0, profile?.league ?? 0);
  const league = LEAGUES[leagueIndex];
  const limits = league.blackjack;
  const bankroll = profile?.bankroll ?? 0;
  const draftTotal = draft.main + draft.pair + draft.under13 + draft.over13;

  const skillRef = useRef(skill);
  const saveSkill = (next: Skill) => {
    skillRef.current = next;
    setSkill(next);
    writeJSON(SKILL_KEY, next);
  };

  /* ---------- state changes ---------- */

  const onSettled = (s: GameState) => {
    const staked = totalStaked(s);
    const net = s.returned - staked;
    settleBankroll(s.returned, 1);
    let next = recordHand(skillRef.current, net);
    if (s.reshuffleDue) {
      const done = finishShoe(next);
      next = done.skill;
      window.setTimeout(() => setReport(done.report), 1400);
    }
    saveSkill(next);
    const r = tableRef.current?.getBoundingClientRect();
    if (r && s.hands.some((h) => h.outcome === "blackjack")) burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.65, count: 34 });
    else if (r && net > 0) burst({ x: r.left + r.width / 2, y: r.top + r.height * 0.65, count: 12 });
  };

  const commit = (next: GameState) => {
    const prev = gameRef.current;
    gameRef.current = next;
    setGame(next);
    if (next.phase === "settled" && prev.phase !== "settled") onSettled(next);
  };

  const commitFromTimer = useEffectEvent(() => commit(dealerStep(gameRef.current, rules)));
  useEffect(() => {
    if (game.phase !== "dealer") return;
    const id = window.setTimeout(() => commitFromTimer(), 700);
    return () => window.clearTimeout(id);
  }, [game]);

  /* ---------- skill / coach ---------- */

  const hand = game.hands[game.active];
  const allowed = allowedActions(game, rules);
  const canAffordExtra = hand ? bankroll >= hand.bet : false;
  const situation =
    game.phase === "player" && hand
      ? {
          cards: values(hand.cards),
          dealerUp: cardValue(game.dealer[0]),
          canDouble: allowed.double && canAffordExtra,
          canSplit: allowed.split && canAffordExtra,
          canSurrender: allowed.surrender,
        }
      : null;
  const advice = situation ? bestAction(situation, rules) : null;

  const grade = (chosen: Action) => {
    if (!advice || !hand) return;
    const bestEV = advice.values[advice.action] ?? 0;
    const chosenEV = advice.values[chosen] ?? bestEV;
    const correct = chosen === advice.action || chosenEV >= bestEV - 1e-9;
    const lost = Math.max(0, (bestEV - chosenEV) * game.initialBet);
    const next = recordDecision(skillRef.current, correct, lost);
    saveSkill(next);
    if (!correct && coach !== "off") {
      show(`Book play: ${ACTION_LABEL[advice.action]} — that cost ~${lost.toFixed(1)} chips on average`, 2600);
    }
    if (correct && MILESTONES.includes(next.streak)) {
      show(`🔥 ${next.streak} correct decisions in a row!`, 2200);
      const r = tableRef.current?.getBoundingClientRect();
      if (r) burst({ x: r.left + r.width / 2, y: r.top + 40, count: 20 });
    }
  };

  /* ---------- actions ---------- */

  const act = (a: Action) => {
    if (game.phase !== "player" || !hand || !allowed[a]) return;
    if ((a === "double" || a === "split") && !withdraw(hand.bet)) {
      show("Not enough chips for that");
      return;
    }
    grade(a);
    const fn = { hit, stand, double, split, surrender }[a];
    commit(fn(game, rules));
  };

  const insurance = (take: boolean) => {
    if (game.phase !== "insurance") return;
    const bj = isBlackjack(game.hands[0]);
    if (take && !bj && !withdraw(Math.floor(game.initialBet / 2))) {
      show("Not enough chips for insurance");
      return;
    }
    // Insurance and even money are always -EV; declining is the book play.
    const lost = take ? Math.abs(insuranceEV(rules)) * game.initialBet : 0;
    saveSkill(recordDecision(skillRef.current, !take, lost));
    if (take && coach !== "off") show(`Book play: decline ${bj ? "even money" : "insurance"}`, 2200);
    commit(decideInsurance(game, take, rules));
  };

  const addChip = (value: number) => {
    if (game.phase !== "betting") return;
    if (value > bankroll - draftTotal) return show("Not enough chips");
    const next = { ...draft, [spot]: draft[spot] + value };
    if (next.main > limits.max) return show(`Table maximum is ${limits.max}`);
    if (spot !== "main" && next[spot] > Math.max(next.main, limits.min)) return show("Side bets can’t exceed your main bet");
    setDraft(next);
  };

  const dealRound = () => {
    if (game.phase !== "betting" && game.phase !== "settled") return;
    let d = draft;
    if (game.phase === "settled") {
      newRound();
      return;
    }
    if (d.main < limits.min) return show(`Table minimum is ${limits.min}`);
    if (d.pair > d.main || d.under13 > d.main || d.over13 > d.main) return show("Side bets can’t exceed your main bet");
    if (!withdraw(draftTotal)) return show("Not enough chips");
    setLastDraft(d);
    d = EMPTY_DRAFT;
    setDraft(d);
    commit(deal(game, draft.main, { pair: draft.pair, under13: draft.under13, over13: draft.over13 }, rules));
  };

  const newRound = () => {
    commit({ ...gameRef.current, phase: "betting", hands: [], dealer: [], insurance: 0, returned: 0, side: NO_SIDE });
    const total = lastDraft ? lastDraft.main + lastDraft.pair + lastDraft.under13 + lastDraft.over13 : 0;
    setDraft(lastDraft && total <= (profile?.bankroll ?? 0) ? lastDraft : EMPTY_DRAFT);
  };

  const setCoachMode = (mode: Coach) => {
    setCoach(mode);
    writeJSON(PREFS_KEY, { coach: mode });
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (dialog || chartOpen || rulesOpen || report || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (game.phase === "player") {
      const map: Record<string, Action> = { h: "hit", s: "stand", d: "double", p: "split", r: "surrender" };
      if (map[k]) act(map[k]);
    } else if (game.phase === "insurance") {
      if (k === "y") insurance(true);
      if (k === "n") insurance(false);
    } else if (k === "enter") {
      e.preventDefault();
      dealRound();
    }
    if (k === "c") setChartOpen((o) => !o);
    if (k === "?") setRulesOpen(true);
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ---------- derived view ---------- */

  const dealerTotal = game.dealer.length ? totalOf(game.dealer) : null;
  const shoeLeft = game.shoe.length ? game.shoe.length / game.shoeSize : 1;
  const cutAt = 1 - rules.penetration;
  const rate = rating(skill);
  const chartFocus: ChartFocus =
    situation && hand
      ? { ...chartRowFor(situation.cards, situation.canSplit), up: situation.dealerUp }
      : null;
  const settledNet = game.phase === "settled" ? game.returned - totalStaked(game) : 0;
  const chips = DENOMINATIONS.filter((v) => v <= limits.max && v >= 1).reverse();

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-2.5 px-3 pt-3 pb-4 sm:px-4">
      {/* Top bar: everything above the felt in one row */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-baseline gap-2">
          <Link href="/casino" className="font-mono text-xs font-bold text-ink-soft hover:text-ink">
            ← Casino
          </Link>
          <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Blackjack</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
          <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 text-paper" title={rate.title}>
            Skill {rate.letter} · {Math.round(rate.accuracy * 100)}%
          </span>
          <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-1">🔥 {skill.streak}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <select
            aria-label="Coach mode"
            value={coach}
            onChange={(e) => setCoachMode(e.target.value as Coach)}
            className="brut-sm rounded-full bg-paper px-2.5 py-1 text-xs font-bold"
          >
            <option value="off">Coach off</option>
            <option value="feedback">Coach: mistakes</option>
            <option value="hints">Coach: hints</option>
          </select>
          {profile && profile.league > 0 && (
            <select
              aria-label="Table"
              value={leagueIndex}
              disabled={game.phase !== "betting"}
              onChange={(e) => setTableLeague(Number(e.target.value))}
              className="brut-sm rounded-full bg-paper px-2.5 py-1 text-xs font-bold"
            >
              {LEAGUES.slice(0, profile.league + 1).map((l, i) => (
                <option key={l.id} value={i}>
                  {l.name} {l.blackjack.min}–{l.blackjack.max}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setRulesOpen(true)} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> Rules</span>
          </button>
          <button type="button" onClick={() => setChartOpen(true)} className="brut-sm press rounded-full bg-daily px-3 py-1 text-xs font-extrabold">
            📊<span className="hidden sm:inline"> Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setDialog("stats")}
            aria-label="Your stats"
            className="brut-sm press flex size-8 items-center justify-center rounded-full bg-daily"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
              <rect x="3" y="12" width="4.5" height="9" rx="1" />
              <rect x="9.75" y="6" width="4.5" height="15" rx="1" />
              <rect x="16.5" y="3" width="4.5" height="18" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <CasinoHud compact />

      {/* Table */}
      <div
        ref={tableRef}
        className="brut relative flex h-[440px] flex-col justify-between overflow-hidden rounded-b-[44px] rounded-t-[120px] border-[3px] px-3 pt-4 pb-3 text-paper sm:h-[455px] sm:rounded-t-[200px] sm:px-8"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #1d8a59 0%, #136b44 55%, #0e5636 100%)",
        }}
      >
        <Toast toast={toast} />

        {/* Shoe */}
        <div className="absolute top-16 right-[8%] flex flex-col items-center gap-1 sm:top-20" title="Cards left in the shoe">
          <div className="relative h-14 w-10 overflow-hidden rounded-md border-2 border-ink bg-ink/50">
            <motion.div
              className="absolute inset-x-0 bottom-0"
              style={{ background: "repeating-linear-gradient(0deg, #3b5bff 0 3px, #f3ede2 3px 5px)" }}
              animate={{ height: `${shoeLeft * 100}%` }}
            />
            <div className="absolute inset-x-0 h-0.5 bg-casino" style={{ bottom: `${cutAt * 100}%` }} />
          </div>
          <span className="font-mono text-[9px] font-bold">SHOE</span>
        </div>

        {/* Dealer */}
        <section aria-label="Dealer" className="flex flex-col items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-display text-xs text-ink">
            Dealer{dealerTotal ? ` · ${describe(dealerTotal)}` : ""}
          </span>
          <div className="flex min-h-[5.6rem] -space-x-7 sm:min-h-[6.6rem]">
            {game.dealer.map((c, i) => (
              <PlayingCard key={c.id} card={c} index={i === 0 ? 1 : 0} />
            ))}
          </div>
        </section>

        {/* Felt printing */}
        <svg viewBox="0 0 600 90" className="mx-auto mt-1 w-full max-w-[600px]" aria-hidden>
          <defs>
            <path id="arc1" d="M 40 20 Q 300 110 560 20" />
            <path id="arc2" d="M 70 45 Q 300 130 530 45" />
          </defs>
          <text fill="#f3ede2" fontSize="17" fontFamily="var(--font-bungee)" letterSpacing="2">
            <textPath href="#arc1" startOffset="50%" textAnchor="middle">
              BLACKJACK PAYS 3 TO 2
            </textPath>
          </text>
          <text fill="#ffc93c" fontSize="10" fontFamily="var(--font-space-mono)" fontWeight="700" letterSpacing="1">
            <textPath href="#arc2" startOffset="50%" textAnchor="middle">
              STANDS ON 17 · INSURANCE PAYS 2 TO 1 · PAIR 11 TO 1
            </textPath>
          </text>
        </svg>

        {/* Player hands */}
        <section aria-label="Your hands" className="flex min-h-[8.5rem] flex-wrap items-end justify-center gap-x-5 gap-y-3">
          {game.hands.map((h, i) => {
            const t = totalOf(h.cards);
            const isActive = game.phase === "player" && i === game.active;
            const showBet = !(game.phase === "settled" && (h.payout ?? 0) === 0);
            const winnings = game.phase === "settled" ? Math.max(0, (h.payout ?? 0) - h.bet) : 0;
            return (
              <motion.div
                key={i}
                layout
                className={`relative flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors ${isActive && game.hands.length > 1 ? "bg-paper/15 ring-[3px] ring-daily" : ""}`}
              >
                <div className="flex -space-x-7">
                  {h.cards.map((c, ci) => (
                    <PlayingCard key={c.id} card={c} index={ci === 0 ? 0 : ci === 1 ? 2 : 0} />
                  ))}
                </div>
                <div className="flex min-h-12 items-end gap-2">
                  <span className="mb-1 self-end rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-display text-xs text-ink">
                    {isBlackjack(h) ? "BJ" : describe(t)}
                  </span>
                  <AnimatePresence>
                    {showBet && (
                      <motion.div key="bet" exit={{ y: -160, opacity: 0, transition: { duration: 0.45 } }}>
                        <ChipStack amount={h.bet} size={30} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {winnings > 0 && (
                    <motion.div initial={{ y: -160, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, type: "spring" }}>
                      <ChipStack amount={winnings} size={30} />
                    </motion.div>
                  )}
                </div>
                <AnimatePresence>
                  {h.outcome && (
                    <motion.span
                      className={`absolute -top-3 left-1/2 rounded-lg border-[2.5px] border-ink px-2.5 py-0.5 font-display text-xs whitespace-nowrap text-ink shadow-[3px_3px_0_0_var(--color-ink)] ${OUTCOME_STYLE[h.outcome]}`}
                      initial={{ x: "-50%", scale: 2.4, rotate: -20, opacity: 0 }}
                      animate={{ x: "-50%", scale: 1, rotate: -5, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.15 }}
                    >
                      {OUTCOME_LABEL[h.outcome]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Betting spots during betting */}
          {game.phase === "betting" && (
            <div className="flex items-end gap-1.5 sm:gap-4">
              {(["pair", "under13"] as const).map((k) => (
                <BetSpot key={k} label={SPOT_LABEL[k]} info={SPOT_INFO[k]} amount={draft[k]} active={spot === k} onClick={() => setSpot(k)} small />
              ))}
              <BetSpot label={`Bet ${limits.min}–${limits.max}`} info={SPOT_INFO.main} amount={draft.main} active={spot === "main"} onClick={() => setSpot("main")} />
              <BetSpot label={SPOT_LABEL.over13} info={SPOT_INFO.over13} amount={draft.over13} active={spot === "over13"} onClick={() => setSpot("over13")} small />
            </div>
          )}
        </section>

        {/* Side-bet results */}
        {game.phase !== "betting" && (game.side.pair || game.side.under13 || game.side.over13) ? (
          <div className="mt-1 flex justify-center gap-2 font-mono text-[11px] font-bold">
            {(Object.keys(SPOT_LABEL) as (keyof SideBets)[])
              .filter((k) => game.side[k] > 0)
              .map((k) => (
                <span
                  key={k}
                  className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-ink ${game.sideReturns[k] ? "bg-daily" : "bg-paper/70 line-through"}`}
                >
                  {SPOT_LABEL[k]} {game.sideReturns[k] ? `+${game.sideReturns[k] - game.side[k]}` : `−${game.side[k]}`}
                </span>
              ))}
          </div>
        ) : null}
        <p className="mt-1 text-center font-mono text-[9px] font-bold text-paper/60">Virtual chips only · no real money · 18+</p>
      </div>

      {/* Controls */}
      <div className="flex min-h-[5.5rem] flex-col justify-center" aria-live="polite">
        {game.phase === "betting" && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <p className="w-full text-center font-mono text-[11px] font-bold text-ink-soft">
              Chips go on: <span className="text-ink">{spot === "main" ? "main bet" : SPOT_LABEL[spot]}</span> — tap a circle on the felt to switch
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {chips.map((v) => (
                <motion.button
                  key={v}
                  type="button"
                  onClick={() => addChip(v)}
                  disabled={v > bankroll - draftTotal}
                  aria-label={`Add a ${v} chip`}
                  whileHover={{ y: -6, rotate: -8 }}
                  whileTap={{ scale: 0.85 }}
                  className="rounded-full disabled:opacity-30"
                >
                  <ChipFace value={v} size={46} />
                </motion.button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setDraft(EMPTY_DRAFT)}
                disabled={!draftTotal}
                className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold disabled:opacity-40"
              >
                Clear
              </button>
              {lastDraft && !draftTotal && (
                <button
                  type="button"
                  onClick={() => setDraft(lastDraft)}
                  className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold"
                >
                  Rebet {lastDraft.main + lastDraft.pair + lastDraft.under13 + lastDraft.over13}
                </button>
              )}
              <button
                type="button"
                onClick={dealRound}
                disabled={draft.main < limits.min}
                className="brut press rounded-full bg-pop px-9 py-2.5 font-extrabold text-paper disabled:opacity-40"
              >
                Deal · {draftTotal}
              </button>
            </div>
          </div>
        )}

        {game.phase === "insurance" && (
          <div className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-2 font-display text-lg">
              {isBlackjack(game.hands[0]) ? "Blackjack vs an Ace — take even money?" : "Dealer shows an Ace — insurance?"}
              <InfoTip title={isBlackjack(game.hands[0]) ? "Even money" : "Insurance · pays 2:1"} placement="bottom">
                {isBlackjack(game.hands[0]) ? EVEN_MONEY_INFO : INSURANCE_INFO}
              </InfoTip>
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => insurance(true)} className="brut press rounded-full bg-daily px-6 py-2.5 font-extrabold">
                {isBlackjack(game.hands[0]) ? "Even money" : `Insure ${Math.floor(game.initialBet / 2)}`} (Y)
              </button>
              <button
                type="button"
                onClick={() => insurance(false)}
                className={`brut press rounded-full bg-paper px-6 py-2.5 font-extrabold ${coach === "hints" ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
              >
                No thanks (N)
              </button>
            </div>
          </div>
        )}

        {game.phase === "player" && (
          <div className="mx-auto grid max-w-xl grid-cols-5 gap-2">
            {(["hit", "stand", "double", "split", "surrender"] as Action[]).map((a) => {
              const enabled = allowed[a] && ((a !== "double" && a !== "split") || canAffordExtra);
              const hinted = coach === "hints" && advice?.action === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => act(a)}
                  disabled={!enabled}
                  title={a === "stand" && !allowed.stand ? "House rule: you must hit below 12" : undefined}
                  className={`brut press relative rounded-2xl py-3 text-sm font-extrabold disabled:opacity-30 sm:text-base ${ACTION_STYLE[a]} ${hinted ? "ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                >
                  {ACTION_LABEL[a]}
                  <span className="block font-mono text-[10px] opacity-70">{ACTION_KEY[a]}</span>
                  {hinted && (
                    <motion.span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-paper px-2 font-display text-[9px] text-ink"
                      initial={{ y: 6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      Book
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {game.phase === "dealer" && <p className="text-center font-display text-lg">Dealer draws…</p>}

        {game.phase === "settled" && (
          <div className="flex flex-col items-center gap-2">
            <p className="font-display text-xl">
              {settledNet > 0 ? (
                <>
                  +<CountUp value={settledNet} /> chips
                </>
              ) : settledNet === 0 ? (
                "Even — stake returned"
              ) : (
                `${settledNet} chips`
              )}
            </p>
            <button type="button" onClick={newRound} autoFocus className="brut press rounded-full bg-pop px-9 py-3 font-extrabold text-paper">
              Next hand (Enter)
            </button>
          </div>
        )}
      </div>

      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} rules={rules} />
      <ChartDrawer open={chartOpen} onClose={() => setChartOpen(false)} rules={rules} focus={chartFocus} />

      <Modal open={report !== null} onClose={() => setReport(null)} title="Shoe complete">
        {report && <ShoeReport report={report} />}
      </Modal>

      <Modal open={dialog === "stats"} onClose={() => setDialog(null)} title="Your blackjack">
        <div className="flex items-center gap-4">
          <span className="flex size-20 items-center justify-center rounded-2xl border-[3px] border-ink bg-daily font-display text-5xl shadow-[4px_4px_0_0_var(--color-ink)]">
            {rate.letter}
          </span>
          <div>
            <p className="font-display">{rate.title}</p>
            <p className="font-mono text-xs font-bold text-ink-soft">Last {skill.recent.length} decisions · {Math.round(rate.accuracy * 100)}% by the book</p>
            {profile && <div className="mt-2"><LeagueBadge league={LEAGUES[profile.league]} size="sm" /></div>}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Hands", value: skill.lifetime.hands },
            { label: "Net chips", value: skill.lifetime.net },
            { label: "Book %", value: `${Math.round(accuracy(skill.lifetime) * 100)}%` },
            { label: "Best streak", value: skill.bestStreak },
            { label: "EV lost", value: Math.round(skill.lifetime.evLost) },
            { label: "Shoes", value: skill.shoesCompleted },
          ].map((n) => (
            <div key={n.label} className="rounded-xl border-2 border-ink bg-paper-deep py-2">
              <dd className="font-display text-xl">{n.value}</dd>
              <dt className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">{n.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-mono text-[11px] text-ink-soft">
          “EV lost” = the chips your mistakes cost on average, versus the best play. Luck evens out; this doesn’t.
        </p>
      </Modal>
    </div>
  );
}

function BetSpot({
  label,
  info,
  amount,
  active,
  onClick,
  small = false,
}: {
  label: string;
  info: { title: string; text: string };
  amount: number;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={onClick} aria-pressed={active} aria-label={`Bet on ${label}`}>
        <motion.span
          className={`flex items-end justify-center rounded-full border-[3px] border-dashed pb-1 ${small ? "size-14 sm:size-20" : "size-20 sm:size-28"} ${active ? "border-daily bg-paper/15" : "border-paper/60"}`}
          animate={{ scale: active ? 1.06 : 1 }}
        >
          {amount > 0 ? <ChipStack amount={amount} size={small ? 24 : 32} label={false} /> : null}
        </motion.span>
      </button>
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          className={`rounded-full px-1.5 font-mono text-[9px] font-bold whitespace-nowrap sm:px-2 sm:text-[10px] ${active ? "bg-daily text-ink" : "text-paper/80"}`}
        >
          {label}
          {amount > 0 ? ` · ${amount}` : ""}
        </button>
        <InfoTip title={info.title}>{info.text}</InfoTip>
      </span>
    </div>
  );
}

function ShoeReport({ report }: { report: Tally }) {
  const acc = accuracy(report);
  const g = rating({ ...EMPTY_SKILL, recent: Array.from({ length: report.decisions }, (_, i) => i < report.correct) });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <motion.span
          className="flex size-20 items-center justify-center rounded-2xl border-[3px] border-ink bg-daily font-display text-5xl shadow-[4px_4px_0_0_var(--color-ink)]"
          initial={{ scale: 2.5, rotate: -25 }}
          animate={{ scale: 1, rotate: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {g.letter}
        </motion.span>
        <div>
          <p className="font-display">{g.title}</p>
          <p className="font-mono text-xs font-bold text-ink-soft">The dealer is shuffling a fresh shoe.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: "Hands", value: report.hands },
          { label: "By the book", value: `${Math.round(acc * 100)}%` },
          { label: "Net chips", value: report.net },
          { label: "EV lost to mistakes", value: report.evLost.toFixed(1) },
        ].map((n) => (
          <div key={n.label} className="rounded-xl border-2 border-ink bg-paper-deep py-2">
            <dd className="font-display text-xl">{n.value}</dd>
            <dt className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">{n.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
