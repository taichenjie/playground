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
 * Accepted answers for a face: Wikidata aliases plus listed nicknames, minus
 * one-word aliases that are just part of the full name ("Woods" for Tiger
 * Woods). A surname or first name alone only counts when listed as a nickname.
 */
function answersOf(f: Stored): string[] {
  const full = words(f.name);
  const kept = f.aliases.filter((a) => {
    const w = words(a);
    return !(full.length >= 2 && w.length === 1 && full.includes(w[0]));
  });
  return [...new Set([...kept, ...(NICKNAMES[f.name] ?? [])])];
}

const stored = (allFaces as unknown as Stored[]).map((f) => ({ ...f, aliases: answersOf(f) }));

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
