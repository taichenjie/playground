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
| `npm run faces`     | Builds the Who's That? photo set (see below)         |
| `npm run faces:upload` | Copies new Who's That? photos to Cloudflare R2    |

## Who's That? photos

Faces come from Wikidata (each person's own portrait image) and Wikimedia
Commons, keeping only photos whose licence allows reuse with credit. Every
photo's credit is stored in `src/features/whos-that/faces.json` and shown in
the game.

1. Add people to `scripts/faces-roster.ts` (English Wikipedia titles, public
   figures only).
2. `npm run faces` looks them up, saves compressed WebP photos to
   `public/faces/` (not committed) and updates `faces.json`. Re-running only
   fetches new people.
3. Open http://localhost:3000/whos-that/review while `npm run dev` runs and
   approve or reject each face. Only approved faces are played.
4. `npm run faces:upload` copies new photos to Cloudflare R2.

### Setting up Cloudflare R2 (one time)

1. In the Cloudflare dashboard, open **R2** and create a bucket (for example
   `playground-faces`).
2. Give it a public address: **Settings → Custom Domains**, add a subdomain
   you own (for example `faces.yourdomain.com`). The `r2.dev` address works
   for testing but is rate-limited and not meant for production.
3. **R2 → Manage API tokens → Create API token** with *Object Read & Write*,
   limited to that bucket.
4. Create `.env.local` in the project root (it is git-ignored):

   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=playground-faces
   NEXT_PUBLIC_FACES_BASE_URL=https://faces.yourdomain.com
   ```

5. Run `npm run faces:upload`, then set `NEXT_PUBLIC_FACES_BASE_URL` in the
   hosting provider's environment variables too. Without it, photos are served
   from `public/faces/`.

Photo keys include a hash of the image, so they can be cached forever; a
replaced photo gets a new key.

## Games

### Word Guess — `/daily-games/word-guess`

Find the hidden five-letter word in six guesses. One shared puzzle per day (puzzle #1 = 24 Nov 2026, changes at local midnight).

- Code: `src/features/daily-games/word-guess/`. Rules live in `logic.ts` (pure, unit-tested in `logic.test.ts`); UI in `components/`.
- Answers: hand-written list in `answers.ts`. **Only append** — inserting or removing words changes every future day's answer.
- Valid guesses: generated into `valid-guesses.ts` from the MIT-licensed [`word-list`](https://github.com/sindresorhus/word-list) package. Run `npm run words` after editing answers.
- Progress, stats and streaks are saved in the browser's localStorage (no account needed).

### All games

| Section | Game | Route | Type |
| --- | --- | --- | --- |
| Daily Games | Word Guess | `/daily-games/word-guess` | Daily |
| Daily Games | Sense Check — five perception tests | `/daily-games/sense-check` | Daily |
| Music & TV | Guess the Song — progressive text clues | `/music-tv/guess-the-song` | Daily |
| Music & TV | Four by Four — find four groups of four | `/music-tv/four-by-four` | Daily |
| Sports | Guess the Player | `/sports/guess-the-player` | Daily |
| Sports | Mystery Career — name the player from their clubs | `/sports/mystery-career` | Daily |
| Casino | Blackjack — Resorts World Sentosa rules, skill rating, strategy chart | `/casino/blackjack` | Unlimited |
| Casino | Texas Hold’em — no-limit cash game vs bots (2–9 players, 4 difficulties) | `/casino/poker` | Unlimited |

Shared pieces: `src/lib/daily.ts` (puzzle numbering, seeded shuffles, streaks), `src/features/shared/clue-game/` (engine + screen for the three clue games), `src/features/casino/` (cards, economy, chip stacks). Casino games share one persistent **virtual** bankroll (start 1,000; +100 the day after going broke) and five leagues (Bronze → Diamond) with rising table limits. Chips have no monetary value and are never sold.

### ⚠ Content to fact-check before launch

These were drafted with AI assistance and are marked `verified: false`. A person must check each entry against a reliable source before the site goes public:

- `src/features/music-tv/guess-the-song/songs.ts` — 42 songs, clue facts (no lyrics or audio).
- `src/features/music-tv/four-by-four/puzzles.ts` — 8 puzzles; check every item belongs to exactly one group.
- `src/features/sports/players.ts` — 26 players: careers, positions, birth years, facts.

Data files are append-only: inserting or removing entries changes every future day's puzzle.

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

## Blackjack rules source

The blackjack table implements **"Blackjack (RWS) Game Rules, Version 5"** (effective 11 June 2019), approved by Singapore's Gambling Regulatory Authority and published at gra.gov.sg → Game Rules for Casinos (RWS) → Blackjack and Pontoon Games. Rules live in `src/features/casino/blackjack/rules.ts` as data so other houses (e.g. Resorts World Genting) can be added once their rules are confirmed. Basic strategy is **computed** from those rules in `strategy.ts` (infinite-deck model, no re-split modelling), not copied from a chart.

## Texas Hold'em

`src/features/casino/poker/`:

- `evaluator.ts` — best-5-of-7 hand scoring and names.
- `engine.ts` — pure no-limit cash-game state machine (blinds, heads-up rules, minimum raises, incomplete all-ins, side pots, split pots). No UI or browser code, so it can run on a game server when multiplayer arrives. Fuzz-tested over 2,000 random hands for chip conservation.
- `bots.ts` — Chen-formula preflop + Monte Carlo equity postflop, pot odds, position, personalities; four difficulties (expert reads your tendencies).
- `session.ts` — buy-in from the bankroll; the table stack is saved after every action and returned to the bankroll if the page is closed.
