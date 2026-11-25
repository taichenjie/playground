"use client";

import { motion } from "motion/react";

/**
 * Big read-out under a table: what's riding, what came back, and the net
 * result. Shared by the casino table games.
 */
export function ResultStrip({
  state,
  staked,
  paid,
  available,
  roundId,
  playingLabel = "Playing…",
  note,
}: {
  state: "betting" | "playing" | "done";
  staked: number;
  paid: number;
  available: number;
  roundId: number;
  playingLabel?: string;
  /** Optional small line under the paid-back figure (e.g. commission). */
  note?: string;
}) {
  const done = state === "done";
  const net = paid - staked;
  const tone = !done ? "#e8b84a" : net > 0 ? "#3dd68c" : net < 0 ? "#ff5a3c" : "#f3ede2";
  const boxes = [
    { label: "Total bet", value: staked ? `◎ ${staked.toLocaleString()}` : "—", colour: "#f3ede2", sub: undefined },
    {
      label: state === "betting" ? "Bankroll left" : "Paid back",
      value: done ? `◎ ${paid.toLocaleString()}` : state === "playing" ? "…" : `◎ ${available.toLocaleString()}`,
      colour: done && paid > 0 ? "#3dd68c" : "#f3ede2",
      sub: done ? note : undefined,
    },
    {
      label: done ? (net > 0 ? "You won" : net < 0 ? "You lost" : "Broke even") : "Result",
      value: done ? `${net > 0 ? "+" : net < 0 ? "−" : ""}◎ ${Math.abs(net).toLocaleString()}` : state === "playing" ? playingLabel : "—",
      colour: tone,
      sub: undefined,
    },
  ];
  return (
    <motion.div
      key={done ? `done-${roundId}` : "live"}
      className="grid grid-cols-3 gap-2"
      initial={done ? { scale: 0.92, opacity: 0.4 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 16 }}
      aria-live="polite"
      aria-label={done ? `Bet ${staked}, paid back ${paid}, net ${net}.` : undefined}
    >
      {boxes.map((b, i) => (
        <div
          key={i}
          className="rounded-2xl border-2 px-3 py-1.5 text-center"
          style={{
            borderColor: i === 2 && done ? tone : "rgba(232,184,74,0.45)",
            background: i === 2 && done ? `${tone}22` : "rgba(0,0,0,0.35)",
            boxShadow: i === 2 && done && net > 0 ? `0 0 24px ${tone}66` : undefined,
          }}
        >
          <p className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(243,237,226,0.7)" }}>
            {b.label}
          </p>
          <p className="font-display text-[clamp(1.1rem,2.2vw,1.75rem)] leading-tight" style={{ color: b.colour }}>
            {b.value}
          </p>
          {b.sub && (
            <p className="font-mono text-[9px] font-bold" style={{ color: "rgba(243,237,226,0.65)" }}>
              {b.sub}
            </p>
          )}
        </div>
      ))}
    </motion.div>
  );
}
