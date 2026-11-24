import type { Metadata } from "next";
import { SectionLanding } from "@/components/layout/section-landing";
import { getSection } from "@/features/sections";

const section = getSection("daily-games");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function DailyGamesPage() {
  return <SectionLanding section={section} />;
}
