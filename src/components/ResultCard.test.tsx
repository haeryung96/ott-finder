// v0.4.2 회귀 테스트 — 상태 배지 쪽.
//
// BestValueLine 과 같은 원인이지만 다른 코드 경로다(`statusPill`).
// 구독을 모른 채 배지를 달면 "바로 보기" 여야 할 작품에 "구독" 이 붙는다.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultCard } from "@/components/ResultCard";
import { ID, offer, provider } from "@/test/fixtures";
import type { SearchItemWithProviders } from "@/types/tmdb";

const wavve = provider(ID.wavve, "wavve");

const item: SearchItemWithProviders["item"] = {
  id: 557,
  media_type: "movie",
  title: "스파이더맨",
  poster_path: "/poster.jpg",
  release_date: "2002-05-03",
};

// wavve 구독으로 볼 수 있고, 대여도 ₩1,300 에 가능한 작품
const props = {
  item,
  providers: { flatrate: [wavve], rent: [wavve] },
  offers: [offer("rent", ID.wavve, 1300)],
};

const badge = (c: HTMLElement) =>
  [...c.querySelectorAll("span")]
    .map((el) => el.textContent?.trim())
    .find((t) => t && ["바로 보기", "구독", "무료", "광고형 무료", "대여·구매"].includes(t));

describe("상태 배지", () => {
  it("구독을 아직 모르면 배지를 달지 않는다", () => {
    const { container } = render(<ResultCard {...props} />);
    expect(badge(container)).toBeUndefined();
  });

  it("내 구독이면 '바로 보기'", () => {
    const { container } = render(
      <ResultCard {...props} subscribedIds={new Set([ID.wavve])} />,
    );
    expect(badge(container)).toBe("바로 보기");
  });

  it("구독 중이 아니면 '구독'", () => {
    const { container } = render(
      <ResultCard {...props} subscribedIds={new Set()} />,
    );
    expect(badge(container)).toBe("구독");
  });

  it("제목과 상세 링크는 구독 정보와 무관하게 항상 렌더된다", () => {
    // 결론을 보류하는 것과 카드 자체를 숨기는 건 다르다.
    const { container } = render(<ResultCard {...props} />);
    expect(container.textContent).toContain("스파이더맨");
    expect(
      container.querySelector('a[href="/title/movie/557"]'),
    ).not.toBeNull();
  });
});

describe("제공처 출처 표기 (약관 요구사항)", () => {
  it("제공처를 그리는 카드마다 JustWatch 링크가 있다", () => {
    const { container } = render(
      <ResultCard {...props} subscribedIds={new Set()} />,
    );
    const link = container.querySelector('a[href*="justwatch.com"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("JustWatch");
  });

  it("제공처가 없으면 출처 표기도 없다", () => {
    const { container } = render(
      <ResultCard item={item} subscribedIds={new Set()} />,
    );
    expect(container.querySelector('a[href*="justwatch.com"]')).toBeNull();
    expect(container.textContent).toContain("시청 정보 없음");
  });
});
