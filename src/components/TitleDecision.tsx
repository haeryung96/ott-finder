"use client";

import Image from "next/image";
import Link from "next/link";

import { ProviderSource } from "@/components/ProviderSource";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { tmdbImage } from "@/lib/image";
import { bestValue, formatKRW, type BestValue } from "@/lib/pricing";
import { minPrice, offerKey, toOfferMap } from "@/lib/offers";
import { dedupeProviders } from "@/lib/providers";
import { watchLink } from "@/lib/watchLink";
import type { JwOffer } from "@/types/justwatch";
import type { TmdbProvider, TmdbRegionProviders } from "@/types/tmdb";

/** 요금제 변형을 합친 제공처 이름 목록 ("Netflix, Netflix Standard with Ads" 방지) */
function names(list: TmdbProvider[]): string {
  return dedupeProviders(list)
    .map((p) => p.provider_name)
    .join(", ");
}

/** 결론 한 줄 + 색상 톤. 금액은 실측가가 있을 때만 붙는다. */
function headline(bv: BestValue): { text: string; sub: string; tone: string } {
  switch (bv.kind) {
    case "subscription-free":
      return {
        text: "지금 바로 볼 수 있어요",
        sub: `구독 중인 ${names(bv.providers)} · 추가비용 0원`,
        tone: "emerald",
      };
    case "free":
      return {
        text: "무료로 볼 수 있어요",
        sub: `${names(bv.providers)} · 구독 없이 0원`,
        tone: "sky",
      };
    case "ads":
      return {
        text: "광고 보고 무료로 볼 수 있어요",
        sub: `${names(bv.providers)} · 구독 없이 0원`,
        tone: "sky",
      };
    case "rent":
      return {
        text: bv.price !== null
          ? `대여가 가장 싸요 · ${formatKRW(bv.price)}`
          : "대여로 볼 수 있어요",
        sub: bv.price !== null
          ? `${names(bv.providers)} · JustWatch 실시간 가격`
          : `${names(bv.providers)} · 실시간 가격을 불러오지 못했어요`,
        tone: "amber",
      };
    case "buy":
      return {
        text: bv.price !== null
          ? `구매가 가장 싸요 · ${formatKRW(bv.price)}`
          : "구매로 볼 수 있어요",
        sub: bv.price !== null
          ? `${names(bv.providers)} · JustWatch 실시간 가격`
          : `${names(bv.providers)} · 실시간 가격을 불러오지 못했어요`,
        tone: "amber",
      };
    case "subscription-needed":
      return {
        text: "구독하면 볼 수 있어요",
        sub: `${names(bv.providers)} — 아직 구독 중이 아니에요`,
        tone: "gray",
      };
    case "unavailable":
      return {
        text: "국내에서 볼 수 있는 곳이 없어요",
        sub: "TMDB 기준 한국(KR) 제공처 정보가 없습니다.",
        tone: "gray",
      };
  }
}

const TONE: Record<string, string> = {
  emerald:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  sky: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
  amber: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  gray: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60",
};

const SECTIONS = [
  { key: "flatrate", label: "구독으로 보기", hint: "월정액에 포함" },
  { key: "free", label: "무료로 보기", hint: "구독 없이 0원" },
  { key: "ads", label: "광고 보고 무료", hint: "구독 없이 0원, 광고 포함" },
  { key: "rent", label: "대여", hint: null },
  { key: "buy", label: "구매", hint: null },
] as const;

export function TitleDecision({
  title,
  providers,
  jwOffers,
}: {
  title: string;
  providers?: TmdbRegionProviders;
  /** JustWatch 실측 오퍼. null 이면 금액 없이 시청 경로만 표시 */
  jwOffers?: JwOffer[] | null;
}) {
  const { tmdbIds, isLoaded, slugs } = useSubscriptions();

  // 하이드레이션 전에는 구독 정보를 모르므로 빈 Set 으로 계산했다가 로드 후 갱신됨
  const bv = bestValue(
    providers,
    isLoaded ? tmdbIds : new Set<number>(),
    jwOffers,
  );
  const { text, sub, tone } = headline(bv);

  const offerMap = toOfferMap(jwOffers);
  const hasAnySection = SECTIONS.some(
    (s) => (providers?.[s.key]?.length ?? 0) > 0,
  );
  const hasPaidPath =
    (providers?.rent?.length ?? 0) > 0 || (providers?.buy?.length ?? 0) > 0;
  const hasRealPrices =
    minPrice(jwOffers, "rent") !== null || minPrice(jwOffers, "buy") !== null;

  return (
    <div className="flex flex-col gap-6">
      {/* 결론 배너 */}
      <div className={`rounded-2xl border p-5 ${TONE[tone]}`}>
        <p className="text-xs font-medium text-gray-500">가장 싸게 보는 법</p>
        <p className="mt-1 text-xl font-bold tracking-tight">{text}</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{sub}</p>

        {isLoaded && slugs.length === 0 && (
          <p className="mt-3 text-sm">
            <Link
              href="/settings"
              className="font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
            >
              구독 중인 OTT를 설정
            </Link>
            하면 더 정확한 결론을 볼 수 있어요.
          </p>
        )}
      </div>

      {/* 제공처 breakdown */}
      {hasAnySection ? (
        <div className="flex flex-col gap-5">
          <h2 className="flex flex-wrap items-baseline gap-2 text-base font-semibold">
            볼 수 있는 곳
            {/* 제공처를 표시하는 항목마다 출처 표기 (약관 요구사항) */}
            <ProviderSource />
          </h2>
          {SECTIONS.map((section) => {
            const list = providers?.[section.key] ?? [];
            if (list.length === 0) return null;
            return (
              <section key={section.key} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {section.label}
                  </h3>
                  {section.hint && (
                    <span className="text-xs text-gray-400">{section.hint}</span>
                  )}
                  {(section.key === "rent" || section.key === "buy") &&
                    minPrice(jwOffers, section.key) !== null && (
                      <span className="text-xs text-gray-400">
                        최저 {formatKRW(minPrice(jwOffers, section.key)!)}
                      </span>
                    )}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {dedupeProviders(list).map((p) => (
                    <ProviderRow
                      key={p.provider_id}
                      provider={p}
                      title={title}
                      tmdbLink={providers?.link}
                      mine={isLoaded && tmdbIds.has(p.provider_id)}
                      offer={offerMap.get(offerKey(section.key, p.provider_id))}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700">
          한국에서 볼 수 있는 곳이 아직 없어요.
        </p>
      )}

      {/* 대여/구매 경로가 실제로 있을 때만 가격 출처 고지 */}
      {hasPaidPath &&
        (hasRealPrices ? (
          <p className="text-xs text-gray-400">
            대여·구매 금액은 JustWatch 실시간 가격이에요. 화질(SD/HD/UHD)에 따라
            다를 수 있어 최저가를 표시합니다.
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            실시간 가격을 불러오지 못했어요. 추정치 대신 금액을 표시하지 않습니다
            — 각 서비스에서 직접 확인해 주세요.
          </p>
        ))}
    </div>
  );
}

function ProviderRow({
  provider,
  title,
  tmdbLink,
  mine,
  offer,
}: {
  provider: TmdbProvider;
  title: string;
  tmdbLink?: string;
  mine: boolean;
  offer?: JwOffer;
}) {
  const logo = tmdbImage(provider.logo_path, "w92");

  // JustWatch 딥링크가 있으면 작품 페이지로 바로, 없으면 서비스 검색 URL 로 폴백
  const link = offer?.url
    ? { href: offer.url, direct: true, deep: true }
    : { ...watchLink(provider.provider_id, title, tmdbLink), deep: false };

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        mine
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 shrink-0 rounded-lg"
        />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800" />
      )}

      <span className="flex-1 text-sm font-medium">
        {provider.provider_name}
        {mine && (
          <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            구독 중
          </span>
        )}
      </span>

      {offer?.priceLabel && (
        <span className="shrink-0 text-sm font-semibold">
          {offer.price !== null ? formatKRW(offer.price) : offer.priceLabel}
        </span>
      )}

      {link.href && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={
            link.deep
              ? `${provider.provider_name}의 "${title}" 페이지로 이동`
              : link.direct
                ? `${provider.provider_name}에서 "${title}" 검색`
                : "TMDB 시청 정보 페이지로 이동"
          }
          className="shrink-0 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {link.deep ? "바로 보기 ↗" : "보러 가기 ↗"}
        </a>
      )}
    </li>
  );
}
