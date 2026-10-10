/* =========================================================
   Art — 미연시 스타일 2D 캐릭터 & 배경 (순수 SVG 생성)
   portrait(spec, expr, opts) → SVG 문자열
   background(name) → SVG 문자열
   ========================================================= */
const Art = (() => {
  const LINE = '#3d2a2e';
  let uid = 0;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  const mirror = (inner) => `<g transform="translate(400,0) scale(-1,1)">${inner}</g>`;

  /* ---------------- 헤어 ---------------- */
  // 앞머리: 오른쪽 관자놀이(xR)에서 왼쪽(xL)으로, 곡선 가닥을 n개 만든다
  function fringe(xR, xL, yGap, yTip, n, sway = 0) {
    let d = '', step = (xR - xL) / n;
    for (let i = 0; i < n; i++) {
      const g0 = xR - i * step, g1 = g0 - step, tx = g0 - step / 2 + sway;
      const ty = yTip + ((i * 7) % 3) * 4 - (i === 0 || i === n - 1 ? 6 : 0);
      const gy = yGap + ((i * 5) % 3) * 3;
      // 끝을 2px 정도 뭉툭하게 (뾰족한 톱니 느낌 완화)
      d += ` Q${(g0 - 2).toFixed(1)},${((gy + ty) / 2 + 4).toFixed(1)} ${(tx + 1.4).toFixed(1)},${(ty - 0.6).toFixed(1)} Q${tx.toFixed(1)},${(ty + 1.6).toFixed(1)} ${(tx - 1.4).toFixed(1)},${(ty - 0.6).toFixed(1)} Q${(g1 + 4).toFixed(1)},${((gy + ty) / 2).toFixed(1)} ${g1.toFixed(1)},${gy.toFixed(1)}`;
    }
    return d;
  }
  // 이마가 드러나는 헤어라인 (시스루뱅용)
  const capOpen = (st) => `<path d="M120,214 C108,112 154,64 200,64 C246,64 292,112 280,214 C278,180 270,150 252,132 C232,120 168,120 148,132 C130,150 122,180 120,214 Z" ${st}/>`;
  // 시스루뱅: 이마가 비치는 가는 앞머리 가닥
  function seeThru(c, d) {
    // 시스루뱅: 뿌리는 넓고 끝은 가늘게 휘어지는 머리카락 다발 (끝이 뾰족하지 않게 살짝 뭉툭)
    const L = [[150, 146, -3], [162, 160, -2], [175, 168, -1], [188, 162, 0], [201, 170, 1], [214, 163, 1], [227, 168, 2], [240, 156, 3], [251, 144, 3]];
    return L.map(([x, y, b]) => `<path d="M${x - 5},120 C${x - 6 + b},134 ${x - 3 + b * 2},${y - 14} ${x - 1 + b * 2},${y} Q${x + b * 2},${y + 1.5} ${x + 1.2 + b * 2},${y - 0.5} C${x + 2.5 + b * 2},${y - 16} ${x + 4 + b},134 ${x + 5},120 Z" fill="${c}" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>`).join('')
      + `<path d="M146,123 Q200,113 256,123" fill="none" stroke="${d}" stroke-width="1.6" opacity=".8"/>`;
  }
  function hair(style, c, id) {
    const d = shade(c, -0.32), l = shade(c, 0.5), F = `url(#hg${id})`, HL = shade(c, -0.45);
    const st = `fill="${F}" stroke="${HL}" stroke-width="2.4" stroke-linejoin="round"`;
    // 엔젤링: 정수리 아래 끊어진 하이라이트 띠 + 가는 반사선
    const shine = (x = 0) => `<g fill="none" stroke-linecap="round">
      <path d="M${144 + x},122 Q${154 + x},108 ${168 + x},101" stroke="${l}" stroke-width="4.5" opacity=".4"/>
      <path d="M${178 + x},97 Q${194 + x},92 ${210 + x},94" stroke="${l}" stroke-width="6" opacity=".45"/>
      <path d="M${220 + x},96 Q${236 + x},101 ${250 + x},114" stroke="${l}" stroke-width="4.5" opacity=".4"/>
      <path d="M${158 + x},106 Q${200 + x},86 ${242 + x},104" stroke="#fff" stroke-width="1.6" opacity=".55"/>
      <path d="M${186 + x},94 L${190 + x},93" stroke="#fff" stroke-width="3" opacity=".8"/></g>`;
    const strands = (pts) => `<path d="${pts}" fill="none" stroke="${d}" stroke-width="1.6" opacity=".55" stroke-linecap="round"/>`;
    let back = '', front = '';
    switch (style) {
      case 'male_short':
        back = `<path d="M124,214 C110,120 150,68 200,68 C250,68 290,120 276,214 L268,236 L132,236 Z" ${st}/>`;
        front = `<path d="M126,206 C116,118 155,70 200,70 C245,70 284,118 274,206 L268,160 ${fringe(268, 132, 136, 166, 6, -3)} L132,160 Z" ${st}/>
          <path d="M128,196 L136,232 L142,200 Z M272,196 L264,232 L258,200 Z" fill="${F}" stroke="${HL}" stroke-width="2"/>
          ${strands('M200,80 Q190,110 186,150 M232,86 Q236,110 232,136 M166,88 Q160,120 158,160')}${shine()}`;
        break;
      case 'male_side':
        back = `<path d="M122,214 C108,120 150,66 202,66 C252,66 292,120 278,214 L270,236 L130,236 Z" ${st}/>`;
        front = `<path d="M124,208 C112,118 152,66 206,66 C254,68 290,118 276,208 L270,176 C266,152 254,134 240,124 C236,152 204,170 160,170 C148,176 138,188 132,206 Z" ${st}/>
          <path d="M240,124 C246,146 254,156 262,170" fill="none" stroke="${d}" stroke-width="2"/>
          ${strands('M150,110 Q190,128 236,118 M140,140 Q180,158 226,140')}${shine(6)}`;
        break;
      case 'male_slick':
        back = `<path d="M124,212 C110,118 152,68 200,68 C248,68 290,118 276,212 L268,232 L132,232 Z" ${st}/>`;
        front = `<path d="M128,196 C118,116 156,70 200,70 C244,70 282,116 272,196 C268,164 262,144 250,130 C228,118 172,118 150,130 C138,144 132,164 128,196 Z" ${st}/>
          <path d="M128,196 C126,170 128,150 136,138 L142,186 Z M272,196 C274,170 272,150 264,138 L258,186 Z" fill="#a9a9b3" stroke="${HL}" stroke-width="2"/>
          ${strands('M156,124 Q190,96 236,92 M170,122 Q206,104 250,110 M146,140 Q180,100 220,84')}${shine()}`;
        break;
      case 'female_bob':
        back = `<path d="M116,200 C102,108 150,62 200,62 C250,62 298,108 284,200 C290,252 288,288 278,312 L122,312 C112,288 110,252 116,200 Z" ${st}/>`;
        front = `<path d="M120,218 C110,114 154,66 200,66 C246,66 290,114 280,218 L274,262 C272,220 270,190 266,166 ${fringe(266, 134, 142, 170, 7)} C130,190 128,220 128,262 Z" ${st}/>
          ${strands('M200,76 Q196,110 204,144 M170,86 Q166,120 176,148 M232,86 Q238,120 234,148')}${shine()}`;
        break;
      case 'female_long':
        back = `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C294,300 302,400 314,486 L86,486 C98,400 106,300 114,200 Z" ${st}/>
          ${strands('M110,300 Q100,400 104,470 M290,300 Q300,400 296,470')}`;
        front = `<path d="M120,214 C108,112 154,64 200,64 C246,64 292,112 280,214 C282,260 286,300 292,340 L270,330 C268,260 268,200 266,168 ${fringe(266, 134, 140, 168, 7, 2)} C132,200 132,260 130,330 L108,340 C114,300 118,260 120,214 Z" ${st}/>
          ${strands('M200,74 Q196,110 200,142 M168,84 Q164,120 172,148 M234,84 Q238,120 230,146 M122,240 Q118,290 116,330 M278,240 Q282,290 284,330')}${shine()}`;
        break;
      case 'female_pony':
        back = `<path d="M118,206 C104,110 150,62 200,62 C250,62 296,110 282,206 L276,240 L124,240 Z" ${st}/>
          <path d="M262,96 C320,110 330,200 312,290 C304,330 290,360 280,380 C296,320 300,250 286,190 C280,150 270,120 252,104 Z" ${st}/>
          <circle cx="262" cy="98" r="9" fill="#ff6f91" stroke="${HL}" stroke-width="2"/>`;
        front = `<path d="M122,212 C110,114 154,66 200,66 C246,66 290,114 278,212 L272,166 ${fringe(272, 130, 138, 166, 6, 4)} L128,200 Z" ${st}/>
          <path d="M126,200 C120,240 124,270 132,292 L140,250 Z M274,200 C280,240 276,270 268,292 L260,250 Z" fill="${F}" stroke="${HL}" stroke-width="2"/>
          ${strands('M196,76 Q190,110 196,140 M164,88 Q160,120 162,150')}${shine()}`;
        break;
      case 'female_updo':
        back = `<circle cx="200" cy="66" r="34" ${st}/>
          <path d="M120,206 C106,112 150,64 200,64 C250,64 294,112 280,206 L274,232 L126,232 Z" ${st}/>`;
        front = `<path d="M122,206 C112,116 154,68 200,68 C246,68 288,116 278,206 C272,170 262,146 246,130 C226,150 188,160 150,156 C140,170 130,186 122,206 Z" ${st}/>
          <path d="M128,200 C124,236 128,262 136,282" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
          <path d="M246,130 C258,146 268,166 274,190" fill="none" stroke="${d}" stroke-width="2"/>
          ${strands('M150,120 Q196,140 240,124 M140,150 Q180,150 220,136')}${shine(8)}`;
        break;
      case 'male_two':
        back = `<path d="M126,214 C112,124 150,70 200,70 C250,70 288,124 274,214 L266,232 L134,232 Z" ${st}/>`;
        front = `<path d="M128,200 C118,120 156,72 200,72 C244,72 282,120 272,200 L270,168 ${fringe(270, 130, 132, 180, 5, -5)} L130,168 Z" ${st}/>
          <path d="M130,170 L134,214 L142,186 Z M270,170 L266,214 L258,186 Z" fill="${d}" stroke="${HL}" stroke-width="2"/>
          ${strands('M206,82 Q196,120 190,170 M170,90 Q160,124 154,170')}${shine()}`;
        break;
      case 'female_short':
        back = `<path d="M116,210 C102,116 150,62 200,62 C250,62 298,116 284,210 L280,256 L120,256 Z" ${st}/>`;
        front = `<path d="M120,214 C110,114 154,66 200,66 C246,66 290,114 280,214 L276,250 C272,212 270,188 266,168 ${fringe(266, 134, 138, 166, 6, 3)} C130,188 128,212 124,250 Z" ${st}/>
          ${strands('M196,76 Q190,110 196,140 M232,86 Q238,120 232,150')}${shine()}`;
        break;
      case 'female_wave':
        back = `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C302,262 278,300 300,352 C320,404 290,432 314,486 L86,486 C110,432 80,404 100,352 C122,300 98,262 114,200 Z" ${st}/>
          ${strands('M104,330 Q124,380 100,430 M296,330 Q276,380 300,430')}`;
        front = `<path d="M120,214 C108,112 154,64 200,64 C246,64 292,112 280,214 C292,260 276,300 294,340 L270,330 C268,260 268,200 266,168 ${fringe(266, 134, 140, 168, 7, 2)} C132,200 132,260 130,330 L106,340 C124,300 108,260 120,214 Z" ${st}/>
          ${strands('M200,74 Q196,110 200,142 M168,84 Q164,120 172,148')}${shine()}`;
        break;
      /* ===== 트렌드 헤어: 남성 ===== */
      case 'm_comma': // 쉼표머리: 한쪽으로 쓸어 넘긴 앞머리 끝이 눈썹 위에서 C자로 말림
        back = `<path d="M124,214 C110,122 152,70 202,70 C252,70 290,122 276,214 L270,240 L130,240 Z" ${st}/>`;
        front = `<path d="M126,204 C114,120 156,72 204,72 C252,74 288,120 276,204 C272,182 266,166 256,156 C262,172 256,186 242,186 C230,186 226,174 234,166 C226,158 204,154 184,152 C164,150 146,162 138,182 L132,204 Z" ${st}/>
          <path d="M242,186 C232,184 230,172 238,168" fill="none" stroke="${d}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M128,196 L134,236 L142,204 Z M272,196 L266,236 L258,204 Z" fill="${F}" stroke="${HL}" stroke-width="2"/>
          ${strands('M150,112 Q196,124 248,150 M144,140 Q190,138 236,160 M170,90 Q220,96 262,130')}${shine(6)}`;
        break;
      case 'm_part': // 가르마펌: 6:4 가르마 + 볼륨 컬, 이마 살짝 보임
        back = `<path d="M122,214 C108,120 150,66 202,66 C254,66 292,120 278,214 L272,240 L128,240 Z" ${st}/>`;
        front = `<path d="M124,206 C112,118 154,66 202,66 C252,66 290,118 278,206 L272,184 C266,160 250,140 228,128 C212,122 196,120 182,118 C164,128 150,146 142,170 C140,180 138,192 134,206 Z" ${st}/>
          <path d="M182,118 C168,136 156,158 150,186 C144,170 144,150 152,134 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M184,118 C214,124 246,140 266,170" fill="none" stroke="${d}" stroke-width="2.5"/>
          ${strands('M184,80 Q182,100 182,118 M150,104 Q160,124 166,140 M222,88 Q246,104 262,140 M136,150 Q140,170 140,190')}${shine(10)}`;
        break;
      case 'm_dandy': // 댄디컷: 눈썹 위까지 내려오는 단정하고 부드러운 앞머리
        back = `<path d="M124,214 C110,122 152,70 200,70 C248,70 290,122 276,214 L268,238 L132,238 Z" ${st}/>`;
        front = `<path d="M126,206 C116,120 156,72 200,72 C244,72 284,120 274,206 L270,164 ${fringe(270, 130, 150, 168, 8, -2)} L130,164 Z" ${st}/>
          <path d="M128,190 L134,232 L142,198 Z M272,190 L266,232 L258,198 Z" fill="${F}" stroke="${HL}" stroke-width="2"/>
          ${strands('M200,82 Q196,120 194,156 M168,90 Q162,124 160,158 M232,90 Q236,124 234,158')}${shine()}`;
        break;
      case 'm_leaf': // 리프컷: 가운데서 갈라져 양옆으로 흐르는 앞머리
        back = `<path d="M120,226 C106,122 150,68 200,68 C250,68 294,122 280,226 L274,256 L126,256 Z" ${st}/>`;
        front = `<path d="M124,214 C112,120 154,70 200,70 C246,70 288,120 276,214 C274,196 268,182 256,176 C244,172 234,166 226,156 C216,146 208,140 201,126 C194,140 186,146 176,156 C168,166 156,172 144,176 C132,182 126,196 124,214 Z" ${st}/>
          <path d="M201,128 C196,146 184,158 170,166 M201,128 C206,146 218,158 232,166" fill="none" stroke="${d}" stroke-width="2.2"/>
          <path d="M124,200 C118,226 124,246 134,258 L140,214 Z M276,200 C282,226 276,246 266,258 L260,214 Z" fill="${F}" stroke="${HL}" stroke-width="2"/>
          ${strands('M202,80 Q202,110 202,138 M180,86 Q166,120 150,150 M224,86 Q238,120 252,150')}${shine()}`;
        break;
      /* ===== 트렌드 헤어: 여성 ===== */
      case 'f_hush': // 허쉬컷: 어깨선 레이어드 + 얼굴 감싸는 사이드 + 시스루뱅
        back = `<path d="M114,200 C100,108 150,62 200,62 C250,62 300,108 286,200 C292,258 300,298 314,332 C294,322 282,340 262,334 L138,334 C118,340 106,322 86,332 C100,298 108,258 114,200 Z" ${st}/>
          ${strands('M108,280 Q104,306 94,326 M292,280 Q296,306 306,326')}`;
        front = `${capOpen(st)}${seeThru(F, d)}
          <path d="M124,186 C112,236 120,276 152,302 C136,272 134,236 140,198 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M276,186 C288,236 280,276 248,302 C264,272 266,236 260,198 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>${shine()}`;
        break;
      case 'f_ccurl': // C컬 단발(태슬): 턱선에서 안으로 말리는 단발 + 시스루뱅
        back = `<path d="M116,200 C102,108 150,62 200,62 C250,62 298,108 284,200 C292,250 292,284 270,302 C260,308 248,304 246,296 L154,296 C152,304 140,308 130,302 C108,284 108,250 116,200 Z" ${st}/>`;
        front = `${capOpen(st)}${seeThru(F, d)}
          <path d="M124,194 C114,246 120,284 152,300 C138,280 134,244 140,204 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M276,194 C286,246 280,284 248,300 C262,280 266,244 260,204 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M150,298 Q140,292 140,280 M250,298 Q260,292 260,280" fill="none" stroke="${d}" stroke-width="2"/>${shine()}`;
        break;
      case 'f_seewave': // 시스루뱅 긴 웨이브
        back = `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C304,264 278,302 302,354 C322,404 292,434 316,488 L84,488 C108,434 78,404 98,354 C122,302 96,264 114,200 Z" ${st}/>
          ${strands('M104,330 Q126,380 102,432 M296,330 Q274,380 298,432')}`;
        front = `${capOpen(st)}${seeThru(F, d)}
          <path d="M124,190 C112,250 128,300 112,346 C134,320 140,260 140,204 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M276,190 C288,250 272,300 288,346 C266,320 260,260 260,204 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>${shine()}`;
        break;
      case 'f_layer': // 레이어드 롱: 가르마 + 얼굴선 레이어
        back = `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C294,300 300,400 312,486 L88,486 C100,400 106,300 114,200 Z" ${st}/>
          ${strands('M110,300 Q102,400 106,470 M290,300 Q298,400 294,470')}`;
        front = `<path d="M122,212 C110,114 154,64 206,64 C252,66 292,114 280,212 C278,180 268,150 246,132 C230,124 214,122 206,120 C190,132 168,140 150,160 C136,176 128,194 122,212 Z" ${st}/>
          <path d="M206,120 C186,140 160,156 146,190 C140,212 142,240 132,268 C122,236 124,200 136,170 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M270,170 C284,220 280,262 290,300 C268,276 262,236 262,196 Z" fill="${F}" stroke="${HL}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M206,70 L206,120" stroke="${d}" stroke-width="2"/>${shine(8)}`;
        break;
      case 'perm': {
        let curls = '';
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI * (0.92 + i * 1.16 / 14);
          const x = 200 + 84 * Math.cos(a), y = 176 + 100 * Math.sin(a);
          curls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="24" ${st}/>`;
        }
        back = `<path d="M118,250 C100,110 150,70 200,70 C250,70 300,110 282,250 Z" ${st}/>${curls}`;
        let fc = '';
        [[146, 124], [172, 108], [200, 102], [228, 108], [254, 124], [136, 150], [264, 150]].forEach(([x, y]) => {
          fc += `<circle cx="${x}" cy="${y}" r="20" ${st}/><path d="M${x - 8},${y} q8,-10 16,0" fill="none" stroke="${d}" stroke-width="2"/>`;
        });
        front = fc + `<path d="M126,180 C120,212 124,236 130,250 L140,200 Z M274,180 C280,212 276,236 270,250 L260,200 Z" ${st}/>`;
        break;
      }
      case 'bun':
        back = `<circle cx="200" cy="72" r="30" ${st}/>
          <path d="M150,66 L252,58" stroke="#c9a227" stroke-width="5" stroke-linecap="round"/>
          <path d="M124,210 C112,120 152,80 200,80 C248,80 288,120 276,210 L268,232 L132,232 Z" ${st}/>`;
        front = `<path d="M128,204 C120,124 158,84 200,84 C242,84 280,124 272,204 C266,160 244,120 200,114 C156,120 134,160 128,204 Z" ${st}/>
          <path d="M200,86 L200,114" stroke="${d}" stroke-width="2.5"/>
          ${strands('M190,96 Q160,110 142,150 M210,96 Q240,110 258,150')}`;
        break;
      case 'bald':
        front = `<path d="M128,222 C116,190 120,160 136,142 C144,168 142,196 142,228 Z" ${st}/>
          <path d="M272,222 C284,190 280,160 264,142 C256,168 258,196 258,228 Z" ${st}/>
          <path d="M168,104 Q196,92 222,100" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/>`;
        break;
      case 'grey_side':
        back = `<path d="M124,214 C112,130 150,84 202,84 C252,84 290,130 276,214 L268,236 L132,236 Z" ${st}/>`;
        front = `<path d="M126,206 C116,132 154,86 206,86 C252,88 286,132 276,206 L270,176 C264,150 250,130 236,122 C226,140 196,148 168,146 C150,156 136,180 130,204 Z" ${st}/>
          ${strands('M156,118 Q196,128 232,116')}`;
        break;
    }
    return { back, front };
  }

  /* ---------------- 눈 ---------------- */
  function eyeLeft(s, expr, id) {
    const iris = s.eyeColor || '#5a3d2b';
    const shape = s.eye || 'round';
    if (expr === 'happy' || shape === 'closed') {
      return `<path d="M146,210 Q166,190 188,210" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>`;
    }
    if (shape === 'narrow') {
      const tilt = expr === 'angry' ? 'M146,200 Q166,206 188,212' : 'M146,206 Q166,198 188,206';
      return `<path d="${tilt}" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>
        <path d="M152,212 Q166,218 182,212" fill="none" stroke="${LINE}" stroke-width="1.5" opacity=".5"/>`;
    }
    const sharp = shape === 'sharp' || shape === 'cat' || shape === 'almond';
    const ry = sharp ? 13 : 18, rx = sharp ? 12 : 14;
    const top = sharp ? 'M142,204 Q164,186 192,198' : 'M141,206 Q164,178 193,198';
    const sur = expr === 'surprised';
    const lidY = expr === 'angry' ? 4 : 0;
    const irx = sur ? rx - 2 : rx, iry = sur ? ry - 2 : ry, icy = sharp ? 207 : 209;
    const lidC = shade(s.skin || '#ffe3d1', -0.32);
    return `
      <defs>
        <clipPath id="ec${id}"><path d="M142,206 Q164,${sharp ? 186 : 180 + lidY} 192,200 Q190,${sharp ? 222 : 230} 166,${sharp ? 222 : 230} Q146,${sharp ? 222 : 228} 142,206 Z"/></clipPath>
        <linearGradient id="ig${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${shade(iris, -0.62)}"/><stop offset=".45" stop-color="${shade(iris, -0.1)}"/><stop offset=".8" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, 0.5)}"/>
        </linearGradient>
        <linearGradient id="ew${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ddd5e4"/><stop offset=".45" stop-color="#fbf9fd"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      </defs>
      <path d="M142,206 Q164,${sharp ? 186 : 180 + lidY} 192,200 Q190,${sharp ? 222 : 230} 166,${sharp ? 222 : 230} Q146,${sharp ? 222 : 228} 142,206 Z" fill="url(#ew${id})"/>
      <g clip-path="url(#ec${id})">
        <ellipse cx="168" cy="${icy}" rx="${irx}" ry="${iry}" fill="url(#ig${id})" stroke="${shade(iris, -0.6)}" stroke-width="1.4"/>
        <ellipse cx="168" cy="${icy}" rx="${irx - 3}" ry="${iry - 3}" fill="none" stroke="${shade(iris, -0.35)}" stroke-width="1" opacity=".55"/>
        <ellipse cx="168" cy="${icy + iry * 0.5}" rx="${irx * 0.6}" ry="${iry * 0.3}" fill="${shade(iris, 0.7)}" opacity=".5"/>
        <ellipse cx="168" cy="${icy + 1}" rx="${sur ? 3 : 5.5}" ry="${sur ? 4 : (sharp ? 6.5 : 8.5)}" fill="#1d1416"/>
        <ellipse cx="161.5" cy="${icy - iry * 0.45}" rx="${sharp ? 3.2 : 4.4}" ry="${sharp ? 4.2 : 5.8}" fill="#fff" transform="rotate(-22 161.5 ${icy - iry * 0.45})"/>
        <circle cx="174.5" cy="${icy + iry * 0.42}" r="2.2" fill="#fff" opacity=".9"/>
        <circle cx="171" cy="${icy - iry * 0.2}" r="1.2" fill="#fff" opacity=".85"/>
        <path d="M142,196 Q166,${186 + lidY} 194,196 L194,188 L142,188 Z" fill="${shade(iris, -0.7)}" opacity=".28"/>
      </g>
      ${shape === 'sleepy' ? `<path d="M136,178 L198,178 L198,${expr === 'surprised' ? 192 : 201} Q166,${expr === 'surprised' ? 186 : 197} 136,${expr === 'surprised' ? 196 : 204} Z" fill="${s.skin || '#ffe3d1'}"/>
        <path d="M141,${expr === 'surprised' ? 197 : 205} Q166,${expr === 'surprised' ? 186 : 196} 194,${expr === 'surprised' ? 193 : 201}" fill="none" stroke="${LINE}" stroke-width="5" stroke-linecap="round"/>` :
      `<path d="${sharp ? 'M194,197 Q166,182 142,203 L135,206 Q133,201 139,198 Q164,176 196,193 Z' : 'M194,198 Q166,174 141,205 L134,207 Q131,202 137,198 Q163,166 196,193 Z'}" fill="${LINE}"/>
       <path d="${sharp ? 'M146,190 Q166,180 188,187' : 'M146,188 Q166,173 189,184'}" fill="none" stroke="${lidC}" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>`}
      ${s.lashes ? `<path d="M140,201 L132,196 M144,196 L138,188 M150,192 L147,185" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>
        <path d="M146,${sharp ? 221 : 227} L141,${sharp ? 224 : 231}" stroke="${LINE}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>` : ''}
      <path d="M150,${sharp ? 222 : 229} Q168,${sharp ? 226 : 234} 186,${sharp ? 220 : 226}" fill="none" stroke="${LINE}" stroke-width="1.6" opacity=".55"/>`;
  }

  function eyes(s, expr, id) {
    const k = s.eyeScale || (s.eye === 'sharp' || s.eye === 'cat' || s.eye === 'almond' ? 1.1 : s.eye === 'narrow' ? 1 : 1.2);
    const rot = s.eye === 'droopy' ? -9 : s.eye === 'cat' ? 10 : 0;
    const g = (inner) => `<g transform="translate(168,210) rotate(${rot}) scale(${k}) translate(-168,-210)">${inner}</g>`;
    return g(eyeLeft(s, expr, id + 'a')) + mirror(g(eyeLeft(s, expr, id + 'b')));
  }
  function brows(s, expr) {
    const c = s.browColor || shade(s.hair.color, -0.3);
    const w = s.thickBrows ? 7 : 4;
    let d;
    if (expr === 'angry' || expr === 'shout') d = 'M146,170 Q168,174 190,186';
    else if (expr === 'sad' || expr === 'worried') d = 'M146,182 Q166,172 188,170';
    else if (expr === 'surprised') d = 'M146,166 Q166,156 188,164';
    else d = s.brow === 'stern' ? 'M146,176 Q168,174 190,180' : 'M146,178 Q166,168 188,174';
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${shade(c, 0.35)}" stroke-width="${Math.max(1, w - 3)}" stroke-linecap="round" opacity=".45" transform="translate(2,-1)"/>`;
  }

  function mouth(expr, s) {
    switch (expr) {
      case 'smile': return `<path d="M184,258 Q200,274 216,258" fill="none" stroke="#6e3238" stroke-width="3" stroke-linecap="round"/>`;
      case 'happy': return `<path d="M181,255 Q200,286 219,255 Z" fill="#a3343f" stroke="#6e3238" stroke-width="2.5" stroke-linejoin="round"/><path d="M190,268 Q200,262 210,268 Q206,278 200,279 Q194,278 190,268 Z" fill="#ff8a8a"/>`;
      case 'angry': return `<path d="M186,270 Q200,258 214,270" fill="none" stroke="#6e3238" stroke-width="3" stroke-linecap="round"/>`;
      case 'shout': return `<ellipse cx="200" cy="268" rx="14" ry="12" fill="#7a2230" stroke="#6e3238" stroke-width="2.5"/><path d="M190,274 Q200,268 210,274 Q204,280 196,280 Z" fill="#ff8a8a"/>`;
      case 'surprised': return `<ellipse cx="200" cy="268" rx="7" ry="9" fill="#7a2230" stroke="#6e3238" stroke-width="2.5"/>`;
      case 'sad': case 'worried': return `<path d="M188,270 Q200,262 212,270" fill="none" stroke="#6e3238" stroke-width="3" stroke-linecap="round"/>`;
      case 'smirk': return `<path d="M186,264 Q204,270 216,258" fill="none" stroke="#6e3238" stroke-width="3" stroke-linecap="round"/>`;
      default: return `<path d="M189,264 Q200,269 211,264" fill="none" stroke="#6e3238" stroke-width="2.8" stroke-linecap="round"/><path d="M195,271 Q200,273 205,271" fill="none" stroke="#c98080" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
    }
  }

  /* ---------------- 의상 ---------------- */
  function outfit(o, s, id) {
    const m = o.main || '#2b3a67', md = shade(m, -0.3), ml = shade(m, 0.18);
    const st = `stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"`;
    const torso = `M46,600 C46,468 64,400 140,374 L170,360 L230,360 L260,374 C336,400 354,468 354,600 Z`;
    const shirt = o.shirt || '#f7f8fc';
    const collar = `<path d="M170,356 L186,392 L200,372 Z M230,356 L214,392 L200,372 Z" fill="${shirt}" ${st}/>`;
    const tie = (tc) => `<path d="M193,378 L207,378 L211,396 L205,474 L200,482 L195,474 L189,396 Z" fill="${tc}" ${st}/><path d="M192,370 L208,370 L206,384 L194,384 Z" fill="${shade(tc, -0.2)}" ${st}/>
      <path d="M196,404 L206,412 M195,424 L207,434 M195,446 L206,456" stroke="${shade(tc, 0.3)}" stroke-width="2.5"/>`;
    const ribbon = (rc) => `<path d="M200,380 L176,370 L178,394 Z M200,380 L224,370 L222,394 Z" fill="${rc}" ${st}/><circle cx="200" cy="381" r="6" fill="${shade(rc, -0.2)}" ${st}/>`;
    let g = '';
    switch (o.type) {
      case 'suit': {
        const v = s.gender === 'f' ? 'M172,362 L200,446 L228,362 Z' : 'M170,362 L200,450 L230,362 Z';
        g = `<path d="${torso}" fill="url(#cl${id})" ${st}/>
          <path d="${v}" fill="${shirt}" ${st}/>
          ${s.gender === 'f' ? (o.ribbon ? ribbon(o.ribbon) : `<path d="M180,370 Q200,400 220,370" fill="none" stroke="${o.necklace || '#e9d8a6'}" stroke-width="3"/>`) : collar + tie(o.tie || '#9b2335')}
          <path d="M168,362 L140,392 L162,420 L150,436 L188,508 L200,450 Z" fill="${md}" ${st}/>
          <path d="M232,362 L260,392 L238,420 L250,436 L212,508 L200,450 Z" fill="${md}" ${st}/>
          <path d="M200,450 L200,600" stroke="${md}" stroke-width="2"/>
          <circle cx="206" cy="530" r="5" fill="${md}" ${st}/><circle cx="206" cy="566" r="5" fill="${md}" ${st}/>
          <path d="M92,470 Q100,520 96,600 M308,470 Q300,520 304,600" fill="none" stroke="${md}" stroke-width="3" opacity=".7"/>
          <path d="M110,430 Q140,400 166,380" fill="none" stroke="${ml}" stroke-width="5" opacity=".5" stroke-linecap="round"/>`;
        if (o.vest) g += `<path d="M178,440 L200,470 L222,440 L226,600 L174,600 Z" fill="${shade(m, -0.15)}" opacity=".9"/>`;
        break;
      }
      case 'shirt':
        g = `<path d="${torso}" fill="${shirt}" ${st}/>
          <path d="M200,372 L200,600" stroke="#c9cfdc" stroke-width="2"/>
          <circle cx="200" cy="420" r="3" fill="#c9cfdc"/><circle cx="200" cy="470" r="3" fill="#c9cfdc"/><circle cx="200" cy="520" r="3" fill="#c9cfdc"/>
          <path d="M96,470 Q104,520 100,600 M304,470 Q296,520 300,600" fill="none" stroke="#d7dbe6" stroke-width="3"/>
          ${collar}${o.tie ? tie(o.tie) : ''}`;
        break;
      case 'blouse':
        g = `<path d="${torso}" fill="${shirt}" ${st}/>
          <path d="M120,450 Q150,470 160,600 M280,450 Q250,470 240,600" fill="none" stroke="${shade(shirt, -0.12)}" stroke-width="3"/>
          ${ribbon(o.ribbon || '#d94f70')}`;
        break;
      case 'cardigan':
        g = `<path d="${torso}" fill="${o.inner || '#fff7ea'}" ${st}/>
          <path d="M168,362 C130,374 50,410 46,600 L178,600 L186,420 Z" fill="url(#cl${id})" ${st}/>
          <path d="M232,362 C270,374 350,410 354,600 L222,600 L214,420 Z" fill="url(#cl${id})" ${st}/>
          <circle cx="182" cy="470" r="4.5" fill="${md}"/><circle cx="182" cy="520" r="4.5" fill="${md}"/><circle cx="181" cy="570" r="4.5" fill="${md}"/>
          <path d="M80,520 L100,520 M76,540 L98,540 M300,520 L320,520 M302,540 L324,540" stroke="${md}" stroke-width="2" opacity=".6"/>
          ${o.necklace ? `<path d="M174,372 Q200,410 226,372" fill="none" stroke="${o.necklace}" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/>` : ''}`;
        break;
      case 'vest':
        g = `<path d="${torso}" fill="${shirt}" ${st}/>${collar}${o.tie ? tie(o.tie) : ''}
          <path d="M160,368 C130,390 110,440 104,600 L296,600 C290,440 270,390 240,368 L214,440 L200,520 L186,440 Z" fill="url(#cl${id})" ${st}/>
          <path d="M200,520 L200,600" stroke="${md}" stroke-width="2"/>
          <path d="M120,560 L180,560 M220,560 L280,560" stroke="${md}" stroke-width="2" opacity=".5"/>`;
        break;
      case 'jumper':
        g = `<path d="${torso}" fill="url(#cl${id})" ${st}/>
          <path d="M164,352 L176,392 L200,382 L224,392 L236,352 Q200,366 164,352 Z" fill="${md}" ${st}/>
          <path d="M200,382 L200,600" stroke="#c0c4cc" stroke-width="3"/>
          <rect x="196" y="420" width="8" height="14" rx="2" fill="#c0c4cc"/>
          <path d="M110,480 L170,470 M230,470 L290,480" stroke="${md}" stroke-width="3"/>
          <rect x="226" y="490" width="56" height="8" rx="3" fill="${md}"/>`;
        break;
      case 'hoodie':
        g = `<path d="${torso}" fill="url(#cl${id})" ${st}/>
          <path d="M146,370 Q200,420 254,370 Q240,350 200,350 Q160,350 146,370 Z" fill="${md}" ${st}/>
          <path d="M186,396 L184,460 M214,396 L216,460" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          <path d="M150,530 L250,530 L240,590 L160,590 Z" fill="none" stroke="${md}" stroke-width="2.5"/>`;
        break;
      case 'hanbok_vest':
        g = `<path d="${torso}" fill="${o.inner || '#f3e9dc'}" ${st}/>
          <path d="M168,362 C130,374 50,410 46,600 L190,600 L196,430 Z" fill="url(#cl${id})" ${st}/>
          <path d="M232,362 C270,374 350,410 354,600 L210,600 L204,430 Z" fill="url(#cl${id})" ${st}/>
          <path d="M160,372 L200,440 L240,372" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>
          <circle cx="194" cy="470" r="6" fill="#c9a227" ${st}/>`;
        break;
    }
    // 공통 음영: 어깨 하이라이트 · 겨드랑이 그림자 · 칼라 아래 그림자
    g += `<path d="M66,452 Q84,402 140,380" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".13"/>
      <path d="M96,600 Q92,520 104,470 M304,600 Q308,520 296,470" fill="none" stroke="#000" stroke-width="10" opacity=".07"/>
      <path d="M176,366 Q200,382 224,366" fill="none" stroke="#000" stroke-width="6" opacity=".08"/>`;
    // 액세서리
    const acc = o.acc || [];
    if (acc.includes('lanyard')) g += `<path d="M176,364 L222,470 M224,364 L226,470" stroke="#2f6fd6" stroke-width="5"/>
        <rect x="204" y="466" width="44" height="58" rx="5" fill="#fff" ${st}/><rect x="204" y="466" width="44" height="14" rx="5" fill="#2f6fd6"/>
        <circle cx="226" cy="496" r="8" fill="#ffd9c2"/><path d="M212,514 L240,514" stroke="#99a" stroke-width="3"/>`;
    if (acc.includes('namecard')) g += `<rect x="236" y="430" width="38" height="18" rx="2" fill="#fff" ${st} transform="rotate(-6 255 439)"/><path d="M244,437 L262,435" stroke="#2f6fd6" stroke-width="2.5"/>`;
    if (acc.includes('pin')) g += `<circle cx="150" cy="430" r="7" fill="#2f6fd6" ${st}/>`;
    if (acc.includes('badge_bronze')) g += medal(150, 432, '#cd7f32');
    if (acc.includes('badge_silver')) g += medal(150, 432, '#c0c6d0');
    if (acc.includes('badge_gold')) g += medal(150, 432, '#f2c641');
    if (acc.includes('pocket_square')) g += `<path d="M236,428 L248,412 L254,424 L262,410 L270,428 Z" fill="${o.square || '#f2c641'}" ${st}/>`;
    if (acc.includes('scarf')) g += `<path d="M168,360 Q200,392 232,360 L238,380 Q200,416 162,380 Z" fill="#c9302c" ${st}/>`;
    return g;
  }
  function medal(x, y, c) {
    return `<g><path d="M${x - 8},${y - 22} L${x - 2},${y - 4} L${x + 8},${y - 22} Z" fill="#c9302c" stroke="${LINE}" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="12" fill="${c}" stroke="${LINE}" stroke-width="2.5"/>
      <path d="M${x},${y - 6} L${x + 2},${y - 1} L${x + 6},${y - 1} L${x + 3},${y + 2} L${x + 4},${y + 7} L${x},${y + 4} L${x - 4},${y + 7} L${x - 3},${y + 2} L${x - 6},${y - 1} L${x - 2},${y - 1} Z" fill="#fff" opacity=".85"/></g>`;
  }

  /* ---------------- 얼굴형 ---------------- */
  const FACE = {
    oval: 'M132,186 C130,120 164,90 200,90 C236,90 270,120 268,186 C267,230 250,264 224,290 C212,301 188,301 176,290 C150,264 133,230 132,186 Z',
    round: 'M130,186 C128,118 164,88 200,88 C236,88 272,118 270,186 C270,238 256,270 230,292 C214,303 186,303 170,292 C144,270 130,238 130,186 Z',
    slim: 'M134,186 C132,120 165,90 200,90 C235,90 268,120 266,186 C265,226 248,262 214,296 C206,304 194,304 186,296 C152,262 135,226 134,186 Z'
  };

  /* ---------------- 초상화 ---------------- */
  function portrait(s, expr = 'normal', opts = {}) {
    const id = 'p' + (uid++);
    const skin = s.skin || '#ffe3d1';
    const skinS = shade(skin, -0.13);
    const h = hair(s.hair.style, s.hair.color, id);
    const vb = opts.head ? '94 74 212 212' : opts.bust ? '40 60 320 400' : '0 0 400 600';
    const aura = s.aura ? `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>
      <circle cx="200" cy="300" r="230" fill="url(#au${id})"/>
      ${[[70, 120], [330, 160], [90, 380], [320, 420], [200, 40], [40, 260], [360, 300]].map(([x, y], i) => `<path class="spark" style="animation-delay:${i * 0.3}s" d="M${x},${y - 12} L${x + 3},${y - 3} L${x + 12},${y} L${x + 3},${y + 3} L${x},${y + 12} L${x - 3},${y + 3} L${x - 12},${y} L${x - 3},${y - 3} Z" fill="#fff6c8"/>`).join('')}` : '';
    const blush = s.blush || expr === 'happy' ? `<ellipse cx="150" cy="243" rx="19" ry="9" fill="url(#bl${id})"/><ellipse cx="250" cy="243" rx="19" ry="9" fill="url(#bl${id})"/>
       <path d="M143,241 L148,237 M151,243 L156,239 M244,241 L249,237 M252,243 L257,239" stroke="#e8577a" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>` : '';
    const skinD = shade(skin, -0.22), fc = FACE[s.face] || FACE.oval;
    // 앞머리가 이마에 드리우는 그림자 (앞머리 모양을 아래로 밀어 얼굴 안에만 칠함)
    const hairShadow = `<style>.hs${id} [fill="none"]{display:none}.hs${id} *{fill:${skinD}!important;stroke:none!important;opacity:1!important}</style>
      <g clip-path="url(#fc${id})" opacity=".32"><g class="hs${id}" filter="url(#bf${id})" transform="translate(2,9)">${h.front}</g></g>`;
    const faceShade = `<g clip-path="url(#fc${id})"><ellipse cx="292" cy="226" rx="58" ry="116" fill="${skinD}" opacity=".22"/>
      <path d="M150,262 Q200,318 250,262 L250,320 L150,320 Z" fill="${skinD}" opacity=".18"/><ellipse cx="172" cy="150" rx="40" ry="18" fill="#fff" opacity=".12"/></g>`;
    const ageLines = (s.age || 20) >= 40 && !s.wrinkles ? `<path d="M179,248 Q175,258 180,268 M221,248 Q225,258 220,268${s.age >= 50 ? ' M140,214 Q135,218 133,223 M260,214 Q265,218 267,223 M172,146 Q200,140 228,146' : ''}" fill="none" stroke="${skinS}" stroke-width="2" stroke-linecap="round" opacity=".7"/>` : '';
    const greyStreak = (s.age || 20) >= 50 ? `<path d="M158,96 Q186,118 182,158 M228,92 Q238,118 234,150 M140,130 Q150,150 146,176" fill="none" stroke="#d9d9e2" stroke-width="5" stroke-linecap="round" opacity=".85"/>` : '';
    const wrinkles = s.wrinkles ? `<path d="M140,214 Q134,218 132,224 M260,214 Q266,218 268,224 M178,246 Q172,258 178,272 M222,246 Q228,258 222,272 M168,140 Q200,132 232,140 M174,150 Q200,144 226,150" fill="none" stroke="${skinS}" stroke-width="2.2" stroke-linecap="round"/>` : '';
    const beard = s.beard === 'mustache' ? `<path d="M176,252 Q188,244 200,250 Q212,244 224,252 Q214,260 200,254 Q186,260 176,252 Z" fill="${s.beardColor || s.hair.color}" stroke="${LINE}" stroke-width="2"/>`
      : s.beard === 'stubble' ? `<path d="M150,250 Q160,292 200,298 Q240,292 250,250" fill="none" stroke="${skinS}" stroke-width="10" opacity=".35"/>` : '';
    const glasses = s.glasses === 'round'
      ? `<g fill="rgba(200,230,255,.18)" stroke="${s.glassesColor || '#5b4636'}" stroke-width="3.2"><circle cx="166" cy="207" r="27"/><circle cx="234" cy="207" r="27"/><path d="M193,204 Q200,198 207,204 M139,202 L126,196 M261,202 L274,196" fill="none"/></g>`
      : s.glasses === 'square'
        ? `<g fill="rgba(200,230,255,.16)" stroke="${s.glassesColor || '#2a2a33'}" stroke-width="3.2"><rect x="138" y="188" width="56" height="38" rx="9"/><rect x="206" y="188" width="56" height="38" rx="9"/><path d="M194,204 L206,204 M138,200 L126,196 M262,200 L274,196" fill="none"/></g>
           <path d="M146,194 L158,190" stroke="#fff" stroke-width="3" opacity=".7"/><path d="M214,194 L226,190" stroke="#fff" stroke-width="3" opacity=".7"/>`
        : s.glasses === 'thin'
          ? `<g fill="rgba(220,235,255,.12)" stroke="${s.glassesColor || '#9a9aa6'}" stroke-width="2"><ellipse cx="166" cy="208" rx="25" ry="21"/><ellipse cx="234" cy="208" rx="25" ry="21"/><path d="M191,205 Q200,200 209,205 M141,204 L126,198 M259,204 L274,198" fill="none"/></g>`
        : s.glasses === 'half'
          ? `<g fill="none" stroke="${s.glassesColor || '#8a6d3b'}" stroke-width="3"><path d="M138,206 L194,206 Q192,228 166,228 Q140,228 138,206 Z M206,206 L262,206 Q260,228 234,228 Q208,228 206,206 Z M194,208 L206,208"/></g>` : '';
    const earrings = s.earrings ? `<circle cx="132" cy="226" r="5" fill="${s.earrings}" stroke="${LINE}" stroke-width="1.5"/><circle cx="268" cy="226" r="5" fill="${s.earrings}" stroke="${LINE}" stroke-width="1.5"/>` : '';
    const sweat = expr === 'worried' ? `<path d="M276,150 Q284,166 276,172 Q268,166 276,150 Z" fill="#9fd3ff" stroke="${LINE}" stroke-width="1.5"/>` : '';

    return `<svg class="portrait" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="sk${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(skin, 0.06)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.05)}"/></linearGradient>
        <linearGradient id="hg${id}" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="420"><stop offset="0" stop-color="${shade(s.hair.color, 0.14)}"/><stop offset=".35" stop-color="${s.hair.color}"/><stop offset="1" stop-color="${shade(s.hair.color, -0.3)}"/></linearGradient>
        <linearGradient id="cl${id}" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="${shade((s.outfit && s.outfit.main) || '#2b3a67', 0.16)}"/><stop offset=".55" stop-color="${(s.outfit && s.outfit.main) || '#2b3a67'}"/><stop offset="1" stop-color="${shade((s.outfit && s.outfit.main) || '#2b3a67', -0.22)}"/></linearGradient>
        <radialGradient id="bl${id}"><stop offset="0" stop-color="#ff7f99" stop-opacity=".55"/><stop offset="1" stop-color="#ff7f99" stop-opacity="0"/></radialGradient>
        <clipPath id="fc${id}"><path d="${fc}"/></clipPath>
        <filter id="bf${id}" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="2.6"/></filter>
      </defs>
      ${aura}
      <g transform="translate(200,238) scale(1.14) translate(-200,-200)">${h.back}</g>
      <path d="M184,290 L184,352 Q200,362 216,352 L216,290 Z" fill="${skinS}" stroke="${LINE}" stroke-width="2.5"/>
      <path d="M184,322 Q200,354 216,322 L216,346 Q200,366 184,346 Z" fill="${skinD}" opacity=".5"/>
      ${outfit(s.outfit, s, id)}
      <g transform="translate(200,238) scale(1.14) translate(-200,-200)">
      <ellipse cx="131" cy="208" rx="11" ry="17" fill="${skin}" stroke="${LINE}" stroke-width="2.5"/>
      <ellipse cx="269" cy="208" rx="11" ry="17" fill="${skin}" stroke="${LINE}" stroke-width="2.5"/>
      <path d="M134,198 Q127,207 133,218 M266,198 Q273,207 267,218" fill="none" stroke="${skinD}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
      ${earrings}
      <path d="${fc}" fill="url(#sk${id})" stroke="${LINE}" stroke-width="2.5"/>
      ${faceShade}${hairShadow}
      ${blush}${wrinkles}${ageLines}
      ${eyes(s, expr, id)}
      ${brows(s, expr)}${mirror(brows(s, expr))}
      <path d="M201,229 Q206,239 200,244 Q197,245 195,243" fill="none" stroke="${skinD}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="197.5" cy="235" r="1.6" fill="#fff" opacity=".7"/>
      ${s.gender === 'f' && !s.wrinkles ? `<ellipse cx="200" cy="271" rx="7" ry="2.6" fill="#f08a96" opacity=".35"/>` : ''}
      ${mouth(expr, s)}${beard}
      ${h.front}${greyStreak}
      ${glasses}${sweat}
      </g>
    </svg>`;
  }

  /* ---------------- 배경 ---------------- */
  const BG = {
    office: () => `
      <defs><linearGradient id="bgw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3fa"/><stop offset="1" stop-color="#d8e1ee"/></linearGradient>
      <linearGradient id="bgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc3f0"/><stop offset="1" stop-color="#dff0ff"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#bgw)"/>
      <rect x="20" y="60" width="360" height="300" fill="url(#bgs)" stroke="#b8c4d6" stroke-width="6"/>
      ${skyline(20, 360, 360, '#9bb3cf', '#7f99b8')}
      <path d="M140,60 L140,360 M260,60 L260,360 M20,210 L380,210" stroke="#b8c4d6" stroke-width="5"/>
      <rect x="0" y="470" width="400" height="230" fill="#cdbca6"/><path d="M0,470 L400,470" stroke="#a8977f" stroke-width="4"/>
      <rect x="-10" y="430" width="160" height="70" fill="#f4f1ea" stroke="#b7ae9e" stroke-width="3"/>
      <rect x="20" y="370" width="70" height="56" rx="4" fill="#333a4a"/><rect x="26" y="376" width="58" height="42" fill="#8fd0ff"/>
      <rect x="260" y="430" width="160" height="70" fill="#f4f1ea" stroke="#b7ae9e" stroke-width="3"/>
      <rect x="300" y="370" width="70" height="56" rx="4" fill="#333a4a"/><rect x="306" y="376" width="58" height="42" fill="#b9f0c9"/>
      <path d="M210,440 q-30,-60 0,-90 q30,30 0,90 Z" fill="#5fae6b"/><rect x="196" y="440" width="28" height="34" fill="#d98c5f"/>
      <text x="200" y="40" text-anchor="middle" font-size="16" fill="#7c8aa3" font-weight="700">○○생명 방카슈랑스사업부</text>`,
    bank: () => `
      <defs><linearGradient id="bkw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3f4f2"/><stop offset="1" stop-color="#c8e4e0"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#bkw)"/>
      <rect x="0" y="0" width="400" height="44" fill="#1f7a72"/><text x="200" y="29" text-anchor="middle" font-size="18" fill="#fff" font-weight="800">△△은행  OO지점</text>
      <rect x="130" y="70" width="140" height="64" rx="8" fill="#222"/><text x="200" y="118" text-anchor="middle" font-size="40" fill="#ff4d4d" font-family="monospace" font-weight="700">0 2 3</text>
      <text x="200" y="152" text-anchor="middle" font-size="12" fill="#3c6b66">고객님 번호를 확인해 주세요</text>
      <rect x="20" y="170" width="100" height="150" rx="6" fill="#f8fbfb" stroke="#9cc5bf" stroke-width="3"/><text x="70" y="200" text-anchor="middle" font-size="13" fill="#1f7a72" font-weight="700">금융상품</text><text x="70" y="218" text-anchor="middle" font-size="13" fill="#1f7a72" font-weight="700">상담창구</text>
      <rect x="290" y="180" width="90" height="230" rx="6" fill="#d9dee3" stroke="#9aa3ab" stroke-width="3"/><rect x="304" y="200" width="62" height="50" fill="#5aa5d6"/><text x="335" y="290" text-anchor="middle" font-size="14" fill="#556">ATM</text>
      <rect x="0" y="430" width="400" height="270" fill="#bfa98d"/>
      <rect x="-10" y="400" width="420" height="40" fill="#8c6a4a"/><rect x="-10" y="440" width="420" height="80" fill="#d7c2a5"/>
      <rect x="40" y="356" width="60" height="44" rx="3" fill="#2d3340"/><rect x="300" y="356" width="60" height="44" rx="3" fill="#2d3340"/>
      <path d="M150,330 q-26,-50 0,-80 q26,30 0,80 Z" fill="#4f9e5f" opacity=".0"/>`,
    classroom: () => `
      <rect width="400" height="700" fill="#efe6d6"/>
      <rect x="30" y="70" width="340" height="230" rx="6" fill="#2f5d48" stroke="#8a6a46" stroke-width="10"/>
      <path d="M70,260 L70,100 M70,260 L330,260" stroke="#e8f0e8" stroke-width="3"/>
      <path d="M90,120 Q200,240 320,250" stroke="#ffe38a" stroke-width="3" fill="none"/><path d="M90,250 Q200,230 320,120" stroke="#9fe0ff" stroke-width="3" fill="none"/>
      <text x="300" y="135" font-size="16" fill="#9fe0ff">S</text><text x="300" y="242" font-size="16" fill="#ffe38a">D</text>
      <text x="110" y="290" font-size="13" fill="#e8f0e8">P = MC ... 기회비용!</text>
      <rect x="0" y="470" width="400" height="230" fill="#b99b78"/>
      <rect x="-20" y="440" width="150" height="40" fill="#d8b98e" stroke="#8a6a46" stroke-width="3"/><rect x="270" y="440" width="150" height="40" fill="#d8b98e" stroke="#8a6a46" stroke-width="3"/>
      <text x="200" y="40" text-anchor="middle" font-size="16" fill="#8a7357" font-weight="700">금융연수원 제3강의실</text>`,
    booth: () => `
      <rect width="400" height="700" fill="#f5ede2"/>
      <rect x="0" y="0" width="400" height="420" fill="#ece0cf"/>
      <rect x="40" y="80" width="140" height="180" rx="6" fill="#fff" stroke="#d4c3aa" stroke-width="4"/><path d="M60,220 L90,170 L120,200 L160,120" stroke="#3c8dde" stroke-width="5" fill="none"/>
      <rect x="230" y="70" width="140" height="100" fill="#e3f0fb" stroke="#d4c3aa" stroke-width="4"/>
      <text x="300" y="128" text-anchor="middle" font-size="14" fill="#3b6e9e" font-weight="700">방카 전용 상담</text>
      <rect x="0" y="420" width="400" height="280" fill="#c7ad8c"/><rect x="-10" y="440" width="420" height="50" fill="#9c7a57"/>`,
    meeting: () => `
      <rect width="400" height="700" fill="#e7e9ef"/>
      <rect x="30" y="60" width="160" height="110" fill="#fff" stroke="#b9bfcc" stroke-width="4"/><rect x="48" y="80" width="40" height="70" fill="#5b8def"/><rect x="98" y="100" width="40" height="50" fill="#9db8f5"/><rect x="148" y="90" width="26" height="60" fill="#f2c641"/>
      <rect x="230" y="60" width="140" height="240" fill="#a6c8e8" stroke="#b9bfcc" stroke-width="6"/>${skyline(230, 370, 300, '#7f9bb8', '#6b86a3')}
      <rect x="0" y="440" width="400" height="260" fill="#8d97a8"/><rect x="-10" y="430" width="420" height="40" fill="#5c4636"/>`,
    private_office: () => `
      <rect width="400" height="700" fill="#efe4d3"/>
      <rect x="20" y="50" width="200" height="290" fill="#a6c8e8" stroke="#8c6b4a" stroke-width="8"/>${skyline(20, 220, 340, '#86a3c2', '#6d89a8')}
      <rect x="250" y="40" width="130" height="380" fill="#7a5a3e"/>${books(258, 60)}${books(258, 160)}${books(258, 260)}
      <rect x="0" y="440" width="400" height="260" fill="#a07d5a"/><rect x="-10" y="420" width="420" height="40" fill="#5b3f2a"/>
      <rect x="150" y="390" width="80" height="30" rx="4" fill="#d8c08f"/><text x="190" y="411" text-anchor="middle" font-size="12" fill="#5b3f2a" font-weight="700">사업부장</text>`,
    vp: () => `
      <rect width="400" height="700" fill="#4b3526"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${i * 50}" y="0" width="48" height="440" fill="${i % 2 ? '#5a4030' : '#553b2c'}"/>`).join('')}
      <rect x="40" y="60" width="140" height="180" fill="#2a1d14" stroke="#c9a227" stroke-width="5"/><circle cx="110" cy="150" r="46" fill="#c9a227" opacity=".25"/><text x="110" y="158" text-anchor="middle" font-size="22" fill="#e8c96a">★</text>
      <rect x="230" y="40" width="140" height="380" fill="#3a2a1e"/>${books(238, 60)}${books(238, 160)}${books(238, 260)}
      <rect x="0" y="440" width="400" height="260" fill="#6b1f24"/><rect x="-10" y="420" width="420" height="44" fill="#2a1a12"/>`,
    ceo: () => `
      <defs><linearGradient id="nt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1330"/><stop offset="1" stop-color="#3a2a6b"/></linearGradient></defs>
      <rect width="400" height="700" fill="#1a1320"/>
      <rect x="10" y="40" width="380" height="380" fill="url(#nt)" stroke="#c9a227" stroke-width="6"/>
      ${skyline(10, 390, 420, '#141b3a', '#0f1430', true)}
      ${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 73) % 380 + 10}" cy="${(i * 37) % 150 + 50}" r="${i % 3 ? 1 : 1.8}" fill="#fff" opacity=".8"/>`).join('')}
      <circle cx="320" cy="100" r="24" fill="#fff4c4"/>
      <path d="M130,40 L130,420 M270,40 L270,420" stroke="#c9a227" stroke-width="4"/>
      <rect x="0" y="440" width="400" height="260" fill="#2b1d16"/><rect x="-10" y="420" width="420" height="44" fill="#14100c" stroke="#c9a227" stroke-width="3"/>`,
    vip: () => `
      <defs><radialGradient id="vg" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="#4d3a1a"/><stop offset="1" stop-color="#140f0a"/></radialGradient></defs>
      <rect width="400" height="700" fill="url(#vg)"/>
      ${[100, 200, 300].map(x => `<g><path d="M${x},0 L${x},60" stroke="#c9a227" stroke-width="2"/><circle cx="${x}" cy="74" r="16" fill="#ffe7a1" opacity=".85"/><circle cx="${x}" cy="74" r="38" fill="#ffd66b" opacity=".15"/></g>`).join('')}
      <text x="200" y="160" text-anchor="middle" font-size="22" fill="#c9a227" font-weight="800" letter-spacing="6">VIP LOUNGE</text>
      <rect x="0" y="440" width="400" height="260" fill="#2a1f14"/><rect x="-10" y="420" width="420" height="40" fill="#5a4220" stroke="#c9a227" stroke-width="3"/>`,
    inspect: () => `
      <rect width="400" height="700" fill="#d9dde3"/>
      <rect x="0" y="0" width="400" height="44" fill="#3c4656"/><text x="200" y="29" text-anchor="middle" font-size="16" fill="#fff" font-weight="700">△△은행 OO지점 · 금융상품 창구</text>
      <rect x="40" y="90" width="320" height="200" rx="8" fill="#eef1f5" stroke="#9aa3b2" stroke-width="3"/>
      <text x="200" y="150" text-anchor="middle" font-size="16" fill="#3c4656" font-weight="700">금융소비자보호 6대 판매원칙</text>
      ${['적합성', '적정성', '설명의무', '불공정영업 금지', '부당권유 금지', '허위·과장광고 금지'].map((t, i) => `<text x="${i % 2 ? 290 : 110}" y="${190 + Math.floor(i / 2) * 30}" text-anchor="middle" font-size="13" fill="#56627a">✔ ${t}</text>`).join('')}
      <rect x="0" y="430" width="400" height="270" fill="#9aa1ab"/><rect x="-10" y="400" width="420" height="40" fill="#5a6270"/>`,
    branch_office: () => `
      <rect width="400" height="700" fill="#e9efe9"/>
      <rect x="0" y="0" width="400" height="44" fill="#1f7a72"/><text x="200" y="29" text-anchor="middle" font-size="16" fill="#fff" font-weight="700">지점장실</text>
      <rect x="30" y="80" width="150" height="200" fill="#a6c8e8" stroke="#6d7d6d" stroke-width="6"/>${skyline(30, 180, 280, '#86a3c2', '#6d89a8')}
      <rect x="220" y="80" width="150" height="110" fill="#fff" stroke="#9cb0a0" stroke-width="3"/><text x="295" y="120" text-anchor="middle" font-size="13" fill="#1f7a72" font-weight="700">이번 달 실적 목표</text><rect x="240" y="140" width="110" height="18" fill="#dde7dd"/><rect x="240" y="140" width="72" height="18" fill="#1f7a72"/>
      <rect x="0" y="440" width="400" height="260" fill="#8e7a62"/><rect x="-10" y="420" width="420" height="40" fill="#4d3a2a"/>`,
    bok: () => `
      <defs><linearGradient id="bkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3550"/><stop offset="1" stop-color="#111726"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#bkg)"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${20 + i * 64}" y="40" width="40" height="380" fill="#3a4666" opacity=".7"/>`).join('')}
      <circle cx="200" cy="170" r="70" fill="none" stroke="#c9a227" stroke-width="5"/><circle cx="200" cy="170" r="52" fill="#1b2340" stroke="#c9a227" stroke-width="2"/>
      <text x="200" y="164" text-anchor="middle" font-size="18" fill="#e8c96a" font-weight="800">BANK OF</text><text x="200" y="188" text-anchor="middle" font-size="18" fill="#e8c96a" font-weight="800">KOREA</text>
      <text x="200" y="280" text-anchor="middle" font-size="16" fill="#cfd6ea" font-weight="700" letter-spacing="3">금융통화위원회 회의실</text>
      <ellipse cx="200" cy="520" rx="260" ry="80" fill="#4a3424"/><rect x="0" y="560" width="400" height="140" fill="#20160f"/>`,
    hq: () => `
      <rect width="400" height="700" fill="#e8ece9"/>
      <rect x="20" y="50" width="360" height="300" fill="#a6c8e8" stroke="#7a8a80" stroke-width="8"/>${skyline(20, 380, 350, '#7f9bb8', '#6b86a3')}
      <rect x="0" y="0" width="400" height="40" fill="#1f7a72"/><text x="200" y="27" text-anchor="middle" font-size="16" fill="#fff" font-weight="800">△△은행 본점 · 은행장실</text>
      <rect x="0" y="440" width="400" height="260" fill="#6b5a48"/><rect x="-10" y="420" width="420" height="44" fill="#3a2a1e" stroke="#c9a227" stroke-width="3"/>`,
    title: () => `
      <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb6c8"/><stop offset=".5" stop-color="#ffd9a8"/><stop offset="1" stop-color="#9fd0ff"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#tg)"/>
      ${skyline(0, 400, 520, '#ffffff', '#f1f4ff', false, 0.55)}
      ${Array.from({ length: 18 }, (_, i) => `<path class="petal" style="animation-delay:${(i * 0.7) % 6}s;transform-origin:${(i * 61) % 400}px 0" d="M${(i * 61) % 400},${(i * 47) % 300} q6,-8 12,0 q-6,8 -12,0 Z" fill="#fff" opacity=".8"/>`).join('')}
      <rect x="0" y="520" width="400" height="180" fill="#f7f1ff" opacity=".7"/>`
  };
  function skyline(x0, x1, base, c1, c2, lit, op = 1) {
    let s = '', x = x0, i = 0;
    while (x < x1) {
      const w = 22 + (i * 13) % 26, h = 60 + (i * 47) % 130;
      s += `<rect x="${x}" y="${base - h}" width="${Math.min(w, x1 - x)}" height="${h}" fill="${i % 2 ? c1 : c2}" opacity="${op}"/>`;
      if (lit) for (let k = 0; k < 6; k++) s += `<rect x="${x + 4 + (k % 2) * 9}" y="${base - h + 10 + k * 14}" width="4" height="5" fill="#ffd66b" opacity="${(i + k) % 3 ? .9 : .2}"/>`;
      x += w + 4; i++;
    }
    return s;
  }
  function books(x, y) {
    let s = '';
    const cols = ['#9b2335', '#2b3a67', '#2f7a5b', '#c9a227', '#6a4c93', '#d9824a'];
    for (let i = 0; i < 9; i++) s += `<rect x="${x + i * 13}" y="${y + (i % 3) * 4}" width="11" height="${76 - (i % 3) * 4}" fill="${cols[i % 6]}"/>`;
    return s + `<rect x="${x - 4}" y="${y + 76}" width="122" height="6" fill="#2a1d14"/>`;
  }
  function background(name) {
    const f = BG[name] || BG.office;
    return `<svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${f()}</svg>`;
  }

  return { portrait, background, shade };
})();
