"use client";

import { Magnetic } from "@/components/motion/magnetic";

export function BackToTop() {
  return (
    <Magnetic strength={0.4}>
      <button
        type="button"
        data-burst
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="group flex size-24 flex-col items-center justify-center rounded-full border-[2.5px] border-paper bg-daily font-display text-xs text-ink shadow-[5px_5px_0_0_var(--color-paper)] transition-transform hover:rotate-12"
      >
        <span className="text-2xl transition-transform group-hover:-translate-y-1">↑</span>
        Top
      </button>
    </Magnetic>
  );
}
