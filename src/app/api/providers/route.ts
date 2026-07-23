import { getRegionProviderList, TmdbConfigError } from "@/lib/tmdb";

// 한국(KR)에서 이용 가능한 TMDB 제공처 목록을 반환.
// providers.ts 의 tmdbId(특히 국내 서비스) 검증 용도.
export async function GET() {
  try {
    const results = await getRegionProviderList("movie", "KR");
    const simplified = results
      .map((p) => ({ id: p.provider_id, name: p.provider_name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return Response.json({ region: "KR", count: simplified.length, providers: simplified });
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    console.error("[/api/providers]", err);
    return Response.json(
      { error: "제공처 목록 조회 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
