import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Development-only endpoint behind the /whos-that/review page: reads the
 * face list and saves approve/reject decisions back into faces.json.
 * Returns 404 in production builds.
 */

const FILE = path.join(process.cwd(), "src/features/whos-that/faces.json");
const dev = process.env.NODE_ENV === "development";

type Status = "unreviewed" | "approved" | "rejected";

export async function GET() {
  if (!dev) return new Response("Not found", { status: 404 });
  const text = await readFile(FILE, "utf8").catch(() => "[]");
  return new Response(text, { headers: { "Content-Type": "application/json" } });
}

export async function POST(request: Request) {
  if (!dev) return new Response("Not found", { status: 404 });
  const body = (await request.json()) as { updates?: { id: string; status: Status }[] };
  const updates = new Map((body.updates ?? []).filter((u) => ["unreviewed", "approved", "rejected"].includes(u.status)).map((u) => [u.id, u.status]));
  const faces = JSON.parse(await readFile(FILE, "utf8")) as { id: string; status: Status }[];
  for (const f of faces) {
    const s = updates.get(f.id);
    if (s) f.status = s;
  }
  await writeFile(FILE, `${JSON.stringify(faces, null, 1)}\n`);
  return Response.json({ ok: true, updated: updates.size });
}
