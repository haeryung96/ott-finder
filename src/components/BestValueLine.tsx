import { bestValue, formatKRW } from "@/lib/pricing";
import { dedupeProviders } from "@/lib/providers";
import type { JwOffer } from "@/types/justwatch";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

/** 요금제 변형을 합친 뒤 최대 max 개까지 표기 */
function names(list: TmdbProvider[], max = 2): string {
  const unique = dedupeProviders(list);
  const shown = unique.slice(0, max).map((p) => p.provider_name);
  const extra = unique.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} 외 ${extra}` : shown.join(", ");
}

/**
 * 카드에 표시되는 "가장 싸게 보는 법" 한 줄 결론.
 * 금액은 JustWatch 실측가만 쓰고, 모르면 숫자 없이 경로만 알린다.
 */
export function BestValueLine({
  providers,
  subscribedIds,
  offers,
}: {
  providers?: TmdbRegionProviders;
  subscribedIds?: Set<number>;
  offers?: JwOffer[] | null;
}) {
  const bv = bestValue(providers, subscribedIds ?? new Set(), offers);

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

  // rent / buy — 실측가가 있으면 금액을, 없으면 경로만
  const kindLabel = bv.kind === "rent" ? "대여" : "구매";
  return (
    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
      {bv.price !== null ? (
        <>
          {kindLabel}{" "}
          <span className="font-semibold">{formatKRW(bv.price)}</span>
        </>
      ) : (
        <span title="실시간 가격을 불러오지 못했어요">{kindLabel} 가능</span>
      )}{" "}
      · {names(bv.providers)}
    </p>
  );
}
