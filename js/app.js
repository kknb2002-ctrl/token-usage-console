/* =========================================================
   app.js — 부트 / 이벤트 바인딩 / 렌더
   ========================================================= */
const PREVIEW_ROWS = 8;     // 메인에는 최신 8건만, 나머지는 logs.html
let newIds = new Set();     // 방금 들어온 행 하이라이트용

function render() {
  const rows = Store.filtered();
  const sum = Store.summary(rows);
  UI.renderKpis(sum, rows);
  UI.renderChart(Store.series(rows, 15));
  UI.renderProviders(sum);
  UI.renderLog(rows, { limit: PREVIEW_ROWS, newIds });
  el('logCount').textContent =
    `최신 ${Math.min(PREVIEW_ROWS, rows.length)}건 표시 · 보관 중 ${fmt.int(rows.length)}건`;

  const live = Datasource.mode === 'REMOTE' && Store.connectedIds().length;
  const badge = el('modeBadge');
  badge.textContent = live ? 'LIVE 데이터' : 'DEMO 모드';
  badge.classList.toggle('is-live', !!live);
}

/* ---------------- 수집 토글 ---------------- */
function setLive(on) {
  Store.state.live = on;
  el('btnPause').textContent = on ? '일시정지' : '재개';
  el('liveDot').classList.toggle('is-paused', !on);
  el('liveText').textContent = on ? 'LIVE' : 'PAUSED';
  on ? Datasource.start(onIncoming) : Datasource.stop();
}
function onIncoming(rows) {
  newIds = new Set(rows.map(r => r.id));
  Store.addEvents(rows);
}

/* ---------------- CSV (키는 포함하지 않는다) ---------------- */
function exportCSV() {
  const rows = Store.filtered();
  if (!rows.length) { alert('내보낼 데이터가 없습니다.'); return; }
  const head = ['시각', '제공자', '모델', '작업', '입력', '출력', '캐시', '합계', '비용USD', '상태'];
  const body = rows.map(ev => [
    new Date(ev.ts).toISOString(), ev.provider, ev.model, ev.kind,
    ev.input, ev.output, ev.cache, Store.totalOf(ev),
    Store.costOf(ev).toFixed(6), ev.status
  ]);
  const csv = '﻿' + [head, ...body]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `erp-usage-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- 이벤트 바인딩 ---------------- */
function bind() {
  el('btnPause').addEventListener('click', () => setLive(!Store.state.live));
  el('btnClear').addEventListener('click', () => Store.clearEvents());
  el('btnExport').addEventListener('click', exportCSV);

  // 제공자 필터 (차트 범례 겸용)
  el('filterChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const set = Store.state.filters.providers, id = chip.dataset.chip;
    set.has(id) ? set.delete(id) : set.add(id);
    if (!set.size) set.add(id);                 // 최소 1개는 유지
    UI.renderChips();
    render();
  });

  window.addEventListener('resize', () => UI.renderChart(Store.series(Store.filtered(), 15)));
}

/* ---------------- 부트 ---------------- */
function boot() {
  const me = Auth.guard();          // 로그인하지 않았으면 login.html로
  if (!me) return;
  Nav.render('usage');
  Store.init(me.id);                // 내 데이터만 열린다
  Auth.mountChrome(me);
  bind();
  UI.renderChips();
  Store.subscribe(() => render());

  // 첫 진입일 때만 최근 15분치 시드 데이터를 넣는다
  // (기록은 sessionStorage에 남아 있으므로 페이지를 오갈 때 중복 생성하지 않는다)
  if (!Store.state.events.length) {
    const seed = [];
    for (let i = 0; i < 40; i++) {
      Datasource.generateDemo().forEach(ev => {
        ev.ts = new Date(Date.now() - Math.random() * 14 * 60000).toISOString();
        seed.push(ev);
      });
    }
    seed.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    Store.addEvents(seed);
  }

  render();
  setLive(true);
}

document.addEventListener('DOMContentLoaded', boot);
