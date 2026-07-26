// JustWatch 오퍼 타입 (클라이언트/서버 공용).
// 조회 자체는 server-only 모듈인 lib/justwatch.ts 가 담당하고, 여기에는 타입만 둔다.
// (server-only 모듈을 클라이언트 컴포넌트에서 import 하면 빌드가 깨지므로 분리)

export type JwMonetization = "flatrate" | "rent" | "buy" | "free" | "ads";

export interface JwOffer {
  /** TMDB provider_id 와 동일한 값 (JustWatch packageId) */
  providerId: number;
  providerName: string;
  type: JwMonetization;
  /** 실제 금액(KRW). 구독형·무료는 null */
  price: number | null;
  /** 표시용 원문 (예: "1,320₩") */
  priceLabel: string | null;
  /** per-title 딥링크 (예: https://www.netflix.com/title/81040344) */
  url: string | null;
}
