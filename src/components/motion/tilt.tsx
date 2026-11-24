"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * 3D tilt toward the mouse, with a soft highlight that follows it.
 * `rest` is the resting rotation in degrees (for a slightly askew sticker look).
 */
export function Tilt({
  children,
  className = "",
  max = 9,
  rest = 0,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  rest?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hovered = useMotionValue(0);

  const spring = { stiffness: 220, damping: 18 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateZ = useSpring(useTransform(hovered, [0, 1], [rest, 0]), spring);

  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.45), transparent 55%)`;
  const glareOpacity = useSpring(hovered, spring);

  return (
    <motion.div
      ref={ref}
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX, rotateY, rotate: rotateZ, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        hovered.set(1);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        hovered.set(0);
      }}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-soft-light"
        style={{ background: glare, opacity: glareOpacity }}
      />
    </motion.div>
  );
}
