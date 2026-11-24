/*
 * Skill tracking: every decision is compared with the computed best play.
 * "EV lost" is how many chips a mistake costs on average, so a near-miss
 * costs little and a howler costs a lot.
 */

export const WINDOW = 100;

export type Tally = { hands: number; decisions: number; correct: number; evLost: number; net: number };
export const EMPTY_TALLY: Tally = { hands: 0, decisions: 0, correct: 0, evLost: 0, net: 0 };

export type Skill = {
  lifetime: Tally;
  /** Correct/incorrect for the most recent decisions. */
  recent: boolean[];
  streak: number;
  bestStreak: number;
  /** Since the current shoe started. */
  shoe: Tally;
  shoesCompleted: number;
};

export const EMPTY_SKILL: Skill = { lifetime: EMPTY_TALLY, recent: [], streak: 0, bestStreak: 0, shoe: EMPTY_TALLY, shoesCompleted: 0 };

const bump = (t: Tally, correct: boolean, evLost: number): Tally => ({
  ...t,
  decisions: t.decisions + 1,
  correct: t.correct + (correct ? 1 : 0),
  evLost: t.evLost + evLost,
});

export function recordDecision(s: Skill, correct: boolean, evLostChips: number): Skill {
  const streak = correct ? s.streak + 1 : 0;
  return {
    ...s,
    lifetime: bump(s.lifetime, correct, evLostChips),
    shoe: bump(s.shoe, correct, evLostChips),
    recent: [...s.recent, correct].slice(-WINDOW),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
  };
}

export function recordHand(s: Skill, net: number): Skill {
  const add = (t: Tally) => ({ ...t, hands: t.hands + 1, net: t.net + net });
  return { ...s, lifetime: add(s.lifetime), shoe: add(s.shoe) };
}

/** Closes the shoe; returns the finished shoe's tally for the report card. */
export function finishShoe(s: Skill): { skill: Skill; report: Tally } {
  return { skill: { ...s, shoe: EMPTY_TALLY, shoesCompleted: s.shoesCompleted + 1 }, report: s.shoe };
}

export const accuracy = (t: { decisions: number; correct: number }) => (t.decisions ? t.correct / t.decisions : 0);

export type Grade = { letter: string; title: string };

export function gradeFor(acc: number, decisions: number): Grade {
  if (decisions < 10) return { letter: "–", title: "Play a few hands to get rated" };
  if (acc >= 0.98) return { letter: "S", title: "Card shark" };
  if (acc >= 0.95) return { letter: "A", title: "By the book" };
  if (acc >= 0.9) return { letter: "B", title: "Solid player" };
  if (acc >= 0.8) return { letter: "C", title: "Getting there" };
  if (acc >= 0.65) return { letter: "D", title: "Gut feeling" };
  return { letter: "F", title: "Hunch player" };
}

export function rating(s: Skill): Grade & { accuracy: number } {
  const correct = s.recent.filter(Boolean).length;
  const acc = s.recent.length ? correct / s.recent.length : 0;
  return { ...gradeFor(acc, s.recent.length), accuracy: acc };
}

/** Streak milestones worth celebrating. */
export const MILESTONES = [10, 25, 50, 100, 250];
