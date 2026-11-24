import type { Metadata } from "next";
import { FourByFour } from "@/features/music-tv/four-by-four/four-by-four";

export const metadata: Metadata = {
  title: "Four by Four",
  description: "Sixteen music & TV names, four hidden groups. A new puzzle every day.",
};

export default function FourByFourPage() {
  return <FourByFour />;
}
