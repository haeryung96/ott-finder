import { Suspense } from "react";

import { ResultsView } from "@/components/ResultsView";
import { SearchForm } from "@/components/SearchForm";
import { SubscriptionSummary } from "@/components/SubscriptionSummary";
import { searchWithProviders, TmdbConfigError } from "@/lib/tmdb";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-5 py-16 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            어디서 볼 수 있을까?
          </h1>
          <p className="text-base text-gray-500">
            제목을 검색하면 국내에서 볼 수 있는 곳과,
            <br className="hidden sm:block" /> 내 구독으로 바로 볼 수 있는지
            알려드려요.
          </p>
        </div>
        <div className="flex w-full max-w-xl flex-col gap-4">
          <SearchForm size="lg" autoFocus />
          <SubscriptionSummary />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-5 py-6">
      <div className="flex flex-col gap-3">
        <SearchForm defaultValue={query} />
        <SubscriptionSummary />
      </div>

      <Suspense
        key={query}
        fallback={<ResultsSkeleton />}
      >
        <SearchResults query={query} />
      </Suspense>

      <footer className="mt-auto flex flex-col gap-1 pt-8 text-center text-xs text-gray-400">
        <p>대여·구매 가격은 JustWatch 실시간 가격이에요. 못 불러온 경우엔 추정치 대신 금액을 표시하지 않습니다.</p>
        <p>데이터 제공: TMDB / JustWatch · 개인 학습용 프로젝트</p>
      </footer>
    </main>
  );
}

async function SearchResults({ query }: { query: string }) {
  let items;
  try {
    items = await searchWithProviders(query);
  } catch (err) {
    const message =
      err instanceof TmdbConfigError
        ? err.message
        : "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        {message}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700">
        &ldquo;{query}&rdquo; 검색 결과가 없어요. 다른 제목으로 검색해 보세요.
      </p>
    );
  }

  return <ResultsView items={items} query={query} />;
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-2.5">
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}
