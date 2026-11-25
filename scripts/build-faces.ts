/* eslint-disable @typescript-eslint/no-explicit-any -- loosely shaped Wikidata/Commons API responses */
/*
 * Builds the Who's That? photo set from scripts/faces-roster.ts.
 *
 * For each Wikipedia title it looks up the person on Wikidata, takes their
 * portrait image (P18) from Wikimedia Commons, keeps it only if the licence
 * allows reuse with credit, saves a compressed WebP copy to public/faces/
 * under a neutral file name, and records the credit. `npm run faces:upload`
 * then copies new photos to Cloudflare R2.
 *
 * Incremental and polite: lookups are batched (50 per request), downloads
 * go one at a time, and people already in faces.json keep their photo and
 * review status. Run with `npm run faces`.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { ROSTER, type Category } from "./faces-roster.ts";

const OUT_JSON = "src/features/whos-that/faces.json";
const OUT_DIR = "public/faces";
/** Wikimedia only serves thumbnails at standard widths (250, 330, 500, 960 …). */
const WIDTH = 500;
/** Width of the stored WebP. */
const PHOTO_WIDTH = 480;
const UA = "PlaygroundFacesBuilder/0.1 (offline build script)";

export type Region = "korea" | "anglo" | "europe" | "latam" | "asia" | "africa" | "other";

export type Face = {
  id: string;
  qid: string;
  name: string;
  /** Other accepted answers: Wikidata aliases, plus the Korean name where there is one. */
  aliases: string[];
  category: Category;
  korean: boolean;
  /** Storage key, e.g. "faces/4494d37b3d06-1a2b3c4d.webp" — served from public/ locally or from R2. */
  image: string;
  credit: { artist: string; license: string; licenseUrl: string; source: string };
  /** Filter metadata from Wikidata, refreshed on every run. */
  region: Region;
  /** ISO country code of citizenship, lower case ("us", "kr"), or "" if unknown. */
  country: string;
  born: number | null;
  /** Main sport for athletes ("association football", "basketball"), else null. */
  sport: string | null;
  /** Number of language Wikipedias with an article: a rough measure of worldwide fame. */
  fame: number;
  /** Set by the review page; only approved faces are played. */
  status: "unreviewed" | "approved" | "rejected";
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polite GET: one request at a time, honouring Retry-After and backing off on 429/5xx. */
async function get(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 10_000 * (attempt + 1);
      console.log(`  rate limited (${res.status}), waiting ${Math.round(wait / 1000)}s…`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}
const getJSON = async (url: string): Promise<any> => (await get(url)).json();

const strip = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

/**
 * Licences that allow reuse with credit: Creative Commons (CC0, BY, BY-SA),
 * public domain, and government open licences (UK OGL, India GODL, Korea KOGL Type 1).
 */
const FREE = /^(cc0|public domain|pd\b|pd-|cc[ -]by|ogl|godl|kogl type 1$|attribution$)/i;
const norm = (t: string) => t.replace(/_/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

type Person = {
  qid: string;
  name: string;
  aliases: string[];
  file: string;
  countries: string[];
  born: number | null;
  sports: string[];
  fame: number;
};

/** Item ids from a claim list, preferred rank first, deprecated dropped. */
const itemIds = (claims: any[] = []) =>
  [...claims]
    .filter((c) => c.rank !== "deprecated" && c.mainsnak?.datavalue?.value?.id)
    .sort((a, b) => Number(b.rank === "preferred") - Number(a.rank === "preferred"))
    .map((c) => c.mainsnak.datavalue.value.id as string);

/** Sister projects that are not language Wikipedias. */
const NOT_WIKIPEDIA = new Set(["commonswiki", "specieswiki", "metawiki", "mediawikiwiki", "wikidatawiki", "incubatorwiki", "outreachwiki", "foundationwiki", "wikimaniawiki", "sourceswiki"]);
const wikipediaCount = (sitelinks: Record<string, unknown> = {}) =>
  Object.keys(sitelinks).filter((k) => /^[a-z_]+wiki$/.test(k) && !NOT_WIKIPEDIA.has(k)).length;

/** Looks up to 50 Wikipedia titles per request. */
async function resolveAll(titles: string[], failures: string[]): Promise<Map<string, Person>> {
  const found = new Map<string, Person>();
  for (const batch of chunks(titles, 50)) {
    // Follow Wikipedia redirects first so renamed articles still match.
    const wp = await getJSON(
      "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=" + encodeURIComponent(batch.join("|")),
    );
    const steps = new Map<string, string>([
      ...(wp.query?.normalized ?? []).map((n: any) => [norm(n.from), norm(n.to)] as [string, string]),
      ...(wp.query?.redirects ?? []).map((r: any) => [norm(r.from), norm(r.to)] as [string, string]),
    ]);
    const canonical = new Map<string, string>();
    for (const t of batch) {
      let c = norm(t);
      for (let i = 0; i < 3 && steps.has(c); i++) c = steps.get(c)!;
      canonical.set(t, c);
    }
    const api =
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&sites=enwiki&redirects=yes" +
      "&props=labels|aliases|claims|sitelinks&languages=en|ko&titles=" +
      encodeURIComponent(batch.map((t) => canonical.get(t)!).join("|"));
    const data = await getJSON(api);
    const byTitle = new Map<string, any>();
    for (const entity of Object.values<any>(data.entities ?? {})) {
      const t = entity.sitelinks?.enwiki?.title;
      if (t) byTitle.set(norm(t), entity);
    }
    for (const title of batch) {
      const entity = byTitle.get(canonical.get(title)!);
      if (!entity) {
        failures.push(`${title}: no Wikidata match (check the exact Wikipedia title)`);
        continue;
      }
      const isHuman = (entity.claims?.P31 ?? []).some((c: any) => c.mainsnak?.datavalue?.value?.id === "Q5");
      if (!isHuman) {
        failures.push(`${title}: ${entity.id} is not a person`);
        continue;
      }
      const images = (entity.claims?.P18 ?? []) as any[];
      const best = images.find((c) => c.rank === "preferred") ?? images.find((c) => c.rank !== "deprecated");
      if (!best) {
        failures.push(`${title}: ${entity.id} has no portrait image`);
        continue;
      }
      const name: string = entity.labels?.en?.value ?? title;
      const aliases = new Set<string>((entity.aliases?.en ?? []).map((a: any) => a.value as string));
      if (entity.labels?.ko?.value) aliases.add(entity.labels.ko.value);
      aliases.delete(name);
      const birth = (entity.claims?.P569 ?? []).find((c: any) => c.rank !== "deprecated")?.mainsnak?.datavalue?.value?.time as string | undefined;
      found.set(title, {
        qid: entity.id,
        name,
        aliases: [...aliases],
        file: best.mainsnak.datavalue.value,
        countries: itemIds(entity.claims?.P27),
        born: birth ? Number(birth.slice(1, 5)) || null : null,
        sports: itemIds(entity.claims?.P641),
        fame: wikipediaCount(entity.sitelinks),
      });
    }
    await sleep(1500);
  }
  return found;
}

/** English label, ISO code and continents for countries and sports. */
async function describeAll(ids: string[]): Promise<Map<string, { label: string; iso: string; continents: string[] }>> {
  const out = new Map<string, { label: string; iso: string; continents: string[] }>();
  for (const batch of chunks(ids, 50)) {
    const data = await getJSON(
      "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims&languages=en&ids=" + batch.join("|"),
    );
    for (const e of Object.values<any>(data.entities ?? {})) {
      const iso = (e.claims?.P297 ?? []).find((c: any) => c.rank !== "deprecated")?.mainsnak?.datavalue?.value ?? "";
      out.set(e.id, { label: e.labels?.en?.value ?? e.id, iso: String(iso).toLowerCase(), continents: itemIds(e.claims?.P30) });
    }
    await sleep(1500);
  }
  return out;
}

const ANGLO = new Set(["us", "gb", "ca", "au", "ie", "nz"]);
const CONTINENT: Record<string, Region> = { Q46: "europe", Q48: "asia", Q15: "africa", Q18: "latam", Q538: "anglo", Q55643: "anglo" };

/** Countries whose Wikidata entry lacks a continent. */
const ISO_REGION: Record<string, Region> = { in: "asia", cn: "asia", jp: "asia", sg: "asia", id: "asia", my: "asia", sn: "africa" };

/** Sport names grouped for the filter; the first listed sport that maps here wins over oddities. */
const SPORT: Record<string, string> = {
  "association football": "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  baseball: "Baseball",
  golf: "Golf",
  "professional golf": "Golf",
  "Formula One": "Motor racing",
  "auto racing": "Motor racing",
  "kart racing": "Motor racing",
  boxing: "Combat sports",
  "mixed martial arts": "Combat sports",
  "competitive swimming": "Swimming",
  swimming: "Swimming",
  athletics: "Athletics",
  "American football": "American football",
  "ice hockey": "Ice hockey",
  cricket: "Cricket",
  "figure skating": "Skating",
  "speed skating": "Skating",
  "short-track speed skating": "Skating",
  "artistic gymnastics": "Gymnastics",
  esports: "Esports",
  archery: "Archery",
  badminton: "Badminton",
  "table tennis": "Table tennis",
  motorsport: "Motor racing",
  "Grand Prix motorcycle racing": "Motor racing",
  "motorcycle racing": "Motor racing",
  chess: "Chess",
  skateboarding: "Action sports",
  snowboarding: "Action sports",
  "freestyle skiing": "Action sports",
  surfing: "Action sports",
  "alpine skiing": "Skiing",
  "sport of athletics": "Athletics",
  "track and field": "Athletics",
  marathon: "Athletics",
  "pole vault": "Athletics",
  "long-distance running": "Athletics",
  kickboxing: "Combat sports",
  "professional boxing": "Combat sports",
  "professional wrestling": "Combat sports",
  karate: "Combat sports",
  judo: "Combat sports",
  taekwondo: "Combat sports",
  wrestling: "Combat sports",
  "Brazilian jiu-jitsu": "Combat sports",
  "Formula Three": "Motor racing",
  "FIA Formula 2 Championship": "Motor racing",
  "formula racing": "Motor racing",
  "IndyCar Series": "Motor racing",
  "NASCAR Cup Series": "Motor racing",
  "GP2 Series": "Motor racing",
  "motorcycle road racing": "Motor racing",
  rallying: "Motor racing",
  "Canadian football": "American football",
  cycling: "Cycling",
  rugby: "Rugby",
  weightlifting: "Weightlifting",
  volleyball: "Volleyball",
};

/** Hand fixes where Wikidata is missing or wrong, by name. */
const FIXES: Record<string, Partial<Pick<Face, "region" | "country" | "sport">>> = {
  "Narendra Modi": { region: "asia", country: "in" },
  "Robert Lewandowski": { sport: "Football" },
  "Sadio Mané": { region: "africa", country: "sn" },
  "JianHao Tan": { region: "asia", country: "sg" },
  "Joko Widodo": { region: "asia", country: "id" },
  "Jang Mi-ran": { sport: "Weightlifting" },
};

/** Region for the filters, from the first citizenship that maps to one. */
function regionFor(korean: boolean, countries: { iso: string; continents: string[] }[]): Region {
  if (korean) return "korea";
  for (const c of countries) {
    if (ANGLO.has(c.iso)) return "anglo";
    if (ISO_REGION[c.iso]) return ISO_REGION[c.iso];
    if (c.iso === "kr") return "korea";
    // North America outside the US and Canada: Mexico, Central America, the Caribbean.
    if (c.continents.includes("Q49")) return "latam";
    for (const k of c.continents) if (CONTINENT[k]) return CONTINENT[k];
  }
  return "other";
}

type Info = { thumb: string; credit: Face["credit"] } | { error: string };

/** Licence and thumbnail URL for up to 50 Commons files per request. */
async function imageInfoAll(files: string[]): Promise<Map<string, Info>> {
  const out = new Map<string, Info>();
  for (const batch of chunks(files, 50)) {
    const api =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata" +
      `&iiurlwidth=${WIDTH}&titles=` +
      encodeURIComponent(batch.map((f) => `File:${f}`).join("|"));
    const data = await getJSON(api);
    const normalized = new Map<string, string>((data.query?.normalized ?? []).map((n: any) => [n.to, n.from]));
    for (const page of Object.values<any>(data.query?.pages ?? {})) {
      const asked = (normalized.get(page.title) ?? page.title).replace(/^File:/, "");
      const key = batch.find((f) => norm(f) === norm(asked)) ?? asked;
      const info = page.imageinfo?.[0];
      if (!info) {
        out.set(key, { error: "no image info" });
        continue;
      }
      const meta = info.extmetadata ?? {};
      const license = strip(meta.LicenseShortName?.value ?? "");
      if (!FREE.test(license)) {
        out.set(key, { error: `licence not free enough: "${license}"` });
        continue;
      }
      out.set(key, {
        thumb: info.thumburl,
        credit: {
          artist: strip(meta.Artist?.value ?? "Unknown") || "Unknown",
          license,
          licenseUrl: meta.LicenseUrl?.value ?? "",
          source: info.descriptionurl,
        },
      });
    }
    await sleep(1500);
  }
  return out;
}

/** Where a photo key ("faces/abc-1234.webp") lives on disk before upload. */
const localPath = (key: string) => `public/${key.replace(/^\//, "")}`;

/**
 * Resizes and compresses a photo to WebP and stores it under a key that
 * includes a hash of its bytes, so a replaced photo gets a new URL and
 * CDN caches never serve a stale one.
 */
async function saveWebp(id: string, input: Buffer): Promise<string> {
  const webp = await sharp(input).rotate().resize({ width: PHOTO_WIDTH, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  const hash = createHash("sha1").update(webp).digest("hex").slice(0, 8);
  const key = `faces/${id}-${hash}.webp`;
  writeFileSync(localPath(key), webp);
  return key;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const existing: Face[] = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, "utf8")) : [];
  const byQid = new Map(existing.map((f) => [f.qid, f]));
  const failures: string[] = [];

  console.log(`Looking up ${ROSTER.length} people on Wikidata…`);
  const people = await resolveAll(ROSTER.map((r) => r.title), failures);

  const described = await describeAll([...new Set([...people.values()].flatMap((p) => [...p.countries, ...p.sports]))]);

  const needInfo = [...new Set([...people.values()].filter((p) => !byQid.has(p.qid)).map((p) => p.file))];
  console.log(`Reading licences for ${needInfo.length} photos on Commons…`);
  const infos = await imageInfoAll(needInfo);

  const out: Face[] = [];
  const seen = new Set<string>();
  const save = () => {
    const sorted = [...out].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    writeFileSync(OUT_JSON, `${JSON.stringify(sorted, null, 1)}\n`);
  };

  let downloaded = 0;
  let converted = 0;
  for (const entry of ROSTER) {
    const person = people.get(entry.title);
    if (!person || seen.has(person.qid)) continue;
    seen.add(person.qid);
    const id = createHash("sha1").update(`whos-that:${person.qid}`).digest("hex").slice(0, 12);
    const prior = byQid.get(person.qid);
    let image = prior?.image;
    let credit = prior?.credit;
    try {
      if (prior && /\.(jpe?g|png)$/i.test(prior.image) && existsSync(localPath(prior.image))) {
        // One-off migration of early downloads to compressed WebP.
        image = await saveWebp(id, readFileSync(localPath(prior.image)));
        unlinkSync(localPath(prior.image));
        converted++;
      } else if (!prior) {
        const info = infos.get(person.file);
        if (!info) throw new Error("no licence information");
        if ("error" in info) throw new Error(info.error);
        const res = await get(info.thumb);
        image = await saveWebp(id, Buffer.from(await res.arrayBuffer()));
        credit = info.credit;
        downloaded++;
        if (downloaded % 10 === 0) {
          console.log(`  ${downloaded} photos downloaded`);
          save();
        }
        await sleep(700);
      }
      out.push({
        id,
        qid: person.qid,
        name: person.name,
        aliases: person.aliases,
        category: entry.category,
        korean: !!entry.korean,
        image: image!,
        credit: credit!,
        region: regionFor(!!entry.korean, person.countries.map((q) => described.get(q) ?? { iso: "", continents: [] })),
        country: person.countries.map((q) => described.get(q)?.iso).find(Boolean) ?? "",
        born: person.born,
        sport: entry.category === "athletes" ? (person.sports.map((q) => SPORT[described.get(q)?.label ?? ""]).find(Boolean) ?? null) : null,
        fame: person.fame,
        ...FIXES[person.name],
        status: prior?.status ?? "unreviewed",
      });
    } catch (e) {
      failures.push(`${entry.title}: ${(e as Error).message}`);
    }
  }

  const unmapped = [...new Set([...people.values()].flatMap((p) => p.sports.map((q) => described.get(q)?.label ?? q)))].filter((l) => !SPORT[l]);
  if (unmapped.length) console.log(`Sports not in the SPORT map: ${unmapped.join(", ")}`);
  save();
  console.log(`\n${out.length} faces written to ${OUT_JSON} (${downloaded} new photos, ${converted} converted to WebP)`);
  if (failures.length) console.log(`\n${failures.length} skipped:\n  ${failures.join("\n  ")}`);
}

main();
