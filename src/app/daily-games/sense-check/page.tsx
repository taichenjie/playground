import type { Metadata } from "next";
import { SenseCheck } from "@/features/daily-games/sense-check/components/sense-check";

export const metadata: Metadata = {
  title: "Sense Check",
  description: "Five quick daily tests of counting, timing, angles, rhythm and proportion. How good is your gut?",
};

export default function SenseCheckPage() {
  return <SenseCheck />;
}
