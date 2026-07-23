import "server-only";

import type {
  MediaType,
  SearchItemWithProviders,
  TmdbPaginated,
  TmdbProvider,
  TmdbSearchResult,
  TmdbWatchProvidersResponse,
} from "@/types/tmdb";

const BASE_URL = process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";
const LANGUAGE = process.env.TMDB_LANGUAGE ?? "ko-KR";

const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN?.trim();
const API_KEY = process.env.TMDB_API_KEY?.trim();

export class TmdbConfigError extends Error {}

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
 * 검색 결과 각각에 대해 지역 제공처를 병렬로 붙여서 반환.
 * 제공처 조회에 실패한 항목은 providers 없이 그대로 포함.
 */
export async function searchWithProviders(
  query: string,
  region = process.env.TMDB_REGION ?? "KR",
  limit = 20,
): Promise<SearchItemWithProviders[]> {
  const results = await searchMulti(query);
  const top = results.slice(0, limit);
  return Promise.all(
    top.map(async (item) => {
      try {
        const wp = await getWatchProviders(item.media_type as MediaType, item.id);
        return { item, providers: wp.results?.[region] };
      } catch {
        return { item };
      }
    }),
  );
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
