/* =========================================================
   Sprites — 일러스트 이미지 자동 연결
   · 등장인물:             img/chars/{키}_{표정}.webp  (목록: img/chars/index.json)
   · 일러스트 주인공 선택: img/player/{m1 | f1 …}_{표정}.webp  (목록: img/player/index.json)
   · 배경:                 img/bg/{배경}.jpg|png
   파일이 없으면 SVG(코드 그림)로 대체한다.
   ========================================================= */
const Sprites = (() => {
  const EXPRS = ['normal', 'smile', 'angry', 'worried'];
  const MAP = { happy: 'smile', smirk: 'smile', shout: 'angry', sad: 'worried', surprised: 'worried' };
  const have = {}, base = {}, ext = {}, data = {}, bgs = {}, presets = { m: [], f: [] }, illust = {};
  const probe = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });

  async function register(key, path) {
    if (!(await probe(`${path}_normal.png`))) return false;
    have[key] = new Set(['normal']); base[key] = path;
    await Promise.all(EXPRS.slice(1).map(async (e) => { if (await probe(`${path}_${e}.png`)) have[key].add(e); }));
    return true;
  }
  async function init(keys, bgNames) {
    await Promise.all([
      // 등장인물: 목록 파일만 읽고, 그림은 화면에 나올 때 내려받는다 (시작할 때 하나하나 확인하지 않음)
      fetch('img/chars/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((man) => {
        if (!man) return;
        Object.entries(man).forEach(([k, exprs]) => { have[k] = new Set(exprs); base[k] = `img/chars/${k}`; ext[k] = '.webp'; illust[k] = 1; });
      }).catch(() => { }),
      // 일러스트 주인공: 목록 파일(img/player/index.json)만 읽고, 그림은 화면에 나올 때 내려받는다
      fetch('img/player/index.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((man) => {
        if (!man) return;
        ['m', 'f'].forEach((g) => (man[g] || []).forEach((c) => {
          const key = 'illust:' + c.id;
          have[key] = new Set(c.exprs); base[key] = `img/player/${c.id}`; ext[key] = '.webp';
          presets[g].push(c.id);
        }));
      }).catch(() => { }),
      ...bgNames.map(async (b) => {
        if (await probe(`img/bg/${b}.jpg`)) bgs[b] = `img/bg/${b}.jpg`;
        else if (await probe(`img/bg/${b}.png`)) bgs[b] = `img/bg/${b}.png`;
      })
    ]);
    ['m', 'f'].forEach((g) => presets[g].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))));
  }
  function char(key, expr) {
    const s = have[key]; if (!s) return null;
    const e = s.has(expr) ? expr : s.has(MAP[expr]) ? MAP[expr] : 'normal';
    if (data[key]) return data[key][e];
    return `${base[key]}_${e}${ext[key] || '.png'}`;
  }
  return {
    // 실물 캐릭터: 서버에서 받은 그림(data URL)을 등록
    registerData: (key, map) => { data[key] = map; have[key] = new Set(Object.keys(map)); },
    init, char, bg: (n) => bgs[n] || null, has: (k) => !!have[k],
    isIllust: (k) => !!illust[k] || /^(illust|face):/.test(k), // 일러스트 시트에서 자른 그림 (반신 · 같은 비율)
    presets: (g) => presets[g] || [],
    count: () => Object.keys(have).length + Object.keys(bgs).length
  };
})();
