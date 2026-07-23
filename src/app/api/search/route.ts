import { NextRequest } from "next/server";

import { searchMulti, TmdbConfigError } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return Response.json(
      { error: "검색어(q)가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const results = await searchMulti(query);
    return Response.json({ query, results });
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    console.error("[/api/search]", err);
    return Response.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
