// "가장 싸게 보는 법" 판정 (클라이언트/서버 공용, 순수 함수).
//
// v0.4.0 부터 **추정치를 쓰지 않는다.** 이전에는 한국 VOD 표준 단가 tier(신작/구작)로
// 금액을 추정했는데, 실측해 보니 오차가 컸다 (인셉션 대여 추정 ₩2,500 vs 실제 ₩1,320).
// 의사결정 도구에서 틀린 숫자는 숫자가 없는 것보다 나쁘므로, 이제 JustWatch 실측가만
// 노출하고 **실제 가격을 모르면 금액을 표시하지 않는다** (price: null).
//
// 가격 출처: lib/justwatch.ts (실패 시 null → 금액 없이 "대여 가능"으로만 표시)

import { minPrice } from "@/lib/offers";
import type { JwOffer } from "@/types/justwatch";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

export type BestValue =
  | { kind: "subscription-free"; providers: TmdbProvider[] } // 내 구독으로 무료
  | { kind: "free"; providers: TmdbProvider[] } // 구독 없이 무료
  | { kind: "ads"; providers: TmdbProvider[] } // 광고 보고 무료
  | {
      kind: "rent" | "buy";
      providers: TmdbProvider[];
      /** JustWatch 실측가(KRW). 모르면 null — 이때는 금액을 표시하지 않는다 */
      price: number | null;
    }
  | { kind: "subscription-needed"; providers: TmdbProvider[] } // 구독 필요(내 구독 아님)
  | { kind: "unavailable" }; // 시청 정보 없음

/** 돈을 내지 않고 볼 수 있는 결론인지 (내 구독 포함) */
export function isFreeToWatch(bv: BestValue): boolean {
  return (
    bv.kind === "subscription-free" || bv.kind === "free" || bv.kind === "ads"
  );
}

/**
 * 내 구독을 기준으로 "가장 이득인 시청 방법"을 판정.
 * 우선순위: 내 구독(무료) → 무료 → 광고형 무료 → 대여/구매 → 구독 필요 → 없음
 *
 * 내 구독을 free/ads 보다 앞에 두는 이유: 이미 지불한 구독으로 광고 없이 보는 게
 * 같은 0원이라도 사용자에게 낫다.
 *
 * @param offers JustWatch 실측 오퍼. 없으면(null) 금액 없이 경로만 판정한다.
 */
export function bestValue(
  providers: TmdbRegionProviders | undefined,
  subscribedIds: Set<number>,
  offers?: JwOffer[] | null,
): BestValue {
  const flatrate = providers?.flatrate ?? [];
  const mine = flatrate.filter((p) => subscribedIds.has(p.provider_id));
  if (mine.length > 0) return { kind: "subscription-free", providers: mine };

  // 구독·대여보다 먼저 판정: 0원으로 볼 수 있는데 대여를 추천하면 안 된다.
  const free = providers?.free ?? [];
  if (free.length > 0) return { kind: "free", providers: free };

  const ads = providers?.ads ?? [];
  if (ads.length > 0) return { kind: "ads", providers: ads };

  const rent = providers?.rent ?? [];
  const buy = providers?.buy ?? [];
  const rentPrice = rent.length > 0 ? minPrice(offers, "rent") : null;
  const buyPrice = buy.length > 0 ? minPrice(offers, "buy") : null;

  // 실제 금액을 아는 경우엔 대여/구매 중 정말 싼 쪽을 고른다.
  // (구작은 구매가 대여보다 싼 경우가 실제로 있어서, 무조건 대여 우선은 틀릴 수 있다)
  if (rentPrice !== null && buyPrice !== null) {
    return buyPrice < rentPrice
      ? { kind: "buy", providers: buy, price: buyPrice }
      : { kind: "rent", providers: rent, price: rentPrice };
  }
  if (rentPrice !== null) return { kind: "rent", providers: rent, price: rentPrice };
  if (buyPrice !== null) return { kind: "buy", providers: buy, price: buyPrice };

  // 금액을 모르는 경우: 경로만 알려주고 숫자는 붙이지 않는다.
  if (rent.length > 0) return { kind: "rent", providers: rent, price: null };
  if (buy.length > 0) return { kind: "buy", providers: buy, price: null };

  if (flatrate.length > 0)
    return { kind: "subscription-needed", providers: flatrate };

  return { kind: "unavailable" };
}

export function formatKRW(won: number): string {
  return `₩${won.toLocaleString("ko-KR")}`;
}
