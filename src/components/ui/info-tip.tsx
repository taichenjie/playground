"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

/**
 * A small "i" button that reveals an explanation on hover, focus or tap.
 * Must not be placed inside another button.
 */
export function InfoTip({
  title,
  children,
  placement = "top",
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  placement?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          // Hover already opened it on desktop; on touch this is what opens it.
          e.stopPropagation();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="flex size-[18px] items-center justify-center rounded-full border-2 border-ink bg-paper font-serif text-[11px] leading-none font-black text-ink italic hover:bg-daily"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <span
            className={`absolute left-1/2 z-50 w-60 -translate-x-1/2 ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            <motion.span
              id={id}
              role="tooltip"
              className="brut-sm block rounded-xl bg-paper p-3 text-left text-xs leading-relaxed font-medium text-ink normal-case"
              initial={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <span className="mb-1 block font-display text-[11px]">{title}</span>
              {children}
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
