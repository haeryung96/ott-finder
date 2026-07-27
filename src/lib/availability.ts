// "어디서 볼 수 있나"를 TMDB + JustWatch 를 합쳐서 확정한다 (순수 함수).
//
// 왜 합치나: TMDB 의 KR 제공처 데이터에 **구멍이 있다.**
// 실제 사례 — 동궁(2026, tv/279323)은 TMDB 에 US/JP/GB 등 80개국 Netflix 정보가 있는데
// KR 만 통째로 비어 있었다. 그래서 넷플릭스로 볼 수 있는 작품이 "시청 정보 없음"으로
// 분류되고 조합 계산에서도 빠졌다. 같은 작품을 JustWatch 는 KR Netflix 로 정확히 답한다.
//
// JustWatch 의 packageId 는 TMDB provider_id 와 동일하므로 provider_id 기준으로
// 합집합을 만들면 된다. TMDB 에만 있는 것, JustWatch 에만 있는 것 모두 살린다.

import type { JwMonetization, JwOffer } from "@/types/justwatch";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

/** provider_id → 표시용 정보 (TMDB 지역 제공처 목록에서 만든다) */
export type ProviderCatalog = Map<
  number,
  { provider_name: string; logo_path: string | null }
>;

const KINDS: JwMonetization[] = ["flatrate", "free", "ads", "rent", "buy"];

/**
 * TMDB 제공처에 JustWatch 오퍼를 합친다.
 *
 * @param base    TMDB 의 해당 지역 제공처 (없을 수 있음)
 * @param offers  JustWatch 오퍼 (없으면 base 를 그대로 반환)
 * @param catalog provider_id → 이름/로고. JustWatch 에만 있는 제공처의 로고를 채우는 데 쓴다.
 */
export function mergeAvailability(
  base: TmdbRegionProviders | undefined,
  offers: JwOffer[] | null | undefined,
  catalog?: ProviderCatalog,
): TmdbRegionProviders | undefined {
  if (!offers || offers.length === 0) return base;

  const merged: TmdbRegionProviders = { ...(base ?? {}) };

  for (const kind of KINDS) {
    const existing = base?.[kind] ?? [];
    const seen = new Set(existing.map((p) => p.provider_id));

    const added: TmdbProvider[] = [];
    for (const offer of offers) {
      if (offer.type !== kind || seen.has(offer.providerId)) continue;
      seen.add(offer.providerId);

      const known = catalog?.get(offer.providerId);
      added.push({
        provider_id: offer.providerId,
        // JustWatch 이름보다 TMDB 카탈로그 이름을 우선 (앱 전체 표기와 일치)
        provider_name: known?.provider_name || offer.providerName,
        logo_path: known?.logo_path ?? null,
      });
    }

    if (existing.length > 0 || added.length > 0) {
      merged[kind] = [...existing, ...added];
    }
  }

  return merged;
}
