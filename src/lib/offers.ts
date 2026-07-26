// JustWatch 오퍼를 화면에서 쓰기 위한 순수 헬퍼 (클라이언트/서버 공용).
// 조회는 server-only 인 lib/justwatch.ts, 타입은 types/justwatch.ts 참고.

import type { JwMonetization, JwOffer } from "@/types/justwatch";

/** (시청방식, 제공처) 조회 키 */
export function offerKey(type: JwMonetization, providerId: number): string {
  return `${type}:${providerId}`;
}

/** 오퍼 배열을 (시청방식, 제공처) → 오퍼 Map 으로 */
export function toOfferMap(
  offers: JwOffer[] | null | undefined,
): Map<string, JwOffer> {
  const map = new Map<string, JwOffer>();
  for (const o of offers ?? []) map.set(offerKey(o.type, o.providerId), o);
  return map;
}

/** 특정 시청방식의 실제 최저가. 실제 가격 데이터가 없으면 null */
export function minPrice(
  offers: JwOffer[] | null | undefined,
  type: JwMonetization,
): number | null {
  const prices = (offers ?? [])
    .filter((o) => o.type === type && typeof o.price === "number")
    .map((o) => o.price as number);
  return prices.length > 0 ? Math.min(...prices) : null;
}
