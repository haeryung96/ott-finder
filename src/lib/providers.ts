// 한국에서 자주 쓰는 OTT 제공처 정의.
//
// provider_id 는 TMDB 기준이며, 2026-07-23 에 KR 라이브 응답으로 모두 검증됨:
//   GET /watch/providers/movie?watch_region=KR  (Coupang Play 는 tv 목록에만 존재)
// (본 프로젝트의 /api/providers 라우트로도 최신 목록을 확인할 수 있습니다.)

export type ProviderKind = "flatrate" | "rent" | "buy";

export interface ProviderDef {
  /** 앱 내부에서 쓰는 안정적인 슬러그 */
  slug: string;
  /** 화면 표기용 이름 */
  name: string;
  /** TMDB provider_id (검증 필요 항목은 verified:false) */
  tmdbId: number;
  /**
   * 같은 서비스인데 TMDB 가 별도 provider_id 로 내보내는 요금제 변형.
   * 예: "Netflix Standard with Ads"(1796) 는 넷플릭스 구독자면 볼 수 있으므로
   * 8 과 같은 서비스로 취급해야 "바로 보기" 판정이 어긋나지 않는다.
   */
  aliasIds?: number[];
  /** 구독 필터 UI에 노출할 대표 구독형 서비스인지 */
  subscription: boolean;
  /** tmdbId 를 라이브 응답으로 확인했는지 */
  verified: boolean;
}

// 모두 KR 라이브 응답으로 검증됨 (2026-07-23, alias 는 2026-07-26)
export const PROVIDERS: ProviderDef[] = [
  { slug: "netflix", name: "Netflix", tmdbId: 8, aliasIds: [1796], subscription: true, verified: true },
  { slug: "disney-plus", name: "Disney+", tmdbId: 337, subscription: true, verified: true },
  { slug: "prime-video", name: "Amazon Prime Video", tmdbId: 119, subscription: true, verified: true },
  { slug: "watcha", name: "Watcha", tmdbId: 97, subscription: true, verified: true },
  { slug: "wavve", name: "wavve", tmdbId: 356, subscription: true, verified: true },
  { slug: "tving", name: "TVING", tmdbId: 1883, subscription: true, verified: true },
  { slug: "coupang-play", name: "Coupang Play", tmdbId: 1881, subscription: true, verified: true },
  { slug: "apple-tv", name: "Apple TV", tmdbId: 350, subscription: false, verified: true },
  { slug: "google-play", name: "Google Play Movies", tmdbId: 3, subscription: false, verified: true },
];

// 대표 id 와 alias id 를 모두 같은 정의로 해석
const BY_ID = new Map<number, ProviderDef>();
for (const p of PROVIDERS) {
  BY_ID.set(p.tmdbId, p);
  for (const alias of p.aliasIds ?? []) BY_ID.set(alias, p);
}

const BY_SLUG = new Map(PROVIDERS.map((p) => [p.slug, p]));

export function providerById(tmdbId: number): ProviderDef | undefined {
  return BY_ID.get(tmdbId);
}

export function providerBySlug(slug: string): ProviderDef | undefined {
  return BY_SLUG.get(slug);
}

/** 슬러그 하나가 커버하는 모든 TMDB provider_id (대표 + alias) */
export function tmdbIdsForSlug(slug: string): number[] {
  const p = BY_SLUG.get(slug);
  if (!p) return [];
  return [p.tmdbId, ...(p.aliasIds ?? [])];
}

/**
 * 같은 서비스의 요금제 변형을 하나로 합친다.
 * 예: [Netflix(8), Netflix Standard with Ads(1796)] → [Netflix(8)]
 * 카탈로그에 없는 provider 는 id 기준으로만 중복 제거한다.
 */
export function dedupeProviders<T extends { provider_id: number }>(
  list: T[],
): T[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = BY_ID.get(p.provider_id)?.slug ?? `id:${p.provider_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 구독 필터 온보딩에 노출할 대표 구독형 OTT */
export const SUBSCRIPTION_PROVIDERS = PROVIDERS.filter((p) => p.subscription);
