import { describe, expect, it } from "vitest";

import { bestValue, formatKRW } from "@/lib/pricing";
import { ID, offer, provider } from "@/test/fixtures";

const netflix = provider(ID.netflix, "Netflix");
const netflixAds = provider(ID.netflixAds, "Netflix Standard with Ads");
const wavve = provider(ID.wavve, "wavve");
const watcha = provider(ID.watcha, "Watcha");
const googlePlay = provider(ID.googlePlay, "Google Play Movies");

const mine = (...ids: number[]) => new Set(ids);
const none = new Set<number>();

describe("bestValue — 우선순위", () => {
  it("내 구독이 있으면 무조건 그게 결론이다 (추가비용 0원)", () => {
    const bv = bestValue(
      { flatrate: [netflix, watcha], rent: [wavve] },
      mine(ID.netflix),
      [offer("rent", ID.wavve, 1320)],
    );
    expect(bv.kind).toBe("subscription-free");
    if (bv.kind !== "subscription-free") return;
    expect(bv.providers.map((p) => p.provider_id)).toEqual([ID.netflix]);
  });

  it("v0.2.0 회귀: free 가 있으면 대여를 추천하지 않는다", () => {
    // 0원으로 볼 수 있는데 "대여 ₩5,500"이 뜨던 버그.
    const bv = bestValue({ free: [watcha], rent: [wavve] }, none, [
      offer("rent", ID.wavve, 5500),
    ]);
    expect(bv.kind).toBe("free");
  });

  it("v0.2.0 회귀: ads 도 대여보다 먼저다", () => {
    const bv = bestValue({ ads: [watcha], rent: [wavve] }, none, [
      offer("rent", ID.wavve, 5500),
    ]);
    expect(bv.kind).toBe("ads");
  });

  it("내 구독은 free 보다도 앞선다 (같은 0원이면 광고 없는 쪽)", () => {
    const bv = bestValue(
      { flatrate: [netflix], free: [watcha] },
      mine(ID.netflix),
    );
    expect(bv.kind).toBe("subscription-free");
  });

  it("v0.2.0 회귀: 광고형 요금제(1796)도 넷플릭스 구독으로 인정한다", () => {
    // Netflix Standard with Ads 가 별도 provider_id 라 구독자가 "구독 필요"를 보던 버그.
    // 구독 슬러그 → id 변환에서 alias 가 함께 들어온다는 전제를 고정한다.
    const bv = bestValue(
      { flatrate: [netflixAds] },
      mine(ID.netflix, ID.netflixAds),
    );
    expect(bv.kind).toBe("subscription-free");
  });

  it("아무 경로도 없으면 unavailable", () => {
    expect(bestValue(undefined, none).kind).toBe("unavailable");
    expect(bestValue({}, none).kind).toBe("unavailable");
  });

  it("구독형만 있고 내 구독이 아니면 subscription-needed", () => {
    const bv = bestValue({ flatrate: [netflix] }, none);
    expect(bv.kind).toBe("subscription-needed");
  });
});

describe("bestValue — v0.4.0 원칙: 실측가만, 모르면 표시하지 않는다", () => {
  it("오퍼가 없으면 경로만 알리고 금액은 null 이다", () => {
    const bv = bestValue({ rent: [wavve] }, none, null);
    expect(bv.kind).toBe("rent");
    if (bv.kind !== "rent") return;
    expect(bv.price).toBeNull();
  });

  it("추정치를 만들어 내지 않는다 — 오퍼에 price 가 없으면 여전히 null", () => {
    const bv = bestValue({ rent: [wavve] }, none, [offer("rent", ID.wavve)]);
    expect(bv.kind).toBe("rent");
    if (bv.kind !== "rent") return;
    expect(bv.price).toBeNull();
  });

  it("제공처에 없는 시청방식의 오퍼는 금액으로 쓰지 않는다", () => {
    // rent 경로가 없는데 rent 오퍼만 들어온 경우 buy 로 답해야 한다.
    const bv = bestValue({ buy: [googlePlay] }, none, [
      offer("rent", ID.wavve, 1000),
      offer("buy", ID.googlePlay, 4950),
    ]);
    expect(bv.kind).toBe("buy");
    if (bv.kind !== "buy") return;
    expect(bv.price).toBe(4950);
  });

  it("여러 제공처가 있으면 최저가를 고른다", () => {
    const bv = bestValue({ rent: [wavve, googlePlay] }, none, [
      offer("rent", ID.wavve, 1320),
      offer("rent", ID.googlePlay, 5500),
    ]);
    expect(bv.kind).toBe("rent");
    if (bv.kind !== "rent") return;
    expect(bv.price).toBe(1320);
  });
});

describe("bestValue — v0.4.0: 대여 vs 구매를 실제로 비교", () => {
  it("구매가 더 싸면 구매를 고른다 (무조건 대여 우선이 아님)", () => {
    const bv = bestValue({ rent: [wavve], buy: [googlePlay] }, none, [
      offer("rent", ID.wavve, 5500),
      offer("buy", ID.googlePlay, 4950),
    ]);
    expect(bv.kind).toBe("buy");
    if (bv.kind !== "buy") return;
    expect(bv.price).toBe(4950);
  });

  it("대여가 더 싸면 대여", () => {
    const bv = bestValue({ rent: [wavve], buy: [googlePlay] }, none, [
      offer("rent", ID.wavve, 1320),
      offer("buy", ID.googlePlay, 4950),
    ]);
    expect(bv.kind).toBe("rent");
    if (bv.kind !== "rent") return;
    expect(bv.price).toBe(1320);
  });

  it("동점이면 대여 (남는 돈이 없는 쪽을 강요하지 않음)", () => {
    const bv = bestValue({ rent: [wavve], buy: [googlePlay] }, none, [
      offer("rent", ID.wavve, 3000),
      offer("buy", ID.googlePlay, 3000),
    ]);
    expect(bv.kind).toBe("rent");
  });

  it("한쪽 금액만 알면 아는 쪽을 쓴다", () => {
    const bv = bestValue({ rent: [wavve], buy: [googlePlay] }, none, [
      offer("buy", ID.googlePlay, 4950),
    ]);
    expect(bv.kind).toBe("buy");
    if (bv.kind !== "buy") return;
    expect(bv.price).toBe(4950);
  });
});

describe("formatKRW", () => {
  it("천 단위 구분자를 넣는다", () => {
    expect(formatKRW(1320)).toBe("₩1,320");
    expect(formatKRW(0)).toBe("₩0");
  });
});
