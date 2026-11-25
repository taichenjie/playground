"use client";

import { motion } from "motion/react";
import { bigRoad, type RoadEntry } from "../logic.ts";

const COLOUR = { player: "#2f5bd8", banker: "#d8342f", tie: "#1f9d55" } as const;
const LETTER = { player: "P", banker: "B", tie: "T" } as const;

const CELL = 19;
const ROWS = 6;

/** Bead plate and Big Road for the current shoe, like the boards above a real table. */
export function Roads({ entries }: { entries: RoadEntry[] }) {
  const beadCols = 13;
  const beads = entries.slice(-beadCols * ROWS);
  const road = bigRoad(entries);
  const roadCols = Math.max(18, (road.at(-1)?.col ?? 0) + 2);
  const firstCol = Math.max(0, roadCols - 18);
  const counts = {
    banker: entries.filter((e) => e.outcome === "banker").length,
    player: entries.filter((e) => e.outcome === "player").length,
    tie: entries.filter((e) => e.outcome === "tie").length,
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between font-mono text-[11px] font-bold">
        {(["banker", "player", "tie"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full text-[10px] text-paper" style={{ background: COLOUR[k] }}>
              {LETTER[k]}
            </span>
            {counts[k]}
          </span>
        ))}
        <span className="text-ink-soft">#{entries.length}</span>
      </div>

      {/* Big Road */}
      <div>
        <p className="mb-1 font-mono text-[10px] font-bold tracking-wider text-ink-soft uppercase">Big road</p>
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            height: CELL * ROWS,
            background: "#f6f1e6",
            backgroundImage: "linear-gradient(#d9cfbd 1px, transparent 1px), linear-gradient(90deg, #d9cfbd 1px, transparent 1px)",
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        >
          {road
            .filter((c) => c.col >= firstCol)
            .map((c, i) => (
              <motion.span
                key={`${c.col}-${c.row}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: i === road.length - 1 ? 0.1 : 0 }}
                className="absolute rounded-full"
                style={{
                  left: (c.col - firstCol) * CELL + 2,
                  top: c.row * CELL + 2,
                  width: CELL - 4,
                  height: CELL - 4,
                  border: `3px solid ${COLOUR[c.outcome]}`,
                }}
              >
                {c.ties > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block h-[3px] w-[130%] -rotate-45" style={{ background: COLOUR.tie }} />
                    {c.ties > 1 && <span className="absolute text-[8px] font-bold" style={{ color: COLOUR.tie }}>{c.ties}</span>}
                  </span>
                )}
                {c.bankerPair && <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full" style={{ background: COLOUR.banker }} />}
                {c.playerPair && <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full" style={{ background: COLOUR.player }} />}
              </motion.span>
            ))}
        </div>
      </div>

      {/* Bead plate */}
      <div>
        <p className="mb-1 font-mono text-[10px] font-bold tracking-wider text-ink-soft uppercase">Bead plate</p>
        <div
          className="grid grid-flow-col gap-0.5 rounded-lg p-1"
          style={{ gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, gridAutoColumns: `${CELL}px`, background: "#f6f1e6" }}
        >
          {beads.map((e, i) => (
            <motion.span
              key={entries.length - beads.length + i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative flex items-center justify-center rounded-full font-display text-[10px] text-paper"
              style={{ background: COLOUR[e.outcome] }}
              title={`${LETTER[e.outcome]} ${e.total}`}
            >
              {LETTER[e.outcome]}
              {e.bankerPair && <span className="absolute -top-0.5 -left-0.5 size-1.5 rounded-full border border-paper" style={{ background: COLOUR.banker }} />}
              {e.playerPair && <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full border border-paper" style={{ background: COLOUR.player }} />}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
