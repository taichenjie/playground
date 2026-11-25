import type { Metadata } from "next";
import { Counting } from "@/features/casino/counting/components/counting";

export const metadata: Metadata = {
  title: "Card counting trainer",
  description: "Learn the Hi-Lo card counting system: running count, true count and bet sizing drills at increasing speeds.",
};

export default function CardCountingPage() {
  return <Counting />;
}
