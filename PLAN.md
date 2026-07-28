# OTT Finder — 기획 & 구현 계획

> 한 줄 정의: "이 콘텐츠, **지금 나에게 가장 싸게(또는 공짜로) 보는 방법**은 뭐지?"에 답하는 서비스.
> JustWatch가 *정보 나열*에서 멈춘다면, OTT Finder는 *결정*까지 대신 내려준다.

---

## 1. 문제 & 차별점

기존 서비스(JustWatch, 키노라이츠 등)는 "이 콘텐츠는 넷플릭스/티빙/웨이브에서 볼 수 있어요"까지만 알려주고 **판단은 사용자 몫**으로 남긴다.

OTT Finder의 차별점:

- **① 구독 정보를 필터가 아니라 계산 입력값으로** — 내가 구독 중인 OTT 기준으로 "바로 볼 수 있음 / 추가 결제 필요"를 구분하는 데서 그치지 않고, 그 상태가 **결론과 금액 자체를 바꾼다**
- **② 최저가 판단** — 구독 중이면 "추가비용 0원", 아니면 대여/구매 최저가를 계산해 **한 줄 결론**으로 제시

→ 검색 도구가 아니라 **의사결정 도구.**

### 경쟁 서비스 조사 (2026-07-27)

"구독 서비스를 고르면 그 안에서 볼 수 있는 걸 보여준다"는 **이미 표준 기능**임을 확인했다.
차별점 ①을 "내 구독 필터"라고 잡았던 건 틀린 판단이었다.

| 서비스 | 겹치는 부분 | 안 하는 부분 |
|---|---|---|
| [JustWatch](https://www.justwatch.com/kr) | My Services 필터(85개+ 서비스 선택), 위시리스트에도 동일 필터 | 조합 최적화, 추가 지출 델타 |
| [키노라이츠](https://m.kinolights.com/) | 구독 기반 맞춤 추천, 대여/구매 최저가 비교, 신작·종료작 알림 | 위시리스트 조합 계산(미확인) |
| [Stream-Wiser](https://stream-wiser.com/) | 위시리스트 → 구독 조합 최적화 (12개월 로테이션 캘린더) | 대여/구매를 아예 안 다룸. 한국 지원은 자사 주장 |

**남는 틈:** 국내 + 이번 달 단일 시점 + **대여/구매를 구독의 대안으로 같은 목적함수에** 넣은
정확 최적해 + `additionalCost`(이미 내는 구독 제외한 실지출 델타).
새로운 카테고리는 아니고 같은 재료의 다른 프레이밍이지만, 이 조합은 찾지 못했다.

**결론:** 아이디어 선점은 성립하지 않는다. 진입 장벽은 아이디어가 아니라 **데이터 접근권**이다
(§2 주의사항 참조). 이 프로젝트의 가치는 아이디어가 아니라 판단의 기록에 둔다.

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

- [x] **v0.2.0 — 결정 흐름 완성** (2026-07-26) — 동작 확인 완료
  - **무료 경로(free/ads) 반영** — `bestValue()`가 `free`·`ads`를 무시해서 **0원으로 볼 수 있는
    작품에 "대여 ₩5,500 추정"이 뜨던 버그** 수정. KR에 실제로 영화 free 2,975편 / ads 11,648편,
    TV free 176편 / ads 728편이 있어 체감 영향이 컸음.
    우선순위: 내 구독 → free → ads → 대여 → 구매 → 구독 필요 → 없음
    (이미 지불한 구독이 광고 시청보다 낫다고 보고 내 구독을 맨 앞에 유지)
  - **같은 버그가 조합 최적화에도 있었음** — 무료 작품이 `flatrate`만 있고 대여/구매가 없으면
    `feasible=false`가 되어 **불필요한 구독을 강제 추천**했다. 이제 무료 작품은 어떤 조합에서도
    0원이므로 최적화 대상에서 분리(`watchFree`)하고 결과 화면에 별도 섹션으로 표시.
  - **광고형 요금제 alias** — `Netflix Standard with Ads`(1796)가 별도 provider_id라
    넷플릭스 구독자가 "구독 필요"를 보던 문제. `ProviderDef.aliasIds`로 대표 서비스에 매핑하고,
    표시할 땐 `dedupeProviders()`로 합쳐 로고·이름이 두 번 뜨지 않게 함.
  - **상세 페이지 `/title/[mediaType]/[id]`** — `append_to_response=watch/providers,credits`로
    **1회 호출**. 결론 배너 + 제공처 breakdown(구독/무료/광고형/대여/구매) + 줄거리 + 감독·출연.
    movie/tv 응답 차이는 `TitleDetail`로 정규화. `generateMetadata`로 작품별 메타데이터.
  - **"보러 가기"** — TMDB의 `link`는 provider 딥링크가 아니라 themoviedb.org 경유 페이지임을
    확인. `data/watch-links.json` seed(서비스 검색 URL)로 직접 이동, 없으면 TMDB link로 폴백.

- [x] **v0.3.0 — 진짜 딥링크 + 실제 가격** (2026-07-26) — 동작 확인 완료
  - v0.2.0의 "무료 API로는 per-title 딥링크 불가"는 **틀린 결론이었음.** 정확히는
    *TMDB만으로는* 불가. TMDB watch 페이지 HTML 안에 이미 JustWatch 클릭 URL로 감싼
    진짜 딥링크가 있었고, JustWatch GraphQL(`apis.justwatch.com/graphql`)로 정식 조회 가능.
  - **딥링크 확보** — `netflix.com/title/81040344`, `tving.com/contents/P001782817`,
    `wavve.com/player/movie?movieid=...`, `watcha.com/contents/mW4L2XW`
  - **실제 대여/구매가 확보 — 이게 딥링크보다 큼.** 추정치 오차가 컸다:
    인셉션 대여 추정 ₩2,500 → 실제 **₩1,320**, 구매 추정 ₩7,700 → 실제 **₩4,950**
  - **매칭은 fuzzy 하지 않음** — JustWatch에 TMDB id 직접 조회 필드가 없어(`nodeByExternalId`
    미존재) 제목으로 검색하지만, `externalIds.tmdbId` + `objectType`으로 **정확히 대조**한다.
    ("오징어 게임" 검색 시 딸려오는 더 챌린지/이야기/벽난로가 id로 정확히 걸러짐)
  - **packageId == TMDB provider_id** — TMDB가 JustWatch에서 provider 데이터를 받아오기
    때문. 7개 서비스 전부 일치 확인 → 별도 매핑 테이블 없이 `lib/providers.ts`에 그대로 붙음
  - **폴백 설계** — `lib/justwatch.ts`는 **어떤 실패에서도 예외를 던지지 않고 null 반환**
    (5초 타임아웃, 스키마 변경, 차단, 매칭 실패 모두). 호출부는 null이면 v0.2.0 동작
    (검색 URL + 표준 단가 추정치)으로 자동 강등. 엔드포인트를 죽여서 실제로 검증함.

  ⚠️ **비공식 API 의존** — `apis.justwatch.com/graphql`은 문서화돼 있지 않고
  introspection도 막혀 있다(`introspection disabled`). 레이트 리밋도 공개된 값이 없다.
  언제든 깨질 수 있다는 전제로 폴백을 넣었으므로, 깨지면 앱은 v0.2.0 수준으로 동작한다.
  개인 학습·포트폴리오 용도라는 전제에서의 선택이며, 상업적 이용은 약관 위반이다.
  (공식 대안 Watchmode는 무료 티어 월 2,500콜/3개국 — 현재 구조엔 쿼터가 부족)

- [x] **v0.4.0 — 추정치 폐기, 실제 데이터만** (2026-07-26) — 동작 확인 완료
  - **원칙 변경: 추정치를 표시하지 않는다.** 의사결정 도구에서 틀린 숫자는 숫자가 없는 것보다
    나쁘다. 실제 가격을 모르면 **금액 없이 경로만** 알린다 ("대여 가능", "대여로 볼 수 있어요").
  - `src/data/prices.json` **삭제** — 표준 단가 tier 추정 체계 전체 제거.
    `estimatePrice()` / `tierLabel()` / `isNewRelease()` 도 함께 제거. (필요하면 git 이력에서 복구)
  - `bestValue()` 시그니처 변경: `isNew: boolean` → `offers?: JwOffer[] | null`.
    `BestValue` 의 rent/buy 가 `estimate: number` → `price: number | null` 로 바뀜.
  - **대여 vs 구매를 실제로 비교** — 실측가를 알게 되니 "무조건 대여 우선"이 틀릴 수 있음
    (구작은 구매가 더 싼 경우가 있음). 둘 다 금액을 알면 진짜 싼 쪽을 고른다.
  - **검색 카드도 실제가** — `searchWithProviders()` 가 항목당 TMDB + JustWatch 를 병렬 조회.
    카드와 상세 페이지의 가격 불일치 해소 (인셉션: 양쪽 다 ₩1,320).
    실측: 20건 동시 호출 **0.48초, 실패 0건, 레이트 리밋 없음**.
  - **조합 계산도 실제가** — `/api/bundle` 이 작품별 실측 대여/구매가로 총비용을 계산.
    가격을 못 구한 작품은 **총액에서 제외하고 `unknownPriceCount` 로 따로 보고**한다.
    이때 화면은 총액을 "최소 ₩N +α" 로 표시해 확정 금액이 아님을 명시.
  - 폴백 재검증(엔드포인트를 죽여서): 카드 "대여 가능", 상세 "추정치 대신 금액을 표시하지
    않습니다", 조합 `price: null` + `unknownPriceCount: 1` — **추정치가 새어나오는 곳 없음.**

- [x] **v0.4.1 — TMDB 제공처 구멍 보완 + '추가 지출' 표시** (2026-07-27) — 동작 확인 완료
  - **TMDB 의 KR 제공처 데이터에 구멍이 있다** (사용자 제보로 발견).
    동궁(2026, tv/279323)은 TMDB 에 US/JP/GB 등 80개국 Netflix 정보가 있는데 **KR 만 통째로
    비어 있었다.** 그래서 넷플릭스로 볼 수 있는 작품이 "시청 정보 없음"으로 분류되고
    조합 계산에서도 빠졌다. 같은 작품을 JustWatch 는 KR Netflix 로 정확히 답한다.
  - 원인은 **데이터를 손에 쥐고도 안 쓴 것** — v0.3.0 부터 JustWatch 를 붙였지만
    가격·딥링크에만 쓰고 "어디서 볼 수 있나"는 TMDB 만 믿고 있었다.
  - `lib/availability.ts` `mergeAvailability()` 로 TMDB + JustWatch 제공처를 **합집합**으로
    합친다. packageId == provider_id 라 id 기준으로 그냥 합쳐진다. JustWatch 로만 확인된
    제공처의 로고·이름은 `getProviderCatalog()`(TMDB 지역 제공처 목록)로 채운다.
    검색·상세·조합 계산 세 경로 모두 적용.
  - **"추가 지출" 추가** — 총액이 ₩13,500 으로 뜨는데 이미 넷플릭스를 구독 중이면
    실제로 더 나가는 돈은 0원이다. `totalThisMonth`(조합 자체의 비용)와 별개로
    `additionalCost`(= 아직 구독 안 한 서비스 월정액 + 대여/구매)를 계산해 메인 숫자로 올렸다.
    조합 월비용은 작은 글씨로 남긴다 — 없애면 "현재 대비 얼마 절약" 비교의 근거가 사라진다.

- [x] **v0.4.2 — 출처 표기 + "모르면 단정하지 않는다"를 구독 상태에도 적용** (2026-07-28) — 동작 확인 완료
  - **항목별 JustWatch 출처 표기** — TMDB 의 watch/providers 는 JustWatch 데이터라
    출처 표기가 약관상 필수이고, TMDB 안내는 앱 한 구석이 아니라 **제공처를 표시하는
    항목마다** 요구한다(미준수 시 API 접근 회수 가능). `ProviderSource` 를 검색 카드·
    상세 "볼 수 있는 곳"·조합 결과 두 섹션에 붙였고, 푸터 고지는 `DataAttribution` 으로
    분리해 TMDB 지정 문구를 그대로 넣었다.
  - **차별점 ① 재정의** — "내 구독 필터"는 JustWatch·키노라이츠가 이미 하는 표준 기능이었다.
    실제로 다른 건 구독 정보를 **필터가 아니라 계산 입력값**으로 쓴다는 점 (§1 표 참조).
  - 🔴 **하이드레이션 전에 틀린 결론을 렌더하던 버그 수정.**
    - 증상: 검색 결과 첫 페인트에서 wavve 로 공짜로 볼 수 있는 작품에 **"대여 ₩1,300"**,
      배지도 "바로 보기" 대신 "구독". 정렬도 내 구독이 위로 안 올라감.
    - 원인은 **React 의 selective hydration**. 구독 상태는 localStorage 라 SSR 이 알 수 없어
      서버는 `getServerSnapshot`(`slugs: []`)으로 렌더한다. 검색 결과는 `<Suspense>` 안에
      있어서 React 가 이 경계의 하이드레이션을 **낮은 우선순위로 미루고**, 그동안 구독을
      모른 채 계산한 DOM 이 그대로 남아 있었다. 클릭 한 번이면 즉시 정상화된다
      (React 가 입력 이벤트를 받으면 해당 경계를 먼저 하이드레이트한다).
      Suspense 를 걷어내면 재현되지 않는 것으로 원인을 확정했다.
    - 포커스된 탭에서는 지연이 짧아 잘 안 보이지만, **짧아도 틀린 금액을 보여주는 건
      맞다.** v0.4.0 의 "모르면 표시하지 않는다"는 가격에만 적용하고 **구독 상태에는
      적용하지 않았던** 셈이다.
    - 수정: `subscribedIds === undefined`(= 아직 모름)와 빈 Set(= 구독 없음)을 구분한다.
      모르는 동안엔 결론 대신 스켈레톤을 놓고 배지를 달지 않는다.
      `BestValueLine` · `ResultCard.statusPill` · `TitleDecision` 결론 배너에 적용.
    - Suspense 는 그대로 뒀다. 스트리밍 스켈레톤은 그대로 쓰는 게 맞고,
      진짜 문제는 "모르는 걸 단정한 것"이지 Suspense 가 아니었다.

**다음 할 일:**
- [ ] **JustWatch 실패를 감지할 방법이 없음** — 지금은 조용히 금액만 사라진다.
      실패율 로깅/알림이 없으면 스키마가 바뀌어도 한동안 모른다. 우선순위 높음
- [ ] **테스트 없음** — `bundle.ts`(set cover)·`pricing.ts`는 순수 함수라 vitest 도입 1순위.
      JustWatch 응답 파싱도 고정 fixture 로 테스트해두면 스키마 변경을 바로 잡을 수 있음
- [ ] 구독 월정액(`subscriptions.json`)은 **여전히 수동 관리 seed** — 유일하게 남은 비실측
      데이터. 요금제 개편 때 갱신 필요 (JustWatch 는 구독 월정액을 주지 않음)
- [ ] 검색 응답이 항목당 2개 API 를 타므로 느려질 수 있음 — 스트리밍/부분 렌더 검토
- [ ] (개선) 검색 디바운스/자동완성, 페이지네이션(현재 20건 고정)
- [ ] README가 create-next-app 기본값 그대로 / 배포 안 됨
- [ ] (확장) 탐색 피드(discover), "이번 달 얼마 아꼈나" 대시보드

### v0.2.0에서 확인 후 **의도적으로 뺀 것**
- **시즌별 제공처** — `/tv/{id}/season/{n}/watch/providers`는 200을 주지만 KR 응답이
  시리즈 레벨과 **동일**(link까지 같음)해서 정보량이 0. 호출만 늘어나 제외.
- **Disney+ / Coupang Play 검색 링크** — Disney+는 `/search`가 404, Coupang Play는
  SPA catch-all이라 파라미터 이름을 확정할 수 없었음. 추측 대신 TMDB link 폴백.
  (`watch-links.json`의 `verified` 플래그에 근거를 남김)

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
    api/search/route.ts             # 통합 검색 프록시 (?q=)
    api/providers/route.ts          # KR 제공처 목록 (ID 검증용)
    api/bundle/route.ts             # 위시리스트 → 최적 구독 조합
    title/[mediaType]/[id]/page.tsx # 작품 상세 (v0.2.0)
    settings/  watchlist/
    layout.tsx  page.tsx
  lib/
    tmdb.ts                  # 서버 전용 TMDB 클라이언트 (검색·상세·제공처)
    justwatch.ts             # 서버 전용 · 딥링크+실제가 (v0.3.0, 실패 시 null)
    availability.ts          # TMDB+JustWatch 제공처 합집합 (v0.4.1)
    offers.ts                # JustWatch 오퍼 순수 헬퍼 (클라이언트 공용)
    providers.ts             # 국내 OTT 상수 + alias 매핑 + dedupeProviders()
    pricing.ts               # bestValue() — "가장 싸게 보는 법" 판정 (실측가만)
    bundle.ts                # 구독 조합 최적화 (weighted set cover 완전탐색)
    watchLink.ts             # 검색 URL 폴백 링크 (v0.2.0)
    image.ts
  hooks/                     # useSubscriptions, useWatchlist (localStorage)
  types/tmdb.ts  types/justwatch.ts
  data/
    subscriptions.json       # 구독 월정액 카탈로그 (남은 유일한 수동 seed)
    watch-links.json         # 딥링크 실패 시 쓰는 서비스 검색 URL 템플릿
```

### 데이터 출처 (v0.4.0 기준)
| 데이터 | 출처 | 성격 |
|---|---|---|
| 작품 메타·검색 | TMDB | 실측 |
| 제공처(어디서 보나) | TMDB + JustWatch **합집합** | 실측 (TMDB KR 은 누락이 있음) |
| 대여/구매 **가격** | JustWatch | **실측** (모르면 표시 안 함) |
| per-title **딥링크** | JustWatch | **실측** (없으면 서비스 검색 URL) |
| 구독 월정액 | `subscriptions.json` | 수동 관리 seed |

---

### 참고 링크
- [TMDB Watch Providers API](https://developer.themoviedb.org/reference/movie-watch-providers)
- [JustWatch Streaming API (파트너 전용)](https://www.justwatch.com/us/JustWatch-Streaming-API)
- [Watchmode API 무료 키](https://api.watchmode.com/requestApiKey)
