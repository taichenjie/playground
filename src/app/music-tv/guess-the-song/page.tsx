import type { Metadata } from "next";
import { GuessTheSong } from "@/features/music-tv/guess-the-song/guess-the-song";

export const metadata: Metadata = {
  title: "Guess the Song",
  description: "Name the daily mystery song from clues that get easier with every guess.",
};

export default function GuessTheSongPage() {
  return <GuessTheSong />;
}
