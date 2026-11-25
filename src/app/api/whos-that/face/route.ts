import { guess, hint, reveal } from "@/features/whos-that/server";

/**
 * POST /api/whos-that/face
 *   { id, action: "guess", guess: "taylor swift" }  → { correct, forgiven, face? }
 *   { id, action: "hint" }                           → { category, initials }
 *   { id, action: "reveal" }                         → { face }
 * Answers are checked here so the browser never holds the names in advance.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; action?: unknown; guess?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const result =
    body.action === "guess" ? guess(id, typeof body.guess === "string" ? body.guess : "") : body.action === "hint" ? hint(id) : body.action === "reveal" ? reveal(id) : undefined;
  if (result === undefined) return Response.json({ error: "Unknown action" }, { status: 400 });
  if (result === null) return Response.json({ error: "Unknown face" }, { status: 404 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
