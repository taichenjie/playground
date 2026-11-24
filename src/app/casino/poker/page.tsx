import type { Metadata } from "next";
import { Poker } from "@/features/casino/poker/components/poker";

export const metadata: Metadata = {
  title: "Texas Hold’em",
  description: "No-limit Texas Hold’em cash games against smart bots. Choose players, difficulty and blinds. Virtual chips only.",
};

export default function PokerPage() {
  return <Poker />;
}
