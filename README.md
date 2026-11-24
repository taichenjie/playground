# PLAYGROUND

*Games. Trivia. Challenges.*

An entertainment website with four sections: **Daily Games**, **Music & TV**, **Sports** and **Casino** (virtual chips only, never real money).

This is **milestone 1: the website shell**. It has a branded homepage, shared navigation, a "Today" featured strip, four section cards and a placeholder landing page for each section. No games are playable yet, and there is no backend, database or login.

> `PLAYGROUND` and the tagline are working names. The visual style is "arcade sticker-book": warm paper, thick ink outlines, hard shadows, flat colours and lots of motion. See [Changing the brand and style](#changing-the-brand-and-style).

## Requirements

- Node.js 20.9 or newer (built and tested with Node 26)
- npm (comes with Node)

## Getting started

```bash
npm install      # install dependencies (first time only)
npm run dev      # start the dev server at http://localhost:3000
```

## Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload on http://localhost:3000 |
| `npm run lint`      | ESLint (Next.js core-web-vitals + TypeScript rules)  |
| `npm run typecheck` | Generates route types, then runs `tsc --noEmit`      |
| `npm run build`     | Production build                                     |
| `npm run start`     | Serves the production build (run `build` first)      |
| `npm run test`      | Unit tests (Node's built-in test runner)             |
| `npm run words`     | Regenerates the Word Guess dictionary from `answers.ts` + `word-list` |
| `npm run check`     | Lint, type-check, test and build in one go           |

## Games

### Word Guess — `/daily-games/word-guess`

Find the hidden five-letter word in six guesses. One shared puzzle per day (puzzle #1 = 24 Nov 2026, changes at local midnight).

- Code: `src/features/daily-games/word-guess/`. Rules live in `logic.ts` (pure, unit-tested in `logic.test.ts`); UI in `components/`.
- Answers: hand-written list in `answers.ts`. **Only append** — inserting or removing words changes every future day's answer.
- Valid guesses: generated into `valid-guesses.ts` from the MIT-licensed [`word-list`](https://github.com/sindresorhus/word-list) package. Run `npm run words` after editing answers.
- Progress, stats and streaks are saved in the browser's localStorage (no account needed).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19
- TypeScript (strict)
- Tailwind CSS 4
- [Motion](https://motion.dev) for springs, drag, layout and scroll-linked animation
- Fonts via `next/font`: Archivo (variable weight + width), Bungee (display) and Space Mono

No other runtime dependencies. shadcn/ui isn't installed yet; it can be added once a game needs dialogs, toasts or similar components.

## Project structure

```text
src/
├── app/                      # Routes (App Router)
│   ├── layout.tsx            # Root layout: fonts, header, footer, metadata
│   ├── page.tsx              # Homepage
│   ├── not-found.tsx         # 404 page
│   ├── template.tsx          # Colour-curtain page transition
│   ├── globals.css           # Tailwind import and design tokens
│   ├── daily-games/page.tsx  # Section placeholder pages
│   ├── music-tv/page.tsx
│   ├── sports/page.tsx
│   └── casino/page.tsx
├── components/
│   ├── layout/               # Footer, shared section landing template
│   ├── navigation/           # Site header + mobile menu
│   ├── home/                 # Hero, toy box, tickers, countdown
│   ├── motion/               # Reusable animation building blocks
│   ├── scenes/               # Looping illustration per section
│   └── ui/                   # Logo, cards, section icons
├── config/
│   └── site.ts               # Brand name, tagline, description
└── features/
    ├── sections.ts           # The four sections: copy, planned formats, accent colours
    └── featured.ts           # Games shown in the homepage "Today" strip
```

The header, footer, homepage cards and section pages are all generated from `src/features/sections.ts`, so the four sections stay consistent.

## Changing the brand and style

- **Name / tagline / description:** edit `src/config/site.ts`.
- **Colours and fonts:** the design tokens (`paper`, `ink`, `pop`, and one colour per section) plus the `brut`, `press`, `wide` and `dots` utilities are in `src/app/globals.css`. Fonts are set in `src/app/layout.tsx`.
- **Section accent colours:** each section's `accent` (class names and a hex value for JS animation) is in `src/features/sections.ts`. Keep the hex in sync with `globals.css`.

## Animation

Reusable pieces live in `src/components/motion/`:

| Component | Effect |
| --- | --- |
| `ProximityText` | Headline letters swell (weight + width) as the mouse approaches; words drop in on load |
| `Marquee` | Endless ticker that speeds up with scroll and reverses when you scroll up |
| `Tilt` | 3D tilt toward the mouse with a moving highlight |
| `Magnetic` | Element is pulled toward the mouse |
| `Reveal` / `Stamp` | Spring in on scroll / rubber-stamp slam |
| `FlapText` | Split-flap departure-board characters |
| `BurstLayer` | Confetti on click for any element with `data-burst` |
| `Cursor` | Trailing ring that swells over clickable things (mouse only) |
| `ScrollProgress` | Four-colour reading progress bar |

The homepage also has a draggable toy box (`src/components/home/toy-box.tsx`) and every section has a looping scene (`src/components/scenes/section-scene.tsx`).

All motion respects the operating system "reduce motion" setting.

## Adding the first game

A suggested pattern, to be confirmed when the first game is chosen:

1. Put the game logic and components in `src/features/<section>/<game>/`.
2. Add a route such as `src/app/daily-games/<game>/page.tsx`.
3. Point the matching entry in `src/features/featured.ts` at the new route and remove `comingSoon`.
4. Show the game on its section page alongside, or in place of, the "In the works" list.

## Ground rules

- Original games, names, UI and puzzle content only. No copied branding or proprietary puzzles.
- Casino is simulated play only: virtual chips, no deposits or withdrawals, no real-money bets, no prizes.
- No backend, database, auth or infrastructure until a feature actually needs it.
