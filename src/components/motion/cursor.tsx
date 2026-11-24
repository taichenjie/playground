"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useFinePointer } from "./use-media-query";

/**
 * A springy ring that trails the mouse and swells over anything clickable.
 * The normal cursor stays visible; this is decoration. Mouse only.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 600, damping: 38, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 600, damping: 38, mass: 0.4 });

  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const target = e.target as Element | null;
      setHovering(Boolean(target?.closest?.("a, button, [data-cursor='hover']")));
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] rounded-full border-2 border-ink"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: hovering ? 54 : 22,
        height: hovering ? 54 : 22,
        backgroundColor: hovering ? "rgba(255, 201, 60, 0.45)" : "rgba(255, 201, 60, 0)",
        opacity: visible ? 1 : 0,
        scale: pressed ? 0.75 : 1,
      }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
    />
  );
}
