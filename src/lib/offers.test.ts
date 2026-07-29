import { describe, expect, it } from "vitest";

import { minPrice, offerKey, toOfferMap } from "@/lib/offers";
import { ID, offer } from "@/test/fixtures";

describe("minPrice", () => {
  it("해당 시청방식의 최저가를 고른다", () => {
    const offers = [
      offer("rent", ID.wavve, 1320),
      offer("rent", ID.googlePlay, 5500),
      offer("buy", ID.googlePlay, 4950),
    ];
    expect(minPrice(offers, "rent")).toBe(1320);
    expect(minPrice(offers, "buy")).toBe(4950);
  });

  it("해당 시청방식이 없으면 null", () => {
    expect(minPrice([offer("rent", ID.wavve, 1320)], "buy")).toBeNull();
  });

  it("오퍼 자체가 없으면 null (JustWatch 실패 폴백)", () => {
    expect(minPrice(null, "rent")).toBeNull();
    expect(minPrice(undefined, "rent")).toBeNull();
    expect(minPrice([], "rent")).toBeNull();
  });

  it("price 가 null 인 오퍼는 무시한다 — 0원으로 착각하면 안 된다", () => {
    expect(minPrice([offer("rent", ID.wavve, null)], "rent")).toBeNull();
    expect(
      minPrice(
        [offer("rent", ID.wavve, null), offer("rent", ID.googlePlay, 5500)],
        "rent",
      ),
    ).toBe(5500);
  });

  it("실제 0원 오퍼는 0 으로 취급한다 (null 과 구분)", () => {
    expect(minPrice([offer("rent", ID.wavve, 0)], "rent")).toBe(0);
  });
});

describe("toOfferMap / offerKey", () => {
  it("(시청방식, 제공처) 로 조회할 수 있다", () => {
    const rent = offer("rent", ID.wavve, 1320);
    const map = toOfferMap([rent, offer("buy", ID.wavve, 4950)]);
    expect(map.get(offerKey("rent", ID.wavve))).toBe(rent);
    expect(map.get(offerKey("buy", ID.wavve))?.price).toBe(4950);
  });

  it("같은 제공처라도 시청방식이 다르면 다른 키다", () => {
    expect(offerKey("rent", ID.wavve)).not.toBe(offerKey("buy", ID.wavve));
  });

  it("오퍼가 없으면 빈 Map", () => {
    expect(toOfferMap(null).size).toBe(0);
    expect(toOfferMap(undefined).size).toBe(0);
  });
});
