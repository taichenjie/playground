"use client";

import type { Mark } from "../logic.ts";

const ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"];

const KEY_STYLE: Record<Mark | "none", string> = {
  none: "bg-paper text-ink",
  hit: "bg-sports text-ink",
  near: "bg-pop text-paper",
  miss: "bg-miss text-paper",
};

const MARK_LABEL: Record<Mark, string> = {
  hit: "correct spot",
  near: "in the word",
  miss: "not in the word",
};

type Props = {
  marks: Record<string, Mark>;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function Keyboard({ marks, onLetter, onEnter, onDelete, disabled }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-[520px] gap-2" aria-label="Keyboard" role="group">
      {ROWS.map((row, r) => (
        <div key={r} className="flex justify-center gap-1.5">
          {row.split("").map((key) => {
            const special = key === "+" || key === "-";
            const mark = marks[key];
            const label =
              key === "+" ? "Enter" : key === "-" ? "Delete letter" : mark ? `${key}, ${MARK_LABEL[mark]}` : key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                aria-label={label}
                // Keep focus off the keys so the physical Enter key never "clicks" the last one tapped.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => (key === "+" ? onEnter() : key === "-" ? onDelete() : onLetter(key))}
                className={`press flex h-[52px] items-center justify-center rounded-lg border-2 border-ink font-extrabold uppercase shadow-[2px_2px_0_0_var(--color-ink)] transition-colors duration-300 disabled:opacity-60 sm:h-[58px] ${
                  special ? "flex-[1.6] px-1 text-[11px] sm:text-xs" : "flex-1 text-sm sm:text-base"
                } ${special ? "bg-daily text-ink" : KEY_STYLE[mark ?? "none"]}`}
              >
                {key === "+" ? (
                  "Enter"
                ) : key === "-" ? (
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
                    <path d="M17 9l-5 6M12 9l5 6" />
                  </svg>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
