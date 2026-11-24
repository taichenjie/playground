import { Marquee } from "@/components/motion/marquee";
import { sections } from "@/features/sections";

const STAR_COLOURS = ["text-daily", "text-music", "text-sports", "text-casino"];

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`mx-6 size-7 shrink-0 animate-spin [animation-duration:6s] ${className}`} aria-hidden>
      <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="currentColor" stroke="#141414" strokeWidth="1.2" />
    </svg>
  );
}

/** Two crossing tickers. Both react to scroll speed and direction. */
export function TickerBands() {
  const names = sections.map((s) => s.name);
  const words = ["Guess", "Match", "Solve", "Spin", "Score", "Repeat"];

  return (
    <div className="relative my-6 overflow-x-clip py-10" aria-hidden>
      <Marquee
        speed={-1.6}
        className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] border-y-[2.5px] border-ink bg-daily py-2.5"
      >
        {Array.from({ length: 3 }).flatMap((_, r) =>
          words.map((w, i) => (
            <span key={`${r}-${i}`} className="flex items-center font-mono text-lg font-bold uppercase">
              {w}
              <span className="mx-5">✶</span>
            </span>
          )),
        )}
      </Marquee>
      <Marquee
        speed={2.4}
        className="relative -rotate-[2deg] border-y-[2.5px] border-ink bg-ink py-3 text-paper shadow-[0_8px_0_0_rgba(20,20,20,0.15)]"
      >
        {Array.from({ length: 3 }).flatMap((_, r) =>
          names.map((n, i) => (
            <span key={`${r}-${i}`} className="flex items-center font-display text-2xl sm:text-3xl">
              {n}
              <Star className={STAR_COLOURS[i % STAR_COLOURS.length]} />
            </span>
          )),
        )}
      </Marquee>
    </div>
  );
}
