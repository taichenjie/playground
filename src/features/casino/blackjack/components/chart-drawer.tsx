"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import type { Rules } from "../rules.ts";
import { DEALER_UPS, buildChart, type ChartCode } from "../strategy.ts";

const CODE_STYLE: Record<ChartCode, string> = {
  H: "bg-paper",
  S: "bg-casino",
  D: "bg-sports",
  Ds: "bg-sports",
  P: "bg-music",
  Rh: "bg-pop text-paper",
  Rs: "bg-pop text-paper",
  Rp: "bg-pop text-paper",
};

const LEGEND: [ChartCode, string][] = [
  ["H", "Hit"],
  ["S", "Stand"],
  ["D", "Double (else hit)"],
  ["Ds", "Double (else stand)"],
  ["P", "Split"],
  ["Rh", "Surrender (else hit)"],
  ["Rs", "Surrender (else stand)"],
];

export type ChartFocus = { table: number; label: string; up: number } | null;

/** Slide-out basic strategy chart, generated from the table rules. */
export function ChartDrawer({
  open,
  onClose,
  rules,
  focus,
}: {
  open: boolean;
  onClose: () => void;
  rules: Rules;
  focus: ChartFocus;
}) {
  const chart = useMemo(() => buildChart(rules), [rules]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="brut fixed top-3 right-3 bottom-3 z-[75] w-[min(94vw,460px)] overflow-y-auto rounded-3xl bg-paper p-5"
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            aria-label="Basic strategy chart"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="wide text-xl font-black uppercase">Strategy chart</h2>
                <p className="font-mono text-[11px] font-bold text-ink-soft">
                  {rules.decks} decks · dealer stands on 17 · no hole card
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chart"
                className="brut-sm press flex size-9 shrink-0 items-center justify-center rounded-full bg-daily text-lg font-black"
              >
                ×
              </button>
            </div>

            {chart.map((table, ti) => (
              <div key={table.title} className="mt-5">
                <h3 className="font-display text-sm">{table.title}</h3>
                <table className="mt-2 w-full border-separate border-spacing-0.5 text-center font-mono text-[10px] font-bold">
                  <thead>
                    <tr>
                      <th className="text-left text-ink-soft">You ↓ · Dealer →</th>
                      {DEALER_UPS.map((up) => (
                        <th
                          key={up}
                          className={`rounded ${focus && focus.up === up ? "bg-ink text-paper" : ""}`}
                        >
                          {up === 1 ? "A" : up}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => {
                      const rowFocus = focus?.table === ti && focus.label === row.label;
                      return (
                        <tr key={row.label}>
                          <th className={`rounded pr-1 text-left whitespace-nowrap ${rowFocus ? "bg-ink text-paper" : ""}`}>
                            {row.label}
                          </th>
                          {row.cells.map((c, ci) => {
                            const hot = rowFocus && focus?.up === DEALER_UPS[ci];
                            return (
                              <td
                                key={ci}
                                className={`rounded border border-ink/40 py-1 ${CODE_STYLE[c]} ${hot ? "relative z-10 scale-125 ring-2 ring-ink" : ""}`}
                              >
                                {c}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            <ul className="mt-5 grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
              {LEGEND.map(([c, label]) => (
                <li key={c} className="flex items-center gap-2">
                  <span className={`w-7 rounded border border-ink text-center font-mono font-bold ${CODE_STYLE[c]}`}>{c}</span>
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-ink-soft">
              Computed from the rules (infinite-deck model). Never take insurance or even money. You must hit hard totals
              below 12.
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
