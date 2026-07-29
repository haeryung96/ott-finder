import { describe, expect, it } from "vitest";

import { mergeAvailability, type ProviderCatalog } from "@/lib/availability";
import { ID, offer, provider } from "@/test/fixtures";

const catalog: ProviderCatalog = new Map([
  [ID.netflix, { provider_name: "Netflix", logo_path: "/nf.jpg" }],
  [ID.wavve, { provider_name: "wavve", logo_path: "/wavve.jpg" }],
]);

const ids = (list?: { provider_id: number }[]) =>
  (list ?? []).map((p) => p.provider_id);

describe("mergeAvailability — v0.4.1 회귀: TMDB KR 구멍을 JustWatch 로 메운다", () => {
  it("TMDB 가 KR 을 통째로 비워도 JustWatch 로 제공처를 살린다", () => {
    // 동궁(tv/279323) 사례: TMDB 는 80개국 Netflix 정보가 있는데 KR 만 비어 있었다.
    // 그래서 넷플릭스로 볼 수 있는 작품이 "시청 정보 없음" 이 됐다.
    const merged = mergeAvailability(
      undefined,
      [offer("flatrate", ID.netflix)],
      catalog,
    );
    expect(ids(merged?.flatrate)).toEqual([ID.netflix]);
  });

  it("합집합이다 — TMDB 쪽 제공처를 떨어뜨리지 않는다", () => {
    const merged = mergeAvailability(
      { flatrate: [provider(ID.wavve, "wavve")] },
      [offer("flatrate", ID.netflix)],
      catalog,
    );
    expect(ids(merged?.flatrate).sort()).toEqual([ID.netflix, ID.wavve].sort());
  });

  it("양쪽에 같은 제공처가 있어도 중복되지 않는다", () => {
    const merged = mergeAvailability(
      { flatrate: [provider(ID.netflix, "Netflix")] },
      [offer("flatrate", ID.netflix)],
      catalog,
    );
    expect(ids(merged?.flatrate)).toEqual([ID.netflix]);
  });

  it("JustWatch 로만 확인된 제공처의 이름·로고를 TMDB 카탈로그에서 채운다", () => {
    const merged = mergeAvailability(
      undefined,
      [offer("flatrate", ID.netflix)],
      catalog,
    );
    expect(merged?.flatrate?.[0]).toMatchObject({
      provider_name: "Netflix",
      logo_path: "/nf.jpg",
    });
  });

  it("카탈로그에 없으면 JustWatch 이름을 쓰고 로고는 null", () => {
    const merged = mergeAvailability(
      undefined,
      [offer("flatrate", ID.coupang)],
      catalog,
    );
    expect(merged?.flatrate?.[0]).toMatchObject({
      provider_name: `provider-${ID.coupang}`,
      logo_path: null,
    });
  });

  it("시청방식별로 따로 합친다 (flatrate 오퍼가 rent 로 새지 않는다)", () => {
    const merged = mergeAvailability(
      undefined,
      [offer("flatrate", ID.netflix), offer("rent", ID.wavve, 1320)],
      catalog,
    );
    expect(ids(merged?.flatrate)).toEqual([ID.netflix]);
    expect(ids(merged?.rent)).toEqual([ID.wavve]);
    expect(merged?.buy).toBeUndefined();
  });

  it("오퍼가 없으면 TMDB 데이터를 그대로 돌려준다", () => {
    const base = { flatrate: [provider(ID.wavve)] };
    expect(mergeAvailability(base, null, catalog)).toBe(base);
    expect(mergeAvailability(base, [], catalog)).toBe(base);
  });

  it("양쪽 다 없으면 undefined", () => {
    expect(mergeAvailability(undefined, null, catalog)).toBeUndefined();
  });
});
