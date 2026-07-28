import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataAttribution } from "@/components/DataAttribution";
import { TitleDecision } from "@/components/TitleDecision";
import { WatchlistButton } from "@/components/WatchlistButton";
import { mergeAvailability } from "@/lib/availability";
import { tmdbImage } from "@/lib/image";
import { getJustWatchOffers } from "@/lib/justwatch";
import {
  getProviderCatalog,
  getTitleDetail,
  TmdbConfigError,
  TmdbNotFoundError,
} from "@/lib/tmdb";
import type { MediaType, TitleDetail } from "@/types/tmdb";

interface Params {
  params: Promise<{ mediaType: string; id: string }>;
}

/** URL 세그먼트를 검증해 (mediaType, id) 로 변환. 잘못된 값이면 404. */
function parseParams(mediaType: string, id: string): [MediaType, number] {
  if (mediaType !== "movie" && mediaType !== "tv") notFound();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();
  return [mediaType, numericId];
}

type LoadResult =
  | { status: "ok"; detail: TitleDetail }
  | { status: "notFound" }
  | { status: "error"; message: string };

/**
 * TMDB 조회 결과를 값으로 반환한다.
 *
 * 여기서 직접 notFound() 를 부르면 안 된다 — notFound() 는 예외를 던지는 방식으로
 * 동작해서, 호출부의 try/catch 에 잡히면 404 대신 에러 UI 가 200 으로 렌더된다.
 * 판정은 값으로 넘기고 notFound() 는 호출부에서 try/catch 밖에서 부른다.
 */
async function loadDetail(
  mediaType: MediaType,
  id: number,
): Promise<LoadResult> {
  try {
    return { status: "ok", detail: await getTitleDetail(mediaType, id) };
  } catch (err) {
    if (err instanceof TmdbNotFoundError) return { status: "notFound" };
    if (err instanceof TmdbConfigError) {
      return { status: "error", message: err.message };
    }
    console.error("[/title]", err);
    return {
      status: "error",
      message: "작품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mediaType: rawType, id: rawId } = await params;
  const [mediaType, id] = parseParams(rawType, rawId);

  const result = await loadDetail(mediaType, id);
  // 메타데이터 생성 실패로 페이지 전체를 막지 않는다 (404 판정은 페이지 쪽에서)
  if (result.status !== "ok") return { title: "OTT Finder" };
  const detail = result.detail;

  const label = `${detail.title}${detail.year ? ` (${detail.year})` : ""}`;
  const description =
    detail.overview?.slice(0, 150) ??
    `${label} — 국내에서 가장 싸게 보는 방법을 확인하세요.`;
  const image = tmdbImage(detail.backdropPath ?? detail.posterPath, "w500");

  return {
    title: `${label} · 어디서 볼까 — OTT Finder`,
    description,
    openGraph: {
      title: label,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function TitlePage({ params }: Params) {
  const { mediaType: rawType, id: rawId } = await params;
  const [mediaType, id] = parseParams(rawType, rawId);

  const result = await loadDetail(mediaType, id);

  // notFound() 는 예외로 동작하므로 반드시 try/catch 밖에서 호출
  if (result.status === "notFound") notFound();

  if (result.status === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {result.message}
        </p>
      </main>
    );
  }

  const detail = result.detail;

  // TMDB 의 KR 제공처에는 구멍이 있다(동궁 2026: TMDB 는 KR 비어 있고 JustWatch 는 Netflix).
  // JustWatch 오퍼를 합쳐서 "볼 수 있는 곳"을 확정한다.
  const [offers, catalog] = await Promise.all([
    getJustWatchOffers(detail.id, detail.mediaType, detail.title),
    getProviderCatalog(),
  ]);
  const availability = mergeAvailability(detail.providers, offers, catalog);

  const poster = tmdbImage(detail.posterPath, "w342");
  const backdrop = tmdbImage(detail.backdropPath, "w500");

  const facts = [
    detail.year,
    mediaType === "tv" ? "시리즈" : "영화",
    detail.lengthLabel,
    detail.genres.slice(0, 3).join(" · ") || null,
  ].filter(Boolean) as string[];

  return (
    <main className="flex w-full flex-1 flex-col">
      {/* 백드롭 히어로 */}
      {backdrop && (
        <div className="relative h-40 w-full overflow-hidden sm:h-56">
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            priority
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-white/20 dark:from-gray-950 dark:via-gray-950/70 dark:to-gray-950/20" />
        </div>
      )}

      <div
        className={`mx-auto flex w-full max-w-3xl flex-col gap-7 px-5 pb-14 ${
          backdrop ? "-mt-16 sm:-mt-24" : "pt-8"
        }`}
      >
        <Link
          href="/"
          className="w-fit text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← 검색으로 돌아가기
        </Link>

        {/* 헤더: 포스터 + 기본 정보 */}
        <header className="flex gap-5">
          <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm sm:w-36 dark:border-gray-800 dark:bg-gray-900">
            {poster ? (
              <Image
                src={poster}
                alt={detail.title}
                fill
                sizes="(max-width: 640px) 112px, 144px"
                priority
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-400">
                이미지 없음
              </span>
            )}
            <WatchlistButton
              item={{
                id: detail.id,
                mediaType: detail.mediaType,
                title: detail.title,
                poster: detail.posterPath,
                releaseDate: detail.releaseDate,
              }}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 pt-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {detail.title}
            </h1>
            {detail.originalTitle &&
              detail.originalTitle !== detail.title && (
                <p className="text-sm text-gray-500">{detail.originalTitle}</p>
              )}
            <p className="text-sm text-gray-500">{facts.join(" · ")}</p>
            {typeof detail.voteAverage === "number" &&
              detail.voteAverage > 0 && (
                <p className="text-sm text-gray-500">
                  ★ {detail.voteAverage.toFixed(1)}
                  {detail.voteCount ? (
                    <span className="text-gray-400">
                      {" "}
                      ({detail.voteCount.toLocaleString("ko-KR")}명)
                    </span>
                  ) : null}
                </p>
              )}
            {detail.tagline && (
              <p className="text-sm italic text-gray-400">{detail.tagline}</p>
            )}
          </div>
        </header>

        {/* 결론 + 제공처 (내 구독에 따라 달라져 클라이언트에서 계산).
            jwOffers 가 null 이면 금액 없이 시청 경로 + 검색 URL 로 폴백된다. */}
        <TitleDecision
          title={detail.title}
          providers={availability}
          jwOffers={offers}
        />

        {detail.overview && (
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">줄거리</h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {detail.overview}
            </p>
          </section>
        )}

        {(detail.directors.length > 0 || detail.cast.length > 0) && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">
              {mediaType === "tv" ? "제작 · 출연" : "감독 · 출연"}
            </h2>
            {detail.directors.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="text-gray-400">
                  {mediaType === "tv" ? "제작" : "감독"}
                </span>{" "}
                {detail.directors.join(", ")}
              </p>
            )}
            {detail.cast.length > 0 && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                {detail.cast.map((c) => (
                  <li key={c.id}>
                    {c.name}
                    {c.character && (
                      <span className="text-gray-400"> ({c.character})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="border-t border-gray-200 pt-5 text-xs text-gray-400 dark:border-gray-800">
          <p>
            &ldquo;바로 보기&rdquo;는 해당 서비스의 작품 페이지로 직접
            이동합니다. 딥링크를 못 불러온 경우엔 &ldquo;보러 가기&rdquo;(서비스
            검색)로 대체돼요.
          </p>
          <div className="mt-1 flex flex-col gap-1">
            <DataAttribution />
          </div>
        </footer>
      </div>
    </main>
  );
}
