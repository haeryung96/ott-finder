// 구독 조합 최적화 — "이번 달에 위시리스트를 다 보려면 어떤 구독 조합이 가장 싼가?"
//
// 모델: weighted set cover. 국내 구독 서비스가 소수(≤7)라 모든 부분집합(2^n)을
// 완전 탐색해 **정확 최적해**를 구한다(greedy 근사 아님).
//
// 목적 함수(= "이번 달" 총비용):
//   Σ(선택한 구독 월정액)  +  Σ(구독으로 커버 안 되는 작품의 대여/구매 추정치)
// recurring(구독)과 one-time(대여)을 "이번 달에 한 번 다 본다"는 가정으로 비교한다.
// 대여/구매가는 pricing.ts 표준 단가 추정치라 정확값이 아니지만, 구독 월정액은
// 공개·안정적이므로 조합 판단의 근거는 대체로 견고하다.

import subscriptionsData from "@/data/subscriptions.json";
import { estimatePrice } from "@/lib/pricing";
import type { MediaType } from "@/types/tmdb";

export interface SubscriptionCatalogEntry {
  name: string;
  monthly: number;
  tier: string;
}

const CATALOG = subscriptionsData.services as Record<
  string,
  SubscriptionCatalogEntry
>;

/** 조합 계산에 필요한 작품 1건의 정규화된 정보 (제공처는 서버에서 채움) */
export interface BundleTitle {
  id: number;
  mediaType: MediaType;
  title: string;
  poster: string | null;
  isNew: boolean;
  /** 이 작품을 구독형으로 제공하는, 카탈로그에 등록된 서비스 슬러그들 */
  flatrateSlugs: string[];
  canRent: boolean;
  canBuy: boolean;
}

export interface BundleService {
  slug: string;
  name: string;
  monthly: number;
}
export interface CoveredPlan {
  title: BundleTitle;
  /** 추천 조합 안에서 이 작품을 커버하는 서비스 슬러그들 */
  via: string[];
}
export interface RentPlan {
  title: BundleTitle;
  kind: "rent" | "buy";
  estimate: number;
}

interface SubsetEval {
  /** 볼 수 있는 작품을 이 조합으로 '전부' 시청 가능한가 (구독으로만 되는 작품을 못 덮으면 false) */
  feasible: boolean;
  monthlyCost: number;
  rentalCost: number;
  /** feasible 하지 않으면 Infinity (최적화 후보에서 자연히 탈락) */
  total: number;
  covered: CoveredPlan[];
  rent: RentPlan[];
}

/** 국내 어떤 경로로도 볼 수 없는 작품(구독·대여·구매 모두 없음) */
function isTrulyUnavailable(t: BundleTitle): boolean {
  return t.flatrateSlugs.length === 0 && !t.canRent && !t.canBuy;
}

/**
 * 특정 구독 조합(chosen)으로 '볼 수 있는 작품(watchable)'을 전부 볼 때의 비용/커버리지 평가.
 *
 * 핵심: 위시리스트에 담은 작품은 모두 '본다'는 전제다. 따라서 구독으로만 볼 수 있고
 * 대여/구매가 안 되는 작품을 이 조합이 못 덮으면 그 조합은 '실현 불가(feasible=false)'다.
 * ("안 본다"를 비용 0으로 처리하면 아무 구독도 안 하는 게 늘 최저가가 되는 오류가 생김)
 */
function evalSubset(watchable: BundleTitle[], chosen: Set<string>): SubsetEval {
  let monthlyCost = 0;
  for (const slug of chosen) monthlyCost += CATALOG[slug]?.monthly ?? 0;

  const covered: CoveredPlan[] = [];
  const rent: RentPlan[] = [];
  let rentalCost = 0;
  let feasible = true;

  for (const t of watchable) {
    const via = t.flatrateSlugs.filter((s) => chosen.has(s));
    if (via.length > 0) {
      covered.push({ title: t, via });
    } else if (t.canRent) {
      const estimate = estimatePrice("rent", t.isNew);
      rent.push({ title: t, kind: "rent", estimate });
      rentalCost += estimate;
    } else if (t.canBuy) {
      const estimate = estimatePrice("buy", t.isNew);
      rent.push({ title: t, kind: "buy", estimate });
      rentalCost += estimate;
    } else {
      // 구독으로만 볼 수 있는데(=flatrate 있음) 이 조합이 안 덮음 → 실현 불가
      feasible = false;
    }
  }

  return {
    feasible,
    monthlyCost,
    rentalCost,
    total: feasible ? monthlyCost + rentalCost : Infinity,
    covered,
    rent,
  };
}

export interface BundleResult {
  recommended: {
    services: BundleService[];
    monthlyCost: number;
    rentalCost: number;
    totalThisMonth: number;
    coveredCount: number;
  };
  coveredBySubscription: CoveredPlan[];
  rentSeparately: RentPlan[];
  unavailable: BundleTitle[];
  /** 지금 구독 중이지만 이 위시리스트엔 최적 조합에 없는 서비스 (해지 후보) */
  drop: BundleService[];
  /** 최적 조합에 있지만 아직 구독하지 않은 서비스 (구독 후보) */
  add: BundleService[];
  /** 현재 구독 그대로 볼 때의 비교값. coversAll=false 면 현재 구독으론 일부를 못 봄 */
  current: {
    services: BundleService[];
    totalThisMonth: number;
    coversAll: boolean;
  };
  /** 현재 대비 절약액 (current.total - recommended.total). coversAll=false 면 0 */
  savings: number;
  titleCount: number;
}

function toService(slug: string): BundleService {
  const e = CATALOG[slug];
  return { slug, name: e?.name ?? slug, monthly: e?.monthly ?? 0 };
}

/**
 * 위시리스트와 현재 구독을 받아 최적 구독 조합과 결정 근거를 계산.
 * titles 가 비면 null.
 */
export function optimizeBundle(
  titles: BundleTitle[],
  subscribedSlugs: string[],
): BundleResult | null {
  if (titles.length === 0) return null;

  // 국내 어떤 경로로도 볼 수 없는 작품은 최적화 대상에서 분리 (조합과 무관)
  const unavailable = titles.filter(isTrulyUnavailable);
  const watchable = titles.filter((t) => !isTrulyUnavailable(t));

  // 후보 서비스 = 카탈로그에 있고, 볼 수 있는 작품 중 하나라도 구독형으로 제공하는 서비스.
  // (아무 작품도 커버 못 하는 서비스는 조합에 넣어봐야 비용만 늘어 최적해에 절대 안 들어감)
  const relevant = Object.keys(CATALOG).filter((slug) =>
    watchable.some((t) => t.flatrateSlugs.includes(slug)),
  );

  // 모든 부분집합 완전 탐색 (2^relevant, relevant ≤ 7 → 최대 128회).
  // 실현 불가 조합은 total=Infinity 라 자연히 탈락하고,
  // relevant 전체를 고른 조합은 모든 구독형 작품을 덮으므로 항상 실현 가능 → 최적해 존재 보장.
  const n = relevant.length;
  let best: { chosen: string[]; ev: SubsetEval } | null = null;
  for (let mask = 0; mask < 1 << n; mask++) {
    const chosen: string[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) chosen.push(relevant[i]);
    const ev = evalSubset(watchable, new Set(chosen));
    if (
      best === null ||
      ev.total < best.ev.total ||
      // 동점이면: 더 많이 커버 → 그래도 같으면 서비스 수 적은 쪽
      (ev.total === best.ev.total &&
        ev.covered.length > best.ev.covered.length) ||
      (ev.total === best.ev.total &&
        ev.covered.length === best.ev.covered.length &&
        chosen.length < best.chosen.length)
    ) {
      best = { chosen, ev };
    }
  }

  const { chosen, ev } = best!;
  const chosenSet = new Set(chosen);

  const subscribedInCatalog = subscribedSlugs.filter((s) => CATALOG[s]);
  const subscribedSet = new Set(subscribedInCatalog);
  const currentEv = evalSubset(watchable, subscribedSet);
  const currentTotal = currentEv.monthlyCost + currentEv.rentalCost;

  return {
    recommended: {
      services: chosen.map(toService),
      monthlyCost: ev.monthlyCost,
      rentalCost: ev.rentalCost,
      totalThisMonth: ev.total,
      coveredCount: ev.covered.length,
    },
    coveredBySubscription: ev.covered,
    rentSeparately: ev.rent,
    unavailable,
    drop: subscribedInCatalog
      .filter((s) => !chosenSet.has(s))
      .map(toService),
    add: chosen.filter((s) => !subscribedSet.has(s)).map(toService),
    current: {
      services: subscribedInCatalog.map(toService),
      totalThisMonth: currentTotal,
      // 현재 구독만으론 구독전용 작품 일부를 못 볼 수 있음
      coversAll: currentEv.feasible,
    },
    // 절약액은 현재 구독으로도 전부 볼 수 있을 때만 의미가 있음
    savings: currentEv.feasible ? currentTotal - ev.total : 0,
    titleCount: titles.length,
  };
}
