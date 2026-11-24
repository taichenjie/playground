import type { Metadata } from "next";
import { WordGuess } from "@/features/daily-games/word-guess/components/word-guess";

export const metadata: Metadata = {
  title: "Word Guess",
  description: "Find the hidden five-letter word in six guesses. A new puzzle every day.",
};

export default function WordGuessPage() {
  return <WordGuess />;
}
