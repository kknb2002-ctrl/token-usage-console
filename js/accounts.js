/* =========================================================
   accounts.js — 계정 연결 전용 페이지
   키 원문은 입력 즉시 암호화하고, DOM에는 남기지 않는다.
   ========================================================= */
const el = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const Accounts = {
  render() {
    el('accountGrid').innerHTML = PROVIDER_IDS.map(id => {
      const p = PROVIDERS[id], a = Store.state.accounts[id];

      const body = a.connected ? `
        <div class="key-view">
          <span class="key-mask">${'•'.repeat(16)}${esc(a.last4)}</span>
          <span class="badge ok">연결됨</span>
        </div>
        <div class="store-line">🔒 암호화되어 저장됨 · 내 비밀번호로만 열립니다</div>
        <div class="acard-actions">
          <button class="btn btn-sm" data-disconnect="${id}">연결 해제 · 키 삭제</button>
        </div>`
      : `
        <div class="field">
          <label>API 키</label>
          <div class="key-input">
            <input class="input" type="password" data-key="${id}" autocomplete="off"
                   spellcheck="false" placeholder="${esc(p.keyPrefix)}…" />
            <button class="eye" data-reveal="${id}" title="잠깐 보기" aria-label="키 보기">👁</button>
          </div>
        </div>
        <div class="acard-actions">
          <button class="btn btn-primary btn-sm" data-connect="${id}">연결</button>
        </div>`;

      return `
        <div class="acard ${a.connected ? 'is-on' : ''}">
          <h3><span class="pdot" style="background:${p.color}"></span>${p.name}
            <span class="muted" style="font-weight:400;font-size:12px">${p.vendor}</span></h3>
          <p class="hint">${p.hint}</p>
          <div class="field">
            <label>조직 / 프로젝트 ID (선택)</label>
            <input class="input" type="text" data-org="${id}" value="${esc(a.org)}" placeholder="org_…" />
          </div>
          ${body}
          <a class="pre-link" href="${p.docs}" target="_blank" rel="noreferrer">API 문서 ↗</a>
        </div>`;
    }).join('');
  },

  renderUsers(me) {
    if (me.role !== 'admin') return;
    el('adminPanel').hidden = false;
    el('userBody').innerHTML = Auth.list().map(u => `
      <tr>
        <td>${esc(u.name)}${u.id === me.id ? ' <span class="muted">(나)</span>' : ''}</td>
        <td class="muted">@${esc(u.username)}</td>
        <td>${u.role === 'admin' ? '<span class="badge ok">관리자</span>' : '직원'}</td>
        <td class="muted">${new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
      </tr>`).join('');
  },

  bind() {
    const grid = el('accountGrid');

    grid.addEventListener('input', e => {
      if (e.target.dataset.org) Store.setOrg(e.target.dataset.org, e.target.value);
    });

    grid.addEventListener('click', async e => {
      // 잠깐 보기 — 3초 후 자동으로 다시 가림
      const reveal = e.target.closest('[data-reveal]');
      if (reveal) {
        const input = grid.querySelector(`[data-key="${reveal.dataset.reveal}"]`);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        if (!showing) setTimeout(() => { input.type = 'password'; }, 3000);
        return;
      }

      const connect = e.target.closest('[data-connect]');
      if (connect) {
        const id = connect.dataset.connect;
        const input = grid.querySelector(`[data-key="${id}"]`);
        const raw = (input.value || '').trim();
        if (!raw) { alert('API 키를 입력하세요.'); input.focus(); return; }
        connect.disabled = true; connect.textContent = '암호화 중…';
        try {
          await Store.connect(id, raw);
          input.value = '';                       // 원문을 DOM에 남기지 않는다
          this.render();
        } catch (err) {
          alert(err.message);
          connect.disabled = false; connect.textContent = '연결';
        }
        return;
      }

      const disconnect = e.target.closest('[data-disconnect]');
      if (disconnect) {
        const id = disconnect.dataset.disconnect;
        if (!confirm(`${PROVIDERS[id].name} 키를 삭제할까요? 되돌릴 수 없습니다.`)) return;
        Store.disconnect(id);
        this.render();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const me = Auth.guard();
  if (!me) return;
  Nav.render('accounts');
  Store.init(me.id);
  Auth.mountChrome(me);
  el('whoami').textContent =
    `${me.name} 님의 LLM 계정입니다. 등록한 키는 본인 비밀번호로 암호화되어 다른 직원이 열 수 없습니다.`;
  Accounts.bind();
  Accounts.render();
  Accounts.renderUsers(me);
});
