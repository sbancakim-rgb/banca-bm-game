/* =========================================================
   Sprites — 일러스트 이미지 자동 연결
   img/chars/{키}_{표정}.png , img/bg/{배경}.jpg|png 가 있으면 사용하고,
   없으면 SVG(임시 그림)로 대체한다.
   ========================================================= */
const Sprites = (() => {
  const EXPRS = ['normal', 'smile', 'angry', 'worried'];
  const MAP = { happy: 'smile', smirk: 'smile', shout: 'angry', sad: 'worried', surprised: 'worried' };
  const have = {}, bgs = {};
  const probe = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = src; });

  async function init(keys, bgNames) {
    await Promise.all([
      ...keys.map(async (k) => {
        if (!(await probe(`img/chars/${k}_normal.png`))) return;
        have[k] = new Set(['normal']);
        await Promise.all(EXPRS.slice(1).map(async (e) => { if (await probe(`img/chars/${k}_${e}.png`)) have[k].add(e); }));
      }),
      ...bgNames.map(async (b) => {
        if (await probe(`img/bg/${b}.jpg`)) bgs[b] = `img/bg/${b}.jpg`;
        else if (await probe(`img/bg/${b}.png`)) bgs[b] = `img/bg/${b}.png`;
      })
    ]);
  }
  function char(key, expr) {
    const s = have[key]; if (!s) return null;
    const e = s.has(expr) ? expr : s.has(MAP[expr]) ? MAP[expr] : 'normal';
    return `img/chars/${key}_${e}.png`;
  }
  return { init, char, bg: (n) => bgs[n] || null, has: (k) => !!have[k], count: () => Object.keys(have).length + Object.keys(bgs).length };
})();
