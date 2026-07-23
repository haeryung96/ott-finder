import Link from "next/link";

import { SubscriptionSettings } from "@/components/SubscriptionSettings";

export const metadata = {
  title: "설정 · OTT Finder",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← 검색으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
      </header>

      <SubscriptionSettings />
    </main>
  );
}
