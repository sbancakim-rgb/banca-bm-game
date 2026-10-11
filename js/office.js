/* =========================================================
   사무실 — 직급별 공간(창고 → 사장실) + 명패 · 액자 · 트로피 · 상장 · 책 · 꾸밈 물품
   Office.svg(rankIndex, card, { stage, person })
     card: { name, title, photo, items:[id], trophies:[{e,label}], certs:[{t,label}], books }
     stage: 홈 화면 배경용 (가운데에 캐릭터가 서므로 책상은 그리지 않음)
     person: 책상 뒤에 서 있는 캐릭터 그림 주소 (사무실 둘러보기)
   ========================================================= */
const Office = (() => {
  let seq = 0;
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emo = (e, x, y, s, tip) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle"${tip ? ` data-tip="${esc(tip)}"` : ''} style="cursor:${tip ? 'pointer' : 'default'}">${e}</text>`;
  const PLACE = ['창고', '△△은행 OO지점 창구 앞', '△△은행 VIP 상담실', '지역단 회의실', '사업부장실', '부사장실', '사장실'];

  function sky(u, x, y, w, h, night) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${u}sky)"/>`;
    let bx = x, i = 0;
    while (bx < x + w) {
      const bw = 16 + (i * 13) % 22, bh = h * (0.25 + ((i * 37) % 9) * 0.06);
      s += `<rect x="${bx}" y="${y + h - bh}" width="${Math.min(bw, x + w - bx)}" height="${bh}" fill="${night ? (i % 2 ? '#2a3150' : '#323b60') : (i % 2 ? '#9fb4cf' : '#86a0c0')}"/>`;
      if (night) for (let k = 0; k < 5; k++) s += `<rect x="${bx + 3 + (k % 2) * 7}" y="${y + h - bh + 6 + k * 11}" width="3" height="4" fill="#ffd66b" opacity="${(i + k) % 3 ? .9 : .25}"/>`;
      bx += bw + 3; i++;
    }
    return s;
  }
  const defs = (u, night) => `<defs>
    <linearGradient id="${u}sky" x1="0" y1="0" x2="0" y2="1">${night ? '<stop offset="0" stop-color="#141a3a"/><stop offset="1" stop-color="#4a3f7a"/>' : '<stop offset="0" stop-color="#8fc3f0"/><stop offset="1" stop-color="#e3f2ff"/>'}</linearGradient>
    <linearGradient id="${u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#e2b33c"/><stop offset="1" stop-color="#9c7414"/></linearGradient>
    <linearGradient id="${u}brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dca0"/><stop offset="1" stop-color="#b08a3e"/></linearGradient>
    <linearGradient id="${u}wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#5c3a1f"/></linearGradient>
    <linearGradient id="${u}mahog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b2d1f"/><stop offset="1" stop-color="#3a160e"/></linearGradient>
    <linearGradient id="${u}black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3440"/><stop offset="1" stop-color="#121016"/></linearGradient>
    <linearGradient id="${u}marble" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf8f2"/><stop offset=".5" stop-color="#ece6da"/><stop offset="1" stop-color="#f7f3ea"/></linearGradient>
    <radialGradient id="${u}glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
  </defs>`;

  /* ---- 직급별 방 (벽 · 창 · 바닥 · 진열장) ---- */
  const ROOM = [
    // 0 인턴: 창고
    (u) => `<rect width="400" height="480" fill="#a9a49a"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M0,${40 * i + 20} H400" stroke="#9a958b" stroke-width="2"/>${Array.from({ length: 6 }, (_, j) => `<path d="M${(j * 70 + (i % 2) * 35) % 400},${40 * i + 20} v40" stroke="#9a958b" stroke-width="2"/>`).join('')}`).join('')}
      <rect x="160" y="60" width="80" height="46" fill="#2b2f3a"/><rect x="164" y="64" width="72" height="38" fill="url(#${u}sky)" opacity=".7"/>
      ${[176, 192, 208, 224].map((x) => `<path d="M${x},64 v38" stroke="#555" stroke-width="3"/>`).join('')}
      <path d="M200,0 V120" stroke="#333" stroke-width="2"/><circle cx="200" cy="136" r="60" fill="url(#${u}glow)"/><circle cx="200" cy="128" r="9" fill="#fff3b0" stroke="#d4b860" stroke-width="2"/>
      <rect x="0" y="480" width="400" height="220" fill="#8d8981"/><ellipse cx="280" cy="560" rx="40" ry="10" fill="#7f7b73"/>
      ${emo('📦', 345, 470, 46)}${emo('📦', 368, 430, 34)}${emo('📦', 330, 425, 30)}${emo('🧹', 375, 470, 40)}
      <text x="200" y="30" text-anchor="middle" font-size="13" font-weight="800" fill="#6f6a60">자료 창고 B1</text>`,
    // 1 신입 BM: 은행 창구 앞
    (u) => `<rect width="400" height="480" fill="#d6efec"/><rect width="400" height="44" fill="#1f7a72"/>
      <text x="200" y="29" text-anchor="middle" font-size="17" fill="#fff" font-weight="800">△△은행  OO지점</text>
      <rect x="140" y="64" width="120" height="54" rx="8" fill="#222"/><text x="200" y="104" text-anchor="middle" font-size="34" fill="#ff4d4d" font-family="monospace" font-weight="700">0 2 3</text>
      <rect x="150" y="140" width="100" height="120" rx="6" fill="#fff" stroke="#9cc5bf" stroke-width="3"/><text x="200" y="166" text-anchor="middle" font-size="12" fill="#1f7a72" font-weight="800">이달의 금리</text>
      <text x="200" y="196" text-anchor="middle" font-size="11" fill="#3c6b66">정기예금 연 2.9%</text><text x="200" y="216" text-anchor="middle" font-size="11" fill="#3c6b66">연금보험 상담 OK</text><text x="200" y="240" text-anchor="middle" font-size="22">🏦</text>
      <rect x="0" y="300" width="400" height="180" fill="#bfe1dc"/><path d="M0,300 H400" stroke="#8cc1ba" stroke-width="4"/>
      <rect x="0" y="480" width="400" height="220" fill="#c9b49a"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 80},480 L${i * 80 - 40},700" stroke="#b7a184" stroke-width="2"/>`).join('')}`,
    // 2 방카 BM: VIP 상담실
    (u) => `<rect width="400" height="480" fill="#efe2cf"/>${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 20 + 10},0 V320" stroke="#e5d4bb" stroke-width="6"/>`).join('')}
      <rect x="0" y="320" width="400" height="160" fill="#c9a77e"/><path d="M0,320 H400" stroke="#9c7a52" stroke-width="6"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 50 + 8}" y="336" width="34" height="126" rx="3" fill="none" stroke="#b18e64" stroke-width="3"/>`).join('')}
      <rect x="140" y="56" width="120" height="170" fill="#fff" stroke="#c9a77e" stroke-width="6"/><rect x="146" y="62" width="108" height="158" fill="url(#${u}sky)"/>${sky(u, 146, 140, 108, 80)}
      <path d="M140,56 q20,90 -6,176 h20 q16,-90 0,-176 Z M260,56 q-20,90 6,176 h-20 q-16,-90 0,-176 Z" fill="#f8f2e8" opacity=".9"/>
      <path d="M352,250 v170" stroke="#5a4632" stroke-width="4"/><path d="M332,250 h40 l-8,-36 h-24 Z" fill="#ffe8b0" stroke="#c9a46a" stroke-width="2"/><circle cx="352" cy="240" r="46" fill="url(#${u}glow)" opacity=".7"/>
      <rect x="0" y="480" width="400" height="220" fill="#7a5a44"/><rect x="40" y="520" width="320" height="170" rx="10" fill="#9c3d3d" opacity=".55"/>
      <text x="200" y="36" text-anchor="middle" font-size="13" font-weight="800" fill="#9c7a52">VIP LOUNGE</text>`,
    // 3 지역단장: 회의실
    (u) => `<rect width="400" height="480" fill="#eef1f5"/>
      <rect x="120" y="50" width="160" height="110" rx="4" fill="#1f2433"/><rect x="126" y="56" width="148" height="98" fill="#fff"/>
      ${[[140, 60], [165, 45], [190, 72], [215, 58], [240, 85]].map(([x, h]) => `<rect x="${x}" y="${142 - h}" width="16" height="${h}" fill="#4f7cff"/>`).join('')}<text x="200" y="72" text-anchor="middle" font-size="10" fill="#333" font-weight="800">지역단 방카 실적</text>
      <path d="M126,140 L150,120 L178,126 L206,96 L236,104 L264,74" fill="none" stroke="#ff6f91" stroke-width="3"/>
      <rect x="0" y="180" width="400" height="300" fill="#dfe6ee"/>${[0, 100, 300].map((x) => `<rect x="${x + 6}" y="190" width="88" height="280" fill="#cfe2f5" opacity=".7" stroke="#b6c8da" stroke-width="3"/>`).join('')}
      <rect x="0" y="480" width="400" height="220" fill="#8f97a6"/>${Array.from({ length: 10 }, (_, i) => `<path d="M0,${490 + i * 22} H400" stroke="#858d9c" stroke-width="2"/>`).join('')}
      <text x="200" y="34" text-anchor="middle" font-size="13" font-weight="800" fill="#6a7486">회의실 A</text>`,
    // 4 사업부장: 사업부장실
    (u) => `<rect width="400" height="480" fill="url(#${u}wood)"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 30},0 V480" stroke="#4e311a" stroke-width="2" opacity=".6"/>`).join('')}
      <rect x="135" y="50" width="130" height="200" fill="#3a2414"/><rect x="141" y="56" width="118" height="188" fill="url(#${u}sky)"/>${sky(u, 141, 150, 118, 94)}<path d="M200,56 V244 M141,150 H259" stroke="#3a2414" stroke-width="5"/>
      <rect x="0" y="470" width="400" height="10" fill="#c9a227"/>
      <rect x="0" y="480" width="400" height="220" fill="#3f5a3a"/><rect x="30" y="510" width="340" height="180" rx="8" fill="#2f4a2c" stroke="#c9a227" stroke-width="3" opacity=".8"/>
      <text x="200" y="32" text-anchor="middle" font-size="12" font-weight="800" fill="#e8d29a">방카슈랑스사업부장실</text>`,
    // 5 부사장: 부사장실 (트로피 진열장 · 금장)
    (u) => `<rect width="400" height="480" fill="#3a2418"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 50 + 6}" y="60" width="38" height="390" rx="3" fill="none" stroke="#5b3a26" stroke-width="3"/>`).join('')}
      <rect x="0" y="0" width="400" height="22" fill="url(#${u}gold)"/><rect x="0" y="458" width="400" height="22" fill="url(#${u}gold)"/>
      <rect x="130" y="50" width="140" height="210" fill="#1d120b"/><rect x="137" y="57" width="126" height="196" fill="url(#${u}sky)"/>${sky(u, 137, 150, 126, 103)}
      <path d="M130,48 q35,110 -10,216 h34 q26,-110 0,-216 Z M270,48 q-35,110 10,216 h-34 q-26,-110 0,-216 Z" fill="#8c1c2c"/><rect x="122" y="40" width="156" height="12" rx="4" fill="url(#${u}gold)"/>
      <rect x="0" y="480" width="400" height="220" fill="#5b1620"/><rect x="24" y="500" width="352" height="190" rx="10" fill="#7a1f2b" stroke="url(#${u}gold)" stroke-width="5"/>
      <text x="200" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#5b3a10">EXECUTIVE VICE PRESIDENT</text>`,
    // 6 사장: 사장실 (대리석 · 샹들리에 · 파노라마 야경)
    (u) => `<rect width="400" height="480" fill="url(#${u}marble)"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 60},0 q30,${120 + i * 15} -10,${300}" stroke="#d8cfbf" stroke-width="2" fill="none"/>`).join('')}
      <rect x="40" y="70" width="320" height="240" fill="#111"/><rect x="46" y="76" width="308" height="228" fill="url(#${u}sky)"/>${sky(u, 46, 150, 308, 154, true)}
      ${[46 + 77, 46 + 154, 46 + 231].map((x) => `<path d="M${x},76 V304" stroke="#111" stroke-width="5"/>`).join('')}
      <rect x="0" y="40" width="34" height="440" fill="url(#${u}gold)"/><rect x="366" y="40" width="34" height="440" fill="url(#${u}gold)"/><rect x="0" y="30" width="400" height="16" fill="url(#${u}gold)"/>
      <path d="M200,0 V40" stroke="#c9a227" stroke-width="3"/><circle cx="200" cy="58" r="70" fill="url(#${u}glow)"/>
      <path d="M150,48 Q200,82 250,48" fill="none" stroke="url(#${u}gold)" stroke-width="5"/>${[150, 175, 200, 225, 250].map((x, i) => `<path d="M${x},${48 + (i % 2) * 6} v14" stroke="#fff" stroke-width="2"/><circle cx="${x}" cy="${64 + (i % 2) * 6}" r="4" fill="#fffbe0" stroke="#e2b33c"/>`).join('')}
      <rect x="0" y="480" width="400" height="220" fill="#e9e1d1"/>${Array.from({ length: 5 }, (_, i) => `<path d="M0,${500 + i * 44} H400" stroke="#d6cbb5" stroke-width="2"/>`).join('')}
      <rect x="30" y="505" width="340" height="185" rx="12" fill="#6b1d2a" stroke="url(#${u}gold)" stroke-width="6"/><rect x="60" y="530" width="280" height="135" rx="8" fill="none" stroke="#e2b33c" stroke-width="2" stroke-dasharray="8 6"/>
      <text x="200" y="22" text-anchor="middle" font-size="12" font-weight="900" fill="#8a6a1a">CEO</text>`
  ];

  /* ---- 진열장(왼쪽): 트로피 2칸 + 책 2칸 ---- */
  function cabinet(u, r, card) {
    const frame = r === 0 ? '#7d8088' : r === 1 ? '#9cc5bf' : r >= 5 ? `url(#${u}gold)` : '#5c3a1f';
    const back = r === 0 ? '#9a9da5' : r === 1 ? '#e8f6f4' : r >= 5 ? '#24160e' : '#7a5233';
    let s = `<rect x="38" y="168" width="90" height="306" fill="${back}" stroke="${frame}" stroke-width="5"/>`;
    [236, 306, 376, 446].forEach((y) => (s += `<rect x="38" y="${y}" width="90" height="6" fill="${frame}"/>`));
    if (r >= 5) s += `<rect x="42" y="172" width="82" height="270" fill="#bfe3ff" opacity=".12"/>`;
    const tro = (card && card.trophies) || [];
    tro.slice(0, 8).forEach((t, i) => (s += emo(t.e, 54 + (i % 4) * 19, (i < 4 ? 234 : 304), 20, t.label)));
    if (tro.length > 8) s += `<text x="120" y="252" font-size="10" font-weight="800" fill="#ffd66b" text-anchor="end">+${tro.length - 8}</text>`;
    if (!tro.length && card && card.trophies) s += `<text x="83" y="228" font-size="9" fill="${r >= 4 ? '#e8d29a' : '#555'}" text-anchor="middle" data-tip="최우수BM에 뽑히거나 보스를 이기면 트로피가 생겨요">트로피 자리</text>`;
    const cols = ['#9b2335', '#2b3a67', '#2f7a5b', '#c9a227', '#6a4c93', '#d9824a', '#3c6fd1', '#7a5a44'];
    const nb = Math.min(16, (card && card.books) || 0);
    for (let i = 0; i < nb; i++) {
      const row = i < 8 ? 0 : 1, k = i % 8, h = 54 - (k % 3) * 5;
      s += `<rect x="${44 + k * 10}" y="${(row ? 446 : 376) - h}" width="9" height="${h}" fill="${cols[(i * 3) % 8]}" data-tip="공부한 만큼 책이 늘어요 (${card.books}권)"/>`;
    }
    return s;
  }
  /* ---- 상장(오른쪽 벽) ---- */
  function certs(u, r, card) {
    const list = (card && card.certs) || [];
    let s = '';
    list.slice(0, 6).forEach((c, i) => {
      const x = 286 + (i % 2) * 42, y = 104 + Math.floor(i / 2) * 52;
      const fr = r >= 4 ? `url(#${u}gold)` : '#6b4a2b';
      s += `<g data-tip="${esc(c.label)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="36" height="46" fill="${fr}"/><rect x="${x + 3}" y="${y + 3}" width="30" height="40" fill="#fffaf0"/>
        <text x="${x + 18}" y="${y + 16}" font-size="7.5" font-weight="900" fill="#8a1c1c" text-anchor="middle">${esc(c.t)}</text>
        <path d="M${x + 8},${y + 22} h20 M${x + 8},${y + 27} h20 M${x + 8},${y + 32} h14" stroke="#c7b9a3" stroke-width="1.4"/><circle cx="${x + 27}" cy="${y + 37}" r="3.5" fill="#d33"/></g>`;
    });
    if (list.length > 6) s += `<text x="368" y="266" font-size="10" font-weight="800" fill="${r >= 4 ? '#ffd66b' : '#555'}" text-anchor="end">+${list.length - 6}</text>`;
    return s;
  }
  /* ---- 꾸밈 물품 위치 ---- */
  const SPOT = {
    painting: (u) => `<g data-tip="명화 액자"><rect x="40" y="62" width="88" height="70" fill="url(#${u}gold)"/><rect x="46" y="68" width="76" height="58" fill="#7fb3d8"/><path d="M46,126 L70,96 L88,112 L104,90 L122,126 Z" fill="#4f8a4f"/><circle cx="108" cy="80" r="7" fill="#ffd66b"/></g>`,
    clock: () => emo('🕰️', 330, 86, 34, '앤티크 괘종시계'),
    coffee: () => emo('☕', 60, 164, 26, '커피머신'),
    crystal: () => emo('💎', 108, 164, 26, '크리스탈 장식'),
    fish: () => `<g data-tip="어항"><rect x="290" y="330" width="78" height="56" rx="6" fill="#bfe8ff" stroke="#7fb3d8" stroke-width="3" opacity=".9"/><rect x="290" y="352" width="78" height="34" fill="#7fc4f0" opacity=".6"/>
      <text x="312" y="376" font-size="18">🐠</text><text x="342" y="364" font-size="13">🐟</text><rect x="300" y="386" width="58" height="84" fill="#5c3a1f"/></g>`,
    cactus: () => emo('🌵', 96, 482, 30, '미니 선인장'),
    laptop: () => emo('💻', 132, 482, 32, '최신 노트북'),
    teddy: () => emo('🧸', 166, 482, 28, '곰인형'),
    globe: () => emo('🌏', 246, 482, 30, '지구본'),
    plant: () => emo('🪴', 40, 696, 70, '몬스테라 화분'),
    statue: () => emo('🗿', 116, 696, 56, '조각상'),
    dog: () => emo('🐕', 204, 698, 54, '사무실 강아지'),
    putter: () => emo('⛳', 288, 696, 46, '퍼팅 연습기'),
    sofa: () => emo('🛋️', 356, 696, 66, '가죽 소파')
  };
  const DESK_ITEMS = ['cactus', 'laptop', 'teddy', 'globe'];

  /* ---- 책상 · 명패 · 액자 ---- */
  function desk(u, r, card) {
    const top = ['#b8bcc6', '#a8805a', `url(#${u}wood)`, '#f4f6f9', `url(#${u}mahog)`, `url(#${u}mahog)`, `url(#${u}black)`][r];
    const front = ['#9aa0ab', '#8c6a4a', `url(#${u}wood)`, '#dfe4ea', `url(#${u}mahog)`, `url(#${u}mahog)`, `url(#${u}black)`][r];
    let s = '';
    if (r === 0) s += `<rect x="70" y="482" width="260" height="10" fill="${top}"/><path d="M90,492 L110,612 M310,492 L290,612 M110,612 L290,492" stroke="#7d8088" stroke-width="5"/>`;
    else if (r === 1) s += `<rect x="40" y="360" width="320" height="120" fill="#e8f6f4" opacity=".55" stroke="#9cc5bf" stroke-width="3"/><rect x="40" y="478" width="320" height="14" fill="${top}"/><rect x="40" y="492" width="320" height="120" fill="${front}"/><rect x="60" y="506" width="280" height="92" fill="#a07c58"/>`;
    else {
      s += `<rect x="60" y="476" width="280" height="16" rx="3" fill="${top}"/><rect x="66" y="492" width="268" height="${r >= 4 ? 128 : 116}" fill="${front}"/>`;
      if (r >= 4) s += `<rect x="84" y="508" width="232" height="96" rx="4" fill="none" stroke="${r >= 5 ? `url(#${u}gold)` : '#8a5a34'}" stroke-width="3"/>`;
      if (r >= 5) s += `<rect x="60" y="476" width="280" height="4" fill="url(#${u}gold)"/><circle cx="200" cy="556" r="16" fill="none" stroke="url(#${u}gold)" stroke-width="3"/><text x="200" y="562" text-anchor="middle" font-size="16" fill="#e2b33c">${r === 6 ? '♛' : '★'}</text>`;
    }
    // 액자 (내 사진)
    const ph = card && card.photo;
    s += `<g data-tip="액자 속 ${esc(card ? card.name : '')}"><rect x="276" y="430" width="44" height="50" rx="3" fill="${r >= 5 ? `url(#${u}gold)` : '#5c3a1f'}"/><rect x="280" y="434" width="36" height="42" fill="#f4e7ef"/>
      ${ph ? `<clipPath id="${u}ph"><rect x="280" y="434" width="36" height="42"/></clipPath><image href="${esc(ph)}" x="276" y="430" width="44" height="50" preserveAspectRatio="xMidYMid slice" clip-path="url(#${u}ph)"/>` : '<text x="298" y="462" font-size="18" text-anchor="middle">🙂</text>'}
      <path d="M292,480 l-6,10 M304,480 l6,10" stroke="#5c3a1f" stroke-width="3"/></g>`;
    // 명패 (직급마다 화려함이 다름)
    const NP = [
      { w: 78, bg: '#fff59a', fg: '#333', border: 'none', font: 'Nanum Pen Script, cursive' },
      { w: 86, bg: '#ffffff', fg: '#1f7a72', border: '#9cc5bf' },
      { w: 96, bg: `url(#${u}wood)`, fg: '#f3dca0', border: '#3a2414' },
      { w: 104, bg: '#e8f2ff', fg: '#2b4c9a', border: '#9fb7e6' },
      { w: 116, bg: `url(#${u}brass)`, fg: '#3a2414', border: '#7a5a1a' },
      { w: 126, bg: `url(#${u}gold)`, fg: '#3a2010', border: '#7a5a10' },
      { w: 140, bg: '#e9f6ff', fg: '#7a5a10', border: `url(#${u}gold)` }
    ][r];
    const nx = 200 - NP.w / 2;
    s += `<g data-tip="${esc(card ? `${card.title} ${card.name}` : '')}">`;
    if (r === 0) s += `<rect x="${nx}" y="452" width="${NP.w}" height="28" fill="${NP.bg}" transform="rotate(-3 200 466)"/><rect x="${nx + 26}" y="448" width="26" height="8" fill="#e9e1c6" opacity=".8" transform="rotate(-3 200 466)"/>`;
    else s += `${r === 6 ? `<rect x="${nx - 8}" y="474" width="${NP.w + 16}" height="8" rx="2" fill="url(#${u}gold)"/>` : ''}<path d="M${nx},480 L${nx + 6},450 L${nx + NP.w - 6},450 L${nx + NP.w},480 Z" fill="${NP.bg}" stroke="${NP.border}" stroke-width="${r >= 5 ? 3 : 2}"/>`;
    if (r === 6) s += `<path d="M${nx + 6},450 L${nx + NP.w - 6},450 L${nx + NP.w - 12},458 L${nx + 12},458 Z" fill="#fff" opacity=".6"/>${[nx + 10, nx + NP.w - 10].map((x) => `<text x="${x}" y="476" font-size="8" text-anchor="middle" fill="#e2b33c">✦</text>`).join('')}`;
    s += `<text x="200" y="${r === 0 ? 466 : 463}" font-size="${r >= 4 ? 8 : 7.5}" font-weight="700" text-anchor="middle" fill="${NP.fg}" opacity=".85"${r === 0 ? ' transform="rotate(-3 200 466)"' : ''}>${esc(card ? card.title : '')}</text>
      <text x="200" y="${r === 0 ? 477 : 475}" font-size="${r >= 5 ? 13 : 12}" font-weight="900" text-anchor="middle" fill="${NP.fg}"${r === 0 ? ' transform="rotate(-3 200 466)"' : ''}>${esc(card ? card.name : '')}</text></g>`;
    return s;
  }

  function svg(r, card, opts = {}) {
    r = Math.max(0, Math.min(6, r | 0));
    const u = 'of' + (++seq) + '_';
    const items = new Set((card && card.items) || []);
    let s = defs(u, r === 6) + ROOM[r](u);
    s += cabinet(u, r, card) + certs(u, r, card);
    if (r >= 5) { // 부사장실 · 사장실: 역대 수상 진열 선반 (장식)
      const row = (y, list) => `<rect x="282" y="${y}" width="88" height="5" fill="url(#${u}gold)"/>` + list.map((e, i) => emo(e, 294 + i * 21, y - 1, 18, '역대 수상 기록')).join('');
      s += row(298, ['🏆', '🏅', '🏆', '🎖️']) + row(328, ['🏅', '🏆', '🎖️', '🏆']);
    }
    ['painting', 'clock', 'coffee', 'crystal', 'fish'].forEach((k) => items.has(k) && (s += SPOT[k](u)));
    if (opts.person) s += `<image href="${esc(opts.person)}" x="95" y="168" width="210" height="300" preserveAspectRatio="xMidYMax meet"/>`;
    if (!opts.stage) { s += desk(u, r, card); DESK_ITEMS.forEach((k) => items.has(k) && (s += SPOT[k](u))); }
    ['plant', 'statue', 'dog', 'putter', 'sofa'].forEach((k) => items.has(k) && (s += SPOT[k](u)));
    return `<svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid ${opts.fit ? 'meet' : 'slice'}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  }
  return { svg, PLACE };
})();
