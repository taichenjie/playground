"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useId, useRef, useState } from "react";
import { GameHeader } from "@/components/games/game-header";
import { Toast, shareResult, useToast } from "@/components/games/toast";
import { ResetCountdown } from "@/components/home/reset-countdown";
import { burst } from "@/components/motion/burst";
import { Modal } from "@/components/ui/modal";
import { siteConfig } from "@/config/site";
import { readJSON, writeJSON } from "@/lib/storage";
import {
  cluesShown,
  emptyStats,
  isCorrect,
  normalize,
  pointsFor,
  recordResult,
  shareText,
  statusFor,
  suggest,
  type Attempt,
  type ClueStats,
} from "./logic.ts";

export type ClueGameProps = {
  /** Storage namespace, e.g. "guess-the-song". */
  id: string;
  title: string;
  backHref: string;
  backLabel: string;
  puzzle: number;
  /** "song", "player"… used in prompts. */
  noun: string;
  accepted: string[];
  answer: string;
  answerDetail: string;
  /** Every possible answer, for the autocomplete. */
  options: string[];
  clues: string[];
  /** Always-visible content above the clues (e.g. a career timeline). */
  intro?: React.ReactNode;
  help: React.ReactNode;
  source: string;
  /** Background class for the clue cards. */
  accent: string;
};

export function ClueGame(props: ClueGameProps) {
  const { id, puzzle, accepted, clues, options, noun } = props;
  const max = clues.length;
  const gameKey = `pg:${id}:v1:game`;
  const statsKey = `pg:${id}:v1:stats`;
  const helpKey = `pg:${id}:v1:seen-help`;

  const [attempts, setAttempts] = useState<Attempt[]>(() => {
    const saved = readJSON<{ puzzle: number; attempts: Attempt[] }>(gameKey);
    return saved?.puzzle === puzzle && Array.isArray(saved.attempts) ? saved.attempts.slice(0, max) : [];
  });
  const [stats, setStats] = useState<ClueStats>(() => ({ ...emptyStats(max), ...readJSON<ClueStats>(statsKey) }));
  const [dialog, setDialog] = useState<"help" | "stats" | null>(() =>
    readJSON<boolean>(helpKey) ? null : "help",
  );
  const [input, setInput] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [inputScope, animateInput] = useAnimate<HTMLDivElement>();
  const boardRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const { toast, show } = useToast();

  const status = statusFor(attempts, accepted, max);
  const shown = cluesShown(attempts, max, status);
  const points = pointsFor(attempts, status, max);
  const suggestions = status === "playing" ? suggest(input, options) : [];

  const record = (next: Attempt[]) => {
    setAttempts(next);
    writeJSON(gameKey, { puzzle, attempts: next });
    const result = statusFor(next, accepted, max);
    if (result === "playing") return;
    const updated = recordResult(stats, puzzle, result === "won", next.length);
    setStats(updated);
    writeJSON(statsKey, updated);
    const r = boardRef.current?.getBoundingClientRect();
    if (result === "won" && r) burst({ x: r.left + r.width / 2, y: r.top + 80, count: 30 });
    window.setTimeout(() => setDialog("stats"), 1800);
  };

  const guess = (text: string) => {
    if (status !== "playing") return;
    const value = text.trim();
    if (!value) return;
    const known = isCorrect(value, accepted) || options.some((o) => normalize(o) === normalize(value));
    if (!known) {
      show(`Pick a ${noun} from the list`);
      if (inputScope.current) animateInput(inputScope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
      return;
    }
    if (attempts.some((a) => a !== null && normalize(a) === normalize(value))) {
      show("You already tried that");
      return;
    }
    setInput("");
    setHighlight(0);
    if (!isCorrect(value, accepted)) {
      show(attempts.length + 1 < max ? "Not it — here’s another clue" : "Out of guesses!");
      if (inputScope.current) animateInput(inputScope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
    }
    record([...attempts, value]);
  };

  const skip = () => {
    if (status !== "playing") return;
    record([...attempts, null]);
  };

  const share = async () => {
    const message = await shareResult(
      `${siteConfig.name} ${shareText(props.title, puzzle, attempts, accepted, max)}\n${window.location.href}`,
    );
    if (message) show(message);
  };

  const closeDialog = () => {
    if (dialog === "help") writeJSON(helpKey, true);
    setDialog(null);
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-5 pb-10">
      <GameHeader
        title={props.title}
        backHref={props.backHref}
        backLabel={props.backLabel}
        badge={`#${puzzle}`}
        onHelp={() => setDialog("help")}
        onStats={() => setDialog("stats")}
      />

      <div ref={boardRef} className="relative mt-6 space-y-4">
        <Toast toast={toast} />

        {props.intro}

        {/* Clues */}
        <ol className="space-y-2.5" aria-label="Clues">
          {clues.map((clue, i) => {
            const open = i < shown;
            return (
              <li key={i} className="[perspective:800px]">
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.div
                      key="open"
                      className={`brut-sm flex gap-3 rounded-2xl p-3.5 ${props.accent}`}
                      initial={{ rotateX: -90, opacity: 0 }}
                      animate={{ rotateX: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-xs">
                        {i + 1}
                      </span>
                      <p className="font-semibold leading-snug">{clue}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      exit={{ rotateX: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/30 p-3.5 text-ink/40"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full border-2 border-ink/30 font-display text-xs">
                        {i + 1}
                      </span>
                      <span className="font-mono text-sm">Locked · {max - i} pts if solved here</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        {/* Attempts so far */}
        {attempts.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Your guesses">
            {attempts.map((a, i) => {
              const right = a !== null && isCorrect(a, accepted);
              return (
                <motion.li
                  key={i}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${
                    a === null ? "bg-paper text-ink-soft" : right ? "bg-sports" : "bg-casino line-through decoration-2"
                  }`}
                >
                  {a === null ? "Skipped" : a}
                </motion.li>
              );
            })}
          </ul>
        )}

        {/* Input or result */}
        {status === "playing" ? (
          <div ref={inputScope} className="relative">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                guess(suggestions[highlight] && input ? suggestions[highlight] : input);
              }}
            >
              <div className="relative flex-1">
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlight((h) => Math.max(h - 1, 0));
                    }
                    if (e.key === "Escape") setInput("");
                  }}
                  placeholder={`Type a ${noun}…`}
                  role="combobox"
                  aria-expanded={suggestions.length > 0}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={suggestions.length ? `${listId}-${highlight}` : undefined}
                  aria-label={`Your guess: name the ${noun}`}
                  autoComplete="off"
                  className="brut w-full rounded-full bg-paper px-5 py-3 font-semibold outline-none placeholder:text-ink/40"
                />
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.ul
                      id={listId}
                      role="listbox"
                      className="brut absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-2xl bg-paper"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                    >
                      {suggestions.map((s, i) => (
                        <li
                          key={s}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === highlight}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            guess(s);
                          }}
                          onPointerEnter={() => setHighlight(i)}
                          className={`cursor-pointer px-4 py-2 font-semibold ${i === highlight ? "bg-daily" : ""}`}
                        >
                          {s}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
              <button type="submit" className="brut press rounded-full bg-pop px-5 font-extrabold text-paper">
                Guess
              </button>
            </form>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ink-soft">
                {max - attempts.length} {max - attempts.length === 1 ? "guess" : "guesses"} left
              </span>
              <button
                type="button"
                onClick={skip}
                className="rounded-full px-3 py-1 font-mono text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-paper-deep"
              >
                {attempts.length + 1 < max ? "Skip — show next clue" : "Give up"}
              </button>
            </div>
          </div>
        ) : (
          <motion.div
            className="brut relative rounded-3xl bg-paper p-6"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <motion.span
              className={`absolute -top-4 right-5 rounded-lg border-[2.5px] border-ink px-3 py-1 font-display text-sm shadow-[3px_3px_0_0_var(--color-ink)] ${
                status === "won" ? "bg-sports" : "bg-casino"
              }`}
              initial={{ scale: 2.5, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 6, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.25 }}
            >
              {status === "won" ? `+${points} pts` : "Not today"}
            </motion.span>
            <p className="font-mono text-xs font-bold text-ink-soft">The answer</p>
            <p className="wide text-3xl leading-tight font-black uppercase">{props.answer}</p>
            <p className="mt-1 font-semibold text-ink-soft">{props.answerDetail}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-ink/30 pt-4">
              <ResetCountdown />
              <button
                type="button"
                data-burst
                onClick={share}
                className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper"
              >
                Share result
              </button>
            </div>
            <p className="mt-4 font-mono text-[10px] text-ink-soft">Facts: {props.source}</p>
          </motion.div>
        )}
      </div>

      <Modal open={dialog === "help"} onClose={closeDialog} title="How to play">
        <div className="space-y-3 text-sm leading-relaxed">{props.help}</div>
        <button
          type="button"
          onClick={closeDialog}
          className="brut press mt-6 w-full rounded-full bg-pop py-3 font-extrabold text-paper"
        >
          Let’s go
        </button>
      </Modal>

      <Modal open={dialog === "stats"} onClose={closeDialog} title="Your stats">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Played", value: stats.played },
            { label: "Win %", value: stats.played ? Math.round((stats.wins / stats.played) * 100) : 0 },
            { label: "Streak", value: stats.currentStreak },
            { label: "Best", value: stats.maxStreak },
          ].map((n) => (
            <div key={n.label}>
              <dd className="font-display text-3xl">{n.value}</dd>
              <dt className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">{n.label}</dt>
            </div>
          ))}
        </dl>
        <h3 className="mt-6 font-display text-sm">Solved on clue</h3>
        <ol className="mt-3 space-y-1.5">
          {stats.distribution.map((count, i) => {
            const most = Math.max(1, ...stats.distribution);
            const today = status === "won" && attempts.length === i + 1;
            return (
              <li key={i} className="flex items-center gap-2 font-mono text-sm font-bold">
                <span className="w-3">{i + 1}</span>
                <motion.span
                  className={`flex h-6 items-center justify-end rounded-md border-2 border-ink px-1.5 ${today ? "bg-sports" : "bg-paper-deep"}`}
                  initial={{ width: "1.75rem" }}
                  animate={{ width: `max(1.75rem, ${(count / most) * 100}%)` }}
                  transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.2 + i * 0.05 }}
                >
                  {count}
                </motion.span>
              </li>
            );
          })}
        </ol>
        {status !== "playing" && (
          <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-5">
            <ResetCountdown />
          </div>
        )}
      </Modal>
    </div>
  );
}
