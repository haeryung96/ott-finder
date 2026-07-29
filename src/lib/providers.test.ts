import { describe, expect, it } from "vitest";

import {
  dedupeProviders,
  providerById,
  PROVIDERS,
  tmdbIdsForSlug,
} from "@/lib/providers";
import { ID, provider } from "@/test/fixtures";

describe("provider alias — v0.2.0 회귀: 광고형 요금제", () => {
  it("Netflix Standard with Ads(1796)는 netflix 로 해석된다", () => {
    expect(providerById(ID.netflixAds)?.slug).toBe("netflix");
  });

  it("netflix 슬러그는 대표 id 와 alias 를 모두 커버한다", () => {
    expect(tmdbIdsForSlug("netflix").sort()).toEqual(
      [ID.netflix, ID.netflixAds].sort(),
    );
  });

  it("alias 가 없는 서비스는 대표 id 하나만", () => {
    expect(tmdbIdsForSlug("wavve")).toEqual([ID.wavve]);
  });

  it("모르는 슬러그는 빈 배열", () => {
    expect(tmdbIdsForSlug("없는서비스")).toEqual([]);
  });
});

describe("dedupeProviders", () => {
  it("같은 서비스의 요금제 변형을 하나로 합친다", () => {
    const merged = dedupeProviders([
      provider(ID.netflix, "Netflix"),
      provider(ID.netflixAds, "Netflix Standard with Ads"),
    ]);
    expect(merged.map((p) => p.provider_id)).toEqual([ID.netflix]);
  });

  it("먼저 나온 쪽을 남긴다", () => {
    const merged = dedupeProviders([
      provider(ID.netflixAds, "Netflix Standard with Ads"),
      provider(ID.netflix, "Netflix"),
    ]);
    expect(merged.map((p) => p.provider_id)).toEqual([ID.netflixAds]);
  });

  it("카탈로그에 없는 제공처는 id 기준으로만 중복 제거한다", () => {
    const merged = dedupeProviders([
      provider(99999),
      provider(99999),
      provider(88888),
    ]);
    expect(merged.map((p) => p.provider_id)).toEqual([99999, 88888]);
  });

  it("서로 다른 서비스는 합치지 않는다", () => {
    const merged = dedupeProviders([
      provider(ID.netflix),
      provider(ID.wavve),
      provider(ID.watcha),
    ]);
    expect(merged).toHaveLength(3);
  });
});

describe("PROVIDERS 카탈로그", () => {
  it("슬러그가 중복되지 않는다", () => {
    const set = new Set(PROVIDERS.map((p) => p.slug));
    expect(set.size).toBe(PROVIDERS.length);
  });

  it("tmdbId 와 alias 가 서로 겹치지 않는다 (id 하나가 두 서비스로 해석되면 안 됨)", () => {
    const seen = new Set<number>();
    for (const p of PROVIDERS) {
      for (const id of [p.tmdbId, ...(p.aliasIds ?? [])]) {
        expect(seen.has(id), `중복된 provider_id: ${id}`).toBe(false);
        seen.add(id);
      }
    }
  });
});
