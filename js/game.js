/* =========================================================
   방카BM 성장기 — 게임 엔진
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // 일러스트(PNG)가 있으면 이미지, 없으면 SVG 임시 그림
  function charHTML(spec, expr = 'normal', opts = {}) {
    if (opts.head) {
      // 동그란 얼굴 칸: 항상 기본 표정, 얼굴 전체가 들어가는 썸네일 우선
      const t = spec && Sprites.thumb(spec.key);
      if (t) return `<img class="avthumb" src="${t}" alt="" draggable="false" onerror="this.remove()">`;
      expr = 'normal';
    }
    const src = spec && spec.key && Sprites.char(spec.key, expr);
    if (!src) return Art.portrait(spec, expr, opts);
    const cls = opts.head ? 'sprite head' : opts.bust ? 'sprite bust' : 'sprite';
    return `<img class="${cls}${spec.aura ? ' aura' : ''}${Sprites.isIllust(spec.key) ? ' illust' : ''}" src="${src}" alt="" draggable="false">`;
  }
  function bgHTML(name) {
    const src = Sprites.bg(name);
    const rm = !src && /^rank(\d)$/.exec(name);
    if (rm) return officeSVG(+rm[1], { stage: true }); // 직급별 사무실 (내 직급이면 내가 꾸민 물품까지)
    return src ? `<img class="bgimg" src="${src}" alt="" draggable="false">` : Art.background(name);
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dkey();
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dkey(d); };
  const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  let S = null, syncTimer = null, hasFace = false;
  function save() {
    if (!S) return;
    S.oc = officeOC(); // 동료가 내 사무실을 구경할 때 쓰는 요약
    S.cs = myStage();  // 지금 입은 의상 단계 (동료 화면에서도 같은 의상으로)
    S.updated = Date.now(); Store.save(S);
    clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 4000);
  }
  let lastSynced = 0; // 마지막으로 서버에 저장한 시점 (바뀐 게 없으면 저장 요청을 보내지 않음)
  async function syncNow(reset) {
    if (!S || !Api.loggedIn() || (!S.name && !reset)) return;
    if (!reset && S.updated && S.updated === lastSynced) return;
    ensurePeriod();
    const at = S.updated;
    try {
      const r = await Api.saveProgress(JSON.stringify(S), S.lv, S.totalXp, { name: S.name, ...S.period }, reset);
      if (r && r.stale) adoptRemote(r.data); else lastSynced = at;
    } catch (e) { if (reset) throw e; }
  }
  // 서버에 더 진행된 기록이 있으면(다른 기기에서 플레이) 그걸로 바꾼다 — 진행한 기록은 절대 뒤로 가지 않음
  function adoptRemote(data) {
    let R; try { R = Object.assign(Store.fresh(S.email), JSON.parse(data)); } catch (e) { return; }
    R.email = S.email; S = R; Store.save(S);
    lastSynced = S.updated;
    if (!R.name) { toast('다른 기기에서 캐릭터를 초기화했어요', 3200); inSession = false; els.vn.classList.remove('on'); return createScreen(); }
    toast('☁️ 다른 기기에서 더 진행한 기록을 불러왔어요', 3200);
    if (!inSession && $('#stage').className === 'home') goHome(); else if (typeof renderHud === 'function') renderHud();
  }
  // 이 기기 기록 vs 서버 기록 중 고르기: 초기화한 쪽이 더 나중이면 그쪽, 아니면 더 많이 진행한 쪽
  function pickSave(local, remote) {
    if (!remote || !local) return local || remote;
    const newer = (remote.created || 0) > (local.created || 0) ? remote : local, older = newer === remote ? local : remote;
    if (newer.resetAt && newer.created !== older.created) return newer; // 초기화한 기록이 우선 (예전 기기 기록으로 되살아나지 않게)
    if (!remote.name) return local;
    if (!local.name) return remote;
    if ((remote.totalXp || 0) !== (local.totalXp || 0)) return (remote.totalXp || 0) > (local.totalXp || 0) ? remote : local;
    return (remote.updated || 0) >= (local.updated || 0) ? remote : local;
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow(); });

  /* ---------------- 공통 UI ---------------- */
  const els = { bg: $('#bg'), chara: $('#chara'), hud: $('#hud'), sess: $('#sesshud'), screen: $('#screen'), vn: $('#vn'),
    choices: $('#choices'), dlg: $('#dialog'), name: $('#dialog .nametag'), meta: $('#dialog .meta'), text: $('#dialog .text'),
    timer: $('#dialog .timer'), place: $('#place'), timerBar: $('#dialog .timer i'), nav: $('#nav'), fx: $('#fx'), modal: $('#modal'), toast: $('#toast') };

  function toast(msg, ms = 2400) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    els.toast.appendChild(t); setTimeout(() => t.remove(), ms);
  }
  let modalClose = null;
  function modal(html, onClose) {
    els.modal.innerHTML = `<div class="mcard">${html}</div>`;
    els.modal.classList.add('on');
    const close = () => { els.modal.classList.remove('on'); els.modal.innerHTML = ''; modalClose = null; onClose && onClose(); };
    modalClose = close;
    els.modal.querySelectorAll('[data-close]').forEach((b) => b.onclick = close);
    return { el: els.modal.firstElementChild, close };
  }
  function confirmBox(text, ok = '확인', cancel = '취소') {
    return new Promise((res) => {
      const m = modal(`<p style="font-size:15px;line-height:1.6;white-space:pre-wrap;margin:6px 0 16px">${esc(text)}</p>
        <div class="row"><button class="btn ghost full" data-n>${cancel}</button><button class="btn full" data-y>${ok}</button></div>`);
      m.el.querySelector('[data-n]').onclick = () => { m.close(); res(false); };
      m.el.querySelector('[data-y]').onclick = () => { m.close(); res(true); };
    });
  }
  function fx(html, ms = 1400) {
    const d = document.createElement('div'); d.innerHTML = html;
    const n = d.firstElementChild; els.fx.appendChild(n); setTimeout(() => n.remove(), ms); return n;
  }
  function confetti(n = 60) {
    const cols = ['#ff6f91', '#ffd166', '#4f7cff', '#2fb67c', '#c77dff', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%'; c.style.background = pick(cols);
      c.style.animationDelay = Math.random() * 0.8 + 's'; c.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      els.fx.appendChild(c); setTimeout(() => c.remove(), 3600);
    }
  }
  const busy = (msg) => { els.screen.innerHTML = `<div class="loading"><div class="spin"></div>${esc(msg)}</div>`; };
  const opBg = (src) => `<img class="bgimg opblur" src="${src}" alt="" draggable="false"><img class="bgimg opening" src="${src}" alt="" draggable="false">`;
  // 실물 캐릭터 그림 등록: { normal…, thumb, s1:{…}, s3:{…} } → face:me, face:me@s1 …
  function regFace(key, map) {
    const base = {}; Object.entries(map || {}).forEach(([k, v]) => { if (/^s\d$/.test(k)) Sprites.registerData(key + '@' + k, v); else base[k] = v; });
    Sprites.registerData(key, base);
  }
  const LOGO = `<div class="k">BANCASSURANCE QUIZ RPG</div><h1>방카BM <em>성장기</em></h1><p>인턴에서 사장까지, 지식으로 승진하라!</p>`;
  // 오프닝(직원 캐릭터 단체 그림): 로그인한 뒤 · 로딩하는 동안에만 보여 준다
  function openingOverlay(msg) {
    let el = $('#opening');
    if (!el) { el = document.createElement('div'); el.id = 'opening'; document.body.appendChild(el); }
    const img = Api.opening();
    el.innerHTML = `${img ? opBg(img) : ''}<div class="op-fade"></div><div class="op-bottom"><div class="logo2">${LOGO}</div><div class="op-load"><div class="spin"></div>${esc(msg || '')}</div></div>`;
    el.dataset.at = img ? Date.now() : '';
    return el;
  }
  async function closeOpening(minMs = 1600) {
    const el = $('#opening'); if (!el) return;
    if (!el.dataset.at && Api.opening()) { openingOverlay('출근 준비 완료!'); }
    const at = Number($('#opening').dataset.at || 0);
    if (at) await sleep(Math.max(0, minMs - (Date.now() - at))); // 그림이 뜬 뒤 잠깐은 보여 주기
    const o = $('#opening'); if (!o) return;
    o.classList.add('out'); setTimeout(() => o.remove(), 450);
  }

  /* ---------------- 사운드 ---------------- */
  const Snd = (() => {
    let ctx = null;
    function tone(f, d, type = 'sine', t0 = 0, vol = 0.07) {
      if (!S || !S.sound) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
      } catch (e) { }
    }
    return {
      ok: () => { tone(784, 0.12); tone(1047, 0.2, 'sine', 0.1); },
      ng: () => { tone(196, 0.3, 'square', 0, 0.035); tone(165, 0.35, 'square', 0.12, 0.03); },
      tap: () => tone(1200, 0.03, 'sine', 0, 0.02),
      tick: () => tone(1500, 0.04, 'triangle', 0, 0.03),
      coin: () => { tone(1319, 0.08, 'square', 0, 0.03); tone(1760, 0.15, 'square', 0.07, 0.03); },
      item: () => [880, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', i * 0.06, 0.05)),
      lv: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', i * 0.09, 0.06)),
      gold: () => [988, 1319, 1568].forEach((f, i) => tone(f, 0.2, 'sine', i * 0.07, 0.05))
    };
  })();

  /* ---------------- 플레이어 / 성장 ---------------- */
  const rankOf = (lv) => RANKS.reduce((r, x) => (lv >= x.lv ? x : r), RANKS[0]);
  const faceOf = (P = S) => { const g = FACES[P.gender] || FACES.f; return g.find((x) => x.id === P.face) || g[0]; };
  // 의상 단계 그림 고르기: 원하는 단계 → 아래 단계 → 기본(②, 지금 그림)
  function stagedKey(baseKey, st) {
    if (!baseKey) return baseKey;
    for (let s = st || 2; s >= 1; s--) {
      if (s === 2) { if (Sprites.has(baseKey)) return baseKey; continue; }
      if (Sprites.has(baseKey + '@s' + s)) return baseKey + '@s' + s;
    }
    return baseKey;
  }
  const effStage = (want, has) => { for (let s = want || 2; s >= 1; s--) { if (s === 2) return 2; if ((has || []).includes(s)) return s; } return 2; };
  // 내가 지금 입은 의상 단계 (옷장에서 고른 것 · 없으면 직급에 맞춤)
  const myStage = () => { const auto = costumeStage(S.lv); return S.costume && S.costume <= auto ? S.costume : auto; };
  // P: 캐릭터 겉모습(내 기록 또는 동료의 look), faceKey: 실물 캐릭터 그림 키, st: 의상 단계
  function specOf(P, lv, faceKey, st) {
    const D = Store.fresh(''); P = Object.assign({}, D, P || {}); lv = lv || 1;
    const r = rankOf(lv), f = P.gender === 'f', fc = faceOf(P);
    const look = clone(r.look);
    if (f && look.type === 'suit') { delete look.tie; look.necklace = '#f5e6c4'; }
    if (f && look.type === 'shirt') look.shirt = '#fdf7fb';
    // 주인공 그림: 실물 캐릭터 → 고른 일러스트 → 성별 기본 일러스트 (코드로 그린 캐릭터는 쓰지 않음)
    const pre = Sprites.presets(P.gender)[0] || Sprites.presets(P.gender === 'f' ? 'm' : 'f')[0];
    st = st || P.cs || costumeStage(lv);
    const illust = faceKey && Sprites.has(faceKey) ? stagedKey(faceKey, st)
      : P.illust && P.illust[0] === P.gender && Sprites.has('illust:' + P.illust) ? stagedKey('illust:' + P.illust, st)
      : pre ? stagedKey('illust:' + pre, st) : null;
    return { key: illust || `player_${P.gender}_${RANKS.indexOf(r)}`, gender: P.gender, skin: P.skin,
      eye: fc.eye, eyeScale: fc.eyeScale, face: fc.face, eyeColor: fc.eyeColor, lashes: !!fc.lashes, blush: !!fc.blush, brow: fc.brow, thickBrows: fc.thickBrows,
      age: P.age, glasses: P.glasses || null, glassesColor: P.glassesColor,
      hair: { style: P.hairStyle, color: P.hairColor }, outfit: look, aura: !!r.aura, earrings: f && lv >= 20 ? '#f2c641' : null };
  }
  const playerSpec = (lv = S.lv) => specOf(S, lv, hasFace ? 'face:me' : null, lv === S.lv ? myStage() : costumeStage(lv));
  // 가만히 서 있을 때 표정: 일러스트 캐릭터는 첫 표정(기본), 코드 그림은 미소
  const rest = () => (/^(illust|face):/.test(playerSpec().key) ? 'normal' : 'smile');
  const mastery = (g) => S.groupXp[g] / GROUPS[g].cats.length;
  function currentClass() {
    if (S.lv < CLASS_LV) return null;
    const gs = Object.keys(GROUPS), m = gs.map(mastery);
    const max = Math.max(...m), min = Math.min(...m);
    if (max === 0 || min / max >= 0.75) return 'all';
    return gs[m.indexOf(max)];
  }
  const tierOf = (v) => HONOR_TIERS.reduce((r, t) => (v >= t.min ? t : r), HONOR_TIERS[0]);

  const inc = (k, n = 1) => { S.cnt[k] = (S.cnt[k] || 0) + n; };
  function statVal(stat) {
    switch (stat) {
      case 'lv': return S.lv;
      case 'maxCombo': return S.bestCombo;
      case 'streak': return S.streak.count;
      case 'bossSeen': return Object.keys(S.bossSeen).length;
      case 'moneyTotal': return S.moneyTotal;
      default: return S.cnt[stat] || 0;
    }
  }
  function checkAch() {
    ACHIEVEMENTS.forEach((a) => {
      if (S.ach[a.id] || statVal(a.stat) < a.goal) return;
      S.ach[a.id] = Date.now(); S.honor += a.honor; earn(a.cash, true);
      toast(`🏆 업적 달성: ${a.icon} ${a.name} (+${a.honor} 명예 · +${won(a.cash)})`, 3400);
    });
  }
  function earn(n, silent) { n = Math.round(n); if (!n) return; S.money += n; S.moneyTotal += n; if (!silent) Snd.coin(); }
  /* ---- 주간/월간 실적 (최우수BM 랭킹용) ---- */
  function isoWeek(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${pad(Math.ceil(((t - y0) / 86400000 + 1) / 7))}`;
  }
  const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const periodKeys = () => {
    const lw = new Date(); lw.setDate(lw.getDate() - 7);
    const lm = new Date(); lm.setDate(1); lm.setMonth(lm.getMonth() - 1);
    return { wk: isoWeek(), lastWk: isoWeek(lw), mo: monthKey(), lastMo: monthKey(lm) };
  };
  function ensurePeriod() {
    const p = S.period || (S.period = { week: '', weekXp: 0, prevWeek: '', prevWeekXp: 0, month: '', monthXp: 0, prevMonth: '', prevMonthXp: 0 });
    const k = periodKeys();
    if (p.week !== k.wk) { if (p.week) { p.prevWeek = p.week; p.prevWeekXp = p.weekXp; } p.week = k.wk; p.weekXp = 0; }
    if (p.month !== k.mo) { if (p.month) { p.prevMonth = p.month; p.prevMonthXp = p.monthXp; } p.month = k.mo; p.monthXp = 0; }
    return p;
  }
  function addXp(x) {
    const ups = [];
    x = Math.round(x);
    if (x > 0) { const p = ensurePeriod(); p.weekXp += x; p.monthXp += x; }
    S.totalXp += x;
    if (S.lv >= MAX_LV) return ups;
    S.xp += x;
    while (S.lv < MAX_LV && S.xp >= xpNeed(S.lv)) { S.xp -= xpNeed(S.lv); S.lv++; ups.push(S.lv); }
    if (S.lv >= MAX_LV) S.xp = 0;
    return ups;
  }

  /* ---- 하루 단위 상태 · 일간 보스 추첨 ---- */
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  }
  function rollBoss() {
    let r = seeded(S.email + '|' + today()) * 100;
    for (const t of BOSS_TIERS) { if ((r -= t.rate) < 0) return t.id; }
    return BOSS_TIERS[0].id;
  }
  function ensureDay() {
    const t = today();
    if (S.daily.date !== t) S.daily = { date: t, done: {} };
    if (S.dailyBoss.date !== t) S.dailyBoss = { date: t, tier: rollBoss(), done: null, tries: 0 };
    if (S.extra.date !== t) S.extra = { date: t, ready: {} };
    if (S.study.date !== t) S.study = { date: t, xp: 0, articles: [], notes: [] };
  }
  function touchStreak() {
    if (S.streak.last === today()) return;
    S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1;
    S.streak.last = today();
    earn(CASH.daily, true);
    toast(`☀️ 출근 보너스 +${won(CASH.daily)} (🔥 ${S.streak.count}일 연속)`);
  }
  const bossTier = () => BOSS_TIERS.find((b) => b.id === S.dailyBoss.tier) || BOSS_TIERS[0];
  // 오늘 찾아온 보스 인물 (같은 등급에 여러 명이면 사람·날짜마다 고정된 무작위로 한 명)
  function bossNpc(b = bossTier()) {
    if (!b.npcs || !b.npcs.length) return b.npc;
    return b.npcs[Math.floor(seeded(S.email + '|' + S.dailyBoss.date + '|npc') * b.npcs.length)] || b.npc;
  }

  /* ---------------- 문제 풀 ---------------- */
  function pool() {
    const t = today();
    return Api.cachedQuestions().filter((q) => q && q.q && q.status !== '중지' && (!q.expires || q.expires >= t));
  }
  const catCount = (cat) => pool().filter((q) => q.cat === cat).length;
  function rankForPick(list, preferSeen) {
    const seen = (q) => S.seen[q.id] || 0;
    const sh = shuffle(list);
    if (!preferSeen) return sh.sort((a, b) => seen(a) - seen(b));
    // 연습: 이미 본 문제 중 오래된 것부터 (일일 일정용 새 문제를 아껴 둔다)
    const old = sh.filter((q) => seen(q)).sort((a, b) => seen(a) - seen(b));
    const fresh = sh.filter((q) => !seen(q));
    return old.length >= 20 ? [...old, ...fresh] : [...fresh, ...old];
  }
  // 방카 상품은 상품별 비중대로 먼저 상품을 고르고, 그 안에서 문제를 고른다
  const productGroup = (q) => { const t = (q.tags || []).join(' ') + ' ' + q.q; const i = PRODUCT_FOCUS.findIndex((g) => g.re.test(t)); return i < 0 ? 'etc' : i; };
  function focusProducts(avail) {
    if (!avail.length || avail.some((q) => q.cat !== 'banca_product')) return avail;
    const groups = {}; avail.forEach((q) => (groups[productGroup(q)] = groups[productGroup(q)] || []).push(q));
    const keys = Object.keys(groups), w = (k) => (k === 'etc' ? PRODUCT_OTHER_W : PRODUCT_FOCUS[k].w);
    let r = Math.random() * keys.reduce((a, k) => a + w(k), 0);
    for (const k of keys) { if ((r -= w(k)) < 0) return groups[k]; }
    return groups[keys[0]];
  }
  function takeByDiff(list, diff, used, preferSeen) {
    const avail = focusProducts(list.filter((q) => !used.has(q.id)));
    const exact = rankForPick(avail.filter((q) => q.diff === diff), preferSeen);
    const q = exact[0] || rankForPick(avail, preferSeen).sort((a, b) => Math.abs(a.diff - diff) - Math.abs(b.diff - diff))[0];
    if (q) used.add(q.id);
    return q;
  }
  function npcFor(q) {
    const c = CATS[q.cat]; if (!c) return 'partjang';
    if (c.byDiff) return c.npcs[Math.min(q.diff, 3) - 1];
    if (q.cat === 'market') return pick(c.npcs.filter((k) => NPCS[k].diff === q.diff)) || c.npcs[0];
    return c.npcs[0];
  }
  function buildPlan(kind, key) {
    const all = pool(), used = new Set(), plan = [];
    let list = all;
    if (kind === 'daily' || kind === 'extra') {
      const c = CATS[key]; list = all.filter((q) => q.cat === key);
      if (key === 'market') shuffle(c.npcs).forEach((n) => { const q = takeByDiff(list, NPCS[n].diff, used); q && plan.push({ q, npc: n }); });
      else shuffle([1, 1, 2, 2, 3]).sort((a, b) => a - b).forEach((d) => { const q = takeByDiff(list, d, used); q && plan.push({ q, npc: npcFor(q) }); });
    } else if (kind === 'practice') {
      list = all.filter((q) => q.cat === key);
      [1, 1, 2, 2, 2, 3, 3, 3].forEach((d) => { const q = takeByDiff(list, d, used, true); q && plan.push({ q, npc: npcFor(q) }); });
    } else if (kind === 'boss') {
      const b = bossTier(); list = all.filter((q) => b.cats.includes(q.cat));
      const cats = shuffle(b.cats);
      b.diffs.forEach((d, i) => {
        const sub = list.filter((q) => q.cat === cats[i % cats.length]);
        const q = takeByDiff(sub.length ? sub : list, d, used); q && plan.push({ q, npc: bossNpc(b) });
      });
    } else if (kind === 'review') {
      const ids = Object.keys(S.wrong);
      rankForPick(all.filter((q) => ids.includes(q.id) && (!key || key === 'all' || q.cat === key))).slice(0, DAILY_Q)
        .forEach((q) => { used.add(q.id); plan.push({ q, npc: npcFor(q) }); });
    }
    const replace = (q, npc) => { const r = takeByDiff(list.filter((x) => x.cat === q.cat), q.diff, used, kind === 'practice'); return r ? { q: r, npc: kind === 'boss' ? npc : (q.cat === 'market' ? npc : npcFor(r)) } : null; };
    return { plan, replace };
  }

  /* ---------------- VN 엔진 ---------------- */
  let tapResolve = null, typing = null;
  els.dlg.addEventListener('click', (e) => {
    const ob = e.target.closest('[data-obj]');
    if (ob) { e.stopPropagation(); openReport(ob.dataset.obj); return; }
    if (typing) { typing(); return; }
    if (tapResolve) { const r = tapResolve; tapResolve = null; Snd.tap(); r(); }
  });
  const stageMode = (m) => { $('#stage').className = m || ''; };
  const jong = (t) => { const c = (t || '').charCodeAt(t.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
  const PLACES = { rank0: '서류 창고', rank1: '△△은행 OO지점 창구', rank2: '회의실', rank3: 'VIP 상담실', rank4: '사업부장실', rank5: '부사장실', rank6: '사장실', office: '○○생명 방카슈랑스사업부', bank: '△△은행 OO지점 창구', classroom: '금융연수원 강의실', booth: '방카 전용 상담 부스',
    meeting: '지역단 상담실', private_office: '사업부장실', vp: '부사장실', ceo: '사장실', vip: '△△은행 WM센터 라운지', inspect: '△△은행 OO지점',
    branch_office: '△△은행 지점장실', hq: '△△은행 본점 은행장실', bok: '한국은행 금융통화위원회 회의실', title: '' };
  function setBg(name) {
    els.bg.innerHTML = bgHTML(name);
    const d = new Date(), h = d.getHours();
    els.place.innerHTML = PLACES[name] ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]}) ${h < 12 ? 'AM' : 'PM'} ${pad(h % 12 || 12)}:${pad(d.getMinutes())}<br>${PLACES[name]}` : '';
  }
  function setChar(spec, expr = 'normal', anim) {
    els.chara.className = '';
    els.chara.innerHTML = spec ? charHTML(spec, expr) : '';
    if (anim) { void els.chara.offsetWidth; els.chara.className = anim; }
  }
  function setName(who) {
    if (!who || !who.name) { els.name.innerHTML = ''; return; }
    els.name.innerHTML = `${esc(who.name)}<small>${esc(who.role || '')}</small>`;
  }
  function say(who, text, o = {}) {
    return new Promise((res) => {
      setName(who); els.dlg.classList.add('typing'); els.text.textContent = '';
      const chars = [...text]; let i = 0, finished = false;
      const done = () => {
        if (finished) return; finished = true; clearInterval(iv);
        els.text.textContent = text;
        if (o.extra) els.text.insertAdjacentHTML('beforeend', o.extra);
        els.dlg.classList.remove('typing'); typing = null;
        if (o.noWait) res(); else tapResolve = res;
      };
      const iv = setInterval(() => { els.text.textContent += chars[i++]; if (i >= chars.length) done(); }, o.speed || 22);
      typing = done;
    });
  }

  /* 문제 출제 + 아이템 사용 */
  function ask(q, who, npc, sec, ctx) {
    return new Promise(async (res) => {
      els.dlg.classList.add('asking');
      els.meta.innerHTML = `${q.author ? `<span>✍️ ${esc(q.author)} 출제</span>` : ''}<span>${DIFF_LABEL[q.diff] || ''}</span><span>${q.type === 'ox' ? 'O / X' : '4지선다'}</span>`;
      await say(who, q.q, { noWait: true });
      let answered = false, raf, rushShown = false;
      const st = { retry: false, retryUsed: false, shield: false, calm: false, used: new Set() };
      const tStart = performance.now(); let deadline = tStart + sec * 1000, total = sec * 1000;
      const finish = (r) => {
        if (answered) return; answered = true; cancelAnimationFrame(raf);
        els.timer.classList.remove('on'); els.chara.classList.remove('rush');
        els.choices.querySelectorAll('button').forEach((b) => b.disabled = true);
        r.ms = performance.now() - tStart; r.shield = st.shield; res(r);
      };
      const choiceHtml = q.type === 'ox'
        ? `<div class="ox"><button class="choice o" data-v="1">O</button><button class="choice x" data-v="0">X</button></div>`
        : q.choices.map((c, i) => `<button class="choice" data-i="${i}" style="animation-delay:${i * 0.06}s"><b>${i + 1}</b><span>${esc(c)}</span></button>`).join('');
      // 아이템 바
      const usable = ctx.noItems ? [] : ITEMS.filter((it) => (it.use === 'q' && (!it.mc || q.type === 'mc')) || (it.use === 's' && !ctx.sess[it.id]))
        .filter((it) => (S.items[it.id] || 0) > 0);
      els.choices.innerHTML = (usable.length ? `<div class="itembar">${usable.map((it) => `<button class="itb" data-it="${it.id}" title="${esc(it.desc)}">${it.icon}<small>${S.items[it.id]}</small></button>`).join('')}</div>` : '') + choiceHtml;
      els.choices.querySelectorAll('[data-it]').forEach((b) => b.onclick = () => {
        if (answered) return;
        const id = b.dataset.it, it = ITEMS.find((x) => x.id === id);
        if (st.used.has(id) || !(S.items[id] > 0)) return;
        st.used.add(id); S.items[id]--; inc('itemsUsed'); Snd.item(); b.disabled = true; b.querySelector('small').textContent = S.items[id];
        switch (id) {
          case 'hint': els.text.insertAdjacentHTML('beforeend', `<span class="hintbox">💡 ${esc(q.hint || ((q.tags || []).length ? '키워드: ' + q.tags.join(', ') : '해설을 떠올려 보세요'))}</span>`); break;
          case 'erase': {
            const wrongs = [...els.choices.querySelectorAll('.choice[data-i]')].filter((x) => +x.dataset.i !== q.answer && !x.disabled);
            const w = pick(wrongs); if (w) { w.disabled = true; w.classList.add('gone'); }
            break;
          }
          case 'skip': finish({ skipped: true }); break;
          case 'retry': st.retry = true; fx('<div class="stamp gold">🔁 재도전 장착</div>', 900); break;
          case 'time': deadline += 10000; total += 10000; break;
          case 'calm': { const now = performance.now(); deadline = now + (deadline - now) * 1.5; total = Math.max(total, deadline - tStart); st.calm = true; els.chara.classList.remove('rush'); break; }
          case 'shield': st.shield = true; break;
          default: ctx.sess[id] = true;
        }
        toast(`${it.icon} ${it.name} 사용!`, 1300);
      });
      els.choices.querySelectorAll('.choice').forEach((b) => b.onclick = () => {
        if (answered || b.disabled) return;
        const correct = q.type === 'ox' ? (b.dataset.v === '1') === q.answer : +b.dataset.i === q.answer;
        if (!correct && st.retry && !st.retryUsed) {
          st.retryUsed = true; b.classList.add('wrong'); b.disabled = true; Snd.ng();
          fx('<div class="stamp gold">한 번 더!</div>', 900); return;
        }
        b.classList.add(correct ? 'right' : 'wrong');
        finish({ correct, retried: st.retryUsed });
      });
      els.timer.classList.add('on');
      let lastSec = sec;
      const tick = () => {
        const now = performance.now(), left = deadline - now;
        els.timerBar.style.transform = `scaleX(${Math.max(0, Math.min(1, left / total))})`;
        els.timerBar.style.backgroundPosition = `${Math.min(100, (1 - left / total) * 100)}% 0`;
        const ls = Math.ceil(left / 1000);
        if (ls <= 3 && ls < lastSec && ls > 0) Snd.tick();
        lastSec = ls;
        if (npc.rush && !st.calm && (now - tStart) / total > 0.35 && !rushShown) { rushShown = true; els.chara.classList.add('rush'); fx(`<div class="bubble">빨리빨리!!</div>`, 1600); }
        if (left <= 0) return finish({ correct: false, timeout: true });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
  }
  function revealAnswer(q) {
    els.choices.querySelectorAll('.choice').forEach((b) => {
      const right = q.type === 'ox' ? (b.dataset.v === '1') === q.answer : +b.dataset.i === q.answer;
      if (right) b.classList.add('right'); else if (!b.classList.contains('wrong')) b.classList.add('dim');
    });
  }
  const answerText = (q) => q.type === 'ox' ? (q.answer ? 'O' : 'X') : `${q.answer + 1}번 ${q.choices[q.answer]}`;
  const whoOf = (key) => ({ name: NPCS[key].name, role: NPCS[key].role });
  const NARR = { name: '', role: '' };
  const KIND_NPCS = ['ajumma', 'jogyo', 'kimgyosu', 'hwangpro', 'yunpro', 'worker', 'kimpro'];
  const NPC_CNT = ['halmeoni', 'harabeoji', 'parkgyosu', 'ochajang', 'ajeossi'];

  /* ---------------- 이의 제기 ---------------- */
  function openReport(qid) {
    const q = Api.cachedQuestions().find((x) => x.id === qid);
    if (!q) return;
    const kinds = ['정답이 틀려요', '해설이 틀리거나 부족해요', '문제가 모호해요', '최신 정보와 달라요', '오타·표현', '기타'];
    const m = modal(`<h2 style="font-size:21px">⚠️ 이의 제기</h2>
      <div class="muted" style="margin:6px 0 10px;line-height:1.5">${esc(q.q)}<br>정답: <b>${esc(answerText(q))}</b> · ${esc(q.id)}</div>
      <select id="rpK">${kinds.map((k) => `<option>${k}</option>`).join('')}</select>
      <textarea id="rpR" style="margin-top:8px" placeholder="어떤 부분이 왜 틀렸는지 적어 주세요. 근거(법령, 기사 등)가 있으면 함께 적어 주세요."></textarea>
      <p class="muted">관리자가 확인 후 문제를 수정합니다.</p>
      <div class="row"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="rpGo">접수</button></div>`);
    $('#rpGo').onclick = async () => {
      const reason = $('#rpR').value.trim();
      if (reason.length < 5) return toast('사유를 5자 이상 적어 주세요');
      $('#rpGo').disabled = true;
      try {
        const r = await Api.report({ qid: q.id, cat: q.cat, kind: $('#rpK').value, reason, snapshot: `${q.q} / 정답: ${answerText(q)}` });
        inc('reports'); checkAch(); save(); m.close(); toast(`접수됐어요 (${r.no}). 고마워요!`);
      } catch (e) { toast(e.message); $('#rpGo').disabled = false; }
    };
  }

  /* ---------------- 세션 진행 ---------------- */
  let inSession = false, abortSession = false;
  async function runSession(kind, key, opts = {}) {
    ensureDay();
    const { plan, replace } = buildPlan(kind, key);
    if (!plan.length) { toast(kind === 'review' ? '복습할 오답이 없어요!' : '이 분야에 출제 가능한 문제가 없어요.'); return; }
    inSession = true; abortSession = false; stageMode('');
    els.screen.innerHTML = ''; els.nav.classList.add('hidden'); els.vn.classList.add('on');
    const boss = kind === 'boss' ? bossTier() : null;
    const evs = todayEvents();
    const evMult = (cat) => evs.filter((e) => e.cats.includes(cat)).reduce((m, e) => m * e.mult, 1);
    const scored = kind === 'daily' || kind === 'extra' || kind === 'boss';
    const label = boss ? `일간 보스 · ${boss.title}` : kind === 'review' ? '오답노트 복습' : kind === 'practice' ? `학습회 · ${CATS[key].label}` : CATS[key].label + (kind === 'extra' ? ' (활기력)' : '');
    const ctx = { sess: {}, noItems: kind === 'review' };
    let combo = 0, sat = 60, xpSum = 0, cashSum = 0, okN = 0, prev = null, total = plan.length;
    const drawSess = (i) => {
      els.sess.classList.remove('hidden');
      els.sess.innerHTML = `<span class="chip">${esc(label)} · ${Math.min(i + 1, total)}/${total}</span>
        ${combo >= 2 ? `<span class="chip combo">🔥 ${combo} COMBO</span>` : ''}
        ${scored ? `<span class="chip">만족도<span class="sat"><i style="width:${sat}%"></i></span></span>` : ''}
        <button class="chip" id="quit">✕</button>`;
      $('#quit').onclick = async () => {
        const msg = (kind === 'daily' || kind === 'boss') ? '지금 그만두면 이 일정은 오늘 완료 처리돼요.\n(지금까지 얻은 XP는 유지)' : '그만할까요?';
        if (await confirmBox(msg, '그만하기', '계속하기')) abortSession = true;
      };
    };
    renderHud();

    if (boss) {
      S.bossSeen[boss.id] = 1;
      setBg(NPCS[bossNpc(boss)].bg); setChar(null);
      const bn = boss.npcs ? NPCS[bossNpc(boss)] : null; // 여러 명 중 오늘 온 사람
      await say(NARR, `${'★'.repeat(boss.stars)}${'☆'.repeat(5 - boss.stars)}  오늘의 보스 등장!\n「${bn ? bn.name : boss.title}」${bn ? ' ' + bn.role.split(' · ')[0] : ''}\n${bn ? boss.ndesc : boss.desc}\nXP ×${boss.mult} · 승리 보상 ${won(boss.cash)}`);
    } else if (key === 'market' && kind !== 'practice') {
      setBg('bank'); setChar(null);
      await say(NARR, `오늘은 △△은행 OO지점 지원 근무 날.\n뉴스를 보고 온 고객들이 하나둘 창구로 모여든다…`);
    }
    for (let i = 0; i < plan.length; i++) {
      if (abortSession) break;
      const { q, npc: nk } = plan[i];
      const npc = NPCS[nk], who = whoOf(nk);
      drawSess(i);
      if (nk !== prev) {
        if (prev) { els.chara.className = 'leave'; await sleep(300); }
        setBg(npc.bg);
        if (q.cat === 'market' && !boss && kind !== 'practice') await say(NARR, `🔔 딩동~ ${20 + Math.floor(Math.random() * 70)}번 고객님, 금융상품 창구로 오세요.`);
        setChar(npc.spec, 'normal', 'enter');
        await say(who, pick(npc.intro));
        prev = nk;
      }
      if (abortSession) break;
      const golden = scored && Math.random() < (ctx.sess.lucky ? 0.35 : 0.1);
      if (golden) { Snd.gold(); fx(`<div class="stamp gold">✨ 황금 문제 ×2</div>`, 1300); await sleep(900); }
      setChar(npc.spec, npc.rush ? 'shout' : 'normal');
      const sec = boss && boss.stars >= 4 ? (boss.stars === 5 ? 12 : 15) : (npc.time || 25);
      const r = await ask(q, who, npc, sec, ctx);
      els.dlg.classList.remove('asking'); els.meta.innerHTML = '';
      S.seen[q.id] = dayNum();
      if (r.skipped) {
        const rep = replace(q, nk);
        if (rep) { plan.push(rep); total = plan.length; }
        els.choices.innerHTML = '';
        await say(who, '(패스권을 내밀었다…) 그럼 다른 걸 물어볼게요.');
        continue;
      }
      const st = S.stats[q.cat] || (S.stats[q.cat] = { c: 0, n: 0 }); st.n++;
      const grp = CATS[q.cat] ? CATS[q.cat].group : 'banca';
      let line, extra;
      const obj = `<button class="objbtn" data-obj="${esc(q.id)}">⚠️ 이의 제기</button>`;
      if (r.correct) {
        combo++; okN++; st.c++; S.honor += 1;
        inc('correct'); inc('c_' + q.cat);
        if (NPC_CNT.includes(nk)) inc('npc_' + nk);
        const fast = r.ms < sec * 1000 * 0.35;
        if (r.ms < 3000) inc('speed');
        if (golden) inc('golden');
        sat = Math.min(100, sat + (fast ? 15 : 10));
        let xp = 0, cash = 0;
        if (scored) {
          const mult = (boss ? boss.mult : evMult(q.cat) * (opts.bonus || 1)) * (golden ? 2 : 1) * (ctx.sess.xpboost ? 1.5 : 1);
          xp = Math.round(DIFF_XP[q.diff || 1] * (1 + Math.min(combo - 1, 5) * 0.1) * (fast ? 1.3 : 1) * mult);
          cash = CASH[q.diff || 1] * (golden ? 2 : 1) * (ctx.sess.cashboost ? 2 : 1);
          S.groupXp[grp] = (S.groupXp[grp] || 0) + xp;
        } else if (kind === 'practice') {
          xp = STUDY_XP.practice; cash = CASH.practice; inc('practice');
        } else {
          delete S.wrong[q.id]; inc('fixed'); S.honor += 4;
        }
        xpSum += xp; cashSum += cash;
        Snd.ok();
        setChar(npc.spec, 'happy', 'hop');
        fx(`<div class="emote">${pick(['💖', '✨', '🎵', '👍'])}</div>`, 1300);
        fx(`<div class="stamp ok">${kind === 'review' ? '극복!' : (q.cat === 'market' || boss) ? '계약 성사!' : '정답!'}</div>`, 1100);
        if (xp || cash) setTimeout(() => fx(`<div class="xpfloat">${xp ? `+${xp} XP` : ''}${cash ? ` · +${cash}원` : ''}${fast ? ' ⚡' : ''}</div>`, 1500), 250);
        S.bestCombo = Math.max(S.bestCombo, combo);
        line = pick(npc.ok);
        extra = `<span class="exp">📘 ${esc(q.exp || '')}${obj}</span>`;
      } else {
        if (!r.shield) combo = 0;
        sat = Math.max(0, sat - (r.timeout ? 15 : 12));
        S.wrong[q.id] = { n: ((S.wrong[q.id] || {}).n || 0) + 1, t: Date.now() };
        revealAnswer(q); Snd.ng();
        const kindNpc = KIND_NPCS.includes(nk);
        setChar(npc.spec, kindNpc ? 'worried' : (npc.rush ? 'shout' : 'angry'), 'shake');
        fx(`<div class="emote">${kindNpc ? '💦' : '💢'}</div>`, 1300);
        fx(`<div class="stamp ng">${r.timeout ? '시간 초과' : '오답'}</div>`, 1100);
        if (r.shield) setTimeout(() => toast('🛡️ 콤보 보호막이 콤보를 지켰어요!'), 600);
        line = pick(r.timeout ? npc.timeout : npc.ng);
        extra = `<span class="exp">정답: <span class="ans">${esc(answerText(q))}</span>\n📘 ${esc(q.exp || '')}${obj}</span>`;
      }
      drawSess(i);
      checkAch();
      await sleep(350);
      await say(who, line, { extra });
      els.choices.innerHTML = '';
      setChar(npc.spec, r.correct ? 'smile' : 'normal');
      save();
    }

    // 마무리
    const n = total, lastKey = prev || plan[0].npc, last = NPCS[lastKey];
    const good = okN >= Math.ceil(n * 0.6);
    let bonus = 0;
    if (!abortSession && okN === n && scored) { bonus = Math.round(xpSum * 0.3) + 20; xpSum += bonus; cashSum += CASH.perfect; inc('perfect'); }
    if (!abortSession && last && last.end) {
      setChar(last.spec, good ? 'happy' : 'normal');
      await say(whoOf(lastKey), good ? last.end.good : last.end.bad);
    }
    const beforeRank = rankOf(S.lv);
    if (scored) touchStreak();
    let bossWin = false;
    if (boss) {
      S.dailyBoss.done = { ok: okN, n, xp: xpSum }; S.dailyBoss.tries++;
      bossWin = !abortSession && good;
      if (bossWin) { inc('boss_' + boss.id); cashSum += boss.cash; }
    }
    const ups = addXp(xpSum);
    earn(cashSum);
    if (kind === 'daily') {
      S.daily.done[key] = { ok: okN, n, xp: xpSum };
      const open = CAT_ORDER.filter((c) => catCount(c) > 0);
      if (!S.daily.fullCounted && open.every((c) => S.daily.done[c])) { S.daily.fullCounted = true; inc('fullday'); }
    }
    checkAch(); save(); syncNow();
    inSession = false;
    els.vn.classList.remove('on'); els.sess.classList.add('hidden'); els.choices.innerHTML = '';
    await showResult({ kind, label, okN, n, xpSum, cashSum, bonus, sat, ups, scored, bossWin, boss });
    const afterRank = rankOf(S.lv);
    if (afterRank !== beforeRank) await promotion(afterRank);
    if (S.lv >= CLASS_LV && !S.classShown) await classReveal();
    checkAch(); save();
    eventRoll = true;
    if (kind === 'practice' || kind === 'review') pageStudy(); else goHome();
  }

  function showResult(r) {
    return new Promise((res) => {
      const rate = r.okN / r.n;
      const g = r.okN === r.n ? 'S' : rate >= 0.8 ? 'A' : rate >= 0.6 ? 'B' : rate >= 0.4 ? 'C' : 'D';
      const title = r.kind === 'review' ? '복습 완료' : r.kind === 'practice' ? '학습회 완료' : r.boss ? (r.bossWin ? '보스 격파!' : '보스전 패배…') : '영업 일정 완료';
      if (r.ups.length || r.bossWin) { Snd.lv(); confetti(70); }
      modal(`<h2>${title}</h2><div class="muted" style="text-align:center">${esc(r.label)}</div>
        <div class="grade">${g}</div>
        <div class="res">
          <div><b>${r.okN} / ${r.n}</b>${r.boss || r.label === CATS.market.label ? '계약 성사' : '정답'}</div>
          ${r.scored ? `<div><b>${r.sat}%</b>고객 만족도</div>` : `<div><b>${r.kind === 'practice' ? '소량' : '-'}</b>학습 보상</div>`}
          <div><b>+${r.xpSum}</b>획득 XP${r.bonus ? ` (보너스 ${r.bonus})` : ''}</div>
          <div><b>+${won(r.cashSum)}</b>활동비</div>
        </div>
        <div class="muted" style="text-align:center;margin-bottom:10px">Lv.${S.lv} ${rankOf(S.lv).title}${r.ups.length ? ` · 🎉 레벨 업! (+${r.ups.length})` : ''}</div>
        ${r.okN < r.n && r.kind !== 'review' ? '<p class="muted" style="text-align:center">틀린 문제는 📒 오답노트에 저장됐어요.</p>' : ''}
        <button class="btn full" data-close>확인</button>`, res);
    });
  }
  const PROMO_LINES = {
    5: '정장 잘 어울리네. 이제 진짜 BM이다. 은행 지점 나가보자.',
    10: '명함 나왔다. 이제 네 이름 걸고 은행 지점들을 맡아라.',
    20: '지역단장 축하한다. 이제 BM들을 이끄는 자리야. 어깨가 무겁지?',
    30: '사업부장… 허허, 내 상사가 됐군. 잘 부탁드립니다.',
    40: '부사장님. 회사의 방카 전략이 이제 당신 손에 달렸습니다.',
    50: '사장님… 인턴 시절 커피 타던 게 엊그제 같은데. 영광입니다.'
  };
  async function promotion(rank) {
    els.vn.classList.add('on'); els.nav.classList.add('hidden'); els.screen.innerHTML = ''; stageMode('');
    setBg(rank.bg); fx('<div class="flash"></div>', 900); Snd.lv(); confetti(90);
    setChar(playerSpec(), 'happy', 'enter'); renderHud();
    await say(NARR, `🎉 승진을 축하합니다!\n${S.name} → 【${rank.title}】`);
    setChar(NPCS.partjang.spec, 'smile', 'enter');
    await say(whoOf('partjang'), PROMO_LINES[rank.lv] || '축하한다!');
    const cos = COSTUMES.find((c) => c.lv === rank.lv && c.st > 1);
    if (cos) { // 의상 단계가 바뀌는 직급: 새 의상 지급
      S.costume = null; save(); // 옷장은 '직급에 맞춤'으로
      const ready = !hasFace && !S.illust ? false : /@s\d$/.test(playerSpec().key) || cos.st === 2;
      setChar(playerSpec(), 'smile', 'hop'); fx('<div class="flash"></div>', 700); Snd.lv(); confetti(50);
      await say(NARR, `${cos.icon} 새 의상이 지급되었습니다!\n【${cos.name}】 ${cos.desc}${ready ? '' : '\n(새 의상 그림은 곧 도착해요. 그때까지는 지금 옷으로!)'}\n내 캐릭터 → 👔 옷장에서 언제든 갈아입을 수 있어요.`);
    }
    const car = CARS.find((c) => c.rank === RANKS.indexOf(rank));
    if (car) { // 직급마다 새 차 지급
      fx('<div class="flash"></div>', 700); Snd.coin();
      await say(NARR, `🔑 새 차 열쇠를 받았습니다!
${car.icon} 【${car.name}】
${car.desc}
${car.glb ? '홈 화면 → 🚗 내 차고에서 360도로 돌려 볼 수 있어요.' : '(3D 차량은 곧 도착해요. 홈 화면 → 🚗 내 차고)'}`);
    }
    els.vn.classList.remove('on');
  }
  async function classReveal() {
    const c = CLASSES[currentClass() || 'all'];
    els.vn.classList.add('on'); els.screen.innerHTML = ''; stageMode('');
    setBg('booth'); setChar(playerSpec(), 'happy', 'enter'); confetti(40);
    await say(NARR, `🎖️ 명예 직업 획득!\n${c.icon} ${c.name}\n\n가장 많이 성장한 분야에 따라 명예 직업이 정해져요. 다른 분야를 키우면 바뀔 수도 있어요!`);
    S.classShown = true; S.lastClass = currentClass(); save();
    els.vn.classList.remove('on');
  }

  /* ---------------- HUD ---------------- */
  function renderHud() {
    const r = rankOf(S.lv), cls = currentClass(), need = xpNeed(S.lv);
    const pct = S.lv >= MAX_LV ? 100 : Math.round((S.xp / need) * 100);
    els.hud.classList.remove('hidden');
    els.hud.innerHTML = `<div class="hud-card" data-go="char">
        <div class="hud-ava">${charHTML(playerSpec(), rest(), { head: true })}</div>
        <div class="hud-info"><div class="hud-top"><span class="lvpill">Lv.${S.lv}</span><b>${esc(S.name)}</b><span>${r.title}${cls ? ' · ' + CLASSES[cls].icon : ''}</span></div>
        <div class="xpbar"><i style="width:${pct}%"></i></div></div></div>
      <button class="hud-money" id="moneyBtn">💰 ${won(S.money)}</button>
      <button class="hud-btn" id="sndBtn" aria-label="소리">${S.sound ? '🔊' : '🔇'}</button>`;
    els.hud.querySelector('[data-go]').onclick = () => !inSession && go('char');
    $('#moneyBtn').onclick = () => !inSession && go('shop');
    $('#sndBtn').onclick = () => { S.sound = !S.sound; save(); renderHud(); };
  }

  /* ---------------- 화면 전환 ---------------- */
  function setNav(k) { els.nav.classList.remove('hidden'); els.nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.go === k)); }
  els.nav.querySelectorAll('button').forEach((b) => b.onclick = () => go(b.dataset.go));
  let curPage = 'title';
  function go(k) {
    if (inSession) return;
    curPage = k;
    ({ home: goHome, study: pageStudy, shop: pageShop, char: pageChar, settings: pageSettings, wrong: pageWrong, lib: pageLib, news: pageNews, admin: pageAdmin, rank: pageRank, submit: pageSubmit, drive: pageDrive })[k]();
  }
  const backBtn = (to, label) => `<button class="back" data-back="${to}">← ${label}</button>`;
  const bindBack = () => els.screen.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => go(b.dataset.back));

  function greeting() {
    const h = new Date().getHours();
    return h < 11 ? '좋은 아침이에요' : h < 14 ? '점심은 드셨나요' : h < 18 ? '오후도 힘내요' : '야근 중이신가요';
  }
  function goHome() {
    curPage = 'home';
    ensureDay(); rollEvent(); save();
    const r = rankOf(S.lv);
    stageMode('home'); setBg(r.bg); setChar(playerSpec(), rest(), 'enter'); renderHud(); setNav('home');
    const cls = currentClass();
    if (cls && S.lastClass && cls !== S.lastClass) toast(`명예 직업 변경: ${CLASSES[cls].icon} ${CLASSES[cls].name}`, 3200);
    if (cls) S.lastClass = cls;
    const evs = todayEvents(), open = CAT_ORDER.filter((c) => catCount(c) > 0);
    const doneN = open.filter((c) => S.daily.done[c]).length;
    const b = bossTier(), bd = S.dailyBoss.done, vig = (S.items.drink || 0) + (S.items.ginseng || 0);
    els.screen.innerHTML = `<button class="officebtn" id="officeGo">🏢 사무실 가기</button><button class="officebtn garagebtn" id="garageGo">🚗 내 차고</button><div class="sheet">
      ${S.events && S.events.pending ? '<button class="newsflash" id="evGo">📨 새 소식이 도착했어요! <b>확인하기 →</b></button>' : ''}
      <h3><span>${greeting()},<br>${esc(S.name)} ${r.title}님!</span><small>오늘 ${doneN}/${open.length} 완료<br>🔥 ${S.streak.count}일 연속 출근</small></h3>
      ${evs.length ? `<div class="events">${evs.map((e) => `<div class="event">${e.icon} ${e.title}<small>${e.desc}</small></div>`).join('')}</div>` : ''}
      <div class="bosswrap">
        <button class="boss ${bd ? 'done' : ''}" id="bossBtn">
          <div class="ava">${charHTML(NPCS[bossNpc(b)].spec, 'smirk', { head: true })}</div>
          <div><span class="tag">오늘의 보스 ${'★'.repeat(b.stars)}</span><div class="t">${b.npcs ? NPCS[bossNpc(b)].name : b.title}</div>
            <div class="d">${bd ? `오늘 완료 · ${bd.ok}/${bd.n} · +${bd.xp}XP${S.items.bossticket ? ' · 🎫 재도전 가능' : ''}` : `${b.count}문제 · XP ×${b.mult} · 승리 ${won(b.cash)}`}</div></div>
        </button>
        <button class="bossinfo" id="bossInfo" aria-label="보스 설명">!</button>
      </div>
      <div class="cards">${CAT_ORDER.map((k) => {
        const c = CATS[k], d = S.daily.done[k], x2 = evs.some((e) => e.cats.includes(k)), n = catCount(k);
        const who = c.npcs.map((x) => NPCS[x].name).join(' · ');
        if (!n) return `<div class="card empty" style="--c:${c.color}"><div class="ic">${c.icon}</div><div class="t">${c.label}</div><div class="d">📭 문제 준비 중</div><div class="who">관리자가 자료를 등록하면 열려요</div></div>`;
        return `<button class="card ${d ? 'done' : ''}" data-cat="${k}" style="--c:${c.color}" ${d ? `data-res="${d.ok}/${d.n} · +${d.xp}XP"` : ''}>
          ${x2 && !d ? '<span class="x2">EVENT</span>' : ''}<div class="ic">${c.icon}</div><div class="t">${c.label}</div><div class="d">${c.desc}</div>
          ${d ? `<div class="who">${vig ? '🧃 활기력으로 한 번 더 →' : '오늘 완료 · 내일 다시'}</div>` : `<div class="who">출제: ${esc(who)}</div>`}</button>`;
      }).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="studycta" data-go2="study" style="margin-top:0">📚 <b>학습회</b>에서<br>계속 공부하기 →</button>
        <button class="studycta rankcta" data-go2="rank" style="margin-top:0">🏆 <b>최우수BM</b><br>주간·월간 랭킹 →</button></div>
      <button class="studycta drivecta" data-go2="drive">🚗 <b>BM 드라이빙</b> · 출근길 미로 / 고속도로 질주 <small>미니게임 · 시간 대결 →</small></button>
    </div>
    <button class="chartap" id="charTap" aria-label="내 캐릭터에게 말 걸기"></button>`;
    els.screen.querySelectorAll('.card[data-cat]').forEach((c) => c.onclick = () => {
      const k = c.dataset.cat;
      if (!S.daily.done[k]) return runSession('daily', k);
      useVigor(k);
    });
    els.screen.querySelectorAll('[data-go2]').forEach((b) => b.onclick = () => go(b.dataset.go2));
    $('#officeGo').onclick = () => { Snd.tap(); openOffice(); };
    $('#garageGo').onclick = () => { Snd.tap(); openGarage(); };
    $('#charTap').onclick = charTalk;
    const evGo = $('#evGo'); if (evGo) evGo.onclick = runEvent;
    checkInbox();
    $('#bossBtn').onclick = async () => {
      if (!bd) return runSession('boss');
      if (!S.items.bossticket) return toast('오늘의 보스는 끝! 내일 새 보스가 와요. (🎫 보스 재도전권으로 한 번 더 가능)');
      if (await confirmBox(`🎫 보스 재도전권을 써서 ${b.title}에게 다시 도전할까요?`, '도전!')) { S.items.bossticket--; inc('itemsUsed'); save(); runSession('boss'); }
    };
    $('#bossInfo').onclick = bossInfo;
  }
  function bossInfo() {
    modal(`<h2 style="font-size:22px">🎲 일간 보스 도감</h2>
      <p class="muted" style="text-align:center;margin:4px 0 12px">매일 한 명이 무작위로 찾아와요. 아래로 갈수록 드물고 어려워요!</p>
      ${BOSS_TIERS.map((t) => {
        const seen = S.bossSeen[t.id], wins = S.cnt['boss_' + t.id] || 0;
        const faces = (t.npcs || [t.npc]).map((k) => `<div class="ava">${charHTML(NPCS[k].spec, 'normal', { head: true })}</div>`).join('');
        return `<div class="bossrow ${seen ? '' : 'unseen'}"><div class="avas">${faces}</div>
          <div><b>${t.title}</b> <span class="stars">${'★'.repeat(t.stars)}${'☆'.repeat(5 - t.stars)}</span>
          <div class="muted">${t.desc}</div><div class="muted">등장 ${t.rate}% · ${t.count}문제 · XP ×${t.mult} · 승리 ${won(t.cash)}${seen ? ` · 격파 ${wins}회` : ' · 아직 못 만남'}</div></div></div>`;
      }).join('')}
      <button class="btn full" data-close style="margin-top:10px">닫기</button>`);
  }
  async function useVigor(cat) {
    const has = ['drink', 'ginseng'].filter((id) => S.items[id] > 0);
    if (!has.length) return toast('오늘은 완료! 🧃 병음료나 🌿 홍삼(매점)으로 한 번 더 할 수 있어요');
    const m = modal(`<h2 style="font-size:22px">활기력 충전!</h2><p class="muted" style="text-align:center">「${CATS[cat].label}」을 한 번 더 할까요?</p>
      ${has.map((id) => { const it = ITEMS.find((x) => x.id === id); return `<button class="btn ghost full" style="margin-top:8px" data-v="${id}">${it.icon} ${it.name} (${S.items[id]}개) — ${it.desc}</button>`; }).join('')}
      <button class="btn ghost full" style="margin-top:8px" data-close>취소</button>`);
    m.el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
      const it = ITEMS.find((x) => x.id === b.dataset.v);
      S.items[it.id]--; inc('vigor'); inc('itemsUsed'); save(); m.close();
      toast(`${it.icon} 활기력 충전! 힘이 난다!`);
      runSession('extra', cat, { bonus: it.bonus || 1 });
    });
  }

  /* ---------------- 내 캐릭터 말풍선 (홈에서 터치) ---------------- */
  let talkLast = -1, talkTaps = [], talkTimer = null;
  // 멘트는 구글 시트 '멘트' 탭에서 불러온다 (실패하면 마지막 저장본 → 기본값)
  let TALK = null;
  function loadTalk(items) {
    if (items && items.length) { TALK = items; try { localStorage.setItem('bmq_talk', JSON.stringify(items)); } catch (e) { } return; }
    try { TALK = JSON.parse(localStorage.getItem('bmq_talk')) || null; } catch (e) { }
  }
  const TALK_TYPE = { '말': 'say', '생각': 'think' };
  const TALK_EXPR = { '기본': 'normal', '미소': 'smile', '활짝': 'happy', '씩': 'smirk', '놀람': 'surprised', '걱정': 'worried', '화남': 'angry' };
  function talkLines() {
    const h = new Date().getHours(), open = CAT_ORDER.filter((c) => catCount(c) > 0);
    const done = open.filter((c) => S.daily.done[c]).length, b = bossTier();
    const ok = {
      '항상': true, '아침(10시 전)': h < 10, '야근(21시 이후)': h >= 21, '일정 시작 전': !done,
      '일정 모두 완료': open.length > 0 && done === open.length, '활동비 500원 미만': S.money < 500, '활동비 2만원 이상': S.money >= 20000,
      '3일 이상 연속 출근': S.streak.count >= 3, '오답 20개 이상': Object.keys(S.wrong).length >= 20,
      '사업부장 이상': S.lv >= 30, '사장': S.lv >= 50, '희귀 보스 등장': b.stars >= 4 && !S.dailyBoss.done
    };
    const fill = (t) => t.replace(/\{이름\}/g, S.name).replace(/\{직급\}/g, rankOf(S.lv).title).replace(/\{레벨\}/g, S.lv)
      .replace(/\{연속\}/g, S.streak.count).replace(/\{보스\}/g, b.title);
    const L = (TALK && TALK.length ? TALK : TALK_DEFAULT).filter((r) => (r.cond in ok ? ok[r.cond] : true))
      .map((r) => [TALK_TYPE[r.type] || 'say', TALK_EXPR[r.expr] || 'normal', fill(String(r.text))]);
    return L.length ? L : [['say', 'smile', '오늘도 힘내 봅시다!']];
  }
  function charTalk() {
    const now = Date.now();
    talkTaps = talkTaps.filter((t) => now - t < 3000); talkTaps.push(now);
    let line;
    if (talkTaps.length >= 6) { line = ['say', 'angry', '그만 좀 찔러요! 업무 중이라구요!']; talkTaps = []; }
    else {
      const L = talkLines(); let i;
      do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === talkLast);
      talkLast = i; line = L[i];
    }
    const [type, expr, msg] = line;
    setChar(playerSpec(), expr, expr === 'angry' ? 'shake' : 'hop'); Snd.tap();
    els.fx.querySelectorAll('.talk').forEach((x) => x.remove());
    const n = fx(`<div class="talk ${type}">${esc(msg)}</div>`, 3600);
    clearTimeout(talkTimer); talkTimer = setTimeout(() => { if (!inSession && $('#stage').className === 'home') setChar(playerSpec(), rest()); }, 3600);
    return n;
  }

  /* ---------------- 랜덤 이벤트 ---------------- */
  let eventRoll = false;
  function rollEvent() {
    if (!eventRoll) return; eventRoll = false;
    const t = today(); S.events = S.events && S.events.date === t ? S.events : { date: t, n: 0, pending: null };
    if (S.events.pending || S.events.n >= 3) return;
    if (Math.random() > (S.events.n === 0 ? 0.5 : 0.25)) return;
    const tot = RANDOM_EVENTS.reduce((a, e) => a + e.w, 0);
    let r = Math.random() * tot;
    S.events.pending = (RANDOM_EVENTS.find((e) => (r -= e.w) < 0) || RANDOM_EVENTS[0]).id;
    S.events.n++; save();
  }
  async function grant(g) {
    const before = rankOf(S.lv), parts = [];
    if (g.xp) { const ups = addXp(g.xp); parts.push(`+${g.xp} XP`); if (ups.length) parts.push(`🎉 Lv.${S.lv}`); }
    if (g.cash) { if (g.cash > 0) earn(g.cash); else S.money = Math.max(0, S.money + g.cash); parts.push(`${g.cash > 0 ? '+' : ''}${won(g.cash)}`); }
    if (g.honor) { S.honor += g.honor; parts.push(`명예 +${g.honor}`); }
    Object.entries(g.items || {}).forEach(([id, n]) => { S.items[id] = (S.items[id] || 0) + n; const it = ITEMS.find((x) => x.id === id); parts.push(`${it.icon} ${it.name} +${n}`); });
    if (parts.length) toast('🎁 ' + parts.join(' · '), 3200);
    checkAch(); save(); renderHud();
    if (rankOf(S.lv) !== before) await promotion(rankOf(S.lv));
  }
  function choose(opts) {
    return new Promise((res) => {
      els.choices.innerHTML = opts.map((o, i) => `<button class="choice" data-c="${i}"><span>${esc(o)}</span></button>`).join('');
      els.choices.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { els.choices.innerHTML = ''; Snd.tap(); res(+b.dataset.c); });
    });
  }
  async function eventQuiz(nk, filter, reward) {
    const list = rankForPick(pool().filter(filter));
    const q = list[0];
    if (!q) return say(whoOf(nk), '…아, 지금 바쁘다고? 다음에 물어볼게!');
    const npc = NPCS[nk];
    const r = await ask(q, whoOf(nk), npc, 20, { sess: {}, noItems: true });
    els.dlg.classList.remove('asking'); els.meta.innerHTML = ''; S.seen[q.id] = dayNum();
    if (r.correct) {
      Snd.ok(); setChar(npc.spec, 'happy', 'hop'); fx('<div class="stamp ok">정답!</div>', 1100);
      inc('correct'); inc('c_' + q.cat);
      await say(whoOf(nk), pick(npc.ok), { extra: `<span class="exp">📘 ${esc(q.exp || '')}</span>` });
      els.choices.innerHTML = '';
      await grant(reward);
    } else {
      Snd.ng(); revealAnswer(q); setChar(npc.spec, 'worried', 'shake');
      S.wrong[q.id] = { n: ((S.wrong[q.id] || {}).n || 0) + 1, t: Date.now() };
      await say(whoOf(nk), '아쉽다! 다음엔 맞혀 봐.', { extra: `<span class="exp">정답: <span class="ans">${esc(answerText(q))}</span>\n📘 ${esc(q.exp || '')}</span>` });
      els.choices.innerHTML = '';
    }
  }
  const RANDOM_EVENTS = [
    { id: 'coffee', w: 10, bg: 'bank', npc: 'worker', run: async (w) => {
      await say(w, 'BM님! 지난번에 알려주신 대로 설명했더니 고객님이 바로 이해하셨어요.');
      await say(w, '감사의 의미로… 커피 쿠폰이에요! ☕');
      await grant({ cash: 500, honor: 10 });
    } },
    { id: 'elevator', w: 12, bg: 'office', npc: 'kimpro', run: async (w) => {
      await say(w, '어, 마침 잘 만났네요. 엘리베이터 도착 전까지 깜짝 퀴즈!');
      await eventQuiz('kimpro', (q) => q.cat === 'banca_product' || q.cat === 'banca_general', { xp: 30, cash: 300 });
    } },
    { id: 'senior', w: 10, bg: 'office', npc: 'choiseonim', run: async (w) => {
      await say(w, '…야. 퇴근 전에 하나만.');
      await eventQuiz('choiseonim', (q) => q.cat === 'term', { xp: 25, cash: 250 });
    } },
    { id: 'gift', w: 7, bg: 'bank', npc: 'halmeoni', run: async (w) => {
      await say(w, '아이고 그때 그 총각, 아니 그 BM 양반! 덕분에 연금 잘 받고 있어!');
      await say(w, '이거 우리 아들이 보낸 홍삼인디… 하나 먹어!');
      await grant({ items: { ginseng: 1 }, honor: 15 });
    } },
    { id: 'paper', w: 9, bg: 'office', npc: 'hwangpro', run: async (w) => {
      await say(w, 'BM님~ 어제 접수된 청약서, 자필서명 하나가 빠져서 반송될 것 같아요 😥');
      const c = await choose(['직접 지점에 가서 보완 받는다 (명예 +20)', '퀵으로 서류를 주고받는다 (활동비 -300원)']);
      if (c === 0) { await say(w, '역시! 직접 챙기시는 BM님 최고예요. 지점에서도 좋아하겠어요.'); await grant({ honor: 20, xp: 15 }); }
      else { await say(w, '네~ 퀵 접수해 둘게요. 다음엔 꼭 같이 체크해요!'); await grant({ cash: -300 }); }
    } },
    { id: 'dinner', w: 7, bg: 'branch_office', npc: 'branchmgr', run: async (w) => {
      await say(w, '이번 분기 방카 실적 좋았어요. 오늘 지점 회식 같이 하실래요?');
      const c = await choose(['참석한다! (명예 +30, 내일 좀 피곤…)', '정중히 사양한다 (다음 기회에)']);
      if (c === 0) { await say(w, '좋아요! 우리 직원들이 BM님 팬이에요.'); await grant({ honor: 30, xp: 20 }); }
      else await say(w, '아쉽네요. 다음엔 꼭 같이 해요!');
    } },
    { id: 'drawer', w: 8, bg: 'office', npc: null, run: async () => {
      await say(NARR, '책상 서랍 깊숙한 곳에서 무언가 반짝인다…');
      await say(NARR, '🍀 예전에 사은품으로 받은 「행운의 볼펜」을 찾았다!');
      await grant({ items: { lucky: 1 } });
    } },
    { id: 'flash', w: 10, bg: 'bank', npc: 'ajeossi', run: async (w) => {
      await say(NARR, '📢 속보! 경제 뉴스가 쏟아지자 창구에 문의가 몰린다.');
      await say(w, '어이 BM! 뉴스 봤어? 빨리 하나만 물어보자!');
      await eventQuiz('ajeossi', (q) => q.cat === 'market', { xp: 35, cash: 400 });
    } },
    { id: 'mentor', w: 8, bg: 'office', npc: 'partjang', run: async (w) => {
      await say(w, '잠깐 앉아 봐. …요즘 숫자에 쫓기지?');
      await say(w, '실적은 결과일 뿐이야. 고객이 이해하고 가입하게 만드는 것, 그게 방카BM의 실력이다.');
      await say(w, '오늘도 정확하게. 그거면 된다.');
      await grant({ honor: 15 });
    } },
    { id: 'lottery', w: 6, bg: 'office', npc: 'yunpro', run: async (w) => {
      await say(w, '동기야!! 사내 경품 추첨 결과 나왔어! 너도 당첨이래!');
      const prize = pick(['hint', 'erase', 'time', 'shield', 'calm', 'drink']);
      await grant({ items: { [prize]: 1 } });
      await say(w, '부럽다~ 나는 꽝이야 ㅠㅠ');
    } },
    // VIP 전화: 정회장님 · 김회장님 · VIP 사모님 중 한 명
    { id: 'vipcall', w: 5, bg: 'vip', npc: 'vip', npcs: ['vip', 'vipkim', 'vipmadam'], run: async (w, nk) => {
      await say(NARR, '📞 낯선 번호로 전화가 온다…');
      await say(w, NPCS[nk].call);
      await eventQuiz(nk, (q) => q.diff === 3 && ['banca_general', 'market', 'econ'].includes(q.cat), { xp: 80, cash: 1000, honor: 20 });
    } },
    { id: 'umbrella', w: 6, bg: 'bank', npc: 'teamlead', run: async (w) => {
      await say(NARR, '갑자기 소나기가 쏟아진다. 은행 앞에서 우산 없이 서 있는 팀장님이 보인다.');
      const c = await choose(['내 우산을 빌려드린다', '같이 비 그칠 때까지 기다린다']);
      await say(w, c === 0 ? '어머, BM님 고마워요! 이번 주 직원 교육, BM님한테 맡길게요.' : '덕분에 심심하지 않았어요. 방카 얘기도 많이 들었네요!');
      await grant({ honor: 20, xp: 10 });
    } }
  ];
  async function runEvent() {
    const ev = RANDOM_EVENTS.find((e) => e.id === (S.events || {}).pending);
    S.events.pending = null; save();
    if (!ev) return goHome();
    inSession = true; stageMode(''); els.screen.innerHTML = ''; els.nav.classList.add('hidden'); els.vn.classList.add('on');
    const nk = ev.npcs ? pick(ev.npcs) : ev.npc; // 여러 명 중 한 명이 등장하는 이벤트
    setBg(ev.bg); setChar(nk ? NPCS[nk].spec : null, 'smile', 'enter');
    try { await ev.run(nk ? whoOf(nk) : NARR, nk); } catch (e) { console.error(e); }
    els.vn.classList.remove('on'); els.choices.innerHTML = ''; inSession = false;
    goHome();
  }

  /* ---------------- 최우수BM 랭킹 ---------------- */
  let rankTab = 'week';
  async function pageRank() {
    setNav('home');
    els.screen.innerHTML = `<div class="page">${backBtn('home', '오늘 일정')}<h2>🏆 최우수BM</h2><div class="loading"><div class="spin"></div>순위를 불러오는 중…</div></div>`;
    bindBack();
    let r;
    try { [, r] = await Promise.all([syncNow(), Api.ranking(periodKeys())]); } catch (e) { toast(e.message); return; }
    // 저장과 동시에 불러왔으니 내 최신 실적은 이 기기 값으로 반영
    const pd = ensurePeriod();
    [[r.week, pd.week === r.week.key ? pd.weekXp : 0], [r.month, pd.month === r.month.key ? pd.monthXp : 0]].forEach(([box, xp]) => {
      if (!(xp > 0)) return;
      let mine = box.list.find((x) => x.me);
      if (!mine) { mine = { name: S.name, lv: S.lv, me: true, uid: '', xp: 0 }; box.list.push(mine); }
      mine.xp = Math.max(mine.xp, xp); mine.lv = S.lv; mine.name = S.name;
      box.list.sort((a, c) => c.xp - a.xp);
    });
    S.awards = S.awards || {};
    for (const [k, w] of [['week', r.lastWeek], ['month', r.lastMonth]]) {
      const id = `${k}:${w.key}`;
      if (w.winner && w.winner.me && !S.awards[id]) {
        S.awards[id] = Date.now(); confetti(90); Snd.lv();
        modal(`<h2>👑 ${BEST_BM[k].label} 최우수BM!</h2><p style="text-align:center;line-height:1.6">${esc(w.key)} ${BEST_BM[k].label} 최우수BM으로 선정됐어요!<br>명예 +${BEST_BM[k].honor} · 활동비 +${won(BEST_BM[k].cash)}</p><button class="btn full" data-close>감사합니다!</button>`);
        await grant({ honor: BEST_BM[k].honor, cash: BEST_BM[k].cash });
      }
    }
    const cur = rankTab === 'week' ? r.week : r.month, last = rankTab === 'week' ? r.lastWeek : r.lastMonth;
    primePeerFaces(cur.list);
    const cheer = r.cheer || { left: 0, to: [] };
    const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;
    const page = els.screen.querySelector('.page'); if (!page) return;
    page.querySelector('.loading').outerHTML = `
      <div class="seg"><button data-rt="week" class="${rankTab === 'week' ? 'on' : ''}">주간 (${esc(r.week.key)})</button><button data-rt="month" class="${rankTab === 'month' ? 'on' : ''}">월간 (${esc(r.month.key)})</button></div>
      <div class="box winner">${last.winner ? `👑 지난 ${rankTab === 'week' ? '주' : '달'} 최우수BM <b>${esc(last.winner.name)}</b> <span class="muted">Lv.${last.winner.lv} · ${last.winner.xp.toLocaleString()} XP</span>` : `<span class="muted">지난 ${rankTab === 'week' ? '주' : '달'} 기록이 아직 없어요.</span>`}</div>
      <p class="muted">이번 ${rankTab === 'week' ? '주' : '달'}에 얻은 경험치로 순위를 매겨요. 1위는 다음 ${rankTab === 'week' ? '주' : '달'}에 최우수BM으로 선정돼 명예 +${BEST_BM[rankTab].honor} · ${won(BEST_BM[rankTab].cash)}을 받아요.</p>
      <div class="box row" style="justify-content:space-between;padding:10px 14px"><span>📣 오늘 남은 응원 <b id="cheerLeft">${cheer.left}</b>/${SOCIAL.cheerPerDay}</span><span class="muted">응원받은 동료는 ${won(SOCIAL.cheerCash)} · 명예 +${SOCIAL.cheerHonor}</span></div>
      ${cur.list.length ? cur.list.map((x, i) => `<div class="rankrow ${x.me ? 'me' : ''}"><span class="rk">${x.xp > 0 ? medal(i) : '·'}</span><button class="rkav" data-av="${i}" aria-label="${esc(x.name)} 캐릭터 보기">${avatar(x)}</button><span class="nm" data-av="${i}">${esc(x.name)}${x.me ? ' (나)' : ''}<small>Lv.${x.lv} ${rankOf(x.lv).title} · ${x.xp.toLocaleString()} XP</small></span>
        ${x.me ? '' : `<span class="acts"><button class="btn mini" data-cheer="${esc(x.uid)}" data-nm="${esc(x.name)}" ${cheer.left <= 0 || cheer.to.includes(x.uid) ? 'disabled' : ''}>${cheer.to.includes(x.uid) ? '응원 완료' : '📣 응원'}</button><button class="btn ghost mini" data-send="${esc(x.uid)}" data-nm="${esc(x.name)}">💸</button></span>`}</div>`).join('')
        : '<p class="muted" style="text-align:center;margin-top:30px">아직 이번 기간 기록이 없어요. 첫 1위를 노려 보세요!</p>'}`;
    els.screen.querySelectorAll('[data-rt]').forEach((b) => b.onclick = () => { rankTab = b.dataset.rt; pageRank(); });
    els.screen.querySelectorAll('[data-av]').forEach((b) => b.onclick = () => charViewer(cur.list[+b.dataset.av]));
    // 실물 캐릭터 사진은 기본 표정만 먼저 받아서 바꿔 끼운다
    const fl = needFull(cur.list);
    if (fl.length) loadPeerFaces(fl.map(pfid), ['normal']).then(() => {
      els.screen.querySelectorAll('button.rkav').forEach((b) => { const x = cur.list[+b.dataset.av]; if (x && x.face && !x.me) b.innerHTML = avatar(x); });
    });
    els.screen.querySelectorAll('[data-cheer]').forEach((b) => b.onclick = () => doCheer(b.dataset.cheer, b.dataset.nm, b));
    els.screen.querySelectorAll('[data-send]').forEach((b) => b.onclick = () => sendMoneyModal(b.dataset.send, b.dataset.nm));
  }

  /* ---------------- 동료 캐릭터 보기 (최우수BM 사진 · 관리자 캐릭터 메뉴) ---------------- */
  const FACE_EXPRS = ['normal', 'smile', 'angry', 'worried'], peerFace = {}, peerVer = {};
  const PFK = (uid) => 'bmq_pf_' + uid;
  // 이 기기에 받아 둔 동료 그림 중 버전이 같은 것은 바로 쓴다 (다시 받지 않음)
  function primePeerFaces(list) {
    list.filter((x) => x.face && !x.me).forEach((x) => {
      const id = pfid(x);
      peerVer[id] = x.fv || '';
      if (peerFace[id] && peerFace[id].__v === x.fv) return;
      try {
        const c = JSON.parse(localStorage.getItem(PFK(id)));
        if (c && c.v === x.fv && c.m && c.m.normal) { peerFace[id] = Object.assign({ __v: c.v }, c.m); Sprites.registerData('face:' + id, c.m); }
        else if (peerFace[id] && peerFace[id].__v !== x.fv) { delete peerFace[id]; }
      } catch (e) { }
    });
  }
  async function loadPeerFaces(uids, exprs = FACE_EXPRS) {
    const need = [...new Set(uids)].filter((u) => !peerFace[u] || exprs.some((e) => !peerFace[u][e]));
    if (!need.length) return;
    try {
      const got = await Api.peerFaces(need, exprs);
      Object.entries(got).forEach(([u, m]) => {
        const v = peerVer[u] || '';
        const cur = peerFace[u] && peerFace[u].__v === v ? peerFace[u] : { __v: v };
        peerFace[u] = Object.assign(cur, m);
        const pics = Object.assign({}, peerFace[u]); delete pics.__v;
        Sprites.registerData('face:' + u, pics);
        try { localStorage.setItem(PFK(u), JSON.stringify({ v, m: pics })); } catch (e) { } // 저장 공간이 모자라면 이번만 쓰고 넘어감
      });
    } catch (e) { }
  }
  // p: { name, lv, look, uid, face, me }
  const pfid = (p) => { const e = effStage((p.look || {}).cs || costumeStage(p.lv || 1), p.st); return e === 2 ? p.uid : p.uid + '@s' + e; };
  const peerSpec = (p) => (p.me ? playerSpec(p.lv || S.lv) : specOf(p.look || {}, p.lv || 1, p.face ? 'face:' + pfid(p) : null));
  const restOf = (spec) => (/^(illust|face):/.test(spec.key) ? 'normal' : 'smile');
  // 실물 캐릭터 그림이 아직 없으면 빈 동그라미 (다른 그림을 먼저 보여주지 않음)
  const faceReady = (p) => p.me || !p.face || Sprites.has('face:' + pfid(p));
  const avatar = (p) => {
    if (!p.me && p.thumb) return `<img class="avthumb" src="${p.thumb}" alt="" draggable="false">`; // 서버가 함께 보낸 작은 얼굴 사진
    if (!faceReady(p)) return '<i class="avwait"></i>';
    const sp = peerSpec(p); return charHTML(sp, restOf(sp), { head: true });
  };
  const needFull = (list) => list.filter((x) => !x.thumb && !faceReady(x)); // 썸네일이 없을 때만 큰 그림을 받아 표시
  function peerLines(p) {
    const lv = p.lv || 1, fill = (t) => t.replace(/\{이름\}/g, p.name).replace(/\{직급\}/g, rankOf(lv).title).replace(/\{레벨\}/g, lv);
    const L = (TALK && TALK.length ? TALK : TALK_DEFAULT).filter((r) => (!r.cond || r.cond === '항상') && !/\{(연속|보스)\}/.test(r.text))
      .map((r) => [TALK_TYPE[r.type] || 'say', TALK_EXPR[r.expr] || 'normal', fill(String(r.text))]);
    return L.length ? L : [['say', 'smile', '오늘도 힘내 봅시다!']];
  }
  async function charViewer(p, opt = {}) {
    const m = modal(`<div class="cview"><div class="loading" style="padding-top:40%"><div class="spin"></div>캐릭터를 불러오는 중…</div></div>
      <h2 style="font-size:22px">${esc(p.name)}</h2><p class="muted" style="text-align:center;margin:0 0 8px">${p.lv ? `Lv.${p.lv} ${rankOf(p.lv).title}` : '아직 입사 전'} · 캐릭터를 눌러 보세요!</p>
      <div class="cvcos"></div>
      ${opt.scene ? '<button class="btn full" id="cvScene" style="margin-bottom:8px">🎬 게임 화면으로 보기</button>' : ''}
      ${p.lv ? '<button class="btn ghost full" id="cvOffice" style="margin-bottom:8px">🏢 사무실 구경하기</button>' : ''}
      <button class="btn ghost full" data-close>닫기</button>`);
    const sb = m.el.querySelector('#cvScene'); if (sb) sb.onclick = () => { m.close(); staffScene(p); };
    const ob = m.el.querySelector('#cvOffice');
    if (ob) ob.onclick = async () => {
      if (p.me) { m.close(); return openOffice(); }
      if (p.face) await loadPeerFaces([pfid(p)]);
      const sp = peerSpec(p); m.close();
      openOffice({ name: p.name, lv: p.lv, oc: (p.look || {}).oc, photo: p.thumb || Sprites.thumb(sp.key), person: Sprites.char(sp.key, 'normal') });
    };
    if (p.face && !p.me) await loadPeerFaces([pfid(p)]);
    const box = m.el.querySelector('.cview'); if (!box || !box.isConnected) return;
    if (!faceReady(p)) { box.innerHTML = '<p class="muted" style="text-align:center;padding-top:40%">캐릭터 그림을 불러오지 못했어요.<br>잠시 후 다시 눌러 주세요.</p>'; return; }
    // 의상 갈아입혀 보기 (미리보기 · 저장 안 됨): 그 사람이 받은 의상만, 관리자는 전부
    const admin = !!(Api.user || {}).admin, plv = p.lv || 1;
    const curSt = p.me ? myStage() : ((p.look || {}).cs || costumeStage(plv));
    const faceIdFor = (st) => { const e = effStage(st, p.st); return e === 2 ? p.uid : p.uid + '@s' + e; };
    const specFor = (st) => (p.me ? specOf(S, S.lv, hasFace ? 'face:me' : null, st) : specOf(p.look || {}, plv, p.face ? 'face:' + faceIdFor(st) : null, st));
    let vst = curSt, spec = specFor(vst);
    const L = peerLines(p);
    let last = -1, taps = [], tm = null;
    const cos = m.el.querySelector('.cvcos');
    const drawCos = () => {
      if (!cos || !p.lv) return;
      cos.innerHTML = COSTUMES.map((c) => {
        const open = admin || c.lv <= plv, exact = c.st === 2 || /@s\d$/.test(specFor(c.st).key) && specFor(c.st).key.endsWith('@s' + c.st);
        return `<button data-vst="${c.st}" class="${vst === c.st ? 'on' : ''}" ${open ? '' : 'disabled'} title="${esc(c.desc)}">${open ? c.icon : '🔒'}<small>${c.name}${open && !exact ? '·준비 중' : ''}</small></button>`;
      }).join('') + `<p class="muted">${vst === curSt ? '지금 입고 있는 의상' : '👀 미리보기 (실제 의상은 바뀌지 않아요)'}${admin ? ' · 관리자: 모든 의상' : ''}</p>`;
      cos.querySelectorAll('[data-vst]').forEach((b) => b.onclick = async (e) => {
        e.stopPropagation(); vst = +b.dataset.vst; Snd.tap();
        if (p.face && !p.me) await loadPeerFaces([faceIdFor(vst)]);
        spec = specFor(vst); fig.className = 'cvfig'; fig.innerHTML = charHTML(spec, restOf(spec)); void fig.offsetWidth; fig.className = 'cvfig hop'; drawCos();
      });
    };
    box.innerHTML = `<div class="cvfig">${charHTML(spec, restOf(spec))}</div>`;
    const fig = box.querySelector('.cvfig');
    drawCos();
    box.onclick = () => {
      const now = Date.now(); taps = taps.filter((t) => now - t < 3000); taps.push(now);
      let line;
      if (taps.length >= 6) { line = ['say', 'angry', '그만 좀 찔러요! 업무 중이라구요!']; taps = []; }
      else { let i; do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === last); last = i; line = L[i]; }
      const [type, expr, msg] = line;
      fig.className = 'cvfig'; fig.innerHTML = charHTML(spec, expr); void fig.offsetWidth; fig.className = 'cvfig ' + (expr === 'angry' ? 'shake' : 'hop');
      box.querySelectorAll('.talk').forEach((x) => x.remove());
      box.insertAdjacentHTML('beforeend', `<div class="talk ${type}">${esc(msg)}</div>`);
      Snd.tap();
      clearTimeout(tm); tm = setTimeout(() => { if (!fig.isConnected) return; fig.className = 'cvfig'; fig.innerHTML = charHTML(spec, restOf(spec)); box.querySelectorAll('.talk').forEach((x) => x.remove()); }, 3600);
    };
  }

  /* ---------------- 사무실 ---------------- */
  const rankIdx = (lv) => RANKS.indexOf(rankOf(lv));
  // 내 사무실 요약 (서버에도 저장 → 동료가 구경)
  function officeOC() {
    if (!S) return null;
    const o = S.office || {}, aw = Object.keys(S.awards || {});
    const n = Object.values(S.stats || {}).reduce((a, x) => a + (x.n || 0), 0);
    const bs = {}; BOSS_TIERS.forEach((t) => { const c = (S.cnt || {})['boss_' + t.id] || 0; if (c) bs[t.id] = c; });
    return { i: OFFICE_ITEMS.filter((it) => (o.owned || {})[it.id] && (o.shown || {})[it.id] !== false).map((it) => it.id),
      w: aw.filter((k) => k.startsWith('week:')).length, m: aw.filter((k) => k.startsWith('month:')).length, bs,
      ach: Object.keys(S.ach || {}).length, bk: Math.floor(n / 40), run: ((S.mini || {}).run || {}).best || 0 };
  }
  function officeCard(oc, name, lv, photo) {
    oc = oc || {};
    const tro = [], certs = [];
    for (let i = 0; i < (oc.m || 0); i++) tro.push({ e: '🏆', label: '월간 최우수BM 트로피' });
    for (let i = 0; i < (oc.w || 0); i++) tro.push({ e: '🏆', label: '주간 최우수BM 트로피' });
    BOSS_TIERS.slice().reverse().forEach((t) => { if ((oc.bs || {})[t.id]) tro.push({ e: t.stars >= 4 ? '🥇' : t.stars >= 2 ? '🥈' : '🥉', label: `${t.title} 격파 ${oc.bs[t.id]}회` }); });
    if ((oc.run || 0) >= 60000) tro.push({ e: '🏎️', label: `고속도로 질주 ${Math.floor(oc.run / 1000)}초` });
    RANKS.slice(1).forEach((r) => { if (lv >= r.lv) certs.push({ t: '임 명 장', label: `${r.title} 임명장 (Lv.${r.lv})` }); });
    [10, 25, 50, 75, 100].forEach((k) => { if ((oc.ach || 0) >= k) certs.push({ t: '표 창 장', label: `업적 ${k}개 달성 표창장` }); });
    return { name, title: rankOf(lv).title, photo, items: oc.i || [], trophies: tro, certs, books: oc.bk || 0 };
  }
  const myPhoto = () => Sprites.thumb(playerSpec().key);
  function officeSVG(r, opts = {}) {
    const mine = S && rankIdx(S.lv) === r;
    const c = mine ? officeCard(officeOC(), S.name, S.lv, myPhoto()) : null;
    if (c && opts.stage && !c.trophies.length) c.trophies = null; // 홈 배경에는 '트로피 자리' 안내를 띄우지 않음
    return Office.svg(r, c, opts);
  }
  // 사무실 둘러보기 (owner 없으면 내 사무실)
  function openOffice(owner) {
    const me = !owner;
    const lv = me ? S.lv : owner.lv || 1, r = rankIdx(lv);
    const card = me ? officeCard(officeOC(), S.name, S.lv, myPhoto()) : officeCard(owner.oc, owner.name, lv, owner.photo);
    const person = me ? Sprites.char(playerSpec().key, 'smile') : owner.person;
    const el = document.createElement('div'); el.id = 'officeView';
    const photo = Sprites.bg('rank' + r); // 사무실 그림이 있으면 그림 위에서 둘러보기 (좌우로 밀기)
    let hide = false;
    const draw = () => {
      const c = me ? officeCard(officeOC(), S.name, S.lv, myPhoto()) : card;
      const it = new Set(c.items), OI = (id) => OFFICE_ITEMS.find((x) => x.id === id) || {};
      const prop = (id, x, y, sz) => (it.has(id) ? `<span class="ov-prop" style="left:${x}%;top:${y}%;font-size:${sz}em" data-tip="${esc(OI(id).name)}">${OI(id).icon}</span>` : '');
      const stage = photo ? `<div class="ov-pan"><div class="ov-room"><img src="${photo}" alt="" draggable="false">
          ${prop('plant', 3, 82, 7)}${prop('statue', 14, 84, 6)}${it.has('fish') ? `<span class="ov-prop ov-fish" style="left:24%;top:80%" data-tip="어항">🐠<small>🐟</small></span>` : ''}
          ${prop('putter', 70, 87, 5)}${prop('sofa', 84, 82, 7.5)}${prop('dog', 58, 86, 5.5)}${prop('painting', 3, 10, 5)}${prop('clock', 92, 8, 4)}</div></div>
          <div class="ov-person">${person ? `<img src="${person}" alt="" draggable="false">` : ''}<div class="ov-front">${Office.front(r, c)}</div></div>`
        : Office.svg(r, c, { person, fit: true });
      el.className = hide ? 'nochar' : '';
      el.innerHTML = `<div class="ov-top"><button class="mini-x" data-x aria-label="닫기">✕</button><b>🏢 ${esc(c.name)}의 사무실</b>
          ${photo ? `<button class="ov-hide" data-hide>${hide ? '🙋 캐릭터 보이기' : '🙈 캐릭터 치우기'}</button>` : ''}</div>
        <div class="ov-stage">${stage}<div class="ov-tip"></div>${photo ? '<div class="ov-hint">↔ 좌우로 밀어서 둘러보세요</div>' : ''}</div>
        <div class="ov-info">🏆 트로피 ${c.trophies.length} · 📜 상장 ${c.certs.length} · 📚 책 ${c.books}권 · 🪑 물품 ${c.items.length}개<small>${esc(c.title)} · ${esc(Office.PLACE[r])} · 물건을 눌러 보세요</small></div>
        <div class="ov-bar">${me ? '<button class="btn" data-deco>🪑 꾸미기</button><button class="btn ghost" data-case>🏆 진열장</button><button class="btn ghost" data-shop>🛒 매점</button><button class="btn ghost" data-car>🚗 차고</button>'
          : '<button class="btn ghost" data-case>🏆 진열장</button><button class="btn" data-x>닫기</button>'}</div>`;
      el.querySelectorAll('[data-x]').forEach((b) => b.onclick = close);
      const tip = el.querySelector('.ov-tip');
      const hb = el.querySelector('[data-hide]'); if (hb) hb.onclick = () => { hide = !hide; Snd.tap(); el.classList.toggle('nochar', hide); hb.textContent = hide ? '🙋 캐릭터 보이기' : '🙈 캐릭터 치우기'; };
      const pan = el.querySelector('.ov-pan');
      if (pan) {
        requestAnimationFrame(() => { pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) / 2; });
        let dx = null; // PC: 마우스로 끌어서 둘러보기
        pan.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') dx = e.clientX + pan.scrollLeft; });
        pan.addEventListener('pointermove', (e) => { if (dx != null) pan.scrollLeft = dx - e.clientX; });
        addEventListener('pointerup', () => { dx = null; });
        pan.addEventListener('scroll', () => { const h = el.querySelector('.ov-hint'); if (h) h.remove(); }, { once: true });
      }
      el.querySelector('.ov-stage').addEventListener('click', (e) => {
        const t = e.target.closest('[data-tip]'); if (!t) return;
        tip.textContent = t.getAttribute('data-tip'); tip.classList.remove('on'); void tip.offsetWidth; tip.classList.add('on'); Snd.tap();
      });
      const cs = el.querySelector('[data-case]'); if (cs) cs.onclick = () => showCase(c);
      const dc = el.querySelector('[data-deco]'); if (dc) dc.onclick = () => decoPanel(draw);
      const sp = el.querySelector('[data-shop]'); if (sp) sp.onclick = () => { close(); go('shop'); };
      const cr = el.querySelector('[data-car]'); if (cr) cr.onclick = () => { Snd.tap(); openGarage(); };
    };
    const close = () => { el.remove(); if (me && $('#stage').className === 'home') setBg(RANKS[rankIdx(S.lv)].bg); };
    document.body.appendChild(el); draw();
  }
  /* ---------------- 차고 (직급별 차 · 3D로 돌려 보기) ---------------- */
  let mvLoad = null; // 3D 뷰어는 차고를 처음 열 때만 불러옴
  const loadMV = () => mvLoad || (mvLoad = new Promise((res, rej) => {
    if (customElements.get('model-viewer')) return res();
    const s = document.createElement('script'); s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    s.onload = () => customElements.whenDefined('model-viewer').then(res); s.onerror = () => { mvLoad = null; rej(new Error('3D 뷰어를 불러오지 못했어요')); };
    document.head.appendChild(s);
  }));
  function openGarage() {
    const admin = !!(Api.user || {}).admin, my = rankIdx(S.lv);
    const owned = (c) => c.rank <= my || admin; // 관리자는 전부 구경
    let cur = Math.min(my, CARS.length - 1);
    const el = document.createElement('div'); el.id = 'garageView';
    el.innerHTML = `<div class="ov-top"><button class="mini-x" data-x aria-label="닫기">✕</button><b>🚗 ${esc(S.name)}의 차고</b></div>
      <div class="gv-stage"><div class="gv-view"></div><div class="gv-load"><div class="spin"></div>차를 꺼내는 중…</div></div>
      <div class="gv-info"></div><div class="gv-list">${CARS.map((c) => `<button class="gv-car" data-car="${c.rank}"><span>${c.icon}</span><small>${RANKS[c.rank].title}</small></button>`).join('')}</div>`;
    const view = el.querySelector('.gv-view'), load = el.querySelector('.gv-load'), info = el.querySelector('.gv-info');
    const show = (i) => {
      cur = i; const c = CARS[i], own = owned(c), r = RANKS[c.rank];
      el.querySelectorAll('.gv-car').forEach((b) => { const k = +b.dataset.car; b.classList.toggle('on', k === i); b.classList.toggle('lock', !owned(CARS[k])); });
      info.innerHTML = own ? `<b>${esc(c.name)}</b><small>${esc(c.desc)}${c.glb ? '' : ' · 🔧 3D 차량 준비 중'}</small>`
        : `<b>🔒 ???</b><small>${esc(r.title)}(Lv.${r.lv})으로 승진하면 지급돼요</small>`;
      if (!c.glb || !own) { load.classList.add('off'); view.innerHTML = `<div class="gv-none ${own ? '' : 'lock'}">${own ? c.icon : '?'}</div>`; return; }
      load.classList.remove('off');
      loadMV().then(() => {
        if (cur !== i) return;
        view.innerHTML = `<model-viewer src="${c.glb}" alt="${esc(c.name)}" camera-controls auto-rotate ar rotation-per-second="18deg"
          camera-orbit="-35deg 72deg auto" environment-image="neutral" shadow-intensity="1" exposure="1.05" interaction-prompt="none" touch-action="pan-y">
          <button slot="ar-button" class="gv-ar">📱 내 방에 꺼내 보기 (AR)</button></model-viewer>`;
        const mv = view.firstElementChild;
        mv.addEventListener('load', () => load.classList.add('off'), { once: true });
        mv.addEventListener('error', () => { load.classList.add('off'); view.innerHTML = `<div class="gv-none">${c.icon}</div>`; }, { once: true });
      }).catch((e) => { load.classList.add('off'); view.innerHTML = `<div class="gv-none">${c.icon}</div>`; toast(e.message); });
    };
    el.querySelectorAll('.gv-car').forEach((b) => b.onclick = () => { Snd.tap(); show(+b.dataset.car); });
    el.querySelector('[data-x]').onclick = () => el.remove();
    document.body.appendChild(el); show(cur);
    const on = el.querySelector('.gv-car.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function showCase(c) {
    modal(`<h2 style="font-size:22px">🏆 진열장</h2>
      <h4 class="sec">트로피 ${c.trophies.length}개</h4>${c.trophies.length ? c.trophies.map((t) => `<div class="caserow">${t.e} ${esc(t.label)}</div>`).join('') : '<p class="muted">최우수BM에 뽑히거나 오늘의 보스를 이기면 트로피를 받아요.</p>'}
      <h4 class="sec">상장 ${c.certs.length}개</h4>${c.certs.length ? c.certs.map((t) => `<div class="caserow">📜 ${esc(t.label)}</div>`).join('') : '<p class="muted">승진하거나 업적을 많이 모으면 상장이 걸려요.</p>'}
      <h4 class="sec">📚 책 ${c.books}권</h4><p class="muted">문제를 40개 풀 때마다 책이 한 권씩 늘어요 (최대 16권 진열).</p>
      <button class="btn full" data-close>닫기</button>`);
  }
  function decoPanel(redraw) {
    const o = S.office || (S.office = { owned: {}, shown: {} });
    const m = modal(`<h2 style="font-size:22px">🪑 사무실 꾸미기</h2><p class="muted" style="text-align:center">가진 물품을 비치하거나 창고에 보관할 수 있어요.</p>
      <div class="decolist">${OFFICE_ITEMS.map((it) => {
        const own = o.owned[it.id], on = own && o.shown[it.id] !== false;
        return `<div class="decorow ${own ? '' : 'locked'}"><span class="di">${it.icon}</span><span class="dn"><b>${it.name}</b><small>${esc(it.desc)}</small></span>
          ${own ? `<button class="btn mini ${on ? '' : 'ghost'}" data-tg="${it.id}">${on ? '비치 중' : '보관 중'}</button>` : `<span class="muted dp">매점 ${won(it.price)}</span>`}</div>`;
      }).join('')}</div><button class="btn full" data-close style="margin-top:10px">완료</button>`, redraw);
    m.el.querySelectorAll('[data-tg]').forEach((b) => b.onclick = () => {
      const id = b.dataset.tg, on = o.shown[id] !== false;
      o.shown[id] = !on; b.textContent = on ? '보관 중' : '비치 중'; b.classList.toggle('ghost', on); Snd.tap(); save(); redraw();
    });
  }

  /* ---------------- 미니게임: BM 드라이빙 ---------------- */
  const miniState = () => {
    const m = S.mini || (S.mini = { maze: { date: '', best: 0 }, run: { best: 0 }, reward: { date: '', maze: false, run: false } });
    if (m.reward.date !== today()) m.reward = { date: today(), maze: false, run: false };
    if (m.maze.date !== today()) m.maze = { date: today(), best: 0 };
    return m;
  };
  function miniResult(kind, res) {
    const m = miniState(), lines = [];
    if (kind === 'maze') {
      if (!res.ok) return { msg: '다시 도전해 보세요! 길을 기억하면 훨씬 빨라져요.' };
      if (!m.maze.best || res.ms < m.maze.best) { lines.push(m.maze.best ? `🎉 오늘 최고 기록 경신! (이전 ${Mini.fmt(m.maze.best)})` : '🎉 오늘 첫 도착!'); m.maze.best = res.ms; }
    } else {
      if (!m.run.best || res.ms > m.run.best) { lines.push(m.run.best ? `🎉 최고 기록 경신! (이전 ${Mini.fmt(m.run.best)})` : '🎉 첫 기록!'); m.run.best = res.ms; }
    }
    const rw = MINI_REWARD[kind];
    if (!m.reward[kind] && (kind === 'maze' || res.ms >= rw.need)) {
      m.reward[kind] = true; earn(rw.cash); const ups = addXp(rw.xp); inc('miniPlays');
      lines.push(`오늘의 드라이빙 보상 +${won(rw.cash)} · +${rw.xp}XP`);
      if (ups.length) lines.push(`⬆️ Lv.${S.lv} 달성!`);
    } else if (!m.reward[kind] && kind === 'run') lines.push(`${rw.need / 1000}초 이상 버티면 오늘의 보상 +${won(rw.cash)}!`);
    checkAch(); save(); syncNow(); renderHud();
    return { msg: lines.join('<br>') };
  }
  async function playMini(kind) {
    const m = miniState();
    inSession = true; els.nav.classList.add('hidden');
    try { await Mini.play(kind, { seed: 'maze|' + today(), best: kind === 'maze' ? m.maze.best : m.run.best, onResult: (r) => miniResult(kind, r) }); }
    finally { inSession = false; els.nav.classList.remove('hidden'); go('drive'); }
  }
  async function pageDrive() {
    setNav('home');
    const m = miniState(), day = today();
    const card = (kind, icon, title, desc, best, rw) => `<button class="drivecard" data-mini="${kind}"><span class="dc-ic">${icon}</span><b>${title}</b><small>${desc}</small>
      <span class="dc-best">${best ? `내 기록 ${Mini.fmt(best)}` : '아직 기록 없음'}</span><span class="dc-rw ${m.reward[kind] ? 'done' : ''}">${m.reward[kind] ? '✅ 오늘 보상 받음' : rw}</span></button>`;
    els.screen.innerHTML = `<div class="page">${backBtn('home', '오늘 일정')}<h2>🚗 BM 드라이빙</h2>
      <p class="muted">방카BM은 운전 실력도 실력! 지점을 누비며 동료들과 시간 대결을 해 보세요.</p>
      <div class="drivecards">
        ${card('maze', '🗺️', '출근길 미로', '본사에서 지점까지 60초 안에! 오늘의 미로는 모두 같아요', m.maze.best, `도착하면 +${won(MINI_REWARD.maze.cash)}`)}
        ${card('run', '🏎️', '고속도로 질주', '1인칭 운전 · 날아오는 장애물 피하기 · 점점 빨라져요', m.run.best, `${MINI_REWARD.run.need / 1000}초 버티면 +${won(MINI_REWARD.run.cash)}`)}
      </div>
      <div class="seg" style="margin-top:14px"><button data-mr="maze" class="on">🗺️ 오늘의 미로 순위</button><button data-mr="run">🏎️ 질주 명예의 전당</button></div>
      <div id="miniRank"><div class="loading"><div class="spin"></div>순위를 불러오는 중…</div></div></div>`;
    bindBack();
    els.screen.querySelectorAll('[data-mini]').forEach((b) => b.onclick = () => playMini(b.dataset.mini));
    let tab = 'maze', data = null;
    const show = () => {
      const box = $('#miniRank'); if (!box || !data) return;
      const list = data[tab] || [];
      primePeerFaces(list);
      box.innerHTML = list.length ? list.map((x, i) => `<div class="rankrow ${x.me ? 'me' : ''}"><span class="rk">${['🥇', '🥈', '🥉'][i] || i + 1}</span><span class="rkav" style="cursor:default">${avatar(x)}</span>
        <span class="nm">${esc(x.name)}${x.me ? ' (나)' : ''}<small>Lv.${x.lv} ${rankOf(x.lv).title}</small></span><b class="mini-rec">${Mini.fmt(x.ms)}</b></div>`).join('')
        : `<p class="muted" style="text-align:center;margin-top:24px">${tab === 'maze' ? '오늘 미로를 통과한 사람이 아직 없어요. 첫 기록의 주인공이 되어 보세요!' : '아직 기록이 없어요.'}</p>`;
      const fl = needFull(list); if (fl.length) loadPeerFaces(fl.map(pfid), ['normal']).then(show);
    };
    els.screen.querySelectorAll('[data-mr]').forEach((b) => b.onclick = () => { tab = b.dataset.mr; els.screen.querySelectorAll('[data-mr]').forEach((x) => x.classList.toggle('on', x === b)); show(); });
    try { await syncNow(); data = await Api.miniRank(day); } catch (e) { const box = $('#miniRank'); if (box) box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
    // 방금 낸 내 기록은 이 기기 값으로 바로 반영
    const mine = (list, ms, asc) => { if (!ms) return list; let me = list.find((x) => x.me); if (!me) { me = { name: S.name, lv: S.lv, me: true, uid: '', ms }; list.push(me); } me.ms = asc ? Math.min(me.ms, ms) : Math.max(me.ms, ms); return list.sort((a, b) => (asc ? a.ms - b.ms : b.ms - a.ms)).slice(0, 10); };
    data.maze = mine(data.maze || [], m.maze.best, true); data.run = mine(data.run || [], m.run.best, false);
    show();
  }

  /* ---------------- 우편함 (응원 · 활동비 · 출제 보상) ---------------- */
  let inboxAt = 0;
  async function checkInbox(force) {
    if (!S || inSession || (!force && Date.now() - inboxAt < 60000)) return;
    inboxAt = Date.now();
    let items = [];
    try { items = await Api.inbox(); } catch (e) { return; }
    if (!items.length) return;
    let cash = 0, honor = 0;
    const lines = items.map((m) => {
      if (m.kind === '활동비') { S.money += m.cash; cash += m.cash; } // 동료가 보낸 돈은 '누적 획득'에 넣지 않음
      else if (m.cash) { earn(m.cash, true); cash += m.cash; }
      if (m.honor) { S.honor += m.honor; honor += m.honor; }
      if (m.kind === '응원') inc('cheered');
      const who = esc(m.from || '동료');
      const body = m.kind === '응원' ? `📣 <b>${who}</b>님이 응원을 보냈어요!`
        : m.kind === '활동비' ? `💸 <b>${who}</b>님이 활동비 <b>${won(m.cash)}</b>을 보냈어요${m.msg ? `<br><span class="muted">"${esc(m.msg)}"</span>` : ''}`
        : m.kind === '출제보상' ? `✍️ ${esc(m.msg)}`
        : `📝 ${esc(m.msg)}`;
      return `<div class="mail">${body}${m.cash || m.honor ? `<small>${m.cash ? '+' + won(m.cash) : ''}${m.honor ? ` · 명예 +${m.honor}` : ''}</small>` : ''}</div>`;
    });
    Snd.coin(); checkAch(); save(); syncNow(); renderHud();
    modal(`<h2>📬 우편함</h2>${lines.join('')}<p class="muted" style="text-align:center">합계 ${won(cash)}${honor ? ` · 명예 +${honor}` : ''}</p><button class="btn full" data-close>받기</button>`);
  }

  /* ---------------- 응원 · 활동비 보내기 ---------------- */
  async function doCheer(uid, name, btn) {
    btn.disabled = true;
    try {
      const r = await Api.cheer(uid);
      inc('cheers'); S.honor += 1; checkAch(); save();
      toast(`📣 ${name}님을 응원했어요! (오늘 남은 응원 ${r.cheer.left}번)`);
      btn.textContent = '응원 완료'; btn.classList.add('ghost');
      els.screen.querySelectorAll('[data-cheer]').forEach((b) => { if (r.cheer.left <= 0 && b !== btn) b.disabled = true; });
      const left = $('#cheerLeft'); if (left) left.textContent = r.cheer.left;
    } catch (e) { toast(e.message); btn.disabled = false; }
  }
  async function sendMoneyModal(uid, name) {
    let players = [];
    if (!uid) {
      try { players = await Api.players(); } catch (e) { return toast(e.message); }
      if (!players.length) return toast('아직 활동비를 보낼 수 있는 동료가 없어요');
    }
    const m = modal(`<h2 style="font-size:22px">💸 활동비 보내기</h2>
      <p class="muted" style="text-align:center">보유 ${won(S.money)} · 한 번에 ${won(SOCIAL.sendMin)}~${won(SOCIAL.sendMax)} · 하루 최대 ${won(SOCIAL.sendDailyMax)}</p>
      ${uid ? `<div class="box" style="text-align:center;margin:8px 0">받는 사람 <b>${esc(name)}</b></div>`
        : `<label class="lb">받는 사람</label><select id="smTo">${players.map((p) => `<option value="${esc(p.uid)}">${esc(p.name)} · Lv.${p.lv} ${rankOf(p.lv).title}</option>`).join('')}</select>`}
      <label class="lb">금액</label><input type="number" id="smAmt" inputmode="numeric" min="${SOCIAL.sendMin}" max="${SOCIAL.sendMax}" step="100" value="1000">
      <div class="seg" style="margin-top:8px">${[500, 1000, 3000, 5000].map((v) => `<button data-amt="${v}">${won(v)}</button>`).join('')}</div>
      <label class="lb">메시지 (선택)</label><input type="text" id="smMsg" maxlength="40" placeholder="예: 오늘 보스전 고생했어요!">
      <div class="row" style="margin-top:12px"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="smGo">보내기</button></div>`);
    m.el.querySelectorAll('[data-amt]').forEach((b) => b.onclick = () => $('#smAmt').value = b.dataset.amt);
    $('#smGo').onclick = async () => {
      const to = uid || $('#smTo').value, toName = name || ($('#smTo').selectedOptions[0] || {}).textContent.split(' · ')[0];
      const amt = Math.floor(+$('#smAmt').value);
      if (!(amt >= SOCIAL.sendMin && amt <= SOCIAL.sendMax)) return toast(`${won(SOCIAL.sendMin)}~${won(SOCIAL.sendMax)} 사이로 입력해 주세요`);
      if (amt > S.money) return toast('활동비가 부족해요');
      $('#smGo').disabled = true;
      try {
        await syncNow();
        await Api.sendMoney(to, amt, $('#smMsg').value.trim());
        S.money -= amt; inc('sent', amt); save(); syncNow(); renderHud(); m.close();
        Snd.coin(); toast(`💸 ${toName}님에게 ${won(amt)}을 보냈어요!`);
        if (els.screen.querySelector('.shop')) pageShop();
      } catch (e) { toast(e.message); const b = $('#smGo'); if (b) b.disabled = false; }
    };
  }

  /* ---------------- 직원 출제 ---------------- */
  function subForm() {
    return `<div class="qform">
      <div class="row"><select id="fCat">${CAT_ORDER.map((k) => `<option value="${k}">${CATS[k].label}</option>`).join('')}</select>
        <select id="fType"><option value="mc">4지선다</option><option value="ox">OX</option></select>
        <select id="fDiff">${[1, 2, 3].map((d) => `<option value="${d}" ${d === 2 ? 'selected' : ''}>${DIFF_LABEL[d]}</option>`).join('')}</select></div>
      <label>질문</label><textarea id="fQ" style="min-height:70px" maxlength="200" placeholder="예: 연금저축 중도해지 시 세액공제받은 금액에 매기는 세율은?"></textarea>
      <div id="fMC">${[0, 1, 2, 3].map((i) => `<label>보기 ${i + 1}</label><input type="text" id="fC${i}" maxlength="40">`).join('')}</div>
      <label>정답</label><select id="fA">${[0, 1, 2, 3].map((i) => `<option value="${i}">${i + 1}번</option>`).join('')}</select>
      <label>힌트 (선택)</label><input type="text" id="fH" maxlength="40">
      <label>해설</label><textarea id="fE" style="min-height:70px" maxlength="400" placeholder="왜 정답인지, 현장에서 어떻게 설명하면 좋은지"></textarea>
      <label>근거·출처</label><input type="text" id="fS" maxlength="80" placeholder="예: 소득세법 제64조의4, 상품설명서 p.3">
    </div>`;
  }
  function readSub() {
    const type = $('#fType').value;
    const q = { cat: $('#fCat').value, type, diff: +$('#fDiff').value, q: $('#fQ').value.trim(), hint: $('#fH').value.trim(), exp: $('#fE').value.trim(), src: $('#fS').value.trim() };
    if (type === 'ox') q.answer = $('#fA').value === 'O';
    else { q.choices = [0, 1, 2, 3].map((i) => $('#fC' + i).value.trim()); q.answer = +$('#fA').value; }
    if (q.q.length < 8) throw new Error('질문을 8자 이상 써 주세요');
    if (type === 'mc' && q.choices.some((c) => !c)) throw new Error('보기 4개를 모두 입력해 주세요');
    if (type === 'mc' && new Set(q.choices).size < 4) throw new Error('보기가 서로 달라야 해요');
    if (q.exp.length < 10) throw new Error('해설을 10자 이상 써 주세요');
    if (!q.src) throw new Error('근거·출처를 적어 주세요');
    return q;
  }
  async function pageSubmit() {
    setNav('study');
    els.screen.innerHTML = `<div class="page">${backBtn('study', '학습회')}<h2>✍️ 문제 출제하기</h2>
      <p class="muted" style="margin-top:-6px">현장에서 자주 받는 질문을 문제로 만들어 주세요. 관리자가 검토해서 채택하면 <b>출제자 이름과 함께 출제</b>되고, 보상 ${won(SOCIAL.submitCash)} · 명예 +${SOCIAL.submitHonor}을 받아요.</p>
      <div class="box">${subForm()}<button class="btn full" id="subGo" style="margin-top:12px">제출하기</button></div>
      <h4 class="sec">내 제출 내역</h4><div id="mySubs"><div class="loading"><div class="spin"></div></div></div></div>`;
    bindBack(); bindFormType();
    $('#subGo').onclick = async () => {
      let q; try { q = readSub(); } catch (e) { return toast(e.message); }
      $('#subGo').disabled = true;
      try { const r = await Api.submitQuestion(q); inc('submitted'); save(); toast(`제출했어요! (${r.no}) 검토 후 우편함으로 알려드려요`); pageSubmit(); }
      catch (e) { toast(e.message); $('#subGo').disabled = false; }
    };
    let mine = [];
    try { mine = await Api.mySubmissions(); } catch (e) { }
    const box = $('#mySubs'); if (!box) return;
    const col = { '검토': '#e0a020', '승인': '#2fb67c', '반려': '#e5484d' };
    box.innerHTML = mine.length ? mine.map((x) => `<div class="item"><div class="h"><span class="tg" style="background:${col[x.status] || '#999'}">${esc(x.status === '승인' ? '채택' : x.status)}</span><span class="q">${esc(x.q)}</span></div>
      <div class="body">${x.memo ? `관리자 메모: ${esc(x.memo)}` : '처리 메모 없음'}</div></div>`).join('') : '<p class="muted" style="text-align:center">아직 제출한 문제가 없어요.</p>';
    bindItems();
  }
  let subFilter = '검토';
  async function admSubmissions(body) {
    const subs = await Api.admin.submissions();
    const list = subs.filter((x) => subFilter === '전체' || x.status === subFilter);
    body.innerHTML = `<div class="seg">${['검토', '승인', '반려', '전체'].map((s) => `<button data-sf="${s}" class="${subFilter === s ? 'on' : ''}">${s} ${s === '전체' ? subs.length : subs.filter((x) => x.status === s).length}</button>`).join('')}</div>
      <p class="muted">승인하면 문제 시트에 '출제자'와 함께 추가되고, 출제자에게 보상(${won(SOCIAL.submitCash)} · 명예 +${SOCIAL.submitHonor})이 우편함으로 가요. 승인 전에 내용을 고칠 수 있어요.</p>
      ${list.length ? list.map((x, i) => `<div class="item"><div class="h" data-si="${i}"><span class="tg" style="background:${(CATS[x.cat] || {}).color || '#999'}">${esc((CATS[x.cat] || {}).label || x.cat)}</span>
        <span class="q">${esc(x.q)}<div class="muted">✍️ ${esc(x.author || '')} · ${new Date(x.at).toLocaleString('ko-KR')} · ${esc(x.status)}</div></span></div></div>`).join('')
        : '<p class="muted" style="text-align:center;margin-top:30px">해당하는 제출 문제가 없어요.</p>'}`;
    body.querySelectorAll('[data-sf]').forEach((b) => b.onclick = () => { subFilter = b.dataset.sf; pageAdmin(); });
    body.querySelectorAll('[data-si]').forEach((h) => h.onclick = () => {
      const x = list[+h.dataset.si];
      const q = { id: '', cat: x.cat, type: x.type, diff: x.diff, q: x.q, choices: x.choices, answer: x.answer, hint: x.hint, exp: x.exp, src: x.src, asOf: '', expires: '', status: '사용', tags: ['직원출제'] };
      const m = modal(`<h2 style="font-size:21px">✍️ 제출 문제 검토</h2><div class="muted" style="margin-bottom:6px">출제자 ${esc(x.author || '')} · ${esc(x.no)} · ${esc(x.status)}</div>
        ${qForm(q)}<label>처리 메모 (출제자에게 전달)</label><input type="text" id="memo" value="${esc(x.memo || '')}" placeholder="예: 보기 3번 표현을 다듬어 채택했어요">
        <div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="btn ghost full" data-close>닫기</button>
          ${x.status === '검토' ? '<button class="btn danger full" id="sRej">반려</button><button class="btn full" id="sOk">승인 · 출제</button>' : ''}</div>`);
      bindFormType();
      const ok = $('#sOk'), rej = $('#sRej');
      if (ok) ok.onclick = async () => {
        let nq; try { nq = readForm({ ...q, id: undefined }); } catch (e) { return toast(e.message); }
        ok.disabled = true;
        try { await Api.admin.resolveSubmission(x.no, '승인', $('#memo').value, nq); admQ = null; await Api.questions(true); m.close(); toast('채택했어요! 출제 목록에 추가됐어요'); pageAdmin(); }
        catch (e) { toast(e.message); ok.disabled = false; }
      };
      if (rej) rej.onclick = async () => {
        try { await Api.admin.resolveSubmission(x.no, '반려', $('#memo').value); m.close(); toast('반려 처리했어요'); pageAdmin(); } catch (e) { toast(e.message); }
      };
    });
  }

  /* ---- 학습회 ---- */
  function studyReward(kind, id) {
    ensureDay();
    const list = kind === 'article' ? S.study.articles : S.study.notes;
    if (list.includes(id)) return;
    if (list.length >= STUDY_XP.dailyMax) return toast(`오늘 ${kind === 'article' ? '기사' : '자료'} 보상은 다 받았어요 (하루 ${STUDY_XP.dailyMax}건)`);
    list.push(id);
    const ups = addXp(STUDY_XP[kind]); earn(CASH.study, true); inc(kind === 'article' ? 'articles' : 'notes');
    toast(`📖 학습 보상 +${STUDY_XP[kind]} XP · +${CASH.study}원`);
    checkAch(); save(); renderHud();
    if (ups.length) toast(`🎉 레벨 업! Lv.${S.lv}`);
  }
  function pageStudy() {
    ensureDay(); setNav('study');
    const nWrong = Object.keys(S.wrong).length;
    els.screen.innerHTML = `<div class="page"><h2>📚 학습회</h2>
      <p class="muted" style="margin-top:-6px">일정을 다 끝냈다면 여기서 계속 공부해요. 경험치는 <b>아주 조금</b>만 올라가요.</p>
      <div class="hub">
        <button class="hubtile" data-h="practice"><span>📝</span><b>연습문제</b><small>분야 골라 무제한 · 정답당 +1XP · +5원</small></button>
        <button class="hubtile" data-h="news"><span>📰</span><b>오늘의 경제 기사</b><small>최신 기사 읽기 · 건당 +2XP (하루 ${STUDY_XP.dailyMax}건)</small></button>
        <button class="hubtile" data-h="lib"><span>📚</span><b>개인 학습 · 자료실</b><small>학습 자료 읽기 · 건당 +2XP (하루 ${STUDY_XP.dailyMax}건)</small></button>
        <button class="hubtile" data-h="submit"><span>✍️</span><b>문제 출제하기</b><small>내가 만든 문제가 채택되면 ${won(SOCIAL.submitCash)} · 명예 +${SOCIAL.submitHonor}</small></button>
        <button class="hubtile" data-h="wrong"><span>📒</span><b>오답노트</b><small>${nWrong}문제 · 맞히면 극복! (명예 +5)</small></button>
      </div>
      <div class="box"><h4>오늘의 학습 기록</h4><div class="muted">읽은 기사 ${S.study.articles.length}/${STUDY_XP.dailyMax} · 읽은 자료 ${S.study.notes.length}/${STUDY_XP.dailyMax} · 누적 연습 정답 ${S.cnt.practice || 0}</div></div>
    </div>`;
    els.screen.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => {
      const h = b.dataset.h;
      if (h === 'practice') return pickPractice();
      go(h);
    });
  }
  function pickPractice() {
    const m = modal(`<h2 style="font-size:22px">📝 연습할 분야</h2>
      ${CAT_ORDER.map((k) => { const n = catCount(k); return `<button class="btn ghost full" style="margin-top:8px;text-align:left" data-c="${k}" ${n ? '' : 'disabled'}>${CATS[k].icon} ${CATS[k].label} <span class="muted">· ${n ? n + '문제' : '준비 중'}</span></button>`; }).join('')}
      <button class="btn ghost full" style="margin-top:8px" data-close>닫기</button>`);
    m.el.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { m.close(); runSession('practice', b.dataset.c); });
  }
  async function pageNews() {
    setNav('study'); ensureDay();
    els.screen.innerHTML = `<div class="page">${backBtn('study', '학습회')}<h2>📰 오늘의 경제 기사</h2><div class="loading"><div class="spin"></div>기사를 불러오는 중…</div></div>`;
    bindBack();
    let items = [];
    try { items = await Api.news(); } catch (e) { toast(e.message); }
    const page = els.screen.querySelector('.page'); if (!page) return;
    const ld = page.querySelector('.loading'); if (!ld) return;
    ld.outerHTML = `<p class="muted">기사를 열면 학습 보상을 받아요 (오늘 ${S.study.articles.length}/${STUDY_XP.dailyMax}).</p>` +
      (items.length ? items.map((a, i) => `<div class="item news" data-a="${i}"><div class="h"><span class="tg" style="background:#d9534f">${esc(a.topic || '경제')}</span><span class="q">${esc(a.title)}</span></div>
        <div class="src">${esc(a.source || '')} · ${a.date ? new Date(a.date).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}${S.study.articles.includes(a.link) ? ' · ✅ 읽음' : ''}</div></div>`).join('')
        : '<p class="muted" style="text-align:center;margin-top:30px">기사를 가져오지 못했어요.</p>');
    page.querySelectorAll('[data-a]').forEach((el) => el.onclick = () => {
      const a = items[+el.dataset.a]; window.open(a.link, '_blank', 'noopener');
      studyReward('article', a.link);
      setTimeout(pageNews, 300);
    });
  }

  /* ---- 오답노트 ---- */
  let wrongFilter = 'all';
  function pageWrong() {
    setNav('study');
    const all = pool(), ids = Object.keys(S.wrong);
    const list = all.filter((q) => ids.includes(q.id) && (wrongFilter === 'all' || q.cat === wrongFilter))
      .sort((a, b) => S.wrong[b.id].t - S.wrong[a.id].t);
    els.screen.innerHTML = `<div class="page">${backBtn('study', '학습회')}<h2>📒 오답노트</h2>
      <div class="seg">${['all', ...CAT_ORDER].map((k) => `<button data-f="${k}" class="${wrongFilter === k ? 'on' : ''}">${k === 'all' ? '전체' : CATS[k].icon + ' ' + CATS[k].label}</button>`).join('')}</div>
      <div class="box row" style="justify-content:space-between"><div><b>${list.length}문제</b><div class="muted">복습에서 맞히면 오답노트에서 사라져요 (XP 없음 · 명예 +5)</div></div>
        <button class="btn blue" id="rv" ${list.length ? '' : 'disabled'}>복습 시작</button></div>
      ${list.length ? list.map(itemHtml).join('') : '<p class="muted" style="text-align:center;margin-top:40px">오답이 없어요. 완벽해요! ✨</p>'}
    </div>`;
    bindBack();
    els.screen.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { wrongFilter = b.dataset.f; pageWrong(); });
    bindItems();
    const rv = $('#rv'); if (rv) rv.onclick = () => runSession('review', wrongFilter);
  }
  function itemHtml(q) {
    const c = CATS[q.cat] || { color: '#999', label: q.cat };
    const ch = q.type === 'ox' ? '' : q.choices.map((x, i) => `${i === q.answer ? '✅' : '▫️'} ${i + 1}. ${esc(x)}`).join('\n') + '\n\n';
    return `<div class="item"><div class="h"><span class="tg" style="background:${c.color}">${esc(c.label)}</span><span class="q">${esc(q.q)}</span></div>
      <div class="body">${ch}정답: <b>${esc(answerText(q))}</b>\n📘 ${esc(q.exp)}${q.src ? `<div class="src">근거: ${esc(q.src)}${q.asOf ? ' · 기준 ' + esc(q.asOf) : ''}</div>` : ''}${S.wrong[q.id] ? `<div class="src">틀린 횟수 ${S.wrong[q.id].n}회</div>` : ''}
      <button class="objbtn" data-obj2="${esc(q.id)}">⚠️ 이의 제기</button></div></div>`;
  }
  const bindItems = () => {
    els.screen.querySelectorAll('.item .h').forEach((h) => h.onclick = () => h.parentElement.classList.toggle('open'));
    els.screen.querySelectorAll('[data-obj2]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); openReport(b.dataset.obj2); });
  };

  /* ---- 자료실 (공용 자료 + 기본 자료 + 내 기기 자료) ---- */
  let libFilter = 'all', sharedLib = null;
  async function pageLib() {
    setNav('study'); ensureDay();
    if (!sharedLib) { try { sharedLib = await Api.library(); } catch (e) { sharedLib = []; } }
    const inF = (d) => libFilter === 'all' || d.cat === libFilter;
    const shared = sharedLib.filter(inF);
    const docs = (window.LIB || []).filter(inF);
    const files = (await Store.files.all()).filter(inF).sort((a, b) => b.added - a.added);
    const read = (id) => S.study.notes.includes(id) ? ' ✅' : '';
    els.screen.innerHTML = `<div class="page">${backBtn('study', '학습회')}<h2>📚 개인 학습 · 자료실</h2>
      <p class="muted" style="margin-top:-6px">자료를 펼쳐 4초 이상 읽으면 학습 보상을 받아요 (오늘 ${S.study.notes.length}/${STUDY_XP.dailyMax}).</p>
      <div class="seg">${['all', ...CAT_ORDER].map((k) => `<button data-f="${k}" class="${libFilter === k ? 'on' : ''}">${k === 'all' ? '전체' : CATS[k].icon + ' ' + CATS[k].label}</button>`).join('')}</div>
      ${shared.length ? `<h4 class="sec">📌 사업부 공용 자료 (${shared.length})</h4>` + shared.map((d) => `<div class="item"><div class="h" data-note="${esc(d.id)}"><span class="tg" style="background:${(CATS[d.cat] || {}).color || '#999'}">${esc((CATS[d.cat] || {}).label || '')}</span><span class="q">${esc(d.title)}${read(d.id)}</span></div><div class="body">${esc(d.body)}${d.link ? `\n<a href="${esc(d.link)}" target="_blank" rel="noopener">🔗 원문 보기</a>` : ''}</div></div>`).join('') : ''}
      <h4 class="sec">📖 기본 학습 자료 (${docs.length})</h4>
      ${docs.map((d) => `<div class="item"><div class="h" data-note="${esc(d.id)}"><span class="tg" style="background:${(CATS[d.cat] || {}).color || '#999'}">${esc((CATS[d.cat] || {}).label || '')}</span><span class="q">${esc(d.title)}${read(d.id)}</span></div><div class="body">${esc(d.body)}${d.src ? `<div class="src">근거: ${esc(d.src)}</div>` : ''}</div></div>`).join('') || '<p class="muted">해당 분야 기본 자료가 없어요.</p>'}
      <div class="box" style="margin-top:14px"><h4>📤 내 기기에 개인 자료 저장</h4>
        <p class="muted" style="margin-top:-4px">PDF · 이미지 · 메모를 이 기기에만 저장해요 (다른 사람에게 보이지 않음).</p>
        <select id="upCat">${CAT_ORDER.map((k) => `<option value="${k}">${CATS[k].label}</option>`).join('')}</select>
        <div class="row" style="margin-top:8px"><label class="btn blue full" style="text-align:center">파일 선택<input type="file" id="upFile" accept=".pdf,image/*,.txt,.md" multiple hidden></label>
        <button class="btn ghost full" id="upNote">메모 작성</button></div></div>
      ${files.length ? `<h4 class="sec">🗂️ 내 자료 (${files.length})</h4>` + files.map((f) => `<div class="item"><div class="h" data-file="${f.id}"><span class="tg" style="background:${(CATS[f.cat] || {}).color || '#999'}">${esc((CATS[f.cat] || {}).label || '')}</span><span class="q">${f.type === 'note' ? '📝' : f.mime === 'application/pdf' ? '📄' : (f.mime || '').startsWith('image/') ? '🖼️' : '📃'} ${esc(f.title)}</span><button class="btn danger mini" data-del="${f.id}">삭제</button></div></div>`).join('') : ''}
    </div>`;
    bindBack();
    els.screen.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { libFilter = b.dataset.f; pageLib(); });
    els.screen.querySelectorAll('[data-note]').forEach((h) => h.onclick = () => {
      const open = h.parentElement.classList.toggle('open');
      if (open) setTimeout(() => { if (h.parentElement.classList.contains('open')) studyReward('note', h.dataset.note); }, 4000);
    });
    $('#upFile').onchange = async (e) => {
      const cat = $('#upCat').value;
      for (const file of e.target.files) {
        if (file.size > 30 * 1024 * 1024) { toast(`${file.name}: 30MB 이하만 저장할 수 있어요`); continue; }
        await Store.files.put({ id: 'f' + Date.now() + Math.random().toString(36).slice(2, 6), cat, title: file.name, mime: file.type || 'application/octet-stream', blob: file, added: Date.now(), type: 'file' });
      }
      toast('자료를 저장했어요'); pageLib();
    };
    $('#upNote').onclick = () => {
      const m = modal(`<h2>메모 작성</h2><input type="text" id="nt" placeholder="제목" maxlength="60"><textarea id="nb" style="margin-top:8px" placeholder="공부한 내용을 정리해 보세요"></textarea>
        <div class="row" style="margin-top:10px"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="ns">저장</button></div>`);
      $('#ns').onclick = async () => {
        const t = $('#nt').value.trim(), body = $('#nb').value.trim();
        if (!t || !body) return toast('제목과 내용을 입력해 주세요');
        await Store.files.put({ id: 'n' + Date.now(), cat: $('#upCat').value, title: t, mime: 'text/plain', blob: new Blob([body], { type: 'text/plain' }), added: Date.now(), type: 'note' });
        m.close(); pageLib();
      };
    };
    const all = await Store.files.all();
    els.screen.querySelectorAll('[data-file]').forEach((h) => h.onclick = async (e) => {
      if (e.target.dataset.del) return;
      const f = all.find((x) => x.id === h.dataset.file); if (!f) return;
      if ((f.mime || '').startsWith('text/') || f.type === 'note') {
        modal(`<h2 style="font-size:20px">${esc(f.title)}</h2><div style="white-space:pre-wrap;font-size:14px;line-height:1.6;margin:10px 0 14px;user-select:text">${esc(await f.blob.text())}</div><button class="btn full" data-close>닫기</button>`);
      } else if ((f.mime || '').startsWith('image/')) {
        const u = URL.createObjectURL(f.blob);
        modal(`<img src="${u}" style="width:100%;border-radius:12px"><button class="btn full" style="margin-top:10px" data-close>닫기</button>`, () => URL.revokeObjectURL(u));
      } else {
        const u = URL.createObjectURL(f.blob);
        if (!window.open(u, '_blank')) modal(`<iframe src="${u}" style="width:100%;height:65vh;border:0;border-radius:12px"></iframe><button class="btn full" style="margin-top:10px" data-close>닫기</button>`, () => URL.revokeObjectURL(u));
      }
    });
    els.screen.querySelectorAll('[data-del]').forEach((b) => b.onclick = async (e) => {
      e.stopPropagation();
      if (await confirmBox('이 자료를 삭제할까요? 되돌릴 수 없어요.', '삭제')) { await Store.files.del(b.dataset.del); pageLib(); }
    });
  }

  /* ---- 상점 ---- */
  function pageShop() {
    setNav('shop');
    els.screen.innerHTML = `<div class="page"><h2>🛒 사내 매점</h2>
      <div class="box row" style="justify-content:space-between"><div><div class="muted">보유 활동비</div><b style="font-size:22px">💰 ${won(S.money)}</b></div>
        <div class="muted" style="text-align:right">정답 1개 30~80원<br>퍼펙트 +200원 · 보스 승리 보상</div></div>
      <button class="btn blue full" id="sendMoney" style="margin-bottom:6px">💸 동료에게 활동비 보내기</button>
      <h4 class="sec">🛍️ 아이템</h4>
      <div class="shop">${ITEMS.map((it) => `<div class="sitem">
        <div class="si">${it.icon}</div><div class="sn"><b>${it.name}</b><small>${esc(it.desc)}</small><span class="own">보유 ${S.items[it.id] || 0}개</span></div>
        <button class="btn mini ${S.money >= it.price ? '' : 'ghost'}" data-buy="${it.id}">${won(it.price)}</button></div>`).join('')}</div>
      <p class="muted">💡 문제용 아이템은 퀴즈 중 선택지 위 아이템 바에서 써요. 🧃 활기력 아이템은 완료한 일정 카드를 누르면 쓸 수 있어요.</p>
      <h4 class="sec">🏢 사무실 꾸미기</h4>
      <div class="shop">${OFFICE_ITEMS.map((it) => { const own = ((S.office || {}).owned || {})[it.id]; return `<div class="sitem">
        <div class="si">${it.icon}</div><div class="sn"><b>${it.name}</b><small>${esc(it.desc)}</small>${own ? '<span class="own">✅ 보유 중 · 사무실에서 비치/보관</span>' : ''}</div>
        ${own ? '<button class="btn mini ghost" data-office>사무실</button>' : `<button class="btn mini ${S.money >= it.price ? '' : 'ghost'}" data-deco="${it.id}">${won(it.price)}</button>`}</div>`; }).join('')}</div>
    </div>`;
    $('#sendMoney').onclick = () => sendMoneyModal();
    els.screen.querySelectorAll('[data-office]').forEach((b) => b.onclick = () => openOffice());
    els.screen.querySelectorAll('[data-deco]').forEach((b) => b.onclick = async () => {
      const it = OFFICE_ITEMS.find((x) => x.id === b.dataset.deco);
      if (S.money < it.price) return toast(`활동비가 ${won(it.price - S.money)} 부족해요`);
      if (!(await confirmBox(`${it.icon} ${it.name}을(를) ${won(it.price)}에 살까요?\n사무실에 바로 비치돼요.`, '구매'))) return;
      const o = S.office || (S.office = { owned: {}, shown: {} });
      S.money -= it.price; o.owned[it.id] = Date.now(); o.shown[it.id] = true; inc('purchases');
      Snd.coin(); toast(`${it.icon} ${it.name} 구매! 사무실에 비치했어요`); checkAch(); save(); renderHud(); pageShop();
    });
    els.screen.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
      const it = ITEMS.find((x) => x.id === b.dataset.buy);
      if (S.money < it.price) return toast(`활동비가 ${won(it.price - S.money)} 부족해요`);
      S.money -= it.price; S.items[it.id] = (S.items[it.id] || 0) + 1; inc('purchases');
      Snd.coin(); toast(`${it.icon} ${it.name} 구매!`); checkAch(); save(); renderHud(); pageShop();
    });
  }

  /* ---- 내 캐릭터 ---- */
  let achGroup = '전체';
  function pageChar() {
    setNav('char');
    const r = rankOf(S.lv), cls = currentClass(), tier = tierOf(S.honor);
    const tot = Object.values(S.stats).reduce((a, s) => ({ c: a.c + s.c, n: a.n + s.n }), { c: 0, n: 0 });
    const groups = Object.keys(GROUPS).map((g) => {
      const m = mastery(g), t = tierOf(m), nx = HONOR_TIERS.find((x) => x.min > m);
      const st = GROUPS[g].cats.reduce((a, c) => { const s = S.stats[c] || { c: 0, n: 0 }; return { c: a.c + s.c, n: a.n + s.n }; }, { c: 0, n: 0 });
      const pct = nx ? Math.round(((m - t.min) / (nx.min - t.min)) * 100) : 100;
      return `<div class="mbar"><div class="l"><span>${CLASSES[g].icon} ${GROUPS[g].label} <span class="badge" style="background:${t.color};font-size:10.5px;padding:1px 7px">${t.name}</span></span><span class="muted">정답률 ${st.n ? Math.round((st.c / st.n) * 100) : 0}% · ${Math.round(m)}pt</span></div><div class="b"><i style="width:${pct}%;background:${CLASSES[g].color}"></i></div></div>`;
    }).join('');
    const achGroups = ['전체', ...new Set(ACHIEVEMENTS.map((a) => a.group))];
    const achList = ACHIEVEMENTS.filter((a) => achGroup === '전체' || a.group === achGroup);
    els.screen.innerHTML = `<div class="page"><h2>내 캐릭터</h2>
      <div class="box"><div class="charhead">
        <div class="big"><div class="bgx">${bgHTML(r.bg)}</div><div class="fg">${charHTML(playerSpec(), rest())}</div></div>
        <div><div class="nm">${esc(S.name)}</div><div class="muted">Lv.${S.lv} · ${r.title}</div>
          <div style="margin-top:6px">${cls ? `<span class="badge" style="background:${CLASSES[cls].color}">${CLASSES[cls].icon} ${CLASSES[cls].name}</span>` : `<span class="badge" style="background:#9aa3b2">Lv${CLASS_LV}에 명예 직업 획득</span>`}
          <span class="badge" style="background:${tier.color}">🏅 명예 ${tier.name} · ${S.honor}</span></div>
          <div class="xpbar" style="margin-top:10px;height:9px"><i style="width:${S.lv >= MAX_LV ? 100 : Math.round((S.xp / xpNeed(S.lv)) * 100)}%"></i></div>
          <div class="muted" style="margin-top:4px">${S.lv >= MAX_LV ? 'MAX' : `다음 레벨까지 ${xpNeed(S.lv) - S.xp} XP`}</div>
        </div></div></div>
      <div class="box"><h4>👔 옷장 <small class="muted">승진하면 새 의상이 지급돼요</small></h4><div class="wardrobe">
        <button class="wcard ${!S.costume ? 'on' : ''}" data-cos="0"><span class="wi">✨</span><b>직급에 맞춤</b><small>지금: ${COSTUMES.find((c) => c.st === costumeStage(S.lv)).name}</small></button>
        ${COSTUMES.map((c) => {
          const lock = S.lv < c.lv, key = hasFace ? 'face:me' : S.illust ? 'illust:' + S.illust : null;
          const ready = c.st === 2 || (key && Sprites.has(key + '@s' + c.st));
          return `<button class="wcard ${S.costume === c.st ? 'on' : ''} ${lock ? 'lock' : ''}" data-cos="${c.st}" ${lock ? 'disabled' : ''}>
            <span class="wi">${lock ? '🔒' : c.icon}</span><b>${c.name}</b><small>${lock ? `Lv.${c.lv}에 지급` : esc(c.desc)}</small>${!lock && !ready ? '<small class="muted">그림 준비 중</small>' : ''}</button>`;
        }).join('')}</div></div>
      <div class="box stat"><div><b>${tot.n}</b><span>푼 문제</span></div><div><b>${tot.n ? Math.round((tot.c / tot.n) * 100) : 0}%</b><span>정답률</span></div><div><b>${S.bestCombo}</b><span>최고 콤보</span></div>
        <div><b>${S.streak.count}</b><span>연속 출근</span></div><div><b>${S.totalXp}</b><span>누적 XP</span></div><div><b>${Object.keys(S.ach).length}/${ACHIEVEMENTS.length}</b><span>업적</span></div></div>
      <div class="box"><h4>분야별 숙련도 (명예 직업 판정)</h4>${groups}
        <p class="muted">방카슈랑스는 3개 분야 평균으로 계산해요. 네 분야가 고르게 높으면 💼 올라운더!</p></div>
      <div class="box"><h4>승진 로드맵</h4><div class="ranks">${RANKS.map((x) => {
        const lock = S.lv < x.lv, now = x === r;
        return `<div class="rank ${lock ? 'lock' : ''} ${now ? 'now' : ''}"><div class="rv">${charHTML(playerSpec(x.lv), rest(), { bust: true })}</div>
          <div><b>Lv.${x.lv} ${x.title}</b>${now ? '<div class="muted">현재 직급</div>' : ''}</div></div>`;
      }).join('')}</div></div>
      <div class="box"><h4>업적 ${Object.keys(S.ach).length}/${ACHIEVEMENTS.length}</h4>
        <div class="seg">${achGroups.map((g) => `<button data-ag="${g}" class="${achGroup === g ? 'on' : ''}">${g}</button>`).join('')}</div>
        <div class="achs">${achList.map((a) => {
          const v = Math.min(statVal(a.stat), a.goal), got = S.ach[a.id];
          return `<div class="ach ${got ? '' : 'lock'}"><div class="i">${a.icon}</div><b>${a.name}</b>${a.desc}${got ? '' : `<div class="ap"><i style="width:${Math.round((v / a.goal) * 100)}%"></i></div><small>${v.toLocaleString()}/${a.goal.toLocaleString()}</small>`}</div>`;
        }).join('')}</div></div>
    </div>`;
    els.screen.querySelectorAll('[data-ag]').forEach((b) => b.onclick = () => { achGroup = b.dataset.ag; pageChar(); });
    els.screen.querySelectorAll('[data-cos]').forEach((b) => b.onclick = () => {
      const st = +b.dataset.cos; S.costume = st || null; Snd.tap(); save(); renderHud();
      toast(st ? `${COSTUMES.find((c) => c.st === st).icon} ${COSTUMES.find((c) => c.st === st).name} 의상으로 갈아입었어요` : '직급에 맞는 의상을 입어요'); pageChar();
    });
  }

  /* ---- 설정 ---- */
  let deferredInstall = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
  addEventListener('appinstalled', () => { deferredInstall = null; try { localStorage.setItem('bmq_install_seen', '1'); } catch (e) { } if (els.modal.classList.contains('on') && $('.ig')) els.modal.querySelector('[data-close]')?.click(); toast('📲 설치 완료! 이제 홈 화면의 아이콘으로 실행하세요', 4000); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /* ---------------- 앱 설치 안내 (첫 출근 후 · 설정에서 다시 보기) ---------------- */
  function browserEnv() {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua), kakao = /KAKAOTALK/i.test(ua);
    const inapp = kakao || /NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND\/|; wv\)/i.test(ua);
    return { ios, android, kakao, inapp, samsung: /SamsungBrowser/i.test(ua), iosChrome: ios && /CriOS/i.test(ua), iosOther: ios && /FxiOS|EdgiOS|Whale/i.test(ua) };
  }
  // 휴대폰 모양 미리보기: 누를 곳에 반짝이는 동그라미
  function phoneMock(m) {
    const dot = (cls) => `<i class="ig-dot ${cls}"></i>`;
    let inner = '';
    if (m.at) inner = `<div class="ig-bar top"><span>🔒 banca-bm-game</span><b>${m.topIcon || '⋮'}</b></div><div class="ig-page"></div>
      <div class="ig-bar bottom">${m.bottomIcons || '<b>‹</b><b>›</b><b>⬆︎</b><b>📖</b><b>⧉</b>'}</div>${dot(m.at)}`;
    else if (m.menu) inner = `<div class="ig-sheet">${m.menu.map((t) => `<div class="${t[0] === '*' ? 'hi' : ''}">${esc(t.replace(/^\*/, ''))}</div>`).join('')}</div>`;
    else if (m.dialog) inner = `<div class="ig-page dim"></div><div class="ig-dlg"><div class="ig-ico">🏆</div><b>${esc(m.dialog[0])}</b><div class="ig-btns"><span>취소</span><span class="hi">${esc(m.dialog[1])}</span></div></div>`;
    else if (m.home) inner = `<div class="ig-home">${['📞', '💬', '📷', '🗓️', '🎵', '🏆'].map((x, i) => `<span class="${i === 5 ? 'hi' : ''}">${x}${i === 5 ? '<small>방카BM</small>' : ''}</span>`).join('')}</div>`;
    return `<div class="ig-phone">${inner}</div>`;
  }
  function installSteps(env) {
    const url = location.href.split('#')[0];
    if (env.inapp) {
      const where = env.kakao ? '카카오톡' : '이 앱';
      const ext = env.ios ? 'Safari' : '크롬(Chrome)';
      const open = env.kakao ? 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url)
        : env.android ? 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end' : '';
      return [
        { t: `${where} 안에서는 설치가 안 돼요`, d: `앱으로 설치하려면 <b>${ext}</b>에서 열어야 해요.<br>아래 버튼을 눌러 주세요.`, btn: open ? { label: `🌐 ${ext}로 열기`, go: () => { location.href = open; } } : null, m: { at: env.ios ? 'br' : 'tr', topIcon: '⋮' } },
        { t: '버튼이 안 되면 직접 열기', d: env.ios ? `화면 <b>오른쪽 아래 ⋯ (또는 공유)</b> 버튼 → <b>'다른 브라우저로 열기'</b> 또는 <b>'Safari로 열기'</b>를 눌러 주세요.`
          : `화면 <b>오른쪽 위 ⋮</b> 버튼 → <b>'다른 브라우저로 열기'</b>를 누르고 <b>Chrome</b>을 골라 주세요.`,
          m: { menu: ['링크 복사', '공유하기', '*다른 브라우저로 열기', '새로고침'] } },
        { t: `${ext}에서 다시 로그인`, d: `${ext}가 열리면 같은 이메일로 한 번 더 로그인해 주세요.<br>설치 안내가 이어서 나와요. 기록은 그대로예요!`, m: { at: 'none' } }
      ];
    }
    if (env.ios) {
      const chrome = env.iosChrome;
      return [
        { t: chrome ? '주소창 오른쪽 공유 버튼' : '아래쪽 공유 버튼 누르기', d: chrome ? `주소창 <b>오른쪽의 공유 버튼 (□↑)</b>을 눌러 주세요.`
          : `화면 <b>아래쪽의 공유 버튼 (□↑)</b>을 눌러 주세요.<br><span class="muted">안 보이면 오른쪽 아래 <b>⋯</b> → <b>공유</b></span>`,
          m: chrome ? { at: 'tr', topIcon: '⬆︎' } : { at: 'bc' } },
        { t: "'홈 화면에 추가' 누르기", d: `메뉴를 <b>위로 올려서</b> <b>'홈 화면에 추가'</b>를 찾아 눌러 주세요.`, m: { menu: ['복사', '읽기 목록에 추가', '책갈피 추가', '*홈 화면에 추가', '페이지에서 찾기'] } },
        { t: "오른쪽 위 '추가' 누르기", d: `<b>'웹 앱으로 열기'</b>가 켜져 있는지 확인하고, 오른쪽 위 <b>'추가'</b>를 누르면 끝!`, m: { dialog: ['홈 화면에 추가', '추가'] } },
        { t: '홈 화면에서 실행', d: `홈 화면에 생긴 <b>방카BM</b> 아이콘으로 들어오면 앱처럼 전체 화면으로 열려요.`, m: { home: true } }
      ];
    }
    const quick = deferredInstall ? [{ t: '버튼 한 번이면 설치 끝!', d: `아래 <b>[앱 설치하기]</b>를 누르고, 뜨는 창에서 <b>'설치'</b>를 눌러 주세요.`,
      btn: { label: '📲 앱 설치하기', go: async (next) => { const e = deferredInstall; if (!e) return next(); deferredInstall = null; e.prompt(); try { const c = await e.userChoice; if (c.outcome === 'accepted') next(true); } catch (er) { } } },
      m: { dialog: ['앱을 설치하시겠어요?', '설치'] } }] : [];
    if (env.samsung) return quick.length ? quick.concat([{ t: '홈 화면에서 실행', d: '홈 화면에 생긴 <b>방카BM</b> 아이콘으로 들어오세요.', m: { home: true } }]) : [
      { t: '아래쪽 메뉴 버튼 누르기', d: `화면 <b>오른쪽 아래 ≡ (메뉴)</b> 버튼을 눌러 주세요.`, m: { at: 'br', bottomIcons: '<b>‹</b><b>›</b><b>⌂</b><b>⧉</b><b>≡</b>' } },
      { t: "'현재 페이지 추가' → '홈 화면'", d: `<b>'현재 페이지 추가'</b> (또는 '페이지 추가')를 누른 뒤 <b>'홈 화면'</b>을 골라 주세요.`, m: { menu: ['북마크', '방문 기록', '*현재 페이지 추가', '설정'] } },
      { t: "'추가' 누르기", d: `확인 창에서 <b>'추가'</b>를 누르면 끝!`, m: { dialog: ['홈 화면에 추가', '추가'] } },
      { t: '홈 화면에서 실행', d: '홈 화면에 생긴 <b>방카BM</b> 아이콘으로 들어오세요.', m: { home: true } }];
    if (env.android) return quick.length ? quick.concat([{ t: '홈 화면에서 실행', d: '홈 화면에 생긴 <b>방카BM</b> 아이콘으로 들어오면 앱처럼 열려요.', m: { home: true } }]) : [
      { t: '오른쪽 위 ⋮ 누르기', d: `크롬 주소창 <b>오른쪽 위의 ⋮</b> 버튼을 눌러 주세요.`, m: { at: 'tr', topIcon: '⋮' } },
      { t: "'홈 화면에 추가' 누르기", d: `메뉴에서 <b>'홈 화면에 추가'</b> 또는 <b>'앱 설치'</b>를 눌러 주세요.`, m: { menu: ['새 탭', '방문 기록', '다운로드', '*홈 화면에 추가', '설정'] } },
      { t: "'설치' 누르기", d: `확인 창에서 <b>'설치'</b>(또는 '추가')를 누르면 끝!`, m: { dialog: ['앱 설치', '설치'] } },
      { t: '홈 화면에서 실행', d: '홈 화면에 생긴 <b>방카BM</b> 아이콘으로 들어오면 앱처럼 열려요.', m: { home: true } }];
    // PC
    return quick.length ? quick : [
      { t: '주소창의 설치 아이콘', d: `주소창 <b>오른쪽 끝의 설치 아이콘 (⊕ 또는 🖥️)</b>을 누르거나, 메뉴 <b>⋮ → '앱 설치'</b>를 눌러 주세요.`, m: { at: 'tr', topIcon: '⊕' } },
      { t: "'설치' 누르기", d: `확인 창에서 <b>'설치'</b>를 누르면 바탕화면·시작 메뉴에서 바로 열 수 있어요.`, m: { dialog: ['앱을 설치하시겠어요?', '설치'] } }];
  }
  // 이 기기에서 아직 안내를 안 봤고 앱으로 실행 중이 아니면 안내 (카톡에서 넘어온 뒤 크롬에서 다시 로그인한 경우 포함)
  function maybeInstallGuide() {
    let seen = false; try { seen = localStorage.getItem('bmq_install_seen') === '1'; } catch (e) { }
    if (standalone() || seen) return false;
    setTimeout(() => installGuide(true), 700);
    return true;
  }
  function installGuide(first) {
    if (standalone()) return toast('이미 앱으로 실행 중이에요 👍');
    const steps = installSteps(browserEnv());
    let i = 0;
    const m = modal('<div class="ig"></div>');
    const box = m.el.querySelector('.ig');
    const seen = () => { try { localStorage.setItem('bmq_install_seen', '1'); } catch (e) { } };
    const draw = () => {
      const st = steps[i], last = i === steps.length - 1;
      box.innerHTML = `<div class="ig-head">📲 앱으로 설치하기 <span>${i + 1} / ${steps.length}</span></div>
        <div class="ig-prog">${steps.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        ${phoneMock(st.m)}
        <h3>${st.t}</h3><p>${st.d}</p>
        ${st.btn ? `<button class="btn full" id="igGo">${st.btn.label}</button>` : ''}
        <div class="row" style="margin-top:10px">
          ${i > 0 ? '<button class="btn ghost full" id="igPrev">← 이전</button>' : `<button class="btn ghost full" id="igLater">${first ? '나중에 할게요' : '닫기'}</button>`}
          ${last ? '<button class="btn full" id="igDone">완료했어요</button>' : '<button class="btn full" id="igNext">다음 →</button>'}
        </div>
        ${first ? '<p class="muted" style="text-align:center;margin:10px 0 0;font-size:12px">설정 → 📲 앱으로 설치에서 언제든 다시 볼 수 있어요</p>' : ''}`;
      const go = (k) => { i = Math.max(0, Math.min(steps.length - 1, k)); draw(); };
      const b = (id, fn) => { const el = box.querySelector(id); if (el) el.onclick = fn; };
      b('#igGo', () => st.btn.go((done) => (done ? (seen(), m.close(), toast('📲 설치 중이에요! 홈 화면을 확인해 주세요', 3500)) : go(i + 1))));
      b('#igNext', () => go(i + 1)); b('#igPrev', () => go(i - 1));
      b('#igLater', () => { seen(); m.close(); }); b('#igDone', () => { seen(); m.close(); toast('잘하셨어요! 다음부터는 홈 화면 아이콘으로 출근하세요 🏢', 3500); });
    };
    draw();
  }
  function pageSettings() {
    setNav('settings');
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent), u = Api.user || {};
    els.screen.innerHTML = `<div class="page"><h2>⚙️ 설정</h2>
      ${Api.demo ? '<div class="box demo">🧪 로컬 데모 모드 — 서버(구글 시트)에 연결되지 않았어요. 기록은 이 브라우저에만 저장돼요.</div>' : ''}
      ${u.admin ? '<button class="btn full" id="adm" style="margin-bottom:12px">🛠️ 관리자 메뉴 (회원 · 캐릭터 · 이의 제기 · 문제 · 자료실)</button>' : ''}
      ${standalone() ? '' : `<div class="box"><h4>📲 앱으로 설치</h4><p class="muted">홈 화면에 설치하면 주소창 없이 앱처럼 전체 화면으로 실행돼요.</p>
        <button class="btn full" id="inst">설치 방법 차근차근 보기</button></div>`}
      <div class="box"><h4>👤 내 정보</h4><div class="muted" style="margin-bottom:8px">${esc(u.email || '')}</div>
        <div class="row"><input type="text" id="nm" value="${esc(S.name)}" maxlength="8"><button class="btn" id="nmSave" style="flex:none">이름 변경</button></div>
        <div class="row" style="margin-top:8px"><button class="btn ghost full" id="pw">🔑 비밀번호 변경</button></div>
        <div class="row" style="margin-top:10px;justify-content:space-between"><span>효과음</span><button class="btn ghost" id="snd">${S.sound ? '🔊 켜짐' : '🔇 꺼짐'}</button></div></div>
      <div class="box"><h4>💾 기록</h4><p class="muted">기록은 서버에 자동 저장돼요. 같은 이메일로 로그인하면 다른 기기에서도 이어서 할 수 있어요.</p>
        <button class="btn ghost full" id="sync">지금 저장하기</button></div>
      <div class="box"><h4>🗑️ 캐릭터 초기화</h4><p class="muted">레벨 · 경험치 · 활동비 · 업적 · 아이템 등 모든 진행 기록을 지우고 신입사원 등록부터 다시 시작해요. 되돌릴 수 없어요.${hasFace ? '<br>📷 관리자가 지정한 내 캐릭터 그림은 그대로 유지돼요.' : ''}</p>
        <button class="btn danger full" id="reset">캐릭터 초기화</button></div>
      <button class="btn danger full" id="logout">로그아웃</button>
      <p class="muted" style="text-align:center;margin-top:14px">방카BM 성장기 v2.0 · 문제 ${Api.cachedQuestions().length}개</p>
    </div>`;
    const adm = $('#adm'); if (adm) adm.onclick = () => go('admin');
    const inst = $('#inst');
    if (inst) inst.onclick = () => installGuide(false);
    $('#nmSave').onclick = () => { const v = $('#nm').value.trim(); if (!v) return; S.name = v; save(); renderHud(); toast('이름을 바꿨어요'); };
    $('#snd').onclick = () => { S.sound = !S.sound; save(); pageSettings(); renderHud(); };
    $('#sync').onclick = async () => { await syncNow(); toast('저장했어요'); };
    $('#pw').onclick = () => {
      const m = modal(`<h2 style="font-size:22px">🔑 비밀번호 변경</h2><input type="password" id="o" placeholder="현재 비밀번호" autocomplete="current-password">
        <input type="password" id="n1" placeholder="새 비밀번호 (5자 이상)" style="margin-top:8px" autocomplete="new-password"><input type="password" id="n2" placeholder="새 비밀번호 확인" style="margin-top:8px" autocomplete="new-password">
        <div class="row" style="margin-top:10px"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="pg">변경</button></div>`);
      $('#pg').onclick = async () => {
        if ($('#n1').value !== $('#n2').value) return toast('새 비밀번호가 서로 달라요');
        if ($('#n1').value.length < 5) return toast('새 비밀번호는 5자 이상');
        try { await Api.changePassword($('#o').value, $('#n1').value); m.close(); toast('비밀번호를 바꿨어요'); } catch (e) { toast(e.message); }
      };
    };
    $('#reset').onclick = async () => {
      if (!(await confirmBox(`정말 초기화할까요?

Lv.${S.lv} ${rankOf(S.lv).title} ${S.name}의 모든 기록(경험치 ${S.totalXp.toLocaleString()} · 활동비 ${won(S.money)} · 업적 ${Object.keys(S.ach).length}개)이 사라지고 되돌릴 수 없어요.${hasFace ? '\n(지정된 캐릭터 그림은 그대로 유지돼요)' : ''}`, '초기화', '취소'))) return;
      const m = modal(`<h2 style="font-size:22px">마지막 확인</h2><p class="muted" style="text-align:center">아래 칸에 <b>초기화</b> 라고 입력해 주세요.</p>
        <input type="text" id="rsTxt" placeholder="초기화" autocomplete="off"><div class="row" style="margin-top:10px"><button class="btn ghost full" data-close>취소</button><button class="btn danger full" id="rsGo">초기화</button></div>`);
      $('#rsGo').onclick = async () => {
        if ($('#rsTxt').value.trim() !== '초기화') return toast('"초기화"라고 정확히 입력해 주세요');
        $('#rsGo').disabled = true;
        const prev = S, F = Store.fresh(S.email); F.resetAt = F.created; F.sound = prev.sound;
        S = F;
        try { await syncNow(true); }
        catch (e) { S = prev; $('#rsGo').disabled = false; return toast('서버에 연결하지 못해 초기화하지 않았어요: ' + e.message, 3500); }
        Store.save(S); m.close(); toast('캐릭터를 초기화했어요. 새로 입사해 볼까요?'); createScreen();
      };
    };
    $('#logout').onclick = async () => {
      if (!(await confirmBox('로그아웃할까요?', '로그아웃'))) return;
      await syncNow(); Api.logout(); S = null; location.reload();
    };
  }

  /* ---------------- 관리자 ---------------- */
  let admTab = 'users', admQ = null;
  const CAT_KO_REV = () => Object.fromEntries(CAT_ORDER.map((k) => [CATS[k].label, k]));
  async function pageAdmin() {
    if (!(Api.user || {}).admin) return goHome();
    setNav('settings');
    const tabs = [['users', '👥 회원'], ['chars', '🎭 캐릭터'], ['reports', '⚠️ 이의 제기'], ['subs', '✍️ 제출 문제'], ['questions', '📝 문제'], ['bgs', '🖼️ 배경'], ['auto', '🤖 자동 관리'], ['lib', '📚 공용 자료']];
    els.screen.innerHTML = `<div class="page">${backBtn('settings', '설정')}<h2>🛠️ 관리자</h2>
      <div class="seg">${tabs.map(([k, l]) => `<button data-t="${k}" class="${admTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="admBody"><div class="loading"><div class="spin"></div>불러오는 중…</div></div></div>`;
    bindBack();
    els.screen.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { admTab = b.dataset.t; pageAdmin(); });
    const body = $('#admBody');
    try {
      if (admTab === 'users') await admUsers(body);
      else if (admTab === 'chars') await admChars(body);
      else if (admTab === 'reports') await admReports(body);
      else if (admTab === 'questions') await admQuestions(body);
      else if (admTab === 'subs') await admSubmissions(body);
      else if (admTab === 'auto') await admAuto(body);
      else if (admTab === 'bgs') admBgs(body);
      else await admLib(body);
    } catch (e) { body.innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
  }
  let admCharTab = 'staff';
  const NPC_GROUPS = [
    ['🏢 사업부', ['partjang', 'kimpro', 'hwangpro', 'yunpro', 'choiseonim', 'ochajang']],
    ['🏦 은행 방문 고객', ['ajumma', 'ajeossi', 'worker', 'harabeoji', 'halmeoni']],
    ['🎓 금융연수원', ['jogyo', 'kimgyosu', 'parkgyosu']],
    ['⭐ 오늘의 보스', ['teamlead', 'vicemgr', 'kimteam', 'branchmgr', 'wmcenter', 'bankceo', 'bokgov']],
    ['💎 VIP 전화', ['vip', 'vipkim', 'vipmadam']]
  ];
  async function admChars(body) {
    body.innerHTML = `<div class="seg"><button data-act="staff" class="${admCharTab === 'staff' ? 'on' : ''}">👥 직원 캐릭터</button><button data-act="npc" class="${admCharTab === 'npc' ? 'on' : ''}">🎬 등장인물</button></div><div id="acBody"></div>`;
    body.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { admCharTab = b.dataset.act; admChars(body); });
    const box = body.querySelector('#acBody');
    if (admCharTab === 'npc') return admNpcs(box);
    const me = (Api.user || {}).email;
    const render = (items) => {
      if (!box.isConnected) return;
      items.forEach((x) => { x.me = x.email === me; });
      primePeerFaces(items);
      box.innerHTML = items.length ? `<p class="muted">회원들의 캐릭터예요. 게임을 시작하지 않았어도 실물 캐릭터를 등록했다면 보여요. 눌러서 크게 보거나 게임 화면으로 볼 수 있어요.</p>
        <div class="chargrid">${items.map((x, i) => `<button class="charcard" data-ci="${i}"><span class="rkav">${avatar(x)}</span><b>${esc(x.name)}</b>
          <small>${x.lv ? `Lv.${x.lv} ${rankOf(x.lv).title}` : '입사 전'}${x.face ? ' · 📷 실물' : ''}${x.active ? '' : ' · 중지'}</small></button>`).join('')}</div>`
        : '<p class="muted">아직 캐릭터가 있는 회원이 없어요.</p>';
      box.querySelectorAll('[data-ci]').forEach((b) => b.onclick = () => charViewer(items[+b.dataset.ci], { scene: true }));
      const fl = needFull(items);
      if (fl.length) loadPeerFaces(fl.map(pfid), ['normal']).then(() => {
        box.querySelectorAll('[data-ci]').forEach((b) => { const x = items[+b.dataset.ci]; if (x.face && !x.me && !x.thumb) b.querySelector('.rkav').innerHTML = avatar(x); });
      });
    };
    // 이 기기에 저장해 둔 지난 목록을 바로 보여 주고, 서버에서 새 목록이 오면 바꾼다
    let cached = null; try { cached = JSON.parse(localStorage.getItem('bmq_admchars')); } catch (e) { }
    if (cached) render(cached); else box.innerHTML = '<div class="loading"><div class="spin"></div>불러오는 중…</div>';
    try {
      const items = await Api.admin.chars();
      try { localStorage.setItem('bmq_admchars', JSON.stringify(items)); } catch (e) { }
      render(items);
    } catch (e) { if (!cached) throw e; toast('최신 목록을 불러오지 못해 저장된 목록을 보여드려요'); }
  }
  function admNpcs(box) {
    const thumb = (k) => (Sprites.has(k) ? `<img class="avthumb" src="img/chars/thumb/${k}.webp" alt="" loading="lazy" onerror="this.remove()">` : charHTML(NPCS[k].spec, 'normal', { head: true }));
    box.innerHTML = `<p class="muted">게임에 나오는 등장인물이에요. 누르면 <b>실제 게임 화면</b>으로 등장 장면 · 문제 출제 · 정답/오답 반응을 미리 볼 수 있어요. (기록에는 남지 않아요)</p>
      ${NPC_GROUPS.map(([g, ks]) => `<h4 class="sec">${g}</h4><div class="chargrid">${ks.filter((k) => NPCS[k]).map((k) => `<button class="charcard" data-npc="${k}"><span class="rkav">${thumb(k)}</span><b>${esc(NPCS[k].name)}</b>
        <small>${esc(NPCS[k].role.split(' · ')[0])}</small></button>`).join('')}</div>`).join('')}`;
    box.querySelectorAll('[data-npc]').forEach((b) => b.onclick = () => npcScene(b.dataset.npc));
  }

  /* ---- 미리보기: 실제 게임 화면 그대로 (경험치 · 활동비 · 기록은 바뀌지 않음) ---- */
  async function previewStage(run) {
    inSession = true;
    els.screen.innerHTML = ''; els.hud.classList.add('hidden'); els.nav.classList.add('hidden'); stageMode(''); els.vn.classList.add('on');
    let again = false;
    try { again = await run(); } catch (e) { console.error(e); }
    finally {
      els.choices.innerHTML = ''; els.dlg.classList.remove('asking'); els.meta.innerHTML = ''; els.timer.classList.remove('on');
      els.vn.classList.remove('on'); inSession = false; setChar(null);
      els.hud.classList.remove('hidden'); renderHud();
      admTab = 'chars'; go('admin');
    }
    return again;
  }
  const EXPR_TOUR = [['normal', '기본'], ['smile', '웃음'], ['angry', '화남'], ['worried', '당황']];
  async function npcScene(k) {
    const n = NPCS[k], who = whoOf(k), tag = (t) => `🎬 미리보기 · ${t}`;
    const tier = BOSS_TIERS.find((t) => t.npc === k || (t.npcs || []).includes(k));
    const cat = CAT_ORDER.find((c) => (CATS[c].npcs || []).includes(k));
    const vip = !!n.call;
    const pool = Api.cachedQuestions().filter((q) => (tier ? tier.cats.includes(q.cat) : cat ? q.cat === cat : vip ? q.diff === 3 && ['banca_general', 'market', 'econ'].includes(q.cat) : true));
    const again = await previewStage(async () => {
      setBg(n.bg); setChar(null);
      if (tier) await say(NARR, `${tag('오늘의 보스')}\n${'★'.repeat(tier.stars)}${'☆'.repeat(5 - tier.stars)}  오늘의 보스 등장!\n「${n.name}」 ${n.role.split(' · ')[0]}\n${tier.npcs ? tier.ndesc : tier.desc}`);
      else if (vip) await say(NARR, `${tag('랜덤 이벤트')}\n📞 낯선 번호로 전화가 온다…`);
      else await say(NARR, `${tag(cat ? `${CATS[cat].icon} ${CATS[cat].label} 일정` : '등장 장면')}\n실제 게임과 같은 화면이에요. 기록에는 남지 않아요.`);
      setChar(n.spec, 'normal', 'enter');
      await say(who, vip ? n.call : pick(n.intro || ['…']));
      const q = pick(pool);
      if (q) {
        const r = await ask(q, who, n, n.time || 20, { sess: {}, noItems: true });
        els.dlg.classList.remove('asking'); els.meta.innerHTML = ''; revealAnswer(q);
        if (r.correct) { setChar(n.spec, 'happy', 'hop'); fx(`<div class="stamp ok">${tier || q.cat === 'market' ? '계약 성사!' : '정답!'}</div>`, 1100); Snd.ok(); await say(who, pick(n.ok)); }
        else { setChar(n.spec, 'angry', 'shake'); fx(`<div class="stamp ng">${r.timeout ? '시간 초과' : '오답'}</div>`, 1100); Snd.ng(); await say(who, pick(r.timeout ? n.timeout : n.ng)); }
        els.choices.innerHTML = '';
      }
      setChar(n.spec, 'smile'); await say(who, n.end ? n.end.good : '수고했어요!');
      for (;;) {
        const c = await choose(['😀 표정 4가지 보기', '🗨️ 대사 모두 보기', '🔁 처음부터 다시', '← 캐릭터 목록으로']);
        if (c === 0) for (const [e, l] of EXPR_TOUR) { setChar(n.spec, e, 'hop'); await say(NARR, `표정: ${l}`); }
        else if (c === 1) {
          const L = [...(n.intro || []).map((t) => ['normal', '등장', t]), ...(n.ok || []).map((t) => ['happy', '정답', t]), ...(n.ng || []).map((t) => ['angry', '오답', t]),
            ...(n.timeout || []).map((t) => ['worried', '시간 초과', t]), ...(n.end ? [['smile', '마무리(잘했을 때)', n.end.good], ['worried', '마무리(못했을 때)', n.end.bad]] : []), ...(n.call ? [['normal', '전화', n.call]] : [])];
          for (const [e, l, t] of L) { setChar(n.spec, e); await say({ name: n.name, role: l }, t); }
        } else return c === 2;
      }
    });
    if (again) npcScene(k);
  }
  async function staffScene(p) {
    if (p.face && !p.me) await loadPeerFaces([pfid(p)]);
    const spec = peerSpec(p), me = { name: p.name, role: rankOf(p.lv || 1).title };
    const again = await previewStage(async () => {
      setBg('office'); setChar(null);
      await say(NARR, `🎬 미리보기 · 주인공 화면\n${p.name}님이 게임을 할 때 이렇게 보여요. 기록에는 남지 않아요.`);
      setChar(spec, restOf(spec), 'enter');
      const L = shuffle(peerLines(p)).slice(0, 3);
      for (const [, e, t] of L) { setChar(spec, e, e === 'angry' ? 'shake' : 'hop'); await say(me, t); }
      setChar(spec, 'happy', 'hop'); fx('<div class="stamp ok">정답!</div>', 1100); Snd.ok(); await say(me, '좋았어, 맞혔다!');
      setChar(spec, 'worried', 'shake'); fx('<div class="stamp ng">오답</div>', 1100); Snd.ng(); await say(me, '(앗… 이건 다시 공부해야겠다.)');
      for (;;) {
        const c = await choose(['😀 표정 4가지 보기', '🔁 처음부터 다시', '← 캐릭터 목록으로']);
        if (c === 0) for (const [e, l] of EXPR_TOUR) { setChar(spec, e, 'hop'); await say(NARR, `표정: ${l}`); }
        else return c === 1;
      }
    });
    if (again) staffScene(p);
  }
  function admBgs(body) {
    const scenes = Object.keys(PLACES).filter((k) => !/^rank/.test(k) && k !== 'title');
    body.innerHTML = `<p class="muted">게임에 나오는 배경을 미리 볼 수 있어요. 사무실은 내 캐릭터로 실제 화면처럼 둘러볼 수 있어요.</p>
      <h4 class="sec">🏢 직급별 사무실</h4><div class="bggrid">${RANKS.map((r, i) => `<button class="bgcard" data-rk="${i}"><span class="bgthumb">${bgHTML('rank' + i)}</span><b>${r.title}</b><small>Lv.${r.lv}~ · ${esc(Office.PLACE[i])}</small></button>`).join('')}</div>
      <h4 class="sec">🎬 장면 배경</h4><div class="bggrid">${scenes.map((k) => `<button class="bgcard" data-sc="${k}"><span class="bgthumb">${bgHTML(k)}</span><b>${esc(PLACES[k])}</b><small>${k}</small></button>`).join('')}</div>`;
    body.querySelectorAll('[data-rk]').forEach((b) => b.onclick = () => {
      const r = +b.dataset.rk;
      openOffice({ name: S.name, lv: RANKS[r].lv, oc: officeOC(), photo: myPhoto(), person: Sprites.char(playerSpec().key, 'smile') });
    });
    body.querySelectorAll('[data-sc]').forEach((b) => b.onclick = () => {
      const v = document.createElement('div'); v.id = 'bgView';
      v.innerHTML = `<div class="ov-top"><button class="mini-x" data-x>✕</button><b>🎬 ${esc(PLACES[b.dataset.sc])}</b></div><div class="bgv-stage">${bgHTML(b.dataset.sc)}</div>`;
      document.body.appendChild(v); v.querySelector('[data-x]').onclick = () => v.remove();
    });
  }
  async function admAuto(body) {
    const items = await Api.admin.autoLog();
    const d2 = (t) => { const d = new Date(t); return isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const ic = { '추가': '➕', '중지': '⛔', '다시 사용': '♻️' };
    body.innerHTML = `<div class="box"><h4>🤖 자동 관리</h4><p class="muted" style="margin:0">매일 아침 · 매주 월요일에 최신 뉴스와 공식 발표를 확인해서 <b>틀리게 된 문제는 중지</b>하고 <b>새 소식은 문제로 추가</b>해요.
      방카 상품 · 백오피스는 관리자님이 주신 자료로만 바꿔요. 중지된 문제는 '문제' 탭에서 언제든 다시 '사용'으로 돌릴 수 있어요.</p></div>
      ${items.length ? items.map((x) => `<div class="autorow"><span class="ai">${ic[x.act] || '•'}</span><div><b>${esc(x.act)} · ${esc(x.id)}</b> <small class="muted">${d2(x.at)} · ${esc(x.cat)}</small>
        <div>${esc(x.q)}</div>${x.why ? `<small class="muted">사유: ${esc(x.why)}</small>` : ''}${x.src ? `<small class="muted">근거: ${esc(x.src)}</small>` : ''}</div></div>`).join('')
        : '<p class="muted">아직 자동 관리 기록이 없어요.</p>'}`;
  }
  async function admUsers(body) {
    const users = await Api.admin.users();
    const me = (Api.user || {}).email;
    body.innerHTML = `<div class="box"><h4>➕ 회원 등록 (등록된 이메일만 로그인 가능)</h4>
        <input type="text" id="ue" placeholder="이메일" inputmode="email" autocomplete="off"><input type="text" id="un" placeholder="이름" style="margin-top:8px">
        <input type="text" id="up" placeholder="초기 비밀번호 (5자 이상)" style="margin-top:8px" autocomplete="off">
        <button class="btn full" id="uadd" style="margin-top:8px">등록</button>
        <p class="muted">등록한 이메일과 비밀번호를 해당 직원에게 전달해 주세요. 직원은 설정에서 비밀번호를 바꿀 수 있어요.</p></div>
      <h4 class="sec">회원 ${users.length}명</h4>
      ${users.map((u) => `<div class="item"><div class="row" style="justify-content:space-between;align-items:flex-start">
        <div><b>${esc(u.name || '-')}</b> ${u.admin ? '<span class="badge" style="background:#2b2230">관리자</span>' : ''} ${u.active ? '' : '<span class="badge" style="background:#e5484d">중지</span>'}
          <div class="muted">${esc(u.email)}</div><div class="muted">최근 로그인 ${u.lastLogin ? new Date(u.lastLogin).toLocaleString('ko-KR') : '-'}</div></div>
        <div class="col">${u.email === me ? '' : `<button class="btn ghost mini" data-pw="${esc(u.email)}">비번 재설정</button>
          <button class="btn ghost mini" data-act="${esc(u.email)}" data-on="${u.active ? 1 : 0}">${u.active ? '사용 중지' : '다시 사용'}</button>
          <button class="btn danger mini" data-rm="${esc(u.email)}">삭제</button>`}</div></div></div>`).join('')}`;
    $('#uadd').onclick = async () => {
      const email = $('#ue').value.trim(), name = $('#un').value.trim(), password = $('#up').value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('이메일 형식을 확인해 주세요');
      if (password.length < 5) return toast('비밀번호는 5자 이상');
      try { await Api.admin.saveUser({ email, name, password, active: true }); toast('등록했어요'); pageAdmin(); } catch (e) { toast(e.message); }
    };
    body.querySelectorAll('[data-pw]').forEach((b) => b.onclick = () => {
      const m = modal(`<h2 style="font-size:20px">비밀번호 재설정</h2><div class="muted">${esc(b.dataset.pw)}</div><input type="text" id="np" placeholder="새 비밀번호 (5자 이상)" style="margin-top:8px" autocomplete="off">
        <div class="row" style="margin-top:10px"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="npg">변경</button></div>`);
      $('#npg').onclick = async () => { const p = $('#np').value; if (p.length < 5) return toast('5자 이상'); try { await Api.admin.saveUser({ email: b.dataset.pw, password: p }); m.close(); toast('변경했어요'); } catch (e) { toast(e.message); } };
    });
    body.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => { await Api.admin.saveUser({ email: b.dataset.act, active: b.dataset.on !== '1' }); pageAdmin(); });
    body.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => { if (await confirmBox(`${b.dataset.rm} 회원을 완전히 삭제할까요?\n\n회원 목록 · 진행 기록 · 우편함 · 실물 캐릭터 그림이 모두 지워지고 되돌릴 수 없어요.`, '완전 삭제')) { try { await Api.admin.deleteUser(b.dataset.rm); toast('삭제했어요'); } catch (e) { toast(e.message); } pageAdmin(); } });
  }
  async function loadAdmQ(force) { if (!admQ || force) admQ = await Api.admin.questions(); return admQ; }
  let repFilter = '접수';
  async function admReports(body) {
    const reps = await Api.admin.reports();
    const list = reps.filter((r) => repFilter === '전체' || r.status === repFilter);
    body.innerHTML = `<div class="seg">${['접수', '수정완료', '기각', '전체'].map((s) => `<button data-rf="${s}" class="${repFilter === s ? 'on' : ''}">${s} ${s === '전체' ? reps.length : reps.filter((r) => r.status === s).length}</button>`).join('')}</div>
      ${list.length ? list.map((r, i) => `<div class="item"><div class="h" data-ri="${i}"><span class="tg" style="background:${r.status === '접수' ? '#e5484d' : '#2fb67c'}">${esc(r.status)}</span>
        <span class="q">${esc(r.kind || '')} · ${esc(r.snapshot || r.qid)}<div class="muted">${esc(r.email)} · ${new Date(r.at).toLocaleString('ko-KR')} · ${esc(r.no)}</div></span></div></div>`).join('') : '<p class="muted" style="text-align:center;margin-top:30px">해당하는 이의 제기가 없어요.</p>'}`;
    body.querySelectorAll('[data-rf]').forEach((b) => b.onclick = () => { repFilter = b.dataset.rf; pageAdmin(); });
    body.querySelectorAll('[data-ri]').forEach((h) => h.onclick = async () => {
      const r = list[+h.dataset.ri];
      const qs = await loadAdmQ();
      editQuestion(qs.find((x) => x.id === r.qid), r);
    });
  }
  function qForm(q) {
    q = q || { id: '', cat: 'banca_product', type: 'mc', diff: 2, q: '', choices: ['', '', '', ''], answer: 0, hint: '', exp: '', src: '', asOf: '', expires: '', status: '사용', tags: [] };
    const ox = q.type === 'ox';
    return `<div class="qform">
      <div class="row"><select id="fCat">${CAT_ORDER.map((k) => `<option value="${k}" ${q.cat === k ? 'selected' : ''}>${CATS[k].label}</option>`).join('')}</select>
        <select id="fType"><option value="mc" ${!ox ? 'selected' : ''}>4지선다</option><option value="ox" ${ox ? 'selected' : ''}>OX</option></select>
        <select id="fDiff">${[1, 2, 3].map((d) => `<option value="${d}" ${q.diff === d ? 'selected' : ''}>${DIFF_LABEL[d]}</option>`).join('')}</select></div>
      <label>질문</label><textarea id="fQ" style="min-height:70px">${esc(q.q)}</textarea>
      <div id="fMC" class="${ox ? 'hidden' : ''}">${[0, 1, 2, 3].map((i) => `<label>보기 ${i + 1}</label><input type="text" id="fC${i}" value="${esc((q.choices || [])[i] || '')}">`).join('')}</div>
      <label>정답</label><select id="fA">${ox ? `<option value="O" ${q.answer ? 'selected' : ''}>O</option><option value="X" ${!q.answer ? 'selected' : ''}>X</option>`
        : [0, 1, 2, 3].map((i) => `<option value="${i}" ${q.answer === i ? 'selected' : ''}>${i + 1}번</option>`).join('')}</select>
      <label>힌트</label><input type="text" id="fH" value="${esc(q.hint || '')}">
      <label>해설</label><textarea id="fE" style="min-height:70px">${esc(q.exp || '')}</textarea>
      <label>출처</label><input type="text" id="fS" value="${esc(q.src || '')}">
      <div class="row"><div style="flex:1"><label>기준일</label><input type="text" id="fAs" value="${esc(q.asOf || '')}" placeholder="2026-10-01"></div>
        <div style="flex:1"><label>만료일</label><input type="text" id="fEx" value="${esc(q.expires || '')}" placeholder="비우면 계속 사용"></div></div>
      <label>상태</label><select id="fSt"><option ${q.status !== '중지' ? 'selected' : ''}>사용</option><option ${q.status === '중지' ? 'selected' : ''}>중지</option></select>
    </div>`;
  }
  function readForm(base) {
    const type = $('#fType').value;
    const q = { ...(base || {}), id: (base && base.id) || 'q' + Date.now().toString(36), cat: $('#fCat').value, type, diff: +$('#fDiff').value, q: $('#fQ').value.trim(),
      hint: $('#fH').value.trim(), exp: $('#fE').value.trim(), src: $('#fS').value.trim(), asOf: $('#fAs').value.trim(), expires: $('#fEx').value.trim(), status: $('#fSt').value, tags: (base && base.tags) || [] };
    if (type === 'ox') { q.answer = $('#fA').value === 'O'; delete q.choices; }
    else { q.choices = [0, 1, 2, 3].map((i) => $('#fC' + i).value.trim()); q.answer = +$('#fA').value; }
    if (!q.q) throw new Error('질문을 입력해 주세요');
    if (type === 'mc' && q.choices.some((c) => !c)) throw new Error('보기 4개를 모두 입력해 주세요');
    return q;
  }
  function bindFormType() {
    $('#fType').onchange = () => {
      const ox = $('#fType').value === 'ox';
      $('#fMC').classList.toggle('hidden', ox);
      $('#fA').innerHTML = ox ? '<option>O</option><option>X</option>' : [0, 1, 2, 3].map((i) => `<option value="${i}">${i + 1}번</option>`).join('');
    };
  }
  function editQuestion(q, report) {
    const m = modal(`<h2 style="font-size:21px">${report ? '⚠️ 이의 제기 처리' : q ? '문제 수정' : '새 문제'}</h2>
      ${report ? `<div class="box demo" style="margin:8px 0"><b>${esc(report.kind || '')}</b> · ${esc(report.email)}<div style="white-space:pre-wrap;margin-top:4px">${esc(report.reason)}</div>${report.memo ? `<div class="muted">처리 메모: ${esc(report.memo)}</div>` : ''}</div>` : ''}
      ${q || !report ? qForm(q) : `<p class="muted">문제(${esc(report.qid)})를 찾지 못했어요. 시트에서 삭제됐을 수 있어요.</p>`}
      ${report ? `<label>처리 메모 (선택)</label><input type="text" id="memo" value="${esc(report.memo || '')}">` : ''}
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn ghost full" data-close>닫기</button>
        ${report ? `<button class="btn danger full" id="rej">기각</button>` : ''}
        ${q || !report ? `<button class="btn full" id="qsave">${report ? '수정 저장 + 처리완료' : '저장'}</button>` : ''}
      </div>`);
    if (q || !report) bindFormType();
    const sv = $('#qsave');
    if (sv) sv.onclick = async () => {
      try {
        const nq = readForm(q);
        if (report) await Api.admin.resolve(report.no, '수정완료', $('#memo').value, nq);
        else await Api.admin.saveQuestion(nq);
        admQ = null; await Api.questions(true); m.close(); toast('저장했어요'); pageAdmin();
      } catch (e) { toast(e.message); }
    };
    const rj = $('#rej');
    if (rj) rj.onclick = async () => { try { await Api.admin.resolve(report.no, '기각', $('#memo').value); m.close(); toast('기각 처리했어요'); pageAdmin(); } catch (e) { toast(e.message); } };
  }
  let qSearch = '';
  async function admQuestions(body) {
    const qs = await loadAdmQ();
    const info = await Api.admin.info().catch(() => ({}));
    const counts = CAT_ORDER.map((k) => { const a = qs.filter((q) => q.cat === k), off = a.filter((q) => q.status === '중지').length; return `<div class="row" style="justify-content:space-between;font-size:13.5px;padding:3px 0"><span>${CATS[k].icon} ${CATS[k].label}</span><span class="muted">${a.length - off}문제${off ? ` (중지 ${off})` : ''}</span></div>`; }).join('');
    const found = qSearch ? qs.filter((q) => (q.id + ' ' + q.q).toLowerCase().includes(qSearch.toLowerCase())).slice(0, 40) : [];
    body.innerHTML = `<div class="box"><h4>문제 현황 · 총 ${qs.length}개</h4>${counts}
        ${info.sheetUrl ? `<a class="btn ghost full" style="margin-top:10px;text-align:center;display:block;text-decoration:none" href="${esc(info.sheetUrl)}" target="_blank" rel="noopener">📊 스프레드시트에서 전체 보기·편집</a>` : '<p class="muted">서버 연결 후 스프레드시트 바로가기가 생겨요.</p>'}</div>
      <div class="box"><h4>📤 문제 일괄 등록 (CSV / JSON)</h4>
        <p class="muted">시트와 같은 열(ID, 분류, 유형, 난이도, 질문, 보기1~4, 정답, 힌트, 해설, 출처, 기준일, 만료일, 태그, 상태)의 CSV를 올리세요. 같은 ID는 덮어써요.<br>방카 상품·백오피스 문제는 직접 작성하거나, 자료를 Claude에게 주고 이 양식으로 만들어 달라고 하세요.</p>
        <div class="row"><button class="btn ghost full" id="tpl">양식 받기</button><label class="btn blue full" style="text-align:center">파일 올리기<input type="file" id="qin" accept=".csv,.json,.txt" hidden></label></div>
        <button class="btn full" id="qnew" style="margin-top:8px">➕ 문제 하나 직접 추가</button></div>
      <div class="box"><h4>🔍 문제 찾아 수정</h4><div class="row"><input type="text" id="qs" placeholder="ID 또는 질문 내용" value="${esc(qSearch)}"><button class="btn" id="qsg" style="flex:none">검색</button></div></div>
      ${found.map((q, i) => `<div class="item"><div class="h" data-qi="${i}"><span class="tg" style="background:${(CATS[q.cat] || {}).color || '#999'}">${esc(q.id)}</span><span class="q">${esc(q.q)}${q.status === '중지' ? ' (중지)' : ''}</span></div></div>`).join('')}`;
    $('#qsg').onclick = () => { qSearch = $('#qs').value.trim(); pageAdmin(); };
    $('#qs').onkeydown = (e) => { if (e.key === 'Enter') $('#qsg').click(); };
    body.querySelectorAll('[data-qi]').forEach((h) => h.onclick = () => editQuestion(found[+h.dataset.qi]));
    $('#qnew').onclick = () => editQuestion(null);
    $('#tpl').onclick = () => download('방카BM_문제양식.csv', new Blob(['﻿' + SHEET_HEAD.join(',') + '\n' +
      'bp-0001,방카 상품,4지선다,2,"○○연금보험의 연금 개시 가능 나이는?",45세,50세,55세,60세,1,"상품설명서 개시 연령 확인","상품설명서 기준 45세부터 개시 가능.","○○연금보험 상품설명서 2026.10",2026-10-01,,연금개시,사용\n' +
      'bb-0001,백오피스,OX,1,"계약자 변경 시 신·구 계약자 모두의 서명이 필요하다.",,,,,O,"변경 서류 서명란","사내 계약변경 매뉴얼 참고.","백오피스 매뉴얼",2026-10-01,,계약변경,사용\n'], { type: 'text/csv' }));
    $('#qin').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const buf = await f.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buf);
      if (text.includes('�')) { try { text = new TextDecoder('euc-kr').decode(buf); } catch (er) { } }
      let res;
      try {
        res = /\.json$/i.test(f.name) ? { out: JSON.parse(text).filter((q) => q.q && CATS[q.cat]), errs: [] } : rowsToQuestions(parseCSV(text.replace(/^﻿/, '')));
      } catch (er) { return toast('파일을 읽지 못했어요: ' + er.message); }
      if (!res.out.length) return modal(`<h2>불러오기 실패</h2><div class="muted" style="white-space:pre-wrap">${esc(res.errs.join('\n') || '문제가 없어요')}</div><button class="btn full" data-close>확인</button>`);
      if (!(await confirmBox(`${res.out.length}문제를 시트에 등록할까요?${res.errs.length ? `\n(오류 ${res.errs.length}행은 건너뜀)` : ''}`, '등록'))) return;
      body.innerHTML = `<div class="loading"><div class="spin"></div><span id="prog">등록 중…</span></div>`;
      try {
        for (let i = 0; i < res.out.length; i += 150) {
          await Api.admin.importQuestions(res.out.slice(i, i + 150));
          const p = $('#prog'); if (p) p.textContent = `등록 중… ${Math.min(i + 150, res.out.length)}/${res.out.length}`;
        }
        admQ = null; await Api.questions(true);
        modal(`<h2>등록 완료</h2><p style="text-align:center">✅ ${res.out.length}문제</p>${res.errs.length ? `<div class="muted" style="white-space:pre-wrap;max-height:200px;overflow:auto">${esc(res.errs.join('\n'))}</div>` : ''}<button class="btn full" data-close>확인</button>`, pageAdmin);
      } catch (er) { toast(er.message); pageAdmin(); }
    };
  }
  async function admLib(body) {
    const items = await Api.admin.library();
    body.innerHTML = `<p class="muted">여기 등록한 자료는 모든 직원의 '개인 학습 · 자료실'에 보여요. (상품 요약, 백오피스 처리 절차 등)</p>
      <button class="btn full" id="lnew">➕ 공용 자료 추가</button>
      ${items.map((d, i) => `<div class="item"><div class="h" data-li="${i}"><span class="tg" style="background:${(CATS[d.cat] || {}).color || '#999'}">${esc((CATS[d.cat] || {}).label || d.cat)}</span><span class="q">${esc(d.title)}${d.status === '중지' ? ' (중지)' : ''}</span></div></div>`).join('')}`;
    const edit = (d) => {
      d = d || { cat: 'banca_product', title: '', body: '', link: '', status: '사용' };
      const m = modal(`<h2 style="font-size:21px">공용 자료</h2>
        <select id="lc">${CAT_ORDER.map((k) => `<option value="${k}" ${d.cat === k ? 'selected' : ''}>${CATS[k].label}</option>`).join('')}</select>
        <input type="text" id="lt" placeholder="제목" value="${esc(d.title)}" style="margin-top:8px"><textarea id="lb" style="margin-top:8px;min-height:160px" placeholder="본문">${esc(d.body)}</textarea>
        <input type="text" id="ll" placeholder="링크 (선택: 사내 문서·드라이브 주소)" value="${esc(d.link || '')}" style="margin-top:8px">
        <select id="ls" style="margin-top:8px"><option ${d.status !== '중지' ? 'selected' : ''}>사용</option><option ${d.status === '중지' ? 'selected' : ''}>중지</option></select>
        <div class="row" style="margin-top:10px"><button class="btn ghost full" data-close>취소</button><button class="btn full" id="lsv">저장</button></div>`);
      $('#lsv').onclick = async () => {
        const it = { ...d, cat: $('#lc').value, title: $('#lt').value.trim(), body: $('#lb').value.trim(), link: $('#ll').value.trim(), status: $('#ls').value };
        if (!it.title) return toast('제목을 입력해 주세요');
        try { await Api.admin.saveLibrary(it); sharedLib = null; m.close(); toast('저장했어요'); pageAdmin(); } catch (e) { toast(e.message); }
      };
    };
    $('#lnew').onclick = () => edit(null);
    body.querySelectorAll('[data-li]').forEach((h) => h.onclick = () => edit(items[+h.dataset.li]));
  }

  /* ---- CSV ---- */
  const SHEET_HEAD = ['ID', '분류', '유형', '난이도', '질문', '보기1', '보기2', '보기3', '보기4', '정답', '힌트', '해설', '출처', '기준일', '만료일', '태그', '상태'];
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  function rowsToQuestions(rows) {
    const out = [], errs = [];
    const head = rows[0].map((h) => h.trim().replace(/^﻿/, ''));
    const col = (name) => head.indexOf(name);
    if (col('질문') < 0 || col('분류') < 0 || col('정답') < 0) return { out, errs: ['첫 줄에 열 이름(분류, 질문, 정답 등)이 있어야 해요. "양식 받기"를 참고하세요.'] };
    const rev = CAT_KO_REV();
    rows.slice(1).forEach((r, i) => {
      const g = (n) => (col(n) >= 0 ? (r[col(n)] || '').trim() : '');
      const ln = i + 2, catR = g('분류'), cat = CATS[catR] ? catR : rev[catR];
      if (!cat) return errs.push(`${ln}행: 분류 "${catR}" 인식 불가`);
      if (!g('질문')) return errs.push(`${ln}행: 질문 없음`);
      const type = /ox/i.test(g('유형')) ? 'ox' : 'mc', ans = g('정답');
      const item = { id: g('ID') || `q${Date.now().toString(36)}${i}`, cat, type, diff: Math.min(3, Math.max(1, parseInt(g('난이도')) || 2)), q: g('질문'),
        hint: g('힌트'), exp: g('해설'), src: g('출처') || '사내 자료', asOf: g('기준일'), expires: g('만료일'),
        tags: g('태그').split(',').map((t) => t.trim()).filter(Boolean), status: g('상태') || '사용' };
      if (type === 'ox') {
        if (!/^[ox○×]$/i.test(ans)) return errs.push(`${ln}행: OX 정답은 O 또는 X`);
        item.answer = /^[o○]$/i.test(ans);
      } else {
        item.choices = ['보기1', '보기2', '보기3', '보기4'].map(g);
        const a = parseInt(ans) - 1;
        if (item.choices.some((c) => !c) || !(a >= 0 && a <= 3)) return errs.push(`${ln}행: 보기 4개와 정답(1~4)이 필요`);
        item.answer = a;
      }
      out.push(item);
    });
    return { out, errs };
  }
  function download(name, blob) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- 로그인 / 타이틀 / 캐릭터 생성 / 프롤로그 ---------------- */
  function loginScreen(msg) {
    curPage = 'login';
    els.hud.classList.add('hidden'); els.nav.classList.add('hidden'); stageMode('');
    els.bg.innerHTML = opBg(Api.opening()); els.place.innerHTML = ''; setChar(null);
    els.screen.innerHTML = `<div class="op-fade"></div><div class="login2" id="l2"><div class="logo2">${LOGO}</div>
      <form class="login" id="lf" autocomplete="on">
        <h3 class="cute">사원 로그인</h3>
        <input type="email" id="le" placeholder="등록된 이메일" autocomplete="username" required>
        <input type="password" id="lp" placeholder="비밀번호" autocomplete="current-password" required>
        <button class="btn full" id="lgo">로그인</button>
        <p class="muted">관리자가 등록한 이메일만 들어올 수 있어요. 계정이 없다면 관리자에게 요청하세요.</p>
        ${Api.demo ? `<p class="muted demo">🧪 로컬 데모 모드 — 관리자 계정: ${Demo.ADMIN} / ${Demo.ADMIN_PW}</p>` : ''}
      </form><button class="btn l2-open" id="l2go">로그인하기</button></div>`;
    $('#l2go').onclick = () => { Snd.tap(); $('#l2').classList.add('open'); setTimeout(() => { const e = $('#le'); if (e) e.focus(); }, 350); };
    if (msg) { toast(msg, 3500); $('#l2').classList.add('open'); }
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      $('#lgo').disabled = true; $('#lgo').textContent = '확인 중…';
      openingOverlay('로그인 중…');
      try {
        await Api.login($('#le').value, $('#lp').value);
        openingOverlay('출근 준비 중…'); // 처음 로그인이면 여기서 오프닝 그림이 도착
        await enterGame();
      } catch (er) { closeOpening(0); toast(er.message, 3200); const b = $('#lgo'); if (b) { b.disabled = false; b.textContent = '로그인'; } }
    };
  }
  async function enterGame() {
    const u = Api.user;
    els.hud.classList.add('hidden'); els.nav.classList.add('hidden');
    busy('출근 준비 중…');
    if (Api.opening() && !$('#opening')) openingOverlay('출근 준비 중…');
    // 실물 캐릭터(관리자가 비공개 폴더에 등록) — 이 기기에 받아 둔 그림을 먼저 쓰고, 바뀐 경우에만 다시 받는다
    const FK = 'bmq_face_' + u.email, FVK = Api.faceVerKey(u.email);
    try { const c = JSON.parse(localStorage.getItem(FK)); if (c) { regFace('face:me', c); hasFace = true; } else localStorage.removeItem(FVK); } catch (e) { }
    // 문제 · 진행 · 멘트 · 그림을 한 번의 요청으로
    let b = null, failed = false;
    try { b = await Api.boot(); } catch (e) { failed = true; }
    if (failed) { try { await Api.questions(); } catch (e) { toast(e.message, 3500); } } // 오프라인이면 저장해 둔 문제로
    loadTalk(b && b.talk);
    if (b && b.face) { regFace('face:me', b.face); hasFace = true; try { localStorage.setItem(FK, JSON.stringify(b.face)); localStorage.setItem(FVK, JSON.stringify(b.faceVer)); } catch (e) { } }
    else if (b && !b.faceVer && !Api.demo) { hasFace = false; try { localStorage.removeItem(FK); localStorage.removeItem(FVK); } catch (e) { } }
    const local = Store.load(u.email);
    let remote = null;
    if (b && b.data) { try { remote = Object.assign(Store.fresh(u.email), JSON.parse(b.data)); } catch (e) { failed = true; } }
    if (failed && !(local && local.name)) {
      closeOpening(0);
      // 서버 기록을 확인하지 못했는데 새로 만들면 기존 기록을 덮어쓸 수 있다 → 다시 시도만 허용
      els.screen.innerHTML = `<div class="title-wrap" style="text-align:center"><div class="box">⚠️ 서버에서 내 기록을 불러오지 못했어요.<br><span class="muted">인터넷 연결을 확인한 뒤 다시 시도해 주세요.</span></div>
        <button class="btn" id="retry">다시 시도</button><button class="btn ghost" id="out">다른 계정으로 로그인</button></div>`;
      $('#retry').onclick = () => enterGame();
      $('#out').onclick = () => { Api.logout(); S = null; loginScreen(); };
      return;
    }
    S = pickSave(local, remote) || Store.fresh(u.email);
    S.email = u.email;
    Store.save(S);
    if (S === remote) lastSynced = S.updated;
    if (S.name && remote && S !== remote) syncNow();
    closeOpening(); // 다음 화면이 준비됐으니 오프닝을 걷는다 (그림이 뜬 뒤 잠깐은 보여 줌)
    if (!S.name) return createScreen();
    if (!S.story) return prologue();
    titleScreen();
  }
  function titleScreen() {
    curPage = 'title';
    els.hud.classList.add('hidden'); els.nav.classList.add('hidden'); stageMode('');
    const op = Api.opening();
    if (op) { els.bg.innerHTML = opBg(op); els.place.innerHTML = ''; setChar(null); }
    else { setBg('title'); setChar(playerSpec(), rest(), 'enter'); }
    els.screen.innerHTML = `${op ? '<div class="op-fade"></div>' : ''}<div class="title-wrap ${op ? 'withop' : ''}"><div class="logo2">${LOGO}</div>
      <button class="btn" id="cont">출근하기 · Lv.${S.lv} ${esc(S.name)}</button>
      <button class="btn ghost" id="out">다른 계정으로 로그인</button></div>`;
    $('#cont').onclick = () => { Snd.tap(); eventRoll = true; goHome(); maybeInstallGuide(); };
    $('#out').onclick = async () => { await syncNow(); Api.logout(); S = null; loginScreen(); };
  }
  /* 신입사원 등록: 캐릭터 꾸미기 (입사 후에는 변경 불가) */
  function createScreen() {
    curPage = 'create';
    stageMode('creating'); setBg('office');
    els.hud.classList.add('hidden'); els.nav.classList.add('hidden');
    const render = () => {
      const presets = Sprites.presets(S.gender);
      if (!hasFace && !(S.illust && presets.includes(S.illust))) S.illust = presets[0] || null;
      setChar(playerSpec(), rest());
      const illustPart = `<label>일러스트 캐릭터</label><div class="illusts">${presets.map((id, i) => `<button data-il="${id}" class="${S.illust === id ? 'on' : ''}"><div><img src="${Sprites.char('illust:' + id, 'normal')}" alt=""></div>${i + 1}번</button>`).join('')}</div>
        <p class="muted">입사 후에는 캐릭터를 바꿀 수 없으니 신중하게 골라 주세요!</p>`;
      els.screen.innerHTML = `<div class="create"><h3 class="cute" style="margin:0 0 4px;font-size:22px">신입사원 등록</h3>
        <div class="muted">○○생명 방카슈랑스사업부에 오신 걸 환영합니다!</div>
        <label>이름</label><input type="text" id="nm" maxlength="8" placeholder="이름 (최대 8자)" value="${esc(S.name)}">
        <label>성별</label><div class="seg">${[['f', '여성'], ['m', '남성']].map(([v, l]) => `<button data-g="${v}" class="${S.gender === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${hasFace ? `<div class="box facebox">🎉 <b>${esc((Api.user || {}).name || S.name || '')}님만의 캐릭터</b>가 준비되어 있어요!<div class="muted">관리자가 만들어 둔 전용 캐릭터라 외모는 바꿀 수 없어요.</div></div>`
          : illustPart}
        ${hasFace ? '' : '<p class="muted" style="margin-top:12px">⚠️ 입사 후에는 외모를 바꿀 수 없어요.</p>'}
        <div class="row" style="margin-top:16px"><button class="btn full" id="go">첫 출근하기 →</button></div></div>`;
      const nm = $('#nm'); if (nm) nm.oninput = (e) => S.name = e.target.value;
      const on = (sel, fn) => els.screen.querySelectorAll(sel).forEach((b) => b.onclick = () => { fn(b); render(); });
      on('[data-g]', (b) => { S.gender = b.dataset.g; S.illust = hasFace ? null : Sprites.presets(S.gender)[0] || null; });
      on('[data-il]', (b) => S.illust = b.dataset.il);
      if (!S.name && hasFace && (Api.user || {}).name) { S.name = String(Api.user.name).slice(0, 8); const n = $('#nm'); if (n) n.value = S.name; }
      $('#go').onclick = () => {
        S.name = (S.name || '').trim();
        if (!S.name) return toast('이름을 입력해 주세요');
        save(); prologue();
      };
    };
    render();
  }
  async function prologue() {
    els.screen.innerHTML = ''; els.vn.classList.add('on'); renderHud(); stageMode('');
    setBg('office'); setChar(null);
    await say(NARR, '○○생명 본사 12층, 방카슈랑스사업부.\n오늘은 당신의 첫 출근 날이다.');
    setChar(playerSpec(), 'worried', 'enter');
    await say({ name: S.name, role: '인턴' }, '(긴장된다… 방카BM이 정확히 뭘 하는 거지?)');
    setChar(NPCS.partjang.spec, 'normal', 'enter');
    const pj = whoOf('partjang');
    await say(pj, `네가 이번에 온 인턴 ${S.name}${jong(S.name) ? '이' : ''}구나. 방카사업부 파트장 정이다.`);
    await say(pj, '방카BM은 은행을 상대로 우리 회사 보험을 파는 사람이야. 은행 직원 교육하고, 고객 상담 지원하고, 지점장을 설득하지.');
    setChar(NPCS.partjang.spec, 'smirk');
    await say(pj, '이 바닥은 실력이 곧 직급이다. 규정, 상품, 서류, 시황, 경제… 하나라도 모르면 은행이 우리 상품을 안 판다.');
    setChar(NPCS.kimpro.spec, 'smile', 'enter');
    await say(whoOf('kimpro'), '상품은 제가 맡을게요. 김프로입니다. 우리 회사 상품, 탈탈 털어드리죠.');
    setChar(NPCS.hwangpro.spec, 'happy', 'enter');
    await say(whoOf('hwangpro'), '방카OP센터 황프로예요~ 계약 서류랑 사후관리는 저희 센터 담당이에요. 서류 하나 잘못되면 계약이 날아가니까 꼼꼼하게 알려드릴게요!');
    setChar(NPCS.partjang.spec, 'smile', 'enter');
    await say(pj, '매일 사업부 사람들, 은행 고객들, 연수원 교수님들이 널 시험할 거다. 가끔은 은행 높으신 분들도 찾아오지.');
    await say(pj, '이건 입사 선물이다. 힌트 쪽지랑 병음료 좀 챙겨 넣었다. 문제 맞히면 활동비도 나오니 매점에서 알아서 사 쓰고.');
    await say(pj, '인턴에서 시작해서… 언젠가 사장실까지 올라가 봐라. 기대하마.');
    setChar(playerSpec(), 'happy', 'enter');
    await say({ name: S.name, role: '인턴' }, '네! 열심히 하겠습니다!');
    S.story = true; save(); syncNow();
    els.vn.classList.remove('on');
    await menuTour();
    if (!maybeInstallGuide()) setTimeout(() => toast('💡 카드 하나를 눌러 오늘의 첫 일정을 시작하세요!', 3500), 600);
  }

  /* 첫 출근 직후 메뉴 안내: 오늘 일정(정 파트장) · 학습회(김프로) · 매점(황프로) */
  async function menuTour() {
    const STEPS = [
      ['home', 'partjang', 'smirk', [
        "여기가 '오늘 일정'이다. 출근하면 제일 먼저 여기부터 확인해.",
        '카드 하나가 일정 하나다. 분야마다 하루에 한 번씩 문제를 풀 수 있고, 맞히면 경험치와 활동비가 쌓여서 승진하지.',
        "가끔 '오늘의 보스'로 은행 높으신 분들이 찾아오고, 아래쪽에서 최우수BM 순위도 볼 수 있다. 긴장 늦추지 마라."]],
      ['study', 'kimpro', 'smile', [
        "'학습회'는 제가 안내할게요! 점수 부담 없이 연습문제를 풀면서 실력을 쌓는 곳이에요.",
        "틀린 문제는 '오답노트'에 모이고, 오늘의 경제 기사랑 자료실도 여기 있어요. 경험치는 아주 조금이지만, 꾸준함이 최고의 무기죠!"]],
      ['shop', 'hwangpro', 'happy', [
        "'매점'은 저희 OP센터가 안내해 드릴게요~ 문제 맞히고 받은 활동비로 아이템을 살 수 있어요.",
        '힌트 쪽지는 어려운 문제에, 병음료랑 홍삼 스틱은 오늘 끝낸 일정을 한 번 더 도전할 때 써요. 아껴 쓰세요!']]
    ];
    const npcBox = document.createElement('div');
    npcBox.className = 'tour-npc';
    els.vn.insertBefore(npcBox, els.vn.firstChild);
    els.vn.classList.add('on', 'tour'); els.nav.classList.add('touring');
    const show = (page, npc, expr) => {
      go(page);
      if (page !== 'home') els.place.innerHTML = ''; // 메뉴 화면 위에 날짜·장소 글씨가 겹치지 않게
      els.nav.classList.remove('hidden');
      els.nav.querySelectorAll('button').forEach((b) => b.classList.toggle('tour-hi', b.dataset.go === page));
      npcBox.innerHTML = charHTML(NPCS[npc].spec, expr, { bust: true });
      npcBox.className = 'tour-npc'; void npcBox.offsetWidth; npcBox.className = 'tour-npc pop';
    };
    try {
      for (const [page, npc, expr, lines] of STEPS) {
        show(page, npc, expr);
        for (const line of lines) await say(whoOf(npc), line);
      }
      show('home', 'partjang', 'smile');
      await say(whoOf('partjang'), '자, 설명은 여기까지. 이제 첫 일정부터 시작해 봐라!');
    } finally {
      npcBox.remove();
      els.vn.classList.remove('on', 'tour'); els.nav.classList.remove('touring');
      els.nav.querySelectorAll('.tour-hi').forEach((b) => b.classList.remove('tour-hi'));
      S.toured = true; save();
      goHome();
    }
  }

  /* ---------------- 뒤로가기 (휴대폰 뒤로 버튼 · 브라우저 뒤로) ----------------
     창 → 미니게임·사무실 → 퀴즈(그만할지 묻기) → 하위 메뉴 → 오늘 일정 → '퇴근하시겠습니까?' 순서로 한 단계씩 */
  const PARENT = { study: 'home', shop: 'home', char: 'home', settings: 'home', rank: 'home', drive: 'home',
    wrong: 'study', lib: 'study', news: 'study', submit: 'study', admin: 'settings' };
  let exiting = false;
  async function handleBack() {
    if (els.modal.classList.contains('on')) {
      const no = els.modal.querySelector('[data-n], [data-close], #igLater');
      if (no) no.click(); else if (modalClose) modalClose();
      return;
    }
    for (const id of ['bgView', 'garageView', 'officeView', 'mini']) {
      const ov = document.getElementById(id);
      if (ov) { const x = ov.querySelector('[data-x], .mini-x'); if (x) x.click(); else ov.remove(); return; }
    }
    const quit = $('#quit');
    if (inSession) { if (quit && !els.sess.classList.contains('hidden')) quit.click(); return; } // 대화·안내 중에는 무시
    if (PARENT[curPage]) return go(PARENT[curPage]);
    // 오늘 일정(메인) · 시작 화면 · 로그인 화면 → 퇴근 확인
    if (await confirmBox('오늘 업무를 마치고 퇴근할까요?\n(기록은 자동으로 저장돼요)', '퇴근하기', '계속 근무')) leaveWork();
  }
  async function leaveWork() {
    exiting = true;
    await syncNow();
    history.back(); // 앱으로 실행 중이면 여기서 닫힌다
    setTimeout(() => { // 닫히지 않는 환경(일반 브라우저 첫 화면 등)
      try { window.close(); } catch (e) { }
      if (document.visibilityState === 'hidden') return;
      exiting = false; history.pushState({ bmq: 1 }, '');
      els.hud.classList.add('hidden'); els.nav.classList.add('hidden'); els.sess.classList.add('hidden'); stageMode(''); setChar(null);
      els.screen.innerHTML = `<div class="title-wrap" style="text-align:center"><div class="box">🌙 <b>수고하셨어요! 퇴근 완료</b><br><span class="muted">기록은 저장됐어요. 이제 앱(창)을 닫으셔도 돼요.</span></div>
        <button class="btn" id="rework">다시 출근하기</button></div>`;
      $('#rework').onclick = () => location.reload();
    }, 450);
  }
  function setupBack() {
    try { history.replaceState({ bmq: 0 }, ''); history.pushState({ bmq: 1 }, ''); } catch (e) { return; }
    addEventListener('popstate', () => {
      if (exiting) return;
      history.pushState({ bmq: 1 }, ''); // 다시 막아 두고
      handleBack();
    });
  }

  /* ---------------- 시작 ---------------- */
  async function boot() {
    setupBack();
    const allKeys = []; // 등장인물 그림은 img/chars/index.json 목록으로 불러옴
    const allBgs = [...new Set([...Object.values(NPCS).map((n) => n.bg).filter(Boolean), ...RANKS.map((r) => r.bg), 'title'])];
    await Sprites.init(allKeys, allBgs).catch(() => { });
    if (!Api.loggedIn()) return loginScreen();
    try { await Api.me(); }
    catch (e) {
      if (!Api.loggedIn() || /중지|만료/.test(e.message)) { Api.logout(); return loginScreen(e.message); }
      if (!Api.user) return loginScreen(e.message);
      toast('오프라인: 저장된 기록으로 시작해요');
    }
    await enterGame();
  }
  boot();
  window.__bmq = { get S() { return S; }, runSession, goHome, go };
})();
