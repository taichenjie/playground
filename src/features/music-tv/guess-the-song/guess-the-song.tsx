"use client";

import { GameHeader } from "@/components/games/game-header";
import { dailyItem } from "@/lib/daily";
import { useDailyPuzzle } from "@/lib/use-daily-puzzle";
import { ClueGame } from "../../shared/clue-game/clue-game";
import { SONGS, type Song } from "./songs";

const SEED = 4401;
const OPTIONS = [...new Set(SONGS.map((s) => s.title))].sort();

function cluesFor(song: Song): string[] {
  const decade = `${Math.floor(song.year / 10) * 10}s`;
  return [
    `A ${song.genre} song from the ${decade}.`,
    song.facts[0],
    song.facts[1],
    `Performed by ${song.origin}.`,
    `Released in ${song.year}${song.album ? `, on “${song.album}”` : ""}.`,
    `The artist is ${song.artist}.`,
  ];
}

export function GuessTheSong() {
  const puzzle = useDailyPuzzle();
  if (puzzle === null) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-4 pt-5">
        <GameHeader title="Guess the Song" backHref="/music-tv" backLabel="Music & TV" badge="#—" />
      </div>
    );
  }
  const song = dailyItem(SONGS, puzzle, SEED);
  return (
    <ClueGame
      key={puzzle}
      id="guess-the-song"
      title="Guess the Song"
      backHref="/music-tv"
      backLabel="Music & TV"
      puzzle={puzzle}
      noun="song"
      accepted={[song.title, ...(song.aka ?? [])]}
      answer={song.title}
      answerDetail={`${song.artist} · ${song.year}`}
      options={OPTIONS}
      clues={cluesFor(song)}
      source={`${song.title} and ${song.artist} on Wikipedia${song.verified ? "" : " (pending editorial check)"}`}
      accent="bg-music"
      help={
        <>
          <p>
            Name today’s mystery <strong>song</strong>. You start with one vague clue; every wrong guess or skip
            reveals another, each easier than the last.
          </p>
          <p>Solve it on clue 1 for 6 points, down to 1 point on the final clue. Six tries in all.</p>
          <p>Pick your answer from the suggestions as you type. Everyone gets the same song each day.</p>
        </>
      }
    />
  );
}
