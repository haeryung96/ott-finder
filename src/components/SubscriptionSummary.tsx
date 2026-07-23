"use client";

import Link from "next/link";

import { useSubscriptions } from "@/hooks/useSubscriptions";
import { providerBySlug } from "@/lib/providers";

export function SubscriptionSummary() {
  const { slugs, isLoaded } = useSubscriptions();

  // 로드 전에는 자리만 유지 (깜빡임/hydration 불일치 방지)
  if (!isLoaded) {
    return <div className="h-8" aria-hidden />;
  }

  const names = slugs
    .map((s) => providerBySlug(s)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-gray-400">내 구독</span>
      {names.length > 0 ? (
        names.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {name}
          </span>
        ))
      ) : (
        <span className="text-gray-400">아직 없음</span>
      )}
      <Link
        href="/settings"
        className="text-gray-400 underline underline-offset-4 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {names.length > 0 ? "변경" : "추가하기"}
      </Link>
    </div>
  );
}
