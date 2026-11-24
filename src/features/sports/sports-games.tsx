"use client";

import { motion } from "motion/react";
import { GameHeader } from "@/components/games/game-header";
import { dailyItem } from "@/lib/daily";
import { useDailyPuzzle } from "@/lib/use-daily-puzzle";
import { ClueGame } from "../shared/clue-game/clue-game";
import { PLAYERS, careerSpan, initials, type Player } from "./players";

const SEED = 9029;
const OPTIONS = PLAYERS.map((p) => p.name).sort();
/** Mystery Career reads the same shuffled list half a cycle ahead, so the two games never share a player. */
const OFFSET = Math.floor(PLAYERS.length / 2);
const SOURCE = "public career records (Wikipedia / Transfermarkt / Basketball-Reference) — pending editorial check";

const sportLabel = (p: Player) => (p.sport === "football" ? "football (soccer)" : "basketball");
const accepted = (p: Player) => [p.name, ...(p.aka ?? [])];
const lastTeam = (p: Player) => p.career[p.career.length - 1].team;

function Loading({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-5">
      <GameHeader title={title} backHref="/sports" backLabel="Sports" badge="#—" />
    </div>
  );
}

/* ---------------- Guess the Player ---------------- */

export function GuessThePlayer() {
  const puzzle = useDailyPuzzle();
  if (puzzle === null) return <Loading title="Guess the Player" />;
  const p = dailyItem(PLAYERS, puzzle, SEED);
  const clubs = new Set(p.career.map((s) => s.team)).size;

  return (
    <ClueGame
      key={puzzle}
      id="guess-the-player"
      title="Guess the Player"
      backHref="/sports"
      backLabel="Sports"
      puzzle={puzzle}
      noun="player"
      accepted={accepted(p)}
      answer={p.name}
      answerDetail={`${p.nationality} ${p.position} · ${careerSpan(p)}`}
      options={OPTIONS}
      accent="bg-sports"
      source={SOURCE}
      clues={[
        `A ${sportLabel(p)} ${p.position}.`,
        `${p.nationality}, born in the ${Math.floor(p.born / 10) * 10}s.`,
        p.facts[0],
        `Played for ${clubs} ${clubs === 1 ? "club" : "clubs"} between ${careerSpan(p)}.`,
        p.facts[1],
        `Initials ${initials(p.name)} — best known at ${p.keyTeam}.`,
      ]}
      help={
        <>
          <p>
            Name today’s mystery <strong>football or basketball player</strong>. Each wrong guess or skip reveals a
            sharper clue.
          </p>
          <p>Solve on clue 1 for 6 points, down to 1 point on clue 6. Pick names from the suggestions as you type.</p>
          <p className="font-mono text-xs text-ink-soft">Clubs listed are senior teams; loans are left out.</p>
        </>
      }
    />
  );
}

/* ---------------- Mystery Career ---------------- */

function Timeline({ player }: { player: Player }) {
  return (
    <div className="brut overflow-hidden rounded-3xl bg-paper">
      <div className="flex items-center justify-between border-b-[2.5px] border-ink bg-ink px-5 py-3 text-paper">
        <span className="font-display text-sm">Career path</span>
        <span className="font-mono text-xs">{sportLabel(player)}</span>
      </div>
      <ol className="relative px-5 py-4">
        <span className="absolute top-6 bottom-6 left-[29px] w-1 rounded-full bg-ink/15" aria-hidden />
        {player.career.map((spell, i) => (
          <motion.li
            key={`${spell.team}-${spell.from}`}
            className="relative flex items-center gap-4 py-1.5"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.15 + i * 0.09 }}
          >
            <motion.span
              className="relative z-10 size-3.5 shrink-0 rounded-full border-[2.5px] border-ink bg-sports"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 14, delay: 0.25 + i * 0.09 }}
            />
            <span className="w-24 shrink-0 font-mono text-xs font-bold text-ink-soft">
              {spell.from}
              {spell.to !== spell.from ? `–${spell.to ?? "now"}` : ""}
            </span>
            <span className="font-extrabold">{spell.team}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function MysteryCareer() {
  const puzzle = useDailyPuzzle();
  if (puzzle === null) return <Loading title="Mystery Career" />;
  const p = dailyItem(PLAYERS, puzzle + OFFSET, SEED);

  return (
    <ClueGame
      key={puzzle}
      id="mystery-career"
      title="Mystery Career"
      backHref="/sports"
      backLabel="Sports"
      puzzle={puzzle}
      noun="player"
      accepted={accepted(p)}
      answer={p.name}
      answerDetail={`${p.nationality} ${p.position} · ${careerSpan(p)}`}
      options={OPTIONS}
      accent="bg-daily"
      source={SOURCE}
      intro={<Timeline player={p} />}
      clues={[
        `Whose career is this? Their last team was ${lastTeam(p)}.`,
        `Position: ${p.position}.`,
        `Nationality: ${p.nationality}.`,
        `Born in ${p.born}.`,
        p.facts[0],
        `Initials: ${initials(p.name)}`,
      ]}
      help={
        <>
          <p>
            You’re shown a player’s <strong>club-by-club career</strong>. Who is it? Each wrong guess or skip adds a
            hint.
          </p>
          <p>Solve straight from the timeline for 6 points, down to 1 point with every hint showing.</p>
          <p className="font-mono text-xs text-ink-soft">Senior clubs only; loans are left out.</p>
        </>
      }
    />
  );
}
