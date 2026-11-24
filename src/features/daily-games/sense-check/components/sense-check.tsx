"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { GameHeader } from "@/components/games/game-header";
import { Toast, shareResult, useToast } from "@/components/games/toast";
import { ResetCountdown } from "@/components/home/reset-countdown";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { Modal } from "@/components/ui/modal";
import { siteConfig } from "@/config/site";
import { useDailyPuzzle } from "@/lib/use-daily-puzzle";
import {
  TESTS,
  average,
  gradeFor,
  paramsFor,
  recordResult,
  shareText,
  type Grade,
  type Stats,
} from "../logic.ts";
import { hasSeenHelp, loadRun, loadStats, markHelpSeen, saveRun, saveStats } from "../storage.ts";
import { AngleTest, CountTest, MotionTest, ProportionTest, RhythmTest, type TestResult } from "./tests";

export function SenseCheck() {
  const puzzle = useDailyPuzzle();
  if (puzzle === null) {
    return (
      <Frame>
        <GameHeader title="Sense Check" backHref="/daily-games" backLabel="Daily Games" badge="#—" />
      </Frame>
    );
  }
  return <Game key={puzzle} puzzle={puzzle} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[640px] px-4 pt-5 pb-10">{children}</div>;
}

const GRADE_BG: Record<Grade, string> = {
  S: "bg-pop text-paper",
  A: "bg-sports",
  B: "bg-daily",
  C: "bg-music",
  D: "bg-casino",
  F: "bg-miss text-paper",
};

function verdict(score: number) {
  if (score >= 95) return "Uncanny!";
  if (score >= 85) return "Sharp!";
  if (score >= 70) return "Pretty close";
  if (score >= 50) return "Not bad";
  if (score >= 25) return "Way off";
  return "Ouch";
}

function Game({ puzzle }: { puzzle: number }) {
  const params = useMemo(() => paramsFor(puzzle), [puzzle]);
  const [results, setResults] = useState<TestResult[]>(() => loadRun(puzzle));
  const [started, setStarted] = useState(() => loadRun(puzzle).length > 0);
  const [reviewing, setReviewing] = useState(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(() => (hasSeenHelp() ? null : "help"));
  const { toast, show } = useToast();

  const index = reviewing ? results.length - 1 : results.length;
  const finished = !reviewing && results.length >= TESTS.length;
  const scores = results.map((r) => r.score);

  const handleDone = (result: TestResult) => {
    const next = [...results, result];
    setResults(next);
    setReviewing(true);
    saveRun(puzzle, next);
    if (next.length === TESTS.length) {
      const updated = recordResult(stats, puzzle, average(next.map((r) => r.score)));
      setStats(updated);
      saveStats(updated);
    }
  };

  const goNext = (e: React.MouseEvent) => {
    setReviewing(false);
    if (results.length === TESTS.length && average(scores) >= 85) {
      burst({ x: e.clientX, y: e.clientY, count: 30 });
    }
  };

  const share = async () => {
    const message = await shareResult(`${shareText(siteConfig.name, puzzle, scores)}\n${window.location.href}`);
    if (message) show(message);
  };

  const closeDialog = () => {
    if (dialog === "help") markHelpSeen();
    setDialog(null);
  };

  const test = TESTS[index];

  return (
    <Frame>
      <GameHeader
        title="Sense Check"
        backHref="/daily-games"
        backLabel="Daily Games"
        badge={`#${puzzle}`}
        onHelp={() => setDialog("help")}
        onStats={() => setDialog("stats")}
      />

      {/* Progress pills */}
      <ol className="mt-5 grid grid-cols-5 gap-2" aria-label="Progress">
        {TESTS.map((t, i) => {
          const r = results[i];
          const current = started && !finished && i === index;
          return (
            <li
              key={t.kind}
              className={`flex flex-col items-center rounded-xl border-2 border-ink py-1.5 transition-colors ${
                r ? "bg-sports" : current ? "bg-daily" : "bg-paper"
              }`}
            >
              <span className="text-lg" aria-hidden>
                {t.emoji}
              </span>
              <span className="font-mono text-[11px] font-bold">{r ? r.score : current ? "now" : "—"}</span>
              <span className="sr-only">{`${t.name}: ${r ? `${r.score} points` : "not played"}`}</span>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-6">
        <Toast toast={toast} />

        {!started && (
          <motion.div
            className="brut rounded-3xl bg-paper p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="wide text-2xl font-black uppercase">Five tests. Trust your gut.</h2>
            <ul className="mt-4 space-y-3">
              {TESTS.map((t, i) => (
                <motion.li
                  key={t.kind}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                >
                  <span className="text-2xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <span>
                    <strong>{t.name}.</strong> <span className="text-ink-soft">{t.blurb}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              data-burst
              onClick={() => setStarted(true)}
              className="brut press mt-6 w-full rounded-full bg-pop py-3.5 font-extrabold text-paper"
            >
              Start today’s check
            </button>
            <p className="mt-3 text-center font-mono text-xs text-ink-soft">One attempt per day. Each test takes under a minute.</p>
          </motion.div>
        )}

        {started && !finished && test && (
          <motion.section
            key={test.kind}
            aria-labelledby="test-title"
            initial={{ opacity: 0, x: 60, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <p className="font-mono text-xs font-bold text-ink-soft">
              Test {index + 1} of {TESTS.length}
            </p>
            <h2 id="test-title" className="wide text-2xl font-black uppercase">
              {test.emoji} {test.name}
            </h2>
            <p className="mt-1 mb-5 text-ink-soft">{test.blurb}</p>

            {test.kind === "count" && <CountTest params={params.count} onDone={handleDone} />}
            {test.kind === "motion" && <MotionTest params={params.motion} onDone={handleDone} />}
            {test.kind === "angle" && <AngleTest params={params.angle} onDone={handleDone} />}
            {test.kind === "rhythm" && <RhythmTest params={params.rhythm} onDone={handleDone} />}
            {test.kind === "proportion" && <ProportionTest params={params.proportion} onDone={handleDone} />}

            {reviewing && results[index] && (
              <motion.div
                className="brut mx-auto mt-6 flex max-w-[520px] flex-wrap items-center justify-between gap-4 rounded-2xl bg-paper p-5"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.15 }}
                aria-live="polite"
              >
                <div>
                  <p className="font-display text-sm">{verdict(results[index].score)}</p>
                  <p className="font-display text-5xl leading-none">
                    <CountUp value={results[index].score} />
                    <span className="text-xl text-ink-soft">/100</span>
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold">
                    You: {results[index].yours} · Actual: {results[index].actual}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  className="brut press rounded-full bg-pop px-6 py-3 font-extrabold text-paper"
                  autoFocus
                >
                  {index + 1 < TESTS.length ? "Next test →" : "See my grade →"}
                </button>
              </motion.div>
            )}
          </motion.section>
        )}

        {finished && <Summary scores={scores} onShare={share} onStats={() => setDialog("stats")} />}
      </div>

      <Modal open={dialog === "help"} onClose={closeDialog} title="How to play">
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Five quick tests of your senses — counting, timing, angles, rhythm and proportion. Everyone gets the
            same tests each day.
          </p>
          <p>Each test scores 0–100. Your average becomes a grade from F to S.</p>
          <ul className="space-y-1.5">
            {TESTS.map((t) => (
              <li key={t.kind}>
                {t.emoji} <strong>{t.name}:</strong> {t.blurb}
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-ink-soft">Just for fun — this is not a medical or vision test.</p>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          className="brut press mt-6 w-full rounded-full bg-pop py-3 font-extrabold text-paper"
        >
          Got it
        </button>
      </Modal>

      <Modal open={dialog === "stats"} onClose={closeDialog} title="Your stats">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Played", value: stats.played },
            { label: "Average", value: stats.played ? Math.round(stats.totalAverage / stats.played) : 0 },
            { label: "Best", value: stats.best },
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
    </Frame>
  );
}

function Summary({ scores, onShare, onStats }: { scores: number[]; onShare: () => void; onStats: () => void }) {
  const avg = average(scores);
  const grade = gradeFor(avg);

  return (
    <motion.div
      className="brut rounded-3xl bg-paper p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-5">
        <motion.span
          className={`flex size-28 shrink-0 items-center justify-center rounded-3xl border-[3px] border-ink font-display text-7xl shadow-[6px_6px_0_0_var(--color-ink)] ${GRADE_BG[grade]}`}
          initial={{ scale: 3, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.2 }}
          aria-label={`Grade ${grade}`}
        >
          {grade}
        </motion.span>
        <div>
          <p className="font-display text-sm">Today’s grade</p>
          <p className="font-display text-6xl leading-none">
            <CountUp value={avg} />
          </p>
          <p className="font-mono text-xs font-bold text-ink-soft">average out of 100</p>
        </div>
      </div>

      <ol className="mt-6 space-y-2">
        {TESTS.map((t, i) => (
          <li key={t.kind} className="flex items-center gap-3 text-sm font-bold">
            <span className="w-32 shrink-0 truncate">
              {t.emoji} {t.name}
            </span>
            <span className="relative h-6 flex-1 overflow-hidden rounded-md border-2 border-ink bg-paper-deep">
              <motion.span
                className={`absolute inset-y-0 left-0 ${scores[i] >= 85 ? "bg-sports" : scores[i] >= 60 ? "bg-daily" : "bg-casino"}`}
                initial={{ width: 0 }}
                animate={{ width: `${scores[i]}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.4 + i * 0.08 }}
              />
            </span>
            <span className="w-8 text-right font-mono">{scores[i]}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-ink/30 pt-5">
        <ResetCountdown />
        <div className="flex gap-3">
          <button type="button" onClick={onStats} className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold">
            Stats
          </button>
          <button
            type="button"
            data-burst
            onClick={onShare}
            className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper"
          >
            Share result
          </button>
        </div>
      </div>
    </motion.div>
  );
}
