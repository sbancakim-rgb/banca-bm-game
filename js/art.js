/* =========================================================
   Art — 미연시 스타일 2D 캐릭터 & 배경 (순수 SVG 생성)
   portrait(spec, expr, opts) → SVG 문자열
   background(name) → SVG 문자열
   ========================================================= */
const Art = (() => {
  const LINE = '#2f2427';
  let uid = 0;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  const mirror = (inner) => `<g transform="translate(400,0) scale(-1,1)">${inner}</g>`;

  /* =========================================================
     웹툰풍 캐릭터 — 가는 선 · 단색 + 셀 음영 · 작은 아몬드 눈 · 덩어리로 흐르는 머리
     좌표계: 얼굴 중심 x=200, 눈높이 y≈207, 턱 y≈300 (머리 그룹에서 1.14배 확대)
     ========================================================= */
  const LW = 1.7; // 기본 선 굵기
  const flip = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => `${(400 - +x).toFixed(1)},${y}`);

  /* ---------------- 헤어 ---------------- */
  // 이마가 드러나는 헤어라인 (시스루뱅 계열)
  const CAP_OPEN = 'M118,214 C106,114 152,66 200,66 C248,66 294,114 282,214 C280,184 272,156 254,138 C232,124 168,124 146,138 C128,156 120,184 118,214 Z';
  // 시스루뱅: 이마가 비치는 가는 머리 다발
  function seeThru(c, line) {
    const L = `M201,124 C188,127 168,137 154,158 C147,169 143,181 141,196 C147,184 158,168 174,156 C186,148 196,138 201,124 Z`;
    const wisp = (d) => `<path d="${d}" fill="${c}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>`;
    return `<path d="${L}" fill="${c}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/><path d="${flip(L)}" fill="${c}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>`
      + wisp('M194,127 C190,138 186,150 184,164 C189,152 193,140 197,128 Z') + wisp('M206,127 C210,138 213,148 215,160 C210,149 206,139 203,128 Z');
  }
  /** 스타일별 { back, main(d), extra(svg), side(svg) } — main 은 음영 클립에도 쓰인다 */
  function hairShapes(style, c, line, d) {
    const st = `fill="${c}" stroke="${line}" stroke-width="${LW}" stroke-linejoin="round"`;
    const strand = (p, w = 1.2) => `<path d="${p}" fill="none" stroke="${d}" stroke-width="${w}" stroke-linecap="round" opacity=".75"/>`;
    const lock = (p) => `<path d="${p}" ${st}/><path d="${flip(p)}" ${st}/>`;
    const BACK_SHORT = `<path d="M124,206 C112,136 148,80 200,76 C252,80 288,136 276,206 C270,196 264,190 256,188 L144,188 C136,190 130,196 124,206 Z" ${st}/>`;
    const TUFT = strand('M164,96 Q176,86 190,86') + strand('M214,88 Q228,90 238,100');
    switch (style) {
      case 'm_comma': case 'male_two':
        return { back: BACK_SHORT,
          main: 'M122,206 C116,150 140,90 198,82 C254,80 288,126 280,198 C278,180 272,166 260,158 C264,172 258,186 245,187 C234,188 229,177 237,170 C222,160 196,154 172,152 C152,152 139,165 133,184 C130,192 128,200 126,208 Z',
          extra: TUFT + strand('M168,88 Q170,110 178,128') + strand('M150,118 Q196,124 236,158') + strand('M184,96 Q224,104 256,148') + strand('M245,186 C236,184 234,176 240,172', 1.4),
          side: lock('M126,196 Q122,216 130,230 L136,204 Z') };
      case 'm_part': case 'male_side':
        return { back: BACK_SHORT,
          main: 'M122,208 C114,146 146,86 198,82 C254,80 290,128 280,206 C276,188 270,174 260,166 C262,150 252,134 236,126 C218,118 198,117 180,116 C170,128 160,148 154,170 C150,180 144,188 138,191 C133,196 128,202 124,210 Z',
          extra: TUFT + strand('M181,116 C176,104 176,94 182,86') + strand('M186,92 Q232,98 262,142') + strand('M200,118 Q236,128 258,160') + strand('M170,130 Q158,152 150,180'),
          side: lock('M126,198 Q122,218 130,232 L136,206 Z') };
      case 'm_dandy': case 'male_short':
        return { back: BACK_SHORT,
          main: 'M124,208 C116,146 146,86 200,82 C254,86 284,146 276,208 L272,176 Q260,180 249,172 Q238,179 226,172 Q214,180 202,172 Q190,179 178,171 Q166,178 154,171 Q142,177 130,176 Z',
          extra: TUFT + strand('M202,90 Q200,130 202,170') + strand('M170,96 Q164,130 166,168') + strand('M234,96 Q240,130 236,168'),
          side: lock('M126,196 Q122,216 130,230 L136,204 Z') };
      case 'm_leaf':
        return { back: `<path d="M118,226 C108,138 146,80 200,76 C254,80 292,138 282,226 L276,256 L124,256 Z" ${st}/>`,
          main: 'M120,218 C112,140 146,84 200,80 C254,84 288,140 280,218 C276,196 266,180 250,172 C232,164 214,150 202,128 C190,150 170,164 150,172 C134,180 124,196 120,218 Z',
          extra: TUFT + strand('M202,90 L202,126') + strand('M204,130 Q226,144 248,166') + strand('M198,130 Q176,144 152,166'),
          side: lock('M122,204 Q118,232 132,256 L138,214 Z') };
      case 'male_slick':
        return { back: BACK_SHORT,
          main: 'M126,196 C118,124 156,80 200,78 C244,80 282,124 274,196 C270,166 262,146 248,134 C226,124 174,124 152,134 C138,146 130,166 126,196 Z',
          extra: strand('M156,128 Q180,98 222,90') + strand('M170,126 Q204,104 248,110') + strand('M232,128 Q246,112 262,118') +
            `<path d="M128,196 C126,170 128,150 136,138 L142,184 Z M272,196 C274,170 272,150 264,138 L258,184 Z" fill="#a8a8b2" stroke="${line}" stroke-width="1.2"/>`,
          side: '' };
      case 'grey_side':
        return { back: `<path d="M124,214 C112,140 150,92 202,90 C252,92 290,140 276,214 L268,236 L132,236 Z" ${st}/>`,
          main: 'M126,206 C116,138 154,92 206,92 C252,94 286,138 276,206 L270,178 C264,154 250,136 236,128 C226,142 196,150 168,148 C150,158 136,180 130,204 Z',
          extra: strand('M156,124 Q196,132 232,120'), side: '' };
      case 'bald':
        return { back: '', main: '',
          extra: `<path d="M128,222 C116,190 120,160 136,142 C144,168 142,196 142,228 Z" ${st}/><path d="M272,222 C284,190 280,160 264,142 C256,168 258,196 258,228 Z" ${st}/>
            <path d="M170,108 Q196,98 222,104" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`, side: '' };
      case 'f_hush':
        return { back: `<path d="M114,196 C102,112 150,66 200,64 C250,66 298,112 286,196 C290,246 296,284 308,312 C296,318 284,312 278,304 C276,316 266,322 258,318 L142,318 C134,322 124,316 122,304 C116,312 104,318 92,312 C104,284 110,246 114,196 Z" ${st}/>`,
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,72 Q200,98 202,124') + strand('M168,80 Q160,104 156,128'),
          side: lock('M126,176 C116,220 118,262 146,300 C138,268 134,236 140,196 C138,188 132,180 126,176 Z') };
      case 'f_ccurl': case 'female_bob':
        return { back: `<path d="M116,196 C102,110 150,64 200,64 C250,64 298,110 284,196 C292,244 292,280 272,300 C262,308 250,306 246,298 L154,298 C150,306 138,308 128,300 C108,280 108,244 116,196 Z" ${st}/>`,
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,72 Q200,98 202,124'),
          side: lock('M124,190 C114,240 120,282 150,298 C158,300 161,292 154,288 C138,276 134,240 140,204 Z') };
      case 'f_seewave': case 'female_wave':
        return { back: `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C304,264 278,302 302,354 C322,404 292,434 316,488 L84,488 C108,434 78,404 98,354 C122,302 96,264 114,200 Z" ${st}/>` +
            strand('M104,330 Q126,380 102,432') + strand('M296,330 Q274,380 298,432'),
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,70 Q200,98 202,124'),
          side: lock('M124,190 C112,240 132,280 116,330 C112,346 124,350 130,340 C144,300 136,250 140,204 Z') };
      case 'f_layer': case 'female_long':
        return { back: `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C294,300 300,400 312,486 L88,486 C100,400 106,300 114,200 Z" ${st}/>` +
            strand('M110,300 Q102,400 106,470') + strand('M290,300 Q298,400 294,470'),
          main: 'M118,214 C106,114 152,66 206,66 C252,68 294,114 282,214 C280,184 272,156 252,138 C238,128 222,124 212,122 C192,136 166,150 150,176 C140,192 132,200 126,212 Z',
          extra: strand('M212,70 L212,120') + strand('M208,124 Q178,142 156,170') + strand('M232,82 Q262,104 270,150'),
          side: `<path d="M128,186 C118,236 126,276 120,320 C132,300 140,256 140,208 Z" ${st}/><path d="M272,170 C286,220 282,262 290,300 C268,276 262,236 262,196 Z" ${st}/>` };
      case 'f_pony': case 'female_pony':
        return { back: `<path d="M118,206 C104,110 150,62 200,62 C250,62 296,110 282,206 L276,240 L124,240 Z" ${st}/>
            <path d="M262,96 C320,110 332,200 314,290 C306,330 292,360 280,380 C296,320 300,250 286,190 C280,150 270,120 252,104 Z" ${st}/>` + strand('M290,170 Q304,240 292,330') +
            `<circle cx="262" cy="98" r="8" fill="#ff6f91" stroke="${line}" stroke-width="1.2"/>`,
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,70 Q200,98 202,124'),
          side: lock('M126,196 C120,236 124,264 132,286 L140,250 Z') };
      case 'female_updo':
        return { back: `<circle cx="200" cy="64" r="32" ${st}/>` + strand('M184,54 Q200,44 216,56') +
            `<path d="M120,206 C106,112 150,64 200,64 C250,64 294,112 280,206 L274,232 L126,232 Z" ${st}/>`,
          main: 'M122,206 C112,116 154,68 200,68 C246,68 288,116 278,206 C272,170 262,146 246,130 C226,150 188,160 150,156 C140,170 130,186 122,206 Z',
          extra: strand('M150,120 Q196,140 240,124') + strand('M246,130 C258,146 268,166 274,190'),
          side: `<path d="M128,200 C124,236 128,262 136,282" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>` };
      case 'female_short':
        return { back: `<path d="M116,206 C102,112 150,62 200,62 C250,62 298,112 284,206 C288,236 286,256 278,268 L122,268 C114,256 112,236 116,206 Z" ${st}/>`,
          main: 'M118,214 C106,114 152,66 206,66 C252,68 294,114 282,214 C280,184 272,156 252,138 C238,128 222,124 212,122 C192,136 166,150 150,176 C140,192 132,200 126,212 Z',
          extra: strand('M212,70 L212,120') + strand('M208,124 Q178,142 156,170'),
          side: lock('M124,196 C118,232 124,256 140,266 C134,248 134,226 138,206 Z') };
      case 'perm': {
        let curls = '';
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI * (0.92 + i * 1.16 / 14), x = 200 + 84 * Math.cos(a), y = 176 + 100 * Math.sin(a);
          curls += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="23" ${st}/>`;
        }
        let fc = '';
        [[146, 124], [172, 108], [200, 102], [228, 108], [254, 124], [136, 150], [264, 150]].forEach(([x, y]) => {
          fc += `<circle cx="${x}" cy="${y}" r="19" ${st}/><path d="M${x - 8},${y} q8,-9 16,0" fill="none" stroke="${d}" stroke-width="1.3"/>`;
        });
        return { back: `<path d="M118,250 C100,110 150,70 200,70 C250,70 300,110 282,250 Z" ${st}/>${curls}`, main: '', extra: fc, side: '' };
      }
      case 'bun':
        return { back: `<circle cx="200" cy="74" r="28" ${st}/><path d="M152,68 L250,60" stroke="#c9a227" stroke-width="4" stroke-linecap="round"/>
            <path d="M124,210 C112,120 152,82 200,82 C248,82 288,120 276,210 L268,232 L132,232 Z" ${st}/>`,
          main: 'M128,204 C120,124 158,86 200,86 C242,86 280,124 272,204 C266,160 244,122 200,116 C156,122 134,160 128,204 Z',
          extra: strand('M200,88 L200,116') + strand('M190,96 Q160,110 142,150') + strand('M210,96 Q240,110 258,150'), side: '' };
      /* ===== 후보 헤어: 남성 ===== */
      case 'm_crop': // 크롭컷: 이마 위로 짧게 자른 질감 있는 앞머리
        return { back: BACK_SHORT,
          main: 'M124,204 C116,144 146,84 200,80 C254,84 284,144 276,204 L272,168 Q268,157 261,153 L250,155 L244,148 L233,153 L224,146 L213,152 L202,145 L192,151 L181,146 L170,152 L160,148 L148,154 Q137,158 130,170 Z',
          extra: TUFT + strand('M178,92 Q176,120 180,146') + strand('M222,92 Q224,120 222,146'),
          side: lock('M126,194 Q122,212 128,224 L134,200 Z') };
      case 'm_regent': // 포마드 업: 이마를 드러내고 앞머리를 세워 넘김
        return { back: `<path d="M124,206 C112,136 146,74 196,68 C250,68 288,136 276,206 C270,196 264,190 256,188 L144,188 C136,190 130,196 124,206 Z" ${st}/>`,
          main: 'M126,200 C118,140 140,84 190,72 C206,68 222,70 236,78 C268,94 284,140 274,200 C270,170 262,150 250,138 C236,128 214,124 194,126 C172,128 152,136 142,150 C134,162 130,180 126,200 Z',
          extra: strand('M150,140 Q170,100 214,84') + strand('M180,128 Q200,96 242,94') + strand('M222,128 Q246,110 264,130') + strand('M196,74 Q210,70 224,76', 1.4),
          side: lock('M126,194 Q122,212 128,224 L134,200 Z') };
      case 'm_gail': // 가일컷: 7:3 가르마, 한쪽 이마를 드러내며 넘긴 앞머리
        return { back: BACK_SHORT,
          main: 'M124,206 C114,146 146,84 198,80 C252,80 288,130 278,204 C274,184 266,170 254,162 C246,158 238,156 232,150 C220,136 198,128 176,124 C166,132 156,150 150,170 C146,182 138,192 130,200 Z',
          extra: strand('M172,86 Q170,104 176,124') + strand('M180,124 Q220,126 252,158') + strand('M186,98 Q236,104 262,140') + strand('M168,128 Q158,148 152,168'),
          side: lock('M126,196 Q122,214 128,226 L134,202 Z') };
      case 'm_wolf': // 울프컷: 뒷머리를 길게 남긴 레이어드
        return { back: `<path d="M120,214 C108,136 146,78 200,74 C254,78 292,136 280,214 C284,244 280,268 270,286 L130,286 C120,268 116,244 120,214 Z" ${st}/>` + strand('M128,240 Q126,262 134,282') + strand('M272,240 Q274,262 266,282'),
          main: 'M122,212 C114,146 146,84 200,80 C254,84 286,146 278,212 L270,180 Q262,187 254,176 Q246,187 236,174 Q226,185 214,172 Q204,183 194,172 Q182,185 172,174 Q162,187 150,176 Q140,185 130,182 Z',
          extra: strand('M176,92 Q168,130 172,170') + strand('M224,92 Q232,130 226,170'),
          side: lock('M126,198 C120,234 124,262 136,282 L140,212 Z') };
      case 'm_shadow': // 쉐도우펌: 눈썹까지 내려와 안으로 말리는 부드러운 앞머리
        return { back: BACK_SHORT,
          main: 'M122,208 C114,146 146,84 200,80 C254,84 286,146 278,208 C276,190 270,178 262,172 C258,182 248,186 240,180 C236,176 238,170 242,168 C230,166 220,170 212,176 C206,180 198,178 196,172 C192,180 180,184 170,176 C166,172 168,166 172,164 C160,164 150,170 144,180 C138,186 132,196 128,206 Z',
          extra: TUFT + strand('M170,92 Q160,130 170,164') + strand('M212,92 Q206,130 214,170') + strand('M246,104 Q252,140 242,168'),
          side: lock('M126,196 Q122,216 130,230 L136,204 Z') };
      case 'm_buzz': // 버즈컷: 두피에 붙는 아주 짧은 머리
        return { back: '',
          main: 'M128,196 C120,134 154,90 200,88 C246,90 280,134 272,196 C268,170 262,152 252,140 C238,128 162,128 148,140 C138,152 132,170 128,196 Z',
          extra: '', side: '' };
      /* ===== 후보 헤어: 여성 ===== */
      case 'f_hime': // 히메컷: 일자 앞머리 + 볼 옆에서 자른 옆머리 + 긴 생머리
        return { back: `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C294,300 300,400 312,486 L88,486 C100,400 106,300 114,200 Z" ${st}/>` + strand('M110,300 Q102,400 106,470') + strand('M290,300 Q298,400 294,470'),
          main: 'M118,214 C106,114 152,66 200,66 C248,66 294,114 282,214 L276,178 Q263,183 251,177 Q239,183 227,177 Q215,183 203,177 Q191,183 179,177 Q167,183 155,177 Q141,183 128,179 Z',
          extra: strand('M200,72 Q198,120 200,170') + strand('M168,80 Q162,124 164,170') + strand('M234,80 Q240,124 236,170'),
          side: lock('M124,186 C122,220 122,246 126,264 L146,264 C142,242 140,216 142,192 Z') };
      case 'f_bluntbob': // 일자 단발 + 처피뱅
        return { back: `<path d="M116,196 C102,110 150,64 200,64 C250,64 298,110 284,196 C288,236 290,266 290,292 L110,292 C110,266 112,236 116,196 Z" ${st}/>`,
          main: 'M118,214 C106,114 152,66 200,66 C248,66 294,114 282,214 L276,166 Q264,170 252,165 Q240,170 228,165 Q216,170 204,165 Q192,170 180,165 Q168,170 156,165 Q142,170 128,168 Z',
          extra: strand('M200,72 Q198,116 200,160') + strand('M170,80 Q164,120 166,160') + strand('M232,80 Q238,120 234,160'),
          side: lock('M124,190 C122,230 120,262 120,292 L142,292 C140,262 140,230 142,200 Z') };
      case 'f_halfup': // 반묶음: 정수리 뒤로 살짝 묶은 긴 머리 + 커튼 앞머리
        return { back: `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C294,300 300,400 312,486 L88,486 C100,400 106,300 114,200 Z" ${st}/>` + strand('M110,300 Q102,400 106,470') + strand('M290,300 Q298,400 294,470') +
            `<path d="M176,70 Q200,52 224,70 Q212,80 200,78 Q188,80 176,70 Z" fill="${d}" stroke="${line}" stroke-width="1.2"/>`,
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,72 Q200,98 202,124'),
          side: lock('M126,186 C114,240 122,290 116,340 C130,310 138,258 140,204 Z') };
      case 'f_sidewave': // 옆가르마 긴 웨이브
        return { back: `<path d="M114,200 C98,106 150,60 200,60 C250,60 302,106 286,200 C304,264 278,302 302,354 C322,404 292,434 316,488 L84,488 C108,434 78,404 98,354 C122,302 96,264 114,200 Z" ${st}/>` + strand('M104,330 Q126,380 102,432') + strand('M296,330 Q274,380 298,432'),
          main: 'M118,214 C106,114 152,66 206,66 C252,68 294,114 282,214 C280,184 272,156 252,138 C238,128 222,124 212,122 C192,136 166,150 150,176 C140,192 132,200 126,212 Z',
          extra: strand('M212,70 L212,120') + strand('M208,124 Q178,142 156,170') + strand('M232,82 Q262,104 270,150'),
          side: `<path d="M128,186 C114,236 136,276 118,326 C114,342 126,346 132,336 C146,296 138,250 140,208 Z" ${st}/><path d="M272,170 C290,224 268,264 286,312 C290,326 278,330 272,320 C258,280 262,236 262,196 Z" ${st}/>` };
      case 'f_pixie': // 여자 숏컷: 옆으로 넘긴 앞머리, 귀 옆 짧은 머리
        return { back: `<path d="M118,206 C104,114 150,64 200,64 C250,64 296,114 282,206 C284,224 280,238 272,246 L128,246 C120,238 116,224 118,206 Z" ${st}/>`,
          main: 'M118,214 C106,114 152,66 206,66 C252,68 294,114 282,214 C280,184 272,156 252,138 C238,128 222,124 212,122 C192,136 166,150 150,176 C140,192 132,200 126,212 Z',
          extra: strand('M212,70 L212,120') + strand('M208,124 Q178,142 156,170'),
          side: lock('M124,196 C120,222 124,240 136,248 C132,234 132,218 136,204 Z') };
      case 'f_highbun': // 똥머리: 정수리 위 동그란 번 + 커튼 앞머리 + 잔머리
        return { back: `<circle cx="200" cy="50" r="30" ${st}/>` + strand('M184,40 Q200,30 216,42') + strand('M180,58 Q200,66 220,58') +
            `<path d="M120,206 C106,112 150,64 200,64 C250,64 294,112 280,206 L274,232 L126,232 Z" ${st}/>`,
          main: CAP_OPEN, extra: seeThru(c, line),
          side: `<path d="M130,196 C124,226 128,248 136,262" fill="none" stroke="${line}" stroke-width="1.2" stroke-linecap="round"/><path d="M270,196 C276,226 272,248 264,262" fill="none" stroke="${line}" stroke-width="1.2" stroke-linecap="round"/>` };
      case 'f_highpony': // 하이포니테일 + 커튼 앞머리
        return { back: `<path d="M118,206 C104,110 150,62 200,62 C250,62 296,110 282,206 L276,240 L124,240 Z" ${st}/>
            <path d="M226,70 C292,62 324,140 316,240 C312,300 298,350 286,380 C292,320 296,250 284,190 C276,140 262,104 238,84 Z" ${st}/>` + strand('M292,150 Q306,240 294,340') +
            `<path d="M224,66 Q236,60 244,70 Q236,80 226,76 Z" fill="#ff6f91" stroke="${line}" stroke-width="1.2"/>`,
          main: CAP_OPEN, extra: seeThru(c, line),
          side: lock('M126,196 C120,236 124,264 132,286 L140,250 Z') };
      case 'f_cflip': // 바깥 C컬 중단발: 어깨 위에서 바깥으로 뻗친 머리 + 커튼 앞머리
        return { back: `<path d="M116,196 C102,110 150,64 200,64 C250,64 298,110 284,196 C288,240 292,272 300,296 C306,306 316,304 318,296 C310,300 302,296 300,288 L100,288 C98,296 90,300 82,296 C84,304 94,306 100,296 C108,272 112,240 116,196 Z" ${st}/>`,
          main: CAP_OPEN, extra: seeThru(c, line) + strand('M200,72 Q200,98 202,124'),
          side: lock('M124,190 C114,236 120,268 108,290 C104,298 114,302 120,294 C136,270 136,236 140,204 Z') };
      default: // female_long 이외의 미지정 스타일
        return hairShapes('m_dandy', c, line, d);
    }
  }

  /* ---------------- 눈 · 눈썹 · 입 ---------------- */
  function eyeW(s, expr, id) {
    const iris = s.eyeColor || '#5a3d2b', shape = s.eye || 'almond', LINEc = LINE;
    const lid = shade(s.skin || '#ffe3d1', -0.3);
    if (expr === 'happy' || shape === 'closed') {
      return `<path d="M150,210 Q166,198 184,207" fill="none" stroke="${LINEc}" stroke-width="2.6" stroke-linecap="round"/>${s.lashes ? `<path d="M151,209 L146,206" stroke="${LINEc}" stroke-width="1.8" stroke-linecap="round"/>` : ''}`;
    }
    if (shape === 'narrow') {
      return `<path d="${expr === 'angry' ? 'M151,203 Q166,206 183,210' : 'M151,207 Q166,202 183,206'}" fill="none" stroke="${LINEc}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M155,212 Q166,215 179,211" fill="none" stroke="${LINEc}" stroke-width="1" opacity=".45"/>`;
    }
    const geo = { round: [190, 219, 9], droopy: [191, 218, 8.8], almond: [193, 217, 8.6], cat: [194, 216, 8.3], sharp: [196, 215, 8], sleepy: [200, 215, 8.2] }[shape] || [193, 217, 8.6];
    let [t, b, r] = geo;
    if (expr === 'surprised') { t -= 3; b += 2; r -= 1.6; }
    if (expr === 'angry') t += 2;
    const white = `M150,207 Q165,${t} 184,${203} Q178,${b} 166,${b + 0.5} Q155,${b} 150,207 Z`;
    return `<defs><clipPath id="ec${id}"><path d="${white}"/></clipPath>
        <linearGradient id="ig${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(iris, -0.55)}"/><stop offset=".6" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, 0.35)}"/></linearGradient></defs>
      <path d="${white}" fill="#fff"/>
      <g clip-path="url(#ec${id})">
        <circle cx="167" cy="208" r="${r}" fill="url(#ig${id})"/>
        <circle cx="167" cy="208.5" r="${r * 0.5}" fill="#160f12"/>
        <circle cx="164.4" cy="205" r="${r * 0.28}" fill="#fff"/>
        <circle cx="170" cy="211.5" r="${r * 0.12}" fill="#fff" opacity=".85"/>
        <path d="M148,${t + 2} Q166,${t - 4} 186,${t + 4} L186,${t - 6} L148,${t - 6} Z" fill="${shade(iris, -0.7)}" opacity=".18"/>
      </g>
      <path d="M149,208 Q165,${t - 1} 185.5,203" fill="none" stroke="${LINEc}" stroke-width="2.7" stroke-linecap="round"/>
      ${s.lashes ? `<path d="M150,207 L144.5,203.5 M152.5,203.5 L148.5,199" stroke="${LINEc}" stroke-width="1.7" stroke-linecap="round"/>` : ''}
      ${shape !== 'sleepy' && shape !== 'sharp' ? `<path d="M153,${t - 2.5} Q166,${t - 8} 182,${t - 3}" fill="none" stroke="${lid}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>` : ''}
      <path d="M156,${b + 0.5} Q166,${b + 2.5} 177,${b - 0.5}" fill="none" stroke="${LINEc}" stroke-width="1" stroke-linecap="round" opacity=".45"/>`;
  }
  function eyes(s, expr, id) {
    const k = s.eye === 'round' ? 1.2 : s.eye === 'narrow' ? 1.05 : 1.14;
    const rot = s.eye === 'droopy' ? -7 : s.eye === 'cat' ? 8 : 0;
    const g = (inner) => `<g transform="translate(167,208) rotate(${rot}) scale(${k}) translate(-167,-208)">${inner}</g>`;
    return g(eyeW(s, expr, id + 'a')) + mirror(g(eyeW(s, expr, id + 'b')));
  }
  function brows(s, expr) {
    const c = s.browColor || shade(s.hair.color, -0.25);
    const t = s.thickBrows ? 1.8 : 1;
    let d;
    if (expr === 'angry' || expr === 'shout') d = `M146,181 Q166,183 189,191 L187,${193 + t} Q166,${186 + t} 147,${183 + t} Z`;
    else if (expr === 'sad' || expr === 'worried') d = `M146,189 Q166,180 187,176 L188,${179 + t} Q167,${184 + t} 148,${192 + t} Z`;
    else if (expr === 'surprised') d = `M146,180 Q165,169 187,173 L187,${176 + t} Q166,${173 + t} 147,${183 + t} Z`;
    else if (s.brow === 'stern') d = `M146,185 Q166,180 189,183 L188,${186.5 + t} Q166,${184 + t} 147,${188 + t} Z`;
    else d = `M146,186 Q165,176 187,179 L187.5,${182.5 + t} Q166,${180 + t} 147.5,${188.5 + t} Z`;
    return `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>`;
  }
  function mouth(expr, s) {
    const M = '#7a3a42', w = 1.9;
    switch (expr) {
      case 'smile': return `<path d="M189,265 Q200,273 211,265" fill="none" stroke="${M}" stroke-width="${w}" stroke-linecap="round"/>`;
      case 'happy': return `<path d="M187,262 Q200,281 213,262 Q200,266 187,262 Z" fill="#8f3a44" stroke="${M}" stroke-width="1.4" stroke-linejoin="round"/>
        <path d="M189.5,263.2 Q200,267 210.5,263.2 L209.5,265.6 Q200,268.8 190.5,265.6 Z" fill="#fff"/><path d="M194,273 Q200,269 206,273 Q203,276.5 200,276.5 Q197,276.5 194,273 Z" fill="#f08c94"/>`;
      case 'angry': return `<path d="M191,270 Q200,264 209,270" fill="none" stroke="${M}" stroke-width="${w}" stroke-linecap="round"/>`;
      case 'shout': return `<path d="M188,262 Q200,282 212,262 Q200,258 188,262 Z" fill="#6e2632" stroke="${M}" stroke-width="1.4"/><path d="M193,272 Q200,268 207,272 Q203,277 200,277 Q197,277 193,272 Z" fill="#f08c94"/>`;
      case 'surprised': return `<ellipse cx="200" cy="268" rx="4.5" ry="6" fill="#6e2632" stroke="${M}" stroke-width="1.4"/>`;
      case 'sad': case 'worried': return `<path d="M192,270 Q200,265 208,270" fill="none" stroke="${M}" stroke-width="${w}" stroke-linecap="round"/>`;
      case 'smirk': return `<path d="M190,267 Q203,271 211,263" fill="none" stroke="${M}" stroke-width="${w}" stroke-linecap="round"/>`;
      default: return `<path d="M193,267 Q200,269.5 207,267" fill="none" stroke="${M}" stroke-width="${w}" stroke-linecap="round"/>`;
    }
  }

  /* ---------------- 의상 ---------------- */
  function outfit(o, s, id) {
    const m = o.main || '#2b3a67', md = shade(m, -0.3), ml = shade(m, 0.18);
    const st = `stroke="${LINE}" stroke-width="1.7" stroke-linejoin="round"`;
    const torso = `M74,600 C72,472 86,412 146,382 L172,362 L228,362 L254,382 C314,412 328,472 326,600 Z`;
    const shirt = o.shirt || '#f7f8fc';
    const collar = `<path d="M170,356 L186,392 L200,372 Z M230,356 L214,392 L200,372 Z" fill="${shirt}" ${st}/>`;
    const tie = (tc) => `<path d="M193,378 L207,378 L211,396 L205,474 L200,482 L195,474 L189,396 Z" fill="${tc}" ${st}/><path d="M192,370 L208,370 L206,384 L194,384 Z" fill="${shade(tc, -0.2)}" ${st}/>
      <path d="M196,404 L206,412 M195,424 L207,434 M195,446 L206,456" stroke="${shade(tc, 0.3)}" stroke-width="1.7"/>`;
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
          <path d="M200,450 L200,600" stroke="${md}" stroke-width="1.4"/>
          <circle cx="206" cy="530" r="5" fill="${md}" ${st}/><circle cx="206" cy="566" r="5" fill="${md}" ${st}/>
          <path d="M106,476 Q112,524 108,600 M294,476 Q288,524 292,600" fill="none" stroke="${md}" stroke-width="3" opacity=".7"/>
          <path d="M110,430 Q140,400 166,380" fill="none" stroke="${ml}" stroke-width="5" opacity=".5" stroke-linecap="round"/>`;
        if (o.vest) g += `<path d="M178,440 L200,470 L222,440 L226,600 L174,600 Z" fill="${shade(m, -0.15)}" opacity=".9"/>`;
        break;
      }
      case 'shirt':
        g = `<path d="${torso}" fill="${shirt}" ${st}/>
          <path d="M200,372 L200,600" stroke="#c9cfdc" stroke-width="1.4"/>
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
          <path d="M168,362 C136,380 78,414 74,600 L178,600 L186,420 Z" fill="url(#cl${id})" ${st}/>
          <path d="M232,362 C264,380 322,414 326,600 L222,600 L214,420 Z" fill="url(#cl${id})" ${st}/>
          <circle cx="182" cy="470" r="4.5" fill="${md}"/><circle cx="182" cy="520" r="4.5" fill="${md}"/><circle cx="181" cy="570" r="4.5" fill="${md}"/>
          <path d="M80,520 L100,520 M76,540 L98,540 M300,520 L320,520 M302,540 L324,540" stroke="${md}" stroke-width="1.4" opacity=".6"/>
          ${o.necklace ? `<path d="M174,372 Q200,410 226,372" fill="none" stroke="${o.necklace}" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/>` : ''}`;
        break;
      case 'vest':
        g = `<path d="${torso}" fill="${shirt}" ${st}/>${collar}${o.tie ? tie(o.tie) : ''}
          <path d="M160,368 C130,390 110,440 104,600 L296,600 C290,440 270,390 240,368 L214,440 L200,520 L186,440 Z" fill="url(#cl${id})" ${st}/>
          <path d="M200,520 L200,600" stroke="${md}" stroke-width="1.4"/>
          <path d="M120,560 L180,560 M220,560 L280,560" stroke="${md}" stroke-width="1.4" opacity=".5"/>`;
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
          <path d="M150,530 L250,530 L240,590 L160,590 Z" fill="none" stroke="${md}" stroke-width="1.7"/>`;
        break;
      case 'hanbok_vest':
        g = `<path d="${torso}" fill="${o.inner || '#f3e9dc'}" ${st}/>
          <path d="M168,362 C136,380 78,414 74,600 L190,600 L196,430 Z" fill="url(#cl${id})" ${st}/>
          <path d="M232,362 C264,380 322,414 326,600 L210,600 L204,430 Z" fill="url(#cl${id})" ${st}/>
          <path d="M160,372 L200,440 L240,372" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>
          <circle cx="194" cy="470" r="6" fill="#c9a227" ${st}/>`;
        break;
    }
    // 공통 음영: 어깨 하이라이트 · 겨드랑이 그림자 · 칼라 아래 그림자
    g += `<path d="M88,456 Q102,410 146,386" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".13"/>
      <path d="M108,600 Q104,524 114,478 M292,600 Q296,524 286,478" fill="none" stroke="#000" stroke-width="10" opacity=".07"/>
      <path d="M176,366 Q200,382 224,366" fill="none" stroke="#000" stroke-width="6" opacity=".08"/>`;
    // 액세서리
    const acc = o.acc || [];
    if (acc.includes('lanyard')) g += `<path d="M176,364 L222,470 M224,364 L226,470" stroke="#2f6fd6" stroke-width="5"/>
        <rect x="204" y="466" width="44" height="58" rx="5" fill="#fff" ${st}/><rect x="204" y="466" width="44" height="14" rx="5" fill="#2f6fd6"/>
        <circle cx="226" cy="496" r="8" fill="#ffd9c2"/><path d="M212,514 L240,514" stroke="#99a" stroke-width="3"/>`;
    if (acc.includes('namecard')) g += `<rect x="236" y="430" width="38" height="18" rx="2" fill="#fff" ${st} transform="rotate(-6 255 439)"/><path d="M244,437 L262,435" stroke="#2f6fd6" stroke-width="1.7"/>`;
    if (acc.includes('pin')) g += `<circle cx="150" cy="430" r="7" fill="#2f6fd6" ${st}/>`;
    if (acc.includes('badge_bronze')) g += medal(150, 432, '#cd7f32');
    if (acc.includes('badge_silver')) g += medal(150, 432, '#c0c6d0');
    if (acc.includes('badge_gold')) g += medal(150, 432, '#f2c641');
    if (acc.includes('pocket_square')) g += `<path d="M236,428 L248,412 L254,424 L262,410 L270,428 Z" fill="${o.square || '#f2c641'}" ${st}/>`;
    if (acc.includes('scarf')) g += `<path d="M168,360 Q200,392 232,360 L238,380 Q200,416 162,380 Z" fill="#c9302c" ${st}/>`;
    return g;
  }
  function medal(x, y, c) {
    return `<g><path d="M${x - 8},${y - 22} L${x - 2},${y - 4} L${x + 8},${y - 22} Z" fill="#c9302c" stroke="${LINE}" stroke-width="1.4"/>
      <circle cx="${x}" cy="${y}" r="12" fill="${c}" stroke="${LINE}" stroke-width="1.7"/>
      <path d="M${x},${y - 6} L${x + 2},${y - 1} L${x + 6},${y - 1} L${x + 3},${y + 2} L${x + 4},${y + 7} L${x},${y + 4} L${x - 4},${y + 7} L${x - 3},${y + 2} L${x - 6},${y - 1} L${x - 2},${y - 1} Z" fill="#fff" opacity=".85"/></g>`;
  }


  /* ---------------- 얼굴형 (웹툰 비율: 갸름한 턱) ---------------- */
  const FACE = {
    oval: 'M136,184 C134,124 166,94 200,94 C234,94 266,124 264,184 C263,224 250,254 228,280 C216,292 208,296 200,296 C192,296 184,292 172,280 C150,254 137,224 136,184 Z',
    round: 'M134,184 C132,122 166,92 200,92 C234,92 268,122 266,184 C266,232 254,264 232,288 C218,300 182,300 168,288 C146,264 134,232 134,184 Z',
    slim: 'M138,184 C136,124 167,95 200,95 C233,95 264,124 262,184 C261,224 248,258 222,288 C212,299 206,302 200,302 C194,302 188,299 178,288 C152,258 139,224 138,184 Z'
  };

  /* ---------------- 초상화 ---------------- */
  function portrait(s, expr = 'normal', opts = {}) {
    const id = 'p' + (uid++);
    const skin = s.skin || '#ffe3d1', skinS = shade(skin, -0.1), skinD = shade(skin, -0.2);
    const hc = s.hair.color, hLine = shade(hc, -0.55), hD = shade(hc, -0.3);
    const H = hairShapes(s.hair.style, hc, hLine, hD);
    const fc = FACE[s.face] || FACE.oval;
    const vb = opts.head ? '94 74 212 212' : opts.bust ? '40 60 320 400' : '0 0 400 600';
    const HEAD = 'translate(200,238) scale(1.14) translate(-200,-200)';
    const aura = s.aura ? `<defs><radialGradient id="au${id}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>
      <circle cx="200" cy="300" r="230" fill="url(#au${id})"/>
      ${[[70, 120], [330, 160], [90, 380], [320, 420], [200, 40], [40, 260], [360, 300]].map(([x, y], i) => `<path class="spark" style="animation-delay:${i * 0.3}s" d="M${x},${y - 12} L${x + 3},${y - 3} L${x + 12},${y} L${x + 3},${y + 3} L${x},${y + 12} L${x - 3},${y + 3} L${x - 12},${y} L${x - 3},${y - 3} Z" fill="#fff6c8"/>`).join('')}` : '';
    // 앞머리 덩어리: 단색 + 오른쪽 셀 음영 + 짧은 하이라이트
    const hairFront = H.main ? `<path d="${H.main}" fill="${hc}" stroke="${hLine}" stroke-width="${LW}" stroke-linejoin="round"/>
      <g clip-path="url(#hc${id})"><path d="M236,60 C280,90 296,150 290,230 L320,230 L320,40 Z" fill="${hD}" opacity=".35"/>
        <path d="M150,104 Q176,90 204,88" fill="none" stroke="${shade(hc, 0.45)}" stroke-width="4" stroke-linecap="round" opacity=".55"/>
        <path d="M212,88 Q226,88 236,94" fill="none" stroke="${shade(hc, 0.45)}" stroke-width="3" stroke-linecap="round" opacity=".45"/></g>` : '';
    const hairAll = `${hairFront}${H.extra}${H.side}`;
    // 앞머리 그림자 (셀: 경계가 또렷한 한 겹)
    const hairShadow = H.main ? `<g clip-path="url(#fc${id})"><path d="${H.main}" fill="${skinD}" opacity=".38" transform="translate(2,8)"/></g>` : '';
    const blush = s.blush || expr === 'happy' ? `<ellipse cx="152" cy="241" rx="14" ry="6" fill="url(#bl${id})"/><ellipse cx="248" cy="241" rx="14" ry="6" fill="url(#bl${id})"/>
       <path d="M146,240 L150,237 M153,241 L157,238 M243,240 L247,237 M250,241 L254,238" stroke="#e46a86" stroke-width="1" stroke-linecap="round" opacity=".5"/>` : '';
    const ageLines = (s.age || 20) >= 40 && !s.wrinkles ? `<path d="M181,250 Q177,259 182,267 M219,250 Q223,259 218,267${s.age >= 50 ? ' M142,214 Q138,217 136,222 M258,214 Q262,217 264,222 M174,148 Q200,143 226,148' : ''}" fill="none" stroke="${skinD}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>` : '';
    const greyStreak = (s.age || 20) >= 50 ? `<path d="M160,98 Q186,116 182,152 M228,94 Q238,118 234,148" fill="none" stroke="#d9d9e2" stroke-width="4" stroke-linecap="round" opacity=".85"/>` : '';
    const wrinkles = s.wrinkles ? `<path d="M142,214 Q137,218 135,223 M258,214 Q263,218 265,223 M180,248 Q175,258 180,270 M220,248 Q225,258 220,270 M170,142 Q200,135 230,142 M176,152 Q200,147 224,152" fill="none" stroke="${skinD}" stroke-width="1.5" stroke-linecap="round"/>` : '';
    const beard = s.beard === 'mustache' ? `<path d="M178,253 Q189,246 200,251 Q211,246 222,253 Q213,260 200,255 Q187,260 178,253 Z" fill="${s.beardColor || hc}" stroke="${hLine}" stroke-width="1.2"/>`
      : s.beard === 'stubble' ? `<path d="M154,252 Q164,292 200,298 Q236,292 246,252" fill="none" stroke="${skinD}" stroke-width="8" opacity=".28"/>` : '';
    const gc = s.glassesColor;
    const glasses = s.glasses === 'round'
      ? `<g fill="rgba(210,235,255,.14)" stroke="${gc || '#5b4636'}" stroke-width="2"><circle cx="167" cy="208" r="22"/><circle cx="233" cy="208" r="22"/><path d="M189,206 Q200,201 211,206 M145,204 L130,199 M255,204 L270,199" fill="none"/></g>`
      : s.glasses === 'square'
        ? `<g fill="rgba(210,235,255,.12)" stroke="${gc || '#2a2a33'}" stroke-width="2.2"><rect x="144" y="193" width="47" height="30" rx="7"/><rect x="209" y="193" width="47" height="30" rx="7"/><path d="M191,205 L209,205 M144,202 L130,198 M256,202 L270,198" fill="none"/></g>
           <path d="M150,198 L158,195 M215,198 L223,195" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>`
        : s.glasses === 'thin'
          ? `<g fill="rgba(220,235,255,.1)" stroke="${gc || '#9a9aa6'}" stroke-width="1.4"><ellipse cx="167" cy="209" rx="21" ry="17"/><ellipse cx="233" cy="209" rx="21" ry="17"/><path d="M188,206 Q200,201 212,206 M146,205 L130,200 M254,205 L270,200" fill="none"/></g>`
          : s.glasses === 'half'
            ? `<g fill="none" stroke="${gc || '#8a6d3b'}" stroke-width="2"><path d="M145,206 L190,206 Q188,225 167,225 Q147,225 145,206 Z M210,206 L255,206 Q253,225 233,225 Q212,225 210,206 Z M190,207 L210,207"/></g>` : '';
    const earrings = s.earrings ? `<circle cx="134" cy="226" r="3.6" fill="${s.earrings}" stroke="${LINE}" stroke-width="1"/><circle cx="266" cy="226" r="3.6" fill="${s.earrings}" stroke="${LINE}" stroke-width="1"/>` : '';
    const sweat = expr === 'worried' ? `<path d="M270,152 Q277,166 270,172 Q263,166 270,152 Z" fill="#a8d8ff" stroke="${LINE}" stroke-width="1.1"/>` : '';

    return `<svg class="portrait" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      <defs>
        <clipPath id="fc${id}"><path d="${fc}"/></clipPath>
        ${H.main ? `<clipPath id="hc${id}"><path d="${H.main}"/></clipPath>` : ''}
        <linearGradient id="cl${id}" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="${shade((s.outfit && s.outfit.main) || '#2b3a67', 0.1)}"/><stop offset=".6" stop-color="${(s.outfit && s.outfit.main) || '#2b3a67'}"/><stop offset=".61" stop-color="${shade((s.outfit && s.outfit.main) || '#2b3a67', -0.14)}"/><stop offset="1" stop-color="${shade((s.outfit && s.outfit.main) || '#2b3a67', -0.18)}"/></linearGradient>
        <radialGradient id="bl${id}"><stop offset="0" stop-color="#ff8aa2" stop-opacity=".55"/><stop offset="1" stop-color="#ff8aa2" stop-opacity="0"/></radialGradient>
      </defs>
      ${aura}
      <g transform="${HEAD}">${H.back}</g>
      <path d="M186,292 L186,352 Q200,360 214,352 L214,292 Z" fill="${skinS}" stroke="${LINE}" stroke-width="${LW}"/>
      <path d="M186,318 Q200,348 214,318 L214,344 Q200,360 186,344 Z" fill="${skinD}" opacity=".55"/>
      ${outfit(s.outfit, s, id)}
      <g transform="${HEAD}">
      <path d="M137,196 C126,192 124,214 136,222 Z" fill="${skin}" stroke="${LINE}" stroke-width="${LW}" stroke-linejoin="round"/>
      <path d="M263,196 C274,192 276,214 264,222 Z" fill="${skin}" stroke="${LINE}" stroke-width="${LW}" stroke-linejoin="round"/>
      ${earrings}
      <path d="${fc}" fill="${skin}" stroke="${LINE}" stroke-width="${LW}"/>
      <g clip-path="url(#fc${id})"><path d="M248,110 C276,150 278,236 236,300 L300,300 L300,100 Z" fill="${skinD}" opacity=".18"/></g>
      ${hairShadow}
      ${blush}${wrinkles}${ageLines}
      ${eyes(s, expr, id)}
      ${brows(s, expr)}${mirror(brows(s, expr))}
      <path d="M201,238 Q204,244 198,246" fill="none" stroke="${skinD}" stroke-width="1.6" stroke-linecap="round"/>
      ${s.gender === 'f' && !s.wrinkles && expr !== 'happy' && expr !== 'shout' ? `<ellipse cx="200" cy="270" rx="6" ry="2.2" fill="#f19aa4" opacity=".4"/>` : ''}
      ${mouth(expr, s)}${beard}
      ${hairAll}${greyStreak}
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
