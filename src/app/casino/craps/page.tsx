import type { Metadata } from "next";
import { Craps } from "@/features/casino/craps/components/craps";

export const metadata: Metadata = {
  title: "Craps",
  description: "Craps on Las Vegas rules with 3-4-5x odds: Pass Line, Come, place bets, hardways and the proposition box. Virtual chips only.",
};

export default function CrapsPage() {
  return <Craps />;
}
