"use client";

import { useState } from "react";

import { SubscriptionPicker } from "@/components/SubscriptionPicker";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export function OnboardingOverlay() {
  const { isLoaded, onboarded, completeOnboarding } = useSubscriptions();
  const [selected, setSelected] = useState<string[]>([]);

  // SSR/로드 전, 또는 이미 온보딩을 마친 경우 표시하지 않음
  if (!isLoaded || onboarded) return null;

  const toggle = (slug: string) =>
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950">
        <h2 className="text-lg font-bold">구독 중인 OTT를 골라주세요</h2>
        <p className="mt-1 text-sm text-gray-500">
          선택한 OTT 기준으로 &ldquo;바로 볼 수 있는지&rdquo;를 알려드려요.
          나중에 설정에서 언제든 바꿀 수 있어요.
        </p>

        <div className="mt-4">
          <SubscriptionPicker selected={selected} onToggle={toggle} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => completeOnboarding([])}
            className="text-sm text-gray-500 underline underline-offset-2"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={() => completeOnboarding(selected)}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            시작하기
            {selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
