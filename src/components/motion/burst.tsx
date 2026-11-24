"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const PALETTE = ["#ffc93c", "#ff7eb6", "#3dd68c", "#ff5a3c", "#3b5bff", "#141414"];
const SHAPES = ["square", "circle", "triangle"] as const;

type Particle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  size: number;
  color: string;
  shape: (typeof SHAPES)[number];
  glyph?: string;
};

type BurstDetail = { x: number; y: number; glyphs?: string[]; count?: number };

const EVENT = "pg:burst";
let nextId = 0;

/** Fire a confetti burst at viewport coordinates. */
export function burst(detail: BurstDetail) {
  window.dispatchEvent(new CustomEvent<BurstDetail>(EVENT, { detail }));
}

/**
 * Renders confetti bursts. Mounted once in the root layout.
 * Any element with a `data-burst` attribute pops confetti when clicked;
 * `data-burst="♪ ♫"` uses those glyphs instead of shapes.
 */
export function BurstLayer() {
  const reduce = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reduce) return;

    const spawn = ({ x, y, glyphs, count = 16 }: BurstDetail) => {
      const created: Particle[] = Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 60 + Math.random() * 90;
        return {
          id: nextId++,
          x,
          y,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 30,
          rotate: (Math.random() - 0.5) * 540,
          size: 7 + Math.random() * 9,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          shape: SHAPES[i % SHAPES.length],
          glyph: glyphs?.length ? glyphs[i % glyphs.length] : undefined,
        };
      });
      setParticles((current) => [...current, ...created]);
      const ids = new Set(created.map((p) => p.id));
      window.setTimeout(() => {
        setParticles((current) => current.filter((p) => !ids.has(p.id)));
      }, 900);
    };

    const onBurst = (e: Event) => spawn((e as CustomEvent<BurstDetail>).detail);
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-burst]");
      if (!el) return;
      const glyphs = el.getAttribute("data-burst")?.split(" ").filter(Boolean);
      spawn({ x: e.clientX, y: e.clientY, glyphs });
    };

    window.addEventListener(EVENT, onBurst);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(EVENT, onBurst);
      document.removeEventListener("click", onClick);
    };
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute flex items-center justify-center font-display"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              fontSize: p.glyph ? p.size * 2 : undefined,
              color: p.glyph ? p.color : undefined,
              backgroundColor: p.glyph ? undefined : p.color,
              borderRadius: p.shape === "circle" ? "999px" : 2,
              clipPath: p.shape === "triangle" && !p.glyph ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
              border: p.glyph || p.shape === "triangle" ? undefined : "1.5px solid #141414",
            }}
            initial={{ x: "-50%", y: "-50%", scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{
              x: `calc(-50% + ${p.dx}px)`,
              y: [`calc(-50% + 0px)`, `calc(-50% + ${p.dy}px)`, `calc(-50% + ${p.dy + 70}px)`],
              scale: 1,
              opacity: [1, 1, 0],
              rotate: p.rotate,
            }}
            transition={{ duration: 0.85, ease: [0.2, 0.7, 0.3, 1] }}
          >
            {p.glyph}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
