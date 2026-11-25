import { parseFilters } from "@/features/whos-that/logic";
import { options } from "@/features/whos-that/server";

/** GET /api/whos-that/options?c=singers&region=world&… — pool sizes for each filter choice. */
export async function GET(request: Request) {
  const filters = parseFilters(new URL(request.url).searchParams);
  return Response.json(options(filters), { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
