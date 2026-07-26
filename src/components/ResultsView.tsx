"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ResultCard } from "@/components/ResultCard";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import type { SearchItemWithProviders } from "@/types/tmdb";

function watchableByMe(
  item: SearchItemWithProviders,
  subscribedIds: Set<number>,
): boolean {
  return (item.providers?.flatrate ?? []).some((p) =>
    subscribedIds.has(p.provider_id),
  );
}

/**
 * 정렬 순위: 내 구독 → 무료 → 광고형 무료 → 구독형 → 대여/구매 → 정보없음.
 * pricing.ts `bestValue()` 의 우선순위와 같은 순서를 유지한다.
 */
function rank(
  item: SearchItemWithProviders,
  subscribedIds: Set<number>,
): number {
  const pv = item.providers;
  if (watchableByMe(item, subscribedIds)) return 0;
  if ((pv?.free?.length ?? 0) > 0) return 1;
  if ((pv?.ads?.length ?? 0) > 0) return 2;
  if ((pv?.flatrate?.length ?? 0) > 0) return 3;
  if ((pv?.rent?.length ?? 0) > 0 || (pv?.buy?.length ?? 0) > 0) return 4;
  return 5;
}

export function ResultsView({
  items,
  query,
}: {
  items: SearchItemWithProviders[];
  query: string;
}) {
  const { tmdbIds, slugs, isLoaded } = useSubscriptions();
  const [onlyMine, setOnlyMine] = useState(false);

  const hasSubscriptions = slugs.length > 0;
  const canFilter = isLoaded && hasSubscriptions;

  const visible = useMemo(() => {
    const list =
      canFilter && onlyMine
        ? items.filter((it) => watchableByMe(it, tmdbIds))
        : items;
    // 안정 정렬로 우선순위 반영
    return [...list].sort((a, b) => rank(a, tmdbIds) - rank(b, tmdbIds));
  }, [items, tmdbIds, canFilter, onlyMine]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            &ldquo;{query}&rdquo;
          </span>{" "}
          검색 결과 {visible.length}건
          {canFilter && onlyMine && items.length !== visible.length && (
            <span className="text-gray-400"> / 전체 {items.length}건</span>
          )}
        </p>

        {canFilter ? (
          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            aria-pressed={onlyMine}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              onlyMine
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {onlyMine ? "✓ 내 구독만 보기" : "내 구독만 보기"}
          </button>
        ) : (
          isLoaded && (
            <Link
              href="/settings"
              className="text-sm text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
            >
              구독 OTT 설정하기
            </Link>
          )
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
          내 구독으로 바로 볼 수 있는 결과가 없어요.
          <br />
          &ldquo;내 구독만 보기&rdquo;를 해제하면 대여·구매 방법도 볼 수 있어요.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map(({ item, providers }) => (
            <ResultCard
              key={`${item.media_type}-${item.id}`}
              item={item}
              providers={providers}
              subscribedIds={isLoaded ? tmdbIds : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
