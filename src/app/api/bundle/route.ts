import {
  optimizeBundle,
  type BundleResult,
  type BundleTitle,
} from "@/lib/bundle";
import { mergeAvailability } from "@/lib/availability";
import { getJustWatchOffers } from "@/lib/justwatch";
import { minPrice } from "@/lib/offers";
import { providerById } from "@/lib/providers";
import {
  getProviderCatalog,
  getWatchProviders,
  TmdbConfigError,
} from "@/lib/tmdb";
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
    // JustWatch 로만 확인된 제공처의 로고/이름을 채우는 데 쓴다
    const catalog = await getProviderCatalog(region);

    const titles: BundleTitle[] = await Promise.all(
      items.map(async (it) => {
        // 대여/구매가와 딥링크 + TMDB 가 놓친 제공처 보완용 (실패하면 null)
        const [offers, tmdbProviders] = await Promise.all([
          getJustWatchOffers(it.id, it.mediaType, it.title, region).catch(
            () => null,
          ),
          getWatchProviders(it.mediaType, it.id)
            .then((wp) => wp.results?.[region])
            .catch(() => undefined),
        ]);

        // TMDB 의 KR 제공처에는 구멍이 있다. 예: 동궁(2026)은 TMDB KR 이 비어 있어
        // "시청 정보 없음"으로 빠졌지만 JustWatch 는 Netflix 로 제공한다고 답한다.
        const rp = mergeAvailability(tmdbProviders, offers, catalog);

        const flatrateSlugs = [
          ...new Set(
            (rp?.flatrate ?? [])
              .map((p) => providerById(p.provider_id))
              .filter((d) => d?.subscription)
              .map((d) => d!.slug),
          ),
        ];
        const canRent = (rp?.rent?.length ?? 0) > 0;
        const canBuy = (rp?.buy?.length ?? 0) > 0;

        // 0원 경로. 광고 없는 free 를 ads 보다 우선.
        let freeKind: "free" | "ads" | null = null;
        let freeProviderNames: string[] = [];
        const freeList = rp?.free ?? [];
        const adsList = rp?.ads ?? [];
        if (freeList.length > 0) {
          freeKind = "free";
          freeProviderNames = freeList.map((p) => p.provider_name);
        } else if (adsList.length > 0) {
          freeKind = "ads";
          freeProviderNames = adsList.map((p) => p.provider_name);
        }

        return {
          id: it.id,
          mediaType: it.mediaType,
          title: it.title,
          poster: it.poster ?? null,
          flatrateSlugs,
          canRent,
          canBuy,
          rentPrice: minPrice(offers, "rent"),
          buyPrice: minPrice(offers, "buy"),
          freeKind,
          freeProviderNames,
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
