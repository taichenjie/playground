/*
 * Who's That? rules: filters, picking a round, judging typed answers and
 * scoring. Pure, no browser or server APIs.
 */

import { mulberry32 } from "../../lib/daily.ts";

export type Category = "athletes" | "singers" | "actors" | "comedians" | "creators" | "public";
export const CATEGORIES: Category[] = ["athletes", "singers", "actors", "comedians", "creators", "public"];

/** What the player picks: one category, all celebrities, or everything. */
export type Selection = "mix" | "celebrities" | Category;

export const SELECTIONS: { id: Selection; label: string }[] = [
  { id: "mix", label: "Mix" },
  { id: "athletes", label: "Athletes" },
  { id: "singers", label: "Singers" },
  { id: "actors", label: "Actors" },
  { id: "comedians", label: "Comedians & TV" },
  { id: "creators", label: "YouTubers & creators" },
  { id: "celebrities", label: "All celebrities" },
  { id: "public", label: "Public figures" },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  athletes: "Athlete",
  singers: "Singer",
  actors: "Actor",
  comedians: "Comedian / TV personality",
  creators: "YouTuber / internet personality",
  public: "Public figure",
};

export type Region = "korea" | "anglo" | "europe" | "latam" | "asia" | "africa" | "other";

export type Credit = { artist: string; license: string; licenseUrl: string; source: string };

export type Face = {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  korean: boolean;
  image: string;
  credit: Credit;
  region: Region;
  /** ISO country code of citizenship, lower case, if known. */
  country?: string;
  born: number | null;
  sport: string | null;
  /** Number of language Wikipedias with an article on them. */
  fame: number;
};

/** What the browser gets while playing: no name, no credit (the photo's file name often contains the name). */
export type Hidden = Pick<Face, "id" | "image">;
/** What the browser gets once a face is over. */
export type Revealed = Pick<Face, "id" | "name" | "category" | "korean" | "image" | "credit">;
export const revealed = (f: Face): Revealed => ({
  id: f.id,
  name: f.name,
  category: f.category,
  korean: f.korean,
  image: f.image,
  credit: f.credit,
});

export const ROUND = 10;
export const SECONDS = 15;
export const MAX_GUESSES = 3;

/* ---------- Filters ---------- */

export type RegionFilter = "world" | Exclude<Region, "other">;
export type Level = "easy" | "normal" | "hard";
export type Era = "all" | "legends" | "now";

export type Filters = { cat: Selection; region: RegionFilter; level: Level; era: Era; sport: string };

/** The one set everyone plays each day; it alone counts for streaks. */
export const DAILY: Filters = { cat: "mix", region: "world", level: "normal", era: "all", sport: "all" };

export const REGIONS: { id: RegionFilter; label: string; note: string }[] = [
  { id: "world", label: "Worldwide", note: "Global stars from everywhere" },
  { id: "korea", label: "Korean", note: "K-pop, K-drama and Korean stars" },
  { id: "anglo", label: "US & UK", note: "Plus Canada, Ireland, Australia and New Zealand" },
  { id: "europe", label: "Europe", note: "" },
  { id: "latam", label: "Latin America", note: "Including Mexico and the Caribbean" },
  { id: "asia", label: "Asia", note: "Outside Korea" },
  { id: "africa", label: "Africa", note: "" },
];

export const LEVELS: { id: Level; label: string; note: string }[] = [
  { id: "easy", label: "Easy", note: "The best-known third" },
  { id: "normal", label: "Normal", note: "Everyone" },
  { id: "hard", label: "Hard", note: "The less-known half" },
];

/** Born in or before this year counts as a legend. */
export const LEGEND_BORN = 1975;
export const ERAS: { id: Era; label: string; note: string }[] = [
  { id: "all", label: "Any era", note: "" },
  { id: "legends", label: "Legends", note: `Born ${LEGEND_BORN} or earlier` },
  { id: "now", label: "Now", note: `Born after ${LEGEND_BORN}` },
];

/**
 * Worldwide only includes Korean stars known well beyond Korea: those with
 * an article in at least this many language Wikipedias. Everyone else is in
 * the Korean region.
 */
export const KOREA_WORLDWIDE_FAME = 50;

/** A filter option is offered only when its pool has at least this many faces. */
export const MIN_POOL = 30;

/** In Worldwide rounds no single region gets more than this many of the ten faces. */
export const REGION_CAP = 3;

const pick = <T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Filters from a URL query, ignoring anything unknown. Old `korean=1` links still work. */
export function parseFilters(q: URLSearchParams): Filters {
  return {
    cat: pick(q.get("c"), SELECTIONS.map((s) => s.id), DAILY.cat),
    region: q.get("korean") === "1" ? "korea" : pick(q.get("region"), REGIONS.map((r) => r.id), DAILY.region),
    level: pick(q.get("level"), LEVELS.map((l) => l.id), DAILY.level),
    era: pick(q.get("era"), ERAS.map((e) => e.id), DAILY.era),
    sport: q.get("sport")?.slice(0, 60) || "all",
  };
}

export function filtersQuery(f: Filters) {
  const q = new URLSearchParams({ c: f.cat, region: f.region, level: f.level, era: f.era });
  if (f.cat === "athletes" && f.sport !== "all") q.set("sport", f.sport);
  return q.toString();
}

export const isDaily = (f: Filters) => filtersQuery(f) === filtersQuery(DAILY);

type Meta = Pick<Face, "id" | "category" | "korean" | "region" | "born" | "sport" | "fame">;

export function inCategory(f: Pick<Face, "category">, sel: Selection) {
  if (sel === "mix") return true;
  if (sel === "celebrities") return f.category === "singers" || f.category === "actors" || f.category === "comedians" || f.category === "creators";
  return f.category === sel;
}

/** Faces matching every filter except difficulty. */
function matching<T extends Meta>(faces: T[], f: Filters): T[] {
  return faces.filter(
    (x) =>
      inCategory(x, f.cat) &&
      (f.region === "world" ? !x.korean || x.fame >= KOREA_WORLDWIDE_FAME : x.region === f.region) &&
      (f.era === "all" || (x.born !== null && (f.era === "legends" ? x.born <= LEGEND_BORN : x.born > LEGEND_BORN))) &&
      (f.cat !== "athletes" || f.sport === "all" || x.sport === f.sport),
  );
}

/**
 * The pool a round is drawn from. Difficulty is relative to the other
 * filters: Easy is the best-known third of what's left, Hard the less-known half.
 */
export function poolFor<T extends Meta>(faces: T[], f: Filters): T[] {
  const pool = matching(faces, f);
  if (f.level === "normal") return pool;
  const byFame = [...pool].sort((a, b) => b.fame - a.fame || a.id.localeCompare(b.id));
  return f.level === "easy" ? byFame.slice(0, Math.ceil(byFame.length / 3)) : byFame.slice(Math.floor(byFame.length / 2));
}

/** Pool sizes for each choice, holding the other filters fixed, so the menu can grey out thin ones. */
export function optionCounts<T extends Meta>(faces: T[], f: Filters) {
  const size = (g: Partial<Filters>) => matching(faces, { ...f, ...g }).length;
  const sports = new Map<string, number>();
  for (const x of matching(faces, { ...f, cat: "athletes", sport: "all" })) if (x.sport) sports.set(x.sport, (sports.get(x.sport) ?? 0) + 1);
  return {
    pool: poolFor(faces, f).length,
    cat: Object.fromEntries(SELECTIONS.map((s) => [s.id, size({ cat: s.id, sport: "all" })])) as Record<Selection, number>,
    region: Object.fromEntries(REGIONS.map((r) => [r.id, size({ region: r.id })])) as Record<RegionFilter, number>,
    era: Object.fromEntries(ERAS.map((e) => [e.id, size({ era: e.id })])) as Record<Era, number>,
    sport: [...sports].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n })),
  };
}

/** FNV-1a hash of a string, for seeds. */
export function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Draws a round from a pool. Mixed categories get an even share each, a
 * Worldwide round caps any one region at three faces, and faces in `seen`
 * (recently played) are used only if the pool runs short.
 */
export function pickRound<T extends Meta>(pool: T[], f: Filters, rand: () => number, seen: ReadonlySet<string> = new Set(), count = ROUND): T[] {
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  }
  const order = [...sorted.filter((x) => !seen.has(x.id)), ...sorted.filter((x) => seen.has(x.id))];

  const cats = CATEGORIES.filter((c) => inCategory({ category: c }, f.cat));
  const quota = Math.ceil(count / cats.length);
  const out: T[] = [];
  const taken = new Set<string>();
  const perCat = new Map<Category, number>();
  const perRegion = new Map<Region, number>();
  const take = (x: T) => {
    out.push(x);
    taken.add(x.id);
    perCat.set(x.category, (perCat.get(x.category) ?? 0) + 1);
    perRegion.set(x.region, (perRegion.get(x.region) ?? 0) + 1);
  };
  // Strict first, then relax the category share, then the region cap.
  const passes: ((x: T) => boolean)[] = [
    (x) => (perCat.get(x.category) ?? 0) < quota && (f.region !== "world" || (perRegion.get(x.region) ?? 0) < REGION_CAP),
    (x) => f.region !== "world" || (perRegion.get(x.region) ?? 0) < REGION_CAP,
    () => true,
  ];
  for (const ok of passes) {
    for (const x of order) {
      if (out.length >= count) break;
      if (!taken.has(x.id) && ok(x)) take(x);
    }
  }
  // Shuffle so the categories don't come in blocks.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Today's shared round. */
export const dailyRound = <T extends Meta>(faces: T[], day: number) => pickRound(poolFor(faces, DAILY), DAILY, mulberry32(hash(`whos-that:daily:${day}`)));

/* ---------- Judging typed answers ---------- */

/** Lower-case, no accents, no punctuation or spaces: "Beyoncé" → "beyonce", "O'Neal" → "oneal". Hangul is split into letters. */
export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Words of a name, each normalized: "Son Heung-min (footballer)" → ["son", "heungmin"]. */
export const words = (s: string) =>
  s
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

/** Edit distance where a swap of two neighbouring letters counts as one slip. */
export function slips(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  // Never below the length gap; past 6 (more than any allowance) the exact figure doesn't matter.
  if (Math.abs(m - n) > 6) return Math.abs(m - n);
  let prev2: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

const JAMO = /[ᄀ-ᇿ]/;
/**
 * Slips allowed in one word of a name: none up to 4 letters, 1 up to 7,
 * 2 beyond. Hangul names allow one slipped letter from three syllables up.
 */
export function allowance(word: string) {
  if (JAMO.test(word)) return (word.match(/[ᄀ-ᄒ]/g)?.length ?? 0) >= 3 ? 1 : 0;
  return word.length <= 4 ? 0 : word.length <= 7 ? 1 : 2;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1 || xs.length > 3) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/**
 * Slips between a guess and one accepted form of a name, or Infinity if the
 * guess doesn't cover the whole name. Words may come in any order ("Taemin Lee"),
 * and spacing doesn't matter ("heungmin" / "heung min").
 */
export function distance(guess: string[], form: string[], limit = true) {
  if (!guess.length || !form.length) return Infinity;
  let best = Infinity;
  const allowed = form.reduce((s, w) => s + allowance(w), 0);
  for (const order of permutations(form)) {
    if (guess.length === order.length) {
      let d = 0;
      for (let i = 0; i < order.length && d < Infinity; i++) {
        const s = slips(guess[i], order[i]);
        d = limit && s > allowance(order[i]) ? Infinity : d + s;
      }
      best = Math.min(best, d);
    }
    // Spacing differs ("heungmin" vs "heung min"): compare the whole name instead.
    if (guess.length !== order.length || !limit) {
      const s = slips(guess.join(""), order.join(""));
      if (!limit || s <= allowed) best = Math.min(best, s);
    }
  }
  return best;
}

const forms = (f: Pick<Face, "name" | "aliases">) => [f.name, ...f.aliases].map(words).filter((w) => w.length > 0);

export type Verdict = { correct: boolean; forgiven: boolean };

/**
 * Judges a typed answer. It must name the whole person (full name, stage
 * name, Korean name or a listed nickname); small typos are forgiven, but not
 * when the guess is as close to someone else in the library.
 */
export function judge(guess: string, face: Pick<Face, "id" | "name" | "aliases">, everyone: Pick<Face, "id" | "name" | "aliases">[] = []): Verdict {
  const g = words(guess);
  if (!g.length) return { correct: false, forgiven: false };
  const d = Math.min(...forms(face).map((form) => distance(g, form)));
  if (d === 0) return { correct: true, forgiven: false };
  if (d === Infinity) return { correct: false, forgiven: false };
  for (const other of everyone) {
    if (other.id === face.id) continue;
    if (forms(other).some((form) => distance(g, form, false) <= d)) return { correct: false, forgiven: false };
  }
  return { correct: true, forgiven: true };
}

export const isCorrect = (guess: string, f: Pick<Face, "id" | "name" | "aliases">, everyone?: Pick<Face, "id" | "name" | "aliases">[]) =>
  judge(guess, f, everyone).correct;

/* ---------- One-name answers ---------- */

/**
 * Everyday first names: too generic to identify anyone on their own
 * ("Taylor", "Ed", "Chris"), so they never count as a one-word answer.
 */
const COMMON_FIRST = new Set(
  `aaron adam adrian alan albert alex alexander alexandra alice alicia amanda amy andre andrea andrew andy angela anna anne anthony ashley
  barbara ben benjamin bill billy bob bobby brad brandon brian bruce bruno caleb carl carlos caroline catherine charles charlie chris
  christian christina christopher claire colin craig dan daniel danny dave david dean dennis diana diane donald doug douglas ed eddie
  edward elizabeth ellen emily emma eric erik frank fred gary george grace greg harry helen henry ian jack jacob jake james jamie jane
  jason jay jeff jennifer jenny jerry jessica jim jimmy joe joel john johnny jon jonathan jordan jose joseph josh julia julie justin karen
  kate katie keith kelly kevin kim kyle larry laura lauren lee leo lewis linda lisa louis lucas luke luis maria mark martin mary matt
  matthew megan michael michelle mike nancy nathan nick nicole noah oliver olivia patrick paul peter phil philip rachel ray richard rick
  rob robert robin roger ron ryan sam samuel sara sarah scott sean simon sophie stephen steve steven sue susan taylor ted thomas tim
  tom tommy tony travis victor vincent walter wayne will william zach`.split(/\s+/),
);

/** Very common surnames: typing one alone doesn't point to a single famous person. */
const COMMON_SURNAMES = new Set(
  `smith johnson williams brown jones miller davis wilson anderson taylor thomas moore martin jackson thompson white harris clark lewis
  robinson walker young allen king wright scott green baker adams nelson hill campbell mitchell roberts carter phillips evans turner
  parker collins edwards stewart morris murphy cook rogers morgan cooper peterson reed bailey bell kelly howard ward cox richardson wood
  watson brooks bennett gray james hughes price sanders myers long ross foster lee kim park choi chen wang wong li zhang liu garcia
  rodriguez martinez hernandez lopez gonzalez perez sanchez ramirez torres silva santos`.split(/\s+/),
);

/** Particles that belong to the surname: "De Bruyne", "van Dijk", "Del Piero". */
const PARTICLES = new Set(["de", "van", "von", "der", "den", "del", "della", "di", "da", "dos", "du", "la", "le", "al", "bin", "el"]);
const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
/** Royal and religious titles: these people need their full title or a listed nickname. */
const TITLED = /,|\b(pope|prince|princess|king|queen|duke|duchess|dalai|lama|sir|dame)\b|\b(ii|iii|iv|xiv)$/i;

/** The first name and full surname of a Western-order name, or null when the rule doesn't apply. */
export function nameParts(name: string): { first: string; surname: string } | null {
  const plain = name.replace(/\s*\(.*\)$/, "").trim();
  if (TITLED.test(plain)) return null;
  const parts = plain.split(/\s+/).filter((p) => !SUFFIX.test(p));
  if (parts.length < 2) return null;
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase())) i--;
  return { first: parts[0], surname: parts.slice(i).join(" ") };
}

type Named = Pick<Face, "id" | "name" | "category" | "korean"> & { country?: string };

/** Places where names are usually written family name first in English. */
const FAMILY_FIRST = new Set(["cn", "tw", "hk", "mo", "sg", "my"]);

/**
 * Chinese-style names written family name first ("Lee Chong Wei", "Yao
 * Ming"): short syllables, no English given name in front. Korean names are
 * flagged separately.
 */
const familyFirst = (f: Named) => {
  if (!f.country || !FAMILY_FIRST.has(f.country)) return false;
  const syllables = f.name.replace(/\s*\(.*\)$/, "").split(/[\s-]+/);
  return !COMMON_FIRST.has(normalize(syllables[0])) && syllables.every((s) => s.length <= 5);
};

/**
 * One-word answers a face accepts on top of its full name. A first name or
 * surname counts alone when all of these hold:
 *  1. the name is in Western order: Korean and Chinese-style names (family
 *     name first) and royal or religious titles always need the full name;
 *  2. it's at least 4 letters ("Ed", "Kim", "Yao" are too short to be sure);
 *  3. it isn't an everyday first name or a very common surname
 *     ("Taylor", "Chris", "Smith", "Lewis");
 *  4. nobody else in the library shares it, as a first name or surname
 *     ("Williams" could be Serena or Venus, "Obama" Barack or Michelle).
 * Listed nicknames (Messi, Shaq, Ali, Sonny) are added separately and
 * always count, so this rule only ever adds answers.
 */
export function singleNames(face: Named, library: Named[]): string[] {
  if (face.korean || familyFirst(face)) return [];
  const parts = nameParts(face.name);
  if (!parts) return [];
  const taken = new Map<string, number>();
  for (const other of library) {
    const p = nameParts(other.name);
    // One-word names ("Ronaldo", "Neymar") also block that word for others.
    const ws = p ? [p.first, p.surname] : words(other.name).length === 1 ? [other.name.replace(/\s*\(.*\)$/, "")] : [];
    for (const w of new Set(ws.map(normalize))) taken.set(w, (taken.get(w) ?? 0) + 1);
  }
  const out: string[] = [];
  for (const [word, common] of [
    [parts.first, COMMON_FIRST],
    [parts.surname, COMMON_SURNAMES],
  ] as const) {
    const n = normalize(word);
    if (n.length < 4 || common.has(n)) continue;
    if ((taken.get(n) ?? 0) > 1) continue;
    out.push(word);
  }
  return out;
}

export function initials(name: string) {
  return words(name.replace(/-/g, " "))
    .map((w) => `${w[0].toUpperCase()}.`)
    .join(" ");
}

/* ---------- Scoring ---------- */

/** typed: what the player entered for the guess that counted; forgiven: accepted despite a typo. */
export type Answer = { correct: boolean; seconds: number; hint: boolean; guesses: number; typed?: string; forgiven?: boolean };

export type TierId = "lightning" | "blazing" | "quick" | "steady" | "close" | "buzzer" | "missed";

export type Tier = {
  id: TierId;
  label: string;
  icon: string;
  /** Answered within this many seconds. */
  within: number;
  points: number;
  /** Badge colour, and text colour that reads on it. */
  color: string;
  ink: string;
  /** Share-text square. */
  square: string;
};

/**
 * Speed tiers, fastest first. Points are fixed per tier so every answer shows
 * a clear +N; the colours climb like loot rarities, from grey up to gold.
 */
export const TIERS: Tier[] = [
  { id: "lightning", label: "Lightning", icon: "⚡", within: 2, points: 250, color: "#ffc53d", ink: "#141414", square: "🟨" },
  { id: "blazing", label: "Blazing", icon: "🔥", within: 4, points: 200, color: "#ff8a3d", ink: "#141414", square: "🟧" },
  { id: "quick", label: "Quick", icon: "✦", within: 6.5, points: 160, color: "#a78bfa", ink: "#141414", square: "🟪" },
  { id: "steady", label: "Steady", icon: "●", within: 9.5, points: 130, color: "#4ea8ff", ink: "#141414", square: "🟦" },
  { id: "close", label: "Close call", icon: "◐", within: 13, points: 110, color: "#3ecf8e", ink: "#141414", square: "🟩" },
  { id: "buzzer", label: "Buzzer beater", icon: "⏱", within: SECONDS, points: 100, color: "#d9d2c5", ink: "#141414", square: "⬜" },
];

export const MISSED: Tier = {
  id: "missed",
  label: "Missed",
  icon: "✕",
  within: Infinity,
  points: 0,
  color: "#141414",
  ink: "#f3ede2",
  square: "⬛",
};

/** The tier for an answer time (or for the clock right now, while playing). */
export const tierAt = (seconds: number) => TIERS.find((t) => seconds <= t.within) ?? TIERS.at(-1)!;

export const tierFor = (a: Answer) => (a.correct ? tierAt(a.seconds) : MISSED);

/** The tier's points; a hint halves them. */
export function pointsFor(a: Answer) {
  if (!a.correct) return 0;
  const p = tierAt(a.seconds).points;
  return a.hint ? Math.round(p / 2) : p;
}

export const MAX_SCORE = ROUND * TIERS[0].points;

export const scoreOf = (answers: Answer[]) => answers.reduce((s, a) => s + pointsFor(a), 0);

/** Share-text square for an answer. */
export const tile = (a: Answer) => tierFor(a).square;

/** A title for the day's total. */
export function rankFor(score: number) {
  const ranks: [number, string][] = [
    [2200, "Face oracle"],
    [1700, "Paparazzi"],
    [1200, "Red-carpet regular"],
    [700, "Fan in the crowd"],
    [1, "Squinting at the screen"],
    [0, "Who are these people?"],
  ];
  return ranks.find(([min]) => score >= min)![1];
}

/** Round summary for the results page. */
export function summarize(answers: Answer[]) {
  const right = answers.filter((a) => a.correct);
  const times = right.map((a) => a.seconds);
  const counts = new Map<TierId, number>();
  for (const a of answers) counts.set(tierFor(a).id, (counts.get(tierFor(a).id) ?? 0) + 1);
  let best = 0;
  let run = 0;
  for (const a of answers) {
    run = a.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {
    right: right.length,
    score: scoreOf(answers),
    average: times.length ? times.reduce((s, t) => s + t, 0) / times.length : null,
    fastest: times.length ? Math.min(...times) : null,
    hints: answers.filter((a) => a.hint).length,
    bestRun: best,
    counts,
  };
}
