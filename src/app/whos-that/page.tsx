import type { Metadata } from "next";
import { SectionLanding } from "@/components/layout/section-landing";
import { getSection } from "@/features/sections";

const section = getSection("whos-that");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function WhosThatPage() {
  return <SectionLanding section={section} />;
}
