/* Service worker — required for Chrome's install prompt.
   Bump CACHE whenever you ship changed files, or returning viewers keep
   the old shell: a cache-first worker will happily serve last week's app. */
const CACHE = "bmq-v65";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./css/style.css", "./img/opening_3.webp", "./js/env.js", "./js/art.js", "./js/config.js", "./js/data/library.js",
  "./js/sprites.js", "./js/store.js", "./js/api.js", "./js/office.js", "./js/parking.js", "./js/mini.js", "./js/game.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // one missing file must not brick install
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // APIs and CDNs go straight to the network

  // Navigations: network first, so a deployed update is picked up immediately,
  // with the cached shell as the offline fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // 게임 코드·스타일·목록 파일(js/css/json): 네트워크 먼저 → 배포하면 다음 실행에 바로 반영, 오프라인이면 캐시
  // 그림·아이콘 등 나머지: 캐시 먼저(빠르게) + 뒤에서 새로 받아 두기
  const fresh = /\.(js|css|json|webmanifest)$/.test(url.pathname);
  const save = (res) => {
    if (res && res.status === 200 && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  };
  if (fresh) {
    // no-cache: 브라우저가 10분간 쥐고 있는 옛 파일 대신 서버에 새 버전이 있는지 매번 확인
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(save).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then(save).catch(() => hit);
      return hit || net;
    })
  );
});
