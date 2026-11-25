"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { Drawer } from "@/components/ui/drawer";
import { readJSON, writeJSON } from "@/lib/storage";
import { useHydrated } from "@/lib/use-hydrated";
import { PlayingCard } from "../../components/playing-card";
import {
  MAX_UNITS,
  SPEEDS,
  acceptableTrueCounts,
  betUnits,
  decksLeft,
  grade,
  hiLo,
  makeDrill,
  runningCount,
  scoreFor,
  trueCount,
  type Check,
  type Drill,
  type Mode,
  type SpeedId,
} from "../logic.ts";

const KEY = "pg:counting:v1";
type Saved = { mode: Mode; speed: SpeedId; assist: boolean; best: Record<string, number>; drills: number };
const DEFAULTS: Saved = { mode: "deck", speed: "rookie", assist: false, best: {}, drills: 0 };

type Step = "running" | "true" | "bet";
type Quiz = { check: Check; step: Step; answer: string; result: null | { ok: boolean; expected: string; points: number } };
type Tally = { score: number; streak: number; bestStreak: number; asked: number; correct: number };
const NEW_TALLY: Tally = { score: 0, streak: 0, bestStreak: 0, asked: 0, correct: 0 };

const MODES: { id: Mode; name: string; blurb: string }[] = [
  { id: "deck", name: "Deck countdown", blurb: "One deck, one card at a time. Check your count every 13 cards — it should end at 0." },
  { id: "shoe", name: "Shoe drill", blurb: "A six-deck shoe dealt in hands. Keep the running count, convert to a true count and size your bet." },
];

const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

export function Counting() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-3 pt-3 sm:px-4">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Card counting</h1>
        <div className="mt-4 h-[440px] animate-pulse rounded-[40px]" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }
  return <Trainer />;
}

function Trainer() {
  const [saved, setSaved] = useState<Saved>(() => ({ ...DEFAULTS, ...readJSON<Partial<Saved>>(KEY) }));
  const persist = (next: Saved) => {
    setSaved(next);
    writeJSON(KEY, next);
  };

  const [phase, setPhase] = useState<"setup" | "dealing" | "quiz" | "summary">("setup");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [group, setGroup] = useState(0);
  const [shown, setShown] = useState(0);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tally, setTally] = useState<Tally>(NEW_TALLY);
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  /** Card count at which the last quiz was finished, so dealing can carry on past it. */
  const [answeredAt, setAnsweredAt] = useState(-1);

  const speed = SPEEDS.find((s) => s.id === saved.speed)!;
  const scoring = !saved.assist;

  const start = () => {
    setDrill(makeDrill(saved.mode));
    setGroup(0);
    setShown(0);
    setQuiz(null);
    setTally(NEW_TALLY);
    setPaused(false);
    setAnsweredAt(-1);
    setPhase("dealing");
  };

  // Deal the next group of cards on a timer.
  const advance = useEffectEvent(() => {
    if (!drill) return;
    const next = shown + drill.groups[group];
    setShown(next);
    setGroup(group + 1);
    const check = drill.checks.find((c) => c.after === next);
    if (check) {
      // Give the last cards a moment on screen before the quiz.
      window.setTimeout(() => {
        setQuiz({ check, step: "running", answer: "", result: null });
        setPhase("quiz");
      }, speed.ms * 0.9);
    }
  });
  useEffect(() => {
    if (phase !== "dealing" || paused || !drill) return;
    const atCheck = shown > 0 && shown !== answeredAt && drill.checks.some((c) => c.after === shown);
    if (atCheck) return;
    const delay = shown === 0 ? 500 : speed.ms * (drill.groups[group - 1] ?? 1);
    const t = window.setTimeout(advance, delay);
    return () => window.clearTimeout(t);
  }, [phase, paused, drill, shown, group, speed.ms, answeredAt]);

  if (!drill || phase === "setup") return <Setup saved={saved} persist={persist} onStart={start} onHelp={() => setHelp(true)} help={help} setHelp={setHelp} />;

  const seen = drill.cards.slice(0, shown);
  const rc = runningCount(seen);
  const cardsLeft = drill.decks * 52 - shown;
  const decks = decksLeft(cardsLeft);
  const tc = trueCount(rc, decks);
  const lastGroupSize = group > 0 ? drill.groups[group - 1] : 0;
  const onTable = seen.slice(shown - lastGroupSize);
  const bestKey = `${saved.mode}-${saved.speed}`;

  const expectedFor = (step: Step) =>
    step === "running" ? [rc] : step === "true" ? acceptableTrueCounts(rc, decks) : [betUnits(tc)];

  const submit = () => {
    if (!quiz || quiz.result) return;
    const value = Number(quiz.answer);
    if (quiz.answer.trim() === "" || Number.isNaN(value)) return;
    const expected = expectedFor(quiz.step);
    const ok = expected.includes(value);
    const kind = quiz.step === "running" ? "running" : quiz.step === "true" ? "trueCount" : "bet";
    const points = ok && scoring ? scoreFor(kind, saved.speed, tally.streak) : 0;
    const streak = ok ? tally.streak + 1 : 0;
    setTally({
      score: tally.score + points,
      streak,
      bestStreak: Math.max(tally.bestStreak, streak),
      asked: tally.asked + 1,
      correct: tally.correct + (ok ? 1 : 0),
    });
    const shownExpected = quiz.step === "running" ? fmt(rc) : quiz.step === "true" ? expected.map(fmt).join(" or ") : `${expected[0]} unit${expected[0] > 1 ? "s" : ""}`;
    setQuiz({ ...quiz, result: { ok, expected: shownExpected, points } });
    if (ok && streak > 0 && streak % 5 === 0) burst({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 28 });
  };

  const next = () => {
    if (!quiz) return;
    // After a running-count check on a true-count checkpoint, move on to the true count, then the bet.
    if (quiz.check.askTrue && quiz.step === "running") return setQuiz({ ...quiz, step: "true", answer: "", result: null });
    if (quiz.check.askTrue && quiz.step === "true") return setQuiz({ ...quiz, step: "bet", answer: "", result: null });
    setQuiz(null);
    setAnsweredAt(shown);
    if (shown >= drill.cards.length) {
      const key = bestKey;
      const best = Math.max(saved.best[key] ?? 0, scoring ? tally.score : 0);
      persist({ ...saved, best: { ...saved.best, [key]: best }, drills: saved.drills + 1 });
      setPhase("summary");
      if (scoring && tally.score > (saved.best[key] ?? 0)) burst({ x: window.innerWidth / 2, y: window.innerHeight / 3, count: 60 });
    } else {
      setPhase("dealing");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-3 pt-2.5 pb-4 sm:px-4">
      <KeyHandler phase={phase} quiz={quiz} setQuiz={setQuiz} submit={submit} next={next} togglePause={() => setPaused((p) => !p)} />

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Card counting</h1>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper">
          Hi-Lo · {MODES.find((m) => m.id === saved.mode)!.name} · {speed.label}
          {saved.assist ? " · assist (no score)" : ""}
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {phase !== "summary" && (
            <button type="button" onClick={() => setPaused((p) => !p)} disabled={phase !== "dealing"} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold disabled:opacity-40">
              {paused ? "▶ Resume" : "❚❚ Pause"}
            </button>
          )}
          <button type="button" onClick={() => setHelp(true)} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            📜<span className="hidden sm:inline"> How Hi-Lo works</span>
          </button>
          <button type="button" onClick={() => setPhase("setup")} className="brut-sm press rounded-full bg-casino px-3 py-1 text-xs font-extrabold">
            Quit drill
          </button>
        </div>
      </div>

      {/* Score strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Score", value: <CountUp value={tally.score} duration={0.5} /> },
          { label: "Streak", value: `🔥 ${tally.streak}` },
          { label: "Accuracy", value: tally.asked ? `${Math.round((tally.correct / tally.asked) * 100)}%` : "—" },
          { label: "Best", value: (saved.best[bestKey] ?? 0).toLocaleString() },
        ].map((b) => (
          <div key={b.label} className="rounded-2xl border-2 px-3 py-1.5 text-center" style={{ borderColor: "rgba(232,184,74,0.45)", background: "rgba(0,0,0,0.35)" }}>
            <p className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "rgba(243,237,226,0.7)" }}>
              {b.label}
            </p>
            <p className="font-display text-[clamp(1.1rem,2.2vw,1.6rem)] leading-tight text-gold">{b.value}</p>
          </div>
        ))}
      </div>

      {/* Felt */}
      <div
        className="relative grid min-h-[400px] grid-cols-[70px_1fr_70px] items-center gap-3 overflow-hidden rounded-[36px] border-[3px] border-ink px-3 py-5 text-paper sm:grid-cols-[96px_1fr_96px] sm:px-6"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #1d8a59 0%, #136b44 55%, #0e5636 100%)",
          boxShadow: "inset 0 0 0 6px #0a3f27, inset 0 0 0 8px #e8b84a55, 0 14px 30px rgba(0,0,0,0.5)",
        }}
      >
        <Tray label="Shoe" cards={cardsLeft} decks={drill.decks} colour="#3b5bff" />

        <div className="relative flex min-h-[300px] flex-col items-center justify-center">
          <p className="absolute top-0 font-mono text-[11px] font-bold" style={{ color: "rgba(243,237,226,0.7)" }}>
            Card {shown} of {drill.cards.length}
          </p>
          <AnimatePresence mode="popLayout">
            {phase !== "quiz" && phase !== "summary" && (
              <motion.div key={`g-${group}`} className="flex flex-wrap items-end justify-center gap-3" exit={{ x: 260, y: -40, opacity: 0, rotate: 12, transition: { duration: 0.25 } }}>
                {onTable.map((c, i) => (
                  <div key={c.id} className="flex flex-col items-center gap-2">
                    <PlayingCard card={c} size="lg" index={i} />
                    {saved.assist && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="rounded-full border-2 border-ink px-2 font-display text-sm text-ink"
                        style={{ background: hiLo(c) > 0 ? "#3dd68c" : hiLo(c) < 0 ? "#ff5a3c" : "#f3ede2" }}
                      >
                        {fmt(hiLo(c))}
                      </motion.span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {saved.assist && phase === "dealing" && (
            <p className="mt-4 font-display text-lg text-gold">Running count {fmt(rc)}</p>
          )}
          {paused && phase === "dealing" && <p className="mt-4 font-display text-2xl text-gold">Paused</p>}

          <AnimatePresence>
            {phase === "quiz" && quiz && (
              <QuizPanel key={`${quiz.check.after}-${quiz.step}`} quiz={quiz} setQuiz={setQuiz} submit={submit} next={next} rc={rc} decks={decks} />
            )}
          </AnimatePresence>

          {phase === "summary" && <Summary tally={tally} best={saved.best[bestKey] ?? 0} scoring={scoring} onAgain={start} onSetup={() => setPhase("setup")} />}
        </div>

        <Tray label="Discards" cards={shown} decks={drill.decks} colour="#e8b84a" />
      </div>
      <p className="text-center font-mono text-[10px] text-ink-soft">
        Type the number and press Enter · Space pauses · Training only — no chips are won or lost here.
      </p>

      <Drawer open={help} onClose={() => setHelp(false)} title="How Hi-Lo works">
        <HowItWorks />
      </Drawer>
    </div>
  );
}

function KeyHandler({
  phase,
  quiz,
  setQuiz,
  submit,
  next,
  togglePause,
}: {
  phase: string;
  quiz: Quiz | null;
  setQuiz: (q: Quiz) => void;
  submit: () => void;
  next: () => void;
  togglePause: () => void;
}) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (phase === "dealing" && e.key === " ") {
      e.preventDefault();
      togglePause();
      return;
    }
    if (phase !== "quiz" || !quiz) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (quiz.result) next();
      else submit();
      return;
    }
    if (quiz.result) return;
    if (/^[0-9]$/.test(e.key)) setQuiz({ ...quiz, answer: (quiz.answer === "0" ? "" : quiz.answer) + e.key });
    else if (e.key === "-") setQuiz({ ...quiz, answer: quiz.answer.startsWith("-") ? quiz.answer.slice(1) : `-${quiz.answer}` });
    else if (e.key === "Backspace") setQuiz({ ...quiz, answer: quiz.answer.slice(0, -1) });
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return null;
}

function QuizPanel({
  quiz,
  setQuiz,
  submit,
  next,
  rc,
  decks,
}: {
  quiz: Quiz;
  setQuiz: (q: Quiz) => void;
  submit: () => void;
  next: () => void;
  rc: number;
  decks: number;
}) {
  const nudge = (d: number) => {
    if (quiz.result) return;
    const n = (Number(quiz.answer) || 0) + d;
    setQuiz({ ...quiz, answer: String(n) });
  };
  const question =
    quiz.step === "running"
      ? "What’s the running count?"
      : quiz.step === "true"
        ? `Running count ${fmt(rc)} with about ${decks} deck${decks === 1 ? "" : "s"} left. True count?`
        : `True count ${fmt(Math.trunc(rc / decks))}. Bet how many units (1–${MAX_UNITS})?`;
  const r = quiz.result;

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-2 p-5 text-center"
      style={{ borderColor: "rgba(232,184,74,0.6)", background: "rgba(0,0,0,0.45)" }}
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
        {quiz.step === "running" ? "Count check" : quiz.step === "true" ? "True count" : "Bet sizing"}
      </p>
      <p className="font-display text-lg leading-snug">{question}</p>

      {quiz.step === "bet" ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_UNITS }, (_, i) => i + 1).map((u) => (
            <button
              key={u}
              type="button"
              disabled={!!r}
              onClick={() => setQuiz({ ...quiz, answer: String(u) })}
              className={`brut-sm press size-12 rounded-xl font-display text-lg ${quiz.answer === String(u) ? "bg-gold" : "bg-paper"}`}
            >
              {u}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => nudge(-1)} disabled={!!r} aria-label="Minus one" className="brut-sm press size-12 rounded-full bg-paper font-display text-2xl">
            −
          </button>
          <motion.span
            key={quiz.answer}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="flex h-16 min-w-28 items-center justify-center rounded-2xl border-2 border-ink bg-paper px-4 font-display text-4xl text-ink"
            aria-live="polite"
          >
            {quiz.answer === "" ? "?" : fmt(Number(quiz.answer))}
          </motion.span>
          <button type="button" onClick={() => nudge(1)} disabled={!!r} aria-label="Plus one" className="brut-sm press size-12 rounded-full bg-paper font-display text-2xl">
            +
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {r ? (
          <motion.div key="res" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
            <p className="font-display text-xl" style={{ color: r.ok ? "#3dd68c" : "#ff5a3c" }}>
              {r.ok ? `Correct${r.points ? ` +${r.points}` : ""}` : `Not quite — it’s ${r.expected}`}
            </p>
            <button type="button" onClick={next} className="brut press rounded-full bg-gold px-6 py-2.5 font-extrabold" autoFocus>
              Continue ↵
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="sub"
            type="button"
            onClick={submit}
            disabled={quiz.answer === ""}
            className="brut press rounded-full bg-casino px-8 py-2.5 font-extrabold disabled:opacity-50"
          >
            Check ↵
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Tray({ label, cards, decks, colour }: { label: string; cards: number; decks: number; colour: string }) {
  const fill = Math.min(1, cards / (decks * 52));
  return (
    <div className="flex flex-col items-center gap-1.5" title={`${label}: ${cards} cards`}>
      <span className="font-mono text-[10px] font-bold uppercase">{label}</span>
      <div className="relative h-48 w-12 overflow-hidden rounded-lg border-2 border-ink sm:w-14" style={{ background: "rgba(0,0,0,0.35)" }}>
        <motion.div
          className="absolute inset-x-0 bottom-0"
          style={{ background: `repeating-linear-gradient(0deg, ${colour} 0 3px, #f3ede2 3px 5px)` }}
          animate={{ height: `${fill * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {decks > 1 &&
          Array.from({ length: decks - 1 }, (_, i) => (
            <span key={i} className="absolute inset-x-0 h-px bg-paper/60" style={{ bottom: `${((i + 1) / decks) * 100}%` }} />
          ))}
      </div>
      <span className="font-mono text-[10px] font-bold">
        {decks > 1 ? `${(cards / 52).toFixed(1)} decks` : `${cards} cards`}
      </span>
    </div>
  );
}

function Summary({ tally, best, scoring, onAgain, onSetup }: { tally: Tally; best: number; scoring: boolean; onAgain: () => void; onSetup: () => void }) {
  const accuracy = tally.asked ? tally.correct / tally.asked : 0;
  const g = grade(accuracy);
  const record = scoring && tally.score > 0 && tally.score >= best;
  return (
    <motion.div
      className="flex flex-col items-center gap-3 text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <motion.span
        className="flex size-24 items-center justify-center rounded-full border-4 border-gold font-display text-5xl text-gold"
        style={{ background: "rgba(0,0,0,0.4)", boxShadow: "0 0 30px rgba(232,184,74,0.6)" }}
        initial={{ rotate: -30, scale: 0.4 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.15 }}
      >
        {g.letter}
      </motion.span>
      <p className="font-display text-2xl">{g.title}</p>
      <p className="font-mono text-sm">
        {tally.correct}/{tally.asked} right · {Math.round(accuracy * 100)}% · best streak {tally.bestStreak}
      </p>
      {scoring ? (
        <p className="font-display text-lg text-gold">{record ? `New best: ${tally.score.toLocaleString()}!` : `Score ${tally.score.toLocaleString()} · best ${best.toLocaleString()}`}</p>
      ) : (
        <p className="font-mono text-xs" style={{ color: "rgba(243,237,226,0.7)" }}>
          Assist was on, so this drill wasn’t scored.
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onAgain} className="brut press rounded-full bg-gold px-6 py-2.5 font-extrabold">
          Go again
        </button>
        <button type="button" onClick={onSetup} className="brut-sm press rounded-full bg-paper px-5 py-2.5 font-extrabold">
          Change drill
        </button>
      </div>
    </motion.div>
  );
}

function Setup({
  saved,
  persist,
  onStart,
  onHelp,
  help,
  setHelp,
}: {
  saved: Saved;
  persist: (s: Saved) => void;
  onStart: () => void;
  onHelp: () => void;
  help: boolean;
  setHelp: (v: boolean) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-3 pt-3 pb-6 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="wide text-lg leading-none font-black uppercase sm:text-2xl">Card counting</h1>
        <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper">Hi-Lo trainer · {saved.drills} drills done</span>
        <button type="button" onClick={onHelp} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold sm:ml-auto">
          📜 How Hi-Lo works
        </button>
      </div>

      {/* Hi-Lo legend */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { tag: "+1", cards: "2 3 4 5 6", colour: "#3dd68c", note: "Low cards gone — good for you" },
          { tag: "0", cards: "7 8 9", colour: "#f3ede2", note: "Neutral" },
          { tag: "−1", cards: "10 J Q K A", colour: "#ff5a3c", note: "High cards gone — bad for you" },
        ].map((l) => (
          <div key={l.tag} className="rounded-2xl border-2 px-2 py-3" style={{ borderColor: l.colour, background: "rgba(0,0,0,0.35)" }}>
            <p className="font-display text-3xl" style={{ color: l.colour }}>
              {l.tag}
            </p>
            <p className="font-display text-sm">{l.cards}</p>
            <p className="font-mono text-[10px]" style={{ color: "rgba(243,237,226,0.7)" }}>
              {l.note}
            </p>
          </div>
        ))}
      </div>

      <section className="brut rounded-3xl bg-paper p-5">
        <h2 className="font-display text-sm">Drill</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => persist({ ...saved, mode: m.id })}
              className={`brut-sm press rounded-2xl p-4 text-left ${saved.mode === m.id ? "bg-gold" : "bg-paper-deep"}`}
            >
              <p className="font-display text-base">{m.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{m.blurb}</p>
            </button>
          ))}
        </div>

        <h2 className="mt-5 font-display text-sm">Speed</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => persist({ ...saved, speed: s.id })}
              className={`brut-sm press rounded-full px-4 py-2 text-sm font-extrabold ${saved.speed === s.id ? "bg-gold" : "bg-paper-deep"}`}
            >
              {s.label} <span className="font-mono text-[10px]">{(s.ms / 1000).toFixed(2)}s · ×{s.mult}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={saved.assist} onChange={(e) => persist({ ...saved, assist: e.target.checked })} className="size-5 accent-[#e8b84a]" />
          <span className="text-sm">
            <strong>Assist:</strong> show each card’s tag and the running count (practice only, not scored)
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="button" data-burst onClick={onStart} className="brut press rounded-full bg-casino px-8 py-3 font-extrabold">
            Start drill →
          </button>
          <p className="font-mono text-xs text-ink-soft">
            Best at this setting: {(saved.best[`${saved.mode}-${saved.speed}`] ?? 0).toLocaleString()}
          </p>
        </div>
      </section>

      <p className="text-center font-mono text-[10px] text-ink-soft">
        A learning tool. Training only — no chips are won or lost here.
      </p>

      <Drawer open={help} onClose={() => setHelp(false)} title="How Hi-Lo works">
        <HowItWorks />
      </Drawer>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Give every card a tag: 2–6 are +1, 7–9 are 0, 10s, pictures and Aces are −1.</li>
        <li>Add the tags as cards appear. That total is the <strong>running count</strong>. A full deck adds up to 0.</li>
        <li>
          Divide by the decks left in the shoe (read it from the discard tray) to get the <strong>true count</strong>.
          Rounding down or to the nearest is fine.
        </li>
        <li>Bet 1 unit when the true count is 1 or less, then true count − 1 units, up to 8.</li>
        <li>A high count means lots of 10s and Aces are left, which helps the player.</li>
      </ul>
      <p className="text-xs text-ink-soft">Tip: count cards in pairs. A high and a low card cancel out, so you can skip them.</p>
    </div>
  );
}
