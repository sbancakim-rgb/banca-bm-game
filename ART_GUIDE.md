# 방카BM 성장기 — 일러스트 제작 가이드

## ⭐ 일러스트 주인공 만들기 (Gemini)

입사할 때와 🏥 성형외과에서 **"🖼️ 일러스트 고르기"**로 선택하는 주인공 캐릭터입니다.
남녀 각각 **최대 8명**까지 넣을 수 있고, 파일을 넣으면 자동으로 선택지에 나타납니다.

### 파일 규칙
| 항목 | 규칙 |
|---|---|
| 폴더 | `img/player/` |
| 파일 이름 | 남자 `m1`~`m8`, 여자 `f1`~`f8` + `_표정.png` |
| 표정 | `normal`(기본, **필수**) · `smile`(웃음) · `angry`(화남) · `worried`(당황) — 없는 표정은 기본으로 대체 |
| 규격 | PNG, **배경 투명**, 세로 2:3 (권장 1024×1536 이상) |
| 구도 | 머리 꼭대기 ~ 허리, 정면, 화면 가운데, 머리 위 여백 약 5% — **모든 캐릭터·표정이 같은 구도** |

예) `img/player/f1_normal.png`, `img/player/f1_smile.png`, `img/player/m3_normal.png`

### Gemini 작업 순서
1. **기본(normal) 한 장을 먼저** 만듭니다. 아래 프롬프트를 그대로 쓰고 `[외모]` 부분만 바꾸세요.
   ```
   세로 2:3 비율의 2D 연애 시뮬레이션 게임 캐릭터 스탠딩 일러스트.
   한국 보험회사 신입 직원, [외모: 예) 20대 중반 여성, 밝은 갈색 긴 웨이브 머리, 부드러운 눈매],
   네이비 정장 재킷과 흰 블라우스, 머리 꼭대기부터 허리까지 보이는 정면 상반신, 화면 가운데,
   머리 위에 약간의 여백, 깔끔한 선화와 부드러운 셀 채색, 단색 흰 배경, 글자 없음
   ```
2. **같은 대화창에서** 표정만 바꿔 달라고 합니다. (Gemini는 같은 캐릭터 유지를 잘 합니다)
   ```
   방금 그 캐릭터 그대로, 옷·머리·구도·크기·배경 모두 똑같이 하고 표정만 [환하게 웃는 얼굴]로 바꿔줘
   ```
   - smile: 환하게 웃는 얼굴 · angry: 눈썹을 찌푸린 화난 얼굴 · worried: 당황해서 땀 흘리는 얼굴
3. **배경 지우기**: Windows 11 그림판 → 이미지 열기 → **"배경 제거"** → PNG로 저장 (remove.bg도 가능)
4. 파일 이름을 규칙대로 바꿔서 Claude에게 주면 `img/player/`에 넣고 배포합니다.

### 팁
- 캐릭터끼리 **그림체를 맞추려면** 2번째 캐릭터부터는 첫 캐릭터 이미지를 함께 올리고 "이 그림체 그대로 다른 인물" 이라고 요청하세요.
- 일러스트 캐릭터는 직급이 올라도 옷이 바뀌지 않습니다(직급은 이름표·배경으로 표시). 원하면 같은 인물로 정장 색만 다른 버전을 더 만들어 둘 수 있어요.
- 사내 사용 외(외부 공개·상업적 이용)에는 Gemini 이용약관의 이미지 이용 조건을 확인하세요.

---

게임은 **이미지 파일을 넣으면 자동으로 일러스트로 바뀝니다.** 파일이 없는 캐릭터·배경은 지금의 임시 그림(SVG)으로 나옵니다.
그래서 한꺼번에 다 만들 필요 없이, 우선순위대로 하나씩 넣어도 됩니다.

---

## 1. 파일 규칙 (이것만 지키면 끝)

| 종류 | 폴더 | 파일 이름 | 규격 |
|---|---|---|---|
| 캐릭터 | `img/chars/` | `{키}_{표정}.png` | **PNG, 투명 배경**, 세로 2:3 (예: 1024×1536) |
| 배경 | `img/bg/` | `{배경키}.jpg` (또는 .png) | 세로 9:16 (예: 1080×1920), 사람 없음 |

- 표정은 4가지: `normal`(기본), `smile`(웃음), `angry`(화남), `worried`(당황). **`normal`은 필수**, 나머지는 없으면 `normal`로 대체됩니다.
  예) `img/chars/partjang_normal.png`, `img/chars/partjang_smile.png`
- **구도를 모두 똑같이**: 머리 꼭대기부터 허벅지 중간까지, 정면, 화면 가운데, 머리 위 여백 5% 정도. 구도가 같아야 캐릭터가 바뀔 때 자연스럽습니다.
- 투명 배경이 안 되는 도구라면 흰 배경으로 만든 뒤 배경을 지우세요.
  - Windows 11 **그림판 → "배경 제거"** 버튼 (가장 간단)
  - 또는 remove.bg, Canva "배경 제거"
- 파일을 넣고 앱을 새로고침하면 바로 반영됩니다.

---

## 2. 추천 도구와 작업 순서

- ChatGPT(이미지 생성), Gemini, Midjourney(`--niji 6`), NovelAI 등 아무거나 괜찮습니다. 애니풍은 Midjourney niji·NovelAI가 가장 강하고, 같은 캐릭터 유지는 ChatGPT/Gemini의 "이어서 수정"이 편합니다.
- **같은 캐릭터 유지 요령**: `normal`을 먼저 만든 뒤, *같은 대화창에서* 아래처럼 요청하세요.
  > Same character, same outfit, same pose and framing, same art style. Change only the facial expression to: **(표정 문구)**. Keep the plain white background.
- ⚠️ 참고 이미지처럼 **특정 게임의 그림체·캐릭터를 그대로 따라 하라고 요청하지 마세요**(저작권). 아래 공통 스타일 문구로 비슷한 분위기를 냅니다.
- 사내 배포 외 용도(외부 공개·상업적 이용)라면 사용한 도구의 이용약관에서 상업적 이용 가능 여부를 확인하세요.

### 공통 스타일 문구 (모든 캐릭터 프롬프트 앞에 붙이기)
```
Korean mobile visual novel character sprite, beautiful anime illustration, clean thin lineart,
soft cel shading with gradient highlights, glossy detailed eyes, detailed shiny hair strands,
pastel color palette, half body from head to mid-thigh, standing, facing viewer, centered,
whole head visible with small margin above, plain white background, high resolution, no text
```

### 표정 문구
| 파일 | 문구 |
|---|---|
| `_normal` | calm neutral expression, mouth closed |
| `_smile` | warm bright smile, happy eyes |
| `_angry` | annoyed angry expression, furrowed brows, frowning |
| `_worried` | flustered worried expression, slight sweat drop |

---

## 3. 우선순위

1. **주인공**(성별 하나 먼저) 7장 → 홈 화면·승진 연출에 계속 나옴
2. **사업부 3인방** 강 파트장 · 김프로 · 황프로
3. **은행 고객 5인** (실제 경제 환경)
4. 배경 `office`, `bank`
5. 나머지 출제자 · 보스 · 배경

---

## 4. 주인공 (플레이어) — 직급별 의상

파일: `player_{f|m}_{직급번호}_normal.png` (직급번호 0~6). `smile`도 넣으면 홈 화면에서 웃는 얼굴로 나옵니다.
주인공 일러스트를 넣으면 캐릭터 생성 화면의 헤어·피부 선택은 숨겨집니다.

**여성 주인공 기본 외형** (`player_f_…`)
```
young Korean woman in her mid 20s, trendy Korean beauty style, shoulder-length layered hush cut with see-through bangs,
natural brown hair, gentle almond eyes (not oversized), clear skin, soft natural makeup, warm smile
```
**남성 주인공 기본 외형** (`player_m_…`)
```
handsome young Korean man in his mid 20s, trendy Korean "comma hair" (쉼표머리) with side-swept bangs curling at the end,
dark brown hair, calm almond eyes (not oversized), clean-cut gentle face, slim build
```

| 번호 | 직급 | 의상 문구 (기본 외형 뒤에 붙이기) |
|---|---|---|
| 0 | 인턴 Lv1 | white dress shirt, blue lanyard with employee ID card, no jacket, slightly nervous posture |
| 1 | 신입 BM Lv5 | navy business suit, (man: blue tie / woman: white blouse), small company lapel pin |
| 2 | 방카 BM Lv10 | dark navy tailored suit, holding a business card in one hand, confident pose |
| 3 | 지역단장 Lv20 | charcoal premium suit, bronze star badge on the lapel, leader-like posture |
| 4 | 사업부장 Lv30 | elegant dark blue suit, gold star badge on the lapel, gold pocket square |
| 5 | 부사장 Lv40 | black three-piece suit with vest, gold badge, red pocket square, dignified |
| 6 | 사장 Lv50 | luxurious black three-piece suit, gold badge, red scarf/tie, golden sparkle aura, charismatic CEO |

---

## 5. 출제자 · 고객 · 보스 (키 / 외형 프롬프트)

| 키 | 인물 | 외형 프롬프트 |
|---|---|---|
| `partjang` | 정 파트장 (방카 전반) | Korean man late 40s, slicked-back black hair with gray temples, dark rectangular glasses, light stubble, sharp but warm eyes, dark navy suit, burgundy tie, veteran manager aura |
| `kimpro` | 김프로 (상품) | Korean man early 40s, side-parted dark brown hair, black rectangular glasses, smart navy-blue suit, blue tie, white pocket square, intellectual |
| `hwangpro` | 황프로 (방카OP센터) | Korean woman mid 30s, chin-length brown bob with bangs, thin gold half-rim glasses, sage green cardigan over cream blouse, pearl necklace, meticulous and kind |
| `ajumma` | 친절한 아줌마 | Korean woman around 50, short curly brown permed hair, round friendly face, pink cardigan, gold earrings, holding a handbag, very warm |
| `ajeossi` | 성질 급한 아저씨 | Korean man around 50, very short black hair, thick eyebrows, stubble, gray windbreaker jacket, impatient, checking wristwatch |
| `worker` | 젊은 직장인 | Korean woman late 20s, long straight black hair, light blue office blouse with small navy bow, holding a smartphone, curious |
| `harabeoji` | 진상 할아버지 | Korean grandfather in his 70s, bald top with white side hair, white mustache, round brown glasses, brown knit vest over shirt, holding a folded newspaper, grumpy |
| `halmeoni` | 진상 할머니 | Korean grandmother in her 70s, gray hair in a bun with a gold hairpin, purple traditional-style vest, jade earrings, impatient and loud |
| `jogyo` | 이조교 (경제학 쉬움) | Korean man late 20s, messy short brown hair, sky-blue hoodie, holding a stack of papers, cheerful teaching assistant |
| `kimgyosu` | 김교수 (경제학 보통) | Korean professor in his 60s, neat gray hair, round gold glasses, brown knit vest, shirt and tie, gentle smile |
| `parkgyosu` | 박교수 (경제학 어려움) | Korean man early 40s, slicked black hair, black square glasses, black suit with purple tie, cold strict professor |
| `yunpro` | 윤프로 (용어 쉬움) | Korean woman late 20s, auburn ponytail with pink hair tie, pink blazer, bright cheerful coworker |
| `choiseonim` | 최선임 (용어 보통) | Korean man late 30s, side-parted black hair, cool sharp eyes, charcoal suit with black tie, aloof senior coworker |
| `ochajang` | 오차장 (용어 어려움) | Korean woman early 40s, black hair in a tight updo, red-framed square glasses, wine-red suit, perfectionist manager |
| `vip` | VIP 정회장 (보스) | wealthy Korean chairman in his 70s, swept gray hair, gray mustache, black three-piece suit, gold tie and pocket square, gold ring, intimidating |
| `inspector` | 미스터리 쇼퍼 (보스) | Korean woman early 30s, long straight black hair, black square glasses, gray suit, hiding a checklist clipboard behind her back, mysterious |
| `teamlead` | 최 팀장 (일간 보스 ★1) | Korean woman early 40s, sleek short black hair, cat-like sharp eyes, teal bank uniform jacket with bank pin, confident team leader |
| `wmcenter` | 윤 센터장 (일간 보스 ★3) | elegant Korean woman in her 50s, dark hair in a neat updo, thin gold glasses, wine-red suit, pearl necklace, private-banking center head |
| `bankceo` | 한 행장 (일간 보스 ★4) | Korean bank CEO in his 60s, silver side-parted hair, half-rim glasses, black three-piece suit, teal tie, gold badge, commanding |
| `bokgov` | 한국은행 총재 (일간 보스 ★5) | Korean central bank governor in his 60s, neat white hair, thin metal glasses, dark navy suit, calm intellectual and overwhelming presence |
| `branchmgr` | 박 지점장 (일간 보스 ★2) | Korean bank branch manager in his 50s, slicked dark hair, half-rim glasses, dark green suit with gold tie, bank badge pin, demanding |

---

## 6. 배경 (`img/bg/`)

공통 문구:
```
anime visual novel background art, detailed, soft lighting, vertical composition, no people, no text
```

| 파일 | 장소 | 프롬프트 |
|---|---|---|
| `office.jpg` | 보험사 사무실 | modern Korean insurance company office, rows of desks with monitors, large windows with city skyline, daytime |
| `bank.jpg` | 은행 창구 | Korean bank branch interior, teller counters, queue number display, ATM, bright clean teal and white tones |
| `classroom.jpg` | 연수원 강의실 | training institute lecture room, green chalkboard with economics graphs, wooden desks |
| `booth.jpg` | 상담 부스 | cozy financial consultation booth in a bank, small table, brochures, warm beige tones |
| `meeting.jpg` | 지역단 상담실 | small meeting room with sales charts on the wall, city view window |
| `private_office.jpg` | 사업부장실 | executive private office, wooden desk, bookshelf, large window |
| `vp.jpg` | 부사장실 | luxurious executive office, dark wood paneling, leather chair, trophies |
| `ceo.jpg` | 사장실 | top floor CEO office at night, panoramic city night view, gold accents |
| `vip.jpg` | VIP 라운지 | private bank VIP lounge, chandeliers, dark navy and gold, leather sofas |
| `inspect.jpg` | 점검 창구 | bank financial product counter with consumer protection poster, slightly tense mood |
| `branch_office.jpg` | 지점장실 | bank branch manager office, performance chart on the wall, desk with nameplate |
| `hq.jpg` | 은행장실 | bank headquarters CEO office, large window over the city, dark wood and gold accents |
| `bok.jpg` | 한국은행 회의실 | central bank monetary policy board meeting room, large round wooden table, emblem on the wall, solemn |
| `title.jpg` | 타이틀 | city street at sunset with cherry blossom petals, pastel pink and orange sky |
