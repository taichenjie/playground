import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import { getSection } from "@/features/sections";
import { CasinoHud, PlayMoneyNote } from "./casino-hud";

const casino = getSection("casino");

/** Big glyph for each table on the lobby floor. */
const GLYPH: Record<string, string> = {
  Blackjack: "21",
  "Texas Hold’em": "♠♥",
  Roulette: "◎",
  Baccarat: "9",
  Craps: "⚄⚂",
  "Card counting trainer": "+1−1",
};

const FELT: Record<string, string> = {
  Blackjack: "#136b44",
  "Texas Hold’em": "#0f5a6b",
  Roulette: "#7a1d2b",
  Baccarat: "#1f3f86",
  Craps: "#5a2a7a",
  "Card counting trainer": "#2f4f2f",
};

const BULBS = 18;

export function CasinoLobby() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6">
      {/* Marquee sign */}
      <Reveal>
        <div
          className="relative mx-auto max-w-3xl rounded-[28px] border-[3px] border-gold px-6 py-10 text-center sm:py-12"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #4a1626, #200a12)" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-4 inset-y-2 flex flex-col justify-between">
            {[0, 1].map((row) => (
              <div key={row} className="flex justify-between">
                {Array.from({ length: BULBS }, (_, i) => (
                  <span
                    key={i}
                    className="bulb block size-2 rounded-full"
                    style={{ background: "#ffd678", animationDelay: `${((row ? BULBS - i : i) % 4) * 0.3}s` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="font-mono text-xs font-bold tracking-[0.3em] text-gold uppercase">Welcome to the</p>
          <h1
            className="mt-2 font-display text-[clamp(2.4rem,8vw,5rem)] leading-none text-paper"
            style={{ textShadow: "0 0 18px rgba(255,90,60,0.85), 0 0 2px #fff" }}
          >
            Casino
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-soft sm:text-base">
            One bankroll for every table. Win chips, climb the leagues and unlock higher stakes and tougher opponents.
          </p>
        </div>
      </Reveal>

      <div className="mt-8">
        <CasinoHud />
      </div>

      <h2 className="mt-12 font-display text-2xl text-gold">The tables</h2>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {casino.planned.map((game, i) => {
          const open = Boolean(game.href);
          const card = (
            <div
              className={`brut relative flex h-full flex-col overflow-hidden rounded-[26px] border-[3px] p-5 text-paper ${open ? "press" : ""}`}
              style={{
                background: `radial-gradient(ellipse at 50% 20%, ${FELT[game.name] ?? "#136b44"}, #0b0b0b 140%)`,
                boxShadow: open ? undefined : "none",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-2 rounded-[20px] border-2 border-dashed"
                style={{ borderColor: "rgba(232,184,74,0.45)" }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <span className="font-display text-4xl leading-none text-gold">{GLYPH[game.name] ?? "♣"}</span>
                {open ? (
                  <span className="brut-sm rounded-full bg-gold px-3 py-1 text-xs font-extrabold">Take a seat →</span>
                ) : (
                  <span className="rounded-full border-2 border-gold/60 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                    Opening soon
                  </span>
                )}
              </div>
              <h3 className="relative mt-8 font-display text-xl uppercase">{game.name}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed" style={{ color: "rgba(243,237,226,0.8)" }}>
                {game.blurb}
              </p>
            </div>
          );
          return (
            <li key={game.name} className={open ? "" : "opacity-70"}>
              <Reveal delay={(i % 3) * 0.08} className="h-full">
                {open ? (
                  <Tilt rest={0} className="h-full rounded-[26px]">
                    <Link href={game.href!} className="block h-full rounded-[26px]">
                      {card}
                    </Link>
                  </Tilt>
                ) : (
                  card
                )}
              </Reveal>
            </li>
          );
        })}
      </ul>

      <p className="mx-auto mt-12 max-w-2xl rounded-2xl border-2 border-gold/50 px-5 py-4 text-center text-sm leading-relaxed">
        <strong className="font-display text-gold">{casino.notice?.title}</strong> {casino.notice?.body}
      </p>
      <PlayMoneyNote />
    </div>
  );
}
