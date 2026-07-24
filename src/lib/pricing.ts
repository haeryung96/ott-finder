// "가장 싸게 보는 법" 계산 (클라이언트/서버 공용, 순수 함수).
//
// 주의: TMDB/무료 API는 per-title 실제 금액을 주지 않는다. 여기서는 한국 VOD 의
// '표준 단가'(신작/구작 tier)를 사용한 추정치이며, 정확한 가격이 아니다.
// 신작/구작은 출시일(release date)로 분류한다.

import pricesData from "@/data/prices.json";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

interface Tier {
  label: string;
  rent: number;
  buy: number;
}

const NEW_WINDOW_MONTHS = pricesData.newWindowMonths;
const TIERS = pricesData.tiers as { new: Tier; catalog: Tier };

/** 출시일 문자열(YYYY-MM-DD)로 신작 여부 판정. 날짜 없으면 구작으로 간주. */
export function isNewRelease(releaseDate?: string, now: Date = new Date()): boolean {
  if (!releaseDate) return false;
  const released = new Date(releaseDate);
  if (Number.isNaN(released.getTime())) return false;
  const months =
    (now.getFullYear() - released.getFullYear()) * 12 +
    (now.getMonth() - released.getMonth());
  return months <= NEW_WINDOW_MONTHS;
}

export function estimatePrice(kind: "rent" | "buy", isNew: boolean): number {
  return TIERS[isNew ? "new" : "catalog"][kind];
}

export function tierLabel(isNew: boolean): string {
  return TIERS[isNew ? "new" : "catalog"].label;
}

export type BestValue =
  | { kind: "subscription-free"; providers: TmdbProvider[] } // 내 구독으로 무료
  | {
      kind: "rent" | "buy";
      providers: TmdbProvider[];
      estimate: number;
      isNew: boolean;
    } // 대여/구매 (표준 단가 추정)
  | { kind: "subscription-needed"; providers: TmdbProvider[] } // 구독 필요(내 구독 아님)
  | { kind: "unavailable" }; // 시청 정보 없음

/**
 * 내 구독을 기준으로 "가장 이득인 시청 방법"을 판정.
 * 우선순위: 내 구독(무료) → 대여(추정) → 구매(추정) → 구독 필요 → 없음
 */
export function bestValue(
  providers: TmdbRegionProviders | undefined,
  subscribedIds: Set<number>,
  isNew: boolean,
): BestValue {
  const flatrate = providers?.flatrate ?? [];
  const mine = flatrate.filter((p) => subscribedIds.has(p.provider_id));
  if (mine.length > 0) return { kind: "subscription-free", providers: mine };

  const rent = providers?.rent ?? [];
  if (rent.length > 0) {
    return {
      kind: "rent",
      providers: rent,
      estimate: estimatePrice("rent", isNew),
      isNew,
    };
  }

  const buy = providers?.buy ?? [];
  if (buy.length > 0) {
    return {
      kind: "buy",
      providers: buy,
      estimate: estimatePrice("buy", isNew),
      isNew,
    };
  }

  if (flatrate.length > 0)
    return { kind: "subscription-needed", providers: flatrate };

  return { kind: "unavailable" };
}

export function formatKRW(won: number): string {
  return `₩${won.toLocaleString("ko-KR")}`;
}
