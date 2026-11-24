"use client";

import { AnimatePresence, motion } from "motion/react";

/** Slide-in side panel with a backdrop. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="brut fixed top-3 right-3 bottom-3 z-[75] overflow-y-auto rounded-3xl bg-paper p-5"
            style={{ width: `min(94vw, ${width}px)` }}
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-label={title}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="wide text-xl font-black uppercase">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="brut-sm press flex size-9 shrink-0 items-center justify-center rounded-full bg-daily text-lg font-black"
              >
                ×
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
