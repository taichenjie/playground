"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Accessible modal built on the native <dialog> element: it traps focus,
 * closes on Escape and on a click outside the panel.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,440px)] overflow-visible bg-transparent p-0 text-ink backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <motion.div
          className="brut relative max-h-[86dvh] overflow-y-auto rounded-3xl bg-paper p-6"
          initial={{ opacity: 0, scale: 0.8, y: 40, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="wide text-2xl font-black uppercase">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="brut-sm press flex size-9 shrink-0 items-center justify-center rounded-full bg-daily text-lg font-black"
            >
              ×
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </motion.div>
      )}
    </dialog>
  );
}
