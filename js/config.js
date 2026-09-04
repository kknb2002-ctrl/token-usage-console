/* =========================================================
   config.js — 제공자 정의 / 모델 / 참고 단가
   ⚠️ 이 파일에는 API 키를 절대 넣지 마세요. (GitHub에 그대로 공개됩니다)
      키는 화면 맨 아래 [계정 연결]에서 입력하며 브라우저에만 보관됩니다.
   ========================================================= */
const PROVIDERS = {
  claude: {
    id: 'claude', name: 'Claude', vendor: 'Anthropic', color: '#d97757',
    keyPrefix: 'sk-ant-',
    hint: '조직 사용량은 Admin API(관리자 키)로 조회합니다.',
    docs: 'https://docs.claude.com/en/api/admin-api/usage-cost/get-messages-usage-report'
  },
  gpt: {
    id: 'gpt', name: 'GPT', vendor: 'OpenAI', color: '#10a37f',
    keyPrefix: 'sk-',
    hint: 'Usage / Costs API는 조직 Admin 키가 필요합니다.',
    docs: 'https://platform.openai.com/docs/api-reference/usage'
  },
  gemini: {
    id: 'gemini', name: 'Gemini', vendor: 'Google', color: '#4285f4',
    keyPrefix: 'AIza',
    hint: '응답의 usageMetadata를 직접 적재해 집계합니다.',
    docs: 'https://ai.google.dev/gemini-api/docs'
  }
};

const PROVIDER_IDS = Object.keys(PROVIDERS);

/* 모델별 참고 단가 (USD / 1,000,000 tokens)
   비용 열은 "대략 이 정도" 감을 잡기 위한 추정치입니다.
   정확한 청구액은 각 사 콘솔에서 확인하고, 필요하면 아래 숫자를 직접 고치세요. */
const MODEL_PRICING = {
  claude: {
    'claude-opus-5':    { in: 15,   out: 75   },
    'claude-sonnet-5':  { in: 3,    out: 15   },
    'claude-haiku-4-5': { in: 1,    out: 5    }
  },
  gpt: {
    'gpt-5':      { in: 5,    out: 15   },
    'gpt-5-mini': { in: 0.6,  out: 2.4  },
    'o-series':   { in: 2,    out: 8    }
  },
  gemini: {
    'gemini-2.5-pro':   { in: 1.25, out: 10  },
    'gemini-2.5-flash': { in: 0.3,  out: 2.5 }
  }
};

/* 로그에 표시되는 작업(호출 목적) 종류 */
const WORK_KINDS = ['chat', 'code-gen', 'summarize', 'embed-search', 'batch-job', 'agent-run'];

/* =========================================================
   사이드바 메뉴 — 메뉴를 늘릴 때는 여기에 한 줄만 추가하면
   모든 페이지의 사이드바에 동시에 반영된다. (js/nav.js가 그린다)
     scope: 'personal' 내 데이터(브라우저에만)  |  'shared' 공용 데이터(저장소 파일)
   ========================================================= */
const NAV = [
  { group: '내 사용량', items: [
    { id: 'usage',     label: '토큰 사용량',    icon: '📊', href: 'index.html',     scope: 'personal' },
    { id: 'logs',      label: '전체 호출 로그', icon: '🧾', href: 'logs.html',      scope: 'personal' }
  ]},
  { group: '공용', items: [
    { id: 'meetings',  label: '미팅',           icon: '📅', href: 'meetings.html',  scope: 'shared' },
    { id: 'marketing', label: '마케팅',         icon: '📣', href: 'marketing.html', scope: 'shared' }
  ]}
];

/* 사이드바 가장 아래 (구분선 아래) */
const NAV_BOTTOM = [
  { id: 'accounts', label: '계정 연결', icon: '🔐', href: 'accounts.html', scope: 'personal' }
];
