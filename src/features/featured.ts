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
    title: "Guess the song",
    section: "music-tv",
    blurb: "Start with a vague clue and narrow it down. Fewer clues, higher score.",
    meta: "~2 min",
    href: "/music-tv/guess-the-song",
  },
  {
    title: "Mystery career",
    section: "sports",
    blurb: "One club-by-club career path. Name the player before the hints run out.",
    meta: "~2 min",
    href: "/sports/mystery-career",
  },
  {
    title: "Blackjack",
    section: "casino",
    blurb: "Play hands with virtual chips while the strategy coach grades every decision.",
    meta: "Unlimited",
    href: "/casino/blackjack",
  },
];
