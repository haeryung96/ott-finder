// 테스트용 픽스처 빌더.
//
// provider_id 는 실제 TMDB 값을 쓴다 (lib/providers.ts 에서 KR 라이브 응답으로 검증된 값).
// 임의의 숫자를 쓰면 alias 매핑처럼 id 에 의존하는 로직을 테스트하는 의미가 없다.

import type { BundleTitle } from "@/lib/bundle";
import type { JwMonetization, JwOffer } from "@/types/justwatch";
import type { TmdbProvider } from "@/types/tmdb";

export const ID = {
  netflix: 8,
  netflixAds: 1796,
  disney: 337,
  watcha: 97,
  wavve: 356,
  tving: 1883,
  coupang: 1881,
  googlePlay: 3,
} as const;

export function provider(id: number, name = `provider-${id}`): TmdbProvider {
  return { provider_id: id, provider_name: name, logo_path: `/${id}.jpg` };
}

export function offer(
  type: JwMonetization,
  providerId: number,
  price: number | null = null,
): JwOffer {
  return {
    providerId,
    providerName: `provider-${providerId}`,
    type,
    price,
    priceLabel: price === null ? null : `${price.toLocaleString()}₩`,
    url: `https://example.test/${providerId}`,
  };
}

export function bundleTitle(over: Partial<BundleTitle> = {}): BundleTitle {
  return {
    id: 1,
    mediaType: "movie",
    title: "테스트 작품",
    poster: null,
    flatrateSlugs: [],
    canRent: false,
    canBuy: false,
    rentPrice: null,
    buyPrice: null,
    freeKind: null,
    freeProviderNames: [],
    ...over,
  };
}
