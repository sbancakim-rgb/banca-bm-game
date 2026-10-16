/* =========================================================
   회사 주차장 — 모든 BM의 차(3D)를 가로로 길게 세워 두고 끌어서 둘러보기
   Parking.open(host, people, { onPick, onMove, onProgress, time })
     people: [{ rank(0~6), glb, html(차 위 이름표), name, me, sample, best, cr(차 꾸밈) }]
     — 넘겨준 순서대로 왼쪽부터 주차. 직급에 따라 VIP · 간부 · BM 구역으로 나뉜다
   3D 엔진(three.js)은 주차장을 처음 열 때만 불러온다.
   ========================================================= */
const Parking = (() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0';
  const LEN = [3.0, 4.0, 4.8, 4.8, 5.1, 5.3, 6.6]; // 직급별 차 길이(m) — 차마다 크기를 실제 비율로 맞춤
  const GAP = 3.6;      // 일반 주차칸 폭(m)
  const SLOT = { vip: 5.4, exec: 4.2, bm: GAP }; // 구역별 칸 폭 — VIP는 넓게
  const ZGAP = 3.0;     // 구역 사이 화단 폭(m)
  const VIEW_W = 5.8;   // 화면에 보이는 폭(m) — 세로 휴대폰에서 두 대 남짓
  const zoneOf = (rank) => (rank >= 5 ? 'vip' : rank >= 3 ? 'exec' : 'bm');
  const ZONES = {
    vip: { line: '#e2b84a', title: 'VIP', sub: '부사장 · 사장 전용', bg: '#2a1a08', fg: '#ffd66b', paint: 'VIP' },
    exec: { line: '#5b9bff', title: 'EXECUTIVE', sub: '지역단장 · 사업부장', bg: '#0f2448', fg: '#cfe2ff', paint: '간부' },
    bm: { line: '#f2f2ea', title: 'BM PARKING', sub: '인턴 · 신입 BM · 방카 BM', bg: '#1f2a44', fg: '#ffffff', paint: '' }
  };
  // 시간대 — 실제 시각에 맞춰 바뀜 (버튼으로 직접 고를 수도 있음)
  const TIMES = {
    morning: { name: '🌅 아침', top: '#8fc1ef', bot: '#ffdcbc', sky: '#fff1e0', gnd: '#6b6258', hemi: 0.6, sun: '#ffd9b0', sunI: 1.2, sunP: [-12, 7, 8], exp: 1.0, env: 0.9, lit: 0, wall: '#f1e7dc', win: '#a9bfd6' },
    day: { name: '☀️ 낮', top: '#6fb0ec', bot: '#d9ecfb', sky: '#ffffff', gnd: '#5a5f6a', hemi: 0.6, sun: '#fff4e0', sunI: 1.4, sunP: [-6, 12, 8], exp: 1.05, env: 1, lit: 0, wall: '#e4e7ee', win: '#9fb4cc' },
    sunset: { name: '🌇 노을', top: '#3f4f9a', bot: '#ff9a5c', sky: '#ffb27a', gnd: '#3a2a30', hemi: 0.55, sun: '#ff7a3a', sunI: 1.3, sunP: [12, 3, 6], exp: 0.95, env: 0.7, lit: 0.45, wall: '#e9b48e', win: '#8a6f8a' },
    night: { name: '🌙 밤', top: '#03061a', bot: '#141d3c', sky: '#3a4a88', gnd: '#05050a', hemi: 0.16, sun: '#8fa6ff', sunI: 0.18, sunP: [-6, 12, 8], exp: 0.92, env: 0.4, lit: 1, wall: '#2c3146', win: '#1a1f33' }
  };
  const autoTime = () => { const h = new Date().getHours(); return h >= 6 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'sunset' : 'night'; };
  let libP = null;
  const models = {};    // glb 주소 → 불러온 3D (다시 열 때 재사용)
  const lib = () => libP || (libP = Promise.all([
    import(`${CDN}/+esm`),
    import(`${CDN}/examples/jsm/loaders/GLTFLoader.js/+esm`),
    import(`${CDN}/examples/jsm/environments/RoomEnvironment.js/+esm`)
  ]).then(([T, G, R]) => ({ T, GLTFLoader: G.GLTFLoader, RoomEnvironment: R.RoomEnvironment }))
    .catch((e) => { libP = null; throw e; }));

  async function open(host, people, opts = {}) {
    const { T, GLTFLoader, RoomEnvironment } = await lib();
    const canvasTex = (w, h, draw, repeat) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
      if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      return t;
    };
    const radial = (stops) => canvasTex(128, 128, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      stops.forEach(([p, c]) => r.addColorStop(p, c)); g.fillStyle = r; g.fillRect(0, 0, w, h);
    });
    const basic = (o) => new T.MeshBasicMaterial(o), std = (o) => new T.MeshStandardMaterial(o);
    const glowMat = (map, opacity = 1) => basic({ map, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending });
    const flat = (w, h, mat, x, y, z) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; };
    const noPick = (o) => { o.raycast = () => { }; return o; };

    // ---- 자리 배치 (구역이 바뀌면 화단 하나만큼 띄움) ----
    const slots = [], zones = [];
    let x = 0, zPrev = null;
    people.forEach((p, i) => {
      const z = zoneOf(p.rank), w = SLOT[z];
      if (zPrev) x += SLOT[zPrev] / 2 + w / 2 + (z !== zPrev ? ZGAP : 0);
      if (z !== zPrev) zones.push({ z, from: x, to: x });
      zones[zones.length - 1].to = x;
      slots.push({ p, i, x, w, zone: z, top: p.sample ? 1.3 : 1.6, wrap: null, el: null, night: [], glow: null });
      zPrev = z;
    });
    const span = slots.length ? slots[slots.length - 1].x : 0;

    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.outputColorSpace = T.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const labels = document.createElement('div'); labels.className = 'pk-labels'; host.appendChild(labels);

    const scene = new T.Scene();
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; // 차 도장의 반사
    const hemi = new T.HemisphereLight('#ffffff', '#5a5f6a', 0.6); scene.add(hemi);
    const sun = new T.DirectionalLight('#fff4e0', 1.4); scene.add(sun);
    const skyCanvas = document.createElement('canvas'); skyCanvas.width = 4; skyCanvas.height = 256;
    const skyTex = new T.CanvasTexture(skyCanvas); skyTex.colorSpace = T.SRGBColorSpace; scene.background = skyTex;
    scene.fog = new T.Fog('#d9ecfb', 30, 75);

    // ---- 바닥 · 연석 · 건물 ----
    const x0 = -GAP * 3, x1 = span + GAP * 3, W = x1 - x0 + 80, cx = (x0 + x1) / 2;
    const asphalt = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5b606b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const v = 70 + Math.random() * 50; g.fillStyle = `rgba(${v},${v + 3},${v + 10},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }, [W / 4, 30 / 4]);
    scene.add(flat(W, 30, std({ map: asphalt, roughness: 0.95 }), cx, 0, 3));
    const curb = new T.Mesh(new T.BoxGeometry(W, 0.25, 0.6), std({ color: '#c9c9c2', roughness: 0.9 })); curb.position.set(cx, 0.125, -4.6); scene.add(curb);
    const wallMat = std({ roughness: 0.8 });
    const wall = new T.Mesh(new T.PlaneGeometry(W, 7), wallMat); wall.position.set(cx, 3.5, -5.2); scene.add(wall);
    const drawWall = (P) => { // 벽 색은 시간대마다, 불 켜진 창문은 스스로 빛남(emissive)
      if (wallMat.map) wallMat.map.dispose(); if (wallMat.emissiveMap) wallMat.emissiveMap.dispose();
      const isOn = (r, c) => P.lit && ((r * 7 + c * 3) % 5 < 3 * P.lit);
      wallMat.map = canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = P.wall; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          g.fillStyle = isOn(r, c) ? '#ffd98a' : P.win; g.fillRect(24 + c * 124, 22 + r * 78, 100, 52);
          if (!P.lit) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(24 + c * 124, 22 + r * 78, 30, 52); }
        }
      }, [W / 10, 1]);
      wallMat.emissiveMap = P.lit ? canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd98a';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (isOn(r, c)) g.fillRect(24 + c * 124, 22 + r * 78, 100, 52);
      }, [W / 10, 1]) : null;
      wallMat.emissive = new T.Color(P.lit ? '#ffffff' : '#000000'); wallMat.emissiveIntensity = P.lit ? 0.9 : 0;
      wallMat.needsUpdate = true;
    };

    // ---- VIP 캐노피: 유리 지붕 + 금색 프레임 + 조명 간판 + 다운라이트 + 금장 기둥 + 토피어리 화분 ----
    const goldM = std({ color: '#d9a93a', metalness: 0.95, roughness: 0.22 }), darkM = std({ color: '#17120d', metalness: 0.6, roughness: 0.35 });
    const vipNight = [];
    function vipCanopy(a, b) {
      const zw = b - a, mid = (a + b) / 2, rw = zw + 0.8, z0 = -4.5, z1 = -0.6, zc = (z0 + z1) / 2, dz = z1 - z0, y = 3.05;
      const glass = new T.Mesh(new T.BoxGeometry(rw, 0.04, dz), std({ color: '#2b3a4a', metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.55 }));
      glass.position.set(mid, y, zc); scene.add(glass);
      const bar = (w, h, d, x, yy, z, m = goldM) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, yy, z); scene.add(o); return o; };
      bar(rw + 0.1, 0.08, 0.08, mid, y + 0.02, z0); bar(0.08, 0.08, dz, mid - rw / 2, y + 0.02, zc); bar(0.08, 0.08, dz, mid + rw / 2, y + 0.02, zc);
      for (let k = 1; k < Math.round(rw / 1.2); k++) bar(0.04, 0.05, dz, mid - rw / 2 + k * rw / Math.round(rw / 1.2), y + 0.02, zc); // 유리 칸살
      // 앞쪽 조명 간판 (VIP LOUNGE)
      bar(rw + 0.14, 0.42, 0.16, mid, y - 0.06, z1, darkM);
      bar(rw + 0.16, 0.05, 0.18, mid, y + 0.16, z1); bar(rw + 0.16, 0.05, 0.18, mid, y - 0.28, z1);
      const fas = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#17120d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd66b'; g.font = 'bold 74px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♛  V I P   L O U N G E  ♛', w / 2, h / 2 + 4); });
      const fw = Math.min(rw - 0.2, 4.2), face = new T.Mesh(new T.PlaneGeometry(fw, fw / 8), basic({ map: fas })); face.position.set(mid, y - 0.06, z1 + 0.085); scene.add(face);
      // 다운라이트 (밤에 바닥으로 빛이 떨어짐)
      const dl = basic({ color: '#fff1c8' }), pool = glowMat(radial([[0, 'rgba(255,226,160,.6)'], [1, 'rgba(255,226,160,0)']]));
      for (let px = a + SLOT.vip / 2; px < b; px += SLOT.vip) [-3.4, -1.6].forEach((pz) => {
        const d = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.03, 16), dl); d.position.set(px, y - 0.03, pz); scene.add(d);
        const p = noPick(flat(2.6, 2.6, pool, px, 0.03, pz + 0.4)); scene.add(p); vipNight.push(p);
      });
      // 금장 기둥 (뒤쪽) + 토피어리 화분 (앞쪽 양 끝)
      const nPost = Math.max(2, Math.round(zw / (SLOT.vip * 1.5)) + 1);
      for (let k = 0; k < nPost; k++) {
        const px = mid - rw / 2 + 0.1 + (rw - 0.2) * k / (nPost - 1);
        const post = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, y, 16), darkM); post.position.set(px, y / 2, z0 + 0.05); scene.add(post);
        [0.08, y - 0.12, y * 0.5].forEach((ry) => { const ring = new T.Mesh(new T.TorusGeometry(0.1, 0.025, 8, 20), goldM); ring.rotation.x = Math.PI / 2; ring.position.set(px, ry, z0 + 0.05); scene.add(ring); });
      }
      [a + 0.05, b - 0.05].forEach((px) => { // 칸 바깥 모서리 맨 앞 — 차를 가리지 않게 작게
        const pot = new T.Mesh(new T.CylinderGeometry(0.24, 0.18, 0.42, 18), goldM); pot.position.set(px, 0.21, 3.5); scene.add(pot);
        const ball = new T.Mesh(new T.SphereGeometry(0.3, 18, 14), std({ color: '#2f7a3b', roughness: 0.85 })); ball.position.set(px, 0.7, 3.5); scene.add(ball);
        const ball2 = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), std({ color: '#358a43', roughness: 0.85 })); ball2.position.set(px, 1.12, 3.5); scene.add(ball2);
      });
    }

    // ---- 구역 꾸밈: 벽 간판 · VIP 지붕 · 구역 사이 화단 ----
    const lineMats = {}; Object.keys(ZONES).forEach((k) => lineMats[k] = basic({ color: ZONES[k].line }));
    zones.forEach((zn, zi) => {
      const Z = ZONES[zn.z], a = zn.from - SLOT[zn.z] / 2, b = zn.to + SLOT[zn.z] / 2, mid = (a + b) / 2, zw = b - a;
      const sign = canvasTex(1024, 220, (g, w, h) => {
        g.fillStyle = Z.bg; g.fillRect(0, 0, w, h); g.strokeStyle = Z.fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = Z.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 96px sans-serif'; g.fillText(Z.title, w / 2, 88); g.font = 'bold 50px sans-serif'; g.fillText(Z.sub, w / 2, 168);
      });
      const sw = Math.min(6.4, Math.max(3.2, zw - 0.4));
      const sg = new T.Mesh(new T.PlaneGeometry(sw, sw * 220 / 1024), basic({ map: sign })); sg.position.set(mid, 5.45, -5.15); scene.add(sg);
      if (zn.z === 'vip') vipCanopy(a, b);
      if (zi > 0) { // 구역 사이 화단
        const px = a - ZGAP / 2;
        const bed = new T.Mesh(new T.BoxGeometry(ZGAP - 0.9, 0.35, 6.4), std({ color: '#b9b4a8', roughness: 0.9 })); bed.position.set(px, 0.175, -0.4); scene.add(bed);
        scene.add(flat(ZGAP - 1.1, 6.2, std({ color: '#4d3a2a', roughness: 1 }), px, 0.36, -0.4));
        const leaf = std({ color: '#3f8f4a', roughness: 0.8 });
        for (let k = 0; k < 5; k++) { const bush = new T.Mesh(new T.SphereGeometry(0.55 + (k % 2) * 0.15, 14, 10), leaf); bush.position.set(px + (k % 2 ? 0.2 : -0.2), 0.6, -2.9 + k * 1.25); bush.scale.y = 0.8; scene.add(bush); }
      }
    });
    // 주차선 · 칸 바닥 (VIP 레드카펫, 구역 글씨, 이름 팻말)
    const carpetTex = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#8f1d2c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e2b84a'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); });
    const paintTex = {};
    // 금색 차단봉 + 붉은 벨벳 줄 (axis 'z': 앞뒤로 / 'x': 옆으로 늘어섬)
    const velvet = std({ color: '#9b1023', roughness: 0.6 });
    function stanchions(px, from, to, axis, parent = scene, py = 0) {
      const n = 2, pts = [];
      for (let k = 0; k < n; k++) {
        const t = from + (to - from) * k / (n - 1), x = axis === 'z' ? px : t, z = axis === 'z' ? t : px;
        const base = new T.Mesh(new T.CylinderGeometry(0.14, 0.16, 0.04, 16), goldM); base.position.set(x, py + 0.02, z); parent.add(base);
        const pole = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.9, 10), goldM); pole.position.set(x, py + 0.47, z); parent.add(pole);
        const knob = new T.Mesh(new T.SphereGeometry(0.06, 12, 10), goldM); knob.position.set(x, py + 0.95, z); parent.add(knob);
        pts.push(new T.Vector3(x, py + 0.86, z));
      }
      const m = pts[0].clone().lerp(pts[1], 0.5); m.y -= 0.22;
      parent.add(new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(pts[0], m, pts[1]), 16, 0.025, 6), velvet));
    }
    const signPole = new T.CylinderGeometry(0.04, 0.04, 1.3, 8), signPoleMat = std({ color: '#777', metalness: 0.7, roughness: 0.4 });
    slots.forEach((s, i) => {
      const lm = lineMats[s.zone], prev = slots[i - 1], next = slots[i + 1];
      if (!prev || prev.zone !== s.zone) scene.add(flat(0.14, 7.2, lm, s.x - s.w / 2, 0.012, -0.2));
      scene.add(flat(0.14, 7.2, lm, s.x + s.w / 2, 0.012, -0.2));
      if (!next || next.zone !== s.zone) { const zn = zones.find((q) => q.z === s.zone && q.to === s.x); scene.add(flat(zn.to - zn.from + s.w, 0.14, lm, (zn.from + zn.to) / 2, 0.012, -3.8)); }
      if (s.zone === 'vip') { scene.add(flat(s.w - 0.6, 6.6, basic({ map: carpetTex }), s.x, 0.008, -0.3)); [-1, 1].forEach((d) => stanchions(s.x + d * (s.w / 2 - 0.15), 1.4, 3.2, 'z')); }
      if (s.p.sample) { // 빈 샘플 자리: 차 대신 RESERVED 입간판만 — 궁금하게
        const Z2 = ZONES[s.zone];
        const rt = canvasTex(256, 320, (g, w, h) => {
          g.fillStyle = Z2.bg; g.fillRect(0, 0, w, h); g.strokeStyle = Z2.line; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
          g.fillStyle = Z2.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = 'bold 120px serif'; g.fillText(s.zone === 'vip' ? '♛' : '★', w / 2, 100);
          g.font = 'bold 44px sans-serif'; g.fillText('RESERVED', w / 2, 205); g.font = 'bold 30px sans-serif'; g.fillText(s.zone === 'vip' ? '부사장 이상' : '지역단장 이상', w / 2, 262);
        });
        const st = new T.Mesh(new T.PlaneGeometry(0.8, 1.0), basic({ map: rt, side: T.DoubleSide })); st.position.set(s.x, 0.62, 0.6); st.rotation.x = -0.12; scene.add(st);
        const leg = new T.Mesh(new T.BoxGeometry(0.05, 0.6, 0.05), goldM); leg.position.set(s.x, 0.3, 0.45); leg.rotation.x = 0.5; scene.add(leg);
        scene.add(flat(s.w - 1.2, 0.5, basic({ map: canvasTex(512, 96, (g, w, h) => { g.fillStyle = Z2.line; g.font = 'bold 70px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RESERVED', w / 2, h / 2 + 4); }), transparent: true, opacity: 0.8 }), s.x, 0.016, -1.6));
      }
      const Z = ZONES[s.zone];
      if (Z.paint) {
        paintTex[s.zone] = paintTex[s.zone] || canvasTex(256, 96, (g, w, h) => { g.fillStyle = Z.line; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Z.paint, w / 2, h / 2 + 4); });
        scene.add(flat(1.5, 0.56, basic({ map: paintTex[s.zone], transparent: true, opacity: 0.85 }), s.x, 0.016, 3.05));
        const t = canvasTex(256, 128, (g, w, h) => { // 뒤쪽 이름 팻말 (샘플 자리는 RESERVED)
          g.fillStyle = Z.bg; g.fillRect(0, 0, w, h); g.strokeStyle = Z.line; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
          g.fillStyle = Z.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = 'bold 30px sans-serif'; g.fillText(Z.paint + ' 전용', w / 2, 36);
          g.font = 'bold 44px sans-serif'; g.fillText(s.p.sample ? 'RESERVED' : String(s.p.name || '').slice(0, 7), w / 2, 86);
        });
        const pole = new T.Mesh(signPole, signPoleMat); pole.position.set(s.x + s.w * 0.32, 0.65, -3.95); scene.add(pole);
        const pl = new T.Mesh(new T.PlaneGeometry(0.9, 0.45), basic({ map: t })); pl.position.set(s.x + s.w * 0.32, 1.45, -3.93); scene.add(pl);
      }
    });

    // ---- 가로등 (밤에 켜짐) ----
    const bulbMat = basic({ color: '#d9d9d9' });
    const poolTex = radial([[0, 'rgba(255,214,140,.55)'], [1, 'rgba(255,214,140,0)']]);
    const dotTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,240,200,.6)'], [1, 'rgba(255,220,150,0)']]);
    const lampNight = [];
    const poleGeo = new T.CylinderGeometry(0.06, 0.08, 4.2, 10), poleMat = std({ color: '#3c4048', metalness: 0.6, roughness: 0.5 });
    const headGeo = new T.BoxGeometry(0.5, 0.12, 0.9), bulbGeo = new T.BoxGeometry(0.36, 0.04, 0.7), poolMat = glowMat(poolTex);
    for (let lx = x0 + GAP; lx <= x1 - GAP; lx += GAP * 2.2) {
      const pole = new T.Mesh(poleGeo, poleMat); pole.position.set(lx, 2.1, -4.3); scene.add(pole);
      const head = new T.Mesh(headGeo, poleMat); head.position.set(lx, 4.2, -3.95); scene.add(head);
      const bulb = new T.Mesh(bulbGeo, bulbMat); bulb.position.set(lx, 4.13, -3.95); scene.add(bulb);
      const glow = noPick(new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: '#ffe6b0', transparent: true, depthWrite: false, blending: T.AdditiveBlending }))); glow.scale.set(2.4, 2.4, 1); glow.position.set(lx, 4.05, -3.9); scene.add(glow);
      const pool = flat(6, 6, poolMat, lx, 0.02, -2.2); scene.add(pool);
      lampNight.push(glow, pool);
    }

    // ---- 최우수BM 스포트라이트 ----
    const beamTex = canvasTex(4, 128, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, 'rgba(255,240,190,0)'); l.addColorStop(1, 'rgba(255,240,190,.9)'); g.fillStyle = l; g.fillRect(0, 0, w, h); });
    const ringTex = radial([[0, 'rgba(255,224,130,.75)'], [0.7, 'rgba(255,224,130,.25)'], [1, 'rgba(255,224,130,0)']]);
    const beams = [];
    slots.filter((s) => s.p.best).forEach((s) => {
      const sp = new T.SpotLight('#fff1c2', 45, 0, 0.42, 0.6, 2); sp.position.set(s.x, 8, 2.5); sp.target.position.set(s.x, 0, 0); scene.add(sp, sp.target);
      const cone = noPick(new T.Mesh(new T.ConeGeometry(2.3, 7.6, 32, 1, true), basic({ map: beamTex, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })));
      cone.position.set(s.x, 4.0, 1.0); cone.rotation.x = 0.27; scene.add(cone);
      scene.add(flat(6, 6, glowMat(ringTex), s.x, 0.025, 0.2));
      beams.push(cone);
    });

    // ---- 차 꾸밈 ----
    const blobM = basic({ map: radial([[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false });
    const headTex = radial([[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,250,225,.8)'], [1, 'rgba(255,240,200,0)']]);
    const beamGround = canvasTex(128, 256, (g, w, h) => { const l = g.createLinearGradient(0, h, 0, 0); l.addColorStop(0, 'rgba(255,246,214,.32)'); l.addColorStop(1, 'rgba(255,246,214,0)'); g.fillStyle = l; g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.65, h); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill(); });
    const glowTexs = {};
    const plateTex = (txt) => canvasTex(512, 112, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222'; g.lineWidth = 8; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#111'; g.font = 'bold 66px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4);
    });
    const flagTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd66b'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BANCA', w / 2, h / 2 + 3); });
    const ribbonMat = std({ color: '#e8243c', roughness: 0.35, metalness: 0.1 });
    const vipFlagTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#8f1d2c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd66b'; g.font = 'bold 64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VIP', w / 2, h / 2 + 4); });
    const starTex = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.15, 'rgba(255,255,240,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(30, 2, 4, 60); g.fillRect(2, 30, 60, 4); });
    const lineM = new T.LineBasicMaterial({ color: '#eeeeee' }), surfRay = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0);
    const anims = [];
    // 사람 (기사님 · 경호원) — 단순한 3D 도형으로
    const skinM = std({ color: '#f1c7a5', roughness: 0.7 }), suitM = std({ color: '#15161c', roughness: 0.55 }), shirtM = std({ color: '#f4f4f4', roughness: 0.6 });
    const gloveM = std({ color: '#ffffff', roughness: 0.5 }), hairM = std({ color: '#1a1410', roughness: 0.8 }), tieM = std({ color: '#7a1020', roughness: 0.5 }), blackM = std({ color: '#050505', metalness: 0.5, roughness: 0.15 });
    function person(kind) {
      const g = new T.Group(), add = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
      [-1, 1].forEach((d) => {
        add(new T.CylinderGeometry(0.085, 0.075, 0.82, 10), suitM, d * 0.1, 0.43, 0);
        add(new T.BoxGeometry(0.12, 0.07, 0.26), blackM, d * 0.1, 0.035, 0.05);
        add(new T.CapsuleGeometry(0.06, 0.46, 4, 8), suitM, d * 0.27, 1.13, 0.02).rotation.z = d * 0.08;
        add(new T.SphereGeometry(0.065, 10, 8), kind === 'driver' ? gloveM : skinM, d * 0.29, 0.82, 0.04);
      });
      add(new T.CapsuleGeometry(0.2, 0.42, 4, 12), suitM, 0, 1.17, 0).scale.z = 0.68;
      add(new T.BoxGeometry(0.12, 0.3, 0.02), shirtM, 0, 1.3, 0.135);
      add(new T.BoxGeometry(0.045, 0.24, 0.02), kind === 'guard' ? blackM : tieM, 0, 1.28, 0.148);
      add(new T.CylinderGeometry(0.055, 0.06, 0.08, 8), skinM, 0, 1.5, 0);
      add(new T.SphereGeometry(0.125, 16, 12), skinM, 0, 1.64, 0).scale.y = 1.1;
      add(new T.SphereGeometry(0.132, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, 1.66, -0.005);
      if (kind === 'driver') { // 기사 모자 (금색 띠) · 눈
        add(new T.CylinderGeometry(0.15, 0.135, 0.09, 18), suitM, 0, 1.8, 0);
        add(new T.CylinderGeometry(0.137, 0.137, 0.028, 18), goldM, 0, 1.765, 0);
        add(new T.BoxGeometry(0.2, 0.015, 0.1), blackM, 0, 1.745, 0.14);
        [-1, 1].forEach((d) => add(new T.SphereGeometry(0.016, 6, 6), blackM, d * 0.045, 1.655, 0.118));
      } else add(new T.BoxGeometry(0.22, 0.045, 0.03), blackM, 0, 1.665, 0.118); // 경호원 선글라스
      return g;
    }
    function dress(s, wrap, Wd, L, H) {
      const cr = s.p.cr || {}, has = new Set(cr.i || []);
      let extra = 0;
      wrap.add(flat(Wd * 1.25, L * 1.12, blobM, 0, 0.02, 0));
      if (has.has('glow')) {
        const col = /^#[0-9a-f]{6}$/i.test(cr.g || '') ? cr.g : '#ff4fa3';
        glowTexs[col] = glowTexs[col] || radial([[0, col + 'ee'], [0.55, col + '88'], [1, col + '00']]);
        s.glow = flat(Wd * 1.7, L * 1.25, glowMat(glowTexs[col]), 0, 0.03, 0); wrap.add(s.glow);
      }
      if (has.has('plate') && cr.p) {
        const pl = new T.Mesh(new T.PlaneGeometry(0.78, 0.17), basic({ map: plateTex(String(cr.p).slice(0, 8)) })); pl.position.set(0, H * 0.27, L / 2 + 0.03); wrap.add(pl);
      }
      if (has.has('roofbox')) {
        const bx = new T.Mesh(new T.BoxGeometry(Wd * 0.52, 0.3, L * 0.42), std({ color: '#16181d', roughness: 0.35, metalness: 0.3 })); bx.position.set(0, H + 0.12, -L * 0.06); wrap.add(bx); extra = Math.max(extra, 0.35);
      }
      if (has.has('ribbon')) {
        const g = new T.Group(); g.position.set(0, H + (has.has('roofbox') ? 0.42 : 0.12), has.has('roofbox') ? -L * 0.06 : 0);
        [-1, 1].forEach((d) => {
          const lp = new T.Mesh(new T.SphereGeometry(0.32, 16, 12), ribbonMat); lp.scale.set(1, 0.62, 0.32); lp.position.set(d * 0.3, 0.2, 0); lp.rotation.z = d * 0.45; g.add(lp);
          const tail = new T.Mesh(new T.BoxGeometry(0.12, 0.36, 0.03), ribbonMat); tail.position.set(d * 0.13, -0.02, 0.02); tail.rotation.z = d * 0.4; g.add(tail);
        });
        const knot = new T.Mesh(new T.SphereGeometry(0.12, 12, 10), ribbonMat); knot.position.y = 0.2; g.add(knot);
        wrap.add(g); extra = Math.max(extra, has.has('roofbox') ? 0.95 : 0.55);
      }
      if (has.has('flag')) {
        const fx = -Wd * 0.34, fz = -L * 0.3, fy = H * 0.86;
        const pole = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.9, 6), std({ color: '#222' })); pole.position.set(fx, fy + 0.45, fz); wrap.add(pole);
        const fl = new T.Mesh(new T.PlaneGeometry(0.5, 0.31), basic({ map: flagTex, side: T.DoubleSide })); fl.position.set(fx - 0.26, fy + 0.74, fz); fl.rotation.y = 0.35; wrap.add(fl);
        extra = Math.max(extra, 1.0);
      }
      const side = Wd / 2; // +X 쪽(운전석)이 카메라에 보이는 옆면
      const surf = (px, pz) => { // 차 표면 높이 (보닛·펜더 위에 장식 올릴 때)
        surfRay.set(new T.Vector3(px, H + 2, pz), DOWN); const h = surfRay.intersectObject(wrap.children[0], true)[0];
        return h ? h.point.y : H * 0.6;
      };
      wrap.updateMatrixWorld(true);
      if (has.has('carpet')) {
        wrap.add(flat(1.5, 1.0, basic({ map: carpetTex }), side + 0.95, 0.03, L * 0.1).rotateZ(Math.PI / 2));
        [-1, 1].forEach((d) => stanchions(L * 0.1 + d * 0.62, side + 0.35, side + 1.55, 'x', wrap));
      }
      if (has.has('driver')) { const p = person('driver'); p.position.set(side + 0.48, 0, L * 0.12); p.rotation.y = 0.42 + 0.5; wrap.add(p); }
      if (has.has('guards')) {
        const g1 = person('guard'); g1.position.set(side + 0.55, 0, -L * 0.3); g1.rotation.y = 0.42 + 0.3; wrap.add(g1);
        const g2 = person('guard'); g2.position.set(side + 0.2, 0, L / 2 + 0.55); g2.rotation.y = 0.42; wrap.add(g2);
      }
      if (has.has('flowers')) {
        const hz = L * 0.3, hy = surf(0, hz), g = new T.Group(); g.position.set(0, hy, hz);
        const cols = ['#ff7aa8', '#ffffff', '#ff4d6d', '#ffd1e0', '#ffffff', '#ff7aa8', '#ffe066'];
        cols.forEach((c, k) => { const a = k / cols.length * Math.PI * 2, r = k ? 0.13 : 0; const f = new T.Mesh(new T.SphereGeometry(0.075, 10, 8), std({ color: c, roughness: 0.6 })); f.position.set(Math.cos(a) * r, 0.07 + (k ? 0 : 0.04), Math.sin(a) * r * 0.8); g.add(f); });
        [-1, 1].forEach((d) => { const lf = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), std({ color: '#4f9a4a' })); lf.scale.set(1.4, 0.3, 0.7); lf.position.set(d * 0.2, 0.03, 0.02); g.add(lf); });
        const bow = new T.Mesh(new T.TorusGeometry(0.06, 0.02, 6, 12), ribbonMat); bow.position.set(0, 0.04, 0.18); g.add(bow);
        wrap.add(g);
      }
      if (has.has('envoy')) [-1, 1].forEach((d) => {
        const fx = d * Wd * 0.36, fz = L * 0.36, fy = surf(fx, fz);
        const pole = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.42, 6), goldM); pole.position.set(fx, fy + 0.21, fz); wrap.add(pole);
        const fl = new T.Mesh(new T.PlaneGeometry(0.28, 0.18), basic({ map: d > 0 ? flagTex : vipFlagTex, side: T.DoubleSide })); fl.position.set(fx + d * 0.15, fy + 0.33, fz); wrap.add(fl);
      });
      if (has.has('balloons')) {
        const g = new T.Group(); g.position.set(side + 0.25, 0.95, L * 0.32); wrap.add(g);
        ['#ff5a7a', '#ffd23f', '#4fc3f7', '#7ee081', '#c084fc'].forEach((c, k) => {
          const bp = new T.Vector3(Math.cos(k * 1.3) * 0.32, 1.25 + (k % 3) * 0.22, Math.sin(k * 1.3) * 0.25);
          const b = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), std({ color: c, roughness: 0.25, metalness: 0.05 })); b.scale.y = 1.18; b.position.copy(bp); g.add(b);
          g.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), bp.clone().setY(bp.y - 0.23)]), lineM));
        });
        const ph = Math.random() * 6; anims.push((t) => { g.rotation.z = Math.sin(t * 1.3 + ph) * 0.05; g.rotation.x = Math.sin(t * 0.9 + ph) * 0.04; });
      }
      if (has.has('shine')) {
        const sp = [];
        for (let k = 0; k < 9; k++) {
          const st = noPick(new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })));
          st.position.set((Math.random() - 0.3) * Wd, H * (0.45 + Math.random() * 0.55), (Math.random() - 0.5) * L * 0.9); st.userData.ph = Math.random() * 6; wrap.add(st); sp.push(st);
        }
        anims.push((t) => sp.forEach((st) => { const v = Math.max(0, Math.sin(t * 2.6 + st.userData.ph)); st.scale.setScalar(0.05 + v * 0.38); }));
      }
      // 밤: 헤드라이트 · 바닥 불빛
      [-1, 1].forEach((d) => { const hl = noPick(new T.Sprite(new T.SpriteMaterial({ map: headTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }))); hl.scale.set(0.9, 0.9, 1); hl.position.set(d * Wd * 0.33, H * 0.36, L / 2 + 0.06); wrap.add(hl); s.night.push(hl); });
      const bg = noPick(flat(2.8, 3.4, glowMat(beamGround), 0, 0.022, L / 2 + 1.7)); wrap.add(bg); s.night.push(bg);
      return extra;
    }

    // ---- 카메라 ----
    const cam = new T.PerspectiveCamera(32, 1, 0.5, 140);
    let camX = 0, vel = 0, dirty = true, alive = true, viewW = VIEW_W, time = 'auto';
    const fit = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false); cam.aspect = w / h;
      viewW = Math.max(VIEW_W, Math.min(span + GAP * 2, w / h * 9));
      const hf = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      cam.userData.d = Math.max(7, (viewW / 2) / Math.tan(hf / 2)); cam.updateProjectionMatrix(); dirty = true;
    };
    const place = () => { const d = cam.userData.d || 12; cam.position.set(camX, 1.6 + d * 0.2, d + 0.5); cam.lookAt(camX, 1.75, -0.8); };

    // ---- 시간대 적용 ----
    const cur = () => TIMES[time === 'auto' ? autoTime() : time];
    const nightOf = (s, P) => { s.night.forEach((o) => { o.visible = P.lit > 0.5; }); if (s.glow) s.glow.material.opacity = P.lit > 0.5 ? 1 : 0.55; };
    function setTime(mode) {
      time = TIMES[mode] ? mode : 'auto';
      const P = cur();
      const g = skyCanvas.getContext('2d'), l = g.createLinearGradient(0, 0, 0, 256);
      l.addColorStop(0, P.top); l.addColorStop(1, P.bot); g.fillStyle = l; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
      scene.fog.color.set(P.bot);
      hemi.color.set(P.sky); hemi.groundColor.set(P.gnd); hemi.intensity = P.hemi;
      sun.color.set(P.sun); sun.intensity = P.sunI; sun.position.set(...P.sunP);
      renderer.toneMappingExposure = P.exp;
      Object.values(models).forEach((pr) => pr.then((m) => m.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mt) => { mt.envMapIntensity = P.env; }); dirty = true; })).catch(() => { }));
      drawWall(P);
      bulbMat.color.set(P.lit > 0.5 ? '#fff3c4' : '#d9d9d9');
      lampNight.forEach((o) => { o.visible = P.lit > 0.5; });
      vipNight.forEach((o) => { o.material.opacity = P.lit > 0.5 ? 1 : P.lit ? 0.6 : 0.25; });
      slots.forEach((s) => nightOf(s, P));
      beams.forEach((b) => { b.material.opacity = P.lit > 0.5 ? 0.32 : 0.18; });
      dirty = true;
      return (time === 'auto' ? '⏱ ' : '') + P.name;
    }

    // ---- 차 세우기 — 같은 차는 한 번만 받아서 복제 ----
    const loader = new GLTFLoader();
    const getModel = (url) => models[url] || (models[url] = new Promise((res, rej) => loader.load(url, (g) => res(g.scene), undefined, rej)).catch((e) => { delete models[url]; throw e; }));
    slots.forEach((s) => {
      const el = document.createElement('button');
      el.className = 'pk-label' + (s.p.me ? ' me' : '') + (s.p.sample ? ' sample' : '') + (s.p.best ? ' best' : '');
      el.innerHTML = s.p.html; el.dataset.i = s.i;
      el.onclick = (e) => { e.stopPropagation(); opts.onPick && opts.onPick(s.i); };
      labels.appendChild(el); s.el = el;
    });
    const timeLabel = setTime(opts.time);
    const order = slots.slice().sort((a, b) => Math.abs(a.x - camX) - Math.abs(b.x - camX)); // 보이는 차부터
    let done = 0;
    const status = opts.onProgress || (() => { });
    status(0, slots.length);
    const v1 = new T.Vector3(), v2 = new T.Vector3();
    (async () => {
      for (const s of order) {
        if (!alive) return;
        if (s.p.sample || !s.p.glb) { status(++done, slots.length); continue; } // 샘플 자리는 비워 둠
        try {
          const src = await getModel(s.p.glb);
          const P = cur();
          src.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((mt) => { mt.envMapIntensity = P.env; }); });
          const car = src.clone(true), wrap = new T.Group();
          const sz0 = new T.Box3().setFromObject(car).getSize(v1);
          if (sz0.x > sz0.z) car.rotation.y = Math.PI / 2; // 옆으로 누운 모델은 앞이 카메라 쪽을 보게
          car.scale.setScalar(LEN[s.p.rank] / Math.max(sz0.x, sz0.z)); car.updateMatrixWorld(true);
          const b = new T.Box3().setFromObject(car), c = b.getCenter(v1), size = b.getSize(v2);
          car.position.set(-c.x, -b.min.y, -c.z);
          wrap.add(car);
          const extra = dress(s, wrap, size.x, size.z, size.y);
          wrap.traverse((o) => { if (o.isMesh) o.userData.slot = s.i; });
          car.traverse((o) => { o.userData.keep = true; }); // 같이 쓰는 원본 모양 — 닫을 때 지우지 않음
          wrap.rotation.y = -0.42; wrap.position.x = s.x; // 살짝 비스듬히 세워 옆모습도 보이게
          nightOf(s, P);
          s.wrap = wrap; s.top = size.y + extra; scene.add(wrap); dirty = true;
        } catch (e) { console.warn('차를 불러오지 못했어요', s.p.glb, e); }
        status(++done, slots.length);
      }
    })();

    // ---- 끌어서 옆으로 둘러보기 (PC는 마우스 휠도) ----
    const cv = renderer.domElement;
    let down = null, moved = 0, lastX = 0, lastT = 0;
    const perPx = () => viewW / (host.clientWidth || 1);
    const clamp = () => { const c = Math.max(0, Math.min(span, camX)); if (c !== camX) { camX = c; vel = 0; } };
    cv.addEventListener('pointerdown', (e) => { down = e.clientX; lastX = e.clientX; lastT = performance.now(); moved = 0; vel = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
    cv.addEventListener('pointermove', (e) => {
      if (down == null) return;
      const dx = e.clientX - lastX, now = performance.now();
      camX -= dx * perPx(); moved += Math.abs(dx); clamp();
      vel = -dx * perPx() / Math.max(8, now - lastT) * 16; lastX = e.clientX; lastT = now; dirty = true;
      opts.onMove && opts.onMove();
    });
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    cv.addEventListener('pointerup', (e) => {
      if (down == null) return; down = null;
      if (performance.now() - lastT > 80) vel = 0;
      if (moved > 8) return;
      const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(slots.map((s) => s.wrap).filter(Boolean), true).find((h) => h.object.userData.slot != null);
      if (hit && opts.onPick) opts.onPick(hit.object.userData.slot);
    });
    cv.addEventListener('pointercancel', () => { down = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); camX += (e.deltaX || e.deltaY) * perPx() * 0.6; clamp(); dirty = true; opts.onMove && opts.onMove(); }, { passive: false });

    // ---- 차 위 얼굴·이름표 위치 ----
    const v3 = new T.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth, h = host.clientHeight;
      slots.forEach((s) => {
        v3.set(s.x, s.top + 0.6, 0).project(cam);
        const lx = (v3.x + 1) / 2 * w, ly = (1 - v3.y) / 2 * h;
        const on = v3.z < 1 && lx > -80 && lx < w + 80;
        s.el.style.display = on ? '' : 'none';
        if (on) s.el.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -100%)`;
      });
    };
    const ro = new ResizeObserver(fit); ro.observe(host); fit();
    const loop = () => {
      if (!alive) return;
      if (down == null && Math.abs(vel) > 0.002) { camX += vel; vel *= 0.92; clamp(); dirty = true; }
      if (anims.length) { const t = performance.now() / 1000; anims.forEach((f) => f(t)); dirty = true; } // 풍선 흔들림 · 광택 반짝임
      if (dirty) { place(); renderer.render(scene, cam); placeLabels(); dirty = false; }
      requestAnimationFrame(loop);
    };
    loop();
    return {
      timeLabel,
      setTime,
      time: () => time,
      goTo(i) { const s = slots[i]; if (!s) return; camX = Math.max(0, Math.min(span, s.x)); vel = 0; dirty = true; },
      close() {
        alive = false; ro.disconnect();
        scene.traverse((o) => {
          if (o.userData.keep) return;
          if (o.geometry) o.geometry.dispose();
          if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        });
        skyTex.dispose(); pm.dispose(); if (scene.environment) scene.environment.dispose();
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.remove();
      }
    };
  }
  return { open, TIMES };
})();
