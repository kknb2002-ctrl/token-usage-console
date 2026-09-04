/* =========================================================
   auth.js — 로그인 / 비밀번호 기반 키 금고(vault)
   ---------------------------------------------------------
   [설계]
   · 비밀번호는 저장하지 않는다. PBKDF2-SHA256(210,000회)로 만든
     검증값(verifier)만 저장하고, 로그인 때 다시 계산해 비교한다.
   · API 키는 "비밀번호에서 파생한 별도의 AES-GCM 키"로 암호화해서 보관한다.
     → 저장소를 열어봐도 암호문뿐이고, 다른 직원이 자기 계정으로 로그인해도
       남의 키는 복호화할 수 없다.
   · 복호화용 키는 기본적으로 sessionStorage에만 두며 탭을 닫으면 사라진다(자동 잠금).
     "이 PC에서 로그인 유지"를 켜면 localStorage로 옮겨 14일간 유지된다.
     편의를 얻는 대신, 그 PC를 쓰는 사람은 브라우저를 다시 열어도 내 키를 쓸 수 있다.

   [한계 — 반드시 알고 쓸 것]
   같은 맥에서 "내가 로그인한 상태로" 자리를 비우면 그 사람은 내 키를 볼 수 있다.
   진짜 다중 사용자 보안은 서버가 필요하다. SECURITY.md 참고.
   ========================================================= */
const Auth = {
  ITER: 210000,
  REMEMBER_DAYS: 14,
  K_USERS: 'erp.users.v1',
  K_SESSION: 'erp.session.v1',
  K_VAULTKEY: 'erp.vaultkey.v1',

  /* ---------- 세션 저장소 선택 ----------
     remember=true → localStorage(재부팅해도 유지) / false → sessionStorage(탭 닫으면 소멸) */
  store(remember) { return remember ? localStorage : sessionStorage; },
  clearSession() {
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(this.K_SESSION);
      s.removeItem(this.K_VAULTKEY);
    });
  },
  readSession() {
    for (const s of [sessionStorage, localStorage]) {
      try {
        const raw = s.getItem(this.K_SESSION);
        if (!raw) continue;
        const sess = JSON.parse(raw);
        if (sess.exp && Date.now() > sess.exp) { this.clearSession(); return null; }
        return sess;
      } catch (e) { /* 다음 저장소 */ }
    }
    return null;
  },

  /* ---------- 환경 ---------- */
  available() { return !!(window.crypto && window.crypto.subtle); },

  /* ---------- 유틸 ---------- */
  rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; },
  b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); },
  ub64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); },

  async pbkdf2(password, salt, bits) {
    const base = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: this.ITER, hash: 'SHA-256' }, base, bits);
  },

  /* ---------- 사용자 저장소 ---------- */
  users() {
    try { return JSON.parse(localStorage.getItem(this.K_USERS) || '{}'); }
    catch (e) { return {}; }
  },
  saveUsers(u) { localStorage.setItem(this.K_USERS, JSON.stringify(u)); },
  isEmpty() { return Object.keys(this.users()).length === 0; },
  list() {
    return Object.values(this.users())
      .map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, createdAt: u.createdAt }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /* ---------- 가입 ---------- */
  async register(username, password, name) {
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,20}$/.test(username)) throw new Error('아이디는 영문·숫자 3~20자로 입력하세요.');
    if (password.length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다.');

    const users = this.users();
    if (users[username]) throw new Error('이미 사용 중인 아이디입니다.');

    const pwSalt = this.rand(16);      // 비밀번호 검증용
    const vaultSalt = this.rand(16);   // 키 암호화용 (분리)
    const verifier = await this.pbkdf2(password, pwSalt, 256);

    users[username] = {
      id: 'u_' + this.b64(this.rand(9)).replace(/[^a-zA-Z0-9]/g, ''),
      username,
      name: name.trim() || username,
      role: this.isEmpty() ? 'admin' : 'member',   // 첫 사용자가 관리자
      pwSalt: this.b64(pwSalt),
      vaultSalt: this.b64(vaultSalt),
      verifier: this.b64(verifier),
      createdAt: new Date().toISOString()
    };
    this.saveUsers(users);
    return users[username];
  },

  /* ---------- 로그인 ---------- */
  async login(username, password, remember = true) {
    const u = this.users()[username.trim().toLowerCase()];
    const fail = new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
    if (!u) { await this.pbkdf2(password, this.rand(16), 256); throw fail; }  // 타이밍 노출 방지

    const verifier = this.b64(await this.pbkdf2(password, this.ub64(u.pwSalt), 256));
    if (verifier !== u.verifier) throw fail;

    // 금고 키는 비밀번호에서만 나온다 — 원문 비밀번호는 저장되지 않는다
    const vaultBits = await this.pbkdf2(password, this.ub64(u.vaultSalt), 256);
    this.clearSession();
    const store = this.store(remember);
    store.setItem(this.K_VAULTKEY, this.b64(vaultBits));
    store.setItem(this.K_SESSION, JSON.stringify({
      id: u.id, username: u.username, name: u.name, role: u.role,
      at: Date.now(),
      remember,
      exp: remember ? Date.now() + this.REMEMBER_DAYS * 864e5 : null
    }));
    return u;
  },

  logout() {
    this.clearSession();
    location.replace('login.html');
  },

  current() { return this.readSession(); },

  /** 로그인 안 했으면 로그인 페이지로 보낸다 */
  guard() {
    const me = this.current();
    if (!me) { location.replace('login.html'); return null; }
    return me;
  },

  /* ---------- 금고 (AES-GCM) ---------- */
  async vaultKey() {
    if (!this.readSession()) throw new Error('세션이 만료되었습니다. 다시 로그인하세요.');
    const raw = sessionStorage.getItem(this.K_VAULTKEY) || localStorage.getItem(this.K_VAULTKEY);
    if (!raw) throw new Error('세션이 만료되었습니다. 다시 로그인하세요.');
    return crypto.subtle.importKey('raw', this.ub64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
  },
  async encrypt(text) {
    const key = await this.vaultKey();
    const iv = this.rand(12);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    return { iv: this.b64(iv), ct: this.b64(ct) };
  },
  async decrypt(payload) {
    const key = await this.vaultKey();
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.ub64(payload.iv) }, key, this.ub64(payload.ct));
    return new TextDecoder().decode(pt);
  },

  /* ---------- 공통 사이드바 하단(사용자 칩) ---------- */
  mountChrome(me) {
    const box = document.getElementById('userChip');
    if (!box) return;
    const initial = (me.name || me.username).slice(0, 1).toUpperCase();
    box.innerHTML = `
      <div class="uc-avatar">${initial}</div>
      <div class="uc-body">
        <div class="uc-name">${me.name}</div>
        <div class="uc-role">${me.role === 'admin' ? '관리자' : '직원'} · @${me.username}</div>
      </div>
      <button class="uc-out" id="btnLogout" title="로그아웃" aria-label="로그아웃">⏻</button>`;
    document.getElementById('btnLogout').addEventListener('click', () => {
      if (confirm('로그아웃하면 이 PC에서 저장된 로그인 상태와 키 잠금이 해제됩니다. 계속할까요?')) Auth.logout();
    });
  }
};
