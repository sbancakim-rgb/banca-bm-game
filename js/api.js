/* =========================================================
   Api — 서버(Apps Script) 통신
   js/env.js 의 apiUrl 이 비어 있으면 '로컬 데모 모드'로 동작한다.
   (데모 모드: 이 브라우저 안에서만 회원·이의제기·진행이 저장됨 — 테스트용)
   ========================================================= */
const Api = (() => {
  const URL = (window.BMQ_CONFIG || {}).apiUrl || '';
  const demo = !URL;
  const TK = 'bmq_token', UK = 'bmq_user', QC = 'bmq_qcache';
  const ls = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { } }
  };
  let token = ls.get(TK), user = ls.get(UK);

  async function call(action, body = {}) {
    if (demo) return Demo.handle(action, body, token);
    let res;
    try {
      res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token, ...body }) });
    } catch (e) { throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요'); }
    const j = await res.json();
    if (!j.ok) {
      if (/로그인/.test(j.error)) { token = null; ls.del(TK); }
      throw new Error(j.error);
    }
    return j;
  }

  /* ---- 문제: 버전이 같으면 로컬 캐시 사용 ---- */
  let qmem = null;
  async function questions(force) {
    if (demo) { await Demo.loadData(); return (qmem = Demo.questions()); }
    const cache = ls.get(QC);
    if (!force && cache) {
      try { const { ver } = await call('qver'); if (ver === cache.ver) return (qmem = cache.items); }
      catch (e) { return (qmem = cache.items); } // 오프라인이면 캐시로
    }
    const r = await call('questions');
    ls.set(QC, { ver: r.ver, items: r.items });
    return (qmem = r.items);
  }

  return {
    demo,
    get user() { return user; },
    loggedIn: () => !!token,
    async login(email, password) {
      const r = await call('login', { email, password });
      token = r.token; user = r.user; ls.set(TK, token); ls.set(UK, user);
      return user;
    },
    async me() { const r = await call('me'); user = r.user; ls.set(UK, user); return user; },
    logout() { token = null; user = null; ls.del(TK); ls.del(UK); ls.del(QC); },
    questions, cachedQuestions: () => qmem || [],
    library: () => call('library').then((r) => r.items),
    talk: () => call('talk').then((r) => r.items),
    loadProgress: () => call('loadProgress').then((r) => r.data),
    saveProgress: (data, level, totalXp, meta) => call('saveProgress', { data, level, totalXp, meta }),
    ranking: (keys) => call('ranking', keys),
    report: (p) => call('report', p),
    news: () => call('news').then((r) => r.items),
    changePassword: (old, next) => call('changePassword', { old, next }),
    admin: {
      users: () => call('adminUsers').then((r) => r.items),
      saveUser: (u) => call('adminUserSave', { user: u }),
      deleteUser: (email) => call('adminUserDelete', { email }),
      reports: () => call('adminReports').then((r) => r.items),
      resolve: (no, status, memo, question) => call('adminReportResolve', { no, status, memo, question }),
      questions: () => call('adminQuestions').then((r) => r.items),
      saveQuestion: (q) => call('adminQuestionSave', { question: q }),
      importQuestions: (items) => call('adminQuestionsImport', { items }),
      library: () => call('adminLibrary').then((r) => r.items),
      saveLibrary: (item) => call('adminLibrarySave', { item }),
      info: () => call('adminInfo')
    }
  };
})();

/* =========================================================
   Demo — 서버 없이 같은 API를 흉내 (로컬 테스트용)
   ========================================================= */
const Demo = (() => {
  const DB = 'bmq_demo_db';
  const ADMIN = 'admin@demo.local', ADMIN_PW = 'demo1234';
  const FILES = ['q_banca_general', 'q_banca_general_2', 'q_banca_tax', 'q_banca_doc_tax', 'q_banca_product', 'q_banca_backoffice', 'q_market', 'q_market_2', 'q_market_3', 'q_econ', 'q_econ_2', 'q_term', 'q_term_2'];
  const load = () => { try { return JSON.parse(localStorage.getItem(DB)) || {}; } catch (e) { return {}; } };
  const store = (d) => { try { localStorage.setItem(DB, JSON.stringify(d)); } catch (e) { } };
  const norm = (e) => String(e || '').trim().toLowerCase();
  async function hash(pw) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('demo|' + pw));
    return btoa(String.fromCharCode(...new Uint8Array(b)));
  }
  function db() {
    const d = load();
    d.users = d.users || {}; d.reports = d.reports || []; d.progress = d.progress || {}; d.qedits = d.qedits || {}; d.lib = d.lib || [];
    return d;
  }
  let loaded = null;
  function loadData() {
    if (loaded) return loaded;
    loaded = Promise.all(FILES.map((f) => new Promise((r) => {
      const s = document.createElement('script'); s.src = `js/data/${f}.js`; s.onload = s.onerror = r; document.head.appendChild(s);
    })));
    return loaded;
  }
  function questions() {
    const d = db();
    const base = (window.QB || []).map((q) => d.qedits[q.id] || q);
    const extra = Object.values(d.qedits).filter((q) => !base.some((b) => b.id === q.id));
    return [...base, ...extra].filter((q) => q.status !== '중지');
  }
  async function handle(action, b, token) {
    const d = db();
    if (action === 'login') {
      const email = norm(b.email);
      if (email === ADMIN && !d.users[ADMIN]) d.users[ADMIN] = { name: '관리자', hash: await hash(ADMIN_PW), active: true, admin: true, created: Date.now() };
      const u = d.users[email];
      if (!u || !u.active || u.hash !== await hash(b.password)) throw new Error('등록되지 않은 이메일이거나 비밀번호가 틀렸어요');
      u.lastLogin = Date.now(); store(d);
      return { token: 'demo.' + email, user: { email, name: u.name, admin: !!u.admin } };
    }
    const email = token && token.startsWith('demo.') ? token.slice(5) : null;
    const u = email && d.users[email];
    if (!u || !u.active) throw new Error('로그인이 필요해요');
    const me = { email, name: u.name, admin: !!u.admin };
    const ok = (x = {}) => ({ ok: true, ...x });
    switch (action) {
      case 'me': return ok({ user: me });
      case 'library': return ok({ items: d.lib.filter((x) => x.status !== '중지') });
      case 'talk': return ok({ items: TALK_DEFAULT });
      case 'loadProgress': return ok({ data: d.progress[email] || null });
      case 'saveProgress': d.progress[email] = b.data; store(d); return ok();
      case 'report': { const no = 'R' + Date.now().toString().slice(-8); d.reports.unshift({ no, at: new Date().toISOString(), email, qid: b.qid, cat: b.cat, snapshot: b.snapshot, kind: b.kind, reason: b.reason, status: '접수' }); store(d); return ok({ no }); }
      case 'news': return ok({ items: [
        { title: '[데모] 서버를 연결하면 구글 뉴스의 최신 경제 기사가 여기에 나와요', link: 'https://news.google.com/search?q=%EA%B8%B0%EC%A4%80%EA%B8%88%EB%A6%AC&hl=ko', source: '데모', date: new Date().toString(), topic: '기준금리' },
        { title: '[데모] 보험·방카슈랑스 뉴스', link: 'https://news.google.com/search?q=%EB%B0%A9%EC%B9%B4%EC%8A%88%EB%9E%91%EC%8A%A4&hl=ko', source: '데모', date: new Date().toString(), topic: '보험' }] });
      case 'ranking': {
        const rows = Object.entries(d.progress).map(([e, raw]) => { try { const p = JSON.parse(raw); return { email: e, name: p.name, lv: p.lv, ...(p.period || {}) }; } catch (er) { return null; } }).filter(Boolean);
        return ok(rankingFrom(rows, b, email));
      }
      case 'changePassword':
        if (u.hash !== await hash(b.old)) throw new Error('현재 비밀번호가 틀렸어요');
        u.hash = await hash(b.next); store(d); return ok();
    }
    if (!me.admin) throw new Error('관리자만 사용할 수 있어요');
    switch (action) {
      case 'adminUsers': return ok({ items: Object.entries(d.users).map(([e, x]) => ({ email: e, name: x.name, active: x.active, admin: !!x.admin, created: x.created, lastLogin: x.lastLogin, hasPw: !!x.hash })) });
      case 'adminUserSave': {
        const e = norm(b.user.email); const x = d.users[e] || { created: Date.now(), active: true };
        if (b.user.name != null) x.name = b.user.name;
        if (b.user.password) x.hash = await hash(b.user.password);
        if (b.user.active != null) x.active = b.user.active;
        if (b.user.admin != null) x.admin = b.user.admin;
        d.users[e] = x; store(d); return ok();
      }
      case 'adminUserDelete': delete d.users[norm(b.email)]; store(d); return ok();
      case 'adminReports': return ok({ items: d.reports });
      case 'adminReportResolve': {
        if (b.question) d.qedits[b.question.id] = b.question;
        const r = d.reports.find((x) => x.no === b.no); if (r) { r.status = b.status; r.memo = b.memo; r.doneAt = new Date().toISOString(); }
        store(d); return ok();
      }
      case 'adminQuestions': await loadData(); return ok({ items: [...(window.QB || []).map((q) => d.qedits[q.id] || q), ...Object.values(d.qedits).filter((q) => !(window.QB || []).some((x) => x.id === q.id))] });
      case 'adminQuestionSave': d.qedits[b.question.id] = b.question; store(d); return ok();
      case 'adminQuestionsImport': b.items.forEach((q) => d.qedits[q.id] = q); store(d); return ok({ added: b.items.length });
      case 'adminLibrary': return ok({ items: d.lib });
      case 'adminLibrarySave': { const it = b.item; if (!it.id) it.id = 'L' + Date.now(); const i = d.lib.findIndex((x) => x.id === it.id); if (i >= 0) d.lib[i] = it; else d.lib.push(it); store(d); return ok(); }
      case 'adminInfo': return ok({ sheetUrl: '' });
    }
    throw new Error('알 수 없는 요청');
  }
  return { handle, loadData, questions, ADMIN, ADMIN_PW };
})();

/* 랭킹 계산 — 데모 모드용 (서버는 Code.gs ranking_ 이 같은 규칙으로 계산) */
function rankingFrom(rows, k, myEmail) {
  const pick = (curKey, xpField, prevKeyField, prevXpField, target) => rows.map((r) => ({
    name: r.name || '이름없음', lv: r.lv || 1, me: r.email === myEmail,
    xp: r[curKey] === target ? (r[xpField] || 0) : r[prevKeyField] === target ? (r[prevXpField] || 0) : 0
  })).filter((x) => x.xp > 0).sort((a, b) => b.xp - a.xp);
  return {
    week: { key: k.wk, list: pick('week', 'weekXp', 'prevWeek', 'prevWeekXp', k.wk).slice(0, 30) },
    month: { key: k.mo, list: pick('month', 'monthXp', 'prevMonth', 'prevMonthXp', k.mo).slice(0, 30) },
    lastWeek: { key: k.lastWk, winner: pick('week', 'weekXp', 'prevWeek', 'prevWeekXp', k.lastWk)[0] || null },
    lastMonth: { key: k.lastMo, winner: pick('month', 'monthXp', 'prevMonth', 'prevMonthXp', k.lastMo)[0] || null }
  };
}
