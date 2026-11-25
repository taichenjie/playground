"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChipStack, PotPile } from "../../components/chip-stack";
import { PlayingCard } from "../../components/playing-card";
import { buildPots, potTotal, type Table } from "../engine.ts";
import { bestFive, describeScore, scoreCards } from "../evaluator.ts";

export type SeatLook = { avatar: string; colour: string };

const CX = 50;
const CY = 50;

/**
 * Seat angle in degrees. The human (k = 0) sits at the bottom (90°). At
 * full tables the human gets extra elbow room and bots share the rest.
 */
function angleFor(k: number, n: number) {
  if (k === 0) return 90;
  const gap = n >= 8 ? 50 : 360 / n;
  if (n <= 2) return 270;
  const span = 360 - 2 * gap;
  return 90 + gap + ((k - 1) * span) / (n - 2);
}
const at = (angle: number, rx: number, ry: number) => {
  const r = (angle * Math.PI) / 180;
  return { left: CX + rx * Math.cos(r), top: CY + ry * Math.sin(r) };
};
const pct = (p: { left: number; top: number }) => ({ left: `${p.left}%`, top: `${p.top}%` });
const POT = { left: CX, top: CY + 15 };

/** Badge colours for the last action. */
function actionStyle(action: string) {
  if (/Fold/.test(action)) return "bg-[#8a857c] text-paper line-through decoration-2";
  if (/All-in/.test(action)) return "bg-daily text-ink";
  if (/Raise|Bet/.test(action)) return "bg-casino text-ink";
  if (/Call/.test(action)) return "bg-pop text-paper";
  if (/Check/.test(action)) return "bg-sports text-ink";
  return "bg-paper text-ink"; // blinds
}

export function PokerTable({
  table,
  looks,
  thinking,
  pendingBet = 0,
  human = 0,
}: {
  table: Table;
  looks: SeatLook[];
  /** Seat currently "thinking" (bots). */
  thinking: number | null;
  /** Chips the human has picked up but not yet confirmed. */
  pendingBet?: number;
  human?: number;
}) {
  const n = table.seats.length;
  const done = table.phase === "done";
  const centrePot = potTotal(table) - table.seats.reduce((s, x) => s + x.bet, 0);
  const winners = new Set(table.results.flatMap((r) => r.winners));
  const winningCards = new Set<number>();
  if (done && table.results.some((r) => r.hand)) {
    const w = table.seats[table.results[0].winners[0]];
    if (w?.cards.length) for (const c of bestFive([...w.cards, ...table.board])) winningCards.add(c.id);
  }
  const sidePots = !done && table.seats.some((s) => s.allIn) ? buildPots(table.seats) : [];
  const crowded = n >= 8;

  return (
    <div className="relative mx-auto h-[clamp(470px,calc(100dvh-322px),720px)] w-full max-w-[1280px]">
      {/* Rail + felt */}
      <div
        className="absolute inset-x-[5%] inset-y-[13%] rounded-[50%] border-[3px] border-ink p-3 shadow-[6px_8px_0_0_var(--color-ink)] sm:p-4"
        style={{ background: "linear-gradient(180deg, #8a5a33, #5c3a1e)" }}
      >
        <div
          className="h-full w-full rounded-[50%] border-[3px] border-ink/70"
          style={{ background: "radial-gradient(ellipse at 50% 35%, #1d8a59 0%, #136b44 60%, #0e5636 100%)" }}
        />
      </div>

      {/* Board */}
      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 gap-1.5" style={pct({ left: CX, top: CY - 6 })}>
        {Array.from({ length: 5 }, (_, i) => {
          const c = table.board[i];
          return c ? (
            <div
              key={c.id}
              className={`transition-transform ${done && winningCards.size && !winningCards.has(c.id) ? "opacity-40" : ""} ${winningCards.has(c.id) ? "-translate-y-2" : ""}`}
            >
              <PlayingCard card={c} index={i < 3 ? i : 0} />
            </div>
          ) : (
            <div key={`slot-${i}`} className="h-[5.6rem] w-[4rem] rounded-xl border-2 border-dashed border-paper/25 sm:h-[6.6rem] sm:w-[4.7rem]" />
          );
        })}
      </div>

      {/* Pot as a pile of chips */}
      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 items-end gap-2.5" style={pct(POT)}>
        <AnimatePresence>
          {centrePot > 0 && !done && (
            <motion.div key="pot" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              <PotPile amount={centrePot} unit={table.bb} size={34} />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="mb-1 rounded-full border-[3px] border-ink bg-paper px-4 py-1.5 font-display text-base whitespace-nowrap text-ink shadow-[2px_2px_0_0_var(--color-ink)]">
          {done ? "Pot paid" : `Pot ◎ ${potTotal(table).toLocaleString()}`}
        </span>
        {sidePots.length > 1 && (
          <span className="mb-1 rounded-full border-2 border-ink bg-daily px-2 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-ink">
            +{sidePots.length - 1} side pot{sidePots.length > 2 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Seats */}
      {table.seats.map((s, i) => {
        const angle = angleFor((i - human + n) % n, n);
        const isHuman = i === human;
        const cos = Math.cos((angle * Math.PI) / 180);
        const upper = Math.sin((angle * Math.PI) / 180) < -0.2;
        const side = !isHuman && Math.abs(cos) > 0.6;
        const seatPos = at(angle, side ? 36 : 44, isHuman ? 37 : 35);
        const betPos = at(angle, 27, 25);
        // The human's cards sit left of the plate, so their tokens go further left.
        const dealerPos = isHuman ? at(angle + 27, 41, 36) : at(angle + (crowded ? 10 : 14), 33, 31);
        const blindPos = isHuman ? at(angle + 38, 41, 36) : at(angle - (crowded ? 10 : 14), 33, 31);
        const isTurn = table.phase === "playing" && table.toAct === i;
        const revealed = isHuman || (done && table.shown.includes(i));
        const won = done && winners.has(i);
        const showHand = done && table.shown.includes(i) && !s.folded && table.board.length >= 3;
        const handName = showHand ? describeScore(scoreCards([...s.cards, ...table.board])) : null;
        const winAmount = done
          ? table.results.reduce((sum, r) => sum + (r.winners.includes(i) ? Math.floor(r.amount / r.winners.length) : 0), 0)
          : 0;
        const bet = s.bet + (isHuman ? pendingBet : 0);
        const folded = s.folded && !done;
        const blind = i === table.sbSeat ? "SB" : i === table.bbSeat ? "BB" : null;

        return (
          <div key={s.id}>
            {/* Bet in front of the seat (pending human chips shown faded) */}
            <AnimatePresence>
              {bet > 0 && (
                <motion.div
                  key={`bet-${table.handNo}-${table.street}`}
                  className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${isHuman && pendingBet > 0 ? "opacity-70" : ""}`}
                  initial={{ ...pct(seatPos), opacity: 0 }}
                  animate={{ ...pct(betPos), opacity: 1 }}
                  exit={{ ...pct(POT), opacity: 0, transition: { duration: 0.45 } }}
                  transition={{ type: "spring", stiffness: 240, damping: 24 }}
                >
                  <ChipStack amount={bet} size={36} bigLabel />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Winnings fly from the pot to the winner */}
            <AnimatePresence>
              {won && winAmount > 0 && (
                <motion.div
                  key={`win-${table.handNo}`}
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  initial={{ ...pct(POT), scale: 1.15 }}
                  animate={{ ...pct(betPos), scale: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.4 }}
                >
                  <ChipStack amount={winAmount} size={38} bigLabel />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dealer button */}
            {i === table.button && (
              <motion.span
                layoutId="dealer-button"
                className="absolute z-30 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-paper font-display text-xl text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
                style={pct(dealerPos)}
                aria-label={`Dealer button: ${s.name}`}
                title="Dealer button"
              >
                D
              </motion.span>
            )}

            {/* Blind token */}
            {blind && table.handNo > 0 && (
              <motion.span
                key={`${blind}-${table.handNo}`}
                className={`absolute z-30 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink font-display text-sm shadow-[2px_2px_0_0_var(--color-ink)] ${
                  blind === "SB" ? "bg-pop text-paper" : "bg-casino text-ink"
                }`}
                style={pct(blindPos)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                aria-label={`${blind === "SB" ? "Small blind" : "Big blind"}: ${s.name}`}
              >
                {blind}
              </motion.span>
            )}

            {/* Seat */}
            <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={pct(seatPos)}>
              <div
                className={`flex items-center ${
                  isHuman ? "flex-row gap-2" : side ? (cos < 0 ? "flex-row-reverse gap-1.5" : "flex-row gap-1.5") : upper ? "flex-col-reverse gap-1" : "flex-col gap-1"
                } transition-[filter,opacity] ${folded ? "opacity-55 grayscale" : ""} ${s.out ? "opacity-35" : ""}`}
              >
                {/* Hole cards (mucked once folded) */}
                {s.cards.length > 0 && !s.out && !folded && (
                  <div className={`flex ${isHuman ? "-space-x-4" : "-space-x-3"}`}>
                    {s.cards.map((c, ci) => (
                      <div key={c.id} className={done && winningCards.has(c.id) ? "-translate-y-2" : ""}>
                        <PlayingCard card={c} faceDown={!revealed} index={ci} size={isHuman ? (crowded ? "md" : "lg") : crowded || side ? "sm" : "md"} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col items-center gap-1">
                  {/* Name plate */}
                  <div
                    className={`relative flex items-center gap-2 rounded-2xl border-[3px] border-ink py-1.5 pr-3 pl-1.5 shadow-[3px_3px_0_0_var(--color-ink)] transition-colors ${
                      won ? "bg-daily text-ink" : isTurn ? "bg-pop text-paper" : "bg-ink text-paper"
                    } ${crowded ? "min-w-[7.5rem]" : "min-w-[11rem]"}`}
                  >
                    {isTurn && (
                      <motion.span
                        className="absolute -inset-2 rounded-[22px] border-[3px] border-daily"
                        animate={{ opacity: [1, 0.25, 1], scale: [1, 1.03, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full border-[3px] border-ink ${crowded ? "size-10 text-2xl" : "size-16 text-4xl"}`}
                      style={{ background: looks[i]?.colour }}
                      aria-hidden
                    >
                      {looks[i]?.avatar}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className={`block truncate font-extrabold ${crowded ? "max-w-[5.5rem] text-sm" : "max-w-[7rem] text-base"}`}>{s.name}</span>
                      <span className={`block font-mono font-bold ${crowded ? "text-sm" : "text-base"}`}>◎ {s.stack.toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Status badge */}
                  <div className="flex h-9 items-center">
                    <AnimatePresence mode="wait">
                      {won ? (
                        <motion.span
                          key="won"
                          className="block rounded-full border-[3px] border-ink bg-daily px-4 py-1 font-display text-sm whitespace-nowrap text-ink shadow-[2px_2px_0_0_var(--color-ink)]"
                          initial={{ scale: 2, rotate: -10, opacity: 0 }}
                          animate={{ scale: 1, rotate: -3, opacity: 1 }}
                        >
                          Wins ◎{winAmount.toLocaleString()}
                          {handName ? ` · ${handName}` : ""}
                        </motion.span>
                      ) : handName ? (
                        <span className="block rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-xs font-bold whitespace-nowrap text-ink">
                          {handName}
                        </span>
                      ) : thinking === i ? (
                        <motion.span key="think" className="flex gap-1 rounded-full border-2 border-ink bg-paper px-3 py-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          {[0, 1, 2].map((d) => (
                            <motion.span
                              key={d}
                              className="size-2 rounded-full bg-ink"
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.12 }}
                            />
                          ))}
                        </motion.span>
                      ) : s.lastAction ? (
                        <motion.span
                          key={s.lastAction}
                          className={`block rounded-full border-[3px] border-ink px-4 py-1 font-display text-sm whitespace-nowrap uppercase shadow-[2px_2px_0_0_var(--color-ink)] ${actionStyle(s.lastAction)}`}
                          initial={{ scale: 1.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          {s.lastAction}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
