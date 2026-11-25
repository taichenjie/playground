import type { Metadata } from "next";
import { Baccarat } from "@/features/casino/baccarat/components/baccarat";

export const metadata: Metadata = {
  title: "Baccarat",
  description: "Commission baccarat with Super Six and pair side bets, real third-card rules, squeeze and scoreboard roads. Virtual chips only.",
};

export default function BaccaratPage() {
  return <Baccarat />;
}
