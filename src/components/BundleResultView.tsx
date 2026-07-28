"use client";

import Image from "next/image";
import Link from "next/link";

import { ProviderSource } from "@/components/ProviderSource";
import type { BundleResult, RentPlan } from "@/lib/bundle";
import { tmdbImage } from "@/lib/image";
import { formatKRW } from "@/lib/pricing";

function Poster({
  poster,
  title,
}: {
  poster: string | null;
  title: string;
}) {
  const src = tmdbImage(poster, "w92");
  return (
    <div className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
      {src && (
        <Image src={src} alt={title} fill sizes="36px" className="object-cover" unoptimized />
      )}
    </div>
  );
}

function rentLabel(r: RentPlan): string {
  const kind = r.kind === "rent" ? "대여" : "구매";
  // 실제 가격을 모르면 추정치로 메우지 않고 그대로 알린다
  return r.price !== null ? `${kind} ${formatKRW(r.price)}` : `${kind} · 가격 미상`;
}

/** /api/bundle 결과를 "결정" 카드로 렌더 (순수 표시 컴포넌트) */
export function BundleResultView({ result }: { result: BundleResult }) {
  const {
    recommended,
    coveredBySubscription,
    rentSeparately,
    watchFree,
    unavailable,
  } = result;
  const hasSubs = recommended.services.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 추천 조합 헤드라인 */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          위시리스트 {result.titleCount}편 · 이번 달 가장 싸게 보는 조합
        </p>

        {hasSubs ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold">
              {recommended.services.map((s) => s.name).join(" + ")}
            </span>
            <span className="text-sm text-gray-500">
              월 {formatKRW(recommended.monthlyCost)}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-lg font-bold">구독 없이 대여로 보기가 최선</p>
        )}

        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          구독으로 {recommended.coveredCount}편 커버
          {watchFree.length > 0 && ` · ${watchFree.length}편은 0원`}
          {rentSeparately.length > 0 &&
            ` · ${rentSeparately.length}편은 대여/구매 (약 ${formatKRW(recommended.rentalCost)})`}
        </p>

        <div className="mt-3 flex flex-col gap-1 border-t border-emerald-200/70 pt-3 dark:border-emerald-900">
          {/* 사용자가 실제로 궁금한 값: "이거 보려고 돈을 더 내야 하나?" */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-gray-500">추가 지출</span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatKRW(recommended.additionalCost)}
              {recommended.unknownPriceCount > 0 && (
                <span className="text-base font-semibold"> +α</span>
              )}
            </span>
            {recommended.additionalCost === 0 &&
              recommended.unknownPriceCount === 0 && (
                <span className="text-sm text-gray-500">
                  지금 구독으로 다 볼 수 있어요
                </span>
              )}
          </div>

          {/* 조합 자체의 비용 — 이미 내고 있는 구독료를 포함한 값 */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-400">
              이 조합의 월 비용{recommended.unknownPriceCount > 0 && " (최소)"}
            </span>
            <span className="text-sm font-medium text-gray-500">
              {formatKRW(recommended.totalThisMonth)}
              {recommended.unknownPriceCount > 0 && " +α"}
              {recommended.monthlyCost > 0 &&
                recommended.additionalCost < recommended.totalThisMonth &&
                " · 이미 내고 있는 구독료 포함"}
            </span>
          </div>
        </div>

        {recommended.unknownPriceCount > 0 && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            {recommended.unknownPriceCount}편은 실시간 가격을 못 불러와 총액에서
            빠졌어요. 추정치로 채우지 않았으니 실제 지출은 이보다 큽니다.
          </p>
        )}

        {result.savings > 0 && (
          <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            지금 구독({formatKRW(result.current.totalThisMonth)}) 대비 월{" "}
            {formatKRW(result.savings)} 절약
          </p>
        )}

        {!result.current.coversAll && result.current.services.length > 0 && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            지금 구독 중인 서비스만으론 이 위시리스트를 다 볼 수 없어요.
          </p>
        )}
      </div>

      {/* 구독/해지 액션 제안 */}
      {(result.add.length > 0 || result.drop.length > 0) && (
        <div className="flex flex-col gap-2 text-sm">
          {result.add.length > 0 && (
            <p>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                구독 추가
              </span>{" "}
              {result.add.map((s) => `${s.name} (월 ${formatKRW(s.monthly)})`).join(", ")}
            </p>
          )}
          {result.drop.length > 0 && (
            <p>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                이 목록엔 불필요
              </span>{" "}
              {result.drop.map((s) => s.name).join(", ")} — 이 위시리스트만 보려면
              해지해도 손해가 없어요
            </p>
          )}
        </div>
      )}

      {/* 상세 내역 */}
      <div className="flex flex-col gap-4">
        {coveredBySubscription.length > 0 && (
          <Section
            title={`구독으로 볼 수 있어요 (${coveredBySubscription.length})`}
            showSource
          >
            {coveredBySubscription.map(({ title, via }) => (
              <Row
                key={`${title.mediaType}-${title.id}`}
                poster={title.poster}
                title={title.title}
                right={
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {via
                      .map((slug) => recommended.services.find((s) => s.slug === slug)?.name ?? slug)
                      .join(", ")}
                  </span>
                }
              />
            ))}
          </Section>
        )}

        {watchFree.length > 0 && (
          <Section title={`구독 없이 0원 (${watchFree.length})`} showSource>
            {watchFree.map((t) => (
              <Row
                key={`${t.mediaType}-${t.id}`}
                poster={t.poster}
                title={t.title}
                right={
                  <span className="text-sky-600 dark:text-sky-400">
                    {t.freeKind === "ads" ? "광고 보고 무료" : "무료"}
                    {t.freeProviderNames.length > 0 &&
                      ` · ${t.freeProviderNames.slice(0, 2).join(", ")}`}
                  </span>
                }
              />
            ))}
          </Section>
        )}

        {rentSeparately.length > 0 && (
          <Section title={`따로 대여/구매 (${rentSeparately.length})`}>
            {rentSeparately.map((r) => (
              <Row
                key={`${r.title.mediaType}-${r.title.id}`}
                poster={r.title.poster}
                title={r.title.title}
                right={<span className="text-gray-500">{rentLabel(r)}</span>}
              />
            ))}
          </Section>
        )}

        {unavailable.length > 0 && (
          <Section title={`시청 정보 없음 (${unavailable.length})`}>
            {unavailable.map((t) => (
              <Row
                key={`${t.mediaType}-${t.id}`}
                poster={t.poster}
                title={t.title}
                right={<span className="text-gray-400">국내 제공처 없음</span>}
              />
            ))}
          </Section>
        )}
      </div>

      <p className="text-xs text-gray-400">
        대여·구매가는 JustWatch 실시간 가격이고, 구독 월정액은 표준 요금제 기준이에요.
        &ldquo;이번 달에 위시리스트를 모두 본다&rdquo;는 가정으로 계산합니다.{" "}
        <Link href="/settings" className="underline underline-offset-2">
          내 구독 설정
        </Link>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
  showSource = false,
}: {
  title: string;
  children: React.ReactNode;
  /** 제공처 이름을 노출하는 섹션이면 출처를 표기한다 (약관 요구사항) */
  showSource?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {title}
        {showSource && <ProviderSource />}
      </h3>
      <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </ul>
    </div>
  );
}

function Row({
  poster,
  title,
  right,
}: {
  poster: string | null;
  title: string;
  right: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Poster poster={poster} title={title} />
      <span className="line-clamp-1 flex-1 text-sm">{title}</span>
      <span className="shrink-0 text-xs font-medium">{right}</span>
    </li>
  );
}
