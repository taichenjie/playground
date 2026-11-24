"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useFinePointer } from "./use-media-query";

type Word = { text: string; className?: string };

/**
 * Headline whose letters swell (heavier and wider) as the mouse gets close,
 * using Archivo's variable weight and width axes. Words drop in on load.
 */
export function ProximityText({
  words,
  className = "",
  radius = 160,
  as: Tag = "h1",
}: {
  words: Word[];
  className?: string;
  radius?: number;
  as?: "h1" | "h2";
}) {
  const letters = useRef<HTMLSpanElement[]>([]);
  const fine = useFinePointer();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!fine || reduce) return;
    let frame = 0;
    let pointer = { x: -9999, y: -9999 };

    const paint = () => {
      frame = 0;
      for (const el of letters.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
        const t = Math.max(0, 1 - d / radius);
        const eased = t * t * (3 - 2 * t);
        el.style.fontVariationSettings = `"wght" ${Math.round(780 + eased * 120)}, "wdth" ${Math.round(110 + eased * 15)}`;
        el.style.transform = `translateY(${(-eased * 6).toFixed(1)}px)`;
      }
    };
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [fine, reduce, radius]);

  let letterIndex = 0;
  const label = words.map((w) => w.text).join(" ");

  return (
    <Tag className={className} aria-label={label}>
      {words.map((word, wi) => (
        <motion.span
          key={wi}
          aria-hidden
          className="mr-[0.25em] inline-block whitespace-nowrap"
          initial={{ opacity: 0, y: -70, rotate: wi % 2 ? 8 : -8 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 15, delay: 0.15 + wi * 0.09 }}
        >
          <span className={`inline-block ${word.className ?? ""}`}>
          {word.text.split("").map((ch) => {
            const i = letterIndex++;
            return (
              <span
                key={i}
                ref={(el) => {
                  if (el) letters.current[i] = el;
                }}
                className="inline-block transition-[font-variation-settings,transform] duration-150 ease-out"
                style={{ fontVariationSettings: `"wght" 780, "wdth" 110` }}
              >
                {ch}
              </span>
            );
          })}
          </span>
        </motion.span>
      ))}
    </Tag>
  );
}
