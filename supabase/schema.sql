-- =========================================================
--  ERP — Supabase 스키마
--  Supabase 대시보드 → SQL Editor → New query 에 통째로 붙여넣고 Run
--  (여러 번 실행해도 안전하도록 작성했습니다)
-- =========================================================

-- ---------------------------------------------------------
-- 1. 프로필 — 이름 · 권한 · 금고 소금(salt)
--    vault_salt: 브라우저가 비밀번호로 암호화 키를 만들 때 쓰는 값.
--    이 값만으로는 키를 못 만듭니다(비밀번호가 있어야 함).
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  vault_salt text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "본인 프로필 생성" on public.profiles;
create policy "본인 프로필 생성" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "사내 프로필 조회" on public.profiles;
create policy "사내 프로필 조회" on public.profiles
  for select to authenticated using (true);          -- 이름·권한만. 키는 다른 테이블

drop policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);


-- ---------------------------------------------------------
-- 2. 금고 — API 키 "암호문"만 저장
--    서버(=회사)는 내용을 볼 수 없습니다. 복호화는 본인 브라우저에서만.
-- ---------------------------------------------------------
create table if not exists public.vault (
  user_id    uuid not null references auth.users on delete cascade,
  provider   text not null,                          -- claude | gpt | gemini
  iv         text not null,                          -- AES-GCM 초기화 벡터
  ct         text not null,                          -- 암호문
  last4      text,                                   -- 화면 표시용 끝 4자리
  org        text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.vault enable row level security;

drop policy if exists "내 키만 접근" on public.vault;
create policy "내 키만 접근" on public.vault
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------------------------------------------------------
-- 3. 사용 기록 — 개인별. 어느 PC에서 접속해도 이어집니다.
-- ---------------------------------------------------------
create table if not exists public.usage_events (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  ts       timestamptz not null default now(),
  provider text not null,
  model    text not null,
  kind     text not null default 'chat',
  input    integer not null default 0,
  output   integer not null default 0,
  cache    integer not null default 0,
  status   text not null default 'ok'
);

create index if not exists usage_events_user_ts on public.usage_events (user_id, ts desc);

alter table public.usage_events enable row level security;

drop policy if exists "내 사용기록만" on public.usage_events;
create policy "내 사용기록만" on public.usage_events
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------------------------------------------------------
-- 4. 공용 데이터 — 미팅 / 마케팅
--    로그인한 직원이면 모두 읽고 쓸 수 있습니다.
--    (관리자만 수정하게 하려면 아래 정책의 using/with check 를
--     exists(select 1 from profiles where id=auth.uid() and role='admin') 으로 바꾸세요)
-- ---------------------------------------------------------
create table if not exists public.meetings (
  id         bigint generated always as identity primary key,
  at         timestamptz not null,
  title      text not null,
  owner      text,
  attendees  integer not null default 0,
  place      text,
  status     text not null default '예정',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.campaigns (
  id         bigint generated always as identity primary key,
  name       text not null,
  channel    text,
  owner      text,
  period     text,
  budget     bigint not null default 0,
  spent      bigint not null default 0,
  status     text not null default '예정',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table public.meetings  enable row level security;
alter table public.campaigns enable row level security;

drop policy if exists "사내 공용 미팅" on public.meetings;
create policy "사내 공용 미팅" on public.meetings
  for all to authenticated using (true) with check (true);

drop policy if exists "사내 공용 캠페인" on public.campaigns;
create policy "사내 공용 캠페인" on public.campaigns
  for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------
-- 5. 기존 JSON 데이터 옮겨심기 (한 번만)
-- ---------------------------------------------------------
insert into public.meetings (at, title, owner, attendees, place, status)
select * from (values
  ('2026-09-08 10:00+09'::timestamptz, '주간 운영 리뷰',              '운영팀',     6,  '회의실 A', '예정'),
  ('2026-09-09 14:00+09'::timestamptz, '신규 기능 요구사항 정리',  '기획팀',     4,  '온라인',   '예정'),
  ('2026-09-11 11:00+09'::timestamptz, 'AI 토큰 예산 점검',           '재무팀',     5,  '회의실 B', '예정'),
  ('2026-09-15 09:30+09'::timestamptz, '월간 전사 공유',              '경영지원',   24, '대회의실', '예정'),
  ('2026-09-02 16:00+09'::timestamptz, '8월 마감 리뷰',               '재무팀',     5,  '회의실 A', '완료')
) as v
where not exists (select 1 from public.meetings);

insert into public.campaigns (name, channel, owner, period, budget, spent, status)
select * from (values
  ('9월 신규 고객 확보',    '검색광고', '마케팅팀', '09.01 ~ 09.30', 4500000, 1320000, '진행중'),
  ('도입 사례 콘텐츠',      '블로그',   '콘텐츠팀',   '09.01 ~ 09.20',  800000,  240000, '진행중'),
  ('추석 프로모션',         '이메일',   '마케팅팀', '09.20 ~ 10.05', 2000000,       0, '예정'),
  ('8월 브랜드 캠페인',     'SNS',      '마케팅팀', '08.01 ~ 08.31', 3000000, 2980000, '종료')
) as v
where not exists (select 1 from public.campaigns);


-- =========================================================
--  선택 6. 회사 이메일만 가입 허용
--  아래 주석을 풀고 '회사도메인.com' 을 실제 도메인으로 바꾼 뒤 실행하세요.
--  이걸 켜면 외부인은 회원가입 자체가 막힙니다.
-- =========================================================
-- create or replace function public.enforce_company_domain()
-- returns trigger language plpgsql security definer as $$
-- begin
--   if new.email not like '%@회사도메인.com' then
--     raise exception '회사 이메일(@회사도메인.com)로만 가입할 수 있습니다.';
--   end if;
--   return new;
-- end $$;
--
-- drop trigger if exists enforce_company_domain on auth.users;
-- create trigger enforce_company_domain
--   before insert on auth.users
--   for each row execute function public.enforce_company_domain();
