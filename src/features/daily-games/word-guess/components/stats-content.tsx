"use client";

import { motion } from "motion/react";
import { ResetCountdown } from "@/components/home/reset-countdown";
import { MAX_GUESSES, type GameStatus, type Stats } from "../logic.ts";

type Props = {
  stats: Stats;
  status: GameStatus;
  answer: string;
  /** Guesses used today, to highlight the matching bar. */
  guessCount: number;
  onShare: () => void;
};

export function StatsContent({ stats, status, answer, guessCount, onShare }: Props) {
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const most = Math.max(1, ...stats.distribution);
  const finished = status !== "playing";

  const numbers = [
    { label: "Played", value: stats.played },
    { label: "Win %", value: winRate },
    { label: "Streak", value: stats.currentStreak },
    { label: "Best", value: stats.maxStreak },
  ];

  return (
    <div className="space-y-6">
      {status === "lost" && (
        <p className="rounded-2xl border-2 border-ink bg-casino px-4 py-3 text-center font-bold">
          The word was <span className="font-display text-lg tracking-wider uppercase">{answer}</span>
        </p>
      )}
      {status === "won" && (
        <p className="rounded-2xl border-2 border-ink bg-sports px-4 py-3 text-center font-bold">
          Solved in {guessCount} {guessCount === 1 ? "guess" : "guesses"}!
        </p>
      )}

      <dl className="grid grid-cols-4 gap-2 text-center">
        {numbers.map((n, i) => (
          <motion.div
            key={n.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
          >
            <dd className="font-display text-3xl">{n.value}</dd>
            <dt className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">{n.label}</dt>
          </motion.div>
        ))}
      </dl>

      <div>
        <h3 className="font-display text-sm">Guess distribution</h3>
        <ol className="mt-3 space-y-1.5">
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const count = stats.distribution[i];
            const today = status === "won" && guessCount === i + 1;
            return (
              <li key={i} className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className="w-3">{i + 1}</span>
                <motion.span
                  className={`flex h-6 min-w-[1.75rem] items-center justify-end rounded-md border-2 border-ink px-1.5 ${
                    today ? "bg-sports" : "bg-paper-deep"
                  }`}
                  initial={{ width: "1.75rem" }}
                  animate={{ width: `max(1.75rem, ${(count / most) * 100}%)` }}
                  transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.25 + i * 0.05 }}
                >
                  {count}
                </motion.span>
              </li>
            );
          })}
        </ol>
      </div>

      {finished ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-ink/30 pt-5">
          <ResetCountdown />
          <button
            type="button"
            data-burst
            onClick={onShare}
            className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper"
          >
            Share result
          </button>
        </div>
      ) : (
        <p className="font-mono text-xs text-ink-soft">Finish today’s puzzle to share your result.</p>
      )}
    </div>
  );
}
