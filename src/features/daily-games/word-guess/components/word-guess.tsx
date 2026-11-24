"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { burst } from "@/components/motion/burst";
import { siteConfig } from "@/config/site";
import {
  MAX_GUESSES,
  WORD_LENGTH,
  answerFor,
  evaluateGuess,
  keyboardMarks,
  puzzleNumberFor,
  recordResult,
  shareText,
  statusFor,
} from "../logic.ts";
import { hasSeenHelp, loadGuesses, loadStats, markHelpSeen, saveGuesses, saveStats } from "../storage.ts";
import { HelpContent } from "./help-content";
import { Keyboard } from "./keyboard";
import { Modal } from "@/components/ui/modal";
import { StatsContent } from "./stats-content";
import { Tile } from "./tile";

/* Today's puzzle number comes from the visitor's local date, so it's only
 * known in the browser. The server renders an empty board. */
function subscribeToClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

export function WordGuess() {
  const puzzle = useSyncExternalStore(
    subscribeToClock,
    () => puzzleNumberFor(new Date()),
    () => null,
  );
  if (puzzle === null) return <Shell puzzle={null} />;
  // Keyed so a fresh game starts automatically at midnight.
  return <Game key={puzzle} puzzle={puzzle} />;
}

const PRAISE = ["Unreal!", "Brilliant!", "Superb!", "Nice one!", "Solid!", "Phew!"];
const REVEAL_MS = WORD_LENGTH * 250 + 350;

function Game({ puzzle }: { puzzle: number }) {
  const answer = answerFor(puzzle);

  const [guesses, setGuesses] = useState<string[]>(() => loadGuesses(puzzle));
  const [current, setCurrent] = useState("");
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [stats, setStats] = useState(loadStats);
  const [valid, setValid] = useState<Set<string> | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(() => {
    if (!hasSeenHelp()) return "help";
    return statusFor(loadGuesses(puzzle), answer) === "playing" ? null : "stats";
  });

  const [rowScope, animateRow] = useAnimate<HTMLDivElement>();
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const toastId = useRef(0);

  const status = statusFor(guesses, answer);
  const settled = revealingRow === null;
  // Hold back the newest guess's colours on the keyboard until its tiles have flipped.
  const keyMarks = keyboardMarks(settled ? guesses : guesses.slice(0, -1), answer);

  // The guess dictionary is ~60 KB, so it loads separately after the page.
  useEffect(() => {
    let alive = true;
    import("../valid-guesses").then(({ VALID_GUESSES }) => {
      if (alive) setValid(new Set(VALID_GUESSES.match(/.{5}/g)));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const showToast = (text: string, ms = 1500) => {
    const id = ++toastId.current;
    setToast({ id, text });
    later(() => setToast((t) => (t?.id === id ? null : t)), ms);
  };

  const shake = () => {
    if (rowScope.current) {
      animateRow(rowScope.current, { x: [0, -12, 12, -9, 9, -5, 5, 0] }, { duration: 0.45 });
    }
  };

  const canType = status === "playing" && settled && dialog === null;

  const addLetter = (letter: string) => {
    if (!canType) return;
    setCurrent((c) => (c.length < WORD_LENGTH ? c + letter : c));
  };

  const removeLetter = () => {
    if (!canType) return;
    setCurrent((c) => c.slice(0, -1));
  };

  const submit = () => {
    if (!canType) return;
    if (current.length < WORD_LENGTH) {
      showToast("Not enough letters");
      shake();
      return;
    }
    if (!valid) {
      showToast("Loading words…");
      return;
    }
    if (!valid.has(current)) {
      showToast("Not in word list");
      shake();
      return;
    }

    const next = [...guesses, current];
    const result = statusFor(next, answer);
    setGuesses(next);
    setCurrent("");
    setRevealingRow(next.length - 1);
    saveGuesses(puzzle, next);

    if (result !== "playing") {
      const updated = recordResult(stats, puzzle, result === "won", next.length);
      setStats(updated);
      saveStats(updated);
    }

    later(() => {
      setRevealingRow(null);
      if (result === "won") {
        setCelebrate(true);
        showToast(PRAISE[next.length - 1], 1800);
        const r = boardRef.current?.getBoundingClientRect();
        if (r) {
          burst({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 28 });
          later(() => burst({ x: r.left + r.width * 0.2, y: r.top + r.height * 0.3, count: 18 }), 250);
          later(() => burst({ x: r.left + r.width * 0.8, y: r.top + r.height * 0.3, count: 18 }), 450);
        }
        later(() => setDialog("stats"), 2000);
      } else if (result === "lost") {
        showToast(answer.toUpperCase(), 2600);
        later(() => setDialog("stats"), 2400);
      }
    }, REVEAL_MS);
  };

  const share = async () => {
    const text = `${shareText(siteConfig.name, puzzle, guesses, answer)}\n${window.location.href}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard");
    } catch (err) {
      if ((err as Error).name !== "AbortError") showToast("Couldn’t copy — try again");
    }
  };

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace") {
      removeLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key.toLowerCase());
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const closeDialog = () => {
    if (dialog === "help") markHelpSeen();
    setDialog(null);
  };

  const winningRow = status === "won" ? guesses.length - 1 : -1;

  return (
    <Shell
      puzzle={puzzle}
      onHelp={() => setDialog("help")}
      onStats={() => setDialog("stats")}
      toast={toast}
      boardRef={boardRef}
      board={Array.from({ length: MAX_GUESSES }, (_, row) => {
        if (row < guesses.length) {
          const guess = guesses[row];
          const marks = evaluateGuess(guess, answer);
          return (
            <div
              key={row}
              className="grid grid-cols-5 gap-1.5 sm:gap-2"
              role="row"
              aria-label={`Guess ${row + 1}: ${guess.toUpperCase()}`}
            >
              {guess.split("").map((ch, i) => (
                <Tile
                  key={i}
                  index={i}
                  letter={ch}
                  mark={marks[i]}
                  reveal={row === revealingRow}
                  bounce={celebrate && row === winningRow}
                />
              ))}
            </div>
          );
        }
        const isCurrent = row === guesses.length && status === "playing";
        return (
          <div
            key={row}
            ref={isCurrent ? rowScope : undefined}
            className="grid grid-cols-5 gap-1.5 sm:gap-2"
            role="row"
            aria-label={isCurrent ? `Current guess: ${current.toUpperCase() || "empty"}` : "Empty row"}
          >
            {Array.from({ length: WORD_LENGTH }, (_, i) => (
              <Tile key={i} index={i} letter={isCurrent ? current[i] : undefined} />
            ))}
          </div>
        );
      })}
      keyboard={
        <Keyboard
          marks={keyMarks}
          onLetter={addLetter}
          onEnter={submit}
          onDelete={removeLetter}
          disabled={status !== "playing"}
        />
      }
      dialogs={
        <>
          <Modal open={dialog === "help"} onClose={closeDialog} title="How to play">
            <HelpContent />
            <button
              type="button"
              onClick={closeDialog}
              className="brut press mt-6 w-full rounded-full bg-pop py-3 font-extrabold text-paper"
            >
              Let’s play
            </button>
          </Modal>
          <Modal open={dialog === "stats"} onClose={closeDialog} title="Your stats">
            <StatsContent
              stats={stats}
              status={settled ? status : "playing"}
              answer={answer}
              guessCount={guesses.length}
              onShare={share}
            />
          </Modal>
        </>
      }
    />
  );
}

/** Page chrome around the game. Rendered alone (empty board) on the server. */
function Shell({
  puzzle,
  onHelp,
  onStats,
  toast = null,
  board,
  boardRef,
  keyboard,
  dialogs,
}: {
  puzzle: number | null;
  onHelp?: () => void;
  onStats?: () => void;
  toast?: { id: number; text: string } | null;
  board?: React.ReactNode;
  boardRef?: React.RefObject<HTMLDivElement | null>;
  keyboard?: React.ReactNode;
  dialogs?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[540px] flex-col px-3 pt-5 pb-10 sm:px-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Link href="/daily-games" className="font-mono text-xs font-bold text-ink-soft hover:text-ink">
            ← Daily Games
          </Link>
          <h1 className="wide mt-1 text-3xl leading-none font-black uppercase sm:text-4xl">Word Guess</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 font-mono text-sm font-bold">#{puzzle ?? "—"}</span>
          <button
            type="button"
            onClick={onHelp}
            disabled={!onHelp}
            aria-label="How to play"
            className="brut-sm press flex size-10 items-center justify-center rounded-full bg-paper font-display text-lg"
          >
            ?
          </button>
          <button
            type="button"
            onClick={onStats}
            disabled={!onStats}
            aria-label="Your stats"
            className="brut-sm press flex size-10 items-center justify-center rounded-full bg-daily"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
              <rect x="3" y="12" width="4.5" height="9" rx="1" />
              <rect x="9.75" y="6" width="4.5" height="15" rx="1" />
              <rect x="16.5" y="3" width="4.5" height="18" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative mt-5">
        {/* Toast */}
        <div className="pointer-events-none absolute inset-x-0 -top-2 z-20 flex justify-center" aria-live="assertive">
          <AnimatePresence>
            {toast && (
              <motion.p
                key={toast.id}
                className="rounded-xl border-2 border-ink bg-ink px-4 py-2 font-extrabold text-paper shadow-[3px_3px_0_0_var(--color-daily)]"
                initial={{ opacity: 0, y: -16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                {toast.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div
          ref={boardRef}
          role="grid"
          aria-label="Game board"
          className="mx-auto grid w-full max-w-[340px] gap-1.5 [perspective:900px] sm:gap-2"
        >
          {board ??
            Array.from({ length: MAX_GUESSES }, (_, row) => (
              <div key={row} className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {Array.from({ length: WORD_LENGTH }, (_, i) => (
                  <Tile key={i} index={i} />
                ))}
              </div>
            ))}
        </div>
      </div>

      <div className="mt-6">{keyboard}</div>
      {dialogs}
    </div>
  );
}
