import "server-only";

import { cache } from "react";

import type { JwMonetization, JwOffer } from "@/types/justwatch";
import type { MediaType } from "@/types/tmdb";

// JustWatch 오퍼 조회 (서버 전용) — TMDB 데이터 위에 얹는 **선택적 강화 레이어**.
//
// 왜 필요한가: TMDB 는 "어디서 볼 수 있는지"만 주고 (1) per-title 딥링크와
// (2) 실제 대여/구매 금액은 주지 않는다. v0.2.0 까지는 표준 단가 '추정치'로 대신했는데
// 실측해 보니 오차가 컸다 (인셉션 대여: 추정 ₩2,500 vs 실제 ₩1,320).
//
// ⚠️ 이 엔드포인트는 **비공식·미문서화**다 (introspection 도 막혀 있음).
// 스키마가 바뀌거나 차단되면 조용히 실패할 수 있으므로, 이 모듈은 **어떤 실패에서도
// 예외를 던지지 않고 null 을 반환**한다. 호출부는 null 이면 금액을 아예 표시하지 않고
// (추정치로 메우지 않는다) 링크는 서비스 검색 URL 로 폴백한다.
// → JustWatch 가 죽어도 앱은 살아 있고, 대신 "가격 미상"이 늘어난다.
//
// 편의: JustWatch 의 packageId 는 TMDB provider_id 와 동일하다 (TMDB 가 JustWatch 에서
// provider 데이터를 받아오기 때문). 2026-07-26 에 Netflix(8)/wavve(356)/Watcha(97)/
// TVING(1883)/Disney+(337)/Prime(119)/Netflix Ads(1796) 전부 일치 확인.
// 따라서 별도 매핑 테이블 없이 lib/providers.ts 정의에 그대로 붙는다.

const ENDPOINT = "https://apis.justwatch.com/graphql";
const TIMEOUT_MS = 5000;
const REVALIDATE_SECONDS = 60 * 60 * 6;

export type { JwMonetization, JwOffer };

const SEARCH_QUERY = `
query OttFinderOffers($country: Country!, $language: Language!, $q: String!) {
  popularTitles(country: $country, first: 10, filter: {searchQuery: $q}) {
    edges {
      node {
        objectType
        content(country: $country, language: $language) {
          externalIds { tmdbId }
        }
        offers(country: $country, platform: WEB) {
          monetizationType
          retailPrice(language: $language)
          retailPriceValue
          standardWebURL
          package { clearName packageId }
        }
      }
    }
  }
}`;

const MONETIZATION: Record<string, JwMonetization> = {
  FLATRATE: "flatrate",
  RENT: "rent",
  BUY: "buy",
  FREE: "free",
  ADS: "ads",
};

interface RawOffer {
  monetizationType?: string;
  retailPrice?: string | null;
  retailPriceValue?: number | null;
  standardWebURL?: string | null;
  package?: { clearName?: string; packageId?: number } | null;
}

interface RawNode {
  objectType?: string;
  content?: { externalIds?: { tmdbId?: string | number | null } | null } | null;
  offers?: RawOffer[] | null;
}

/**
 * 같은 (제공처, 시청방식) 조합이 화질별로 여러 번 오므로 하나로 합친다.
 * 금액이 있는 쪽과 더 싼 쪽을 우선하고, 딥링크는 먼저 발견된 것을 유지.
 */
function mergeOffers(offers: JwOffer[]): JwOffer[] {
  const byKey = new Map<string, JwOffer>();
  for (const offer of offers) {
    const key = `${offer.type}:${offer.providerId}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, offer);
      continue;
    }
    const cheaper =
      prev.price === null ||
      (offer.price !== null && offer.price < prev.price);
    byKey.set(key, {
      ...prev,
      price: cheaper ? offer.price : prev.price,
      priceLabel: cheaper ? offer.priceLabel : prev.priceLabel,
      url: prev.url ?? offer.url,
    });
  }
  return [...byKey.values()];
}

async function fetchOffers(
  tmdbId: number,
  mediaType: MediaType,
  title: string,
  region: string,
  language: string,
): Promise<JwOffer[] | null> {
  // JustWatch 에는 TMDB id 로 직접 찾는 쿼리가 없다 (nodeByExternalId 없음).
  // 제목으로 검색한 뒤 externalIds.tmdbId 로 **정확히 대조**해서 고른다 —
  // 문자열 유사도 매칭이 아니므로 동명이작을 잘못 집지 않는다.
  const wantObjectType = mediaType === "movie" ? "MOVIE" : "SHOW";

  let json: { data?: { popularTitles?: { edges?: { node: RawNode }[] } } };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // UA 없이 호출하면 차단될 수 있음
        "User-Agent": "Mozilla/5.0 (compatible; ott-finder/0.3; personal project)",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { country: region, language, q: title },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    json = await res.json();
  } catch {
    // 네트워크 오류·타임아웃·차단 → 폴백
    return null;
  }

  const edges = json?.data?.popularTitles?.edges;
  if (!Array.isArray(edges)) return null; // 스키마 변경 등

  const match = edges.find(
    (e) =>
      e?.node?.objectType === wantObjectType &&
      Number(e?.node?.content?.externalIds?.tmdbId) === tmdbId,
  );
  if (!match) return null; // JustWatch 에 없거나 검색 상위 10건에 안 잡힘

  const offers: JwOffer[] = [];
  for (const raw of match.node.offers ?? []) {
    const type = MONETIZATION[raw.monetizationType ?? ""];
    const providerId = raw.package?.packageId;
    if (!type || typeof providerId !== "number") continue; // CINEMA 등은 무시

    const price =
      typeof raw.retailPriceValue === "number" ? raw.retailPriceValue : null;
    offers.push({
      providerId,
      providerName: raw.package?.clearName ?? "",
      type,
      price,
      priceLabel: raw.retailPrice ?? null,
      url: raw.standardWebURL ?? null,
    });
  }

  return offers.length > 0 ? mergeOffers(offers) : null;
}

/**
 * 작품 하나의 JustWatch 오퍼 목록. 실패하면 **null** (예외를 던지지 않음).
 *
 * React `cache()` 로 감싼 이유: 상세 페이지는 generateMetadata 와 page 에서 각각
 * 한 번씩 로드하는데, POST 요청은 Next 의 fetch 메모이제이션(GET 전용) 대상이 아니라
 * 그대로 두면 페이지뷰당 2번 호출된다.
 */
export const getJustWatchOffers = cache(
  async (
    tmdbId: number,
    mediaType: MediaType,
    title: string,
    region = process.env.TMDB_REGION ?? "KR",
    language = "ko",
  ): Promise<JwOffer[] | null> =>
    fetchOffers(tmdbId, mediaType, title, region, language),
);
