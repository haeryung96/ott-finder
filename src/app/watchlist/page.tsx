import Link from "next/link";

import { WatchlistView } from "@/components/WatchlistView";

export const metadata = {
  title: "내 조합 · OTT Finder",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← 검색으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">내 조합</h1>
        <p className="text-sm text-gray-500">
          보고 싶은 콘텐츠를 모아두면, 이번 달 가장 싸게 다 보는 구독 조합을
          계산해 드려요.
        </p>
      </header>

      <WatchlistView />
    </main>
  );
}
