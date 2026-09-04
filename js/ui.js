/* =========================================================
   ui.js — 렌더링 (KPI / 차트 / 제공자 요약 / 호출 로그) — 페이지 공용
   ※ 계정 카드에는 키 원문을 넣지 않는다. 마스킹된 문자열만 그린다.
   ========================================================= */
const fmt = {
  int: n => Math.round(n).toLocaleString('ko-KR'),
  tok: n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M'
          : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n)),
  usd: n => '$' + (n < 1 ? n.toFixed(4) : n.toFixed(2)),
  time: ts => new Date(ts).toLocaleTimeString('ko-KR', { hour12: false }),
  hhmm: t => new Date(t).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
};
const el = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  /* ---------- KPI ---------- */
  renderKpis(sum, events) {
    const all = sum._all;
    const avgOut = all.calls ? all.output / all.calls : 0;
    const errRate = all.calls ? (all.errors / all.calls) * 100 : 0;
    const cards = [
      { label: '총 토큰 (세션 누적)', value: fmt.tok(all.tokens), sub: `입력 ${fmt.tok(all.input)} · 출력 ${fmt.tok(all.output)}`, color: 'var(--accent)' },
      { label: '누적 예상 비용',      value: fmt.usd(all.cost),   sub: `참고 단가 기준 · ${fmt.int(all.calls)}건`, color: 'var(--ok)' },
      { label: '분당 호출',           value: this.perMinute(events).toFixed(1), sub: '최근 5분 평균', color: '#8b5cf6' },
      { label: '평균 응답 토큰',      value: fmt.int(avgOut),     sub: '호출당 출력 토큰', color: 'var(--warn)' },
      { label: '오류율',              value: errRate.toFixed(1) + '%', sub: `실패 ${fmt.int(all.errors)}건`, color: errRate > 5 ? 'var(--err)' : 'var(--tx-3)' }
    ];
    el('kpiGrid').innerHTML = cards.map(c => `
      <div class="kpi" style="--accent:${c.color}">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`).join('');
  },
  perMinute(events) {
    const cut = Date.now() - 5 * 60000;
    return events.filter(e => new Date(e.ts).getTime() >= cut).length / 5;
  },

  /* ---------- 차트 ---------- */
  renderChart(series) {
    const canvas = el('chart'), ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padL = 48, padR = 10, padT = 12, padB = 24;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const max = Math.max(1, ...series.map(s => s.total));
    const nice = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / nice) * nice;

    ctx.font = '10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = padT + plotH - (plotH * i) / 4;
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#6b7688';
      ctx.fillText(fmt.tok((top * i) / 4), padL - 8, y);
    }

    const bw = plotW / series.length;
    const inner = Math.max(3, bw * 0.62);
    series.forEach((row, i) => {
      const x = padL + i * bw + (bw - inner) / 2;
      let y = padT + plotH;
      PROVIDER_IDS.forEach(pid => {
        const v = row[pid];
        if (!v) return;
        const bh = (v / top) * plotH;
        y -= bh;
        ctx.fillStyle = PROVIDERS[pid].color;
        ctx.fillRect(x, y, inner, bh);
      });
      if (i % 3 === 0) {
        ctx.fillStyle = '#6b7688'; ctx.textAlign = 'center';
        ctx.fillText(fmt.hhmm(row.t), x + inner / 2, h - 10);
        ctx.textAlign = 'right';
      }
    });

  },

  /* ---------- 제공자별 요약 ---------- */
  renderProviders(sum) {
    const max = Math.max(1, ...PROVIDER_IDS.map(id => sum[id].tokens));
    el('providerGrid').innerHTML = PROVIDER_IDS.map(id => {
      const p = PROVIDERS[id], s = sum[id];
      const on = Store.state.accounts[id].connected;
      return `
        <div class="pcard">
          <div class="pcard-top">
            <div class="pname"><span class="pdot" style="background:${p.color}"></span>${p.name}
              <span class="muted" style="font-weight:400">${p.vendor}</span></div>
            <span class="conn ${on ? 'on' : 'off'}">${on ? '● 연결됨' : '○ 미연결'}</span>
          </div>
          <div class="pstat"><span>토큰</span><b>${fmt.int(s.tokens)}</b></div>
          <div class="pstat"><span>호출</span><b>${fmt.int(s.calls)}건</b></div>
          <div class="pstat"><span>예상 비용</span><b>${fmt.usd(s.cost)}</b></div>
          <div class="bar"><i style="width:${(s.tokens / max) * 100}%; background:${p.color}"></i></div>
        </div>`;
    }).join('');
    el('summaryStamp').textContent = '갱신 ' + fmt.time(Date.now());
  },

  /* ---------- 호출 로그 ---------- */
  renderLog(rows, opts) {
    const { limit = 8, newIds = new Set(), bodyId = 'logBody', emptyId = 'logEmpty' } = opts || {};
    const empty = el(emptyId);
    if (empty) empty.hidden = rows.length > 0;
    el(bodyId).innerHTML = rows.slice(0, limit).map(ev => {
      const p = PROVIDERS[ev.provider];
      const badge = ev.status === 'ok' ? '<span class="badge ok">정상</span>'
                  : ev.status === 'rate_limit' ? '<span class="badge limit">한도</span>'
                  : '<span class="badge err">오류</span>';
      return `<tr class="${newIds.has(ev.id) ? 'row-new' : ''}">
        <td class="muted">${fmt.time(ev.ts)}</td>
        <td><span class="tag"><span class="pdot" style="background:${p.color}"></span>${p.name}</span></td>
        <td>${esc(ev.model)}</td>
        <td class="muted">${esc(ev.kind)}</td>
        <td class="num">${fmt.int(ev.input)}</td>
        <td class="num">${fmt.int(ev.output)}</td>
        <td class="num muted">${ev.cache ? fmt.int(ev.cache) : '–'}</td>
        <td class="num"><b>${fmt.int(Store.totalOf(ev))}</b></td>
        <td class="num">${fmt.usd(Store.costOf(ev))}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  },

  renderChips() {
    el('filterChips').innerHTML = PROVIDER_IDS.map(id => {
      const on = Store.state.filters.providers.has(id);
      return `<button class="chip ${on ? 'is-on' : ''}" data-chip="${id}"
        style="${on ? `color:${PROVIDERS[id].color}` : ''}"><i></i>${PROVIDERS[id].name}</button>`;
    }).join('');
  }
};
