import type { Metadata } from "next";
import { SectionLanding } from "@/components/layout/section-landing";
import { getSection } from "@/features/sections";

const section = getSection("music-tv");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function MusicTvPage() {
  return <SectionLanding section={section} />;
}
