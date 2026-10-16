/* =========================================================
   회사 주차장 — 모든 BM의 차(3D)를 가로로 길게 세워 두고 끌어서 둘러보기
   Parking.open(host, people, { onPick, onClose })
     people: [{ rank(0~6), glb, html(차 위에 뜰 얼굴·이름), me }]  — 왼쪽부터 이 순서로 주차
   3D 엔진(three.js)은 주차장을 처음 열 때만 불러온다.
   ========================================================= */
const Parking = (() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0';
  const LEN = [3.0, 4.0, 4.8, 4.8, 5.1, 5.3, 6.6]; // 직급별 차 길이(m) — 차마다 크기를 실제 비율로 맞춤
  const GAP = 3.6;      // 주차칸 폭(m)
  const VIEW_W = 5.8;   // 화면에 보이는 폭(m) — 세로 휴대폰에서 두 대 남짓
  let libP = null;
  const models = {};    // glb 주소 → 불러온 3D (다시 열 때 재사용)
  const lib = () => libP || (libP = Promise.all([
    import(`${CDN}/+esm`),
    import(`${CDN}/examples/jsm/loaders/GLTFLoader.js/+esm`),
    import(`${CDN}/examples/jsm/environments/RoomEnvironment.js/+esm`)
  ]).then(([T, G, R]) => ({ T, GLTFLoader: G.GLTFLoader, RoomEnvironment: R.RoomEnvironment }))
    .catch((e) => { libP = null; throw e; }));

  function canvasTex(T, w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4; return t;
  }

  async function open(host, people, opts = {}) {
    const { T, GLTFLoader, RoomEnvironment } = await lib();
    const n = people.length, span = Math.max(0, (n - 1) * GAP);
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = T.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const labels = document.createElement('div'); labels.className = 'pk-labels'; host.appendChild(labels);

    const scene = new T.Scene();
    scene.background = new T.Color('#bcd6ee'); scene.fog = new T.Fog('#bcd6ee', 30, 70);
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; // 차 도장의 반사
    scene.add(new T.HemisphereLight('#ffffff', '#5a5f6a', 0.6));
    const sun = new T.DirectionalLight('#fff4e0', 1.4); sun.position.set(-6, 12, 8); scene.add(sun);

    // 바닥(아스팔트) · 주차선 · 뒤쪽 건물
    const x0 = -GAP * 2, x1 = span + GAP * 2, W = x1 - x0;
    const asphalt = canvasTex(T, 256, 256, (g, w, h) => {
      g.fillStyle = '#5b606b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const v = 70 + Math.random() * 50; g.fillStyle = `rgba(${v},${v + 3},${v + 10},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }, [W / 4, 30 / 4]);
    const ground = new T.Mesh(new T.PlaneGeometry(W + 80, 30), new T.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set((x0 + x1) / 2, 0, 3); scene.add(ground);
    const lineM = new T.MeshBasicMaterial({ color: '#f2f2ea' });
    for (let i = 0; i <= n; i++) {
      const l = new T.Mesh(new T.PlaneGeometry(0.14, 7.2), lineM); l.rotation.x = -Math.PI / 2; l.position.set((i - 0.5) * GAP, 0.01, -0.2); scene.add(l);
    }
    const back = new T.Mesh(new T.PlaneGeometry(Math.max(GAP * n, 0.1), 0.14), lineM); back.rotation.x = -Math.PI / 2; back.position.set(span / 2, 0.01, -3.8); scene.add(back);
    const curb = new T.Mesh(new T.BoxGeometry(W + 80, 0.25, 0.6), new T.MeshStandardMaterial({ color: '#c9c9c2', roughness: 0.9 }));
    curb.position.set((x0 + x1) / 2, 0.125, -4.6); scene.add(curb);
    const wallTex = canvasTex(T, 512, 256, (g, w, h) => {
      g.fillStyle = '#e4e7ee'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9fb4cc';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillRect(24 + c * 124, 22 + r * 78, 100, 52);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillRect(24 + c * 124, 22 + r * 78, 30, 52);
    }, [(W + 80) / 10, 1]);
    const wall = new T.Mesh(new T.PlaneGeometry(W + 80, 6), new T.MeshStandardMaterial({ map: wallTex, roughness: 0.8 }));
    wall.position.set((x0 + x1) / 2, 3, -5.2); scene.add(wall);
    const sign = canvasTex(T, 1024, 160, (g, w, h) => {
      g.fillStyle = '#1f2a44'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd66b'; g.font = 'bold 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BANCA BM  PARKING', w / 2, h / 2 + 4);
    });
    const sg = new T.Mesh(new T.PlaneGeometry(6.4, 1), new T.MeshBasicMaterial({ map: sign })); sg.position.set(span / 2, 4.3, -5.15); scene.add(sg);

    // 바닥 그림자(가짜) — 진짜 그림자보다 훨씬 가벼움
    const blob = canvasTex(T, 128, 128, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    });
    const blobM = new T.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false });

    // 카메라 — 화면 폭에 맞춰 거리 조절
    const cam = new T.PerspectiveCamera(32, 1, 0.5, 120);
    let camX = 0, vel = 0, dirty = true, alive = true, viewW = VIEW_W;
    const fit = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false); cam.aspect = w / h;
      viewW = Math.max(VIEW_W, Math.min(span + GAP * 2, w / h * 9));
      const hf = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      const d = Math.max(7, (viewW / 2) / Math.tan(hf / 2));
      cam.userData.d = d; cam.updateProjectionMatrix(); dirty = true;
    };
    const place = () => {
      const d = cam.userData.d || 12;
      cam.position.set(camX, 1.6 + d * 0.2, d + 0.5); cam.lookAt(camX, 1.75, -0.8);
    };

    // 차 세우기 — 같은 차는 한 번만 받아서 복제
    const loader = new GLTFLoader();
    const getModel = (url) => models[url] || (models[url] = new Promise((res, rej) => loader.load(url, (g) => res(g.scene), undefined, rej)).catch((e) => { delete models[url]; throw e; }));
    const slots = people.map((p, i) => ({ p, x: i * GAP, top: 1.6, group: null, el: null }));
    slots.forEach((s, i) => {
      const el = document.createElement('button'); el.className = 'pk-label' + (s.p.me ? ' me' : ''); el.innerHTML = s.p.html; el.dataset.i = i;
      el.onclick = (e) => { e.stopPropagation(); opts.onPick && opts.onPick(i); };
      labels.appendChild(el); s.el = el;
      const sh = new T.Mesh(new T.PlaneGeometry(2.4, LEN[s.p.rank] * 1.15), blobM); sh.rotation.x = -Math.PI / 2; sh.position.set(s.x, 0.02, 0); scene.add(sh);
    });
    const order = slots.slice().sort((a, b) => Math.abs(a.x - camX) - Math.abs(b.x - camX)); // 보이는 차부터
    let left = slots.length;
    const status = opts.onProgress || (() => { });
    status(0, slots.length);
    (async () => {
      for (const s of order) {
        if (!alive) return;
        try {
          const src = await getModel(s.p.glb);
          const car = src.clone(true);
          const box = new T.Box3().setFromObject(car), size = box.getSize(new T.Vector3());
          car.rotation.y = (size.x > size.z ? Math.PI / 2 : 0) - 0.42; // 앞이 카메라 쪽 · 살짝 비스듬히 세워 옆모습도 보이게
          const len = Math.max(size.x, size.z), k = LEN[s.p.rank] / len;
          car.scale.setScalar(k);
          const b2 = new T.Box3().setFromObject(car), c = b2.getCenter(new T.Vector3());
          car.position.set(s.x - c.x, -b2.min.y, -c.z);
          car.traverse((o) => { if (o.isMesh) o.userData.slot = slots.indexOf(s); });
          s.group = car; s.top = (b2.max.y - b2.min.y); scene.add(car); dirty = true;
        } catch (e) { console.warn('차를 불러오지 못했어요', s.p.glb, e); }
        status(slots.length - --left, slots.length);
      }
    })();

    // 끌어서 옆으로 둘러보기 (PC는 마우스 휠도)
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
      const hit = ray.intersectObjects(slots.map((s) => s.group).filter(Boolean), true)[0];
      if (hit && opts.onPick) opts.onPick(hit.object.userData.slot);
    });
    cv.addEventListener('pointercancel', () => { down = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); camX += (e.deltaX || e.deltaY) * perPx() * 0.6; clamp(); dirty = true; opts.onMove && opts.onMove(); }, { passive: false });

    // 차 위 얼굴·이름표 위치
    const v3 = new T.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth, h = host.clientHeight;
      slots.forEach((s) => {
        v3.set(s.x, s.top + 0.35, 0).project(cam);
        const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * h;
        const on = v3.z < 1 && x > -80 && x < w + 80;
        s.el.style.display = on ? '' : 'none';
        if (on) s.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      });
    };
    const ro = new ResizeObserver(fit); ro.observe(host); fit();
    const loop = () => {
      if (!alive) return;
      if (down == null && Math.abs(vel) > 0.002) { camX += vel; vel *= 0.92; clamp(); dirty = true; }
      if (dirty) { place(); renderer.render(scene, cam); placeLabels(); dirty = false; }
      requestAnimationFrame(loop);
    };
    loop();
    const goTo = (i) => { camX = Math.max(0, Math.min(span, i * GAP)); vel = 0; dirty = true; };
    return {
      goTo,
      close() {
        alive = false; ro.disconnect();
        scene.traverse((o) => { if (o.isMesh && !o.userData.slot && o.userData.slot !== 0) { o.geometry.dispose(); } });
        [asphalt, wallTex, sign, blob].forEach((t) => t.dispose()); pm.dispose();
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.remove();
      }
    };
  }
  return { open };
})();
