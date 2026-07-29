import { describe, expect, it } from "vitest";

import { optimizeBundle } from "@/lib/bundle";
import { bundleTitle } from "@/test/fixtures";

// data/subscriptions.json 기준 월정액 (테스트가 참조하는 값)
const MONTHLY = {
  netflix: 13500,
  "disney-plus": 9900,
  wavve: 10900,
  tving: 10900,
  watcha: 7900,
} as const;

const slugs = (list: { slug: string }[]) => list.map((s) => s.slug).sort();

describe("optimizeBundle — 기본", () => {
  it("빈 위시리스트는 null", () => {
    expect(optimizeBundle([], [])).toBeNull();
  });

  it("한 서비스가 전부 커버하면 그 하나만 고른다", () => {
    const r = optimizeBundle(
      [
        bundleTitle({ id: 1, flatrateSlugs: ["netflix"] }),
        bundleTitle({ id: 2, flatrateSlugs: ["netflix"] }),
      ],
      [],
    );
    expect(slugs(r!.recommended.services)).toEqual(["netflix"]);
    expect(r!.recommended.monthlyCost).toBe(MONTHLY.netflix);
    expect(r!.recommended.coveredCount).toBe(2);
  });

  it("완전탐색이라 greedy 가 놓치는 최적해를 찾는다", () => {
    // greedy 는 가장 많이 덮는 netflix(2편)를 먼저 잡고 wavve 를 더해 ₩24,400 이 된다.
    // 실제 최적은 watcha + wavve = ₩18,800.
    const r = optimizeBundle(
      [
        bundleTitle({ id: 1, flatrateSlugs: ["netflix", "watcha"] }),
        bundleTitle({ id: 2, flatrateSlugs: ["netflix", "watcha"] }),
        bundleTitle({ id: 3, flatrateSlugs: ["wavve"] }),
      ],
      [],
    );
    expect(slugs(r!.recommended.services)).toEqual(["watcha", "wavve"]);
    expect(r!.recommended.monthlyCost).toBe(MONTHLY.watcha + MONTHLY.wavve);
  });

  it("구독보다 대여가 싸면 구독하지 않는다", () => {
    const r = optimizeBundle(
      [
        bundleTitle({
          id: 1,
          flatrateSlugs: ["netflix"],
          canRent: true,
          rentPrice: 1320,
        }),
      ],
      [],
    );
    expect(r!.recommended.services).toEqual([]);
    expect(r!.recommended.totalThisMonth).toBe(1320);
    expect(r!.rentSeparately).toHaveLength(1);
  });

  it("대여가 안 되는 구독 전용 작품은 반드시 커버한다", () => {
    // "안 본다"를 0원으로 치면 아무것도 구독 안 하는 게 늘 최저가가 되는 오류.
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["netflix"] })],
      [],
    );
    expect(slugs(r!.recommended.services)).toEqual(["netflix"]);
  });
});

describe("optimizeBundle — v0.2.0 회귀: 무료 작품이 조합을 왜곡하지 않는다", () => {
  it("무료 작품은 최적화 대상에서 분리된다", () => {
    // 무료 작품이 flatrate 만 있고 대여/구매가 없으면 feasible=false 가 되어
    // 불필요한 구독을 강제 추천하던 버그.
    const r = optimizeBundle(
      [
        bundleTitle({
          id: 1,
          flatrateSlugs: ["netflix"],
          freeKind: "free",
          freeProviderNames: ["Watcha"],
        }),
      ],
      [],
    );
    expect(r!.recommended.services).toEqual([]);
    expect(r!.recommended.totalThisMonth).toBe(0);
    expect(r!.watchFree).toHaveLength(1);
    expect(r!.coveredBySubscription).toHaveLength(0);
  });

  it("광고형 무료도 마찬가지", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["netflix"], freeKind: "ads" })],
      [],
    );
    expect(r!.recommended.services).toEqual([]);
    expect(r!.watchFree).toHaveLength(1);
  });

  it("어떤 경로도 없는 작품은 unavailable 로 빠지고 비용에 영향이 없다", () => {
    const r = optimizeBundle(
      [
        bundleTitle({ id: 1, flatrateSlugs: ["netflix"] }),
        bundleTitle({ id: 2 }),
      ],
      [],
    );
    expect(r!.unavailable).toHaveLength(1);
    expect(r!.recommended.monthlyCost).toBe(MONTHLY.netflix);
  });
});

describe("optimizeBundle — v0.4.0 회귀: 가격 미상을 추정치로 메우지 않는다", () => {
  it("가격을 모르는 작품은 총액에서 빠지고 따로 보고된다", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, canRent: true, rentPrice: null })],
      [],
    );
    expect(r!.recommended.unknownPriceCount).toBe(1);
    expect(r!.recommended.rentalCost).toBe(0);
    expect(r!.rentSeparately[0].price).toBeNull();
  });

  it("아는 가격만 합산한다", () => {
    const r = optimizeBundle(
      [
        bundleTitle({ id: 1, canRent: true, rentPrice: 1320 }),
        bundleTitle({ id: 2, canRent: true, rentPrice: null }),
      ],
      [],
    );
    expect(r!.recommended.rentalCost).toBe(1320);
    expect(r!.recommended.unknownPriceCount).toBe(1);
  });

  it("대여/구매 중 실제로 싼 쪽을 고른다", () => {
    const r = optimizeBundle(
      [
        bundleTitle({
          id: 1,
          canRent: true,
          rentPrice: 5500,
          canBuy: true,
          buyPrice: 4950,
        }),
      ],
      [],
    );
    expect(r!.rentSeparately[0]).toMatchObject({ kind: "buy", price: 4950 });
  });
});

describe("optimizeBundle — v0.4.1: additionalCost (실제로 더 나가는 돈)", () => {
  it("이미 구독 중인 서비스만 쓰면 추가 지출은 0원이다", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["netflix"] })],
      ["netflix"],
    );
    expect(r!.recommended.totalThisMonth).toBe(MONTHLY.netflix);
    // 조합 비용은 ₩13,500 이지만 이미 내고 있으니 더 나가는 돈은 0
    expect(r!.recommended.additionalCost).toBe(0);
    expect(r!.add).toEqual([]);
  });

  it("추가 지출 = 새로 구독할 월정액 + 대여/구매", () => {
    const r = optimizeBundle(
      [
        bundleTitle({ id: 1, flatrateSlugs: ["netflix"] }),
        bundleTitle({ id: 2, flatrateSlugs: ["disney-plus"] }),
        bundleTitle({ id: 3, canRent: true, rentPrice: 1320 }),
      ],
      ["netflix"],
    );
    expect(slugs(r!.add)).toEqual(["disney-plus"]);
    expect(r!.recommended.additionalCost).toBe(MONTHLY["disney-plus"] + 1320);
    expect(r!.recommended.totalThisMonth).toBe(
      MONTHLY.netflix + MONTHLY["disney-plus"] + 1320,
    );
  });

  it("이 목록에 필요 없는 구독은 해지 후보로 제안한다", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["netflix"] })],
      ["netflix", "tving", "wavve"],
    );
    expect(slugs(r!.drop)).toEqual(["tving", "wavve"]);
  });

  it("현재 구독으로 다 못 보면 coversAll=false", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["disney-plus"] })],
      ["netflix"],
    );
    expect(r!.current.coversAll).toBe(false);
  });

  it("카탈로그에 없는 슬러그는 무시한다", () => {
    const r = optimizeBundle(
      [bundleTitle({ id: 1, flatrateSlugs: ["netflix"] })],
      ["netflix", "존재하지-않는-서비스"],
    );
    expect(r!.current.services.map((s) => s.slug)).toEqual(["netflix"]);
  });
});
