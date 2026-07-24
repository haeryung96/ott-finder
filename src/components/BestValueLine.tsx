import { bestValue, formatKRW, tierLabel } from "@/lib/pricing";
import type { TmdbRegionProviders } from "@/types/tmdb";

function names(list: { provider_name: string }[], max = 2): string {
  const shown = list.slice(0, max).map((p) => p.provider_name);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} 외 ${extra}` : shown.join(", ");
}

/** 카드에 표시되는 "가장 싸게 보는 법" 한 줄 결론 */
export function BestValueLine({
  providers,
  subscribedIds,
  isNew,
}: {
  providers?: TmdbRegionProviders;
  subscribedIds?: Set<number>;
  isNew: boolean;
}) {
  const bv = bestValue(providers, subscribedIds ?? new Set(), isNew);

  if (bv.kind === "unavailable") return null;

  if (bv.kind === "subscription-free") {
    return (
      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        내 구독으로 무료 · {names(bv.providers)}
      </p>
    );
  }

  if (bv.kind === "subscription-needed") {
    return (
      <p className="text-xs text-gray-500">
        구독 시 시청 · {names(bv.providers)}
      </p>
    );
  }

  // rent / buy — 표준 단가 기반 추정
  const kindLabel = bv.kind === "rent" ? "대여" : "구매";
  return (
    <p
      className="text-xs font-medium text-gray-700 dark:text-gray-300"
      title={`${tierLabel(bv.isNew)} 표준 단가 기반 추정치입니다. 실제 가격과 다를 수 있어요.`}
    >
      {kindLabel} <span className="font-semibold">{formatKRW(bv.estimate)}</span>
      <span className="font-normal text-gray-400"> 추정</span> ·{" "}
      {names(bv.providers)}
    </p>
  );
}
