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
  /** 구독 필터 UI에 노출할 대표 구독형 서비스인지 */
  subscription: boolean;
  /** tmdbId 를 라이브 응답으로 확인했는지 */
  verified: boolean;
}

// 모두 KR 라이브 응답으로 검증됨 (2026-07-23)
export const PROVIDERS: ProviderDef[] = [
  { slug: "netflix", name: "Netflix", tmdbId: 8, subscription: true, verified: true },
  { slug: "disney-plus", name: "Disney+", tmdbId: 337, subscription: true, verified: true },
  { slug: "prime-video", name: "Amazon Prime Video", tmdbId: 119, subscription: true, verified: true },
  { slug: "watcha", name: "Watcha", tmdbId: 97, subscription: true, verified: true },
  { slug: "wavve", name: "wavve", tmdbId: 356, subscription: true, verified: true },
  { slug: "tving", name: "TVING", tmdbId: 1883, subscription: true, verified: true },
  { slug: "coupang-play", name: "Coupang Play", tmdbId: 1881, subscription: true, verified: true },
  { slug: "apple-tv", name: "Apple TV", tmdbId: 350, subscription: false, verified: true },
  { slug: "google-play", name: "Google Play Movies", tmdbId: 3, subscription: false, verified: true },
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.tmdbId, p]));
const BY_SLUG = new Map(PROVIDERS.map((p) => [p.slug, p]));

export function providerById(tmdbId: number): ProviderDef | undefined {
  return BY_ID.get(tmdbId);
}

export function providerBySlug(slug: string): ProviderDef | undefined {
  return BY_SLUG.get(slug);
}

/** 구독 필터 온보딩에 노출할 대표 구독형 OTT */
export const SUBSCRIPTION_PROVIDERS = PROVIDERS.filter((p) => p.subscription);
