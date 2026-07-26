// TMDB API 응답 타입 (필요한 필드만 정의)

import type { JwOffer } from "@/types/justwatch";

export type MediaType = "movie" | "tv";

/** /search/multi 결과 항목 */
export interface TmdbSearchResult {
  id: number;
  media_type: MediaType | "person";
  title?: string; // movie
  name?: string; // tv / person
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date?: string; // movie
  first_air_date?: string; // tv
  vote_average?: number;
}

export interface TmdbPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** watch/providers 의 개별 제공처 */
export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

/** 특정 지역(예: KR)의 제공처 묶음 */
export interface TmdbRegionProviders {
  link?: string;
  flatrate?: TmdbProvider[]; // 구독형
  rent?: TmdbProvider[]; // 대여
  buy?: TmdbProvider[]; // 구매
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
}

/** {media}/{id}/watch/providers 응답 */
export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbRegionProviders>;
}

/** 검색 결과 + 해당 지역 제공처 + JustWatch 실측 오퍼 (서버→클라이언트 전달용) */
export interface SearchItemWithProviders {
  item: TmdbSearchResult;
  providers?: TmdbRegionProviders;
  /** 실제 가격·딥링크. 조회 실패 시 null/undefined → 금액을 표시하지 않음 */
  offers?: JwOffer[] | null;
}

// ── 상세 (append_to_response=watch/providers,credits) ────────────────────────

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path: string | null;
  order?: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job?: string;
}

export interface TmdbCredits {
  cast?: TmdbCastMember[];
  crew?: TmdbCrewMember[];
}

interface TmdbDetailCommon {
  id: number;
  overview?: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres?: TmdbGenre[];
  vote_average?: number;
  vote_count?: number;
  homepage?: string;
  credits?: TmdbCredits;
  // append_to_response 키에 슬래시가 들어감
  "watch/providers"?: { results?: Record<string, TmdbRegionProviders> };
}

export interface TmdbMovieDetail extends TmdbDetailCommon {
  title: string;
  original_title?: string;
  release_date?: string;
  runtime?: number | null;
}

export interface TmdbTvDetail extends TmdbDetailCommon {
  name: string;
  original_name?: string;
  first_air_date?: string;
  last_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  status?: string;
  created_by?: { id: number; name: string }[];
}

/**
 * movie/tv 응답 차이를 흡수한 화면용 정규화 타입.
 * (title/name, release_date/first_air_date, runtime/number_of_seasons …)
 */
export interface TitleDetail {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  overview?: string;
  tagline?: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  year: string | null;
  genres: string[];
  voteAverage?: number;
  voteCount?: number;
  /** 영화: "148분" / 시리즈: "3시즌 · 22화" */
  lengthLabel: string | null;
  /** 영화는 감독, 시리즈는 제작자 */
  directors: string[];
  cast: TmdbCastMember[];
  providers?: TmdbRegionProviders;
}
