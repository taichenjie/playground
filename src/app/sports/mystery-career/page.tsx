import type { Metadata } from "next";
import { MysteryCareer } from "@/features/sports/sports-games";

export const metadata: Metadata = {
  title: "Mystery Career",
  description: "One club-by-club career path a day. Can you name the player?",
};

export default function MysteryCareerPage() {
  return <MysteryCareer />;
}
