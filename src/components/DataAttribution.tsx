// 푸터용 데이터 출처 고지.
//
// TMDB 약관은 정해진 문구를 그대로 쓰도록 요구한다:
//   "This product uses the TMDB API but is not endorsed or certified by TMDB."
// 제공처(watch providers) 데이터의 원출처인 JustWatch 표기는 이것과 별개이며,
// 항목마다 붙여야 한다 → components/ProviderSource.tsx
//
// 즉 이 컴포넌트는 "앱 전체 고지", ProviderSource 는 "항목별 표기"로 역할이 다르다.

export function DataAttribution() {
  return (
    <>
      <p>
        시청 제공처 정보{" "}
        <a
          href="https://www.justwatch.com/kr"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2"
        >
          JustWatch
        </a>{" "}
        · 작품 메타데이터{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2"
        >
          TMDB
        </a>
      </p>
      <p>
        This product uses the TMDB API but is not endorsed or certified by
        TMDB. · 개인 학습용 프로젝트
      </p>
    </>
  );
}
