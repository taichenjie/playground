"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

/** One die face. */
export function Die({ value, size = 56 }: { value: number; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`${value}`} role="img">
      <rect x="3" y="3" width="94" height="94" rx="20" fill="#f6f1e7" stroke="#141414" strokeWidth="6" />
      <rect x="10" y="10" width="80" height="80" rx="15" fill="none" stroke="rgba(20,20,20,0.08)" strokeWidth="4" />
      {PIPS[value].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9.5" fill={value === 1 ? "#d8342f" : "#141414"} />
      ))}
    </svg>
  );
}

/**
 * The pair of dice thrown down the table: they tumble in from the right,
 * flicker through faces while rolling, bounce off the back wall and land.
 */
export function ThrownDice({ dice, rollId, size = 60, onLanded }: { dice: [number, number]; rollId: number; size?: number; onLanded: () => void }) {
  const [faces, setFaces] = useState<[number, number]>(dice);
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 70);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
      setFaces(dice);
      setRolling(false);
    }, 950);
    const landed = window.setTimeout(onLanded, 1150);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
      window.clearTimeout(landed);
    };
    // A new roll remounts this component, so the dice never change underneath it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none flex items-end gap-3" aria-live="polite" aria-label={rolling ? "Rolling" : `Rolled ${dice[0]} and ${dice[1]}`}>
      {[0, 1].map((i) => (
        <motion.div
          key={`${rollId}-${i}`}
          initial={{ x: 420 + i * 40, y: -60 - i * 30, rotate: 0, opacity: 0 }}
          animate={{
            x: [420 + i * 40, 120, -30 - i * 8, 0],
            y: [-60 - i * 30, 20 + i * 10, -18, 0],
            rotate: [0, 340 + i * 90, 600 + i * 70, 720 + (i ? 8 : -6)],
            opacity: [0, 1, 1, 1],
          }}
          transition={{ duration: 1, times: [0, 0.45, 0.78, 1], ease: "easeOut" }}
          style={{ filter: "drop-shadow(3px 5px 0 rgba(0,0,0,0.45))" }}
        >
          <Die value={faces[i]} size={size} />
        </motion.div>
      ))}
    </div>
  );
}
