import Image from "next/image";

import { tmdbImage } from "@/lib/image";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

const ORDER = ["flatrate", "free", "rent", "buy"] as const;

/** 카드용 컴팩트 제공처 로고 스트립. 내 구독 로고는 앞으로 정렬 + 강조. */
export function ProviderStrip({
  providers,
  subscribedIds,
  max = 5,
}: {
  providers?: TmdbRegionProviders;
  subscribedIds?: Set<number>;
  max?: number;
}) {
  const seen = new Set<number>();
  const all: { p: TmdbProvider; mine: boolean }[] = [];
  for (const key of ORDER) {
    for (const p of providers?.[key] ?? []) {
      if (seen.has(p.provider_id)) continue;
      seen.add(p.provider_id);
      all.push({ p, mine: subscribedIds?.has(p.provider_id) ?? false });
    }
  }

  if (all.length === 0) {
    return <p className="text-xs text-gray-400">시청 정보 없음</p>;
  }

  // 내 구독을 앞으로 (안정 정렬)
  all.sort((a, b) => Number(b.mine) - Number(a.mine));
  const shown = all.slice(0, max);
  const extra = all.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map(({ p, mine }) => {
        const src = tmdbImage(p.logo_path, "w92");
        return src ? (
          <Image
            key={p.provider_id}
            src={src}
            alt={p.provider_name}
            title={mine ? `${p.provider_name} · 내 구독` : p.provider_name}
            width={24}
            height={24}
            unoptimized
            className={`h-6 w-6 rounded-[6px] ${
              mine
                ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-950"
                : "opacity-80"
            }`}
          />
        ) : (
          <span
            key={p.provider_id}
            title={p.provider_name}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800"
          >
            {p.provider_name.slice(0, 4)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="text-[11px] font-medium text-gray-400">+{extra}</span>
      )}
    </div>
  );
}
