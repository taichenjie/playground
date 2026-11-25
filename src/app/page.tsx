import { Hero } from "@/components/home/hero";
import { ResetCountdown } from "@/components/home/reset-countdown";
import { TickerBands } from "@/components/home/ticker-bands";
import { Reveal } from "@/components/motion/reveal";
import { FeaturedGameCard } from "@/components/ui/featured-game-card";
import { SectionCard } from "@/components/ui/section-card";
import { featuredGames } from "@/features/featured";
import { sections } from "@/features/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TickerBands />

      {/* Today */}
      <section
        id="today"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-16 sm:px-6"
        aria-labelledby="today-heading"
      >
        <Reveal className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-sm font-bold">— The line-up</p>
            <h2 id="today-heading" className="wide mt-1 text-5xl font-black uppercase sm:text-6xl">
              Today
            </h2>
          </div>
          <ResetCountdown />
        </Reveal>
        <ul className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredGames.map((game, i) => (
            <li key={game.title}>
              <Reveal delay={i * 0.08} className="h-full" rotate={i % 2 ? 6 : -6}>
                <FeaturedGameCard game={game} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6" aria-labelledby="sections-heading">
        <Reveal>
          <p className="font-mono text-sm font-bold">— Five rooms, one place</p>
          <h2 id="sections-heading" className="wide mt-1 text-5xl font-black uppercase sm:text-6xl">
            Pick your game
          </h2>
        </Reveal>
        <ul className="mt-9 grid gap-8 md:grid-cols-2">
          {sections.map((section, i) => (
            <li key={section.slug}>
              <Reveal delay={(i % 2) * 0.1} y={50}>
                <SectionCard section={section} index={i} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
