# Supabase 연결 — 가입부터 순서대로

전부 무료 범위 안에서 됩니다. 카드 등록 없이 진행됩니다. **약 15분**.

---

## 1단계 · 가입 (2분)

1. https://supabase.com 접속 → 오른쪽 위 **Start your project**
2. **Continue with GitHub** 선택 (이미 GitHub 계정이 있으니 가장 빠릅니다)
3. GitHub 권한 승인

## 2단계 · 프로젝트 만들기 (3분)

1. **New project** 클릭
2. 입력값

   | 항목 | 값 |
   |---|---|
   | Name | `erp-dashboard` |
   | Database Password | **자동 생성 버튼을 누르고 어딘가에 저장** (DB 직접 접속용, 앱에서는 안 씀) |
   | Region | **Northeast Asia (Seoul)** — 한국에서 가장 빠름 |
   | Plan | Free |

3. **Create new project** → 준비되기까지 1~2분 기다립니다

## 3단계 · 테이블 만들기 (2분)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 **`supabase/schema.sql` 내용을 전부 복사해 붙여넣기**
3. 오른쪽 아래 **Run** (⌘+Enter)
4. `Success. No rows returned` 이 나오면 성공입니다
5. 왼쪽 **Table Editor** 에서 `profiles` · `vault` · `usage_events` · `meetings` · `campaigns`
   다섯 개 테이블이 보이는지 확인하세요. `meetings` 에 미팅 5건이 들어 있어야 합니다.

## 4단계 · 회사 이메일만 허용 (선택, 1분)

외부인 가입을 원천 차단하려면 `schema.sql` 맨 아래 **6번 블록의 주석을 풀고**
`회사도메인.com` 을 실제 도메인으로 바꿔 한 번 더 Run 하세요.

## 5단계 · 이메일 인증 끄기 (1분)

기본 설정에서는 가입할 때 확인 메일을 받아야 합니다. 사내 도구라 번거로우니 끕니다.

1. 왼쪽 **Authentication** → **Sign In / Providers** → **Email**
2. **Confirm email** 을 **끄기(OFF)** → Save

> 4단계로 도메인을 제한했다면 인증 메일 없이도 외부인은 가입할 수 없습니다.

## 6단계 · 연결 정보 알려주기 (1분)

1. 왼쪽 아래 **Project Settings**(톱니) → **Data API**
2. 아래 두 값을 복사해서 알려주세요.

   | 항목 | 생김새 |
   |---|---|
   | **Project URL** | `https://abcdefghijkl.supabase.co` |
   | **anon public** | `eyJhbGciOi...` 로 시작하는 긴 문자열 |

   > ⚠️ 같은 화면의 **`service_role`** 키는 **절대 주지 마세요.** 그건 모든 보안 정책을
   > 무시하는 마스터 키입니다. `anon public` 만 필요합니다. anon 키는 원래 브라우저에
   > 공개되도록 설계된 값이라 알려주셔도 안전하고, 실제 보안은 RLS 정책이 담당합니다.

---

## 그 다음은 제가 합니다

두 값을 `js/cloud-config.js` 에 넣고 코드를 교체하면 이렇게 바뀝니다.

| 지금 | 연결 후 |
|---|---|
| PC마다 따로 가입 | 한 번 가입 → 어느 PC에서든 같은 계정 |
| 기록이 그 PC에만 | 사용 기록이 계정에 쌓임 |
| 미팅·마케팅은 커밋해야 수정 | 화면에서 바로 수정, 전원에게 즉시 반영 |
| 아무나 회원가입 | 회사 이메일만 (4단계 적용 시) |

**API 키 보관 방식은 그대로 유지합니다.** 브라우저에서 본인 비밀번호로 암호화한 뒤
**암호문만** 서버에 올리므로, 키는 PC를 따라다니면서도 회사·Supabase는 내용을 볼 수 없습니다.

> ⚠️ 그래서 **비밀번호를 재설정하면 기존에 등록한 API 키는 복구되지 않습니다.**
> (암호화 키가 비밀번호에서 나오기 때문) 재설정 후에는 키를 다시 등록하면 됩니다.
