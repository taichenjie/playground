import type { Metadata } from "next";
import { CasinoLobby } from "@/features/casino/components/casino-lobby";
import { getSection } from "@/features/sections";

const section = getSection("casino");

export const metadata: Metadata = {
  title: section.name,
  description: section.description,
};

export default function CasinoPage() {
  return <CasinoLobby />;
}
