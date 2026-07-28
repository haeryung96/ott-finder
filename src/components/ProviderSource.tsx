// 제공처 데이터 출처 표기 (JustWatch).
//
// TMDB 의 watch/providers 데이터는 JustWatch 에서 받아오는 것이라 출처 표기가
// 약관상 필수다. TMDB 측 안내는 앱 한 구석에 한 번이 아니라 **제공처를 표시하는
// 항목마다** 표기할 것을 요구한다(미준수 시 API 접근 회수 가능).
// 그래서 푸터 고지와 별개로, 제공처를 그리는 모든 자리에 이 컴포넌트를 붙인다.
//
// 우리는 TMDB + JustWatch 를 합집합으로 쓰므로(lib/availability.ts) 어느 쪽
// 경로로 왔든 원출처는 JustWatch 로 동일하다.

const HREF = "https://www.justwatch.com/kr";

/**
 * @param compact 카드처럼 좁은 자리에서 쓰는 축약형 (로고 스트립 끝에 붙임)
 */
export function ProviderSource({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <a
        href={HREF}
        target="_blank"
        rel="noopener noreferrer"
        title="제공처 정보 출처: JustWatch"
        className="ml-0.5 shrink-0 text-[10px] leading-none text-gray-400 underline decoration-dotted underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
      >
        JustWatch
      </a>
    );
  }

  return (
    <span className="text-xs font-normal text-gray-400">
      제공처 정보{" "}
      <a
        href={HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
      >
        JustWatch
      </a>
    </span>
  );
}
