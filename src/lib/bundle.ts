// 구독 조합 최적화 — "이번 달에 위시리스트를 다 보려면 어떤 구독 조합이 가장 싼가?"
//
// 모델: weighted set cover. 국내 구독 서비스가 소수(≤7)라 모든 부분집합(2^n)을
// 완전 탐색해 **정확 최적해**를 구한다(greedy 근사 아님).
//
// 목적 함수(= "이번 달" 총비용):
//   Σ(선택한 구독 월정액)  +  Σ(구독으로 커버 안 되는 작품의 대여/구매 **실제가**)
// 무료(free)·광고형(ads)으로 볼 수 있는 작품은 어떤 조합에서도 0원이라 최적화 대상에서
// 미리 제외한다 (optimizeBundle 의 watchFree).
// recurring(구독)과 one-time(대여)을 "이번 달에 한 번 다 본다"는 가정으로 비교한다.
//
// v0.4.0: 대여/구매가를 JustWatch 실측가로 바꿨다 (이전엔 표준 단가 추정치).
// 실제 가격을 못 구한 작품은 **비용 계산에서 제외하고 unknownPriceCount 로 따로 보고**한다.
// 추정치로 메우면 총액과 추천 조합이 조용히 틀어지므로, 모르는 건 모른다고 말한다.

import subscriptionsData from "@/data/subscriptions.json";
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
  /** 이 작품을 구독형으로 제공하는, 카탈로그에 등록된 서비스 슬러그들 */
  flatrateSlugs: string[];
  canRent: boolean;
  canBuy: boolean;
  /** JustWatch 실측 대여가(KRW). 모르면 null */
  rentPrice: number | null;
  /** JustWatch 실측 구매가(KRW). 모르면 null */
  buyPrice: number | null;
  /** 구독 없이 0원으로 볼 수 있는 경로 (free=무료, ads=광고형). 없으면 null */
  freeKind: "free" | "ads" | null;
  /** freeKind 가 있을 때 그 무료 제공처 이름들 (표시용) */
  freeProviderNames: string[];
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
  /** JustWatch 실측가. 가격 미상이면 null (총액에 포함되지 않음) */
  price: number | null;
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
  /** 대여/구매는 되는데 실제 가격을 못 구한 작품 수 (총액에서 빠짐) */
  unknownPriceCount: number;
}

/** 대여/구매 중 실제로 더 싼 쪽. 둘 다 모르면 null */
function cheapestPaid(
  t: BundleTitle,
): { kind: "rent" | "buy"; price: number | null } | null {
  const options: { kind: "rent" | "buy"; price: number | null }[] = [];
  if (t.canRent) options.push({ kind: "rent", price: t.rentPrice });
  if (t.canBuy) options.push({ kind: "buy", price: t.buyPrice });
  if (options.length === 0) return null;

  const priced = options.filter((o) => o.price !== null);
  if (priced.length > 0) {
    return priced.reduce((a, b) => (b.price! < a.price! ? b : a));
  }
  // 경로는 있는데 가격을 모름 — 대여를 우선 표기하되 금액은 null
  return options[0];
}

/** 국내 어떤 경로로도 볼 수 없는 작품(무료·구독·대여·구매 모두 없음) */
function isTrulyUnavailable(t: BundleTitle): boolean {
  return (
    t.freeKind === null &&
    t.flatrateSlugs.length === 0 &&
    !t.canRent &&
    !t.canBuy
  );
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
  let unknownPriceCount = 0;
  let feasible = true;

  for (const t of watchable) {
    const via = t.flatrateSlugs.filter((s) => chosen.has(s));
    if (via.length > 0) {
      covered.push({ title: t, via });
      continue;
    }

    const paid = cheapestPaid(t);
    if (paid) {
      rent.push({ title: t, kind: paid.kind, price: paid.price });
      // 가격을 모르는 작품은 총액에 넣지 않는다 (추정치로 메우지 않음)
      if (paid.price !== null) rentalCost += paid.price;
      else unknownPriceCount += 1;
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
    unknownPriceCount,
  };
}

export interface BundleResult {
  recommended: {
    services: BundleService[];
    monthlyCost: number;
    rentalCost: number;
    totalThisMonth: number;
    coveredCount: number;
    /**
     * 총액에 반영되지 못한 '가격 미상' 작품 수.
     * 0 보다 크면 totalThisMonth 는 **하한선**이지 확정 금액이 아니다.
     */
    unknownPriceCount: number;
    /**
     * 지금 내는 돈에 **더해서** 나갈 금액.
     * = 아직 구독 안 한 추천 서비스의 월정액 + 대여/구매 비용.
     *
     * totalThisMonth 는 조합 자체의 비용이라, 이미 구독 중인 서비스만으로 다 볼 수 있어도
     * 그 구독료가 그대로 찍힌다. 사용자가 실제로 궁금한 "이거 보려고 돈을 더 내야 하나?"에는
     * 이 값이 답한다 (이미 구독 중인 것만 쓰면 0).
     */
    additionalCost: number;
  };
  coveredBySubscription: CoveredPlan[];
  rentSeparately: RentPlan[];
  /** 구독 없이 0원으로 볼 수 있어 조합 계산에서 제외된 작품 */
  watchFree: BundleTitle[];
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

  // 최적화 대상에서 분리되는 두 부류 (둘 다 어떤 조합을 골라도 비용이 안 변함):
  //  1) 어떤 경로로도 볼 수 없는 작품
  //  2) 구독 없이 0원으로 볼 수 있는 작품 — 이걸 분리하지 않으면 무료 작품을 커버하려고
  //     불필요한 구독을 추천하거나, 대여도 안 되는 무료 작품에서 feasible=false 가 되어
  //     멀쩡한 조합이 통째로 탈락한다.
  const unavailable = titles.filter(isTrulyUnavailable);
  const watchFree = titles.filter(
    (t) => !isTrulyUnavailable(t) && t.freeKind !== null,
  );
  const watchable = titles.filter(
    (t) => !isTrulyUnavailable(t) && t.freeKind === null,
  );

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

  const addServices = chosen
    .filter((s) => !subscribedSet.has(s))
    .map(toService);

  // 이미 구독 중인 서비스의 월정액은 이 위시리스트와 무관하게 나가는 돈이므로 제외한다.
  const additionalCost =
    addServices.reduce((sum, s) => sum + s.monthly, 0) + ev.rentalCost;

  return {
    recommended: {
      services: chosen.map(toService),
      monthlyCost: ev.monthlyCost,
      rentalCost: ev.rentalCost,
      totalThisMonth: ev.total,
      coveredCount: ev.covered.length,
      unknownPriceCount: ev.unknownPriceCount,
      additionalCost,
    },
    coveredBySubscription: ev.covered,
    rentSeparately: ev.rent,
    watchFree,
    unavailable,
    drop: subscribedInCatalog
      .filter((s) => !chosenSet.has(s))
      .map(toService),
    add: addServices,
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
