"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { LEAGUES, type League } from "../../economy.ts";
import { DIFFICULTIES, type Difficulty } from "../bots.ts";
import { allowedDifficulties, stakeLimitLabel } from "../stakes.ts";

export type TableConfig = { sb: number; bb: number; players: number; difficulty: Difficulty; buyIn: number };

const DIFFICULTY_INFO: Record<Difficulty, { label: string; text: string }> = {
  easy: { label: "Easy", text: "Loose and passive. Calls too much, rarely bluffs." },
  medium: { label: "Medium", text: "Solid starting hands, reads pot odds, some bluffs." },
  hard: { label: "Hard", text: "Positional, aggressive, puts you on a range." },
  expert: { label: "Expert", text: "Deep simulations, balanced bluffs, adapts to how you play." },
};

const MIN_BB = 40;
const MAX_BB = 100;

export function Setup({
  league,
  bankroll,
  onStart,
}: {
  league: number;
  bankroll: number;
  onStart: (config: TableConfig) => void;
}) {
  const stakes = LEAGUES.slice(0, league + 1).flatMap((l: League) => l.poker.map((s) => ({ ...s, league: l })));
  const affordable = stakes.filter((s) => bankroll >= s.bb * MIN_BB);
  const [stakeIndex, setStakeIndex] = useState(Math.max(0, stakes.indexOf(affordable[affordable.length - 1] ?? stakes[0])));
  const stake = stakes[stakeIndex];
  const [players, setPlayers] = useState(6);
  const [chosen, setDifficulty] = useState<Difficulty>(LEAGUES[league].bots);
  const allowed = allowedDifficulties(stake.bb);
  // If the chosen bots aren't allowed at these blinds, use the softest allowed level.
  const difficulty = allowed.includes(chosen) ? chosen : allowed[0];
  const maxBuy = Math.min(stake.bb * MAX_BB, Math.floor(bankroll / stake.bb) * stake.bb);
  const minBuy = stake.bb * MIN_BB;
  const [buyBB, setBuyBB] = useState(MAX_BB);
  const buyIn = Math.max(minBuy, Math.min(buyBB * stake.bb, maxBuy));
  const canPlay = bankroll >= minBuy;

  return (
    <motion.div
      className="brut mx-auto w-full max-w-2xl rounded-3xl bg-paper p-5 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="wide text-2xl font-black uppercase">Pick a table</h2>
      <p className="mt-1 text-sm text-ink-soft">No-limit Texas Hold’em cash game. Leave whenever you like — your stack goes back to your bankroll.</p>

      <fieldset className="mt-5">
        <legend className="font-display text-sm">Blinds</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {stakes.map((s, i) => {
            const ok = bankroll >= s.bb * MIN_BB;
            return (
              <button
                key={`${s.sb}/${s.bb}`}
                type="button"
                disabled={!ok}
                onClick={() => setStakeIndex(i)}
                aria-pressed={i === stakeIndex}
                className={`brut-sm press rounded-full px-4 py-2 font-extrabold disabled:opacity-35 ${i === stakeIndex ? "bg-ink text-paper" : "bg-paper"}`}
              >
                {s.sb}/{s.bb}
                <span className="ml-1.5 font-mono text-[10px] opacity-70">{s.league.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="font-display text-sm">Players at the table</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPlayers(n)}
              aria-pressed={players === n}
              className={`brut-sm press size-11 rounded-full font-display ${players === n ? "bg-daily" : "bg-paper"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 font-mono text-[11px] text-ink-soft">You + {players - 1} bot{players > 2 ? "s" : ""}{players === 2 ? " (heads-up)" : ""}</p>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="font-display text-sm">Bot difficulty</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DIFFICULTIES.map((d) => {
            const ok = allowed.includes(d);
            return (
              <button
                key={d}
                type="button"
                disabled={!ok}
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={`brut-sm press rounded-2xl p-3 text-left disabled:opacity-40 ${difficulty === d ? "bg-casino" : "bg-paper"}`}
              >
                <span className="block font-display text-sm">{DIFFICULTY_INFO[d].label}</span>
                <span className="block text-[11px] leading-snug">{DIFFICULTY_INFO[d].text}</span>
                <span className="mt-1 block font-mono text-[10px] font-bold">{stakeLimitLabel(d)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-ink-soft">Softer bots play smaller blinds — big wins come from beating strong opponents.</p>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="font-display text-sm">
          Buy-in: ◎ {buyIn.toLocaleString()} <span className="font-mono text-xs text-ink-soft">({Math.round(buyIn / stake.bb)} big blinds)</span>
        </legend>
        <input
          type="range"
          min={MIN_BB}
          max={MAX_BB}
          step={5}
          value={Math.round(buyIn / stake.bb)}
          onChange={(e) => setBuyBB(Number(e.target.value))}
          disabled={!canPlay}
          aria-label="Buy-in in big blinds"
          className="mt-2 w-full accent-[var(--color-pop)]"
        />
        <p className="font-mono text-[11px] text-ink-soft">
          {MIN_BB}–{MAX_BB} big blinds · comes out of your bankroll (◎ {bankroll.toLocaleString()})
        </p>
      </fieldset>

      <button
        type="button"
        data-burst
        disabled={!canPlay}
        onClick={() => onStart({ sb: stake.sb, bb: stake.bb, players, difficulty, buyIn })}
        className="brut press mt-6 w-full rounded-full bg-pop py-3.5 text-lg font-extrabold text-paper disabled:opacity-40"
      >
        {canPlay ? `Sit down with ◎ ${buyIn.toLocaleString()}` : `You need ◎ ${minBuy} to sit at the smallest table`}
      </button>
    </motion.div>
  );
}
