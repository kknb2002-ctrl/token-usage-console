/* =========================================================
   datasource.js — 데이터 공급 계층
   ---------------------------------------------------------
   두 가지 모드를 같은 인터페이스로 제공합니다.

   1) DEMO  : 브라우저 안에서 호출 이벤트를 시뮬레이션 (기본)
   2) REMOTE: 자체 백엔드 프록시에서 실제 사용량을 폴링
              → fetchRemote() 하나만 구현하면 실데이터로 전환됩니다.

   ※ 브라우저에서 Anthropic/OpenAI/Google API를 직접 호출하면
     (a) API 키가 사용자에게 그대로 노출되고 (b) CORS로 차단됩니다.
     반드시 서버를 한 단계 두세요.

   [토큰 소모 여부]
   · DEMO  : 브라우저 안에서 숫자를 만들어낼 뿐, 네트워크 요청 자체가 없습니다. 토큰 0.
   · REMOTE: 조회하는 것은 '사용량 집계 API'라서 모델 추론이 일어나지 않습니다.
             즉 토큰을 소모하지 않고 과금도 되지 않습니다. 다만 요청 수 제한(rate limit)은
             있으므로 폴링 주기를 60초 이상으로 두고, 서버에서 캐시하는 것을 권장합니다.
             (집계 API는 보통 분~시간 단위 지연이 있어 더 자주 불러도 값이 바뀌지 않습니다)
   ========================================================= */
const Datasource = {
  BACKEND: '',          // 예: 'http://localhost:8787'  (비어 있으면 DEMO 모드)
  POLL_DEMO_MS: 2000,   // 로컬 시뮬레이션 — 네트워크 요청 없음
  POLL_REMOTE_MS: 60000,// 실서버 폴링 — 집계 API 지연/요청 제한을 고려해 1분
  _timer: null,
  _lastTs: null,
  _onData: null,

  get mode() { return this.BACKEND ? 'REMOTE' : 'DEMO'; },
  get interval() { return this.BACKEND ? this.POLL_REMOTE_MS : this.POLL_DEMO_MS; },

  start(onData) {
    this._onData = onData;
    this.stop();
    this._timer = setInterval(() => this.tick(), this.interval);
  },
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  },

  async tick() {
    try {
      const rows = this.BACKEND ? await this.fetchRemote() : this.generateDemo();
      if (rows.length) {
        this._lastTs = rows[rows.length - 1].ts;
        this._onData(rows);
      }
    } catch (e) {
      console.error('[datasource] 수집 실패:', e);
    }
  },

  /* ---------- REMOTE: 여기만 프로젝트에 맞게 구현 ---------- */
  async fetchRemote() {
    const qs = this._lastTs ? `?since=${encodeURIComponent(this._lastTs)}` : '';
    const res = await fetch(`${this.BACKEND}/api/usage${qs}`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'include'          // 세션 쿠키로 인증 (키는 서버 보관)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return rows.map(r => this.normalize(r));
  },

  /** 서버 응답 → 내부 이벤트 형태로 정규화 */
  normalize(r) {
    return {
      id: r.id || `${r.ts}-${Math.random().toString(36).slice(2, 8)}`,
      ts: r.ts,
      provider: r.provider,
      model: r.model,
      kind: r.kind || 'chat',
      input: Number(r.input) || 0,
      output: Number(r.output) || 0,
      cache: Number(r.cache) || 0,
      status: r.status || 'ok'
    };
  },

  /* ---------- DEMO: 시뮬레이션 ---------- */
  generateDemo() {
    // 연결된 계정이 있으면 그 제공자만, 없으면 전체를 데모로 보여준다
    const pool = Store.connectedIds();
    const targets = pool.length ? pool : PROVIDER_IDS;
    const count = 1 + Math.floor(Math.random() * 3);   // tick당 1~3건
    const rows = [];
    for (let i = 0; i < count; i++) {
      const provider = targets[Math.floor(Math.random() * targets.length)];
      const models = Object.keys(MODEL_PRICING[provider]);
      const model = models[Math.floor(Math.random() * models.length)];
      const kind = WORK_KINDS[Math.floor(Math.random() * WORK_KINDS.length)];
      const heavy = kind === 'batch-job' || kind === 'agent-run';
      const input = rand(heavy ? 8000 : 400, heavy ? 60000 : 9000);
      const output = rand(120, heavy ? 6000 : 2200);
      const cache = Math.random() < 0.35 ? rand(500, 20000) : 0;
      const roll = Math.random();
      const status = roll > 0.97 ? 'error' : roll > 0.93 ? 'rate_limit' : 'ok';
      rows.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        ts: new Date().toISOString(),
        provider, model, kind,
        input, output: status === 'ok' ? output : 0,
        cache, status
      });
    }
    return rows;
  }
};

function rand(min, max) { return Math.floor(min + Math.random() * (max - min)); }
