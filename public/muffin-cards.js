// 머핀타임 카드 목록 (서버와 화면이 같이 써요). 우리 친구들 버전 이름이에요.
// type: action(행동, 하늘색) · trap(함정, 빨강) · counter(카운터, 연두)
// need: 사용할 때 고를 것 — none · one(다른 한 명) · many(해당하는 사람들, 양심) · pick1(한 명, 나 포함) ·
//       two(작은 사람, 큰 사람) · number(1~20) · give2(내 카드 2장 + 한 명) · trapOwner(함정 있는 다른 한 명) · confirm
// hit: 빼앗기/버리기를 당하는 사람 — target · others · all · host · donut · second
// trig(함정): manual(주인이 발동하고 범인 고르기) · empty · discard · steal · forced
(function (root) {
  var CARDS = [
    // ---------- 행동: 내 손 늘리기 ----------
    { k: "feast", type: "action", name: "코코 펜타킬", text: "깝치던 코코가 진짜 해냈다. 카드를 5장 뽑아요.", count: 3, tags: ["draw"] },
    { k: "twoMore", type: "action", name: "지누가 쏜다", text: "착한 지누가 또 한턱. 나는 2장, 다른 사람은 모두 1장씩 뽑아요.", count: 2, tags: ["draw"] },
    { k: "shareDraw", type: "action", name: "이상의 커플템", text: "나와 고른 한 명이 커플로 3장씩 뽑아요.", count: 2, need: "one", tags: ["draw"] },
    { k: "dumpster", type: "action", name: "지훈 쓰레기통 다이브", text: "지훈이 쓰레기통에 머리부터. 버린 카드 맨 위 3장을 가져와요.", count: 1 },
    { k: "peekTop", type: "action", name: "재담의 빅데이터", text: "똑똑한 척 분석 중. 카드 더미 위 5장을 보고 1장을 골라 가져와요.", count: 1, tags: ["draw"] },
    { k: "treasureMap", type: "action", name: "잼민의 비밀 지도", text: "카드를 3장 뽑아요. 그중 '잼민 비상금 상자'가 있으면 즉시 승리!", count: 1, tags: ["draw"] },
    { k: "treasureBox", type: "action", name: "잼민 비상금 상자", text: "열어 보니 잼민이 이미 털고 탈주함. 카드를 1장 뽑아요.", count: 1, tags: ["draw"] },
    // ---------- 행동: 빼앗기 ----------
    { k: "pick1", type: "action", name: "코코 짤짤이 평타", text: "원거리에서 깔짝. 한 명에게서 1장을 빼앗아요.", count: 3, need: "one", tags: ["steal"], hit: "target" },
    { k: "pick2", type: "action", name: "코코 더블킬", text: "또 깝친다. 한 명에게서 2장을 빼앗아요.", count: 2, need: "one", tags: ["steal"], hit: "target" },
    { k: "collect", type: "action", name: "모닝콜린의 윙크", text: "느끼한 윙크에 다들 홀렸다. 다른 모든 사람에게서 1장씩 받아요.", count: 2, tags: ["steal"], hit: "others" },
    { k: "xray", type: "action", name: "재담 핑크 와드", text: "시야 장악. 한 명의 손패를 몰래 보고 1장을 골라 빼앗아요.", count: 1, need: "one", tags: ["steal"], hit: "target" },
    { k: "wantDonut", type: "action", name: "지누 지갑 내놔", text: "'지누의 지갑'을 들고 있는 사람의 손패를 모두 빼앗아요.", count: 1, tags: ["steal"], hit: "donut" },
    { k: "ringleader", type: "action", name: "다 방장 탓", text: "이 게임 하자고 한 방장에게서 3장을 빼앗아요.", count: 1, tags: ["steal"], hit: "host" },
    // ---------- 행동: 버리게 하기 ----------
    { k: "blast", type: "action", name: "박쥐 고막 테러", text: "목소리가 너무 크다. 한 명이 카드를 3장 버려요.", count: 3, need: "one", tags: ["discard"], hit: "target" },
    { k: "wipe", type: "action", name: "15분 서렌", text: "gg. 한 명이 손패를 모두 버려요.", count: 1, need: "one", tags: ["discard"], hit: "target" },
    { k: "quake", type: "action", name: "박쥐 멘탈 붕괴", text: "박쥐가 무너지면 다 같이 무너진다. 나를 포함해 모두 3장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "flop", type: "action", name: "지훈 꽈당", text: "지훈이 넘어지면서 다 같이 엎어짐. 나를 포함해 모두 1장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "onlyOne", type: "action", name: "이상의 원픽", text: "여왕벌은 원픽만 남긴다. 모두 손패를 1장만 남기고 버려요. (남는 카드는 무작위)", count: 1, tags: ["discard"], hit: "all" },
    { k: "myDonut", type: "action", name: "지누의 지갑", text: "착한 지누가 또 다 사 줬다. 카드를 4장 버려요.", count: 1 },
    // ---------- 행동: 판 흔들기 ----------
    { k: "gift", type: "action", name: "지누식 호구 선물", text: "지누처럼 착하게. 내 카드 2장을 골라 한 명에게 줘요.", count: 2, need: "give2" },
    { k: "hotPotato", type: "action", name: "prss 업무 떠넘기기", text: "일 잘하는 사람한테 일이 몰린다. 이 카드를 버리지 않고 한 명에게 떠넘겨요.", count: 2, need: "one" },
    { k: "swapHands", type: "action", name: "이상 환승연애", text: "한 명과 손패를 통째로 바꿔요. 지누는 긴장하세요.", count: 1, need: "one" },
    { k: "shuffleAll", type: "action", name: "칼바람 랜덤", text: "챔프는 랜덤이다. 모두의 손패를 모아 섞은 뒤 똑같이 나눠요.", count: 1 },
    { k: "trainBack", type: "action", name: "박쥐 편 갈아타기", text: "박쥐처럼 쓱. 모두가 바로 앞 차례 사람의 손패를 통째로 가져가요.", count: 1 },
    { k: "seven", type: "action", name: "prss 칼정리", text: "사회인의 깔끔한 일처리. 모두 손패를 7장으로 맞춰요(뽑거나 버리기).", count: 1 },
    { k: "fresh", type: "action", name: "지훈 포맷", text: "다 까먹고 새 출발. 내 손패를 모두 버리고, 버린 만큼 새로 뽑아요.", count: 1 },
    { k: "reverse", type: "action", name: "잼민 역주행", text: "탈주하다 길을 잃었다. 진행 방향을 반대로 바꿔요.", count: 2 },
    { k: "skipOne", type: "action", name: "잼민 탈주", text: "한 명이 잼민처럼 사라져서 다음 차례를 쉬어요.", count: 2, need: "one" },
    { k: "jump", type: "action", name: "코코 점멸", text: "깝치다 점멸 각. 고른 사람부터 이어서 진행해요.", count: 1, need: "one" },
    { k: "double", type: "action", name: "코코 공속 풀템", text: "평타가 미쳤다. 이번 차례에 행동을 2번 더 할 수 있어요.", count: 1 },
    { k: "copycat", type: "action", name: "지훈 커닝", text: "가장 최근에 쓰인 행동 카드를 따라 해요. (이해는 못 함)", count: 1 },
    { k: "banana", type: "action", name: "지훈이 흘린 바나나", text: "이 카드를 카드 더미에 섞어 넣어요. 뽑은 사람은 3장을 버려요.", count: 1 },
    { k: "nothing", type: "action", name: "지훈의 큰 그림", text: "아무 일도 일어나지 않아요. 지훈은 다 계획이 있었대요.", count: 1 },
    // ---------- 행동: 승리 조건 ----------
    { k: "fewestWins", type: "action", name: "재담 미니멀리즘", text: "적은 게 고급이야. 다음 내 차례가 시작될 때 손패가 가장 적은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "mostWins", type: "action", name: "이상 플렉스", text: "많이 가진 자가 여왕벌. 다음 내 차례가 시작될 때 손패가 가장 많은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "setGoal", type: "action", name: "재담 룰 수정", text: "재담이 그게 맞대요. 승리 장수를 1~20 중 하나로 바꿔요.", count: 1, need: "number" },
    { k: "hold", type: "action", name: "prss 결재 보류", text: "검토 후 연락드릴게요. 다음 내 차례까지 아무도 승리할 수 없어요.", count: 1 },
    // ---------- 행동: 함정·카운터 다루기 ----------
    { k: "clearTraps", type: "action", name: "재담 오라클 렌즈", text: "와드 다 보인다. 설치된 함정을 전부 버려요.", count: 1 },
    { k: "exposeTraps", type: "action", name: "박쥐의 고자질", text: "박쥐가 다 불었다. 한 명이 설치한 함정을 모두 버려요.", count: 1, need: "trapOwner" },
    { k: "stealTrap", type: "action", name: "잼민 함정 슬쩍", text: "닌자처럼 쓱. 한 명이 설치한 함정 1장을 내 손으로 가져와요.", count: 1, need: "trapOwner" },
    { k: "noCounter", type: "action", name: "모닝콜린 '쉿'", text: "손가락을 입술에 대며 느끼하게. 다음 내 차례까지 아무도 카운터를 못 써요.", count: 1 },
    { k: "noAction", type: "action", name: "prss 회의 소집", text: "회의 끝날 때까지 아무것도 하지 마세요. 다음 내 차례까지 행동 카드 금지.", count: 1 },
    // ---------- 행동: 진짜 세상 (양심껏 고르기) ----------
    { k: "hats", type: "action", name: "모닝콜린 패션 검사", text: "지금 모자를 쓴 사람은 모두 3장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "glasses", type: "action", name: "재담 안경 동맹", text: "똑똑해 보이는 안경 쓴 사람은 모두 2장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "catOwners", type: "action", name: "냥집사 검문", text: "고양이를 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "noDog", type: "action", name: "멍멍이 없는 설움", text: "강아지를 안 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "away", type: "action", name: "잼민 가출 체크", text: "지금 자기 집이 아닌 곳에 있는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "eldest", type: "action", name: "prss 어르신 공경", text: "가장 나이가 많은 사람이 3장을 버려요. 무릎 조심하세요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "youngest", type: "action", name: "잼민이 검거", text: "가장 나이가 어린 사람이 3장을 버려요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "tall", type: "action", name: "코코 빼빼로 키재기", text: "가장 키가 작은 사람이 가장 큰 사람에게서 3장을 빼앗아요.", count: 1, need: "two", real: true, tags: ["steal"], hit: "second" },
    { k: "birthday", type: "action", name: "생일빵 면제권", text: "오늘이 내 생일이라면 승리! (양심에 맡길게요)", count: 1, need: "confirm", real: true },
    // ---------- 행동: 미니게임 (카운터로 못 막아요) ----------
    { k: "rps", type: "action", name: "지누랑 가위바위보", text: "한 명과 가위바위보! 이긴 사람이 3장을 뽑아요. (지누는 늘 져 줌)", count: 2, need: "one", mini: true },
    { k: "coin", type: "action", name: "박쥐의 양다리 동전", text: "앞면이면 3장 뽑고, 뒷면이면 3장 버려요. 박쥐는 둘 다 좋대요.", count: 2, mini: true },
    { k: "react", type: "action", name: "코코 반응속도 테스트", text: "원딜은 반응속도. '지금!' 신호에 가장 늦게 누른 사람이 3장을 버려요.", count: 2, mini: true },
    { k: "pointVote", type: "action", name: "누가 제일 지훈 같아?", text: "모두 동시에 한 명을 지목해요. 가장 많이 지목된 사람이 3장을 버려요.", count: 1, mini: true },
    { k: "duel", type: "action", name: "미드 1대1 솔킬", text: "한 명과 실제로 눈싸움이나 팔씨름을 해요. 이긴 사람이 3장을 뽑아요.", count: 1, need: "one", mini: true, real: true },
    { k: "photo", type: "action", name: "이상의 인생네컷", text: "모두 모여서 찰칵! 여왕벌이 센터. (그게 다예요)", count: 1, mini: true },

    // ---------- 함정: 주인이 직접 발동 (양심) ----------
    { k: "tMuffin", type: "trap", trig: "manual", name: "머핀 금지령", text: "누가 '머핀'이라고 말하면, 그 사람이 3장을 버려요.", count: 2, effect: { do: "discard", n: 3 } },
    { k: "tJump", type: "trap", trig: "manual", name: "박쥐 깜놀 비명", text: "누군가를 깜짝 놀라게 했다면, 놀란 사람이 3장을 버려요. (박쥐면 고막 주의)", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tName", type: "trap", trig: "manual", name: "재담 연예인병", text: "누가 내 이름을 부르면, 그 사람이 3장을 버려요. 사인은 안 해 줘요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tSing", type: "trap", trig: "manual", name: "모닝콜린 세레나데 금지", text: "누가 노래를 부르면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tLaugh", type: "trap", trig: "manual", name: "지훈 보고 웃지 마", text: "누가 소리 내 웃으면, 그 사람에게서 3장을 빼앗아요.", count: 2, effect: { do: "steal", n: 3 } },
    { k: "tWhine", type: "trap", trig: "manual", name: "박쥐 멘탈 경보", text: "누가 게임에 불평하면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tTime", type: "trap", trig: "manual", name: "prss 칼퇴 감시", text: "누가 몇 시냐고 물으면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tYawn", type: "trap", trig: "manual", name: "졸린 지누 감지기", text: "누가 하품하면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tWhat", type: "trap", trig: "manual", name: "지훈의 '뭐라고?'", text: "누가 '뭐라고?'라고 되물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tHello", type: "trap", trig: "manual", name: "모닝콜린 '안녕, 자기'", text: "내가 '안녕'이라고 했을 때 대답한 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tPlease", type: "trap", trig: "manual", name: "이상 공주님 부탁 금지", text: "누가 '~해줘'라고 말하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tCount", type: "trap", trig: "manual", name: "코코 패 훔쳐보기 금지", text: "누가 내 카드가 몇 장이냐고 물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tLong", type: "trap", trig: "manual", name: "잼민 탈주 감지", text: "누가 게임이 너무 길다고 하면, 그 사람에게서 3장을 빼앗아요. 탈주각 잡지 마.", count: 1, effect: { do: "steal", n: 3 } },
    // ---------- 함정: 조건이 되면 저절로 ----------
    { k: "tEmptyRefill", type: "trap", trig: "empty", name: "지누의 무한 리필", text: "내 손패가 0장이 되는 순간, 착한 지누가 채워 줘요. 카드를 10장 뽑아요.", count: 1 },
    { k: "tEmptyRob", type: "trap", trig: "empty", name: "박쥐 손절 후 환승", text: "내 손패가 0장이 되는 순간, 손패가 가장 많은 사람 쪽으로 붙어서 카드를 모두 빼앗아요.", count: 1 },
    { k: "tScavenge", type: "trap", trig: "discard", name: "지훈 줍줍", text: "다른 사람이 카드를 버리게 되면, 버려진 카드를 내 손으로 주워 와요.", count: 1 },
    { k: "tThorns", type: "trap", trig: "steal", name: "람머스 가시갑옷", text: "옹. 누가 내 카드를 빼앗아 가면, 그 사람에게서 3장을 빼앗아요.", count: 1 },
    { k: "tGrudge", type: "trap", trig: "forced", name: "이상 질투 폭발", text: "누가 나에게 카드를 버리게 하면, 그 사람도 같은 수만큼 버려요.", count: 1 },

    // ---------- 카운터: 언제든 대응 ----------
    { k: "cNope", type: "counter", name: "재담 팩트 체크", text: "그건 아니지. 방금 나온 행동·함정·카운터를 취소해요.", count: 4 },
    { k: "cMine", type: "counter", name: "이상 '이거 내 거야'", text: "방금 나온 행동을 취소하고, 그 카드를 내 손으로 가져와요.", count: 2 },
    { k: "cBack", type: "counter", name: "코코 역갱", text: "역으로 당했다. 방금 나온 행동을 취소하고, 그 카드를 낸 사람이 3장을 버려요.", count: 2 },
    { k: "cReturn", type: "counter", name: "prss 결재 반려", text: "다시 해 오세요. 방금 나온 행동을 취소하고, 낸 사람 손으로 돌려보내요.", count: 1 },
    { k: "cMirror", type: "counter", name: "모닝콜린 거울 셀카", text: "거울 속 미남은 나. 방금 나온 행동을 내가 낸 것으로 바꿔요. 나를 노린 효과는 낸 사람에게 가요.", count: 1 },
    { k: "cGhost", type: "counter", name: "잼민 연막 탈주", text: "내가 설치한 함정을 모두 버리고 연막 속으로. 방금 나온 행동을 취소해요.", count: 1 },
    { k: "cDodge", type: "counter", name: "지누 방패막이", text: "나에게 온 행동·함정을, 고른 다른 사람이 대신 받아요. (보통 지누가 맞음)", count: 2 },
    { k: "cWall", type: "counter", name: "지누가 웬일로 철벽", text: "누가 내 카드를 빼앗으려 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cGrip", type: "counter", name: "박쥐 멘탈 꽉 잡아", text: "누가 나에게 카드를 버리게 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cStopDraw", type: "counter", name: "카정 당했다", text: "남의 정글 몹 뺏기. 누가 카드를 뽑으려 할 때 취소해요.", count: 2 }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = CARDS;
  else root.MUFFIN_CARDS = CARDS;
})(this);
