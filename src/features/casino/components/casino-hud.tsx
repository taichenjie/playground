"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { burst } from "@/components/motion/burst";
import { CountUp } from "@/components/motion/count-up";
import { claimDailyRefill, onLeagueChange, todayNumber, useProfile } from "../bankroll";
import {
  DAILY_REFILL,
  LEAGUES,
  canClaimRefill,
  isBroke,
  promotionProgress,
  type League,
} from "../economy.ts";

export function LeagueBadge({ league, size = "md" }: { league: League; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink font-display text-ink ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
      style={{ background: league.colour }}
    >
      <svg viewBox="0 0 24 24" className={size === "sm" ? "size-3" : "size-4"} aria-hidden>
        <path d="M12 2l3 6 6.5 1-4.7 4.6 1.1 6.6L12 17l-5.9 3.2 1.1-6.6L2.5 9 9 8z" fill="currentColor" />
      </svg>
      {league.name}
    </span>
  );
}

/** League crest: a shield in the league colour with one star per tier. */
export function LeagueEmblem({ league, tier, size = 48 }: { league: League; tier: number; size?: number }) {
  const stars = tier + 1;
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.125} aria-label={`${league.name} league`} role="img">
      <path
        d="M32 3 L59 12 V34 C59 52 46 64 32 69 C18 64 5 52 5 34 V12 Z"
        fill={league.colour}
        stroke="#141414"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M32 10 L52 17 V34 C52 47 43 56 32 61" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M32 20 l4.4 9 9.9 1.4-7.2 7 1.7 9.8-8.8-4.6-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z"
        fill="#141414"
      />
      {Array.from({ length: stars }, (_, i) => (
        <circle key={i} cx={32 + (i - (stars - 1) / 2) * 7} cy={56} r="2.4" fill="#141414" />
      ))}
    </svg>
  );
}

function ProgressBar({
  label,
  value,
  detail,
  colour,
  slim = false,
}: {
  label: string;
  value: number;
  detail: string;
  colour: string;
  slim?: boolean;
}) {
  const done = value >= 1;
  return (
    <div>
      <p className={`flex justify-between font-mono font-bold ${slim ? "mb-0.5 text-[10px]" : "mb-1 text-[11px]"}`}>
        <span>
          {label} {done && "✓"}
        </span>
        <span>{detail}</span>
      </p>
      <div
        className={`overflow-hidden rounded-full border-ink bg-paper-deep ${slim ? "h-3 border-2" : "h-4 border-[2.5px]"}`}
        role="progressbar"
        aria-label={`${label} toward next league`}
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="relative h-full overflow-hidden border-r-[2.5px] border-ink"
          style={{ background: colour }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(value, 0.02) * 100}%` }}
          transition={{ type: "spring", stiffness: 110, damping: 20 }}
        >
          <motion.span
            className="absolute inset-0"
            style={{
              backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.35) 0 8px, transparent 8px 16px)",
              backgroundSize: "22.6px 22.6px",
            }}
            animate={{ backgroundPositionX: ["0px", "22.6px"] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Bankroll + league panel shown on every casino page. Handles the daily
 * refill and announces promotions/relegations.
 */
export function CasinoHud({ compact = false, inline = false }: { compact?: boolean; inline?: boolean }) {
  const profile = useProfile();
  const [announce, setAnnounce] = useState<{ kind: "promoted" | "relegated"; to: League } | null>(null);

  useEffect(
    () =>
      onLeagueChange((change) => {
        setAnnounce(change);
        if (change.kind === "promoted") burst({ x: window.innerWidth / 2, y: window.innerHeight / 3, count: 40 });
      }),
    [],
  );

  if (!profile) return <div className={inline ? "h-8 w-40" : compact ? "h-[88px]" : "h-[260px]"} />;

  if (inline) {
    const current = LEAGUES[profile.league];
    const next = promotionProgress(profile);
    const pctDone = next ? Math.round(Math.min(next.bankroll, next.hands) * 100) : 100;
    return (
      <>
        <div
          className="brut-sm flex items-center gap-2 rounded-full py-0.5 pr-3 pl-0.5"
          style={{ background: current.colour }}
          title={next ? `${pctDone}% of the way to ${next.to.name}` : "Top league"}
        >
          <LeagueEmblem league={current} tier={profile.league} size={26} />
          <span className="font-display text-[11px] uppercase">{current.name}</span>
          <span className="font-display text-sm">◎ <CountUp value={profile.bankroll} duration={0.6} /></span>
          {next && (
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold">
              <span className="h-2 w-16 overflow-hidden rounded-full border-2 border-ink bg-paper">
                <span className="block h-full" style={{ width: `${pctDone}%`, background: next.to.colour }} />
              </span>
              {next.to.name}
            </span>
          )}
        </div>
        <LeagueAnnouncement announce={announce} onClose={() => setAnnounce(null)} />
      </>
    );
  }

  if (compact) {
    const current = LEAGUES[profile.league];
    const next = promotionProgress(profile);
    const ready = canClaimRefill(profile, todayNumber());
    const chipsLeft = next ? Math.max(0, next.to.promoteAt - profile.bankroll) : 0;
    const handsLeft = next ? Math.max(0, next.to.handsToPromote - profile.handsInLeague) : 0;
    return (
      <>
        <section
          aria-label="Your casino league"
          className="brut flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-3 py-2.5 sm:px-4"
          style={{ background: `linear-gradient(100deg, ${current.colour}88 0%, var(--color-paper) 45%)` }}
        >
          <div className="flex items-center gap-2.5">
            <LeagueEmblem league={current} tier={profile.league} size={44} />
            <div>
              <p className="font-display text-sm leading-none uppercase">{current.name} league</p>
              <p className="mt-1 font-display text-2xl leading-none">
                ◎ <CountUp value={profile.bankroll} duration={0.6} />
                <span className="sr-only"> chips in your bankroll</span>
              </p>
            </div>
          </div>

          {next ? (
            <div className="min-w-[230px] flex-1">
              <p className="flex flex-wrap items-center justify-between gap-x-3 font-mono text-[11px] font-bold">
                <span className="flex items-center gap-1.5">
                  <LeagueEmblem league={next.to} tier={profile.league + 1} size={18} />
                  Next: {next.to.name}
                  <span className="hidden text-ink-soft sm:inline">
                    · unlocks {next.to.blackjack.min}–{next.to.blackjack.max} tables
                  </span>
                </span>
                <span>
                  {chipsLeft === 0 && handsLeft === 0
                    ? "Promotion on your next hand!"
                    : [chipsLeft ? `${chipsLeft.toLocaleString()} chips` : null, handsLeft ? `${handsLeft} hands` : null]
                        .filter(Boolean)
                        .join(" · ") + " to go"}
                </span>
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <ProgressBar
                  label="Chips"
                  value={next.bankroll}
                  detail={`${profile.bankroll.toLocaleString()}/${next.to.promoteAt.toLocaleString()}`}
                  colour={next.to.colour}
                  slim
                />
                <ProgressBar
                  label="Hands"
                  value={next.hands}
                  detail={`${Math.min(profile.handsInLeague, next.to.handsToPromote)}/${next.to.handsToPromote}`}
                  colour={next.to.colour}
                  slim
                />
              </div>
            </div>
          ) : (
            <p className="font-display text-sm">Top league reached 👑</p>
          )}

          {isBroke(profile) &&
            (ready ? (
              <button
                type="button"
                data-burst
                onClick={claimDailyRefill}
                className="brut-sm press rounded-full bg-casino px-3 py-1.5 text-sm font-extrabold"
              >
                Claim +{DAILY_REFILL} chips
              </button>
            ) : (
              <span className="rounded-full border-2 border-ink bg-casino px-3 py-1 font-mono text-[11px] font-bold">
                Broke — refill tomorrow
              </span>
            ))}
        </section>
        <LeagueAnnouncement announce={announce} onClose={() => setAnnounce(null)} />
      </>
    );
  }

  const league = LEAGUES[profile.league];
  const progress = promotionProgress(profile);
  const broke = isBroke(profile);
  const refillReady = canClaimRefill(profile, todayNumber());
  const chipsToGo = progress ? Math.max(0, progress.to.promoteAt - profile.bankroll) : 0;
  const handsToGo = progress ? Math.max(0, progress.to.handsToPromote - profile.handsInLeague) : 0;

  return (
    <>
      <section
        aria-label="Your casino league"
        className="brut relative overflow-hidden rounded-[28px] p-5 sm:p-6"
        style={{ background: `linear-gradient(120deg, ${league.colour}66 0%, var(--color-paper) 55%)` }}
      >
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          {/* Current league + bankroll */}
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ y: [0, -4, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <LeagueEmblem league={league} tier={profile.league} size={88} />
            </motion.div>
            <div>
              <p className="font-mono text-[11px] font-bold tracking-wider text-ink-soft uppercase">Your league</p>
              <p className="wide text-3xl leading-none font-black uppercase sm:text-4xl">{league.name}</p>
              <p className="mt-2 font-mono text-[11px] font-bold tracking-wider text-ink-soft uppercase">Bankroll</p>
              <p className="font-display text-4xl leading-none sm:text-5xl">
                ◎ <CountUp value={profile.bankroll} duration={0.6} />
              </p>
            </div>
          </div>

          {/* Road to the next league */}
          {progress ? (
            <div className="rounded-2xl border-[2.5px] border-ink bg-paper/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LeagueEmblem league={progress.to} tier={profile.league + 1} size={34} />
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-wider text-ink-soft uppercase">Next league</p>
                    <p className="font-display text-lg leading-none">{progress.to.name}</p>
                  </div>
                </div>
                <p className="text-right font-mono text-[11px] font-bold">
                  {chipsToGo === 0 && handsToGo === 0
                    ? "Promotion on your next hand!"
                    : [chipsToGo ? `${chipsToGo.toLocaleString()} more chips` : null, handsToGo ? `${handsToGo} more hands` : null]
                        .filter(Boolean)
                        .join(" · ") + " to go"}
                </p>
              </div>

              <div className="mt-3 space-y-2.5">
                <ProgressBar
                  label="Chips"
                  value={progress.bankroll}
                  detail={`${profile.bankroll.toLocaleString()} / ${progress.to.promoteAt.toLocaleString()}`}
                  colour={progress.to.colour}
                />
                <ProgressBar
                  label="Hands"
                  value={progress.hands}
                  detail={`${Math.min(profile.handsInLeague, progress.to.handsToPromote)} / ${progress.to.handsToPromote}`}
                  colour={progress.to.colour}
                />
              </div>

              <p className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] font-bold">
                <span className="text-ink-soft uppercase">Unlocks:</span>
                <span className="rounded-full border-2 border-ink bg-paper px-2">
                  Blackjack {progress.to.blackjack.min.toLocaleString()}–{progress.to.blackjack.max.toLocaleString()}
                </span>
                <span className="rounded-full border-2 border-ink bg-paper px-2">
                  Poker {progress.to.poker.map((s) => `${s.sb}/${s.bb}`).join(", ")}
                </span>
                <span className="rounded-full border-2 border-ink bg-paper px-2 capitalize">{progress.to.bots} bots</span>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-[2.5px] border-ink bg-paper/80 p-4 text-center">
              <p className="font-display text-xl">Top league reached 👑</p>
              <p className="mt-1 text-sm text-ink-soft">The highest stakes and toughest bots in the house.</p>
            </div>
          )}
        </div>

      </section>

      {broke && (
        <div className="brut mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-casino px-4 py-3">
          <p className="font-bold">
            {refillReady ? "Bankroll empty — your daily refill is ready." : "Bankroll empty. A free refill unlocks tomorrow."}
          </p>
          {refillReady && (
            <button
              type="button"
              data-burst
              onClick={claimDailyRefill}
              className="brut-sm press rounded-full bg-paper px-4 py-2 font-extrabold"
            >
              Claim +{DAILY_REFILL} chips
            </button>
          )}
        </div>
      )}

      <LeagueAnnouncement announce={announce} onClose={() => setAnnounce(null)} />
    </>
  );
}

function LeagueAnnouncement({
  announce,
  onClose,
}: {
  announce: { kind: "promoted" | "relegated"; to: League } | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {announce && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-ink/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="brut max-w-sm rounded-3xl bg-paper p-7 text-center"
            initial={{ scale: 0.5, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            role="alertdialog"
            aria-label={announce.kind === "promoted" ? "Promoted" : "Relegated"}
          >
            <p className="font-display text-sm">{announce.kind === "promoted" ? "Promoted!" : "Relegated"}</p>
            <div className="my-4 flex justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1.6 }} transition={{ delay: 0.2, type: "spring" }}>
                <LeagueEmblem league={announce.to} tier={LEAGUES.indexOf(announce.to)} size={56} />
              </motion.div>
            </div>
            <p className="font-display text-2xl">{announce.to.name}</p>
            <p className="mt-2 text-sm">
              {announce.kind === "promoted"
                ? `Welcome to ${announce.to.name}. Higher stakes and tougher opponents await.`
                : `Back to ${announce.to.name} to rebuild your bankroll. You've got this.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="brut press mt-5 rounded-full bg-pop px-6 py-2.5 font-extrabold text-paper"
            >
              Let’s go
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PlayMoneyNote() {
  return (
    <p className="mt-8 text-center font-mono text-[11px] text-ink-soft">
      Virtual chips only — no deposits, withdrawals, real-money bets or prizes. 18+ recommended.
    </p>
  );
}
