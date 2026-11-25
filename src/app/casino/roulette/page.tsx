import type { Metadata } from "next";
import { Roulette } from "@/features/casino/roulette/components/roulette";

export const metadata: Metadata = {
  title: "Roulette",
  description: "European single-zero roulette with virtual chips. Every inside and outside bet, with the odds shown. No real money.",
};

export default function RoulettePage() {
  return <Roulette />;
}
