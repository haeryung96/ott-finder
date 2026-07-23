"use client";

import { SubscriptionPicker } from "@/components/SubscriptionPicker";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export function SubscriptionSettings() {
  const { slugs, isLoaded, toggle } = useSubscriptions();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">구독 중인 OTT</h2>
        <p className="mt-1 text-sm text-gray-500">
          선택/해제하면 즉시 저장됩니다. (이 기기에만 저장돼요)
        </p>
      </div>

      {isLoaded ? (
        <>
          <SubscriptionPicker selected={slugs} onToggle={toggle} />
          <p className="text-sm text-gray-500">
            {slugs.length > 0
              ? `현재 ${slugs.length}개 선택됨`
              : "선택된 OTT가 없어요."}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      )}
    </div>
  );
}
