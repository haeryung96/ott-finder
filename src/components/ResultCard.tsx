import Image from "next/image";

import { ProviderStrip } from "@/components/ProviderStrip";
import { tmdbImage } from "@/lib/image";
import type { SearchItemWithProviders } from "@/types/tmdb";

function title(item: SearchItemWithProviders["item"]): string {
  return item.title ?? item.name ?? "제목 없음";
}

function year(item: SearchItemWithProviders["item"]): string | null {
  const date = item.release_date ?? item.first_air_date;
  return date ? date.slice(0, 4) : null;
}

type Pill = { label: string; className: string } | null;

function statusPill(
  providers: SearchItemWithProviders["providers"],
  subscribedIds?: Set<number>,
): Pill {
  const flatrate = providers?.flatrate ?? [];
  const mine = flatrate.some((p) => subscribedIds?.has(p.provider_id));
  if (mine)
    return {
      label: "바로 보기",
      className: "bg-emerald-500 text-white",
    };
  if (flatrate.length > 0)
    return {
      label: "구독",
      className: "bg-gray-900/85 text-white dark:bg-white/90 dark:text-gray-900",
    };
  if ((providers?.free?.length ?? 0) > 0)
    return { label: "무료", className: "bg-sky-500 text-white" };
  if ((providers?.rent?.length ?? 0) > 0 || (providers?.buy?.length ?? 0) > 0)
    return { label: "대여·구매", className: "bg-amber-500 text-white" };
  return null;
}

export function ResultCard({
  item,
  providers,
  subscribedIds,
}: SearchItemWithProviders & { subscribedIds?: Set<number> }) {
  const poster = tmdbImage(item.poster_path, "w342");
  const y = year(item);
  const pill = statusPill(providers, subscribedIds);

  return (
    <li className="group flex flex-col gap-2.5">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
        {poster ? (
          <Image
            src={poster}
            alt={title(item)}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-400">
            이미지 없음
          </span>
        )}

        {pill && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${pill.className}`}
          >
            {pill.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-0.5">
          <h3 className="line-clamp-1 text-sm font-semibold" title={title(item)}>
            {title(item)}
          </h3>
          <p className="text-xs text-gray-500">
            {[y, item.media_type === "tv" ? "시리즈" : "영화"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ProviderStrip providers={providers} subscribedIds={subscribedIds} />
      </div>
    </li>
  );
}
