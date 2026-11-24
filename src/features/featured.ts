import type { SectionSlug } from "@/features/sections";

/**
 * Games highlighted in the homepage "Today" strip. None are playable yet;
 * when a game ships, set `href` to its route and remove `comingSoon`.
 * Names are working titles.
 */
export type FeaturedGame = {
  title: string;
  section: SectionSlug;
  blurb: string;
  meta: string;
  href?: string;
  comingSoon?: boolean;
};

export const featuredGames: FeaturedGame[] = [
  {
    title: "Word guess",
    section: "daily-games",
    blurb: "One hidden five-letter word. Six guesses. Same puzzle for everyone today.",
    meta: "~3 min",
    href: "/daily-games/word-guess",
  },
  {
    title: "Guess the artist",
    section: "music-tv",
    blurb: "Start with a vague clue and narrow it down. Fewer clues, higher score.",
    meta: "~2 min",
    comingSoon: true,
  },
  {
    title: "Player grid",
    section: "sports",
    blurb: "Fill a 3×3 grid with players who match both the row and the column.",
    meta: "~5 min",
    comingSoon: true,
  },
  {
    title: "Blackjack trainer",
    section: "casino",
    blurb: "Play hands with virtual chips and get instant feedback on every decision.",
    meta: "Unlimited",
    comingSoon: true,
  },
];
