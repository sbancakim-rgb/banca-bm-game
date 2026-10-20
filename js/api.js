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
  let token = ls.get(TK), user = ls.get(UK), pendingBoot = null;
  const OPK = 'bmq_opening'; // 직원 캐릭터 오프닝 (로그인한 기기에만 저장)
  const FVK = (email) => 'bmq_facever_' + String(email || '').trim().toLowerCase();

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

  function absorbBoot(b) {
    if (b.user) { user = b.user; ls.set(UK, user); } // 시작 데이터에 회원 정보도 들어 있음 → '로그인 확인'을 따로 묻지 않음
    if (b.opening) ls.set(OPK, { v: b.openingVer, d: b.opening }); else if (b.openingVer === '') ls.del(OPK);
    delete b.opening;
    const qc = ls.get(QC);
    if (b.items) { ls.set(QC, { ver: b.ver, items: b.items }); qmem = b.items; }
    else if (qc) qmem = qc.items;
    delete b.items;
    return b;
  }

  return {
    demo,
    get user() { return user; },
    loggedIn: () => !!token,
    async login(email, password) {
      const qc = ls.get(QC);
      const r = await call('login', { email, password, ver: qc && qc.ver, faceVer: ls.get(FVK(email)) || '', openingVer: (ls.get(OPK) || {}).v || '' });
      token = r.token; user = r.user; ls.set(TK, token); ls.set(UK, user);
      pendingBoot = r.boot ? absorbBoot(r.boot) : null; // 로그인 응답에 시작 데이터가 함께 옴
      return user;
    },
    /** 게임 시작 데이터 한 번에: { ver, data, talk, face, faceVer } (문제는 내부 캐시에 반영) */
    async boot() {
      if (pendingBoot) { const b = pendingBoot; pendingBoot = null; return b; }
      if (demo) {
        await questions();
        const r = await call('loadProgress');
        return { data: r.data, talk: null, face: null, faceVer: '' };
      }
      const qc = ls.get(QC);
      return absorbBoot(await call('boot', { ver: qc && qc.ver, faceVer: ls.get(FVK(user && user.email)) || '', openingVer: (ls.get(OPK) || {}).v || '' }));
    },
    faceVerKey: FVK,
    opening: () => 'img/opening_4.webp', // 오프닝 그림 (공개 · 로그인 전에도 보임)
    async me() { const r = await call('me'); user = r.user; ls.set(UK, user); return user; },
    logout() { token = null; user = null; ls.del(TK); ls.del(UK); ls.del(QC); },
    questions, cachedQuestions: () => qmem || [],
    library: () => call('library').then((r) => r.items),
    talk: () => call('talk').then((r) => r.items),
    myFace: () => call('myFace').then((r) => r.face),
    players: () => call('players').then((r) => r.items),
    cheer: (uid) => call('cheer', { uid }),
    sendMoney: (uid, amount, msg) => call('sendMoney', { uid, amount, msg }),
    inbox: () => call('inbox').then((r) => r.items),
    submitQuestion: (question) => call('submitQuestion', { question }),
    mySubmissions: () => call('mySubmissions').then((r) => r.items),
    loadProgress: () => call('loadProgress').then((r) => r.data),
    saveProgress: (data, level, totalXp, meta, reset) => call('saveProgress', { data, level, totalXp, meta, reset: !!reset }),
    peerFaces: (uids, exprs) => call('peerFaces', { uids, exprs }).then((r) => r.faces || {}),
    ranking: (keys) => call('ranking', keys),
    miniRank: (day) => call('miniRank', { day }),
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
      info: () => call('adminInfo'),
      submissions: () => call('adminSubmissions').then((r) => r.items),
      chars: () => call('adminChars').then((r) => r.items),
      autoLog: () => call('adminAutoLog').then((r) => r.items),
      resolveSubmission: (no, status, memo, question) => call('adminSubmissionResolve', { no, status, memo, question })
    }
  };
})();

/* =========================================================
   Demo — 서버 없이 같은 API를 흉내 (로컬 테스트용)
   ========================================================= */
const Demo = (() => {
  const DB = 'bmq_demo_db';
  const ADMIN = 'admin@demo.local', ADMIN_PW = 'demo1234';
  const FILES = ['q_banca_general', 'q_banca_general_2', 'q_banca_tax', 'q_banca_doc_tax', 'q_banca_product', 'q_banca_backoffice', 'q_market', 'q_market_2', 'q_market_3', 'q_econ', 'q_econ_2', 'q_term', 'q_term_2', 'q_banca_product_2', 'q_banca_backoffice_2', 'q_banca_general_3', 'q_econ_3', 'q_term_3', 'q_market_4'];
  const load = () => { try { return JSON.parse(localStorage.getItem(DB)) || {}; } catch (e) { return {}; } };
  const store = (d) => { try { localStorage.setItem(DB, JSON.stringify(d)); } catch (e) { } };
  const norm = (e) => String(e || '').trim().toLowerCase();
  async function hash(pw) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('demo|' + pw));
    return btoa(String.fromCharCode(...new Uint8Array(b)));
  }
  function db() {
    const d = load();
    d.users = d.users || {}; d.reports = d.reports || []; d.progress = d.progress || {}; d.qedits = d.qedits || {}; d.lib = d.lib || []; d.mail = d.mail || []; d.subs = d.subs || [];
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
      case 'myFace': return ok({ face: null });
      case 'players': return ok({ items: Object.entries(d.progress).filter(([e]) => e !== email).map(([e, raw]) => { try { const p = JSON.parse(raw); return p.name ? { uid: 'u:' + e, name: p.name, lv: p.lv || 1 } : null; } catch (er) { return null; } }).filter(Boolean) });
      case 'cheer': {
        const to = String(b.uid).slice(2), t = new Date().toDateString();
        const sent = d.mail.filter((m) => m.from === email && m.kind === '응원' && new Date(m.at).toDateString() === t);
        if (to === email) throw new Error('나 자신은 응원할 수 없어요');
        if (sent.length >= SOCIAL.cheerPerDay) throw new Error(`응원은 하루 ${SOCIAL.cheerPerDay}번까지예요`);
        if (sent.some((m) => m.to === to)) throw new Error('오늘 이미 응원한 동료예요');
        d.mail.push({ to, from: email, fromName: (JSON.parse(d.progress[email] || '{}').name) || '', kind: '응원', cash: SOCIAL.cheerCash, honor: SOCIAL.cheerHonor, msg: '', at: Date.now() });
        store(d); return ok({ cheer: demoCheer(d, email) });
      }
      case 'sendMoney': {
        const to = String(b.uid).slice(2), amt = Math.floor(+b.amount);
        if (!(amt >= SOCIAL.sendMin && amt <= SOCIAL.sendMax)) throw new Error(`한 번에 ${SOCIAL.sendMin}원~${SOCIAL.sendMax.toLocaleString()}원까지 보낼 수 있어요`);
        if (to === email) throw new Error('나에게는 보낼 수 없어요');
        d.mail.push({ to, from: email, fromName: (JSON.parse(d.progress[email] || '{}').name) || '', kind: '활동비', cash: amt, honor: 0, msg: b.msg || '', at: Date.now() });
        store(d); return ok({ sent: amt });
      }
      case 'inbox': { const mine = d.mail.filter((m) => m.to === email && !m.got); mine.forEach((m) => m.got = Date.now()); store(d); return ok({ items: mine.map((m) => ({ kind: m.kind, from: m.fromName, cash: m.cash, honor: m.honor, msg: m.msg, at: m.at })) }); }
      case 'submitQuestion': { const no = 'S' + Date.now().toString().slice(-9); d.subs.unshift({ ...b.question, no, at: Date.now(), email, author: (JSON.parse(d.progress[email] || '{}').name) || u.name, status: '검토' }); store(d); return ok({ no }); }
      case 'mySubmissions': return ok({ items: d.subs.filter((x) => x.email === email) });
      case 'loadProgress': return ok({ data: d.progress[email] || null });
      case 'saveProgress': {
        try { const o = JSON.parse(d.progress[email] || 'null'); if (o && !b.reset && ((o.resetAt && o.created > (JSON.parse(b.data).created || 0)) || (o.totalXp || 0) > (b.totalXp || 0))) return ok({ stale: true, data: d.progress[email] }); } catch (er) { }
        d.progress[email] = b.data; store(d); return ok();
      }
      case 'peerFaces': return ok({ faces: {} });
      case 'miniRank': {
        const rows = Object.entries(d.progress).map(([e, raw]) => { try { const p = JSON.parse(raw); return p.name && p.mini ? { e, p } : null; } catch (er) { return null; } }).filter(Boolean);
        const item = (r, ms) => ({ name: r.p.name, lv: r.p.lv || 1, me: r.e === email, uid: 'u:' + r.e, look: demoLook(r.p), face: false, ms });
        return ok({
          maze: rows.filter((r) => r.p.mini.maze && r.p.mini.maze.date === b.day && r.p.mini.maze.best).map((r) => item(r, r.p.mini.maze.best)).sort((a, c) => a.ms - c.ms).slice(0, 10),
          run: rows.filter((r) => r.p.mini.run && r.p.mini.run.best).map((r) => item(r, r.p.mini.run.best)).sort((a, c) => c.ms - a.ms).slice(0, 10),
          park: rows.filter((r) => r.p.mini.park && r.p.mini.park.date === b.day && r.p.mini.park.best).map((r) => item(r, r.p.mini.park.best)).sort((a, c) => a.ms - c.ms).slice(0, 10)
        });
      }
      case 'report': { const no = 'R' + Date.now().toString().slice(-8); d.reports.unshift({ no, at: new Date().toISOString(), email, qid: b.qid, cat: b.cat, snapshot: b.snapshot, kind: b.kind, reason: b.reason, status: '접수' }); store(d); return ok({ no }); }
      case 'news': return ok({ items: [
        { title: '[데모] 서버를 연결하면 구글 뉴스의 최신 경제 기사가 여기에 나와요', link: 'https://news.google.com/search?q=%EA%B8%B0%EC%A4%80%EA%B8%88%EB%A6%AC&hl=ko', source: '데모', date: new Date().toString(), topic: '기준금리' },
        { title: '[데모] 보험·방카슈랑스 뉴스', link: 'https://news.google.com/search?q=%EB%B0%A9%EC%B9%B4%EC%8A%88%EB%9E%91%EC%8A%A4&hl=ko', source: '데모', date: new Date().toString(), topic: '보험' }] });
      case 'ranking': {
        const rows = Object.entries(d.progress).map(([e, raw]) => { try { const p = JSON.parse(raw); return { email: e, name: p.name, lv: p.lv, look: demoLook(p), ...(p.period || {}), rk: demoRk(p) }; } catch (er) { return null; } }).filter((r) => r && !(d.users[r.email] || {}).admin); // 관리자 제외
        const r = rankingFrom(rows, b, email); ['week', 'month'].forEach((k) => r[k].list.forEach((x) => x.uid = 'u:' + x.email)); r.cheer = demoCheer(d, email); return ok(r);
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
      case 'adminUserDelete': { const e = norm(b.email); if (e === ADMIN) throw new Error('관리자 계정은 삭제할 수 없어요'); delete d.users[e]; delete d.progress[e]; d.mail = d.mail.filter((m) => m.to !== e && m.from !== e); store(d); return ok(); }
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
      case 'adminSubmissions': return ok({ items: d.subs });
      case 'adminAutoLog': return ok({ items: [{ at: Date.now(), act: '추가', id: 'auto-demo-01', cat: '실제 경제 환경', q: '(데모) 자동 출제 예시 문제', why: '새 소식 반영', src: '데모' }] });
      case 'adminChars': return ok({ items: Object.entries(d.users).map(([e, x]) => { let p = null; try { p = JSON.parse(d.progress[e] || 'null'); } catch (er) { }
        return { email: e, uid: 'u:' + e, name: (p && p.name) || x.name || e, member: x.name || '', lv: p && p.name ? p.lv || 1 : 0, look: p ? demoLook(p) : null, face: false, active: x.active }; }).filter((x) => x.look || x.face) });
      case 'adminSubmissionResolve': {
        const x = d.subs.find((y) => y.no === b.no); if (!x) throw new Error('접수번호를 찾지 못했어요');
        x.status = b.status === '승인' ? '승인' : '반려'; x.memo = b.memo || '';
        if (x.status === '승인') { const q = { ...b.question, id: 'u-' + x.no, author: x.author }; d.qedits[q.id] = q; x.qid = q.id;
          d.mail.push({ to: x.email, from: '', fromName: '방카사업부', kind: '출제보상', cash: SOCIAL.submitCash, honor: SOCIAL.submitHonor, msg: '제출한 문제가 채택됐어요!', at: Date.now() }); }
        else d.mail.push({ to: x.email, from: '', fromName: '방카사업부', kind: '출제결과', cash: 0, honor: 0, msg: ('제출한 문제가 반려됐어요. ' + (b.memo || '')).trim(), at: Date.now() });
        store(d); return ok({ qid: x.qid });
      }
    }
    throw new Error('알 수 없는 요청');
  }
  function demoCheer(d, email) {
    const t = new Date().toDateString(), sent = d.mail.filter((m) => m.from === email && m.kind === '응원' && new Date(m.at).toDateString() === t);
    return { left: Math.max(0, SOCIAL.cheerPerDay - sent.length), to: sent.map((m) => 'u:' + m.to) };
  }
  return { handle, loadData, questions, ADMIN, ADMIN_PW };
})();

/* 순위 통계 (데모) — 게임이 서버에 보내는 것과 같은 모양 */
function demoRk(p) {
  const s = {}; Object.entries(p.stats || {}).forEach(([c, v]) => s[c] = [v.c || 0, v.n || 0]);
  const pd = p.period || {};
  return { s, w: (p.wstats || {}).wk || '', ws: (p.wstats || {}).c || {}, d: pd.day || '', dx: pd.dayXp || 0 };
}
/* 랭킹 계산 — 데모 모드용 (서버는 Code.gs ranking_ 이 같은 규칙으로 계산) */
function rankingFrom(rows, k, myEmail) {
  const pick = (curKey, xpField, prevKeyField, prevXpField, target) => rows.map((r) => ({
    name: r.name || '이름없음', lv: r.lv || 1, me: r.email === myEmail, email: r.email, look: r.look || null, face: false,
    xp: r[curKey] === target ? (r[xpField] || 0) : r[prevKeyField] === target ? (r[prevXpField] || 0) : 0,
    s: (r.rk || {}).s || {}, ws: (r.rk || {}).w === k.wk ? (r.rk || {}).ws || {} : {}, dx: (r.rk || {}).d === k.day ? (r.rk || {}).dx || 0 : 0
  })).filter((x) => x.name && x.name !== '이름없음').sort((a, b) => b.xp - a.xp || b.lv - a.lv);
  return {
    week: { key: k.wk, list: pick('week', 'weekXp', 'prevWeek', 'prevWeekXp', k.wk).slice(0, 60) },
    month: { key: k.mo, list: pick('month', 'monthXp', 'prevMonth', 'prevMonthXp', k.mo).slice(0, 60) },
    lastWeek: { key: k.lastWk, winner: pick('week', 'weekXp', 'prevWeek', 'prevWeekXp', k.lastWk).filter((x) => x.xp > 0)[0] || null },
    lastMonth: { key: k.lastMo, winner: pick('month', 'monthXp', 'prevMonth', 'prevMonthXp', k.lastMo).filter((x) => x.xp > 0)[0] || null }
  };
}

/* 캐릭터 겉모습만 (데모 — 서버는 Code.gs lookOf_) */
function demoLook(p) {
  if (!p || !p.name) return null;
  const o = {}; ['gender', 'hairStyle', 'hairColor', 'skin', 'face', 'age', 'glasses', 'glassesColor', 'illust', 'oc', 'cs', 'cr'].forEach((k) => { if (p[k] != null) o[k] = p[k]; });
  return o;
}
