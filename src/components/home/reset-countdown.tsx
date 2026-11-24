"use client";

import { useSyncExternalStore } from "react";
import { FlapText } from "@/components/motion/flap-text";

/* A one-second clock as an external store, so the server renders a
 * placeholder and the browser takes over without a hydration mismatch. */
function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

function untilMidnight(seconds: number) {
  const now = new Date(seconds * 1000);
  const midnight = new Date(seconds * 1000);
  midnight.setHours(24, 0, 0, 0);
  const left = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

/** Split-flap countdown to local midnight, when the daily line-up turns over. */
export function ResetCountdown() {
  const seconds = useSyncExternalStore(subscribe, nowInSeconds, serverSnapshot);
  const text = seconds === null ? "--:--:--" : untilMidnight(seconds);

  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xs">New day in</span>
      <FlapText text={text} className="text-lg sm:text-xl" />
    </div>
  );
}
