import { BackToTop } from "@/components/layout/back-to-top";
import { siteConfig } from "@/config/site";

const HOVER_COLOURS = [
  "hover:text-daily",
  "hover:text-music",
  "hover:text-sports",
  "hover:text-casino",
];

/** Minimal footer: the giant wordmark and a back-to-top button. */
export function SiteFooter() {
  return (
    <footer className="mt-28 border-t-[2.5px] border-ink bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-end gap-6 px-4 pt-10 sm:px-6">
        <BackToTop />
        {/* Each letter hops and recolours on hover. */}
        <p
          aria-label={siteConfig.name}
          className="flex w-full justify-between overflow-hidden pb-2 font-display text-[clamp(2.6rem,12.5vw,10.5rem)] leading-[0.9] select-none"
        >
          {siteConfig.name.split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className={`inline-block transition-transform duration-200 ease-[cubic-bezier(.3,.7,.4,1.6)] hover:-translate-y-4 hover:-rotate-6 ${
                HOVER_COLOURS[i % HOVER_COLOURS.length]
              }`}
            >
              {ch}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
