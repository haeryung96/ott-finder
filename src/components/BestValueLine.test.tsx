// v0.4.2 회귀 테스트 — 하이드레이션 전에 틀린 결론을 렌더하던 버그.
//
// 구독 상태는 localStorage 에 있어서 SSR 이 알 수 없다. 서버는 "구독 없음"으로 렌더하고,
// 검색 결과는 <Suspense> 안이라 React 가 그 경계의 하이드레이션을 뒤로 미룬다.
// 그동안 wavve 로 공짜로 볼 수 있는 작품에 "대여 ₩1,300" 이 떠 있었다.
//
// 그래서 "아직 모름(undefined)" 과 "구독 없음(빈 Set)" 을 구분해야 한다.
// 모르는 동안엔 결론을 내지 않는다.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BestValueLine } from "@/components/BestValueLine";
import { ID, offer, provider } from "@/test/fixtures";

const wavve = provider(ID.wavve, "wavve");
const netflix = provider(ID.netflix, "Netflix");

// wavve 구독으로 공짜인데, 대여도 ₩1,300 에 가능한 작품
const providers = { flatrate: [wavve], rent: [wavve] };
const offers = [offer("rent", ID.wavve, 1300)];

describe("subscribedIds === undefined (아직 모름)", () => {
  it("금액을 말하지 않는다", () => {
    const { container } = render(
      <BestValueLine providers={providers} offers={offers} />,
    );
    expect(container.textContent).not.toMatch(/₩|1,300|대여|구매/);
  });

  it("아무 주장도 하지 않는다 (렌더된 텍스트가 없다)", () => {
    // 특정 문구의 부재가 아니라 "결론을 내지 않았다"는 불변식을 고정한다.
    // 문구만 검사하면 잘못된 결론이 다른 문구로 새어 나와도 통과한다.
    const { container } = render(
      <BestValueLine providers={providers} offers={offers} />,
    );
    expect(container.textContent).toBe("");
  });

  it("자리는 잡아둔다 (하이드레이션 후 레이아웃이 튀지 않게)", () => {
    const { container } = render(
      <BestValueLine providers={providers} offers={offers} />,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});

describe("subscribedIds 가 주어지면 (알고 난 뒤)", () => {
  it("내 구독이면 0원 결론을 낸다", () => {
    render(
      <BestValueLine
        providers={providers}
        subscribedIds={new Set([ID.wavve])}
        offers={offers}
      />,
    );
    expect(screen.getByText(/내 구독으로 무료/)).toBeDefined();
  });

  it("빈 Set 은 '구독 없음'이라는 정보다 — 결론을 낸다", () => {
    // undefined 와 달리 빈 Set 은 확정된 상태이므로 침묵하면 안 된다.
    const { container } = render(
      <BestValueLine
        providers={providers}
        subscribedIds={new Set()}
        offers={offers}
      />,
    );
    expect(container.textContent).toMatch(/대여/);
    expect(container.textContent).toMatch(/₩1,300/);
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("같은 데이터라도 구독 유무에 따라 결론이 뒤집힌다", () => {
    // 이게 이 버그의 핵심 — 구독을 모른 채 계산하면 0원이 ₩1,300 이 된다.
    const known = render(
      <BestValueLine
        providers={providers}
        subscribedIds={new Set([ID.wavve])}
        offers={offers}
      />,
    ).container.textContent;

    const unknown = render(
      <BestValueLine
        providers={providers}
        subscribedIds={new Set()}
        offers={offers}
      />,
    ).container.textContent;

    expect(known).not.toBe(unknown);
    expect(known).toMatch(/무료/);
    expect(unknown).toMatch(/₩1,300/);
  });

  it("볼 수 있는 곳이 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <BestValueLine providers={undefined} subscribedIds={new Set()} />,
    );
    expect(container.textContent).toBe("");
  });

  it("구독 필요 상태를 알린다", () => {
    const { container } = render(
      <BestValueLine
        providers={{ flatrate: [netflix] }}
        subscribedIds={new Set()}
      />,
    );
    expect(container.textContent).toMatch(/구독 시 시청/);
  });
});
