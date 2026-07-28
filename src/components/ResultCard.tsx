import Image from "next/image";
import Link from "next/link";

import { BestValueLine } from "@/components/BestValueLine";
import { ProviderStrip } from "@/components/ProviderStrip";
import { WatchlistButton } from "@/components/WatchlistButton";
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
  // 내 구독을 아직 모르면 배지를 달지 않는다. 여기서 단정하면 "바로 보기"여야 할
  // 작품에 "구독"이 붙는다 (구독 정보 없이 계산하면 내 구독이 남의 구독이 된다).
  if (subscribedIds === undefined) return null;

  const flatrate = providers?.flatrate ?? [];
  const mine = flatrate.some((p) => subscribedIds.has(p.provider_id));
  if (mine)
    return {
      label: "바로 보기",
      className: "bg-emerald-500 text-white",
    };
  // 무료 경로를 구독보다 먼저 (bestValue 우선순위와 동일하게 유지)
  if ((providers?.free?.length ?? 0) > 0)
    return { label: "무료", className: "bg-sky-500 text-white" };
  if ((providers?.ads?.length ?? 0) > 0)
    return { label: "광고형 무료", className: "bg-sky-500 text-white" };
  if (flatrate.length > 0)
    return {
      label: "구독",
      className: "bg-gray-900/85 text-white dark:bg-white/90 dark:text-gray-900",
    };
  if ((providers?.rent?.length ?? 0) > 0 || (providers?.buy?.length ?? 0) > 0)
    return { label: "대여·구매", className: "bg-amber-500 text-white" };
  return null;
}

export function ResultCard({
  item,
  providers,
  offers,
  subscribedIds,
}: SearchItemWithProviders & { subscribedIds?: Set<number> }) {
  const poster = tmdbImage(item.poster_path, "w342");
  const y = year(item);
  const pill = statusPill(providers, subscribedIds);
  const href = `/title/${item.media_type}/${item.id}`;

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

        {/* 포스터 전체를 덮는 링크. ♡ 버튼(z-20)보다 아래에 둬서 클릭이 겹치지 않게 함 */}
        <Link
          href={href}
          aria-label={`${title(item)} 상세 보기`}
          className="absolute inset-0 z-10"
        />

        <WatchlistButton
          item={{
            id: item.id,
            mediaType: item.media_type as "movie" | "tv",
            title: title(item),
            poster: item.poster_path,
            releaseDate: item.release_date ?? item.first_air_date,
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-0.5">
          <h3 className="line-clamp-1 text-sm font-semibold" title={title(item)}>
            <Link href={href} className="hover:underline underline-offset-2">
              {title(item)}
            </Link>
          </h3>
          <p className="text-xs text-gray-500">
            {[y, item.media_type === "tv" ? "시리즈" : "영화"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <BestValueLine
          providers={providers}
          subscribedIds={subscribedIds}
          offers={offers}
        />
        <ProviderStrip providers={providers} subscribedIds={subscribedIds} />
      </div>
    </li>
  );
}
