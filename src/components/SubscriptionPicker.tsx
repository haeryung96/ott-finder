"use client";

import { SUBSCRIPTION_PROVIDERS } from "@/lib/providers";

export function SubscriptionPicker({
  selected,
  onToggle,
}: {
  selected: string[] | Set<string>;
  onToggle: (slug: string) => void;
}) {
  const has = (slug: string) =>
    selected instanceof Set ? selected.has(slug) : selected.includes(slug);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SUBSCRIPTION_PROVIDERS.map((p) => {
        const active = has(p.slug);
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => onToggle(p.slug)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded border text-center text-[10px] leading-4 ${
                active
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-gray-400"
              }`}
              aria-hidden
            >
              {active ? "✓" : ""}
            </span>
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
