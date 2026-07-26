// "보러 가기" 링크 계산 (클라이언트/서버 공용, 순수 함수).
//
// 무료 API로는 per-title 딥링크를 얻을 수 없다. TMDB 의 watch/providers 가 주는 link 는
// provider 딥링크가 아니라 themoviedb.org 경유 페이지이고(예:
// https://www.themoviedb.org/movie/27205-inception/watch?locale=KR), 정확한 작품 딥링크는
// JustWatch 파트너 API 영역이다.
//
// 그래서 여기서는 seed 로 관리하는 '서비스 검색 URL'로 보낸다 — 작품 페이지가 아니라
// 그 서비스 안의 검색 결과로 착지한다. 템플릿이 없는 서비스는 TMDB link 로 폴백.

import linksData from "@/data/watch-links.json";
import { providerById } from "@/lib/providers";

interface LinkTemplate {
  url: string;
  verified: boolean;
  note?: string;
}

const TEMPLATES = linksData.templates as Record<string, LinkTemplate>;

export interface WatchLink {
  href: string;
  /** true 면 해당 서비스로 직접, false 면 TMDB 경유 페이지 */
  direct: boolean;
}

/**
 * 제공처 하나에 대한 "보러 가기" 링크.
 * @param tmdbProviderId TMDB provider_id (요금제 변형 alias 도 대표 서비스로 해석됨)
 * @param title 검색어로 쓸 작품 제목
 * @param tmdbLink TMDB watch/providers 의 link (폴백)
 */
export function watchLink(
  tmdbProviderId: number,
  title: string,
  tmdbLink?: string,
): WatchLink | null {
  const slug = providerById(tmdbProviderId)?.slug;
  const template = slug ? TEMPLATES[slug] : undefined;

  if (template) {
    return {
      href: template.url.replace("{q}", encodeURIComponent(title)),
      direct: true,
    };
  }

  return tmdbLink ? { href: tmdbLink, direct: false } : null;
}
