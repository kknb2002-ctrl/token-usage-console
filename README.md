# ERP Dashboard — AI 토큰 사용량 관리

Claude · GPT · Gemini의 토큰 사용량을 한 화면에서 추적하는 사내 ERP 대시보드입니다.
**빌드 도구·프레임워크 없이 순수 HTML / CSS / JavaScript** 로 만들었습니다.

> 📚 수업 과제로 제작한 프로젝트입니다. 표시되는 사용량과 미팅·마케팅 데이터는 모두 데모용 샘플입니다.

---

## 실행 방법

```bash
git clone https://github.com/<계정>/erp-dashboard.git
cd erp-dashboard
python3 -m http.server 5173
```

브라우저에서 **http://localhost:5173/login.html** 접속 → 첫 계정을 만들면 관리자로 시작합니다.

> `file://` 로 직접 열면 브라우저 보안 정책 때문에 공용 데이터(JSON) 로딩이 차단됩니다.
> 반드시 위처럼 로컬 서버로 여세요.

---

## 화면

| 페이지 | 내용 |
|---|---|
| `login.html` | 로그인 / 직원 등록 · "이 PC에서 로그인 유지" 옵션 |
| `index.html` | 대시보드 — KPI 5종, 15분 추이 차트, 제공자별 요약, 최근 호출 8건 |
| `logs.html` | 전체 호출 로그 — 검색 · 제공자 필터 · 페이지네이션 |
| `meetings.html` | 미팅 일정 (공용) |
| `marketing.html` | 마케팅 캠페인 예산·집행 (공용) |
| `accounts.html` | 계정 연결 — 개인 API 키 등록 |

---

## 주요 기능

### 1. 실시간 토큰 사용량

- 총 토큰 / 예상 비용 / 분당 호출 / 평균 응답 토큰 / 오류율 **KPI 5종**
- 최근 15분 **스택 막대 차트** — Canvas 2D로 직접 구현 (차트 라이브러리 미사용)
- 제공자별 토큰·비용·호출 수 요약, 모델별 단가 기반 비용 추정
- CSV 내보내기

### 2. 개인별 API 키 암호화 금고 🔐

이 프로젝트에서 가장 공들인 부분입니다. 브라우저만으로 **여러 직원이 한 PC를 함께 써도
서로의 키를 볼 수 없게** 만들었습니다.

| 항목 | 구현 |
|---|---|
| 비밀번호 | 저장하지 않음 — **PBKDF2-SHA256 210,000회** 검증값만 보관 |
| 키 암호화 | 비밀번호에서 파생한 **AES-GCM 256비트** 키로 암호화 |
| salt 분리 | 검증용 salt와 금고용 salt를 분리 → 검증값이 유출돼도 금고 키 역산 불가 |
| 복호화 키 | `sessionStorage`(탭 종료 시 소멸) 또는 14일 만료 `localStorage` |
| 화면 표시 | 마지막 4자리만 (`••••••••••••••••1234`), 원문은 DOM에 넣지 않음 |
| 저장 분리 | 사용자 id로 네임스페이스 분리 — `erp.vault.<uid>.<provider>` |

모두 브라우저 내장 **Web Crypto API** 로 구현했으며 외부 라이브러리를 쓰지 않았습니다.

### 3. 설정으로 늘어나는 사이드바

메뉴를 추가할 때 HTML을 페이지마다 고치지 않도록, 사이드바를 **설정 배열 하나**로 만들었습니다.

```js
// js/config.js — 한 줄 추가하면 모든 페이지에 반영됩니다
{ group: '공용', items: [
  { id: 'meetings', label: '미팅', icon: '📅', href: 'meetings.html', scope: 'shared' },
  { id: 'hr',       label: '인사', icon: '👥', href: 'hr.html',       scope: 'shared' }  // ← 추가
]}
```

`scope` 로 개인 데이터와 공용 데이터를 구분해 메뉴에 배지를 표시합니다.

### 4. 데이터 소스 교체 구조

데모 시뮬레이터와 실제 백엔드를 **같은 인터페이스**로 분리해, 서버가 준비되면
`js/datasource.js` 의 `BACKEND` 주소만 채우면 실데이터로 전환됩니다.

```
DEMO   : 브라우저 안에서 호출 이벤트를 생성 (네트워크 요청 없음)
REMOTE : GET /api/usage?since=<ISO8601> 폴링
```

---

## 폴더 구조

```
.
├── login.html · index.html · logs.html
├── meetings.html · marketing.html · accounts.html
├── css/styles.css          디자인 토큰 + 컴포넌트
├── data/*.json             공용 데이터 (미팅 · 마케팅)
├── js/
│   ├── config.js           제공자 정의 · 참고 단가 · 사이드바 메뉴
│   ├── auth.js             로그인 · PBKDF2 검증 · AES-GCM 키 금고
│   ├── store.js            사용자별 저장소 · 집계/비용 계산
│   ├── datasource.js       DEMO ↔ REMOTE 데이터 공급
│   ├── nav.js              공용 사이드바 렌더러
│   ├── ui.js               KPI · 차트 · 로그 렌더링
│   ├── login.js · accounts.js · shared.js · logs.js · app.js
├── supabase/schema.sql     백엔드 전환용 스키마 (RLS 정책 포함)
├── SECURITY.md             보안 설계와 한계
└── DEPLOY.md               배포 방식 비교 (정적 호스팅 / 서버 / SSO)
```

---

## 기술 스택

| 분류 | 사용 |
|---|---|
| 프론트엔드 | HTML5 · CSS3 · Vanilla JavaScript (ES2020) |
| 암호화 | Web Crypto API (PBKDF2, AES-GCM) |
| 차트 | Canvas 2D API 직접 구현 |
| 저장소 | localStorage · sessionStorage |
| 빌드 | **없음** — 파일을 그대로 서빙 |

프레임워크와 라이브러리를 쓰지 않은 이유는, 브라우저 표준 API만으로 어디까지
만들 수 있는지 확인해보고 싶었기 때문입니다.

---

## 설계하며 고민한 점

**1. "실시간"이라는 말의 함정**
대시보드를 켜두면 API 비용이 나가는지 확인해봤습니다. 사용량 **조회** API는 모델 추론이
일어나지 않아 토큰을 소모하지 않지만, 요청 수 제한이 있고 집계가 분 단위로 지연됩니다.
그래서 DEMO는 2초, 실서버 연동은 60초로 폴링 주기를 분리했습니다.

**2. 브라우저만으로 지킬 수 있는 보안의 경계**
암호화로 "같은 PC의 다른 로그인 사용자로부터의 격리"까지는 가능하지만,
로그인된 상태의 PC를 만지는 사람은 막을 수 없습니다. 할 수 있는 것과 없는 것을
[SECURITY.md](SECURITY.md) 에 명확히 적었습니다.

**3. 편의와 보안의 교환**
"로그인 유지"를 켜면 편하지만 그 PC를 쓰는 사람이 내 키를 쓸 수 있게 됩니다.
기본값은 켬으로 하되 14일 만료를 두고, 공용 PC에서는 끄라는 안내를 UI에 넣었습니다.

---

## 앞으로

- [ ] Supabase 연동 — 계정과 기록을 서버로 옮겨 어느 PC에서든 동일한 환경
- [ ] 실제 사용량 수집 백엔드 (Anthropic Admin API / OpenAI Usage API)
- [ ] 예산 임계 알림, 부서별 쿼터
- [ ] Flutter 모바일 앱

---

## 문서

- [SECURITY.md](SECURITY.md) — 키 보관 방식, 보장 범위와 한계
- [DEPLOY.md](DEPLOY.md) — 정적 호스팅 / 서버 / SSO 비교와 배포 절차
- [supabase/SETUP.md](supabase/SETUP.md) — 백엔드 전환 단계
