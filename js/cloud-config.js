/* =========================================================
   cloud-config.js — Supabase 연결 설정
   ---------------------------------------------------------
   Supabase 대시보드 → Project Settings → Data API 에서 복사해 채우세요.
   · URL      : https://xxxxxxxx.supabase.co
   · ANON KEY : 브라우저에 노출되도록 설계된 공개 키입니다(비밀이 아님).
                실제 보안은 DB의 RLS 정책이 담당합니다 → supabase/schema.sql
   두 값이 비어 있으면 지금처럼 이 PC 안에서만 도는 LOCAL 모드로 동작합니다.
   ========================================================= */
const CLOUD = {
  URL: '',
  ANON_KEY: ''
};

CLOUD.enabled = !!(CLOUD.URL && CLOUD.ANON_KEY);
