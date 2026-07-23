// 클라이언트/서버 공용 이미지 URL 헬퍼 (server-only 아님)

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "original";

/** 포스터/로고 이미지 URL 조립 */
export function tmdbImage(
  path: string | null | undefined,
  size: TmdbImageSize = "w342",
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
