import Link from "next/link";

/** Title bar shared by every game page: back link, title, puzzle number, help and stats. */
export function GameHeader({
  title,
  backHref,
  backLabel,
  badge,
  onHelp,
  onStats,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  /** e.g. "#12" for a daily puzzle, or a chip count. */
  badge?: React.ReactNode;
  onHelp?: () => void;
  onStats?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <Link href={backHref} className="font-mono text-xs font-bold text-ink-soft hover:text-ink">
          ← {backLabel}
        </Link>
        <h1 className="wide mt-1 text-3xl leading-none font-black uppercase sm:text-4xl">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && <span className="mr-1 font-mono text-sm font-bold">{badge}</span>}
        {onHelp !== undefined && (
          <button
            type="button"
            onClick={onHelp}
            aria-label="How to play"
            className="brut-sm press flex size-10 items-center justify-center rounded-full bg-paper font-display text-lg"
          >
            ?
          </button>
        )}
        {onStats !== undefined && (
          <button
            type="button"
            onClick={onStats}
            aria-label="Your stats"
            className="brut-sm press flex size-10 items-center justify-center rounded-full bg-daily"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
              <rect x="3" y="12" width="4.5" height="9" rx="1" />
              <rect x="9.75" y="6" width="4.5" height="15" rx="1" />
              <rect x="16.5" y="3" width="4.5" height="18" rx="1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
