import {
  optimizeBundle,
  type BundleResult,
  type BundleTitle,
} from "@/lib/bundle";
import { isNewRelease } from "@/lib/pricing";
import { providerById } from "@/lib/providers";
import { getWatchProviders, TmdbConfigError } from "@/lib/tmdb";
import type { MediaType } from "@/types/tmdb";

interface WatchlistItemInput {
  id: number;
  mediaType: MediaType;
  title: string;
  poster: string | null;
  releaseDate?: string;
}

function parseItems(raw: unknown): WatchlistItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is WatchlistItemInput =>
      !!x &&
      typeof x.id === "number" &&
      (x.mediaType === "movie" || x.mediaType === "tv") &&
      typeof x.title === "string",
  );
}

/**
 * POST /api/bundle — 위시리스트 각 작품의 KR 제공처를 서버에서 병렬 조회하고
 * (TMDB 토큰은 서버 전용), 최적 구독 조합을 계산해 반환.
 * body: { items: WatchlistItemInput[], subscribedSlugs: string[] }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const b = body as { items?: unknown; subscribedSlugs?: unknown };
  const items = parseItems(b.items);
  const subscribedSlugs = Array.isArray(b.subscribedSlugs)
    ? b.subscribedSlugs.filter((s): s is string => typeof s === "string")
    : [];

  if (items.length === 0) {
    return Response.json(
      { error: "위시리스트가 비어 있습니다." },
      { status: 400 },
    );
  }

  const region = process.env.TMDB_REGION ?? "KR";

  try {
    const titles: BundleTitle[] = await Promise.all(
      items.map(async (it) => {
        let flatrateSlugs: string[] = [];
        let canRent = false;
        let canBuy = false;

        try {
          const wp = await getWatchProviders(it.mediaType, it.id);
          const rp = wp.results?.[region];
          flatrateSlugs = [
            ...new Set(
              (rp?.flatrate ?? [])
                .map((p) => providerById(p.provider_id))
                .filter((d) => d?.subscription)
                .map((d) => d!.slug),
            ),
          ];
          canRent = (rp?.rent?.length ?? 0) > 0;
          canBuy = (rp?.buy?.length ?? 0) > 0;
        } catch {
          // 개별 제공처 조회 실패 시 해당 작품은 '시청 정보 없음'으로 취급
        }

        return {
          id: it.id,
          mediaType: it.mediaType,
          title: it.title,
          poster: it.poster ?? null,
          isNew: isNewRelease(it.releaseDate),
          flatrateSlugs,
          canRent,
          canBuy,
        };
      }),
    );

    const result: BundleResult | null = optimizeBundle(titles, subscribedSlugs);
    return Response.json({ result });
  } catch (err) {
    if (err instanceof TmdbConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    console.error("[/api/bundle]", err);
    return Response.json(
      { error: "조합 계산 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
