"use client";

import { AnimatePresence, LayoutGroup, motion, useAnimate } from "motion/react";
import { useState } from "react";
import { GameHeader } from "@/components/games/game-header";
import { Toast, shareResult, useToast } from "@/components/games/toast";
import { ResetCountdown } from "@/components/home/reset-countdown";
import { burst } from "@/components/motion/burst";
import { Modal } from "@/components/ui/modal";
import { siteConfig } from "@/config/site";
import { dailyItem } from "@/lib/daily";
import { readJSON, writeJSON } from "@/lib/storage";
import { useDailyPuzzle } from "@/lib/use-daily-puzzle";
import {
  EMPTY_STATS,
  MAX_MISTAKES,
  alreadyGuessed,
  checkGuess,
  dailyLayout,
  mistakes,
  recordResult,
  shareText,
  solvedGroups,
  statusOf,
  type State,
  type Stats,
} from "./logic.ts";
import { PUZZLES, type Puzzle } from "./puzzles.ts";

const SEED = 7717;
const GAME_KEY = "pg:four-by-four:v1:game";
const STATS_KEY = "pg:four-by-four:v1:stats";
const HELP_KEY = "pg:four-by-four:v1:seen-help";
const LEVEL_BG = ["bg-daily", "bg-sports", "bg-pop text-paper", "bg-music"];

export function FourByFour() {
  const puzzleNo = useDailyPuzzle();
  if (puzzleNo === null) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pt-5">
        <GameHeader title="Four by Four" backHref="/music-tv" backLabel="Music & TV" badge="#—" />
      </div>
    );
  }
  return <Game key={puzzleNo} puzzleNo={puzzleNo} puzzle={dailyItem(PUZZLES, puzzleNo, SEED)} />;
}

function Game({ puzzleNo, puzzle }: { puzzleNo: number; puzzle: Puzzle }) {
  const [state, setState] = useState<State>(() => {
    const saved = readJSON<{ puzzle: number; guesses: string[][] }>(GAME_KEY);
    return saved?.puzzle === puzzleNo && Array.isArray(saved.guesses) ? { guesses: saved.guesses } : { guesses: [] };
  });
  const [order, setOrder] = useState(() => dailyLayout(puzzle, puzzleNo * 31 + SEED));
  const [selected, setSelected] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>(() => ({ ...EMPTY_STATS, ...readJSON<Stats>(STATS_KEY) }));
  const [dialog, setDialog] = useState<"help" | "stats" | null>(() => (readJSON<boolean>(HELP_KEY) ? null : "help"));
  const [gridScope, animateGrid] = useAnimate<HTMLDivElement>();
  const { toast, show } = useToast();

  const status = statusOf(puzzle, state);
  const solved = solvedGroups(puzzle, state);
  // When the game is over, every group is revealed in level order.
  const revealed = status === "playing" ? solved : [...solved, ...[0, 1, 2, 3].filter((g) => !solved.includes(g))];
  const remaining = order.filter((item) => !revealed.some((g) => puzzle.groups[g].items.includes(item)));
  const mistakesMade = mistakes(puzzle, state);

  const toggle = (item: string) => {
    if (status !== "playing") return;
    setSelected((s) => (s.includes(item) ? s.filter((x) => x !== item) : s.length < 4 ? [...s, item] : s));
  };

  const submit = () => {
    if (selected.length !== 4 || status !== "playing") return;
    if (alreadyGuessed(state, selected)) {
      show("Already tried that one");
      return;
    }
    const result = checkGuess(puzzle, selected);
    const next: State = { guesses: [...state.guesses, selected] };
    setState(next);
    writeJSON(GAME_KEY, { puzzle: puzzleNo, guesses: next.guesses });

    if (result.kind === "correct") {
      setSelected([]);
    } else {
      show(result.kind === "oneAway" ? "One away…" : "Not a group", 1400);
      gridScope.current
        ?.querySelectorAll("[data-selected=true]")
        .forEach((el) => animateGrid(el, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 }));
    }

    const after = statusOf(puzzle, next);
    if (after !== "playing") {
      const updated = recordResult(stats, puzzleNo, after === "won", mistakes(puzzle, next));
      setStats(updated);
      writeJSON(STATS_KEY, updated);
      setSelected([]);
      if (after === "won") {
        const r = gridScope.current?.getBoundingClientRect();
        if (r) burst({ x: r.left + r.width / 2, y: r.top + r.height / 3, count: 34 });
      }
      window.setTimeout(() => setDialog("stats"), 1600);
    }
  };

  const shuffle = () => {
    setOrder((o) => {
      const copy = [...o];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const share = async () => {
    const message = await shareResult(`${shareText(siteConfig.name, puzzleNo, puzzle, state)}\n${window.location.href}`);
    if (message) show(message);
  };

  const closeDialog = () => {
    if (dialog === "help") writeJSON(HELP_KEY, true);
    setDialog(null);
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-3 pt-5 pb-10 sm:px-4">
      <GameHeader
        title="Four by Four"
        backHref="/music-tv"
        backLabel="Music & TV"
        badge={`#${puzzleNo}`}
        onHelp={() => setDialog("help")}
        onStats={() => setDialog("stats")}
      />
      <p className="mt-3 font-semibold text-ink-soft">Find four groups of four music & TV names.</p>

      <div ref={gridScope} className="relative mt-5">
        <Toast toast={toast} />
        <LayoutGroup>
          <div className="space-y-2">
            <AnimatePresence>
              {revealed.map((g) => {
                const group = puzzle.groups[g];
                return (
                  <motion.div
                    key={`group-${g}`}
                    layout
                    className={`brut-sm flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl px-3 py-2 text-center ${LEVEL_BG[group.level]}`}
                    initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  >
                    <p className="font-display text-sm uppercase">{group.label}</p>
                    <p className="text-sm font-semibold">{group.items.join(" · ")}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className={`grid grid-cols-4 gap-2 ${revealed.length ? "mt-2" : ""}`}>
            {remaining.map((item) => {
              const isSelected = selected.includes(item);
              return (
                <motion.button
                  key={item}
                  layout
                  type="button"
                  data-selected={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => toggle(item)}
                  whileTap={{ scale: 0.92 }}
                  animate={{ y: isSelected ? -3 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`flex min-h-[4.5rem] items-center justify-center rounded-2xl border-[2.5px] border-ink px-1 text-center text-[11px] leading-tight font-extrabold break-words uppercase transition-colors sm:text-sm ${
                    isSelected ? "bg-ink text-paper shadow-[3px_3px_0_0_var(--color-pop)]" : "bg-paper shadow-[3px_3px_0_0_var(--color-ink)] hover:bg-paper-deep"
                  }`}
                >
                  {item}
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {status === "playing" ? (
        <>
          <div className="mt-5 flex items-center justify-center gap-2 font-mono text-sm font-bold">
            Mistakes left:
            {Array.from({ length: MAX_MISTAKES }, (_, i) => (
              <motion.span
                key={i}
                className={`size-3.5 rounded-full border-2 border-ink ${i < MAX_MISTAKES - mistakesMade ? "bg-casino" : "bg-transparent"}`}
                animate={{ scale: i < MAX_MISTAKES - mistakesMade ? 1 : 0.6 }}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={shuffle} className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold">
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={!selected.length}
              className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold disabled:opacity-40"
            >
              Deselect
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={selected.length !== 4}
              className="brut press rounded-full bg-pop px-7 py-2.5 font-extrabold text-paper disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </>
      ) : (
        <motion.div
          className="brut mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-paper p-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div>
            <p className="font-display text-lg">{status === "won" ? (mistakesMade ? "Solved!" : "Perfect!") : "Better luck tomorrow"}</p>
            <p className="font-mono text-xs font-bold text-ink-soft">
              {mistakesMade} mistake{mistakesMade === 1 ? "" : "s"}
            </p>
          </div>
          <ResetCountdown />
          <button
            type="button"
            data-burst
            onClick={share}
            className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper"
          >
            Share result
          </button>
        </motion.div>
      )}

      <Modal open={dialog === "help"} onClose={closeDialog} title="How to play">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Sixteen names from music and TV hide <strong>four groups of four</strong> — songs by the same artist, shows
            of the same type, bands with something in common…
          </p>
          <p>Select four and submit. Get a group right and it locks in. You can make four mistakes.</p>
          <p>
            Groups run from straightforward <span className="rounded bg-daily px-1">yellow</span> to sneaky{" "}
            <span className="rounded bg-music px-1">pink</span>. Watch out for names that seem to fit more than one group!
          </p>
        </div>
        <button type="button" onClick={closeDialog} className="brut press mt-6 w-full rounded-full bg-pop py-3 font-extrabold text-paper">
          Let’s play
        </button>
      </Modal>

      <Modal open={dialog === "stats"} onClose={closeDialog} title="Your stats">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Played", value: stats.played },
            { label: "Win %", value: stats.played ? Math.round((stats.wins / stats.played) * 100) : 0 },
            { label: "Perfect", value: stats.perfect },
            { label: "Streak", value: stats.currentStreak },
          ].map((n) => (
            <div key={n.label}>
              <dd className="font-display text-3xl">{n.value}</dd>
              <dt className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">{n.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-5">
          <ResetCountdown />
        </div>
      </Modal>
    </div>
  );
}
