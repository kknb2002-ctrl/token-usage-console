/* =========================================================
   login.js — 로그인 / 직원 등록 화면
   ========================================================= */
const $ = id => document.getElementById(id);

function msg(text, kind) {
  const box = $('authMsg');
  box.hidden = !text;
  box.textContent = text || '';
  box.className = 'auth-msg' + (kind ? ' is-' + kind : '');
}

function showTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(b =>
    b.classList.toggle('is-on', b.dataset.tab === tab));
  $('formLogin').hidden = tab !== 'login';
  $('formSignup').hidden = tab !== 'signup';
  msg('');
}

function busy(form, on, label) {
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = on;
  btn.textContent = on ? '처리 중…' : label;
}

document.addEventListener('DOMContentLoaded', () => {
  // 암호화를 못 쓰는 환경이면 진행 불가
  if (!Auth.available()) {
    msg('이 브라우저에서는 암호화(WebCrypto)를 쓸 수 없습니다. http://localhost 로 열어주세요.', 'err');
    document.querySelectorAll('form button').forEach(b => (b.disabled = true));
    return;
  }
  if (Auth.current()) { location.replace('index.html'); return; }

  // 사용자가 아무도 없으면 첫 관리자 등록부터
  const first = Auth.isEmpty();
  if (first) {
    showTab('signup');
    msg('등록된 직원이 없습니다. 첫 계정은 관리자로 만들어집니다.', 'info');
  }

  $('authTabs').addEventListener('click', e => {
    const t = e.target.closest('.auth-tab');
    if (t) showTab(t.dataset.tab);
  });

  $('formLogin').addEventListener('submit', async e => {
    e.preventDefault();
    busy(e.target, true, '로그인');
    try {
      await Auth.login($('loginId').value, $('loginPw').value, $('loginKeep').checked);
      location.replace('index.html');
    } catch (err) {
      msg(err.message, 'err');
      $('loginPw').value = '';
      busy(e.target, false, '로그인');
    }
  });

  $('formSignup').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('suPw').value;
    if (pw !== $('suPw2').value) { msg('비밀번호가 서로 다릅니다.', 'err'); return; }
    busy(e.target, true, '등록하고 시작하기');
    try {
      const id = $('suId').value;
      await Auth.register(id, pw, $('suName').value);
      await Auth.login(id, pw, true);
      location.replace('accounts.html');       // 등록 직후 키 연결 화면으로
    } catch (err) {
      msg(err.message, 'err');
      busy(e.target, false, '등록하고 시작하기');
    }
  });
});
