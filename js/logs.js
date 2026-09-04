/* =========================================================
   logs.js — 전체 호출 로그 페이지 (index.html의 '전체 보기')
   대시보드와 같은 store/ui를 쓰고, 여기서는 페이지네이션만 더한다.
   ========================================================= */
const Logs = {
  page: 0,
  size: 50,
  newIds: new Set(),

  rows() { return Store.filtered(); },

  render() {
    const rows = this.rows();
    const pages = Math.max(1, Math.ceil(rows.length / this.size));
    this.page = Math.min(this.page, pages - 1);

    const start = this.page * this.size;
    const slice = rows.slice(start, start + this.size);

    UI.renderLog(slice, { limit: this.size, newIds: this.newIds });

    el('pageInfo').textContent = rows.length
      ? `${fmt.int(start + 1)}–${fmt.int(start + slice.length)} / 총 ${fmt.int(rows.length)}건 · ${this.page + 1} / ${pages} 페이지`
      : '기록 없음';
    el('prevPage').disabled = this.page === 0;
    el('nextPage').disabled = this.page >= pages - 1;

    const oldest = rows[rows.length - 1], newest = rows[0];
    el('rangeInfo').textContent = newest
      ? `${fmt.time(oldest.ts)} ~ ${fmt.time(newest.ts)} · 최대 ${Store.state.maxEvents}건까지 보관합니다.`
      : '보관 중인 호출 기록이 없습니다.';

    const live = Datasource.mode === 'REMOTE' && Store.connectedIds().length;
    const badge = el('modeBadge');
    badge.textContent = live ? 'LIVE 데이터' : 'DEMO 모드';
    badge.classList.toggle('is-live', !!live);
  },

  setLive(on) {
    Store.state.live = on;
    el('btnPause').textContent = on ? '일시정지' : '재개';
    el('liveDot').classList.toggle('is-paused', !on);
    el('liveText').textContent = on ? 'LIVE' : 'PAUSED';
    on ? Datasource.start(rows => {
      this.newIds = new Set(rows.map(r => r.id));
      Store.addEvents(rows);
    }) : Datasource.stop();
  },

  exportCSV() {
    const rows = this.rows();
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
    a.download = `erp-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  bind() {
    el('filterChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const set = Store.state.filters.providers, id = chip.dataset.chip;
      set.has(id) ? set.delete(id) : set.add(id);
      if (!set.size) set.add(id);
      this.page = 0;
      UI.renderChips();
      this.render();
    });

    el('search').addEventListener('input', e => {
      Store.state.filters.q = e.target.value;
      this.page = 0;
      this.render();
    });

    el('pageSize').addEventListener('change', e => {
      this.size = Number(e.target.value);
      this.page = 0;
      this.render();
    });

    el('prevPage').addEventListener('click', () => { this.page--; this.render(); window.scrollTo(0, 0); });
    el('nextPage').addEventListener('click', () => { this.page++; this.render(); window.scrollTo(0, 0); });
    el('btnPause').addEventListener('click', () => this.setLive(!Store.state.live));
    el('btnExport').addEventListener('click', () => this.exportCSV());
  },

  boot() {
    const me = Auth.guard();
    if (!me) return;
    Nav.render('logs');
    Store.init(me.id);
    Auth.mountChrome(me);
    this.size = Number(el('pageSize').value);
    this.bind();
    UI.renderChips();
    Store.subscribe(() => this.render());
    this.render();
    this.setLive(true);
  }
};

document.addEventListener('DOMContentLoaded', () => Logs.boot());
