"use client";

import { useWatchlist, type WatchlistItem } from "@/hooks/useWatchlist";

/** 포스터 위에 얹는 위시리스트 담기/빼기 하트 토글 */
export function WatchlistButton({ item }: { item: WatchlistItem }) {
  const { items, toggle, isLoaded } = useWatchlist();
  const active =
    isLoaded &&
    items.some((x) => x.id === item.id && x.mediaType === item.mediaType);

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={active}
      aria-label={active ? "위시리스트에서 빼기" : "위시리스트에 담기"}
      title={active ? "위시리스트에서 빼기" : "위시리스트에 담기"}
      className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm shadow-sm backdrop-blur transition ${
        active
          ? "bg-emerald-500 text-white"
          : "bg-black/45 text-white hover:bg-black/70"
      }`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
