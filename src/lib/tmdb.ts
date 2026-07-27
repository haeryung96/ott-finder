import "server-only";

import { cache } from "react";

import {
  mergeAvailability,
  type ProviderCatalog,
} from "@/lib/availability";
import { getJustWatchOffers } from "@/lib/justwatch";
import type {
  MediaType,
  SearchItemWithProviders,
  TitleDetail,
  TmdbMovieDetail,
  TmdbPaginated,
  TmdbProvider,
  TmdbSearchResult,
  TmdbTvDetail,
  TmdbWatchProvidersResponse,
} from "@/types/tmdb";

const BASE_URL = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";
const LANGUAGE = process.env.TMDB_LANGUAGE ?? "ko-KR";

const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN?.trim();
const API_KEY = process.env.TMDB_API_KEY?.trim();

export class TmdbConfigError extends Error {}

/** TMDB 가 404 를 준 경우 (없는 id 등) — 호출부에서 notFound() 로 변환 */
export class TmdbNotFoundError extends Error {}

/**
 * TMDB API 호출 (서버 전용).
 * v4 Access Token(Bearer) 우선, 없으면 v3 api_key 쿼리 파라미터로 폴백.
 */
async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  if (!ACCESS_TOKEN && !API_KEY) {
    throw new TmdbConfigError(
      "TMDB 인증 정보가 없습니다. .env.local 에 TMDB_ACCESS_TOKEN 또는 TMDB_API_KEY 를 설정하세요.",
    );
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("language", LANGUAGE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
  } else if (API_KEY) {
    url.searchParams.set("api_key", API_KEY);
  }

  const res = await fetch(url, {
    headers,
    // 제공처/검색 데이터는 자주 바뀌지 않으므로 1시간 캐시
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new TmdbNotFoundError(`TMDB 리소스 없음: ${path}`);
    }
    throw new Error(`TMDB 요청 실패 (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/** 영화 + TV 통합 검색 (인물 결과는 제외) */
export async function searchMulti(
  query: string,
  page = 1,
): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch<TmdbPaginated<TmdbSearchResult>>(
    "/search/multi",
    { query, page, include_adult: "false" },
  );
  return data.results.filter(
    (r) => r.media_type === "movie" || r.media_type === "tv",
  );
}

/** 특정 콘텐츠의 지역별 제공처 */
export async function getWatchProviders(
  mediaType: MediaType,
  id: number,
): Promise<TmdbWatchProvidersResponse> {
  return tmdbFetch<TmdbWatchProvidersResponse>(
    `/${mediaType}/${id}/watch/providers`,
  );
}

/**
 * 검색 결과 각각에 지역 제공처와 JustWatch 실측 오퍼(실제 가격)를 병렬로 붙여 반환.
 *
 * 제공처 조회에 실패한 항목은 providers 없이, JustWatch 조회에 실패한 항목은
 * offers 없이 그대로 포함한다 (offers 가 없으면 화면에서 금액을 표시하지 않는다).
 *
 * 호출량: 항목당 TMDB 1회 + JustWatch 1회. 20건 동시 호출을 실측했을 때
 * JustWatch 는 0.5초 내에 전부 응답했고 레이트 리밋도 걸리지 않았다 (2026-07-26).
 */
export async function searchWithProviders(
  query: string,
  region = process.env.TMDB_REGION ?? "KR",
  limit = 20,
): Promise<SearchItemWithProviders[]> {
  const results = await searchMulti(query);
  const top = results.slice(0, limit);
  const catalog = await getProviderCatalog(region);

  return Promise.all(
    top.map(async (item) => {
      const mediaType = item.media_type as MediaType;
      const title = item.title ?? item.name ?? "";

      const [tmdbProviders, offers] = await Promise.all([
        getWatchProviders(mediaType, item.id)
          .then((wp) => wp.results?.[region])
          .catch(() => undefined),
        title
          ? getJustWatchOffers(item.id, mediaType, title, region)
          : Promise.resolve(null),
      ]);

      // TMDB 의 KR 제공처에는 구멍이 있어서 JustWatch 로 보완한다 (lib/availability.ts)
      const providers = mergeAvailability(tmdbProviders, offers, catalog);
      return { item, providers, offers };
    }),
  );
}

function minutesLabel(min: number): string {
  return min >= 60
    ? `${Math.floor(min / 60)}시간 ${min % 60}분`.replace(" 0분", "")
    : `${min}분`;
}

/**
 * 상세 정보 + 지역 제공처 + 크레딧을 **한 번의 요청**으로 조회해 정규화.
 * append_to_response 로 묶어 movie/tv 각각 1콜만 쓴다.
 */
export async function getTitleDetail(
  mediaType: MediaType,
  id: number,
  region = process.env.TMDB_REGION ?? "KR",
): Promise<TitleDetail> {
  const raw = await tmdbFetch<TmdbMovieDetail | TmdbTvDetail>(
    `/${mediaType}/${id}`,
    { append_to_response: "watch/providers,credits" },
  );

  const isMovie = mediaType === "movie";
  const movie = raw as TmdbMovieDetail;
  const tv = raw as TmdbTvDetail;

  const title = isMovie ? movie.title : tv.name;
  const releaseDate = isMovie ? movie.release_date : tv.first_air_date;

  let lengthLabel: string | null = null;
  if (isMovie) {
    lengthLabel = movie.runtime ? minutesLabel(movie.runtime) : null;
  } else if (tv.number_of_seasons) {
    lengthLabel = tv.number_of_episodes
      ? `시즌 ${tv.number_of_seasons}개 · ${tv.number_of_episodes}화`
      : `시즌 ${tv.number_of_seasons}개`;
  }

  // 영화는 감독, 시리즈는 제작자(created_by)를 같은 자리에 표시
  const directors = isMovie
    ? (raw.credits?.crew ?? [])
        .filter((c) => c.job === "Director")
        .map((c) => c.name)
    : (tv.created_by ?? []).map((c) => c.name);

  return {
    id: raw.id,
    mediaType,
    title: title ?? "제목 없음",
    originalTitle: isMovie ? movie.original_title : tv.original_name,
    overview: raw.overview || undefined,
    tagline: raw.tagline || undefined,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate,
    year: releaseDate ? releaseDate.slice(0, 4) : null,
    genres: (raw.genres ?? []).map((g) => g.name),
    voteAverage: raw.vote_average,
    voteCount: raw.vote_count,
    lengthLabel,
    directors: [...new Set(directors)],
    cast: (raw.credits?.cast ?? []).slice(0, 8),
    providers: raw["watch/providers"]?.results?.[region],
  };
}

/**
 * 특정 지역에서 이용 가능한 전체 제공처 목록.
 * providers.ts 의 provider_id 검증에 사용합니다.
 */
export async function getRegionProviderList(
  mediaType: MediaType,
  region = process.env.TMDB_REGION ?? "KR",
): Promise<TmdbProvider[]> {
  const data = await tmdbFetch<{ results: TmdbProvider[] }>(
    `/watch/providers/${mediaType}`,
    { watch_region: region },
  );
  return data.results;
}

/**
 * provider_id → 이름/로고 카탈로그 (movie + tv 합집합).
 *
 * JustWatch 오퍼에는 로고가 없어서, JustWatch 로만 확인된 제공처를 화면에 그리려면
 * 로고를 여기서 채워야 한다 (mergeAvailability 의 catalog 인자).
 * 목록은 거의 바뀌지 않으므로 요청 단위로 캐시한다.
 */
export const getProviderCatalog = cache(
  async (
    region = process.env.TMDB_REGION ?? "KR",
  ): Promise<ProviderCatalog> => {
    const catalog: ProviderCatalog = new Map();
    const lists = await Promise.all(
      (["movie", "tv"] as MediaType[]).map((mt) =>
        getRegionProviderList(mt, region).catch(() => [] as TmdbProvider[]),
      ),
    );
    for (const list of lists) {
      for (const p of list) {
        if (!catalog.has(p.provider_id)) {
          catalog.set(p.provider_id, {
            provider_name: p.provider_name,
            logo_path: p.logo_path,
          });
        }
      }
    }
    return catalog;
  },
);
