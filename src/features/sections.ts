/**
 * The four product sections. Navigation, homepage cards and section landing
 * pages are all generated from this list, so adding or renaming a section
 * only needs a change here (plus its route folder in src/app).
 *
 * Tailwind only generates classes it can see as complete strings, so the
 * accent classes are written out in full.
 */

export type SectionSlug = "daily-games" | "music-tv" | "sports" | "casino";

export type PlannedFormat = {
  name: string;
  blurb: string;
  /** Set once the game is playable. */
  href?: string;
};

export type Section = {
  slug: SectionSlug;
  name: string;
  shortName: string;
  href: `/${SectionSlug}`;
  /** Two-digit number shown on cards ("01"). */
  number: string;
  tagline: string;
  description: string;
  planned: PlannedFormat[];
  /** Optional notice shown prominently on the section page. */
  notice?: { title: string; body: string };
  accent: {
    /** Background class in the section colour. */
    bg: string;
    /** Text class in the section colour (use on ink backgrounds only). */
    text: string;
    /** Raw colour for JS-driven animation (must match globals.css). */
    hex: string;
  };
};

export const sections: Section[] = [
  {
    slug: "daily-games",
    name: "Daily Games",
    shortName: "Daily",
    href: "/daily-games",
    number: "01",
    tagline: "A fresh set of puzzles every day.",
    description:
      "Short word, number and logic puzzles you can finish over a coffee. New challenges every day, the same puzzle for everyone.",
    planned: [
      { name: "Word guess", blurb: "Find the hidden five-letter word in six tries.", href: "/daily-games/word-guess" },
      // Working titles. Our own originals inspired by the rare-answer trivia
      // format (Krillion) and the quick perception-test format (Perceptle).
      {
        name: "Rare Find",
        blurb: "Seven prompts, a few seconds each. Obvious answers score little — the rarer your correct answer, the bigger the points.",
      },
      {
        name: "Sense Check",
        blurb: "Five snap tests of estimating, timing, angles and proportions. How good is your gut?",
      },
      { name: "Groupings", blurb: "Sort sixteen words into four hidden categories." },
      { name: "Anagrams", blurb: "Unscramble letters against the clock." },
      { name: "Number sequences", blurb: "Spot the rule and find what comes next." },
      { name: "Logic grids", blurb: "Deduce the answer from a handful of clues." },
      { name: "Geography quiz", blurb: "Flags, capitals and borders." },
    ],
    accent: { bg: "bg-daily", text: "text-daily", hex: "#ffc93c" },
  },
  {
    slug: "music-tv",
    name: "Music & TV",
    shortName: "Music & TV",
    href: "/music-tv",
    number: "02",
    tagline: "Name that artist, show or soundtrack.",
    description:
      "Guess the artist from clues, connect albums and eras, and test how well you really know your favourite shows and films.",
    planned: [
      { name: "Guess the artist", blurb: "Clues get easier the longer you wait." },
      { name: "Music connections", blurb: "Link artists, albums and decades." },
      { name: "Discography order", blurb: "Put the releases in chronological order." },
      { name: "Guess the show", blurb: "Identify a series from plot clues." },
      { name: "Screen connections", blurb: "Find what links four films or shows." },
    ],
    accent: { bg: "bg-music", text: "text-music", hex: "#ff7eb6" },
  },
  {
    slug: "sports",
    name: "Sports",
    shortName: "Sports",
    href: "/sports",
    number: "03",
    tagline: "Football and basketball knowledge, put to the test.",
    description:
      "Player grids, mystery careers and club connections, starting with football and basketball and built on verifiable data.",
    planned: [
      { name: "Player grid", blurb: "Fill each cell with a player matching both criteria." },
      { name: "Mystery career", blurb: "Name the player from their club timeline." },
      { name: "Guess the player", blurb: "Progressive clues, fewer guesses, more points." },
      { name: "Club connections", blurb: "Find what four clubs or teams have in common." },
      { name: "Stat line", blurb: "Identify a player from a single season’s numbers." },
    ],
    accent: { bg: "bg-sports", text: "text-sports", hex: "#3dd68c" },
  },
  {
    slug: "casino",
    name: "Casino",
    shortName: "Casino",
    href: "/casino",
    number: "04",
    tagline: "Table classics and strategy trainers. Virtual chips only.",
    description:
      "Play blackjack, poker and roulette with virtual chips, and sharpen your strategy with trainers and probability tools.",
    notice: {
      title: "Play money only.",
      body: "For entertainment and learning only. Virtual chips have no cash value — there are no deposits, withdrawals, real-money bets or prizes.",
    },
    planned: [
      { name: "Blackjack", blurb: "Classic 21 against the dealer." },
      { name: "Basic-strategy trainer", blurb: "Practise the optimal play for every hand." },
      { name: "Video poker", blurb: "Hold, draw and learn the pay table." },
      { name: "Roulette", blurb: "Spin the wheel and see the odds behind each bet." },
      { name: "Hand-ranking trainer", blurb: "Learn which poker hand wins, fast." },
    ],
    accent: { bg: "bg-casino", text: "text-casino", hex: "#ff5a3c" },
  },
];

export function getSection(slug: SectionSlug): Section {
  const section = sections.find((s) => s.slug === slug);
  if (!section) throw new Error(`Unknown section: ${slug}`);
  return section;
}
