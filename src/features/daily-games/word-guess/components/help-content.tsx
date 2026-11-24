import type { Mark } from "../logic.ts";
import { MARK_COLOURS } from "./tile";

function Example({ word, mark, at }: { word: string; mark: Mark; at: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {word.split("").map((ch, i) => {
        const colours = i === at ? MARK_COLOURS[mark] : MARK_COLOURS.empty;
        return (
          <span
            key={i}
            className="flex size-10 items-center justify-center rounded-lg border-2 border-ink font-display text-lg uppercase"
            style={{ backgroundColor: colours.bg, color: colours.fg }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}

export function HelpContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        Find the hidden <strong>five-letter word</strong> in <strong>six guesses</strong>. Everyone gets the same
        word, and a new one arrives at midnight.
      </p>
      <p>After each guess the tiles change colour to show how close you were.</p>
      <div className="space-y-2">
        <Example word="plays" mark="hit" at={0} />
        <p>
          <strong>P</strong> is in the word and in the right spot.
        </p>
      </div>
      <div className="space-y-2">
        <Example word="chord" mark="near" at={2} />
        <p>
          <strong>O</strong> is in the word but in a different spot.
        </p>
      </div>
      <div className="space-y-2">
        <Example word="music" mark="miss" at={3} />
        <p>
          <strong>I</strong> is not in the word at all.
        </p>
      </div>
      <p className="font-mono text-xs text-ink-soft">
        Guesses must be real words. Letters can repeat. Type on your keyboard or tap the keys.
      </p>
    </div>
  );
}
