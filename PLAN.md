# OTT Finder — 기획 & 구현 계획

> 한 줄 정의: "이 콘텐츠, **지금 나에게 가장 싸게(또는 공짜로) 보는 방법**은 뭐지?"에 답하는 서비스.
> JustWatch가 *정보 나열*에서 멈춘다면, OTT Finder는 *결정*까지 대신 내려준다.

---

## 1. 문제 & 차별점

기존 서비스(JustWatch, 키노라이츠 등)는 "이 콘텐츠는 넷플릭스/티빙/웨이브에서 볼 수 있어요"까지만 알려주고 **판단은 사용자 몫**으로 남긴다.

OTT Finder의 차별점:

- **① 내 구독 필터** — 내가 구독 중인 OTT 기준으로 "바로 볼 수 있음 / 추가 결제 필요"를 명확히 구분
- **② 최저가 판단** — 구독 중이면 "추가비용 0원", 아니면 대여/구매 최저가를 계산해 **한 줄 결론**으로 제시

→ 검색 도구가 아니라 **의사결정 도구.**

---

## 2. 데이터 소스 (핵심 관건 — 결론: 무료로 해결 가능)

| 데이터 | 소스 | 상태 |
|---|---|---|
| 어느 OTT에 있나 (구독/대여/구매 구분) | **TMDB `watch/providers` API** | ✅ 완전 무료, 한국(KR) 지원 |
| 정확한 대여/구매 금액 (₩) | 어떤 무료 API도 정확히 제공 X | ⚠️ **seed 데이터로 직접 관리** |
| (대안) 딥링크·추가 플랫폼 | Watchmode API | 무료 티어 월 2,500콜 / 국가 3개 |

**전략:** TMDB가 "무엇을 어디서(구독/대여/구매)"를 무료로 다 주고, 우리는 "얼마인지"만 seed 표로 얹는다. 실시간 정확 가격은 MVP 범위에서 제외.

### 주의사항
- TMDB provider 데이터는 **JustWatch 출처 표기 필수**.
- "JustWatch 대체 상업 서비스" 용도는 약관 위반 → **개인 학습·포트폴리오용은 OK**.
- TMDB API 키는 **서버 라우트에 숨기기** (클라이언트 노출 금지).

### TMDB 핵심 엔드포인트
- 검색: `GET /search/multi?query={제목}&language=ko-KR`
- 제공처: `GET /movie/{id}/watch/providers` → `results.KR.{flatrate|rent|buy}`
- 발견: `GET /discover/movie?watch_region=KR&with_watch_monetization_types=flatrate|rent|buy`

---

## 3. 한국 OTT 대여/구매 가격 seed (예시 — 실제 값은 확인 후 갱신)

| 플랫폼 | 신작 대여 | 구작 대여 | 비고 |
|---|---|---|---|
| Google Play / TV | ₩5,500 | ₩1,000~2,500 | HD/SD 차이 있음 |
| 네이버 시리즈온 | ₩5,500 | ₩1,000~2,500 | |
| Apple TV | ₩5,500 | ₩1,900~ | |
| (구독형: 넷플릭스/티빙/웨이브/디즈니+/쿠팡플레이) | — | — | 구독 중이면 추가비용 0원 |

> seed 데이터는 `data/prices.json`으로 관리하고 TMDB의 `rent`/`buy` provider id에 매핑.

---

## 4. 구현 계획 (단계별)

### Phase 0 — 검색 + 제공처 표시 (~1주)
- TMDB 검색 → 상세 → `watch/providers?region=KR` → 제공처 로고 리스트
- *여기까지가 JustWatch 클론 (기준선)*

### Phase 1 — 내 구독 필터 (차별점 ①)
- 온보딩에서 구독 중인 OTT 체크 → `localStorage` 저장 (로그인 불필요)
- 검색 결과에서 내 구독 OTT = 초록 배지 "바로 볼 수 있음", 나머지는 흐리게

### Phase 2 — 최저가 판단 (차별점 ②)
- 구독형에 있으면 → "구독 중, 추가비용 0원"
- 없으면 → seed 가격표와 비교해 **"가장 싸게 보는 법" 한 줄 결론** 표시

### Phase 3 — 다듬기
- 반응형 UI, 결과 정렬(무료 우선), 콘텐츠 없을 때 안내, 에러 처리

---

## 5. 향후 확장 아이디어 (차별화 심화)

1. **구독 조합 최적화** ⭐ (추천 메인) — 위시리스트 넣으면 "이 10편 보려면 티빙+웨이브면 8편 커버, 디즈니+ 해지 추천" 같은 조합 추천
2. **"이번 달 얼마 아꼈나" 대시보드** — 구독료 대비 실제 시청 → 구독 정리 제안
3. **워치리스트 알림** — 대여만 되던 게 구독으로 풀리면 알림

→ "검색"이 아니라 **"월 구독료 절약"**이라는 뾰족한 문제로 포지셔닝.

---

## 6. 기술 스택 (연습용)

- **Frontend/Backend:** Next.js + TypeScript + Tailwind CSS
- **상태:** localStorage (DB 없이 시작)
- **API:** TMDB (서버 라우트에서 프록시, 키 숨김)
- **가격 데이터:** `data/prices.json` (수동 관리)

---

## 7. 진행 상황 / 다음 할 일

**완료됨:**
- [x] Next.js 16 + TS + Tailwind v4 프로젝트 셋업 (App Router, src dir)
- [x] 기반 골격: `lib/tmdb.ts`(서버 전용 클라이언트), `types/tmdb.ts`, `lib/providers.ts`, `data/prices.json`
- [x] API 라우트: `/api/search`(검색 프록시), `/api/providers`(KR 제공처 목록 조회)
- [x] 시작 페이지 + `.env.example` / `.env.local`

- [x] TMDB API 키 발급 + `.env.local` 설정 (TMDB_ACCESS_TOKEN)
- [x] `/api/providers` 로 국내 provider_id 전수 검증 (Apple TV 350 수정, Coupang 1881 확인)
- [x] **Phase 0**: 검색 결과 UI + 제공처(구독/대여/구매) 표시 — 동작 확인 완료

- [x] **Phase 1**: 구독 관리 + 결과 반영 — 동작 확인 완료
  - 첫 방문 온보딩 오버레이 → `/settings` 에서 언제든 수정
  - localStorage 저장 (`useSyncExternalStore` 기반 훅, SSR 안전)
  - 검색 결과: 내 구독 OTT 강조(초록 링) + "🟢 바로 볼 수 있어요" 배지 + "내 구독만 보기" 필터 토글

- [x] **Phase 2**: 최저가 판단 — 동작 확인 완료
  - `lib/pricing.ts` `bestValue()`: 내 구독(무료) → 대여(추정) → 구매(추정) → 구독 필요 → 없음
  - 가격은 **한국 VOD 표준 단가 tier**(신작/구작) 기반 **추정치**. 출시일로 신작·구작 자동 분류
  - 카드에 "추정" 명시 + 하단 안내 문구. per-title 실제 금액 아님(무료 API 미제공)
  - 죽은 서비스(네이버 시리즈온, 2024-12 종료) seed 에서 제거

**다음 할 일:**
- [ ] (개선) 검색 디바운스/자동완성, 상세 페이지(구독/대여/구매 breakdown + 가격표)
- [ ] prices.json 실제 가격 검증/갱신, 신작·구작 단가 구분
- [ ] (확장) 구독 조합 최적화, "이번 달 얼마 아꼈나" 대시보드

### UI 디자인 방향 (적용됨)
- 컨셉: JustWatch풍 **포스터 그리드**, 색은 절제(중립 회색 + 강조색 1개 = 에메랄드)
- sticky 헤더 + 빈 화면 중앙 히어로 + 검색 후 상단 고정 그리드
- 카드: 포스터 위 **상태 배지**(🟢 바로 보기 / 구독 / 무료 / 대여·구매) + 제공처 로고 스트립(내 구독 강조)
- **정렬**: 내 구독 → 구독형 → 무료 → 대여/구매 순
- 로딩 스켈레톤, 반응형 2~5열 그리드

### Phase 1 구조 메모
- 저장: `localStorage` (`ott-finder:subscriptions`, `ott-finder:onboarded`)
- 결과 강조/필터는 클라이언트에서 처리 → `ResultsView`(client)가 서버가 fetch한 items를 받아 렌더
- `server-only` 모듈(`lib/tmdb.ts`)과 분리하기 위해 이미지 헬퍼는 `lib/image.ts`로 이동

### 프로젝트 구조
```
src/
  app/
    api/search/route.ts      # 통합 검색 프록시 (?q=)
    api/providers/route.ts   # KR 제공처 목록 (ID 검증용)
    layout.tsx  page.tsx
  lib/
    tmdb.ts                  # 서버 전용 TMDB 클라이언트
    providers.ts             # 국내 OTT 상수 (일부 ID 검증 필요)
  types/tmdb.ts
  data/prices.json           # 대여/구매 가격 seed (수동 관리)
```

---

### 참고 링크
- [TMDB Watch Providers API](https://developer.themoviedb.org/reference/movie-watch-providers)
- [JustWatch Streaming API (파트너 전용)](https://www.justwatch.com/us/JustWatch-Streaming-API)
- [Watchmode API 무료 키](https://api.watchmode.com/requestApiKey)
