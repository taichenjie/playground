"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** One split-flap tile: rattles through a few characters, then lands. */
function FlapChar({ char, index }: { char: string; index: number }) {
  const [shown, setShown] = useState(char);

  useEffect(() => {
    if (char === " " || char === ":") return;
    let tick = 0;
    const steps = 5 + (index % 3);
    const start = Math.max(0, CHARS.indexOf(char));
    const id = window.setInterval(() => {
      tick += 1;
      if (tick >= steps) {
        setShown(char);
        window.clearInterval(id);
      } else {
        setShown(CHARS[(start + tick * 7 + index) % CHARS.length]);
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [char, index]);

  if (char === " ") return <span className="w-2" />;
  if (char === ":") return <span className="px-0.5 font-bold">:</span>;

  return (
    <span className="relative inline-flex h-[1.6em] w-[1.15em] items-center justify-center overflow-hidden rounded-[4px] bg-ink text-paper [perspective:200px]">
      <motion.span
        key={shown}
        initial={{ rotateX: -90, opacity: 0.4 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.09 }}
        className="block"
      >
        {shown}
      </motion.span>
      <span className="absolute inset-x-0 top-1/2 h-px bg-paper/25" aria-hidden />
    </span>
  );
}

/** Airport-departure-board text. Re-flaps whichever characters change. */
export function FlapText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] font-mono font-bold ${className}`} aria-label={text}>
      {text.split("").map((char, i) => (
        <FlapChar key={i} char={char.toUpperCase()} index={i} />
      ))}
    </span>
  );
}
