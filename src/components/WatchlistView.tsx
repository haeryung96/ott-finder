"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { BundleResultView } from "@/components/BundleResultView";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { BundleResult } from "@/lib/bundle";
import { tmdbImage } from "@/lib/image";

export function WatchlistView() {
  const { items, isLoaded, remove, clear } = useWatchlist();
  const { slugs } = useSubscriptions();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BundleResult | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            mediaType: it.mediaType,
            title: it.title,
            poster: it.poster,
            releaseDate: it.releaseDate,
          })),
          subscribedSlugs: slugs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "계산에 실패했어요.");
      setResult(data.result as BundleResult | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "계산 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-16 text-center text-sm text-gray-500 dark:border-gray-700">
        <p>위시리스트가 비어 있어요.</p>
        <p className="mt-1">
          검색 결과의 포스터에서 <span className="font-semibold">♡</span> 를 눌러
          보고 싶은 콘텐츠를 담아 보세요.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-emerald-500 px-4 py-2 font-medium text-white"
        >
          콘텐츠 검색하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 위시리스트 썸네일 그리드 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">담은 콘텐츠 {items.length}편</p>
          <button
            type="button"
            onClick={() => {
              clear();
              setResult(null);
            }}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            전체 비우기
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((it) => {
            const src = tmdbImage(it.poster, "w185");
            return (
              <li key={`${it.mediaType}-${it.id}`} className="group relative">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
                  {src && (
                    <Image
                      src={src}
                      alt={it.title}
                      fill
                      sizes="(max-width:640px) 30vw, 120px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      remove(it.id, it.mediaType);
                      setResult(null);
                    }}
                    aria-label={`${it.title} 빼기`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-gray-600 dark:text-gray-400">
                  {it.title}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={calculate}
        disabled={loading}
        className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {loading ? "계산 중…" : "최적 구독 조합 계산하기"}
      </button>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && <BundleResultView result={result} />}
    </div>
  );
}
