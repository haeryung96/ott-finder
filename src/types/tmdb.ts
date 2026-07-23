// TMDB API 응답 타입 (필요한 필드만 정의)

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

/** 검색 결과 + 해당 지역 제공처를 묶은 항목 (서버→클라이언트 전달용) */
export interface SearchItemWithProviders {
  item: TmdbSearchResult;
  providers?: TmdbRegionProviders;
}
