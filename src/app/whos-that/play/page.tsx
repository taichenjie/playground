import type { Metadata } from "next";
import { WhosThat } from "@/features/whos-that/components/whos-that";

export const metadata: Metadata = {
  title: "Play Who’s That?",
  description: "Ten famous faces a day. Name them before the photo comes into focus.",
};

export default function WhosThatPlayPage() {
  return <WhosThat />;
}
