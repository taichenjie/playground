import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DAILY,
  KOREA_WORLDWIDE_FAME,
  MAX_SCORE,
  REGION_CAP,
  SECONDS,
  TIERS,
  dailyRound,
  filtersQuery,
  judge,
  normalize,
  optionCounts,
  parseFilters,
  pickRound,
  pointsFor,
  poolFor,
  rankFor,
  slips,
  summarize,
  tierAt,
  tile,
  type Category,
  type Face,
  type Filters,
  type Region,
} from "./logic.ts";
import { mulberry32 } from "../../lib/daily.ts";

type Meta = Pick<Face, "id" | "category" | "korean" | "region" | "born" | "sport" | "fame">;
const cats: Category[] = ["athletes", "singers", "actors", "comedians", "creators", "public"];
const regions: Region[] = ["anglo", "anglo", "europe", "latam", "asia", "korea"];
const library: Meta[] = Array.from({ length: 300 }, (_, i) => {
  const region = regions[i % regions.length];
  return {
    id: `id${String(i).padStart(3, "0")}`,
    category: cats[i % cats.length],
    korean: region === "korea",
    region,
    born: 1940 + (i % 70),
    sport: i % 5 === 0 ? (i % 2 ? "Football" : "Tennis") : null,
    fame: (i * 37) % 150,
  };
});
const f = (g: Partial<Filters>): Filters => ({ ...DAILY, ...g });

describe("filters", () => {
  it("reads filters from a link, ignoring junk, and keeps old Korean links working", () => {
    assert.deepEqual(parseFilters(new URLSearchParams("c=actors&region=korea&level=hard&era=now")), f({ cat: "actors", region: "korea", level: "hard", era: "now" }));
    assert.deepEqual(parseFilters(new URLSearchParams("c=nope&region=mars")), DAILY);
    assert.equal(parseFilters(new URLSearchParams("c=mix&korean=1")).region, "korea");
    assert.deepEqual(parseFilters(new URLSearchParams(filtersQuery(f({ cat: "athletes", sport: "Football" })))), f({ cat: "athletes", sport: "Football" }));
  });

  it("keeps lesser-known Korean stars out of Worldwide", () => {
    const world = poolFor(library, DAILY);
    assert.ok(world.every((x) => !x.korean || x.fame >= KOREA_WORLDWIDE_FAME));
    assert.ok(world.some((x) => x.korean));
    assert.ok(poolFor(library, f({ region: "korea" })).every((x) => x.korean));
  });

  it("filters by era and sport, and makes difficulty relative to what's left", () => {
    assert.ok(poolFor(library, f({ era: "legends" })).every((x) => x.born! <= 1975));
    assert.ok(poolFor(library, f({ cat: "athletes", sport: "Tennis" })).every((x) => x.sport === "Tennis"));
    const all = poolFor(library, f({ region: "anglo" }));
    const easy = poolFor(library, f({ region: "anglo", level: "easy" }));
    const hard = poolFor(library, f({ region: "anglo", level: "hard" }));
    assert.equal(easy.length, Math.ceil(all.length / 3));
    assert.ok(Math.min(...easy.map((x) => x.fame)) >= Math.max(...hard.map((x) => x.fame)));
  });

  it("counts each choice's pool so thin ones can be greyed out", () => {
    const c = optionCounts(library, f({ cat: "singers" }));
    assert.equal(c.cat.singers, c.pool);
    assert.equal(c.region.korea, poolFor(library, f({ cat: "singers", region: "korea" })).length);
    assert.ok(c.sport.length >= 1);
  });
});

describe("picking a round", () => {
  it("gives ten different faces, at most two per category and at most three per region", () => {
    for (let seed = 1; seed < 30; seed++) {
      const round = pickRound(poolFor(library, DAILY), DAILY, mulberry32(seed));
      assert.equal(round.length, 10);
      assert.equal(new Set(round.map((x) => x.id)).size, 10);
      for (const c of cats) assert.ok(round.filter((x) => x.category === c).length <= 2);
      for (const r of regions) assert.ok(round.filter((x) => x.region === r).length <= REGION_CAP);
    }
  });

  it("is the same for everyone on a day and differs between days", () => {
    assert.deepEqual(dailyRound(library, 5), dailyRound([...library].reverse(), 5));
    assert.notDeepEqual(dailyRound(library, 5), dailyRound(library, 6));
  });

  it("avoids recently seen faces while the pool allows", () => {
    const pool = poolFor(library, f({ cat: "singers", region: "anglo" }));
    const seen = new Set(pool.slice(0, pool.length - 10).map((x) => x.id));
    const round = pickRound(pool, f({ cat: "singers", region: "anglo" }), mulberry32(3), seen);
    assert.ok(round.every((x) => !seen.has(x.id)));
  });
});

describe("judging answers", () => {
  const swift = { id: "ts", name: "Taylor Swift", aliases: ["테일러 스위프트"] };
  const son = { id: "son", name: "Son Heung-min", aliases: ["Heung-min Son", "손흥민", "Sonny"] };
  const messi = { id: "messi", name: "Lionel Messi", aliases: ["Messi"] };
  const taemin = { id: "tm", name: "Lee Taemin", aliases: [] };
  const lisa = { id: "lisa", name: "Lisa (rapper)", aliases: ["Lalisa Manobal"] };
  const kimJiwon = { id: "kjw", name: "Kim Ji-won", aliases: [] };
  const kimJiwoo = { id: "kjwoo", name: "Kim Ji-woo", aliases: [] };
  const ok = (g: string, face: typeof swift, everyone = [swift, son, messi, taemin, lisa, kimJiwon, kimJiwoo]) => judge(g, face, everyone);

  it("counts slips, with a swap as one", () => {
    assert.equal(slips("swift", "swift"), 0);
    assert.equal(slips("swist", "swift"), 1);
    assert.equal(slips("siwft", "swift"), 1);
    assert.equal(normalize("Beyoncé"), "beyonce");
  });

  it("forgives small typos in a full name", () => {
    assert.deepEqual(ok("taylor swift", swift), { correct: true, forgiven: false });
    assert.deepEqual(ok("taylor swist", swift), { correct: true, forgiven: true });
    assert.ok(ok("tayler swiftt", swift).correct);
    assert.ok(ok("TAYLOR SWIFT!!", swift).correct);
    assert.ok(!ok("tailer swizt", swift).correct, "two slips in a five-letter word is too many");
    assert.ok(!ok("Taylor Swfit Smith", swift).correct);
    assert.ok(!ok("Trevor Naoh", { id: "tn", name: "Trevor Noah", aliases: [] }).correct, "short words must be exact");
  });

  it("needs the whole name", () => {
    assert.ok(!ok("taylor", swift).correct);
    assert.ok(!ok("swift", swift).correct);
    assert.ok(!ok("Heung-min", son).correct);
    assert.ok(ok("Messi", messi).correct, "listed nicknames count on their own");
  });

  it("accepts any word order, spacing, stage names and Korean names", () => {
    assert.ok(ok("Taemin Lee", taemin).correct);
    assert.ok(ok("son heungmin", son).correct);
    assert.ok(ok("son heung min", son).correct);
    assert.ok(ok("손흥민", son).correct);
    assert.ok(ok("Sonny", son).correct);
    assert.ok(ok("lisa", lisa).correct);
    assert.ok(ok("Lalisa Manobel", lisa).correct);
    assert.ok(!ok("lise", lisa).correct, "short names must be exact");
  });

  it("rejects a typo that is as close to someone else", () => {
    assert.ok(ok("Kim Ji-won", kimJiwon).correct);
    assert.ok(!ok("Kim Ji-wom", kimJiwon).correct || !ok("Kim Ji-wom", kimJiwoo).correct);
    assert.ok(!ok("Kim Ji-woo", kimJiwon).correct, "another person's exact name");
  });
});

describe("scoring", () => {
  const ans = (seconds: number, hint = false, correct = true) => ({ correct, seconds, hint, guesses: 1 });

  it("gives fixed points per speed tier, fastest first", () => {
    assert.equal(tierAt(0.4).id, "lightning");
    assert.equal(tierAt(2).id, "lightning");
    assert.equal(tierAt(2.01).id, "blazing");
    assert.equal(tierAt(9).id, "steady");
    assert.equal(tierAt(SECONDS).id, "buzzer");
    assert.equal(pointsFor(ans(1)), 250);
    assert.equal(pointsFor(ans(5)), 160);
    assert.equal(pointsFor(ans(14.9)), 100);
    for (let i = 1; i < TIERS.length; i++) assert.ok(TIERS[i].points < TIERS[i - 1].points);
  });

  it("halves for a hint and scores misses zero", () => {
    assert.equal(pointsFor(ans(1, true)), 125);
    assert.equal(pointsFor(ans(3, false, false)), 0);
    assert.equal(tile(ans(1)), "🟨");
    assert.equal(tile(ans(3, false, false)), "⬛");
    assert.equal(MAX_SCORE, 2500);
  });

  it("summarizes a round", () => {
    const s = summarize([ans(1), ans(3), ans(5, false, false), ans(8, true), ans(1.5)]);
    assert.equal(s.right, 4);
    assert.equal(s.score, 250 + 200 + 65 + 250);
    assert.equal(s.fastest, 1);
    assert.equal(s.average, (1 + 3 + 8 + 1.5) / 4);
    assert.equal(s.bestRun, 2);
    assert.equal(s.hints, 1);
    assert.equal(s.counts.get("lightning"), 2);
    assert.equal(rankFor(2500), "Face oracle");
    assert.equal(rankFor(0), "Who are these people?");
  });
});
