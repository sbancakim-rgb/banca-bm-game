/* =========================================================
   미니게임 — BM 드라이빙
   · maze : 출근길 미로 (위에서 본 지도, 날마다 같은 미로 → 시간 대결)
   · run  : 고속도로 질주 (1인칭, 3차선 장애물 피하기 → 버틴 시간 대결)
   Mini.play(kind, { seed, best, onResult(res) → {msg} }) → 나가면 resolve
   ========================================================= */
const Mini = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const DIRS = { up: [0, -1, 1], right: [1, 0, 2], down: [0, 1, 4], left: [-1, 0, 8] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const fmt = (ms) => (ms / 1000).toFixed(2) + '초';

  function rng(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const c of String(seed)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- 공통 화면 ---------- */
  function shell(title, pad) {
    const el = document.createElement('div');
    el.id = 'mini';
    el.innerHTML = `<div class="mini-top"><button class="mini-x" aria-label="나가기">✕</button><b>${title}</b><span class="mini-time">0.00초</span></div>
      <div class="mini-stage"><canvas></canvas><div class="mini-msg"></div></div>
      <div class="mini-pad ${pad}">${pad === 'four' ? '<button data-d="up">▲</button><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button>'
        : '<button data-d="left">◀ 왼쪽</button><button data-d="right">오른쪽 ▶</button>'}</div>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    const fit = (ratio) => {
      const st = el.querySelector('.mini-stage'), w = st.clientWidth, h = st.clientHeight;
      let cw = w, ch = w * ratio; if (ch > h) { ch = h; cw = h / ratio; }
      const d = Math.min(2, window.devicePixelRatio || 1);
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.width = Math.round(cw * d); cv.height = Math.round(ch * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      return { w: cw, h: ch };
    };
    const msg = (html) => { const m = el.querySelector('.mini-msg'); m.innerHTML = html; m.classList.toggle('on', !!html); return m; };
    return { el, cv, ctx, fit, msg, time: (t) => (el.querySelector('.mini-time').textContent = t) };
  }
  // 키보드 · 스와이프 · 버튼 → onDir('left' 등)
  function controls(sh, onDir) {
    const key = (e) => { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key]; if (m) { e.preventDefault(); onDir(m); } };
    addEventListener('keydown', key);
    sh.el.querySelectorAll('.mini-pad [data-d]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); onDir(b.dataset.d); }));
    let sx = 0, sy = 0, st = 0;
    sh.cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = 1; });
    sh.cv.addEventListener('pointerup', (e) => {
      if (!st) return; st = 0;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { sh.onTap && sh.onTap(e); return; }
      onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    return () => removeEventListener('keydown', key);
  }
  async function countdown(sh) {
    for (const n of ['3', '2', '1', '출발!']) { sh.msg(`<div class="mini-count">${n}</div>`); await new Promise((r) => setTimeout(r, n === '출발!' ? 450 : 650)); }
    sh.msg('');
  }

  /* ---------- 1. 출근길 미로 ---------- */
  function makeMaze(cols, rows, rand) {
    const g = Array.from({ length: rows }, () => Array(cols).fill(0)), seen = g.map((r) => r.map(() => false));
    const stack = [[0, 0]]; seen[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = Object.entries(DIRS).filter(([, [dx, dy]]) => g[y + dy] && g[y + dy][x + dx] !== undefined && !seen[y + dy][x + dx]);
      if (!nb.length) { stack.pop(); continue; }
      const [d, [dx, dy, bit]] = nb[Math.floor(rand() * nb.length)];
      g[y][x] |= bit; g[y + dy][x + dx] |= DIRS[OPP[d]][2]; seen[y + dy][x + dx] = true; stack.push([x + dx, y + dy]);
    }
    // 길을 몇 군데 더 뚫어 막다른 길만 있는 미로가 되지 않게 (여러 경로)
    for (let i = 0; i < Math.floor(cols * rows * 0.08); i++) {
      const x = Math.floor(rand() * (cols - 1)), y = Math.floor(rand() * rows);
      g[y][x] |= 2; g[y][x + 1] |= 8;
    }
    return g;
  }
  function maze(opts) {
    return new Promise((done) => {
      const COLS = 9, ROWS = 13, LIMIT = 60000, SPEED = 4.2; // 칸/초
      const g = makeMaze(COLS, ROWS, rng(opts.seed || Date.now()));
      const sh = shell('🗺️ 출근길 미로', 'four');
      let size = sh.fit(ROWS / COLS), cs = size.w / COLS;
      const onResize = () => { size = sh.fit(ROWS / COLS); cs = size.w / COLS; };
      addEventListener('resize', onResize);
      let car, want, t0, raf, running = false, last = 0;
      const open = (x, y, d) => !!(g[y] && g[y][x] & DIRS[d][2]);
      const reset = () => { car = { x: 0, y: 0, tx: 0, ty: 0, t: 1, dir: null, ang: Math.PI / 2 }; want = null; };
      const offDir = controls(sh, (d) => {
        if (!running) return;
        want = d;
        if (car.dir && d === OPP[car.dir] && car.t < 1) { [car.x, car.tx, car.y, car.ty] = [car.tx, car.x, car.ty, car.y]; car.t = 1 - car.t; car.dir = d; }
      });
      function step(dt) {
        car.t += dt * SPEED;
        if (car.t >= 1) {
          car.x = car.tx; car.y = car.ty; car.t = 1;
          if (car.x === COLS - 1 && car.y === ROWS - 1) return true;
          const nd = want && open(car.x, car.y, want) ? want : car.dir && open(car.x, car.y, car.dir) ? car.dir : null;
          car.dir = nd;
          if (nd) { car.tx = car.x + DIRS[nd][0]; car.ty = car.y + DIRS[nd][1]; car.t = 0; }
        }
        return false;
      }
      function draw() {
        const c = sh.ctx, w = size.w, h = size.h;
        c.fillStyle = '#7cc47f'; c.fillRect(0, 0, w, h);
        // 나무 · 건물 느낌의 점
        c.fillStyle = '#5aa35e';
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if ((x * 7 + y * 3) % 5 === 0) { c.beginPath(); c.arc(x * cs + cs * 0.15, y * cs + cs * 0.15, cs * 0.1, 0, 7); c.fill(); } }
        const pad = cs * 0.16, rw = cs - pad * 2;
        c.fillStyle = '#5b6170';
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const px = x * cs + pad, py = y * cs + pad;
          c.fillRect(px, py, rw, rw);
          if (g[y][x] & 2) c.fillRect(px + rw - 1, py, pad * 2 + 2, rw);
          if (g[y][x] & 4) c.fillRect(px, py + rw - 1, rw, pad * 2 + 2);
        }
        // 차선 점선
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, cs * 0.04); c.setLineDash([cs * 0.12, cs * 0.12]);
        c.beginPath();
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const cx = x * cs + cs / 2, cy = y * cs + cs / 2;
          if (g[y][x] & 2) { c.moveTo(cx, cy); c.lineTo(cx + cs, cy); }
          if (g[y][x] & 4) { c.moveTo(cx, cy); c.lineTo(cx, cy + cs); }
        }
        c.stroke(); c.setLineDash([]);
        c.font = `${cs * 0.62}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('🏢', cs / 2, cs / 2); c.fillText('🏦', (COLS - 0.5) * cs, (ROWS - 0.5) * cs);
        // 자동차
        const fx = car.x + (car.tx - car.x) * car.t, fy = car.y + (car.ty - car.y) * car.t;
        if (car.dir) { const ta = Math.atan2(DIRS[car.dir][1], DIRS[car.dir][0]) + Math.PI / 2; let da = ta - car.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; car.ang += da * 0.35; }
        c.save(); c.translate((fx + 0.5) * cs, (fy + 0.5) * cs); c.rotate(car.ang);
        const bw = cs * 0.42, bh = cs * 0.64;
        c.fillStyle = '#ff6f91'; c.beginPath(); c.roundRect(-bw / 2, -bh / 2, bw, bh, bw * 0.3); c.fill();
        c.fillStyle = '#cfe8ff'; c.fillRect(-bw * 0.35, -bh * 0.3, bw * 0.7, bh * 0.2); c.fillRect(-bw * 0.35, bh * 0.15, bw * 0.7, bh * 0.14);
        c.fillStyle = '#fff59a'; c.fillRect(-bw * 0.4, -bh / 2, bw * 0.18, bh * 0.06); c.fillRect(bw * 0.22, -bh / 2, bw * 0.18, bh * 0.06);
        c.restore();
      }
      function loop(ts) {
        const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
        const el = performance.now() - t0, left = LIMIT - el;
        sh.time(`⏱ ${(Math.max(0, left) / 1000).toFixed(1)}초 남음`);
        const arrived = step(dt);
        draw();
        if (arrived) return finish({ ok: true, ms: Math.round(el) });
        if (left <= 0) return finish({ ok: false, ms: LIMIT });
        raf = requestAnimationFrame(loop);
      }
      function finish(res) {
        running = false; cancelAnimationFrame(raf);
        const out = (opts.onResult && opts.onResult(res)) || {};
        sh.msg(`<div class="mini-end"><h3>${res.ok ? '🏦 도착!' : '⏰ 시간 초과'}</h3>
          <p>${res.ok ? `기록 <b>${fmt(res.ms)}</b>` : '지점 미팅에 늦었어요…'}</p>${out.msg ? `<p class="muted">${out.msg}</p>` : ''}
          <div class="row"><button class="btn ghost full" data-q>나가기</button><button class="btn full" data-r>다시 하기</button></div></div>`);
        sh.el.querySelector('[data-r]').onclick = start;
        sh.el.querySelector('[data-q]').onclick = quit;
      }
      async function start() {
        reset(); draw(); await countdown(sh);
        t0 = performance.now(); last = 0; running = true; raf = requestAnimationFrame(loop);
      }
      function quit() { running = false; cancelAnimationFrame(raf); offDir(); removeEventListener('resize', onResize); sh.el.remove(); done(); }
      sh.el.querySelector('.mini-x').onclick = quit;
      reset(); draw();
      sh.msg(`<div class="mini-end"><h3>🗺️ 출근길 미로</h3><p>본사 🏢 에서 출발해 <b>60초 안에</b> △△은행 지점 🏦 까지!</p>
        <p class="muted">화살표 버튼 · 방향키 · 화면을 밀어서 방향을 바꿔요. 차는 벽에 닿을 때까지 계속 달려요.<br>오늘의 미로는 모두 같아요 — 시간 대결!</p>
        ${opts.best ? `<p>내 오늘 최고 <b>${fmt(opts.best)}</b></p>` : ''}<button class="btn full" data-s>시작!</button></div>`);
      sh.el.querySelector('[data-s]').onclick = start;
    });
  }

  /* ---------- 2. 고속도로 질주 (1인칭) ---------- */
  const OBS = {
    cone: { e: '🚧', s: 0.9 }, box: { e: '📦', s: 0.9 }, car: { e: '🚙', s: 1.25 }, tire: { e: '🛞', s: 0.8, fly: true }, rock: { e: '🪨', s: 0.9, fly: true }, bar: { e: '🚧', s: 0.9, wide: true }
  };
  function run(opts) {
    return new Promise((done) => {
      const sh = shell('🏎️ 고속도로 질주', 'two');
      let size = sh.fit(1.45);
      const onResize = () => { size = sh.fit(1.45); };
      addEventListener('resize', onResize);
      let lane, lx, obs, t, dist, spawnT, raf, running = false, last = 0, crashAt = 0;
      const offDir = controls(sh, (d) => { if (!running) return; if (d === 'left') lane = Math.max(-1, lane - 1); if (d === 'right') lane = Math.min(1, lane + 1); });
      sh.onTap = (e) => { if (!running) return; const r = sh.cv.getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) lane = Math.max(-1, lane - 1); else lane = Math.min(1, lane + 1); };
      const speed = () => Math.min(1.9, 0.5 + t * 0.016);           // 화면 깊이/초
      const gap = () => Math.max(0.42, 1.25 - t * 0.014);            // 장애물 간격(초)
      function spawn() {
        const pool = ['cone']; if (t > 10) pool.push('box', 'car'); if (t > 22) pool.push('tire'); if (t > 35) pool.push('rock', 'bar');
        const type = pool[Math.floor(Math.random() * pool.length)];
        const L = Math.floor(Math.random() * 3) - 1;
        if (type === 'bar') { // 두 차선을 막는 공사 구간: 한 차선은 반드시 비워 둔다
          const free = Math.floor(Math.random() * 3) - 1;
          [-1, 0, 1].filter((x) => x !== free).forEach((x) => obs.push({ type: 'bar', lane: x, z: 1, vx: 0, ph: 0 }));
        } else obs.push({ type, lane: L, z: 1, vx: OBS[type].fly ? (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.min(1.2, t * 0.02)) : 0, ph: Math.random() * 6 });
        if (t > 50 && Math.random() < 0.35) { const L2 = [-1, 0, 1].filter((x) => x !== L)[Math.floor(Math.random() * 2)]; obs.push({ type: 'cone', lane: L2, z: 1.08, vx: 0, ph: 0 }); }
      }
      const proj = (z) => { const D = 14, d = 1 + z * D; return 1 / d; };   // 원근 배율 (가까울수록 1)
      function draw() {
        const c = sh.ctx, w = size.w, h = size.h, hy = h * 0.36, by = h * 0.86, cx = w / 2;
        const sky = c.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#7fb6ff'); sky.addColorStop(1, '#ffd6e4'); c.fillStyle = sky; c.fillRect(0, 0, w, hy);
        c.fillStyle = '#9aa7c7'; for (let i = 0; i < 9; i++) { const bw = w * 0.09, bh = h * (0.06 + ((i * 37) % 7) * 0.012); c.fillRect(i * w * 0.115, hy - bh, bw, bh); }
        c.fillStyle = '#7cc47f'; c.fillRect(0, hy, w, h - hy);
        // 도로 (사다리꼴) — 1인칭: 내가 차선을 바꾸면 도로와 장애물이 반대로 움직인다
        const rw = (z) => w * 1.9 * proj(z) / proj(0) * 0.5, ry = (z) => hy + (by - hy) * (proj(z) - proj(1)) / (proj(0) - proj(1));
        const X = (L, z) => cx + (L - lx) * rw(z) * 2 / 3;  // L: 차선 좌표(-1·0·1), 경계는 ±0.5, 도로 끝 ±1.5
        const zb = -0.05;
        c.fillStyle = '#4c5260'; c.beginPath(); c.moveTo(X(-1.5, 1), ry(1)); c.lineTo(X(1.5, 1), ry(1)); c.lineTo(X(1.5, zb), ry(zb)); c.lineTo(X(-1.5, zb), ry(zb)); c.fill();
        c.fillStyle = '#e8e8ee';
        for (const L of [-1.5, 1.5]) { c.beginPath(); c.moveTo(X(L, 1), ry(1)); c.lineTo(X(L * 1.04, 1), ry(1)); c.lineTo(X(L * 1.04, zb), ry(zb)); c.lineTo(X(L, zb), ry(zb)); c.fill(); }
        // 움직이는 차선
        c.fillStyle = 'rgba(255,255,255,.85)';
        const ofs = (dist * 6) % 1;
        for (let k = 0; k < 14; k++) {
          const z1 = (k - ofs) / 12, z2 = z1 + 0.035; if (z1 < zb || z2 > 1) continue;
          for (const L of [-0.5, 0.5]) {
            const x1 = X(L, z1), x2 = X(L, z2);
            const y1 = ry(z1), y2 = ry(z2), w1 = Math.max(1, 6 * proj(z1) / proj(0)), w2 = Math.max(1, 6 * proj(z2) / proj(0));
            c.beginPath(); c.moveTo(x1 - w1, y1); c.lineTo(x1 + w1, y1); c.lineTo(x2 + w2, y2); c.lineTo(x2 - w2, y2); c.fill();
          }
        }
        // 장애물 (먼 것부터)
        c.textAlign = 'center'; c.textBaseline = 'bottom';
        [...obs].sort((a, b) => b.z - a.z).forEach((o) => {
          const sc = proj(o.z) / proj(0), y = ry(o.z), x = X(o.lane, o.z);
          const fy = OBS[o.type].fly ? Math.abs(Math.sin(o.ph * 3)) * h * 0.08 * sc : 0;
          c.font = `${Math.max(6, h * 0.16 * sc * OBS[o.type].s)}px sans-serif`;
          if (OBS[o.type].fly) { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y, h * 0.05 * sc, h * 0.012 * sc, 0, 0, 7); c.fill(); }
          c.fillText(OBS[o.type].e, x, y - fy);
        });
        // 1인칭: 보닛 + 계기판 (내 차는 차선 사이를 미끄러지듯 이동)
        const shift = 0;
        c.fillStyle = '#ff6f91'; c.beginPath(); c.moveTo(w * 0.12 + shift, h); c.quadraticCurveTo(cx + shift, h * 0.84, w * 0.88 + shift, h); c.fill();
        c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(w * 0.3 + shift, h); c.quadraticCurveTo(cx + shift, h * 0.88, w * 0.5 + shift, h); c.fill();
        c.fillStyle = 'rgba(20,20,35,.75)'; c.beginPath(); c.roundRect(w * 0.05, h * 0.03, w * 0.3, h * 0.07, 10); c.fill();
        c.fillStyle = '#fff'; c.font = `bold ${h * 0.035}px sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(`${Math.round(60 + speed() * 70)} km/h`, w * 0.08, h * 0.067);
        if (crashAt) { c.fillStyle = `rgba(255,60,60,${Math.max(0, 0.5 - (performance.now() - crashAt) / 1500)})`; c.fillRect(0, 0, w, h); }
      }
      function loop(ts) {
        const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
        t += dt; dist += dt * speed();
        lx += (lane - lx) * Math.min(1, dt * 12);
        spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = gap(); }
        for (const o of obs) {
          o.z -= dt * speed() * 0.55; o.ph += dt;
          if (o.vx) { o.lane += o.vx * dt; if (o.lane > 1) { o.lane = 1; o.vx *= -1; } if (o.lane < -1) { o.lane = -1; o.vx *= -1; } }
        }
        // 충돌: 내 차 바로 앞(가까운 깊이)에서 같은 차선
        const hit = obs.find((o) => o.z < 0.035 && o.z > -0.02 && Math.abs(o.lane - lx) < (OBS[o.type].wide ? 0.62 : 0.5));
        obs = obs.filter((o) => o.z > -0.05);
        sh.time(`⏱ ${t.toFixed(2)}초`);
        draw();
        if (hit) { crashAt = performance.now(); draw(); return finish(Math.round(t * 1000)); }
        raf = requestAnimationFrame(loop);
      }
      function finish(ms) {
        running = false; cancelAnimationFrame(raf);
        if (navigator.vibrate) navigator.vibrate(200);
        const out = (opts.onResult && opts.onResult({ ok: true, ms })) || {};
        sh.msg(`<div class="mini-end"><h3>💥 쾅!</h3><p>버틴 시간 <b>${fmt(ms)}</b></p>${out.msg ? `<p class="muted">${out.msg}</p>` : ''}
          <div class="row"><button class="btn ghost full" data-q>나가기</button><button class="btn full" data-r>다시 하기</button></div></div>`);
        sh.el.querySelector('[data-r]').onclick = start;
        sh.el.querySelector('[data-q]').onclick = quit;
      }
      const reset = () => { lane = 0; lx = 0; obs = []; t = 0; dist = 0; spawnT = 1.2; crashAt = 0; };
      async function start() { reset(); draw(); await countdown(sh); last = 0; running = true; raf = requestAnimationFrame(loop); }
      function quit() { running = false; cancelAnimationFrame(raf); offDir(); removeEventListener('resize', onResize); sh.el.remove(); done(); }
      sh.el.querySelector('.mini-x').onclick = quit;
      reset(); draw();
      sh.msg(`<div class="mini-end"><h3>🏎️ 고속도로 질주</h3><p>지점 미팅에 늦었다! 날아오는 장애물을 피해 <b>최대한 오래</b> 달리세요.</p>
        <p class="muted">왼쪽·오른쪽 버튼, 방향키, 화면 좌우 터치나 밀기로 차선을 바꿔요.<br>시간이 갈수록 빨라지고 장애물이 다양해져요!</p>
        ${opts.best ? `<p>내 최고 기록 <b>${fmt(opts.best)}</b></p>` : ''}<button class="btn full" data-s>시작!</button></div>`);
      sh.el.querySelector('[data-s]').onclick = start;
    });
  }

  return { play: (kind, opts = {}) => (kind === 'maze' ? maze(opts) : run(opts)), fmt };
})();
