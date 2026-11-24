import type { Metadata } from "next";
import { SectionLanding } from "@/components/layout/section-landing";
import { getSection } from "@/features/sections";

const section = getSection("casino");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function CasinoPage() {
  return <SectionLanding section={section} />;
}
