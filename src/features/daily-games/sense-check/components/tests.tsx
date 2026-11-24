"use client";

import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  scoreAngle,
  scoreCount,
  scoreMotion,
  scoreProportion,
  scoreRhythm,
  type DailyParams,
} from "../logic.ts";

export type TestResult = { score: number; yours: string; actual: string };
type TestProps<K extends keyof DailyParams> = { params: DailyParams[K]; onDone: (r: TestResult) => void };

const STAGE = "brut relative mx-auto w-full overflow-hidden rounded-3xl bg-paper-deep";
const BIG_BUTTON = "brut press rounded-full px-7 py-3 font-extrabold";

/** Clears any pending timeouts when the component unmounts. */
function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => {
    const pending = ids.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  return (fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  };
}

/* ------------------------------------------------------------------ */
/* 1. Head count                                                       */
/* ------------------------------------------------------------------ */

export function CountTest({ params, onDone }: TestProps<"count">) {
  const actual = params.dots.length;
  const [phase, setPhase] = useState<"ready" | "showing" | "guess" | "done">("ready");
  const [guess, setGuess] = useState(60);
  const later = useTimers();

  const show = () => {
    setPhase("showing");
    later(() => setPhase("guess"), 2000);
  };

  const submit = () => {
    setPhase("done");
    onDone({ score: scoreCount(guess, actual), yours: String(guess), actual: String(actual) });
  };

  const visible = phase === "showing" || phase === "done";

  return (
    <div className="space-y-5">
      <div className={`${STAGE} dots aspect-square max-w-[360px]`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          {visible &&
            params.dots.map((d, i) => (
              <motion.circle
                key={i}
                cx={d.x}
                cy={d.y}
                fill={phase === "done" ? "#3b5bff" : "#141414"}
                initial={{ r: 0 }}
                animate={{ r: d.r }}
                transition={{ type: "spring", stiffness: 500, damping: 18, delay: phase === "done" ? 0 : i * 0.004 }}
              />
            ))}
        </svg>
        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button type="button" onClick={show} className={`${BIG_BUTTON} bg-daily`}>
              Show me the dots
            </button>
          </div>
        )}
        {phase === "guess" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center font-display text-8xl"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
          >
            ?
          </motion.div>
        )}
      </div>

      {(phase === "guess" || phase === "done") && (
        <div className="mx-auto max-w-[360px] space-y-4">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={phase === "done"}
              onClick={() => setGuess((g) => Math.max(5, g - 1))}
              className="brut-sm press size-11 rounded-full bg-paper text-xl font-black"
              aria-label="One fewer"
            >
              −
            </button>
            <output className="w-24 text-center font-display text-5xl" aria-live="polite">
              {guess}
            </output>
            <button
              type="button"
              disabled={phase === "done"}
              onClick={() => setGuess((g) => Math.min(200, g + 1))}
              className="brut-sm press size-11 rounded-full bg-paper text-xl font-black"
              aria-label="One more"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            value={guess}
            disabled={phase === "done"}
            onChange={(e) => setGuess(Number(e.target.value))}
            aria-label="Your estimate"
            className="w-full accent-[var(--color-pop)]"
          />
          {phase === "guess" && (
            <button type="button" onClick={submit} className={`${BIG_BUTTON} w-full bg-pop text-paper`}>
              Lock it in
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Into the fog                                                     */
/* ------------------------------------------------------------------ */

const FINISH = 88; // finish line, % of track width

export function MotionTest({ params, onDone }: TestProps<"motion">) {
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const progress = useMotionValue(0);
  const left = useTransform(progress, (p) => `calc(${p * FINISH}% - 18px)`);
  const startedAt = useRef(0);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const later = useTimers();

  const finish = (errorMs: number | null) => {
    controls.current?.stop();
    setPhase("done");
    if (errorMs === null) {
      onDone({ score: 0, yours: "no stop", actual: "on the line" });
      return;
    }
    const ms = Math.round(errorMs);
    onDone({
      score: scoreMotion(ms),
      yours: ms === 0 ? "dead on" : `${Math.abs(ms)} ms ${ms < 0 ? "early" : "late"}`,
      actual: "0 ms",
    });
  };

  const start = () => {
    progress.set(0);
    setPhase("running");
    startedAt.current = performance.now();
    controls.current = animate(progress, 2, { duration: (params.durationMs * 2) / 1000, ease: "linear" });
    later(() => {
      if (controls.current && progress.get() >= 1.99) finish(null);
    }, params.durationMs * 2 + 50);
  };

  const stop = () => {
    if (phase !== "running") return;
    const elapsed = performance.now() - startedAt.current;
    controls.current?.stop();
    // Show the ball where it really was, even if animation frames lagged.
    progress.set(Math.min(2, elapsed / params.durationMs));
    finish(elapsed - params.durationMs);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.code === "Space" && phase === "running") {
      e.preventDefault();
      stop();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-5">
      <div className={`${STAGE} h-40 max-w-[520px]`}>
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-ink/20" />
        {/* Ball */}
        <motion.div
          className="absolute top-1/2 size-9 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-casino"
          style={{ left }}
        />
        {/* Fog hides the ball's approach */}
        <motion.div
          className="absolute inset-y-0 right-0 z-10 border-l-[2.5px] border-dashed border-ink"
          style={{
            left: `${params.fogStart * FINISH}%`,
            background:
              "repeating-linear-gradient(-45deg, var(--color-music) 0 10px, #f9a6cb 10px 20px)",
          }}
          animate={{ opacity: phase === "done" ? 0.25 : 1 }}
        />
        {/* Finish line */}
        <div className="absolute inset-y-0 z-20 w-1.5 bg-ink" style={{ left: `${FINISH}%` }}>
          <span className="absolute -top-0.5 left-2 font-display text-[10px] whitespace-nowrap">LINE</span>
        </div>
      </div>

      <div className="flex justify-center">
        {phase === "ready" && (
          <button type="button" onClick={start} className={`${BIG_BUTTON} bg-daily`}>
            Go!
          </button>
        )}
        {phase === "running" && (
          <motion.button
            type="button"
            onPointerDown={stop}
            className={`${BIG_BUTTON} w-full max-w-[520px] bg-casino py-5 text-xl`}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            STOP! <span className="font-mono text-xs">(or space)</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Right angle?                                                     */
/* ------------------------------------------------------------------ */

const CX = 100;
const CY = 100;
const ARM = 86;
const point = (deg: number, r = ARM) => ({
  x: CX + r * Math.cos((deg * Math.PI) / 180),
  y: CY - r * Math.sin((deg * Math.PI) / 180),
});
const arc = (deg: number, r: number) => {
  const end = point(deg, r);
  return `M ${CX + r} ${CY} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 0 ${end.x} ${end.y}`;
};

export function AngleTest({ params, onDone }: TestProps<"angle">) {
  const [angle, setAngle] = useState(90);
  const [done, setDone] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const setFromPointer = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg || done) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 200 - CX;
    const y = CY - ((e.clientY - r.top) / r.height) * 110;
    let deg = (Math.atan2(y, x) * 180) / Math.PI;
    if (deg < 0) deg = deg < -90 ? 180 : 0;
    setAngle(Math.round(deg));
  };

  const submit = () => {
    setDone(true);
    onDone({ score: scoreAngle(angle, params.target), yours: `${angle}°`, actual: `${params.target}°` });
  };

  const tip = point(angle);
  const target = point(params.target);

  return (
    <div className="space-y-5">
      <p className="text-center font-display text-2xl">
        Make <span className="rounded-lg bg-daily px-2">{params.target}°</span>
      </p>
      <div className={`${STAGE} dots max-w-[460px] p-3`}>
        <svg
          ref={svgRef}
          viewBox="0 0 200 110"
          className="w-full touch-none select-none"
          role="slider"
          aria-label="Angle arm. Drag, or use the arrow keys."
          aria-valuemin={0}
          aria-valuemax={180}
          tabIndex={0}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons) setFromPointer(e);
          }}
          onKeyDown={(e) => {
            if (done) return;
            const step = e.shiftKey ? 10 : 1;
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") setAngle((a) => Math.min(180, a + step));
            if (e.key === "ArrowRight" || e.key === "ArrowDown") setAngle((a) => Math.max(0, a - step));
          }}
        >
          <path d={arc(angle, 24)} fill="none" stroke="#ffc93c" strokeWidth="10" />
          <line x1={CX} y1={CY} x2={CX + ARM} y2={CY} stroke="#141414" strokeWidth="5" strokeLinecap="round" />
          {done && (
            <motion.line
              x1={CX}
              y1={CY}
              x2={target.x}
              y2={target.y}
              stroke="#3b5bff"
              strokeWidth="4"
              strokeDasharray="6 5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}
          <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="#141414" strokeWidth="5" strokeLinecap="round" />
          <circle cx={tip.x} cy={tip.y} r="8" fill="#ff5a3c" stroke="#141414" strokeWidth="3" className="cursor-grab" />
          <circle cx={CX} cy={CY} r="5" fill="#141414" />
        </svg>
      </div>
      {!done && (
        <div className="flex justify-center">
          <button type="button" onClick={submit} className={`${BIG_BUTTON} bg-pop text-paper`}>
            That’s {params.target}°
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Keep the beat                                                    */
/* ------------------------------------------------------------------ */

const LEAD_BEATS = 4;
const TAPS_NEEDED = 8;

function beep(ctx: AudioContext | null, freq: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export function RhythmTest({ params, onDone }: TestProps<"rhythm">) {
  const period = 60_000 / params.bpm;
  const [phase, setPhase] = useState<"ready" | "listening" | "tapping" | "done">("ready");
  const [pulse, setPulse] = useState(0);
  const [sound, setSound] = useState(true);
  const [gaps, setGaps] = useState<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const taps = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const interval = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearInterval(interval.current);
    void audio.current?.close();
  }, []);

  const listen = () => {
    if (sound && !audio.current) audio.current = new AudioContext();
    setPhase("listening");
    let beats = 0;
    const tick = () => {
      beats += 1;
      setPulse((p) => p + 1);
      beep(sound ? audio.current : null, beats === 1 ? 880 : 660);
      if (beats >= LEAD_BEATS) {
        window.clearInterval(interval.current);
        window.setTimeout(() => setPhase("tapping"), period * 0.5);
      }
    };
    tick();
    interval.current = window.setInterval(tick, period);
  };

  const tap = () => {
    if (phase !== "tapping") return;
    taps.current.push(performance.now());
    setTapCount(taps.current.length);
    setPulse((p) => p + 1);
    beep(sound ? audio.current : null, 520);
    if (taps.current.length >= TAPS_NEEDED) {
      const times = taps.current;
      setGaps(times.slice(1).map((t, i) => t - times[i]));
      setPhase("done");
      const avgGap = (times[times.length - 1] - times[0]) / (times.length - 1);
      onDone({
        score: scoreRhythm(times, params.bpm),
        yours: `${Math.round(60_000 / avgGap)} bpm`,
        actual: `${params.bpm} bpm`,
      });
    }
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.code === "Space" && phase === "tapping" && !e.repeat) {
      e.preventDefault();
      tap();
    }
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const tapped = phase === "done" ? TAPS_NEEDED : tapCount;

  return (
    <div className="space-y-5">
      <div className={`${STAGE} flex h-64 max-w-[460px] flex-col items-center justify-center gap-5`}>
        <motion.button
          type="button"
          key={pulse}
          onPointerDown={tap}
          disabled={phase !== "tapping"}
          aria-label="Tap the beat"
          className={`flex size-32 items-center justify-center rounded-full border-[3px] border-ink font-display text-lg shadow-[5px_5px_0_0_var(--color-ink)] ${
            phase === "tapping" ? "bg-sports" : "bg-music"
          }`}
          initial={{ scale: pulse ? 1.22 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 14 }}
        >
          {phase === "listening" ? "Listen" : phase === "tapping" ? "Tap!" : phase === "done" ? "Done" : "♪"}
        </motion.button>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TAPS_NEEDED }, (_, i) => (
            <span
              key={i}
              className={`size-3 rounded-full border-2 border-ink transition-colors ${i < tapped ? "bg-ink" : "bg-paper"}`}
            />
          ))}
        </div>
      </div>

      {phase === "done" && (
        <div className="mx-auto flex h-16 max-w-[460px] items-end gap-2" aria-hidden>
          {gaps.map((g, i) => {
            const ratio = Math.min(2, g / period);
            return (
              <motion.span
                key={i}
                className={`relative flex-1 rounded-t-md border-2 border-ink ${Math.abs(ratio - 1) < 0.08 ? "bg-sports" : "bg-casino"}`}
                initial={{ height: 0 }}
                animate={{ height: `${ratio * 50}%` }}
                transition={{ delay: i * 0.05 }}
              />
            );
          })}
        </div>
      )}
      {phase === "done" && (
        <p className="text-center font-mono text-xs text-ink-soft">Each bar is a gap between taps. Green = on the beat.</p>
      )}

      {phase === "ready" && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={listen} className={`${BIG_BUTTON} bg-daily`}>
            Play the beat
          </button>
          <label className="flex items-center gap-2 font-mono text-sm font-bold">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} className="size-4 accent-[var(--color-pop)]" />
            Sound
          </label>
        </div>
      )}
      {phase === "tapping" && (
        <p className="text-center font-mono text-sm font-bold">
          Keep going: tap the circle (or press space) {TAPS_NEEDED} times in time.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Fair share                                                       */
/* ------------------------------------------------------------------ */

export function ProportionTest({ params, onDone }: TestProps<"proportion">) {
  const target = params.numerator / params.denominator;
  const [pos, setPos] = useState(0.5);
  const [done, setDone] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const setFromPointer = (e: React.PointerEvent) => {
    const bar = barRef.current;
    if (!bar || done) return;
    const r = bar.getBoundingClientRect();
    setPos(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  const submit = () => {
    setDone(true);
    onDone({
      score: scoreProportion(pos, target),
      yours: `${(pos * 100).toFixed(1)}%`,
      actual: `${(target * 100).toFixed(1)}%`,
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-center font-display text-2xl">
        Mark{" "}
        <span className="inline-flex flex-col items-center rounded-lg bg-daily px-2 align-middle text-lg leading-none">
          <span>{params.numerator}</span>
          <span className="my-0.5 h-0.5 w-full bg-ink" />
          <span>{params.denominator}</span>
        </span>{" "}
        of the bar
      </p>
      <div className="mx-auto max-w-[520px] px-3 pt-6 pb-8">
        <div
          ref={barRef}
          className="brut relative h-16 cursor-pointer touch-none rounded-xl bg-paper"
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons) setFromPointer(e);
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-l-[9px] bg-sports" style={{ width: `${pos * 100}%` }} />
          {done && (
            <motion.div
              className="absolute -inset-y-4 w-1.5 -translate-x-1/2 bg-pop"
              style={{ left: `${target * 100}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
            >
              <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 font-display text-[10px] whitespace-nowrap text-pop">
                TARGET
              </span>
            </motion.div>
          )}
          <button
            type="button"
            disabled={done}
            aria-label="Marker. Drag, or use the arrow keys."
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.05 : 0.005;
              if (e.key === "ArrowRight") setPos((p) => Math.min(1, p + step));
              if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - step));
            }}
            className="absolute -top-5 bottom-[-20px] w-6 -translate-x-1/2 cursor-grab"
            style={{ left: `${pos * 100}%` }}
          >
            <span className="mx-auto block h-full w-2 rounded-full border-2 border-ink bg-casino" />
          </button>
        </div>
      </div>
      {!done && (
        <div className="flex justify-center">
          <button type="button" onClick={submit} className={`${BIG_BUTTON} bg-pop text-paper`}>
            That’s {params.numerator}/{params.denominator}
          </button>
        </div>
      )}
    </div>
  );
}
