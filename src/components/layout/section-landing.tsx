import Link from "next/link";
import { Marquee } from "@/components/motion/marquee";
import { ProximityText } from "@/components/motion/proximity-text";
import { Reveal, Stamp } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { SectionScene } from "@/components/scenes/section-scene";
import { SectionIcon } from "@/components/ui/section-icon";
import type { Section } from "@/features/sections";

/**
 * Landing page shared by every section until it has real games. When a
 * section gets its first game, its route can list that game here instead of
 * (or alongside) the "In the works" grid.
 */
export function SectionLanding({ section }: { section: Section }) {
  const playable = section.planned.some((f) => f.href);

  return (
    <>
      <section className={`dots relative border-b-[2.5px] border-ink ${section.accent.bg}`}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal rotate={-8}>
              <span className="brut-sm inline-flex items-center gap-2 rounded-full bg-paper px-4 py-1.5 font-display text-xs">
                <SectionIcon slug={section.slug} className="size-4" />
                Section {section.number}
              </span>
            </Reveal>
            <ProximityText
              className="mt-6 text-[clamp(3rem,10vw,6.5rem)] leading-[0.92] uppercase"
              words={section.name.split(" ").map((text) => ({ text }))}
              radius={200}
            />
            <Reveal delay={0.3}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed font-medium">{section.description}</p>
            </Reveal>
            {section.notice && (
              <Reveal delay={0.45}>
                <p className="brut mt-7 max-w-xl rounded-2xl bg-paper px-5 py-4 text-sm leading-relaxed" role="note">
                  <strong className="font-display text-sm">⚠ {section.notice.title}</strong>{" "}
                  {section.notice.body}
                </p>
              </Reveal>
            )}
          </div>
          <Reveal delay={0.2} y={60}>
            <div className="brut flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[28px] bg-paper py-10 sm:min-h-[24rem]">
              <SectionScene slug={section.slug} size="lg" />
            </div>
          </Reveal>
        </div>
      </section>

      <Marquee speed={2} className="border-b-[2.5px] border-ink bg-ink py-3 text-paper">
        {Array.from({ length: 2 }).flatMap((_, r) =>
          section.planned.map((f, i) => (
            <span key={`${r}-${i}`} className="flex items-center font-display text-xl" aria-hidden>
              {f.name}
              <span className={`mx-6 ${section.accent.text}`}>●</span>
            </span>
          )),
        )}
      </Marquee>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6" aria-labelledby="planned-heading">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold">
              {playable ? "— Play now, more on the way" : "— Nothing playable yet"}
            </p>
            <h2 id="planned-heading" className="wide mt-1 text-4xl font-black uppercase sm:text-5xl">
              {playable ? "Games" : "In the works"}
            </h2>
          </div>
        </Reveal>
        <ul className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {section.planned.map((format, i) => {
            const card = (
              <div
                className={`brut relative flex h-full flex-col rounded-2xl p-5 ${
                  format.href ? `press ${section.accent.bg}` : "bg-paper"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl border-[2.5px] border-ink font-mono text-sm font-bold ${
                      format.href ? "bg-paper" : section.accent.bg
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {format.href ? (
                    <span className="brut-sm rounded-full bg-pop px-3 py-1 text-xs font-extrabold text-paper">
                      Play now →
                    </span>
                  ) : (
                    <Stamp className="text-pop" rotate={i % 2 ? 7 : -8} delay={0.25 + (i % 3) * 0.1}>
                      Soon
                    </Stamp>
                  )}
                </div>
                <h3 className="wide mt-5 text-xl font-black uppercase">{format.name}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${format.href ? "font-medium" : "text-ink-soft"}`}>
                  {format.blurb}
                </p>
              </div>
            );
            return (
            <li key={format.name}>
              <Reveal delay={(i % 3) * 0.08} rotate={i % 2 ? 5 : -5} className="h-full">
                <Tilt rest={i % 2 ? 1.2 : -1.2} className="h-full rounded-2xl">
                  {format.href ? (
                    <Link href={format.href} className="block h-full rounded-2xl">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </Tilt>
              </Reveal>
            </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
