import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaceReview } from "@/features/whos-that/components/face-review";

export const metadata: Metadata = {
  title: "Review faces",
  robots: { index: false },
};

/** Development-only page for checking every face before it can be played. */
export default function ReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <FaceReview />;
}
