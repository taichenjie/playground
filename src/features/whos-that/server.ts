import "server-only";
import { puzzleNumberFor } from "@/lib/daily";
import allFaces from "./faces.json";
import {
  CATEGORY_LABEL,
  dailyRound,
  initials,
  judge,
  optionCounts,
  pickRound,
  poolFor,
  revealed,
  singleNames,
  words,
  type Face,
  type Filters,
  type Hidden,
} from "./logic.ts";
import { NICKNAMES } from "./nicknames.ts";

/*
 * Server-side access to the face library. The browser only ever gets photo
 * keys for faces still in play; names, credits and answer checking stay here.
 */

type Stored = Face & { qid: string; status: "unreviewed" | "approved" | "rejected" };

const dev = process.env.NODE_ENV === "development";

/**
 * Accepted answers for a face: Wikidata aliases, listed nicknames, and the
 * first name or surname alone where the one-name rule allows it (see
 * singleNames). Other one-word aliases that are just part of the full name
 * ("Woods" from Wikidata) are dropped, so the rule alone decides those.
 */
function answersOf(f: Stored, library: Stored[]): string[] {
  const full = words(f.name);
  const kept = f.aliases.filter((a) => {
    const w = words(a);
    return !(full.length >= 2 && w.length === 1 && full.includes(w[0]));
  });
  return [...new Set([...kept, ...singleNames(f, library), ...(NICKNAMES[f.name] ?? [])])];
}

const raw = allFaces as unknown as Stored[];
const pool = raw.filter((f) => f.status !== "rejected");
const stored = raw.map((f) => ({ ...f, aliases: answersOf(f, pool) }));

/**
 * Faces that can be played. Only approved ones — except while developing,
 * where unreviewed faces fill in so the game can be tried before review.
 */
function playable(): Face[] {
  const approved = stored.filter((f) => f.status === "approved");
  return approved.length >= 40 || !dev ? approved : stored.filter((f) => f.status !== "rejected");
}

const faces = playable();
const byId = new Map(faces.map((f) => [f.id, f]));
const hide = (f: Face): Hidden => ({ id: f.id, image: f.image });

/** The server's own puzzle number; clients may be a day either side because of time zones. */
export const serverPuzzle = () => puzzleNumberFor(new Date());

export const dailyFaces = (day: number) => dailyRound(faces, day).map(hide);

/** A fresh free-play round, avoiding faces the player has seen recently where possible. */
export function freeRound(filters: Filters, seen: string[]) {
  const pool = poolFor(faces, filters);
  return { faces: pickRound(pool, filters, Math.random, new Set(seen)).map(hide), pool: pool.length };
}

export const options = (filters: Filters) => optionCounts(faces, filters);

export function guess(id: string, typed: string) {
  const face = byId.get(id);
  if (!face) return null;
  const verdict = judge(typed.slice(0, 80), face, faces);
  return verdict.correct ? { ...verdict, face: revealed(face) } : verdict;
}

export function hint(id: string) {
  const face = byId.get(id);
  return face ? { category: CATEGORY_LABEL[face.category], initials: initials(face.name) } : null;
}

export function reveal(id: string) {
  const face = byId.get(id);
  return face ? { face: revealed(face) } : null;
}
