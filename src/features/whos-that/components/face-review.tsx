"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { faceUrl } from "../media.ts";

type Status = "unreviewed" | "approved" | "rejected";
type Face = {
  id: string;
  qid: string;
  name: string;
  aliases: string[];
  category: string;
  korean: boolean;
  image: string;
  credit: { artist: string; license: string; licenseUrl: string; source: string };
  status: Status;
};

const CATEGORY_LABEL: Record<string, string> = {
  athletes: "Athlete",
  singers: "Singer",
  actors: "Actor",
  comedians: "Comedian / TV host",
  public: "Public figure",
};

const STATUS_STYLE: Record<Status, string> = {
  unreviewed: "bg-paper",
  approved: "bg-sports",
  rejected: "bg-casino",
};

/**
 * Grid of every face with its name and photo credit. Approve the ones where
 * the photo clearly shows that person and works as a quiz picture; reject
 * the rest (wrong person, group shot, poor crop, too old to recognise).
 */
export function FaceReview() {
  const [faces, setFaces] = useState<Face[] | null>(null);
  const [filter, setFilter] = useState<"todo" | "all" | Status>("todo");
  const [category, setCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/faces-review")
      .then((r) => r.json())
      .then(setFaces)
      .catch(() => setError("Couldn't load faces.json — run `npm run faces` first."));
  }, []);

  const save = async (updates: { id: string; status: Status }[]) => {
    setFaces((fs) => fs && fs.map((f) => ({ ...f, status: updates.find((u) => u.id === f.id)?.status ?? f.status })));
    const res = await fetch("/api/faces-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) setError("Saving failed — is the dev server running?");
  };

  if (error) return <p className="p-10 text-center font-bold">{error}</p>;
  if (!faces) return <p className="p-10 text-center font-mono">Loading faces…</p>;

  const shown = faces.filter(
    (f) =>
      (filter === "all" || (filter === "todo" ? f.status === "unreviewed" : f.status === filter)) &&
      (category === "all" || (category === "korean" ? f.korean : f.category === category)),
  );
  const count = (s: Status) => faces.filter((f) => f.status === s).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="wide text-3xl font-black uppercase">Review faces</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
        Approve a face only if the photo clearly shows that person and makes a fair quiz picture. Reject wrong people,
        group shots, bad crops or photos too old to recognise. Decisions save straight into{" "}
        <code className="font-mono">src/features/whos-that/faces.json</code>. Only approved faces are played. This page
        only exists while running locally.
      </p>

      <div className="sticky top-16 z-20 mt-5 flex flex-wrap items-center gap-2 border-b-2 border-ink bg-paper/95 py-3 backdrop-blur">
        <span className="font-mono text-xs font-bold">
          ✓ {count("approved")} · ✗ {count("rejected")} · ? {count("unreviewed")} of {faces.length}
        </span>
        {(["todo", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`brut-sm rounded-full px-3 py-1 text-xs font-extrabold ${filter === f ? "bg-faces" : "bg-paper"}`}
          >
            {f === "todo" ? "To review" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="brut-sm rounded-full bg-paper px-3 py-1 text-xs font-bold">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
          <option value="korean">Korean edition</option>
        </select>
        {shown.some((f) => f.status !== "approved") && (
          <button
            type="button"
            onClick={() => save(shown.map((f) => ({ id: f.id, status: "approved" as const })))}
            className="brut-sm press ml-auto rounded-full bg-sports px-3 py-1 text-xs font-extrabold"
          >
            Approve all {shown.length} shown
          </button>
        )}
      </div>

      {shown.length === 0 && <p className="mt-10 text-center font-mono text-sm">Nothing here.</p>}

      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((f) => (
          <motion.li key={f.id} layout className={`brut flex flex-col overflow-hidden rounded-2xl ${STATUS_STYLE[f.status]}`}>
            {/* Same square crop the game uses */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faceUrl(f.image)} alt={f.name} className="aspect-square w-full border-b-2 border-ink object-cover object-top" loading="lazy" />
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="font-display text-sm leading-tight">{f.name}</p>
              <p className="font-mono text-[10px] font-bold">
                {CATEGORY_LABEL[f.category]}
                {f.korean ? " · Korean" : ""}
              </p>
              {f.aliases.length > 0 && (
                <p className="line-clamp-2 font-mono text-[10px] text-ink-soft" title={f.aliases.join(", ")}>
                  Also: {f.aliases.join(", ")}
                </p>
              )}
              <a href={f.credit.source} target="_blank" rel="noreferrer" className="line-clamp-2 font-mono text-[10px] text-ink-soft underline">
                {f.credit.artist} · {f.credit.license}
              </a>
              <div className="mt-auto flex gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => save([{ id: f.id, status: "approved" }])}
                  className={`brut-sm press flex-1 rounded-full py-1 text-xs font-extrabold ${f.status === "approved" ? "bg-ink text-paper" : "bg-sports"}`}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => save([{ id: f.id, status: "rejected" }])}
                  className={`brut-sm press flex-1 rounded-full py-1 text-xs font-extrabold ${f.status === "rejected" ? "bg-ink text-paper" : "bg-casino"}`}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
