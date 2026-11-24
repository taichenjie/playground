"use client";

import { motion, useAnimate } from "motion/react";
import { useRef, useState, type RefObject } from "react";
import { burst } from "@/components/motion/burst";

/*
 * A pin-board of draggable toys for the homepage hero. Everything can be
 * dragged and flung around the box, and each toy does something when
 * tapped (or focused and activated with Enter / Space).
 */

type TapEvent = MouseEvent | TouchEvent | PointerEvent | KeyboardEvent;

function centre(e: TapEvent) {
  const r = (e.target as Element).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function Toy({
  label,
  bounds,
  left,
  top,
  rotate = 0,
  float = 6,
  duration = 4,
  onTap,
  className = "",
  children,
}: {
  label: string;
  bounds: RefObject<HTMLDivElement | null>;
  left: string;
  top: string;
  rotate?: number;
  float?: number;
  duration?: number;
  onTap?: (e: TapEvent) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      drag
      dragConstraints={bounds}
      dragElastic={0.3}
      dragTransition={{ bounceStiffness: 260, bounceDamping: 12, power: 0.35 }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.94 }}
      whileDrag={{ scale: 1.14, rotate: rotate + 10, zIndex: 30 }}
      onTap={(e) => onTap?.(e)}
      className={`absolute cursor-grab touch-none active:cursor-grabbing ${className}`}
      style={{ left, top, rotate }}
    >
      <motion.span
        className="block"
        animate={{ y: [0, -float, 0] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}

/* ----- Die ----- */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ face }: { face: number }) {
  return (
    <span className="grid size-[6.4em] grid-cols-3 grid-rows-3 place-items-center rounded-[1.2em] border-[0.28em] border-ink bg-paper p-[0.7em] shadow-[0.35em_0.35em_0_0_var(--color-ink)]">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`size-[1.15em] rounded-full ${PIPS[face].includes(i) ? "bg-ink" : ""}`} />
      ))}
    </span>
  );
}

/* ----- The box ----- */
const TILE_LETTERS = "PLAYGROUND";

export function ToyBox() {
  const bounds = useRef<HTMLDivElement>(null);

  const [face, setFace] = useState(5);
  const [rolls, setRolls] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [chipFlips, setChipFlips] = useState(0);
  const [letter, setLetter] = useState(0);
  const [ballScope, animateBall] = useAnimate();

  return (
    <div
      ref={bounds}
      className="brut dots relative h-[330px] rounded-[28px] bg-paper-deep text-[9px] sm:h-[420px] sm:text-[11px] lg:h-[480px] lg:text-[12px]"
    >
      <span className="absolute top-3 left-3 rounded-full border-2 border-ink bg-paper px-3 py-1 font-display text-[11px]">
        Toy box
      </span>
      <span className="absolute right-3 bottom-3 font-mono text-[11px] font-bold text-ink-soft">
        drag · fling · tap ↘
      </span>

      <Toy
        label="Roll the die"
        bounds={bounds}
        left="7%"
        top="14%"
        rotate={-8}
        onTap={() => {
          setRolls((r) => r + 1);
          setFace(1 + Math.floor(Math.random() * 6));
        }}
      >
        <motion.span
          className="block"
          animate={{ rotate: rolls * 360 }}
          transition={{ type: "spring", stiffness: 140, damping: 12 }}
        >
          <DieFace face={face} />
        </motion.span>
      </Toy>

      <Toy
        label="Flip the card"
        bounds={bounds}
        left="62%"
        top="10%"
        rotate={9}
        duration={5}
        onTap={() => setCardFlipped((f) => !f)}
      >
        <span className="block [perspective:60em]">
          <motion.span
            className="relative block h-[10em] w-[7.2em] [transform-style:preserve-3d]"
            animate={{ rotateY: cardFlipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16 }}
          >
            <span className="absolute inset-0 rounded-[0.9em] border-[0.28em] border-ink bg-paper p-[0.6em] text-left shadow-[0.35em_0.35em_0_0_var(--color-ink)] [backface-visibility:hidden]">
              <span className="block font-display text-[2.2em] leading-none text-casino">A</span>
              <span className="absolute inset-0 flex items-center justify-center text-[4.6em] text-casino">♥</span>
            </span>
            <span
              className="absolute inset-0 rounded-[0.9em] border-[0.28em] border-ink shadow-[0.35em_0.35em_0_0_var(--color-ink)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
              style={{
                background:
                  "repeating-linear-gradient(45deg, var(--color-pop) 0 0.7em, var(--color-paper) 0.7em 1.4em)",
              }}
            />
          </motion.span>
        </span>
      </Toy>

      <Toy
        label="Bounce the ball"
        bounds={bounds}
        left="68%"
        top="60%"
        float={4}
        duration={3}
        onTap={() => {
          animateBall(ballScope.current, { y: [0, -110, 0, -45, 0, -14, 0] }, { duration: 1.2, ease: "easeOut" });
        }}
      >
        <span ref={ballScope} className="block">
          <svg viewBox="0 0 40 40" className="size-[7em] drop-shadow-[0.3em_0.3em_0_var(--color-ink)]">
            <circle cx="20" cy="20" r="18" fill="#ff8a3c" stroke="#141414" strokeWidth="2.6" />
            <path d="M2 20h36M20 2v36" stroke="#141414" strokeWidth="2.2" fill="none" />
            <path d="M7 7c6 5 6 21 0 26M33 7c-6 5-6 21 0 26" stroke="#141414" strokeWidth="2.2" fill="none" />
          </svg>
        </span>
      </Toy>

      <Toy
        label="Play the record"
        bounds={bounds}
        left="5%"
        top="54%"
        rotate={0}
        float={3}
        duration={6}
        onTap={(e) => burst({ ...centre(e), glyphs: ["♪", "♫", "♬"], count: 10 })}
      >
        <motion.span
          className="relative block size-[11em] rounded-full border-[0.3em] border-ink shadow-[0.35em_0.35em_0_0_var(--color-ink)]"
          style={{ background: "repeating-radial-gradient(circle, #141414 0 0.35em, #2d2d2d 0.35em 0.55em)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute inset-[34%] flex items-center justify-center rounded-full border-[0.25em] border-ink bg-music font-display text-[0.9em]">
            PLAY
          </span>
        </motion.span>
      </Toy>

      <Toy
        label="Change the letter"
        bounds={bounds}
        left="41%"
        top="38%"
        rotate={-4}
        float={8}
        duration={3.4}
        onTap={() => setLetter((l) => (l + 1) % TILE_LETTERS.length)}
      >
        <span className="block [perspective:40em]">
          <motion.span
            key={letter}
            initial={{ rotateX: -90 }}
            animate={{ rotateX: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
            className="flex size-[6.4em] items-center justify-center rounded-[1em] border-[0.28em] border-ink bg-daily font-display text-[1em] leading-none shadow-[0.35em_0.35em_0_0_var(--color-ink)]"
          >
            <span className="text-[3.6em]">{TILE_LETTERS[letter]}</span>
          </motion.span>
        </span>
      </Toy>

      <Toy
        label="Flip the chip"
        bounds={bounds}
        left="40%"
        top="72%"
        float={5}
        duration={4.5}
        onTap={() => setChipFlips((f) => f + 1)}
      >
        <motion.span
          key={chipFlips}
          className="block [perspective:40em]"
          animate={chipFlips ? { y: [0, -60, 0] } : undefined}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.span
            className="flex size-[6.6em] items-center justify-center rounded-full border-[0.28em] border-ink shadow-[0.3em_0.3em_0_0_var(--color-ink)]"
            style={{
              background:
                "repeating-conic-gradient(var(--color-sports) 0deg 30deg, var(--color-paper) 30deg 60deg)",
            }}
            initial={{ rotateY: Math.max(0, chipFlips - 1) * 540 }}
            animate={{ rotateY: chipFlips * 540 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="flex size-[4.2em] items-center justify-center rounded-full border-[0.22em] border-ink bg-sports font-display text-[1em]">
              100
            </span>
          </motion.span>
        </motion.span>
      </Toy>

      <Toy
        label="Pop confetti"
        bounds={bounds}
        left="34%"
        top="6%"
        float={4}
        duration={5.5}
        onTap={(e) => burst({ ...centre(e), count: 22 })}
      >
        <motion.span
          className="relative flex size-[9em] items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full drop-shadow-[0.3em_0.3em_0_var(--color-ink)]">
            <path
              d="M50 2l9 18 19-8-3 20 21 4-15 14 15 14-21 4 3 20-19-8-9 18-9-18-19 8 3-20-21-4 15-14L4 36l21-4-3-20 19 8z"
              fill="var(--color-casino)"
              stroke="#141414"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="relative text-center font-display text-[1.05em] leading-tight text-paper">
            Free
            <br />
            to play
          </span>
        </motion.span>
      </Toy>
    </div>
  );
}
