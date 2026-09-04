/* =========================================================
   store.js — 앱 상태 / 사용자별 저장소 / 집계 계산
   ---------------------------------------------------------
   모든 데이터는 "로그인한 사용자 id" 로 네임스페이스가 나뉜다.
   · erp.accounts.<uid>  (localStorage) 연결 메타 — 조직ID·연결여부·끝 4자리
   · erp.vault.<uid>.<provider> (localStorage) API 키 암호문 {iv, ct}
   · erp.events.<uid>    (localStorage) 호출 로그 — 브라우저를 닫아도 유지
   키 원문은 어디에도 평문으로 저장되지 않는다. (js/auth.js 참고)
   ========================================================= */
const K = {
  accounts: uid => `erp.accounts.${uid}`,
  vault: (uid, p) => `erp.vault.${uid}.${p}`,
  events: uid => `erp.events.${uid}`
};

const Store = {
  uid: null,

  state: {
    live: true,
    events: [],
    maxEvents: 300,
    filters: { providers: new Set(PROVIDER_IDS), q: '' },
    accounts: null
  },

  /** 로그인 사용자로 저장소를 연다 */
  init(userId) {
    this.uid = userId;
    this.state.accounts = this.loadJSON(K.accounts(userId), {
      claude: { org: '', connected: false, last4: '' },
      gpt:    { org: '', connected: false, last4: '' },
      gemini: { org: '', connected: false, last4: '' }
    });
    this.state.events = this.loadEvents();
    this.reconcile();
    return this;
  },

  /* ---------- 저장 유틸 ---------- */
  loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : structuredClone(fallback);
    } catch (e) { return structuredClone(fallback); }
  },
  saveMeta() {
    try { localStorage.setItem(K.accounts(this.uid), JSON.stringify(this.state.accounts)); }
    catch (e) { console.warn('[store] 메타 저장 실패', e); }
  },
  loadEvents() {
    try {
      const raw = localStorage.getItem(K.events(this.uid));
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  persistEvents() {
    try { localStorage.setItem(K.events(this.uid), JSON.stringify(this.state.events)); }
    catch (e) { /* 용량 초과는 무시 */ }
  },

  /** 암호문이 사라진 계정은 연결 해제로 되돌린다 */
  reconcile() {
    let dirty = false;
    PROVIDER_IDS.forEach(id => {
      const a = this.state.accounts[id];
      if (a.connected && !localStorage.getItem(K.vault(this.uid, id))) {
        a.connected = false; a.last4 = ''; dirty = true;
      }
    });
    if (dirty) this.saveMeta();
  },

  listeners: [],
  subscribe(fn) { this.listeners.push(fn); },
  emit(reason) { this.listeners.forEach(fn => fn(this.state, reason)); },

  /* ---------- 이벤트 ---------- */
  addEvents(list) {
    if (!list.length) return;
    this.state.events.unshift(...list);
    if (this.state.events.length > this.state.maxEvents) {
      this.state.events.length = this.state.maxEvents;
    }
    this.persistEvents();
    this.emit('events');
  },
  clearEvents() {
    this.state.events = [];
    this.persistEvents();
    this.emit('events');
  },

  /* ---------- 계정 (키는 암호화해서 보관) ---------- */
  setOrg(id, org) { this.state.accounts[id].org = org; this.saveMeta(); },

  async connect(id, rawKey) {
    const payload = await Auth.encrypt(rawKey);              // 비밀번호 파생 키로 암호화
    localStorage.setItem(K.vault(this.uid, id), JSON.stringify(payload));
    const a = this.state.accounts[id];
    a.connected = true;
    a.last4 = rawKey.slice(-4);
    this.saveMeta();
    this.emit('accounts');
  },
  disconnect(id) {
    localStorage.removeItem(K.vault(this.uid, id));
    const a = this.state.accounts[id];
    a.connected = false; a.last4 = '';
    this.saveMeta();
    this.emit('accounts');
  },
  /** 실제 호출이 필요한 순간에만 복호화한다 (화면에는 절대 그리지 않는다) */
  async revealKey(id) {
    const raw = localStorage.getItem(K.vault(this.uid, id));
    if (!raw) throw new Error('저장된 키가 없습니다.');
    return Auth.decrypt(JSON.parse(raw));
  },
  connectedIds() {
    return PROVIDER_IDS.filter(id => this.state.accounts[id].connected);
  },

  /* ---------- 파생 계산 ---------- */
  priceOf(provider, model) {
    return (MODEL_PRICING[provider] && MODEL_PRICING[provider][model]) || { in: 0, out: 0 };
  },
  costOf(ev) {
    const p = this.priceOf(ev.provider, ev.model);
    // 캐시 읽기 토큰은 입력 단가의 10%로 가정 (실제 비율은 제공자마다 다름)
    return (ev.input * p.in + ev.output * p.out + ev.cache * p.in * 0.1) / 1e6;
  },
  totalOf(ev) { return ev.input + ev.output + ev.cache; },

  filtered() {
    const { providers, q } = this.state.filters;
    const needle = q.trim().toLowerCase();
    return this.state.events.filter(ev => {
      if (!providers.has(ev.provider)) return false;
      if (!needle) return true;
      return (ev.model + ' ' + ev.kind).toLowerCase().includes(needle);
    });
  },

  summary(events) {
    const base = () => ({ tokens: 0, cost: 0, calls: 0, errors: 0, input: 0, output: 0 });
    const out = { _all: base() };
    PROVIDER_IDS.forEach(id => (out[id] = base()));
    events.forEach(ev => {
      const bucket = out[ev.provider];
      const cost = this.costOf(ev), total = this.totalOf(ev);
      [bucket, out._all].forEach(b => {
        b.tokens += total; b.cost += cost; b.calls += 1;
        b.input += ev.input; b.output += ev.output;
        if (ev.status !== 'ok') b.errors += 1;
      });
    });
    return out;
  },

  series(events, minutes = 15) {
    const start = Math.floor(Date.now() / 60000) * 60000 - (minutes - 1) * 60000;
    const buckets = [];
    for (let i = 0; i < minutes; i++) {
      const row = { t: start + i * 60000, total: 0 };
      PROVIDER_IDS.forEach(id => (row[id] = 0));
      buckets.push(row);
    }
    events.forEach(ev => {
      const idx = Math.floor((new Date(ev.ts).getTime() - start) / 60000);
      if (idx < 0 || idx >= minutes) return;
      const total = this.totalOf(ev);
      buckets[idx][ev.provider] += total;
      buckets[idx].total += total;
    });
    return buckets;
  }
};
