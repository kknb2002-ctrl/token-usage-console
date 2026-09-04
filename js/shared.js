/* =========================================================
   shared.js — 공용(회사 전체) 데이터 페이지: 미팅 / 마케팅
   ---------------------------------------------------------
   공용 데이터는 저장소의 data/*.json 을 읽는다.
   · 누구나 같은 값을 본다 (GitHub에 올린 그대로가 진실)
   · 수정은 파일을 고쳐 커밋 → 배포되면 전원에게 반영
   · 화면에서 직접 수정하려면 백엔드가 필요하다 (DEPLOY.md 참고)
   ※ file:// 로 열면 브라우저가 JSON 읽기를 막으므로 로컬 서버로 여세요.
   ========================================================= */
const el = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const won = n => '₩' + Number(n).toLocaleString('ko-KR');

const STATUS_CLASS = { '진행중': 'ok', '예정': 'limit', '완료': 'ok', '종료': '' };

const SharedPage = {
  async load(file) {
    const res = await fetch(file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${file} 를 불러오지 못했습니다 (HTTP ${res.status})`);
    return res.json();
  },

  fail(err) {
    el('content').innerHTML = `
      <div class="notice">
        <strong>공용 데이터를 불러오지 못했습니다</strong>
        <p>${esc(err.message)}</p>
        <p><code>file://</code> 로 열면 브라우저가 JSON 읽기를 차단합니다.
           터미널에서 <code>python3 -m http.server 5173</code> 을 실행하고
           <code>http://localhost:5173</code> 로 여세요.</p>
      </div>`;
  },

  stamp(data) {
    el('stamp').textContent = `공용 데이터 · 최종 수정 ${data.updatedAt}`;
  },

  /* ---------- 미팅 ---------- */
  renderMeetings(data) {
    const rows = data.items.map(m => `
      <tr>
        <td class="muted">${esc(m.date)}</td>
        <td><b>${esc(m.title)}</b></td>
        <td>${esc(m.owner)}</td>
        <td class="num">${m.attendees}명</td>
        <td class="muted">${esc(m.place)}</td>
        <td><span class="badge ${STATUS_CLASS[m.status] || ''}">${esc(m.status)}</span></td>
      </tr>`).join('');

    const upcoming = data.items.filter(m => m.status === '예정').length;
    el('content').innerHTML = `
      ${this.kpis([
        { label: '예정된 미팅', value: upcoming + '건', color: 'var(--accent)' },
        { label: '전체 기록', value: data.items.length + '건', color: 'var(--tx-3)' },
        { label: '가장 가까운 일정', value: (data.items.find(m => m.status === '예정') || {}).date || '–', color: 'var(--ok)' }
      ])}
      <div class="panel">
        <div class="panel-head"><h2>미팅 일정</h2><span class="muted" id="stamp"></span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>일시</th><th>제목</th><th>주관</th><th class="num">참석</th><th>장소</th><th>상태</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${this.editFoot('data/meetings.json')}
      </div>`;
    this.stamp(data);
  },

  /* ---------- 마케팅 ---------- */
  renderMarketing(data) {
    const rows = data.items.map(c => {
      const pct = c.budget ? Math.round((c.spent / c.budget) * 100) : 0;
      return `
        <tr>
          <td><b>${esc(c.name)}</b></td>
          <td class="muted">${esc(c.channel)}</td>
          <td>${esc(c.owner)}</td>
          <td class="muted">${esc(c.period)}</td>
          <td class="num">${won(c.budget)}</td>
          <td class="num">${won(c.spent)}
            <div class="mini-bar"><i style="width:${Math.min(100, pct)}%;
              background:${pct > 95 ? 'var(--err)' : 'var(--accent)'}"></i></div>
          </td>
          <td><span class="badge ${STATUS_CLASS[c.status] || ''}">${esc(c.status)}</span></td>
        </tr>`;
    }).join('');

    const budget = data.items.reduce((s, c) => s + c.budget, 0);
    const spent = data.items.reduce((s, c) => s + c.spent, 0);
    const running = data.items.filter(c => c.status === '진행중').length;

    el('content').innerHTML = `
      ${this.kpis([
        { label: '총 예산', value: won(budget), color: 'var(--accent)' },
        { label: '집행액', value: won(spent), sub: `소진율 ${Math.round((spent / budget) * 100)}%`, color: 'var(--ok)' },
        { label: '진행 중 캠페인', value: running + '건', color: 'var(--warn)' }
      ])}
      <div class="panel">
        <div class="panel-head"><h2>캠페인</h2><span class="muted" id="stamp"></span></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>캠페인</th><th>채널</th><th>담당</th><th>기간</th>
              <th class="num">예산</th><th class="num">집행</th><th>상태</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${this.editFoot('data/marketing.json')}
      </div>`;
    this.stamp(data);
  },

  kpis(cards) {
    return `<div class="kpi-grid">${cards.map(c => `
      <div class="kpi" style="--accent:${c.color}">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
        ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ''}
      </div>`).join('')}</div>`;
  },

  editFoot(path) {
    return `<div class="panel-foot">
      <span class="muted">수정하려면 <code>${path}</code> 을 고쳐 커밋하세요 — 배포되면 전원에게 반영됩니다.</span>
    </div>`;
  },

  async boot(kind) {
    const me = Auth.guard();
    if (!me) return;
    Nav.render(kind);
    Auth.mountChrome(me);
    el('modeBadge').textContent = '공용 데이터';
    try {
      const data = await this.load(kind === 'meetings' ? 'data/meetings.json' : 'data/marketing.json');
      kind === 'meetings' ? this.renderMeetings(data) : this.renderMarketing(data);
    } catch (err) {
      this.fail(err);
    }
  }
};
