"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { POCKET_DEG, WHEEL, colourOf, pocketAngle } from "../logic.ts";

const FILL = { red: "#c4182b", black: "#161616", green: "#0e8a4f" } as const;

/** Points of a ring segment centred on `angle` (degrees clockwise from the top). */
function wedge(angle: number, r1: number, r2: number, width = POCKET_DEG) {
  const a0 = ((angle - width / 2 - 90) * Math.PI) / 180;
  const a1 = ((angle + width / 2 - 90) * Math.PI) / 180;
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(r1, a0)} L ${p(r2, a0)} A ${r2} ${r2} 0 0 1 ${p(r2, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`;
}

export const SPIN_SECONDS = 5.4;

/** Ball radius path (in wheel units): rolls on the track, drops, rattles over frets, settles. */
const BALL_R = [-95, -95, -93, -74, -84, -62, -70, -64, -66, -65];
const BALL_T = [0, 0.45, 0.6, 0.7, 0.76, 0.83, 0.88, 0.93, 0.97, 1];
const TRAIL = [0.05, 0.1, 0.15];

/**
 * The wheel and ball. Both angles are absolute targets in degrees; the
 * parent picks them so the ball comes to rest in the winning pocket.
 */
export function Wheel({
  size,
  wheelAngle,
  ballAngle,
  spinId,
  spinning,
  result,
  onLanded,
}: {
  size: number;
  wheelAngle: number;
  ballAngle: number;
  spinId: number;
  spinning: boolean;
  result: number | null;
  onLanded: () => void;
}) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0.8 : SPIN_SECONDS;
  const scale = size / 200;
  const ease = [0.1, 0.6, 0.2, 1] as const;
  const ball = 9 * scale;

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={result !== null && !reduce ? { scale: [1, 1.045, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Light ring that chases while the wheel spins */}
      <motion.div
        className="pointer-events-none absolute -inset-3 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,214,120,0) 0deg, rgba(255,214,120,0.85) 40deg, rgba(255,214,120,0) 90deg, rgba(255,90,60,0) 180deg, rgba(255,90,60,0.7) 220deg, rgba(255,90,60,0) 270deg)",
          filter: "blur(10px)",
        }}
        animate={spinning ? { opacity: 1, rotate: 360 } : { opacity: result !== null ? 0.55 : 0, rotate: 0 }}
        transition={spinning ? { rotate: { duration: 1.1, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.3 } } : { duration: 0.6 }}
      />

      {/* Bowl */}
      <div
        className="absolute inset-0 rounded-full border-[3px] border-ink"
        style={{
          background: "radial-gradient(circle, #6b3b1f 0%, #4a2412 62%, #2a140a 100%)",
          boxShadow: "0 14px 34px rgba(0,0,0,0.6), inset 0 0 0 6px #e8b84a55",
        }}
      />
      {/* Ball track sheen */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: "2.5%",
          background: "conic-gradient(from 200deg, transparent, rgba(255,255,255,0.12), transparent 30%, transparent 70%, rgba(255,255,255,0.08), transparent)",
        }}
      />

      {/* Rotor */}
      <motion.svg
        viewBox="-100 -100 200 200"
        className="absolute inset-0"
        initial={false}
        animate={{ rotate: wheelAngle }}
        transition={{ duration: spinId ? duration : 0, ease }}
        aria-hidden
      >
        <defs>
          <radialGradient id="rw-cone">
            <stop offset="0" stopColor="#d9ab4a" />
            <stop offset="0.55" stopColor="#7a4a1e" />
            <stop offset="1" stopColor="#4a2412" />
          </radialGradient>
          <filter id="rw-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <circle r="90" fill="#2a140a" />
        {WHEEL.map((n, i) => {
          const angle = i * POCKET_DEG;
          return (
            <g key={n}>
              <path d={wedge(angle, 58, 90)} fill={FILL[colourOf(n)]} stroke="#e8b84a" strokeWidth="0.6" />
              <text
                x="0"
                y="-81"
                transform={`rotate(${angle})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#f3ede2"
                fontSize="7.2"
                fontWeight="800"
                fontFamily="var(--font-archivo)"
              >
                {n}
              </text>
            </g>
          );
        })}
        <circle r="72" fill="none" stroke="#e8b84a" strokeWidth="0.8" />
        {/* Winning pocket lights up and rides round with the wheel */}
        {result !== null && (
          <g>
            <motion.path
              d={wedge(pocketAngle(result), 56, 92, POCKET_DEG + 2)}
              fill="#ffd678"
              filter="url(#rw-glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.45, 0.9, 0.45] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            />
            <path d={wedge(pocketAngle(result), 58, 90)} fill="none" stroke="#fff2c4" strokeWidth="2" />
          </g>
        )}
        <circle r="58" fill="#5b2e16" stroke="#e8b84a" strokeWidth="1.2" />
        <circle r="44" fill="url(#rw-cone)" />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x="-2.2" y="-40" width="4.4" height="30" rx="2" fill="#e8b84a" transform={`rotate(${a})`} />
        ))}
        {[45, 135, 225, 315].map((a) => (
          <circle key={a} cx="0" cy="-36" r="2.6" fill="#e8b84a" transform={`rotate(${a})`} />
        ))}
        <circle r="10" fill="#e8b84a" stroke="#141414" strokeWidth="1.5" />
        <circle r="4" fill="#fff2c4" />
      </motion.svg>

      {/* Ghost balls trailing behind while it rolls */}
      {!reduce &&
        TRAIL.map((lag, i) => (
          <motion.div
            key={`trail-${i}`}
            className="pointer-events-none absolute inset-0"
            initial={false}
            animate={{ rotate: ballAngle }}
            transition={{ duration: spinId ? duration : 0, ease, delay: spinId ? lag : 0 }}
          >
            <motion.span
              key={spinId}
              className="absolute left-1/2 top-1/2 block rounded-full"
              style={{ width: ball, height: ball, marginLeft: -ball / 2, marginTop: -ball / 2, background: "#fff6dc" }}
              initial={{ y: -65 * scale, opacity: 0 }}
              animate={spinning ? { y: -95 * scale, opacity: [0, 0.45 - i * 0.12, 0.45 - i * 0.12, 0] } : { opacity: 0 }}
              transition={{ duration: duration * 0.62, times: [0, 0.1, 0.8, 1] }}
            />
          </motion.div>
        ))}

      {/* Ball: spun around the centre, dropping from the track into a pocket */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ rotate: ballAngle }}
        transition={{ duration: spinId ? duration : 0, ease }}
        onAnimationComplete={() => {
          if (spinId) onLanded();
        }}
      >
        <motion.span
          key={spinId}
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{
            width: ball,
            height: ball,
            marginLeft: -ball / 2,
            marginTop: -ball / 2,
            background: "radial-gradient(circle at 35% 30%, #ffffff, #d9d4c8 60%, #9a948a)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.6)",
          }}
          initial={{ y: -65 * scale }}
          animate={{ y: spinId ? BALL_R.map((r) => r * scale) : -65 * scale }}
          transition={{ duration, times: BALL_T, ease: "easeOut" }}
        />
      </motion.div>

      {/* Pointer */}
      <div
        className="absolute left-1/2 -top-1.5 h-0 w-0 -translate-x-1/2"
        style={{ borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "16px solid #e8b84a" }}
        aria-hidden
      />

      <AnimatePresence>
        {result !== null && (
          <motion.span
            key={`ring-${spinId}`}
            className="pointer-events-none absolute inset-0 rounded-full border-4 border-gold"
            initial={{ scale: 0.9, opacity: 0.9 }}
            animate={{ scale: 1.35, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <span className="sr-only" aria-live="polite">
        {result === null ? "" : `Ball landed on ${result} ${colourOf(result)}`}
      </span>
    </motion.div>
  );
}
