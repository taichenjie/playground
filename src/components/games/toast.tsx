"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = { id: number; text: string } | null;

/** Small toast manager: `show(text, ms)` replaces any toast currently shown. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const counter = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback((text: string, ms = 1500) => {
    const id = ++counter.current;
    setToast({ id, text });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), ms);
  }, []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 z-20 flex justify-center" aria-live="assertive">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            className="rounded-xl border-2 border-ink bg-ink px-4 py-2 font-extrabold text-paper shadow-[3px_3px_0_0_var(--color-daily)]"
            initial={{ opacity: 0, y: -16, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Copies text, or opens the share sheet on touch devices. Returns a message for a toast. */
export async function shareResult(text: string): Promise<string | null> {
  try {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return null;
    }
    await navigator.clipboard.writeText(text);
    return "Copied to clipboard";
  } catch (err) {
    return (err as Error).name === "AbortError" ? null : "Couldn’t copy — try again";
  }
}
