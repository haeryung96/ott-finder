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

- [x] **v0.2.0 — 무료 경로 반영 + 광고형 요금제 alias** (2026-07-26) — 동작 확인 완료
  - **무료 경로(free/ads) 버그 수정** — `bestValue()`가 `free`·`ads`를 무시해서 **0원으로 볼 수
    있는 작품에 "대여 ₩5,500 추정"이 뜨던 버그**. KR에 실제로 영화 free 2,975편 / ads 11,648편,
    TV free 176편 / ads 728편이 있어 체감 영향이 컸음.
    우선순위: 내 구독 → free → ads → 대여 → 구매 → 구독 필요 → 없음
    (이미 지불한 구독이 광고 시청보다 낫다고 보고 내 구독을 맨 앞에 유지)
  - **같은 버그가 조합 최적화에도 있었음** — 무료 작품이 `flatrate`만 있고 대여/구매가 없으면
    `feasible=false`가 되어 **불필요한 구독을 강제 추천**했다. 이제 무료 작품은 어떤 조합에서도
    0원이므로 최적화 대상에서 분리(`watchFree`)하고 결과 화면에 별도 섹션으로 표시.
  - **광고형 요금제 alias** — `Netflix Standard with Ads`(1796)가 별도 provider_id라
    넷플릭스 구독자가 "구독 필요"를 보던 문제. `ProviderDef.aliasIds`로 대표 서비스에 매핑하고,
    표시할 땐 `dedupeProviders()`로 합쳐 로고·이름이 두 번 뜨지 않게 함.
  - 배지·정렬·결론 문구가 서로 어긋나 있던 것도 같은 우선순위로 통일.

- [x] **v0.3.0 — 상세 페이지 + 진짜 딥링크** (2026-07-26) — 동작 확인 완료
  - v0.2.0의 "무료 API로는 per-title 딥링크 불가"는 **틀린 결론이었음.** 정확히는
    *TMDB만으로는* 불가. TMDB watch 페이지 HTML 안에 이미 JustWatch 클릭 URL로 감싼
    진짜 딥링크가 있었고, JustWatch GraphQL(`apis.justwatch.com/graphql`)로 정식 조회 가능.
  - **딥링크 확보** — `netflix.com/title/81040344`, `tving.com/contents/P001782817`,
    `wavve.com/player/movie?movieid=...`, `watcha.com/contents/mW4L2XW`
  - **실제 대여/구매가도 나옴** — 추정치 오차가 컸다:
    인셉션 대여 추정 ₩2,500 → 실제 **₩1,320**, 구매 추정 ₩7,700 → 실제 **₩4,950**
    (상세 페이지에 우선 반영. 검색 카드·조합 계산은 v0.4.0에서)
  - **매칭은 fuzzy 하지 않음** — JustWatch에 TMDB id 직접 조회 필드가 없어(`nodeByExternalId`
    미존재) 제목으로 검색하지만, `externalIds.tmdbId` + `objectType`으로 **정확히 대조**한다.
    ("오징어 게임" 검색 시 딸려오는 더 챌린지/이야기/벽난로가 id로 정확히 걸러짐)
  - **packageId == TMDB provider_id** — TMDB가 JustWatch에서 provider 데이터를 받아오기
    때문. 7개 서비스 전부 일치 확인 → 별도 매핑 테이블 없이 `lib/providers.ts`에 그대로 붙음
  - **폴백 설계** — `lib/justwatch.ts`는 **어떤 실패에서도 예외를 던지지 않고 null 반환**
    (5초 타임아웃, 스키마 변경, 차단, 매칭 실패 모두). 엔드포인트를 죽여서 실제로 검증함.
  - **상세 페이지 `/title/[mediaType]/[id]`** — `append_to_response=watch/providers,credits`로
    **1회 호출**. 결론 배너 + 제공처 breakdown + 줄거리 + 감독·출연. `generateMetadata` 지원.

  ⚠️ **비공식 API 의존** — `apis.justwatch.com/graphql`은 문서화돼 있지 않고
  introspection도 막혀 있다(`introspection disabled`). 레이트 리밋도 공개된 값이 없다.
  개인 학습·포트폴리오 용도라는 전제에서의 선택이며, 상업적 이용은 약관 위반이다.
  (공식 대안 Watchmode는 무료 티어 월 2,500콜/3개국 — 현재 구조엔 쿼터가 부족)

### v0.3.0에서 확인 후 **의도적으로 뺀 것**
- **시즌별 제공처** — `/tv/{id}/season/{n}/watch/providers`는 200을 주지만 KR 응답이
  시리즈 레벨과 **동일**(link까지 같음)해서 정보량이 0. 호출만 늘어나 제외.
- **Disney+ / Coupang Play 검색 링크** — Disney+는 `/search`가 404, Coupang Play는
  SPA catch-all이라 파라미터 이름을 확정할 수 없었음. 추측 대신 TMDB link 폴백.

**다음 할 일:**
- [ ] **검색 카드와 상세 페이지의 가격이 불일치** — 카드는 아직 추정치, 상세는 실제가
- [ ] **조합 계산(`/api/bundle`)도 아직 추정치** — 위시리스트는 소수라 실제가를 쓰기 좋음
- [ ] JustWatch 레이트 리밋 파악 + 실패율 로깅 (지금은 조용히 폴백만 함)
- [ ] (개선) 검색 디바운스/자동완성
- [ ] prices.json 실제 가격 검증/갱신
- [ ] (확장) "이번 달 얼마 아꼈나" 대시보드

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
    tmdb.ts                  # 서버 전용 TMDB 클라이언트 (검색·상세·제공처)
    justwatch.ts             # 서버 전용 · 딥링크+실제가 (v0.3.0, 실패 시 null)
    offers.ts                # JustWatch 오퍼 순수 헬퍼 (클라이언트 공용)
    providers.ts             # 국내 OTT 상수 + alias 매핑 + dedupeProviders()
    watchLink.ts             # 검색 URL 폴백 링크
  app/title/[mediaType]/[id]/page.tsx   # 작품 상세 (v0.3.0)
  types/tmdb.ts  types/justwatch.ts
  data/prices.json           # 대여/구매 가격 seed (수동 관리)
  data/watch-links.json      # 서비스 검색 URL 템플릿
```

---

### 참고 링크
- [TMDB Watch Providers API](https://developer.themoviedb.org/reference/movie-watch-providers)
- [JustWatch Streaming API (파트너 전용)](https://www.justwatch.com/us/JustWatch-Streaming-API)
- [Watchmode API 무료 키](https://api.watchmode.com/requestApiKey)
