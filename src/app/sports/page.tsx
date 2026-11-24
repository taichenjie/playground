import type { Metadata } from "next";
import { SectionLanding } from "@/components/layout/section-landing";
import { getSection } from "@/features/sections";

const section = getSection("sports");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function SportsPage() {
  return <SectionLanding section={section} />;
}
