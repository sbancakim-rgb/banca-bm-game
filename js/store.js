/* =========================================================
   저장소 — 진행 상황(이 기기 캐시 + 서버 동기화),
   자료실 개인 업로드 파일(IndexedDB, 이 기기에만)
   ========================================================= */
const Store = (() => {
  const KEY = (email) => 'bmq_save_v2_' + (email || 'guest'), DB = 'bmq_lib';

  const fresh = (email) => ({
    v: 2, created: Date.now(), updated: 0, email: email || '', name: '',
    gender: 'f', hairStyle: 'f_layer', hairColor: '#5b3a2e', skin: '#ffe3d1', face: 'f1', age: 20, glasses: '', glassesColor: '#2a2a33', illust: null,
    lv: 1, xp: 0, totalXp: 0, honor: 0, money: 0, moneyTotal: 0,
    items: Object.assign({}, typeof STARTER_ITEMS !== 'undefined' ? STARTER_ITEMS : {}),
    groupXp: { banca: 0, market: 0, econ: 0, term: 0 },
    stats: {}, cnt: {}, ach: {}, bossSeen: {},
    daily: { date: '', done: {} }, dailyBoss: { date: '', tier: '', done: null, tries: 0 }, extra: { date: '', ready: {} },
    study: { date: '', xp: 0, articles: [], notes: [] },
    streak: { last: '', count: 0 }, seen: {}, wrong: {}, bestCombo: 0,
    sound: true, story: false, classShown: false, lastClass: null
  });

  function load(email) {
    try {
      const s = JSON.parse(localStorage.getItem(KEY(email)));
      if (s && s.v === 2) return Object.assign(fresh(email), s);
    } catch (e) { /* 손상/차단 시 새로 시작 */ }
    return null;
  }
  function save(s) { try { localStorage.setItem(KEY(s.email), JSON.stringify(s)); } catch (e) { } }
  function wipe(email) { try { localStorage.removeItem(KEY(email)); } catch (e) { } }

  /* ---- IndexedDB: 개인 자료 ---- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('files', mode), st = t.objectStore('files');
      const r = fn(st);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  }
  const files = {
    all: () => tx('readonly', (s) => s.getAll()).catch(() => []),
    put: (f) => tx('readwrite', (s) => s.put(f)),
    del: (id) => tx('readwrite', (s) => s.delete(id))
  };

  return { fresh, load, save, wipe, files };
})();
