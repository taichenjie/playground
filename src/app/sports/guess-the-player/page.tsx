import type { Metadata } from "next";
import { GuessThePlayer } from "@/features/sports/sports-games";

export const metadata: Metadata = {
  title: "Guess the Player",
  description: "Name the daily mystery football or basketball player from progressively easier clues.",
};

export default function GuessThePlayerPage() {
  return <GuessThePlayer />;
}
