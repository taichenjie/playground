"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { GameHeader } from "@/components/games/game-header";
import { Toast, shareResult, useToast } from "@/components/games/toast";
import { advanceStreak, type DailyStreak } from "@/lib/daily";
import { readJSON, writeJSON } from "@/lib/storage";
import { useDailyPuzzle } from "@/lib/use-daily-puzzle";
import { useHydrated } from "@/lib/use-hydrated";
import {
  CATEGORY_LABEL,
  DAILY,
  ERAS,
  LEVELS,
  MAX_GUESSES,
  MAX_SCORE,
  MIN_POOL,
  MISSED as MISSED_TIER,
  REGIONS,
  ROUND,
  SECONDS,
  SELECTIONS,
  TIERS,
  filtersQuery,
  parseFilters,
  pointsFor,
  rankFor,
  scoreOf,
  summarize,
  tierAt,
  tierFor,
  tile,
  type Answer,
  type Filters,
  type Hidden,
  type Revealed,
  type Selection,
  type Tier,
} from "../logic.ts";
import { faceUrl } from "../media.ts";

/* ---------- Saved state ---------- */

const KEY = "pg:whos-that:v2";
type Mode = "daily" | "free";
type Result = { mode: Mode; query: string; answers: Answer[]; faces: Revealed[] };
/** Today's daily round while it's being played, so leaving and coming back resumes it. */
type Live = { day: number; faces: Hidden[]; answers: Answer[]; revealed: (Revealed | null)[]; started: number };
type Saved = {
  prefs: Filters;
  daily: Record<number, Result>;
  live: Live | null;
  streak: DailyStreak;
  /** Recently played face ids, so free play avoids repeats. */
  seen: string[];
  free: { rounds: number; best: number };
};
const NEW_SAVED: Saved = {
  prefs: DAILY,
  daily: {},
  live: null,
  streak: { played: 0, currentStreak: 0, maxStreak: 0, lastCompleted: null },
  seen: [],
  free: { rounds: 0, best: 0 },
};

function load(): Saved {
  const saved = readJSON<Partial<Saved>>(KEY);
  if (saved) return { ...NEW_SAVED, ...saved };
  // Carry the streak over from the first version.
  const v1 = readJSON<{ streak?: DailyStreak }>("pg:whos-that:v1");
  return { ...NEW_SAVED, streak: v1?.streak ?? NEW_SAVED.streak };
}

const post = async <T,>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
};
const faceApi = <T,>(body: { id: string; action: "guess" | "hint" | "reveal"; guess?: string }) => post<T>("/api/whos-that/face", body);
type GuessResult = { correct: boolean; forgiven: boolean; face?: Revealed };

const plain = (name: string) => name.replace(/\s*\(.*\)$/, "");
const labelFor = (sel: Selection) => SELECTIONS.find((s) => s.id === sel)!.label;
function describe(f: Filters) {
  const parts = [labelFor(f.cat), REGIONS.find((r) => r.id === f.region)!.label];
  if (f.level !== "normal") parts.push(LEVELS.find((l) => l.id === f.level)!.label);
  if (f.era !== "all") parts.push(ERAS.find((e) => e.id === f.era)!.label);
  if (f.cat === "athletes" && f.sport !== "all") parts.push(f.sport);
  return parts.join(" · ");
}

/* ---------- Entry ---------- */

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
      <GameHeader title="Who’s That?" backHref="/whos-that" backLabel="Who’s That?" />
      <div className="mt-6 h-[420px] animate-pulse rounded-[32px] bg-paper-deep" />
    </div>
  );
}

export function WhosThat() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Entry />
    </Suspense>
  );
}

function Entry() {
  const hydrated = useHydrated();
  const puzzle = useDailyPuzzle();
  const params = useSearchParams();
  if (!hydrated || puzzle === null) return <Skeleton />;
  // A new link (say from Actors to Singers) starts over at the menu with that choice.
  return <Game key={params.toString()} puzzle={puzzle} params={params} />;
}

type Phase = "menu" | "loading" | "playing" | "reveal" | "done";

function Game({ puzzle, params }: { puzzle: number; params: URLSearchParams }) {
  const { toast, show } = useToast();
  const [saved, setSaved] = useState<Saved>(() => {
    const s = load();
    if (params.has("c") || params.has("region") || params.has("korean")) s.prefs = parseFilters(params);
    return s;
  });
  const savedRef = useRef(saved);
  const persist = (next: Saved) => {
    savedRef.current = next;
    setSaved(next);
    writeJSON(KEY, next);
  };
  const update = (fn: (s: Saved) => Saved) => persist(fn(savedRef.current));

  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("daily");
  const [faces, setFaces] = useState<Hidden[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [revealedFaces, setRevealed] = useState<(Revealed | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState(0);
  const [hint, setHint] = useState<{ category: string; initials: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Bumped whenever a face ends, so a slow answer check for an old face is ignored. */
  const turn = useRef(0);

  const face = faces[index];
  const elapsed = phase === "playing" ? (now - startedAt) / 1000 : 0;
  const left = Math.max(0, SECONDS - elapsed);

  /* ----- Starting and resuming ----- */

  const beginFace = (i: number, m: Mode) => {
    turn.current++;
    setIndex(i);
    setGuess("");
    setGuesses(0);
    setHint(null);
    setChecking(false);
    setConfirmExit(false);
    const t = performance.now();
    setStartedAt(t);
    setNow(t);
    setPhase("playing");
    if (m === "daily") update((s) => (s.live ? { ...s, live: { ...s.live, started: i } } : s));
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
  };

  /** Fills in a face's name after it ends, for the reveal and the results page. */
  const fetchReveal = (i: number, id: string, m: Mode) => {
    faceApi<{ face: Revealed }>({ id, action: "reveal" })
      .then(({ face: r }) => {
        setRevealed((prev) => Object.assign([...prev], { [i]: r }));
        // If the round already ended, fill the name into the results too.
        const patch = (res: Result) => (res.faces[i]?.id === r.id && res.faces[i].name === "…" ? { ...res, faces: Object.assign([...res.faces], { [i]: r }) } : res);
        setResult((prev) => prev && patch(prev));
        if (m === "daily") {
          update((s) => ({
            ...s,
            live: s.live ? { ...s.live, revealed: Object.assign([...s.live.revealed], { [i]: r }) } : s.live,
            daily: s.daily[puzzle] ? { ...s.daily, [puzzle]: patch(s.daily[puzzle]) } : s.daily,
          }));
        }
      })
      .catch(() => {});
  };

  const finish = (m: Mode, fs: Hidden[], ans: Answer[], rev: (Revealed | null)[]) => {
    const r: Result = {
      mode: m,
      query: filtersQuery(m === "daily" ? DAILY : savedRef.current.prefs),
      answers: ans,
      // A name that hasn't come back yet is filled in when it does.
      faces: fs.map(
        (f, i) =>
          rev[i] ?? { id: f.id, name: "…", category: "public", korean: false, image: f.image, credit: { artist: "", license: "", licenseUrl: "", source: "" } },
      ),
    };
    const score = scoreOf(ans);
    const seen = (s: Saved) => [...s.seen, ...fs.map((f) => f.id)].slice(-150);
    if (m === "daily") {
      update((s) => ({ ...s, live: null, daily: { ...s.daily, [puzzle]: r }, streak: advanceStreak(s.streak, puzzle, true), seen: seen(s) }));
    } else {
      update((s) => ({ ...s, free: { rounds: s.free.rounds + 1, best: Math.max(s.free.best, score) }, seen: seen(s) }));
    }
    setResult(r);
    setPhase("done");
    window.scrollTo({ top: 0 });
    if (ans.filter((a) => a.correct).length >= 8) burst({ x: window.innerWidth / 2, y: window.innerHeight / 3, count: 70 });
  };

  const startDaily = async () => {
    setMode("daily");
    const live = savedRef.current.live;
    if (live && live.day === puzzle) {
      // Resume. A face that was on screen when they left counts as missed.
      let ans = live.answers;
      if (live.started === ans.length && ans.length < live.faces.length) {
        ans = [...ans, { correct: false, seconds: SECONDS, hint: false, guesses: 0 }];
        update((s) => ({ ...s, live: { ...live, answers: ans } }));
        fetchReveal(ans.length - 1, live.faces[ans.length - 1].id, "daily");
      }
      setFaces(live.faces);
      setAnswers(ans);
      setRevealed(live.revealed);
      if (ans.length >= live.faces.length) return finish("daily", live.faces, ans, live.revealed);
      window.scrollTo({ top: 0 });
      return beginFace(ans.length, "daily");
    }
    setPhase("loading");
    try {
      const data = await post<{ faces: Hidden[] }>("/api/whos-that/round", { mode: "daily", day: puzzle });
      if (data.faces.length < 3) throw new Error("Not enough faces yet");
      update((s) => ({ ...s, live: { day: puzzle, faces: data.faces, answers: [], revealed: [], started: -1 } }));
      setFaces(data.faces);
      setAnswers([]);
      setRevealed([]);
      window.scrollTo({ top: 0 });
      beginFace(0, "daily");
    } catch (e) {
      show((e as Error).message, 2500);
      setPhase("menu");
    }
  };

  const startFree = async () => {
    setMode("free");
    setPhase("loading");
    try {
      const data = await post<{ faces: Hidden[] }>("/api/whos-that/round", {
        mode: "free",
        query: filtersQuery(savedRef.current.prefs),
        seen: savedRef.current.seen,
      });
      if (data.faces.length < 3) throw new Error("Not enough faces for these filters");
      setFaces(data.faces);
      setAnswers([]);
      setRevealed([]);
      window.scrollTo({ top: 0 });
      beginFace(0, "free");
    } catch (e) {
      show((e as Error).message, 2500);
      setPhase("menu");
    }
  };

  /* ----- Playing a face ----- */

  const finishFace = (correct: boolean, opts: { typed?: string; forgiven?: boolean; used?: number; face?: Revealed } = {}) => {
    if (phase !== "playing" || !face) return;
    turn.current++;
    const a: Answer = {
      correct,
      seconds: Math.min(SECONDS, elapsed),
      hint: !!hint,
      guesses: opts.used ?? guesses + (correct ? 1 : 0),
      typed: opts.typed,
      forgiven: opts.forgiven,
    };
    const nextAnswers = [...answers, a];
    setAnswers(nextAnswers);
    if (opts.face) setRevealed((prev) => Object.assign([...prev], { [index]: opts.face }));
    else fetchReveal(index, face.id, mode);
    if (mode === "daily") {
      const got = opts.face;
      update((s) =>
        s.live
          ? { ...s, live: { ...s.live, answers: nextAnswers, revealed: got ? Object.assign([...s.live.revealed], { [index]: got }) : s.live.revealed } }
          : s,
      );
    }
    setPhase("reveal");
    if (correct) {
      const rect = inputRef.current?.getBoundingClientRect();
      burst({ x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2, y: rect ? rect.top : window.innerHeight / 2, count: 22 });
    }
  };

  // Clock: ticks while a face is on screen; time running out counts as a miss.
  const tick = useEffectEvent(() => {
    const t = performance.now();
    setNow(t);
    if ((t - startedAt) / 1000 >= SECONDS) finishFace(false);
  });
  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [phase, index]);

  const submit = async () => {
    const value = guess.trim();
    if (phase !== "playing" || !face || !value || checking) return;
    const myTurn = turn.current;
    setChecking(true);
    try {
      const r = await faceApi<GuessResult>({ id: face.id, action: "guess", guess: value });
      if (turn.current !== myTurn) return; // the clock ran out meanwhile
      if (r.correct) return finishFace(true, { typed: value, forgiven: r.forgiven, face: r.face });
      const g = guesses + 1;
      setGuesses(g);
      setShake((s) => s + 1);
      setGuess("");
      if (g >= MAX_GUESSES) finishFace(false, { used: g });
      else show(`Not them — ${MAX_GUESSES - g} guess${MAX_GUESSES - g === 1 ? "" : "es"} left`, 1100);
    } catch {
      show("Couldn’t check that — try again", 1500);
    } finally {
      if (turn.current === myTurn) setChecking(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const askHint = async () => {
    if (!face || hint) return;
    setHint({ category: "…", initials: "" });
    try {
      setHint(await faceApi<{ category: string; initials: string }>({ id: face.id, action: "hint" }));
    } catch {
      setHint(null);
    }
    inputRef.current?.focus({ preventScroll: true });
  };

  const next = () => {
    if (phase !== "reveal") return;
    if (index + 1 < faces.length) return beginFace(index + 1, mode);
    finish(mode, faces, answers, revealedFaces);
  };

  /** Leave mid-round. Daily: the face on screen counts as missed and the rest wait for later. */
  const exit = () => {
    if (mode === "daily" && phase === "playing" && face) {
      const missed: Answer = { correct: false, seconds: Math.min(SECONDS, elapsed), hint: !!hint, guesses };
      const ans = [...answers, missed];
      update((s) => (s.live ? { ...s, live: { ...s.live, answers: ans } } : s));
      fetchReveal(index, face.id, "daily");
    }
    turn.current++;
    setPhase("menu");
    setConfirmExit(false);
  };

  // Auto-advance after a reveal; Enter skips the wait.
  const auto = useEffectEvent(() => next());
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(auto, 3800);
    return () => window.clearTimeout(t);
  }, [phase, index]);
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (phase === "reveal" && e.key === "Enter" && !e.repeat) {
      e.preventDefault();
      next();
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Preload the next photo so it appears instantly.
  useEffect(() => {
    const n = faces[index + 1];
    if (n) new Image().src = faceUrl(n.image);
  }, [faces, index]);

  /* ----- Screens ----- */

  if (phase === "done" && result) {
    return (
      <Done
        puzzle={puzzle}
        result={result}
        streak={saved.streak}
        onFree={() => {
          setResult(null);
          setPhase("menu");
        }}
        onAgain={result.mode === "free" ? startFree : undefined}
      />
    );
  }

  if (phase === "menu" || phase === "loading") {
    return (
      <Menu
        puzzle={puzzle}
        saved={saved}
        loading={phase === "loading"}
        onDaily={() => {
          const done = saved.daily[puzzle];
          if (done) {
            setResult(done);
            setPhase("done");
          } else startDaily();
        }}
        onFree={startFree}
        setPrefs={(prefs) => update((s) => ({ ...s, prefs }))}
        toast={toast}
      />
    );
  }

  if (!face) return null;

  const reveal = phase === "reveal";
  const lastAnswer = answers[index];
  const shown = revealedFaces[index];
  const score = scoreOf(answers);
  // Blur and zoom fade out over the first two-thirds of the clock.
  const clear = reveal ? 1 : Math.min(1, elapsed / (SECONDS * 0.68));
  const blur = (1 - clear) * 22;
  const zoom = 1 + (1 - clear) * 0.9;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-4 pb-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="wide text-xl leading-none font-black uppercase sm:text-2xl">Who’s That?</h1>
        <span className="brut-sm rounded-full bg-faces px-3 py-1 font-mono text-[11px] font-bold">
          {mode === "daily" ? `Daily #${puzzle}` : `Free play · ${describe(saved.prefs)}`}
        </span>
        <span className="relative ml-auto font-display text-xl">
          <CountUp value={score} duration={0.5} />
          <AnimatePresence>
            {reveal && lastAnswer?.correct && (
              <motion.span
                key={index}
                className="absolute top-0 right-full mr-2 rounded-full border-2 border-ink px-2 font-display text-sm whitespace-nowrap"
                style={{ background: tierFor(lastAnswer).color, color: tierFor(lastAnswer).ink }}
                initial={{ x: 16, scale: 0.6, opacity: 0 }}
                animate={{ x: 0, scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                +{pointsFor(lastAnswer)}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        {confirmExit ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold">
              {mode === "daily" ? "This face counts as missed; the rest wait for you." : "This round won’t be saved."}
            </span>
            <button type="button" onClick={exit} className="brut-sm press rounded-full bg-pop px-3 py-1 text-xs font-extrabold text-paper">
              Leave
            </button>
            <button type="button" onClick={() => setConfirmExit(false)} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
              Stay
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmExit(true)} className="brut-sm press rounded-full bg-paper px-3 py-1 text-xs font-extrabold">
            ✕ Exit
          </button>
        )}
      </div>

      {/* Progress pips */}
      <div className="flex gap-1.5" aria-label={`Face ${index + 1} of ${faces.length}`}>
        {faces.map((f, i) => {
          const a = answers[i];
          const color = a ? tierFor(a).color : i === index ? "#f3ede2" : "transparent";
          return (
            <span
              key={f.id}
              title={a ? `${tierFor(a).label} +${pointsFor(a)}` : undefined}
              className={`h-2.5 flex-1 rounded-full border-2 border-ink ${i === index && !a ? "animate-pulse" : ""}`}
              style={{ background: color }}
            />
          );
        })}
      </div>

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Photo */}
        <div className="relative mx-auto w-full max-w-[min(100%,calc(100dvh-260px))]">
          <motion.div
            key={face.id}
            className="brut relative aspect-square overflow-hidden rounded-[28px] bg-ink"
            initial={{ rotateY: 80, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1, x: shake % 2 ? [0, -12, 10, -6, 0] : [0, 12, -10, 6, 0] }}
            transition={{ rotateY: { type: "spring", stiffness: 160, damping: 18 }, x: { duration: 0.35 } }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faceUrl(face.image)}
              alt="Mystery face"
              draggable={false}
              className="size-full object-cover object-top select-none"
              style={{
                filter: `blur(${blur}px)`,
                transform: `scale(${zoom})`,
                transformOrigin: "50% 28%",
                transition: reveal ? "filter 0.4s, transform 0.5s" : "filter 0.12s linear, transform 0.12s linear",
              }}
            />
            {!reveal && (
              <svg viewBox="0 0 40 40" className="absolute top-3 right-3 size-16">
                <circle cx="20" cy="20" r="17" fill="rgba(20,20,20,0.7)" />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="none"
                  stroke={left < 4 ? "#ff5a3c" : "#a78bfa"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(left / SECONDS) * 94.2} 94.2`}
                  transform="rotate(-90 20 20)"
                />
                <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" fill="#f3ede2" fontSize="12" fontWeight="800" fontFamily="var(--font-bungee)">
                  {Math.ceil(left)}
                </text>
              </svg>
            )}
            {hint && !reveal && (
              <motion.span
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute top-3 left-3 rounded-full border-2 border-ink bg-daily px-3 py-1 font-display text-xs"
              >
                {hint.category} · {hint.initials}
              </motion.span>
            )}
            <AnimatePresence>
              {reveal && shown && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 p-4 text-paper"
                  style={{ background: "linear-gradient(transparent, rgba(20,20,20,0.92))" }}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <p className="font-display text-2xl leading-tight sm:text-3xl">{plain(shown.name)}</p>
                  <p className="font-mono text-[11px] font-bold opacity-80">
                    {CATEGORY_LABEL[shown.category]}
                    {shown.korean ? " · Korean" : ""}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {reveal && shown && (
            <p className="mt-2 font-mono text-[10px] text-ink-soft">
              Photo:{" "}
              <a href={shown.credit.source} target="_blank" rel="noreferrer" className="underline">
                {shown.credit.artist}
              </a>{" "}
              ·{" "}
              {shown.credit.licenseUrl ? (
                <a href={shown.credit.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                  {shown.credit.license}
                </a>
              ) : (
                shown.credit.license
              )}{" "}
              · via Wikimedia Commons
            </p>
          )}
        </div>

        {/* Answer panel */}
        <div className="relative flex flex-col gap-3">
          <Toast toast={toast} />
          <p className="font-mono text-xs font-bold">
            Face {index + 1} of {faces.length}
          </p>
          {!reveal ? (
            <>
              <h2 className="wide text-3xl leading-none font-black uppercase">Who’s that?</h2>
              <LiveTier tier={tierAt(elapsed)} hint={!!hint} />
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Keep this Enter from also reaching the window listener and skipping the reveal.
                    e.stopPropagation();
                    submit();
                  }
                }}
                placeholder="Type their full name…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={80}
                aria-label="Your answer"
                className="brut w-full rounded-2xl bg-paper px-4 py-3 text-lg font-bold outline-none focus:bg-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={checking}
                  className="brut-sm press rounded-full bg-pop px-5 py-2 font-extrabold text-paper disabled:opacity-60"
                >
                  {checking ? "Checking…" : "Guess ↵"}
                </button>
                <button
                  type="button"
                  onClick={askHint}
                  disabled={!!hint}
                  className="brut-sm press rounded-full bg-daily px-4 py-2 text-sm font-extrabold disabled:opacity-50"
                >
                  💡 Hint (½ points)
                </button>
                <button type="button" onClick={() => finishFace(false)} className="brut-sm press rounded-full bg-paper px-4 py-2 text-sm font-extrabold">
                  Skip
                </button>
              </div>
              <p className="font-mono text-[11px] text-ink-soft">
                {MAX_GUESSES - guesses} guess{MAX_GUESSES - guesses === 1 ? "" : "es"} left · full name, stage name or Korean name · small
                typos are forgiven
              </p>
            </>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col gap-3">
              {lastAnswer && <TierBadge answer={lastAnswer} big />}
              <p className="text-lg font-bold">
                {lastAnswer?.correct
                  ? `Got it in ${lastAnswer.seconds.toFixed(1)}s${lastAnswer.hint ? " with a hint (half points)" : ""}.`
                  : shown
                    ? `That was ${plain(shown.name)}.`
                    : "…"}
              </p>
              {lastAnswer?.forgiven && shown && (
                <p className="w-fit rounded-xl border-2 border-dashed border-ink bg-paper px-3 py-1.5 font-mono text-xs font-bold">
                  “{lastAnswer.typed}” → {plain(shown.name)} · typo forgiven
                </p>
              )}
              <button type="button" onClick={next} className="brut press w-fit rounded-full bg-ink px-6 py-3 font-extrabold text-paper">
                {index + 1 < faces.length ? "Next face ↵" : "See my score ↵"}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Menu ---------- */

type Counts = {
  pool: number;
  cat: Record<string, number>;
  region: Record<string, number>;
  era: Record<string, number>;
  sport: { id: string; n: number }[];
};

function Menu({
  puzzle,
  saved,
  loading,
  onDaily,
  onFree,
  setPrefs,
  toast,
}: {
  puzzle: number;
  saved: Saved;
  loading: boolean;
  onDaily: () => void;
  onFree: () => void;
  setPrefs: (f: Filters) => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const prefs = saved.prefs;
  const query = filtersQuery(prefs);
  const [counts, setCounts] = useState<{ query: string; data: Counts } | null>(null);
  useEffect(() => {
    let current = true;
    fetch(`/api/whos-that/options?${query}`)
      .then((r) => r.json())
      .then((data: Counts) => {
        if (current) setCounts({ query, data });
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [query]);
  const c = counts?.data;
  const fresh = counts?.query === query;

  const done = saved.daily[puzzle];
  const resuming = saved.live?.day === puzzle ? saved.live : null;
  const set = (g: Partial<Filters>) => setPrefs({ ...prefs, ...g });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6 pb-10 sm:px-6">
      <GameHeader title="Who’s That?" backHref="/whos-that" backLabel="Who’s That?" />
      <Toast toast={toast} />

      {/* Daily */}
      <section className="brut rounded-[28px] bg-faces p-6 sm:p-8">
        <p className="font-mono text-xs font-bold">
          Daily #{puzzle} · {ROUND} faces · {SECONDS}s each · same set for everyone
        </p>
        <h2 className="wide mt-2 text-3xl font-black uppercase sm:text-4xl">The Daily Ten</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed font-medium">
          A mix of every category, from around the world. Each photo starts blurred and sharpens as the clock runs; the faster you
          name them, the more they’re worth. Only the daily counts for your streak.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-burst
            disabled={loading}
            onClick={onDaily}
            className="brut press rounded-full bg-pop px-8 py-3 text-lg font-extrabold text-paper disabled:opacity-60"
          >
            {loading
              ? "Loading…"
              : done
                ? `✓ ${scoreOf(done.answers)} pts — see results`
                : resuming
                  ? `Resume — face ${Math.min(resuming.faces.length, resuming.answers.length + (resuming.started === resuming.answers.length ? 2 : 1))} of ${resuming.faces.length} →`
                  : "Play today’s ten →"}
          </button>
          {saved.streak.currentStreak > 0 && <span className="font-mono text-sm font-bold">🔥 {saved.streak.currentStreak}-day streak</span>}
        </div>
      </section>

      {/* Free play */}
      <section className="brut rounded-[28px] bg-paper p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="wide text-2xl font-black uppercase sm:text-3xl">Free play</h2>
          <p className="font-mono text-xs font-bold">
            Pick your mix · a fresh ten every time
            {saved.free.rounds > 0 && ` · ${saved.free.rounds} played · best ${saved.free.best}`}
          </p>
        </div>

        <FilterRow label="Category">
          {SELECTIONS.map((s) => (
            <Chip key={s.id} on={prefs.cat === s.id} n={c?.cat[s.id]} onClick={() => set({ cat: s.id, sport: "all" })}>
              {s.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Region">
          {REGIONS.map((r) => (
            <Chip key={r.id} on={prefs.region === r.id} n={c?.region[r.id]} title={r.note} onClick={() => set({ region: r.id })}>
              {r.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Difficulty">
          {LEVELS.map((l) => (
            <Chip key={l.id} on={prefs.level === l.id} title={l.note} onClick={() => set({ level: l.id })}>
              {l.label}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Era">
          {ERAS.map((e) => (
            <Chip key={e.id} on={prefs.era === e.id} n={c?.era[e.id]} title={e.note} onClick={() => set({ era: e.id })}>
              {e.label}
            </Chip>
          ))}
        </FilterRow>
        {prefs.cat === "athletes" && (
          <FilterRow label="Sport">
            <Chip on={prefs.sport === "all"} onClick={() => set({ sport: "all" })}>
              All sports
            </Chip>
            {c?.sport.map((s) => (
              <Chip key={s.id} on={prefs.sport === s.id} n={s.n} onClick={() => set({ sport: s.id })}>
                {s.id}
              </Chip>
            ))}
          </FilterRow>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={loading || !fresh || (c?.pool ?? 0) < ROUND}
            onClick={onFree}
            className="brut press rounded-full bg-ink px-7 py-3 font-extrabold text-paper disabled:opacity-50"
          >
            Play {describe(prefs)} →
          </button>
          <span className="font-mono text-xs font-bold">
            {!fresh ? "Counting faces…" : (c?.pool ?? 0) < ROUND ? "Not enough faces for this mix yet" : `${c!.pool} faces in this mix`}
          </span>
        </div>
        <p className="mt-3 font-mono text-[11px] text-ink-soft">Choices with fewer than {MIN_POOL} faces are greyed out until the library grows.</p>
      </section>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="font-display text-sm">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, n, title, onClick, children }: { on: boolean; n?: number; title?: string; onClick: () => void; children: React.ReactNode }) {
  const thin = n !== undefined && n < MIN_POOL && !on;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={thin}
      title={thin ? `Only ${n} faces so far` : title}
      className={`brut-sm press rounded-full px-3.5 py-1.5 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-ink text-paper" : "bg-paper"}`}
    >
      {children}
      {n !== undefined && <span className="ml-1.5 font-mono text-[10px] opacity-70">{n}</span>}
    </button>
  );
}

/* ---------- Tier badges ---------- */

/** What an answer would score right now; it drops a tier as the clock runs. */
function LiveTier({ tier, hint }: { tier: Tier; hint: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] font-bold">Worth now</span>
      <motion.span
        key={tier.id}
        initial={{ scale: 1.25, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-full border-2 border-ink px-3 py-1 font-display text-sm"
        style={{ background: tier.color, color: tier.ink }}
      >
        {tier.icon} {tier.label} +{hint ? Math.round(tier.points / 2) : tier.points}
      </motion.span>
      <span className="flex gap-1" aria-hidden>
        {TIERS.map((t) => (
          <span key={t.id} className="size-2.5 rounded-full border-2 border-ink" style={{ background: t.points <= tier.points ? t.color : "transparent" }} />
        ))}
      </span>
    </div>
  );
}

function TierBadge({ answer, big = false }: { answer: Answer; big?: boolean }) {
  const t = tierFor(answer);
  if (big) {
    return (
      <motion.div
        initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="brut w-fit rounded-2xl px-5 py-3"
        style={{ background: t.color, color: t.ink, boxShadow: t.id === "lightning" ? "4px 4px 0 #141414, 0 0 32px #ffc53d" : undefined }}
      >
        <p className="wide text-3xl leading-none font-black uppercase sm:text-4xl">
          {t.icon} {t.label}
        </p>
        <p className="mt-1 font-display text-2xl">+{pointsFor(answer)}</p>
      </motion.div>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 font-display text-[11px] whitespace-nowrap"
      style={{ background: t.color, color: t.ink }}
    >
      {t.icon} {t.label}
    </span>
  );
}

/* ---------- Results ---------- */

function Done({
  puzzle,
  result,
  streak,
  onFree,
  onAgain,
}: {
  puzzle: number;
  result: Result;
  streak: DailyStreak;
  onFree: () => void;
  onAgain?: () => void;
}) {
  const { toast, show } = useToast();
  const sum = summarize(result.answers);
  const daily = result.mode === "daily";
  const what = daily ? `Daily #${puzzle}` : `Free play · ${describe(parseFilters(new URLSearchParams(result.query)))}`;
  const share = async () => {
    const text = `Who’s That? ${what}\n${sum.score} pts · ${sum.right}/${result.answers.length} · ${rankFor(sum.score)}\n${result.answers.map(tile).join("")}`;
    const msg = await shareResult(text);
    if (msg) show(msg);
  };
  const stats: [string, string][] = [
    ["Named", `${sum.right}/${result.answers.length}`],
    ["Average", sum.average === null ? "—" : `${sum.average.toFixed(1)}s`],
    ["Fastest", sum.fastest === null ? "—" : `${sum.fastest.toFixed(1)}s`],
    ["Best run", `${sum.bestRun} in a row`],
  ];
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 pb-10 sm:px-6">
      <GameHeader title="Who’s That?" backHref="/whos-that" backLabel="Who’s That?" />
      <section className="brut relative rounded-[28px] bg-faces p-6 sm:p-8">
        <Toast toast={toast} />
        <p className="font-mono text-xs font-bold">
          {what}
          {daily && ` · 🔥 ${streak.currentStreak}-day streak`}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-1">
          <p className="wide text-5xl font-black uppercase sm:text-6xl">
            <CountUp value={sum.score} duration={1} /> <span className="text-2xl">/ {MAX_SCORE}</span>
          </p>
          <p className="pb-2 font-display text-xl">{rankFor(sum.score)}</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl border-2 border-ink bg-paper px-3 py-2">
              <dt className="font-mono text-[10px] font-bold uppercase">{k}</dt>
              <dd className="font-display text-lg">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex flex-wrap gap-1.5 rounded-2xl border-2 border-ink bg-paper p-2">
          {[...TIERS, MISSED_TIER].map((t) => {
            const n = sum.counts.get(t.id) ?? 0;
            if (!n) return null;
            return (
              <span key={t.id} className="rounded-full border-2 border-ink px-2.5 py-0.5 font-display text-xs" style={{ background: t.color, color: t.ink }}>
                {t.icon} {t.label} ×{n}
              </span>
            );
          })}
          {sum.hints > 0 && (
            <span className="rounded-full border-2 border-dashed border-ink bg-paper px-2.5 py-0.5 font-display text-xs">
              💡 {sum.hints} hint{sum.hints === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={share} className="brut press rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper">
            Share result
          </button>
          {onAgain && (
            <button type="button" onClick={onAgain} className="brut press rounded-full bg-ink px-6 py-2.5 font-extrabold text-paper">
              Play another ten →
            </button>
          )}
          <button type="button" onClick={onFree} className="brut press rounded-full bg-paper px-6 py-2.5 font-extrabold">
            {daily ? "Free play →" : "Change filters"}
          </button>
        </div>
      </section>

      <section>
        <p className="font-display text-sm">Face by face</p>
        <ol className="mt-2 grid gap-2 md:grid-cols-2">
          {result.faces.map((f, i) => {
            const a = result.answers[i];
            if (!a) return null;
            return (
              <li key={`${f.id}-${i}`} className="brut-sm flex items-center gap-3 rounded-2xl bg-paper p-2 pr-4">
                <span className="w-5 text-center font-mono text-xs font-bold">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faceUrl(f.image)}
                  alt={plain(f.name)}
                  className={`size-14 shrink-0 rounded-xl border-2 border-ink object-cover object-top ${a.correct ? "" : "grayscale"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{plain(f.name)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <TierBadge answer={a} />
                    <span className="font-mono text-[11px] font-bold">
                      {a.correct
                        ? `${a.seconds.toFixed(1)}s`
                        : a.seconds >= SECONDS
                          ? "time ran out"
                          : a.guesses >= MAX_GUESSES
                            ? "3 wrong guesses"
                            : "skipped"}
                      {a.correct && a.guesses > 1 ? ` · guess ${a.guesses}` : ""}
                      {a.hint ? " · hint" : ""}
                    </span>
                  </div>
                  {a.typed && a.correct && (
                    <p className="truncate font-mono text-[10px] text-ink-soft">
                      You typed “{a.typed}”{a.forgiven ? " · typo forgiven" : ""}
                    </p>
                  )}
                </div>
                <span className="font-display text-xl">+{pointsFor(a)}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
