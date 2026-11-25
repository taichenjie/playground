import { parseFilters } from "@/features/whos-that/logic";
import { dailyFaces, freeRound, serverPuzzle } from "@/features/whos-that/server";

/**
 * POST /api/whos-that/round
 *   { mode: "daily", day: 12 }                                   today's shared ten
 *   { mode: "free", query: "c=singers&region=korea", seen: [...] } a fresh random ten
 * Returns photo keys only. Daily days more than one away from the server's
 * date are refused, so tomorrow's set can't be peeked at early.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { mode?: string; day?: number; query?: string; seen?: unknown };
  if (body.mode === "daily") {
    const day = Number(body.day);
    if (!Number.isInteger(day) || Math.abs(day - serverPuzzle()) > 1) {
      return Response.json({ error: "That day isn’t available" }, { status: 400 });
    }
    return Response.json({ faces: dailyFaces(day) });
  }
  if (body.mode === "free") {
    const seen = Array.isArray(body.seen) ? body.seen.filter((s): s is string => typeof s === "string").slice(-150) : [];
    return Response.json(freeRound(parseFilters(new URLSearchParams(String(body.query ?? ""))), seen));
  }
  return Response.json({ error: "Unknown mode" }, { status: 400 });
}
