import Link from "next/link";
import { Tilt } from "@/components/motion/tilt";
import { SectionScene } from "@/components/scenes/section-scene";
import type { Section } from "@/features/sections";

/** Big sticker card linking to a section, with its looping scene. */
export function SectionCard({ section, index }: { section: Section; index: number }) {
  return (
    <Tilt rest={index % 2 ? 1.2 : -1.2} max={7} className="rounded-[28px]">
      <Link
        href={section.href}
        className={`brut press group dots relative flex min-h-[22rem] flex-col overflow-hidden rounded-[28px] p-6 sm:p-7 ${section.accent.bg}`}
      >
        <div className="flex items-start justify-end">
          <span
            className="flex size-12 items-center justify-center rounded-full border-[2.5px] border-ink bg-paper text-xl transition-transform duration-300 group-hover:-rotate-45 group-hover:bg-ink group-hover:text-paper"
            aria-hidden
          >
            →
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-6 transition-transform duration-300 group-hover:scale-110">
          <SectionScene slug={section.slug} />
        </div>

        <div>
          <h3 className="wide text-4xl leading-none font-black uppercase sm:text-5xl">{section.name}</h3>
          <p className="mt-2 font-semibold">{section.tagline}</p>
        </div>
      </Link>
    </Tilt>
  );
}
