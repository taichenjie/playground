"use client";

import { MotionConfig } from "motion/react";

/**
 * reducedMotion="user" makes every Motion animation respect the visitor's
 * "reduce motion" OS setting: movement is skipped, fades still play.
 */
export function MotionProviders({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
