"use client";

import { useCallback, useSyncExternalStore } from "react";

import { providerBySlug } from "@/lib/providers";

const STORAGE_KEY = "ott-finder:subscriptions";
const ONBOARDED_KEY = "ott-finder:onboarded";
const CHANGE_EVENT = "ott-finder:subs-change";

interface Snapshot {
  slugs: string[];
  onboarded: boolean;
}

// SSR/하이드레이션 초기값 (안정적인 참조 유지)
const SERVER_SNAPSHOT: Snapshot = { slugs: [], onboarded: true };

// getSnapshot 은 매 렌더 호출되므로, 원본이 바뀌지 않으면 동일 참조를 반환해야 함
let cachedKey = "";
let cachedSnapshot: Snapshot = SERVER_SNAPSHOT;

function getSnapshot(): Snapshot {
  try {
    const rawSlugs = localStorage.getItem(STORAGE_KEY);
    const rawOnboarded = localStorage.getItem(ONBOARDED_KEY);
    const key = `${rawSlugs ?? ""}|${rawOnboarded ?? ""}`;
    if (key === cachedKey) return cachedSnapshot;

    let slugs: string[] = [];
    if (rawSlugs) {
      const parsed = JSON.parse(rawSlugs);
      slugs = Array.isArray(parsed)
        ? parsed.filter((s) => typeof s === "string")
        : [];
    }
    cachedKey = key;
    cachedSnapshot = { slugs, onboarded: rawOnboarded === "true" };
    return cachedSnapshot;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function write(slugs: string[], onboarded?: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    if (onboarded !== undefined) {
      localStorage.setItem(ONBOARDED_KEY, String(onboarded));
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // 저장 실패는 조용히 무시 (프라이빗 모드 등)
  }
}

// 하이드레이션 완료 여부 (server=false, client=true) — effect 없이 판별
const noopSubscribe = () => () => {};

/**
 * 내가 구독 중인 OTT(슬러그 배열)를 localStorage 로 관리하는 훅.
 * useSyncExternalStore 로 SSR/하이드레이션 불일치 없이 외부 저장소를 구독.
 */
export function useSubscriptions() {
  const { slugs, onboarded } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const isLoaded = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const toggle = useCallback((slug: string) => {
    const current = getSnapshot().slugs;
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    write(next);
  }, []);

  const setAll = useCallback((next: string[]) => {
    write(next);
  }, []);

  const completeOnboarding = useCallback((next: string[]) => {
    write(next, true);
  }, []);

  const tmdbIds = new Set(
    slugs
      .map((s) => providerBySlug(s)?.tmdbId)
      .filter((id): id is number => id !== undefined),
  );

  return {
    slugs,
    tmdbIds,
    isLoaded,
    onboarded,
    toggle,
    setAll,
    completeOnboarding,
  };
}
