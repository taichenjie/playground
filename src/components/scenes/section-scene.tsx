"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { SectionSlug } from "@/features/sections";

/*
 * Small looping illustrations, one per section. Everything is sized in `em`
 * so the same scene works as a thumbnail on a card ("sm") or as a big hero
 * illustration ("lg") just by changing the font size.
 */

const SIZES = {
  sm: "text-[9px] sm:text-[10px]",
  lg: "text-[11px] sm:text-[14px] lg:text-[16px]",
};

export function SectionScene({ slug, size = "sm" }: { slug: SectionSlug; size?: "sm" | "lg" }) {
  return (
    <div aria-hidden className={`relative flex items-center justify-center ${SIZES[size]}`}>
      {slug === "daily-games" && <DailyScene />}
      {slug === "music-tv" && <MusicScene />}
      {slug === "sports" && <SportsScene />}
      {slug === "casino" && <CasinoScene />}
    </div>
  );
}

/* ---------- Daily Games: letter tiles that flip through words ---------- */

const WORDS = ["DAILY", "GUESS", "SOLVE", "PLAYS", "BRAIN"];
type Mark = "hit" | "near" | "miss";
const MARKS: Mark[][] = [
  ["hit", "near", "miss", "hit", "hit"],
  ["miss", "hit", "near", "miss", "hit"],
  ["near", "miss", "hit", "hit", "near"],
  ["hit", "hit", "hit", "near", "miss"],
  ["hit", "hit", "hit", "hit", "hit"],
];
const MARK_BG: Record<Mark, string> = {
  hit: "bg-sports",
  near: "bg-pop text-paper",
  miss: "bg-paper",
};

function DailyScene() {
  const [round, setRound] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setRound((r) => (r + 1) % WORDS.length), 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex gap-[0.45em] [perspective:40em]">
      {WORDS[round].split("").map((ch, i) => (
        <motion.span
          key={`${round}-${i}`}
          initial={{ rotateX: 90, y: -6 }}
          animate={{ rotateX: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: i * 0.09 }}
          className={`flex items-center justify-center border-solid border-ink font-display leading-none ${
            MARK_BG[MARKS[round][i]]
          }`}
          style={{ fontSize: "2.4em", width: "1.8em", height: "1.8em", borderWidth: "0.12em", borderRadius: "0.25em", boxShadow: "0.09em 0.09em 0 0 var(--color-ink)" }}
        >
          {ch}
        </motion.span>
      ))}
    </div>
  );
}

/* ---------- Music & TV: a spinning record and a bouncing equaliser ---------- */

const EQ = [
  { keys: [0.3, 1, 0.45, 0.8, 0.3], d: 0.9 },
  { keys: [0.7, 0.35, 1, 0.5, 0.7], d: 1.1 },
  { keys: [0.45, 0.9, 0.3, 1, 0.45], d: 0.8 },
  { keys: [1, 0.5, 0.75, 0.35, 1], d: 1.0 },
  { keys: [0.4, 0.8, 1, 0.6, 0.4], d: 0.95 },
  { keys: [0.65, 0.3, 0.55, 0.95, 0.65], d: 1.2 },
];

function MusicScene() {
  return (
    <div className="flex items-end gap-[2em]">
      <div className="relative">
        <motion.div
          className="relative size-[11em] rounded-full border-[0.3em] border-ink"
          style={{
            background:
              "repeating-radial-gradient(circle, #141414 0 0.35em, #2b2b2b 0.35em 0.55em)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-[34%] flex items-center justify-center rounded-full border-[0.25em] border-ink bg-music">
            <span className="block size-[0.9em] rounded-full bg-ink" />
          </div>
          <span className="absolute top-[18%] left-[22%] h-[0.5em] w-[2.2em] rotate-[-40deg] rounded-full bg-paper/30" />
        </motion.div>
        {/* Tone arm */}
        <motion.div
          className="absolute -top-[1em] -right-[1.4em] h-[7em] w-[0.6em] origin-top rounded-full border-[0.2em] border-ink bg-paper"
          animate={{ rotate: [18, 24, 18] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="flex h-[9em] items-end gap-[0.45em]">
        {EQ.map((bar, i) => (
          <motion.span
            key={i}
            className={`block h-full w-[1.1em] origin-bottom rounded-t-[0.3em] border-[0.22em] border-ink ${
              i % 2 ? "bg-paper" : "bg-pop"
            }`}
            animate={{ scaleY: bar.keys }}
            transition={{ duration: bar.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Sports: a bouncing, squashing ball ---------- */

function SportsScene() {
  return (
    <div className="relative flex h-[14em] w-[18em] flex-col items-center justify-end">
      {/* Court lines */}
      <div className="absolute inset-x-0 bottom-[1.2em] h-[0.3em] rounded-full bg-ink" />
      <div className="absolute bottom-[1.2em] left-1/2 h-[3.2em] w-[9em] -translate-x-1/2 rounded-t-full border-[0.3em] border-b-0 border-ink" />
      {/* Shadow */}
      <motion.span
        className="absolute bottom-[1.05em] h-[0.9em] w-[5em] rounded-[50%] bg-ink/30"
        animate={{ scaleX: [1, 0.45, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative mb-[1.5em] origin-bottom"
        animate={{
          y: ["0em", "-7.5em", "0em"],
          scaleY: [0.82, 1.06, 0.82],
          scaleX: [1.14, 0.95, 1.14],
        }}
        transition={{ duration: 0.9, repeat: Infinity, ease: ["easeOut", "easeIn"], times: [0, 0.5, 1] }}
      >
        <motion.svg
          viewBox="0 0 40 40"
          className="size-[5.4em]"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="20" cy="20" r="18" fill="#ff8a3c" stroke="#141414" strokeWidth="2.6" />
          <path d="M2 20h36M20 2v36" stroke="#141414" strokeWidth="2.2" fill="none" />
          <path d="M7 7c6 5 6 21 0 26M33 7c-6 5-6 21 0 26" stroke="#141414" strokeWidth="2.2" fill="none" />
        </motion.svg>
      </motion.div>
    </div>
  );
}

/* ---------- Casino: a spinning wheel and a fanning hand of cards ---------- */

const CARDS = [
  { suit: "♠", rank: "A", colour: "text-ink", from: -10, to: -22 },
  { suit: "♥", rank: "K", colour: "text-casino", from: 0, to: 0 },
  { suit: "♦", rank: "Q", colour: "text-casino", from: 10, to: 22 },
];

function CasinoScene() {
  return (
    <div className="flex items-center gap-[2.4em]">
      <div className="relative size-[11em]">
        <motion.div
          className="absolute inset-0 rounded-full border-[0.3em] border-ink"
          style={{
            background:
              "repeating-conic-gradient(#ff5a3c 0deg 18deg, #141414 18deg 36deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-[30%] rounded-full border-[0.3em] border-ink bg-sports" />
          <div className="absolute inset-[44%] rounded-full bg-ink" />
        </motion.div>
        {/* The ball orbits the other way */}
        <motion.div
          className="absolute inset-[0.9em]"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute top-0 left-1/2 block size-[1.2em] -translate-x-1/2 rounded-full border-[0.18em] border-ink bg-paper" />
        </motion.div>
      </div>
      <div className="relative h-[8em] w-[6em]">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.suit}
            className="absolute inset-0 origin-bottom rounded-[0.6em] border-[0.25em] border-ink bg-paper p-[0.4em] shadow-[0.25em_0.25em_0_0_var(--color-ink)]"
            animate={{ rotate: [c.from, c.to, c.from], y: ["0em", i === 1 ? "-0.8em" : "0em", "0em"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 * i }}
          >
            <span className={`block font-display text-[1.6em] leading-none ${c.colour}`}>{c.rank}</span>
            <span className={`absolute inset-0 flex items-center justify-center text-[3.2em] ${c.colour}`}>
              {c.suit}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
