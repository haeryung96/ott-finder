import { bestValue, formatKRW, tierLabel } from "@/lib/pricing";
import { dedupeProviders } from "@/lib/providers";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

/** 요금제 변형을 합친 뒤 최대 max 개까지 표기 */
function names(list: TmdbProvider[], max = 2): string {
  const unique = dedupeProviders(list);
  const shown = unique.slice(0, max).map((p) => p.provider_name);
  const extra = unique.length - shown.length;
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

  if (bv.kind === "free") {
    return (
      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
        무료 시청 · {names(bv.providers)}
      </p>
    );
  }

  if (bv.kind === "ads") {
    return (
      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
        광고 보고 무료 · {names(bv.providers)}
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
