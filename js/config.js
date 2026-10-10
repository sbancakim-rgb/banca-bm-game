/* =========================================================
   게임 설정 — 출제자(NPC), 카테고리, 직급, 명예(전직), 이벤트, 업적
   ========================================================= */
const SKIN = { a: '#ffe3d1', b: '#f7d2b8', c: '#efc3a2' };

const NPCS = {
  /* ---- 방카슈랑스 (사업부) ---- */
  partjang: {
    name: '정 파트장', role: '방카사업부 파트장', bg: 'office', time: 25,
    spec: { gender: 'm', skin: SKIN.b, eye: 'sharp', eyeColor: '#3b2a20', brow: 'stern', thickBrows: true, wrinkles: false,
      hair: { style: 'male_slick', color: '#2a2526' }, beard: 'stubble', glasses: 'square', glassesColor: '#3a3036',
      outfit: { type: 'suit', main: '#2a3045', tie: '#7a1f2b', acc: ['pin'] } },
    intro: ['어이, 왔나. 커피 한 잔 하고 시작하지.', '방카는 규정 하나 놓치면 한 방에 간다. 정신 바짝 차려.', '오늘도 은행 지점 돌기 전에 기본기 점검이다.'],
    ok: ['그렇지. 그게 현장 감각이야.', '좋아, 지점장 앞에서도 그렇게만 말해.', '음. 합격.'],
    ng: ['…이건 불완전판매로 바로 이어진다. 다시 보자.', '허허, 이거 지점에서 틀리면 큰일 나.', '괜찮다. 틀린 건 지금 고치면 돼.'],
    timeout: ['고객은 기다려주지 않는다.'],
    end: { good: '수고했다. 오늘 실적 기대하지.', bad: '오답노트 꼭 복습하고 퇴근해.' }
  },
  kimpro: {
    name: '김프로', role: '방카사업부 상품 담당', bg: 'office', time: 25,
    spec: { gender: 'm', skin: SKIN.a, eye: 'sharp', eyeColor: '#2f3d5c', glasses: 'square',
      hair: { style: 'male_side', color: '#3a2e2a' },
      outfit: { type: 'suit', main: '#3b4f7a', tie: '#2f6fd6', acc: ['pocket_square'], square: '#e8eef8' } },
    intro: ['자, 상품 공부 시간입니다. 약관은 거짓말을 안 하죠.', '공시이율, 환급률… 오늘도 숫자로 승부합시다.', '신상품 나오기 전에 기본 구조부터 확실히!'],
    ok: ['정확합니다! 상품 구조를 제대로 보셨네요.', '오, 그 포인트 은행 직원분들한테 그대로 설명하세요.', '완벽해요.'],
    ng: ['아쉽네요. 이 부분, 고객 민원 단골이에요.', '여기서 헷갈리는 분 많아요. 해설 같이 봐요.', '음… 상품설명서 다시 한 번!'],
    timeout: ['시간 초과! 상품 설명은 막힘없이 나와야죠.'],
    end: { good: '오늘 상품 이해도 최고였어요!', bad: '상품설명서 한 번 더 정독 부탁해요.' }
  },
  hwangpro: {
    name: '황프로', role: '방카OP센터 · 백오피스', bg: 'office', time: 25,
    spec: { gender: 'f', skin: SKIN.a, eye: 'round', eyeColor: '#6b3f2a', lashes: true, blush: true, earrings: '#e9d8a6',
      hair: { style: 'female_bob', color: '#4a2f27' }, glasses: 'half', glassesColor: '#b07a4f',
      outfit: { type: 'cardigan', main: '#9db8a7', inner: '#fffaf0', necklace: '#f5e6c4' } },
    intro: ['서류 한 장, 서명 하나가 계약을 살리고 죽여요.', '청약부터 지급까지, 백오피스 체크리스트 들어갑니다~', '오늘은 꼼꼼함 테스트예요. 대충은 안 돼요!'],
    ok: ['딩동댕~ 서류 반송 걱정 없겠네요.', '꼼꼼하시네요! 마음에 들어요.', '정답! 그대로만 하면 민원 제로예요.'],
    ng: ['앗, 이거 반송 사유예요… 같이 확인해요.', '음~ 이 부분은 저도 처음에 많이 틀렸어요.', '괜찮아요, 해설 보면 바로 기억날 거예요.'],
    timeout: ['시간이 지났어요~ 마감 시간은 지켜야죠!'],
    end: { good: '오늘 처리 완벽! 백오피스가 웃습니다.', bad: '체크리스트 다시 한 번 보고 가요~' }
  },

  /* ---- 실제 경제 환경 (뉴스 보고 온 고객) ---- */
  ajumma: {
    name: '친절한 아줌마', role: '은행 방문 고객 · 쉬움 / 넉넉한 시간', bg: 'bank', time: 35, diff: 1,
    spec: { gender: 'f', skin: SKIN.b, eye: 'round', eyeColor: '#5a3d2b', blush: true, lashes: true,
      hair: { style: 'perm', color: '#5b3a2e' }, earrings: '#f2c641',
      outfit: { type: 'cardigan', main: '#f19cb7', inner: '#fff3e6', necklace: '#ffffff' } },
    intro: ['어머~ 젊은 양반, 나 뉴스 보다가 궁금한 게 있어서 왔어요~', '천천히 해요~ 나 시간 많아요 호호.'],
    ok: ['어머머, 똑똑하기도 해라! 우리 아들 같네~', '호호, 이제 좀 알겠네! 고마워요~'],
    ng: ['어머, 그래요? 나도 헷갈리네~ 다시 설명해줄래요?', '괜찮아요~ 천천히 알려줘요.'],
    timeout: ['어머, 생각이 길어지네~ 다음에 또 올게요~'],
    end: { good: '여기 직원 친절하고 똑똑하다고 소문내야겠네~', bad: '다음엔 더 잘 알려줘요~' }
  },
  ajeossi: {
    name: '성질 급한 아저씨', role: '은행 방문 고객 · 쉬움 / 짧은 시간', bg: 'bank', time: 12, diff: 1,
    spec: { gender: 'm', skin: SKIN.c, eye: 'sharp', eyeColor: '#3b2a20', brow: 'stern', thickBrows: true,
      hair: { style: 'male_short', color: '#1f1b1c' }, beard: 'stubble',
      outfit: { type: 'jumper', main: '#56606e' } },
    intro: ['어이, 나 바빠! 간단하게 물어볼 테니까 빨리 답해!', '주차 시간 10분 남았어. 빨리빨리!'],
    ok: ['오, 빠르네! 마음에 들어!', '그래 그거야! 시원하네!'],
    ng: ['뭐야, 그것도 몰라?!', '에이, 시간만 버렸네!'],
    timeout: ['됐어! 다른 데 가서 물어볼게!'],
    end: { good: '여기 일 잘하네! 다음에 또 올게!', bad: '쯧… 공부 좀 더 해!' }
  },
  worker: {
    name: '젊은 직장인', role: '은행 방문 고객 · 보통', bg: 'bank', time: 22, diff: 2,
    spec: { gender: 'f', skin: SKIN.a, eye: 'round', eyeColor: '#3f5a7a', lashes: true,
      hair: { style: 'female_long', color: '#2b2226' },
      outfit: { type: 'blouse', shirt: '#eef4ff', ribbon: '#3c6fd1' } },
    intro: ['점심시간에 잠깐 나왔어요. 요즘 뉴스가 너무 헷갈려서요.', '재테크 시작하려는데, 하나만 여쭤봐도 될까요?'],
    ok: ['아~ 그런 거였구나! 이해됐어요.', '역시 전문가시네요!'],
    ng: ['어? 제가 본 기사랑 좀 다른데요…?', '음… 다시 한 번 설명해 주실래요?'],
    timeout: ['앗, 점심시간 끝나서 가볼게요!'],
    end: { good: '덕분에 많이 배웠어요. 다음에 상담 예약할게요!', bad: '조금 더 알아보고 다시 올게요.' }
  },
  harabeoji: {
    name: '진상 할아버지', role: '은행 방문 고객 · 어려움', bg: 'bank', time: 30, diff: 3,
    spec: { gender: 'm', skin: SKIN.b, eye: 'narrow', brow: 'stern', thickBrows: true, browColor: '#d8d8dd', wrinkles: true,
      hair: { style: 'bald', color: '#d4d4da' }, beard: 'mustache', beardColor: '#e3e3e8', glasses: 'round', glassesColor: '#7a5a3a',
      outfit: { type: 'vest', main: '#7b5a3c', shirt: '#f1ede4', tie: '#4a3a5a' } },
    intro: ['어흠! 내가 신문을 50년을 봤어. 대충 대답하면 혼난다.', '요즘 젊은 것들은 경제를 몰라. 자네는 어떤가 보자.'],
    ok: ['…흠. 제법이구먼.', '허허, 요즘 젊은이 중에 쓸만한 놈이 있군.'],
    ng: ['에잉! 쯧쯧쯧. 그것도 모르면서 무슨 상담이야!', '내가 지점장 불러야겠어!'],
    timeout: ['어허! 답답해서 못 기다리겠네!'],
    end: { good: '자네, 명함 하나 주게. 손주한테도 소개하지.', bad: '쯧. 다음엔 공부 좀 하고 와.' }
  },
  halmeoni: {
    name: '진상 할머니', role: '은행 방문 고객 · 어려움 / 짧은 시간', bg: 'bank', time: 12, diff: 3, rush: true,
    spec: { gender: 'f', skin: SKIN.b, eye: 'narrow', wrinkles: true, browColor: '#cfcfd6',
      hair: { style: 'bun', color: '#d9d9e0' }, earrings: '#9ad1b5',
      outfit: { type: 'hanbok_vest', main: '#7a4d8c', inner: '#f3e9dc' } },
    intro: ['빨리빨리! 나 경로당 가야 혀! 빨리 대답혀!', '아이고 답답혀! 빨리빨리 해!'],
    ok: ['아이고, 그려 그려! 빠르네!', '오냐, 그거여! 기특허네!'],
    ng: ['아이고 이 사람아! 틀렸잖여!', '그게 아니여! 빨리빨리 다시 알아봐!'],
    timeout: ['빨리빨리 하랬잖여! 아이고 속 터져!'],
    end: { good: '아이고 우리 손주보다 낫네! 떡 사올게!', bad: '아이고 답답혀! 다음엔 빨리빨리 혀!' }
  },

  /* ---- 경제학 (연수원) — 난이도별 출제자 ---- */
  jogyo: {
    name: '이조교', role: '금융연수원 조교 · 쉬움', bg: 'classroom', time: 30, diff: 1,
    spec: { gender: 'm', skin: SKIN.a, eye: 'round', eyeColor: '#4a3626',
      hair: { style: 'male_short', color: '#4b3426' },
      outfit: { type: 'hoodie', main: '#6f9bd1' } },
    intro: ['안녕하세요! 오늘 강의 전에 워밍업 퀴즈 갈게요~', '교수님 오시기 전에 몸풀기 해요!'],
    ok: ['오~ 정답이에요!', '역시! 기본기 탄탄하시네요.'],
    ng: ['아깝다! 이건 기초라서 꼭 기억하셔야 해요.', '괜찮아요, 저도 처음엔 틀렸어요 ㅎㅎ'],
    timeout: ['앗, 시간 지났어요!'],
    end: { good: '워밍업 완료! 교수님한테 칭찬받으시겠어요.', bad: '복습하면 금방 늘어요. 화이팅!' }
  },
  kimgyosu: {
    name: '김교수', role: '금융연수원 노교수 · 보통', bg: 'classroom', time: 25, diff: 2,
    spec: { gender: 'm', skin: SKIN.b, eye: 'narrow', wrinkles: true, browColor: '#cfcfd6', glasses: 'round', glassesColor: '#8a6d3b',
      hair: { style: 'grey_side', color: '#c9c9d1' },
      outfit: { type: 'vest', main: '#8a6f4e', shirt: '#f4f1ea', tie: '#2b4a6b' } },
    intro: ['허허, 자리에 앉게. 경제학은 결국 사람의 선택에 관한 학문이라네.', '오늘은 원리를 짚어보세. 원리를 알면 상담이 쉬워진다네.'],
    ok: ['허허, 훌륭하구먼.', '그렇지. 바로 그거라네.'],
    ng: ['허허, 괜찮네. 틀리면서 배우는 걸세.', '조금 더 생각해 보게. 해설을 보세.'],
    timeout: ['시간이 다 되었구먼.'],
    end: { good: '오늘 수업 태도 아주 좋았네.', bad: '다음 시간까지 복습해 오게나.' }
  },
  parkgyosu: {
    name: '박교수', role: '금융연수원 경제학 박사 · 어려움', bg: 'classroom', time: 18, diff: 3,
    spec: { gender: 'm', skin: SKIN.a, eye: 'sharp', eyeColor: '#2a2a3a', brow: 'stern', glasses: 'square',
      hair: { style: 'male_slick', color: '#1d1a1f' },
      outfit: { type: 'suit', main: '#1f2433', tie: '#4b2a6b' } },
    intro: ['…시작하죠. 대충 아는 건 모르는 겁니다.', '수식으로 설명 못 하면 이해한 게 아닙니다.'],
    ok: ['…정답. 근거까지 맞췄겠죠?', '좋습니다. 다음.'],
    ng: ['틀렸습니다. 개념을 다시 정리하세요.', '그건 직관일 뿐, 이론이 아닙니다.'],
    timeout: ['시간 초과. 시험이었으면 0점입니다.'],
    end: { good: '…생각보다 괜찮군요.', bad: '재수강을 권합니다.' }
  },

  /* ---- 경제 용어 (사무실 동료) — 난이도별 출제자 ---- */
  yunpro: {
    name: '윤프로', role: '입사 동기 · 쉬움', bg: 'office', time: 30, diff: 1,
    spec: { gender: 'f', skin: SKIN.a, eye: 'round', eyeColor: '#6a3b5a', lashes: true, blush: true,
      hair: { style: 'female_pony', color: '#7a4a32' },
      outfit: { type: 'suit', main: '#e8a0b4', shirt: '#fff', ribbon: '#ffffff' } },
    intro: ['동기야~ 용어 퀴즈 배틀 한 판 할래?', '오늘 점심 내기! 용어 퀴즈로 정하자~'],
    ok: ['헐 대박, 이것도 알아?', '오~ 동기 좀 치는데?'],
    ng: ['ㅋㅋㅋ 이건 내가 이겼다!', '에이~ 이거 지난주에 배웠잖아!'],
    timeout: ['땡! 시간 끝~'],
    end: { good: '아 졌다… 점심은 내가 살게 ㅠㅠ', bad: '오늘 점심은 동기가 쏘는 걸로~ ㅎㅎ' }
  },
  choiseonim: {
    name: '최선임', role: '옆자리 최선임 · 보통', bg: 'office', time: 20, diff: 2,
    spec: { gender: 'm', skin: SKIN.a, eye: 'sharp', eyeColor: '#2b2b3b',
      hair: { style: 'male_side', color: '#1a1a22' },
      outfit: { type: 'suit', main: '#3a3f4b', tie: '#1d1d24' } },
    intro: ['…야. 이거 알아?', '모니터 보는 척하지 말고. 하나 물어볼게.'],
    ok: ['…오. 좀 하네.', '그래, 그 정도는 알아야지.'],
    ng: ['…그것도 몰라? 적어 둬.', '현장 나가서 그렇게 말하면 안 된다.'],
    timeout: ['…됐다. 다음.'],
    end: { good: '…커피 한 잔 사줄게.', bad: '내일 다시 물어본다.' }
  },
  ochajang: {
    name: '오차장', role: '깐깐한 차장 · 어려움', bg: 'office', time: 15, diff: 3,
    spec: { gender: 'f', skin: SKIN.a, eye: 'sharp', eyeColor: '#3a2333', brow: 'stern', lashes: true, glasses: 'square', glassesColor: '#7a1f2b',
      hair: { style: 'female_updo', color: '#231a1e' }, earrings: '#d8d8e0',
      outfit: { type: 'suit', main: '#5a1e2e', shirt: '#f5f0f2', necklace: '#e9e3ea' } },
    intro: ['정확히 답하세요. 애매한 답은 오답입니다.', '보고서에 용어 하나 틀리면 전부 다시 씁니다.'],
    ok: ['정확합니다.', '…좋아요. 그 정확성 유지하세요.'],
    ng: ['틀렸어요. 용어는 정의부터 정확하게.', '이런 실수, 보고서에서 보면 반려입니다.'],
    timeout: ['시간 관리도 실력입니다.'],
    end: { good: '오늘은 합격점입니다.', bad: '내일까지 용어집 정리해 오세요.' }
  },

  /* ---- 주간 보스 ---- */
  vip: {
    name: 'VIP 정회장님', role: '자산 100억 VIP 고객 · 보스', bg: 'vip', time: 20,
    spec: { gender: 'm', skin: SKIN.b, eye: 'narrow', wrinkles: true, browColor: '#bfbfc8', thickBrows: true,
      hair: { style: 'grey_side', color: '#b8b8c2' }, beard: 'mustache', beardColor: '#cfcfd6',
      outfit: { type: 'suit', main: '#1b1b22', tie: '#c9a227', vest: true, acc: ['pocket_square'], square: '#c9a227' } },
    intro: ['자네가 요즘 소문난 방카BM인가? 내 자산 상담을 맡길 만한지 보지.', '나는 금리, 세금, 상품, 경기 전부 묻겠네. 각오하게.'],
    ok: ['호오… 제법이군.', '좋아. 그 정도는 돼야지.'],
    ng: ['실망이군. 그 정도로는 내 돈을 못 맡겨.', '흠, 다른 회사 BM을 불러야 하나.'],
    timeout: ['내 시간은 비싸네.'],
    end: { good: '좋네. 자네 회사 상품으로 일시납 10억 하지.', bad: '다음에 다시 보세. 준비해 오게.' }
  },
  inspector: {
    name: '미스터리 쇼퍼', role: '불완전판매 점검 · 보스', bg: 'inspect', time: 18,
    spec: { gender: 'f', skin: SKIN.a, eye: 'sharp', eyeColor: '#2a3340', lashes: true, glasses: 'square', glassesColor: '#1a1a1a',
      hair: { style: 'female_long', color: '#1c1a20' },
      outfit: { type: 'suit', main: '#4a4f5a', shirt: '#eef0f3', necklace: '#c0c6d0' } },
    intro: ['(평범한 고객인 척) 저기요, 보험 하나 들려고 하는데요…', '(체크리스트를 숨긴 채) 설명 좀 자세히 해주시겠어요?'],
    ok: ['(체크리스트에 ✔ 표시)', '(…설명의무 이행 확인)'],
    ng: ['(체크리스트에 ✘ 표시를 한다…)', '(…불완전판매 소지 있음)'],
    timeout: ['(…응대 지연 기록)'],
    end: { good: '사실 저, 미스터리 쇼퍼였어요. 우수 등급입니다!', bad: '사실 저, 미스터리 쇼퍼였어요… 개선 필요 판정입니다.' }
  },
  branchmgr: {
    name: '박 지점장', role: '△△은행 OO지점장 · 일간 보스', bg: 'branch_office', time: 20,
    spec: { gender: 'm', skin: SKIN.c, eye: 'sharp', eyeColor: '#2b2420', brow: 'stern', wrinkles: true,
      hair: { style: 'male_slick', color: '#3a3536' }, glasses: 'half', glassesColor: '#3a3a3a',
      outfit: { type: 'suit', main: '#1f4a46', tie: '#c9a227', acc: ['pin'] } },
    intro: ['우리 지점 방카 실적 책임질 수 있어? 직원 교육할 실력 되는지 보지.', '보험사 BM이 많이 오는데, 실력 있는 사람은 드물더라고.'],
    ok: ['오, 우리 직원들한테 그대로 교육해 줘.', '좋아요. 믿음이 가네.'],
    ng: ['음… 그건 우리 직원도 아는 건데.', '그렇게 교육하면 곤란하지.'],
    timeout: ['회의 들어가야 해서.'],
    end: { good: '이번 달 우리 지점 25% 한도 꽉 채워봅시다!', bad: '다음 주에 다시 미팅하죠.' }
  },

  /* ---- 일간 보스 (은행 측) ---- */
  teamlead: {
    name: '최 팀장', role: '△△은행 OO지점 팀장 · 일간 보스', bg: 'bank', time: 25,
    spec: { gender: 'f', skin: SKIN.a, eye: 'cat', eyeColor: '#2f4a52', lashes: true, face: 'slim', age: 40,
      hair: { style: 'female_short', color: '#2a2226' }, earrings: '#e9e3ea',
      outfit: { type: 'suit', main: '#1f6f68', shirt: '#f4fbfa', necklace: '#ffffff', acc: ['pin'] } },
    intro: ['BM님, 우리 팀 직원들 교육 들어가기 전에 저부터 확인할게요.', '이번 달 방카 목표가 빡빡해요. 실력 좀 볼까요?'],
    ok: ['오, 직원들한테 바로 써먹을 수 있겠네요.', '좋아요. 깔끔하네요.'],
    ng: ['음… 그렇게 교육하면 직원들이 헷갈려요.', '그건 아닌 것 같은데요?'],
    timeout: ['저 창구 들어가 봐야 해서요.'],
    end: { good: '좋아요, 다음 주 직원 교육 맡겨볼게요!', bad: '다음에 다시 이야기해요.' }
  },
  wmcenter: {
    name: '윤 센터장', role: '△△은행 WM센터장 · 일간 보스', bg: 'vip', time: 18,
    spec: { gender: 'f', skin: SKIN.a, eye: 'sharp', eyeColor: '#3a2333', lashes: true, face: 'oval', age: 50,
      hair: { style: 'female_updo', color: '#3a2a2a' }, earrings: '#f5e6c4', glasses: 'thin', glassesColor: '#c9a227',
      outfit: { type: 'suit', main: '#4a2338', shirt: '#fbf3f6', necklace: '#f5e6c4', acc: ['pin'] } },
    intro: ['우리 센터 고객은 자산가들이에요. 세금, 시장, 경제를 한 번에 꿰고 있어야죠.', 'PB들 앞에서 설명할 수준인지 볼게요.'],
    ok: ['그 정도면 우리 PB들도 납득하겠네요.', '정확해요. 마음에 들어요.'],
    ng: ['자산가 고객 앞에서 그 답이면 끝이에요.', '세부가 틀렸어요.'],
    timeout: ['고객 상담 시간이 돼서요.'],
    end: { good: '다음 VIP 세미나 강사로 모실게요.', bad: '조금 더 준비해서 오세요.' }
  },
  bankceo: {
    name: '한 행장', role: '△△은행장 · 희귀 보스', bg: 'hq', time: 15,
    spec: { gender: 'm', skin: SKIN.b, eye: 'narrow', brow: 'stern', thickBrows: true, browColor: '#bfbfc8', wrinkles: true,
      hair: { style: 'grey_side', color: '#c4c4cc' }, glasses: 'half', glassesColor: '#2a2a2a',
      outfit: { type: 'suit', main: '#16181f', tie: '#1f6f68', vest: true, acc: ['badge_gold', 'pocket_square'], square: '#ffffff' } },
    intro: ['보험사 BM이 행장실까지 올 줄은 몰랐군. 우리 은행 방카 전략을 맡길 만한지 보지.', '한 문제에 15초. 바로 시작하지.'],
    ok: ['…좋아. 근거가 분명하군.', '그래, 그게 맞네.'],
    ng: ['우리 은행 이름을 걸기엔 부족하네.', '그건 틀렸네.'],
    timeout: ['결재가 밀려 있어서.'],
    end: { good: '자네 회사와 전략적 제휴를 검토하도록 지시하겠네.', bad: '다음에 다시 보세.' }
  },
  bokgov: {
    name: '한국은행 총재', role: '한국은행 총재 · 전설 보스', bg: 'bok', time: 12,
    spec: { gender: 'm', skin: SKIN.b, eye: 'narrow', brow: 'stern', browColor: '#d8d8de', wrinkles: true,
      hair: { style: 'grey_side', color: '#dcdce2' }, glasses: 'thin', glassesColor: '#7a7a86',
      outfit: { type: 'suit', main: '#1d2742', tie: '#6b5a2a', acc: ['badge_gold'] } },
    intro: ['…통화정책은 경제 전체를 봐야 합니다. 당신의 시야는 어디까지입니까?', '금통위 회의 전에 잠깐 시간을 냈습니다. 시작하죠.'],
    ok: ['…정확한 이해입니다.', '좋습니다. 그 판단이 맞습니다.'],
    ng: ['시장은 그렇게 단순하지 않습니다.', '그 해석은 위험합니다.'],
    timeout: ['회의가 시작됩니다.'],
    end: { good: '훌륭합니다. 금융시장에 당신 같은 사람이 필요합니다.', bad: '경제를 더 넓게 보십시오.' }
  },

  /* ---- 스토리용 ---- */
  narrator: { name: '', role: '' }
};

Object.entries(NPCS).forEach(([k, n]) => { if (n.spec) n.spec.key = k; });

/* 카테고리 = 하루 1회씩 플레이 가능한 일정 */
const CATS = {
  banca_general: { label: '방카슈랑스 전반', group: 'banca', icon: '🏦', npcs: ['partjang'], color: '#2f6fd6', desc: '제도·규제·세제' },
  banca_product: { label: '방카 상품', group: 'banca', icon: '📦', npcs: ['kimpro'], color: '#3b8f6a', desc: '연금·저축 상품' },
  banca_backoffice: { label: '백오피스', group: 'banca', icon: '🗂️', npcs: ['hwangpro'], color: '#b0603a', desc: '청약·변경·지급' },
  market: { label: '실제 경제 환경', group: 'market', icon: '📰', npcs: ['ajumma', 'ajeossi', 'worker', 'harabeoji', 'halmeoni'], color: '#d9534f', desc: '뉴스 보고 온 고객' },
  econ: { label: '경제학', group: 'econ', icon: '🎓', npcs: ['jogyo', 'kimgyosu', 'parkgyosu'], byDiff: true, color: '#6a4c93', desc: '연수원 강의' },
  term: { label: '경제 용어', group: 'term', icon: '📖', npcs: ['yunpro', 'choiseonim', 'ochajang'], byDiff: true, color: '#c9831f', desc: '사무실 동료' }
};
const CAT_ORDER = ['banca_general', 'banca_product', 'banca_backoffice', 'market', 'econ', 'term'];
const GROUPS = {
  banca: { label: '방카슈랑스', cats: ['banca_general', 'banca_product', 'banca_backoffice'] },
  market: { label: '실제 경제 환경', cats: ['market'] },
  econ: { label: '경제학', cats: ['econ'] },
  term: { label: '경제 용어', cats: ['term'] }
};

/* 직급 (레벨 → 외형/배경) */
const RANKS = [
  { lv: 1, title: '인턴', bg: 'office', look: { type: 'shirt', acc: ['lanyard'] }, perk: '사원증 · 셔츠' },
  { lv: 5, title: '신입 BM', bg: 'office', look: { type: 'suit', main: '#2b3a67', tie: '#3c6fd1', acc: ['pin'] }, perk: '정장' },
  { lv: 10, title: '방카 BM', bg: 'booth', look: { type: 'suit', main: '#25305a', tie: '#9b2335', acc: ['pin', 'namecard'] }, perk: '명함 · 상담 부스' },
  { lv: 20, title: '지역단장', bg: 'meeting', look: { type: 'suit', main: '#2e3138', tie: '#6b2a2a', acc: ['badge_bronze', 'namecard'] }, perk: '브론즈 배지 · 상담실' },
  { lv: 30, title: '사업부장', bg: 'private_office', look: { type: 'suit', main: '#1f2a44', tie: '#c9a227', acc: ['badge_gold', 'pocket_square'] }, perk: '골드 배지 · 개인 사무실' },
  { lv: 40, title: '부사장', bg: 'vp', look: { type: 'suit', main: '#1c1c24', tie: '#7a1f2b', vest: true, acc: ['badge_gold', 'pocket_square'], square: '#c9302c' }, perk: '골드 배지 · 부사장실' },
  { lv: 50, title: '사장', bg: 'ceo', look: { type: 'suit', main: '#111118', tie: '#c9a227', vest: true, acc: ['badge_gold', 'pocket_square', 'scarf'], square: '#c9a227' }, aura: true, perk: '사장실 · 전용 이펙트' }
];
const MAX_LV = 50;
const xpNeed = (lv) => 80 + 25 * lv + 2 * lv * lv;

/* 명예(전직) — Lv10부터 */
const CLASSES = {
  banca: { name: '보험 스페셜리스트', icon: '🛡️', color: '#2f6fd6' },
  market: { name: '마켓 애널리스트', icon: '📈', color: '#d9534f' },
  econ: { name: '이코노미스트', icon: '🎓', color: '#6a4c93' },
  term: { name: '용어 마스터', icon: '📖', color: '#c9831f' },
  all: { name: '올라운더', icon: '💼', color: '#c9a227' }
};
const CLASS_LV = 10;
const HONOR_TIERS = [
  { min: 0, name: '견습', color: '#9aa3b2' }, { min: 300, name: '브론즈', color: '#cd7f32' },
  { min: 1200, name: '실버', color: '#a9b4c2' }, { min: 3000, name: '골드', color: '#e0b020' },
  { min: 6000, name: '플래티넘', color: '#4fc1c9' }, { min: 10000, name: '다이아', color: '#7d6cf0' }
];

/* 일간 보스 — 매일 1명 랜덤 (뒤로 갈수록 희귀하고 어려움) */
const BOSS_TIERS = [
  { id: 'teamlead', npc: 'teamlead', title: '은행 팀장', rate: 50, stars: 1, count: 5, diffs: [1, 1, 2, 2, 2], mult: 1.8, cash: 300,
    cats: ['banca_general', 'market', 'term'], desc: '지점 직원 교육을 맡길지 고민하는 팀장님. 기본기 위주 5문제.' },
  { id: 'branchmgr', npc: 'branchmgr', title: '은행 지점장', rate: 30, stars: 2, count: 6, diffs: [1, 2, 2, 2, 3, 3], mult: 2.2, cash: 600,
    cats: ['banca_general', 'market', 'econ', 'term'], desc: '지점 실적을 책임지는 지점장. 방카 규정과 시황 6문제.' },
  { id: 'wmcenter', npc: 'wmcenter', title: 'WM센터장', rate: 14, stars: 3, count: 7, diffs: [2, 2, 2, 3, 3, 3, 3], mult: 2.8, cash: 1200,
    cats: ['banca_general', 'market', 'econ'], desc: '자산가 고객을 상대하는 센터장. 세제·시장·경제 고난도 7문제.' },
  { id: 'bankceo', npc: 'bankceo', title: '은행장', rate: 5, stars: 4, count: 8, diffs: [2, 3, 3, 3, 3, 3, 3, 3], mult: 4, cash: 3000,
    cats: ['banca_general', 'market', 'econ', 'term'], desc: '아주 드물게 등장. 전 분야 최고 난이도 8문제, 15초 제한.' },
  { id: 'bokgov', npc: 'bokgov', title: '한국은행 총재', rate: 1, stars: 5, count: 10, diffs: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], mult: 6, cash: 8000,
    cats: ['market', 'econ', 'term'], desc: '전설의 보스. 금리·경제 극한 난이도 10문제, 12초 제한.' }
];

/* 오늘의 이벤트 */
function todayEvents(d = new Date()) {
  const ev = [];
  const day = d.getDay();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (day === 1) ev.push({ id: 'newprod', icon: '🚀', title: '월요일 신상품 교육', desc: '방카 상품 XP ×2', cats: ['banca_product'], mult: 2 });
  if (day === 3) ev.push({ id: 'news', icon: '📰', title: '수요일 경제 브리핑', desc: '실제 경제 환경 XP ×1.5', cats: ['market'], mult: 1.5 });
  if (day === 5) ev.push({ id: 'friday', icon: '🎉', title: '불금 용어 배틀', desc: '경제 용어 XP ×1.5', cats: ['term'], mult: 1.5 });
  if (d.getDate() > last - 3) ev.push({ id: 'closing', icon: '🔥', title: '월말 마감 러시', desc: '모든 XP ×1.5', cats: CAT_ORDER, mult: 1.5 });
  if (day === 0 || day === 6) ev.push({ id: 'weekend', icon: '☕', title: '주말 자기계발', desc: '경제학 XP ×1.5', cats: ['econ'], mult: 1.5 });
  return ev;
}

/* 업적 100개 — stat 값이 goal 이상이면 달성. 50레벨까지 고르게 달성되도록 단계 배치 */
const ACHIEVEMENTS = (() => {
  const A = [];
  const add = (group, icon, stat, list) => list.forEach(([goal, name, desc], i) =>
    A.push({ id: `${stat}_${goal}`, group, icon, stat, goal, name, desc, honor: 40 + 60 * i, cash: (40 + 60 * i) * 3 }));
  add('레벨', '🎖️', 'lv', [[5, '정장 개시', 'Lv5 달성'], [10, '명함의 무게', 'Lv10 달성'], [15, '현장 적응 완료', 'Lv15 달성'], [20, '지역단장 취임', 'Lv20 달성'], [25, '반환점', 'Lv25 달성'],
    [30, '사업부장 취임', 'Lv30 달성'], [35, '방카 전략가', 'Lv35 달성'], [40, '부사장 취임', 'Lv40 달성'], [45, '전설의 시작', 'Lv45 달성'], [50, '사장 취임', 'Lv50 달성']]);
  add('정답', '✅', 'correct', [[10, '첫 걸음', '누적 정답 10'], [50, '감 잡았다', '누적 정답 50'], [100, '백 개의 정답', '누적 정답 100'], [200, '지식 저축왕', '누적 정답 200'],
    [500, '오백 고지', '누적 정답 500'], [1000, '천 개의 정답', '누적 정답 1,000'], [1500, '지식 복리 효과', '누적 정답 1,500'], [2000, '이천 고지', '누적 정답 2,000'],
    [2500, '살아있는 교과서', '누적 정답 2,500'], [3000, '방카 백과사전', '누적 정답 3,000']]);
  [['banca_general', '🏦', '방카 전반'], ['banca_product', '📦', '방카 상품'], ['banca_backoffice', '🗂️', '백오피스'], ['market', '📰', '시황'], ['econ', '🎓', '경제학'], ['term', '📖', '경제 용어']]
    .forEach(([c, ic, l]) => add('분야', ic, 'c_' + c, [[30, `${l} 입문`, `${l} 정답 30`], [150, `${l} 숙련`, `${l} 정답 150`], [400, `${l} 달인`, `${l} 정답 400`]]));
  add('출근', '🗓️', 'streak', [[3, '작심삼일 돌파', '3일 연속 출근'], [7, '개근상', '7일 연속 출근'], [14, '2주 개근', '14일 연속 출근'], [30, '한 달 개근', '30일 연속 출근'], [50, '철인 BM', '50일 연속 출근'], [100, '백일 개근', '100일 연속 출근']]);
  add('일정', '📅', 'fullday', [[1, '풀 스케줄', '하루 모든 일정 완료'], [5, '성실 BM', '풀 스케줄 5일'], [20, '일정 관리의 신', '풀 스케줄 20일'], [50, '워커홀릭', '풀 스케줄 50일']]);
  add('완벽', '💯', 'perfect', [[1, '무결점 상담', '전문 정답 일정 1회'], [5, '완벽주의자', '전문 정답 일정 5회'], [15, '실수 없는 BM', '15회'], [30, '퍼펙트 메이커', '30회'], [60, '무결점 전설', '60회'], [100, '퍼펙트 100', '100회']]);
  add('콤보', '🔥', 'maxCombo', [[5, '불붙은 상담', '5연속 정답'], [10, '멈출 수 없는 BM', '10연속 정답'], [15, '연쇄 계약', '15연속 정답'], [20, '콤보 마스터', '20연속 정답'], [30, '전설의 30콤보', '30연속 정답']]);
  add('보스', '🧑‍💼', 'boss_teamlead', [[1, '팀장님 설득', '은행 팀장 격파'], [10, '팀장님 단골', '은행 팀장 10회 격파']]);
  add('보스', '🏢', 'boss_branchmgr', [[1, '지점장 격파', '은행 지점장 격파'], [10, '지점장의 신뢰', '은행 지점장 10회 격파']]);
  add('보스', '💎', 'boss_wmcenter', [[1, '센터장의 인정', 'WM센터장 격파'], [5, 'WM센터 단골', 'WM센터장 5회 격파']]);
  add('보스', '👔', 'boss_bankceo', [[1, '행장 접견', '은행장 격파'], [3, '행장의 오른팔', '은행장 3회 격파']]);
  add('보스', '🏛️', 'boss_bokgov', [[1, '총재와의 담판', '한국은행 총재 격파']]);
  add('보스', '📖', 'bossSeen', [[5, '보스 도감 완성', '5종 보스를 모두 만나기']]);
  add('학습회', '📝', 'practice', [[50, '학습회 개근', '연습문제 정답 50'], [200, '연습벌레', '연습문제 정답 200'], [500, '연습의 달인', '연습문제 정답 500'], [1000, '연습 천 번', '연습문제 정답 1,000']]);
  add('학습회', '📰', 'articles', [[10, '뉴스 읽는 BM', '경제 기사 10건 읽기'], [50, '시황 브리핑', '경제 기사 50건'], [150, '경제 신문 마니아', '경제 기사 150건']]);
  add('학습회', '📚', 'notes', [[10, '자료실 탐험가', '학습 자료 10건 읽기'], [50, '자료실 주인', '학습 자료 50건']]);
  add('복습', '📒', 'fixed', [[10, '복습왕', '오답 10개 극복'], [50, '오답 사냥꾼', '오답 50개 극복'], [150, '오답 제로', '오답 150개 극복']]);
  add('아이템', '🎒', 'itemsUsed', [[10, '아이템 활용가', '아이템 10회 사용'], [50, '전략적 BM', '아이템 50회 사용'], [150, '아이템 장인', '아이템 150회 사용']]);
  add('아이템', '🛒', 'purchases', [[5, '단골 손님', '상점 구매 5회'], [30, 'VIP 손님', '상점 구매 30회']]);
  add('아이템', '🌿', 'vigor', [[1, '홍삼의 힘', '활기력 1회 사용'], [10, '야근 체질', '활기력 10회 사용']]);
  add('활동비', '💰', 'moneyTotal', [[100000, '알뜰 BM', '누적 활동비 10만원'], [500000, '활동비 부자', '누적 활동비 50만원']]);
  add('명물', '👵', 'npc_halmeoni', [[10, '빨리빨리 정복', '진상 할머니에게 정답 10']]);
  add('명물', '👴', 'npc_harabeoji', [[10, '할아버지의 인정', '진상 할아버지에게 정답 10']]);
  add('명물', '🧑‍🏫', 'npc_parkgyosu', [[10, '박교수의 침묵', '박교수에게 정답 10']]);
  add('명물', '📝', 'npc_ochajang', [[10, '반려 없는 보고서', '오차장에게 정답 10']]);
  add('명물', '😤', 'npc_ajeossi', [[10, '아저씨 단골', '성질 급한 아저씨에게 정답 10']]);
  add('기타', '⚡', 'speed', [[10, '번개 응대', '3초 안에 정답 10회']]);
  add('기타', '✨', 'golden', [[1, '황금 손', '황금 문제 정답'], [10, '황금 사냥꾼', '황금 문제 정답 10회']]);
  add('기타', '🦅', 'reports', [[1, '매의 눈', '이의 제기 1건'], [5, '품질 지킴이', '이의 제기 5건']]);
  return A;
})();

/* 아이템 */
const ITEMS = [
  { id: 'hint', icon: '💡', name: '힌트 쪽지', price: 300, use: 'q', desc: '문제의 힌트를 본다' },
  { id: 'erase', icon: '✂️', name: '오답 지우개', price: 400, use: 'q', mc: true, desc: '4지선다에서 오답 1개를 지운다' },
  { id: 'skip', icon: '⏭️', name: '패스권', price: 500, use: 'q', desc: '문제를 건너뛰고 새 문제를 받는다' },
  { id: 'retry', icon: '🔁', name: '재도전권', price: 700, use: 'q', desc: '이번 문제를 틀려도 한 번 더 고를 수 있다' },
  { id: 'time', icon: '⏳', name: '모래시계', price: 200, use: 'q', desc: '제한시간 +10초' },
  { id: 'calm', icon: '🍵', name: '녹차 한 잔', price: 350, use: 'q', desc: '고객 진정! 남은 시간 1.5배 · 빨리빨리 무효' },
  { id: 'shield', icon: '🛡️', name: '콤보 보호막', price: 600, use: 'q', desc: '이번 문제를 틀려도 콤보 유지' },
  { id: 'xpboost', icon: '📈', name: '실적 부스터', price: 1500, use: 's', desc: '이번 일정 남은 문제 XP ×1.5' },
  { id: 'cashboost', icon: '💳', name: '법인카드', price: 1000, use: 's', desc: '이번 일정 남은 문제 활동비 ×2' },
  { id: 'lucky', icon: '🍀', name: '행운의 볼펜', price: 1200, use: 's', desc: '이번 일정 황금 문제 확률 10%→35%' },
  { id: 'drink', icon: '🧃', name: '병음료', price: 2000, use: 'vigor', desc: '활기력! 완료한 분야를 오늘 한 번 더' },
  { id: 'ginseng', icon: '🌿', name: '홍삼 스틱', price: 3500, use: 'vigor', bonus: 1.2, desc: '활기력! 한 번 더 + 그 일정 XP ×1.2' },
  { id: 'bossticket', icon: '🎫', name: '보스 재도전권', price: 4000, use: 'boss', desc: '오늘의 보스에게 한 번 더 도전' }
];
const STARTER_ITEMS = { hint: 3, erase: 2, time: 2, drink: 1 };
const CASH = { 1: 30, 2: 50, 3: 80, practice: 5, perfect: 200, daily: 100, study: 20 };
const STUDY_XP = { practice: 1, article: 2, note: 2, dailyMax: 5 };

/* 플레이어 커스터마이즈 옵션 */
const PLAYER_HAIR = {
  m: [{ style: 'm_comma', label: '쉼표머리' }, { style: 'm_part', label: '가르마펌' }, { style: 'm_dandy', label: '댄디컷' }, { style: 'm_leaf', label: '리프컷' }],
  f: [{ style: 'f_hush', label: '허쉬컷' }, { style: 'f_ccurl', label: 'C컬 단발' }, { style: 'f_seewave', label: '시스루 웨이브' }, { style: 'f_layer', label: '레이어드 롱' }]
};
const HAIR_COLORS = ['#2a2226', '#5b3a2e', '#8a5a3c', '#c48a5a', '#3a3f6b', '#7a2e3a'];
const FACES = {
  f: [{ id: 'f1', label: '청순', eye: 'almond', eyeScale: 0.95, face: 'slim', blush: true, lashes: true, eyeColor: '#5a3a2e' },
    { id: 'f2', label: '강아지상', eye: 'droopy', eyeScale: 0.92, face: 'oval', blush: true, lashes: true, eyeColor: '#6a4530' },
    { id: 'f3', label: '고양이상', eye: 'cat', eyeScale: 0.95, face: 'slim', blush: false, lashes: true, eyeColor: '#3a3a4a' },
    { id: 'f4', label: '시크', eye: 'sharp', eyeScale: 0.95, face: 'slim', blush: false, lashes: true, eyeColor: '#2a2a33', brow: 'stern' },
    { id: 'f5', label: '나른한', eye: 'sleepy', eyeScale: 0.9, face: 'oval', blush: true, lashes: true, eyeColor: '#4a3a4a' },
    { id: 'f6', label: '상큼', eye: 'round', eyeScale: 0.9, face: 'round', blush: true, lashes: true, eyeColor: '#5a4a2a' }],
  m: [{ id: 'm1', label: '훈훈한', eye: 'almond', eyeScale: 0.92, face: 'slim', eyeColor: '#3d2b22' },
    { id: 'm2', label: '강아지상', eye: 'droopy', eyeScale: 0.9, face: 'oval', eyeColor: '#4a3322' },
    { id: 'm3', label: '여우상', eye: 'cat', eyeScale: 0.92, face: 'slim', eyeColor: '#2a2a33' },
    { id: 'm4', label: '카리스마', eye: 'sharp', eyeScale: 0.92, face: 'slim', eyeColor: '#1d1d24', brow: 'stern', thickBrows: true },
    { id: 'm5', label: '나른한', eye: 'sleepy', eyeScale: 0.9, face: 'oval', eyeColor: '#3a2a2a' },
    { id: 'm6', label: '듬직한', eye: 'almond', eyeScale: 0.9, face: 'round', eyeColor: '#3a2a1a', thickBrows: true }]
};
const AGES = [{ v: 20, label: '20대' }, { v: 30, label: '30대' }, { v: 40, label: '40대' }, { v: 50, label: '50대' }];
const GLASSES = [{ v: '', label: '없음' }, { v: 'round', label: '동그란' }, { v: 'square', label: '사각' }, { v: 'thin', label: '얇은 테' }, { v: 'half', label: '반무테' }];
const GLASS_COLORS = ['#2a2a33', '#7a5a3a', '#b07a4f', '#9a9aa6', '#7a1f2b'];

const DAILY_Q = 5;
const DIFF_XP = { 1: 10, 2: 16, 3: 25 };
const DIFF_LABEL = { 1: '쉬움', 2: '보통', 3: '어려움' };

/* 사내 복지관: 외모 변경 비용 */
const BEAUTY = {
  salon: { name: '미용실', icon: '💇', price: 1500, desc: '헤어스타일 · 머리색 · 안경' },
  clinic: { name: '성형외과', icon: '🏥', price: 3000, desc: '얼굴형 · 눈매 · 피부톤 · 나이대' }
};

/* 최우수BM 보상 */
const BEST_BM = { week: { honor: 500, cash: 5000, label: '주간' }, month: { honor: 1500, cash: 15000, label: '월간' } };

/* 홈 캐릭터 멘트 기본값 — 실제 운영 멘트는 구글 시트 '멘트' 탭에서 관리 */
const TALK_DEFAULT = [{"type": "생각", "expr": "기본", "text": "(점심은 제육? 돈까스? …이것도 기회비용이지.)", "cond": "항상"}, {"type": "말", "expr": "미소", "text": "공시이율은 내려가도 제 열정은 최저보증이에요!", "cond": "항상"}, {"type": "생각", "expr": "걱정", "text": "(지점장님 눈빛이 오늘따라 매섭던데…)", "cond": "항상"}, {"type": "말", "expr": "씩", "text": "복리의 마법, 제 실력에도 적용 중입니다.", "cond": "항상"}, {"type": "생각", "expr": "놀람", "text": "(헉, 청약서 자필서명 빠뜨린 거 아니지?)", "cond": "항상"}, {"type": "말", "expr": "활짝", "text": "커피 한 잔이면 방카 규정 다 외울 수 있어요!", "cond": "항상"}, {"type": "생각", "expr": "기본", "text": "(오늘은 은행 직원분들께 뭘 알려드리지…)", "cond": "항상"}, {"type": "말", "expr": "미소", "text": "고객님의 노후, 제가 함께 설계해 드릴게요.", "cond": "항상"}, {"type": "말", "expr": "기본", "text": "불완전판매 제로. 그게 진짜 실적이죠.", "cond": "항상"}, {"type": "생각", "expr": "미소", "text": "(인턴 때 생각하면… 많이 컸다, 나.)", "cond": "항상"}, {"type": "생각", "expr": "걱정", "text": "(환율이 또 움직였네… 달러보험 문의 오겠다.)", "cond": "항상"}, {"type": "말", "expr": "씩", "text": "황금 문제? 저한텐 그냥 문제예요.", "cond": "항상"}, {"type": "생각", "expr": "기본", "text": "(금리가 오르면 공시이율도… 따라오겠지? 시차가 있으니까.)", "cond": "항상"}, {"type": "말", "expr": "활짝", "text": "오늘도 계약 성사! …하고 싶다.", "cond": "항상"}, {"type": "생각", "expr": "걱정", "text": "(25%룰… 아니 그건 은행이 걱정할 일인가?)", "cond": "항상"}, {"type": "말", "expr": "기본", "text": "설명은 쉽게, 근거는 정확하게. 오늘의 다짐!", "cond": "항상"}, {"type": "생각", "expr": "미소", "text": "(김프로님 상품 설명은 언제 들어도 명강의야.)", "cond": "항상"}, {"type": "생각", "expr": "놀람", "text": "(황프로님한테 서류 반송 연락 오면 어떡하지…)", "cond": "항상"}, {"type": "말", "expr": "미소", "text": "정 파트장님 안경 바꾸셨나? 오늘따라 더 날카로우셔.", "cond": "항상"}, {"type": "생각", "expr": "기본", "text": "(명함이 줄어드는 속도 = 내 성장 속도.)", "cond": "항상"}, {"type": "생각", "expr": "걱정", "text": "(활동비가… 텅장이다.)", "cond": "활동비 500원 미만"}, {"type": "말", "expr": "활짝", "text": "활동비 부자! 매점 털러 가볼까?", "cond": "활동비 2만원 이상"}, {"type": "말", "expr": "활짝", "text": "오늘 일정 끝! 학습회에서 조금만 더 해볼까?", "cond": "일정 모두 완료"}, {"type": "말", "expr": "기본", "text": "자, 오늘 첫 일정부터 시작해볼까?", "cond": "일정 시작 전"}, {"type": "말", "expr": "미소", "text": "{연속}일 연속 출근! 개근상 노려본다.", "cond": "3일 이상 연속 출근"}, {"type": "말", "expr": "씩", "text": "사업부장실 의자… 생각보다 푹신하네.", "cond": "사업부장 이상"}, {"type": "말", "expr": "활짝", "text": "사장님이라 불러주세요. …농담이에요.", "cond": "사장"}, {"type": "생각", "expr": "기본", "text": "(모닝커피 수혈 완료. 이제 일할 수 있다.)", "cond": "아침(10시 전)"}, {"type": "생각", "expr": "걱정", "text": "(야근… 그래도 공부는 해야지.)", "cond": "야근(21시 이후)"}, {"type": "생각", "expr": "걱정", "text": "(오답노트가 점점 두꺼워진다…)", "cond": "오답 20개 이상"}, {"type": "생각", "expr": "놀람", "text": "(오늘… {보스}님이 오신다고?! 심장 떨려.)", "cond": "희귀 보스 등장"}];
