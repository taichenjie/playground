import type { Metadata } from "next";
import { Blackjack } from "@/features/casino/blackjack/components/blackjack";

export const metadata: Metadata = {
  title: "Blackjack",
  description: "Classic blackjack with virtual chips and a built-in basic-strategy coach. No real money.",
};

export default function BlackjackPage() {
  return <Blackjack />;
}
