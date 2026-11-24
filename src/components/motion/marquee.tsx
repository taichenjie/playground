"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * An endless ticker. It drifts on its own, speeds up while the page is
 * scrolled and flips direction when you scroll back up.
 */
export function Marquee({
  children,
  speed = 2.2,
  className = "",
}: {
  children: React.ReactNode;
  /** Percent of one copy per second. Negative runs right-to-left. */
  speed?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1200], [0, 6], { clamp: false });
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    const step = direction.current * speed * (delta / 1000) * (1 + Math.abs(b));
    base.set(base.get() + step);
  });

  const x = useTransform(base, (v) => `${wrap(-50, 0, -v)}%`);

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div className="flex w-max" style={{ x }}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
