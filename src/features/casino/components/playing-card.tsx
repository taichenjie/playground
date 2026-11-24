"use client";

import { motion } from "motion/react";
import { isRed, type Card } from "../cards.ts";

const SIZE = {
  sm: "h-[3.3rem] w-[2.35rem] sm:h-[3.9rem] sm:w-[2.8rem] rounded-lg",
  md: "h-[5.6rem] w-[4rem] sm:h-[6.6rem] sm:w-[4.7rem] rounded-xl",
  lg: "h-[6.4rem] w-[4.5rem] sm:h-[8rem] sm:w-[5.6rem] rounded-xl",
};

/**
 * A playing card that slides in from the shoe and flips face-up.
 * `faceDown` shows the back (e.g. the dealer's hole card).
 */
export function PlayingCard({
  card,
  faceDown = false,
  index = 0,
  size = "md",
  className = "",
}: {
  card: Card;
  faceDown?: boolean;
  index?: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const colour = isRed(card) ? "text-casino" : "text-ink";
  const small = size === "sm";
  const label = faceDown ? "Face-down card" : `${card.rank} of ${suitName(card.suit)}`;

  return (
    <motion.div
      className={`relative shrink-0 [perspective:600px] ${SIZE[size]} ${className}`}
      initial={{ x: 120, y: -140, rotate: -25, opacity: 0 }}
      animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: index * 0.12 }}
      role="img"
      aria-label={label}
    >
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Face */}
        <div
          className={`absolute inset-0 rounded-[inherit] border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_0_var(--color-ink)] [backface-visibility:hidden] ${colour}`}
        >
          <span className={`absolute flex flex-col items-center font-display leading-none ${small ? "top-0.5 left-1 text-[11px] sm:text-xs" : "top-1 left-1.5 text-sm sm:text-base"}`}>
            {card.rank}
            <span className={small ? "text-[9px]" : "text-xs"}>{card.suit}</span>
          </span>
          <span className={`absolute inset-0 flex items-center justify-center ${small ? "pt-2 text-lg sm:text-xl" : "text-3xl sm:text-4xl"}`}>{card.suit}</span>
          {!small && (
            <span className="absolute right-1.5 bottom-1 rotate-180 font-display text-sm leading-none sm:text-base">
              {card.rank}
            </span>
          )}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-[inherit] border-[2.5px] border-ink shadow-[3px_3px_0_0_var(--color-ink)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            background:
              "repeating-linear-gradient(45deg, var(--color-pop) 0 6px, var(--color-paper) 6px 12px)",
          }}
        >
          <span className="absolute inset-2 rounded-md border-2 border-paper/80" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function suitName(suit: Card["suit"]) {
  return { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" }[suit];
}
