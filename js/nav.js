/* =========================================================
   nav.js — 모든 페이지가 공유하는 사이드바
   config.js의 NAV / NAV_BOTTOM 을 읽어 그린다.
   페이지에는 <aside class="sidebar" id="sidebar"></aside> 만 두면 된다.
   ========================================================= */
const Nav = {
  render(currentId) {
    const item = it => `
      <a class="nav-item${it.id === currentId ? ' is-active' : ''}" href="${it.href}">
        <span class="ico">${it.icon}</span>${it.label}
        ${it.scope === 'shared' ? '<span class="nav-tag" title="회사 공용 데이터">공용</span>' : ''}
      </a>`;

    document.getElementById('sidebar').innerHTML = `
      <div class="brand">
        <div class="brand-mark">E</div>
        <div>
          <div class="brand-name">ERP</div>
          <div class="brand-sub">사내 대시보드</div>
        </div>
      </div>

      <nav class="nav">
        ${NAV.map(g => `<div class="nav-group">${g.group}</div>${g.items.map(item).join('')}`).join('')}
      </nav>

      <div class="sidebar-foot">
        <div class="mode-badge" id="modeBadge">DEMO 모드</div>
        ${NAV_BOTTOM.map(item).join('')}
        <div class="user-chip" id="userChip"></div>
      </div>`;
  }
};
