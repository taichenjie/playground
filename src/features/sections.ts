/**
 * The product sections. Navigation, homepage cards and section landing
 * pages are all generated from this list, so adding or renaming a section
 * only needs a change here (plus its route folder in src/app).
 *
 * Tailwind only generates classes it can see as complete strings, so the
 * accent classes are written out in full.
 */

export type SectionSlug = "daily-games" | "music-tv" | "sports" | "whos-that" | "casino";

export type PlannedFormat = {
  name: string;
  blurb: string;
  /** Shorter label for tabs, if the name is long. */
  short?: string;
  /** Set once the game is playable. */
  href?: string;
};

export type Section = {
  slug: SectionSlug;
  name: string;
  shortName: string;
  href: `/${SectionSlug}`;
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
        href: "/daily-games/sense-check",
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
    tagline: "Name that artist, show or soundtrack.",
    description:
      "Guess the artist from clues, connect albums and eras, and test how well you really know your favourite shows and films.",
    planned: [
      { name: "Guess the song", blurb: "Name the daily mystery song from clues that get easier.", href: "/music-tv/guess-the-song" },
      { name: "Four by Four", blurb: "Sixteen music & TV names, four hidden groups.", href: "/music-tv/four-by-four" },
      { name: "Guess the show", blurb: "Identify a series from plot clues." },
      { name: "Release order", blurb: "Put an artist's albums in chronological order." },
      { name: "Guess the Celebrity", blurb: "Singers, actors and TV faces against the clock — part of Who’s That?", href: "/whos-that/play?c=celebrities" },
    ],
    accent: { bg: "bg-music", text: "text-music", hex: "#ff7eb6" },
  },
  {
    slug: "sports",
    name: "Sports",
    shortName: "Sports",
    href: "/sports",
    tagline: "Football and basketball knowledge, put to the test.",
    description:
      "Player grids, mystery careers and club connections, starting with football and basketball and built on verifiable data.",
    planned: [
      { name: "Guess the player", blurb: "Progressive clues, fewer guesses, more points.", href: "/sports/guess-the-player" },
      { name: "Mystery career", blurb: "Name the player from their club timeline.", href: "/sports/mystery-career" },
      { name: "Player grid", blurb: "Fill each cell with a player matching both criteria." },
      { name: "Club connections", blurb: "Find what four clubs or teams have in common." },
      { name: "Stat line", blurb: "Identify a player from a single season’s numbers." },
      { name: "Guess the Athlete", blurb: "Name the sports star from their photo — part of Who’s That?", href: "/whos-that/play?c=athletes" },
    ],
    accent: { bg: "bg-sports", text: "text-sports", hex: "#3dd68c" },
  },
  {
    slug: "whos-that",
    name: "Who’s That?",
    shortName: "Who’s That?",
    href: "/whos-that",
    tagline: "Ten famous faces a day. How fast can you name them?",
    description:
      "A photo sharpens as the clock runs down — name the athlete, singer, actor, comedian or public figure before time’s up. Play the mix or pick a category, with a Korean edition too.",
    planned: [
      { name: "Daily Ten", blurb: "A mix of every category, from around the world. Same set for everyone, every day.", href: "/whos-that/play" },
      { name: "Athletes", blurb: "Footballers, NBA stars, tennis greats and more.", href: "/whos-that/play?c=athletes" },
      { name: "Singers", blurb: "Pop, rap, rock and K-pop voices.", href: "/whos-that/play?c=singers" },
      { name: "Actors", blurb: "Film and TV stars.", href: "/whos-that/play?c=actors" },
      { name: "Comedians & TV hosts", blurb: "Stand-ups, presenters and talk-show faces.", href: "/whos-that/play?c=comedians" },
      { name: "YouTubers & creators", blurb: "YouTubers, streamers and internet personalities.", href: "/whos-that/play?c=creators" },
      { name: "Public figures", blurb: "World leaders, business founders and household names.", href: "/whos-that/play?c=public" },
      { name: "Korean edition", blurb: "K-pop idols, K-drama actors and Korean TV stars.", href: "/whos-that/play?c=mix&region=korea" },
    ],
    accent: { bg: "bg-faces", text: "text-faces", hex: "#a78bfa" },
  },
  {
    slug: "casino",
    name: "Casino",
    shortName: "Casino",
    href: "/casino",
    tagline: "Table classics and strategy trainers. Virtual chips only.",
    description:
      "Play blackjack, poker and roulette with virtual chips, and sharpen your strategy with trainers and probability tools.",
    notice: {
      title: "Play money only.",
      body: "For entertainment and learning only. Virtual chips have no cash value — there are no deposits, withdrawals, real-money bets or prizes.",
    },
    planned: [
      { name: "Blackjack", blurb: "Resorts World Sentosa rules, real chips on the felt and a skill rating.", href: "/casino/blackjack" },
      { name: "Texas Hold’em", short: "Hold’em", blurb: "Cash games against smart bots. Pick your table size and stakes.", href: "/casino/poker" },
      { name: "Roulette", blurb: "Single-zero wheel, every inside and outside bet, and the odds behind each one.", href: "/casino/roulette" },
      { name: "Baccarat", blurb: "Player, Banker or Tie on RWS commission rules, with pairs, Super Six, squeeze and scoreboard roads.", href: "/casino/baccarat" },
      { name: "Craps", blurb: "Pass Line, Come, odds, place bets, hardways and the whole proposition box, on Las Vegas rules.", href: "/casino/craps" },
      { name: "Card counting trainer", short: "Counting", blurb: "Learn Hi-Lo: keep the running count, convert to a true count and size your bet, at rising speeds.", href: "/casino/card-counting" },
    ],
    accent: { bg: "bg-casino", text: "text-casino", hex: "#ff5a3c" },
  },
];

export function getSection(slug: SectionSlug): Section {
  const section = sections.find((s) => s.slug === slug);
  if (!section) throw new Error(`Unknown section: ${slug}`);
  return section;
}
