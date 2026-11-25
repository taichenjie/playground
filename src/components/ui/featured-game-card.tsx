import Link from "next/link";
import { Stamp } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { SectionIcon } from "@/components/ui/section-icon";
import type { FeaturedGame } from "@/features/featured";
import { getSection } from "@/features/sections";

/** Compact sticker card for the homepage "Today" line-up. */
export function FeaturedGameCard({ game, index }: { game: FeaturedGame; index: number }) {
  const section = getSection(game.section);
  const playable = Boolean(game.href && !game.comingSoon);

  const body = (
    <div className="brut relative flex h-full flex-col overflow-hidden rounded-2xl bg-paper">
      <div className={`flex items-center justify-between border-b-[2.5px] border-ink px-4 py-2.5 ${section.accent.bg}`}>
        <span className="inline-flex items-center gap-2 text-xs font-extrabold whitespace-nowrap">
          <SectionIcon slug={section.slug} className="size-4" />
          {section.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="wide text-2xl leading-tight font-black uppercase lg:text-xl xl:text-2xl">{game.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{game.blurb}</p>
        <div className="mt-6 flex items-end justify-between gap-3">
          <span className="font-mono text-xs font-bold whitespace-nowrap">⏱ {game.meta}</span>
          {playable ? (
            <span className="brut-sm rounded-full bg-pop px-3 py-1 text-xs font-extrabold text-paper">Play →</span>
          ) : (
            <Stamp className="text-pop" rotate={index % 2 ? 8 : -9} delay={0.3 + index * 0.12}>
              Coming soon
            </Stamp>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Tilt rest={index % 2 ? 1.6 : -1.6} className="h-full rounded-2xl">
      {playable ? (
        <Link href={game.href!} className="block h-full">
          {body}
        </Link>
      ) : (
        <article className="h-full">{body}</article>
      )}
    </Tilt>
  );
}
