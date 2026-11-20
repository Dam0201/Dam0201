// 머핀타임 카드 목록 (서버와 화면이 같이 써요). 우리 친구들 버전 이름이에요.
// type: action(행동, 하늘색) · trap(함정, 빨강) · counter(카운터, 연두)
// who: 카드 그림 주인 — jihun · coco · isang · jinu · jaedam · colin · jaem · bat · prss (없으면 머핀)
// need: 사용할 때 고를 것 — none · one(다른 한 명) · many(해당하는 사람들, 양심) · pick1(한 명, 나 포함) ·
//       two(작은 사람, 큰 사람) · number(1~20) · give2(내 카드 2장 + 한 명) · trapOwner(함정 있는 다른 한 명) · confirm
// hit: 빼앗기/버리기를 당하는 사람 — target · others · all · host · donut · second
// trig(함정): manual(주인이 발동하고 범인 고르기) · empty · discard · steal · forced
(function (root) {
  var CARDS = [
    // ---------- 행동: 내 손 늘리기 ----------
    { k: "feast", type: "action", who: "coco", name: "코코 펜타킬", text: "원딜 코코가 웬일로 해냈다. 카드를 5장 뽑아요.", count: 3, tags: ["draw"] },
    { k: "twoMore", type: "action", who: "jinu", name: "지누가 쏜다", text: "착한 지누가 또 한턱. 나는 2장, 다른 사람은 모두 1장씩 뽑아요.", count: 2, tags: ["draw"] },
    { k: "shareDraw", type: "action", who: "isang", name: "이거 이상이야?", text: "카드 3장을 뽑고, 다른 한 명을 골라 그 사람도 3장을 뽑아요.", count: 2, need: "one", tags: ["draw"] },
    { k: "dumpster", type: "action", who: "jihun", name: "지훈 쓰레기통 다이브", text: "지훈이 쓰레기통에 머리부터. 버린 카드 맨 위 3장을 가져와요.", count: 1 },
    { k: "peekTop", type: "action", who: "jaedam", name: "재담의 빅데이터", text: "분석은 다이아, 티어는 실버. 카드 더미 위 5장을 보고 1장을 골라 가져와요.", count: 1, tags: ["draw"] },
    { k: "treasureMap", type: "action", who: "jaem", name: "잼민의 비밀 지도", text: "카드를 3장 뽑아요. 그중 '잼민 비상금 상자'가 있으면 즉시 승리!", count: 1, tags: ["draw"] },
    { k: "treasureBox", type: "action", who: "jaem", name: "잼민 비상금 상자", text: "열어 보니 잼민이 이미 털고 탈주함. 카드를 1장 뽑아요.", count: 1, tags: ["draw"] },
    // ---------- 행동: 빼앗기 ----------
    { k: "pick1", type: "action", who: "coco", name: "고라니 기습", text: "갑자기 도로로 튀어나왔다! 한 명에게서 1장을 빼앗아요.", count: 3, need: "one", tags: ["steal"], hit: "target" },
    { k: "pick2", type: "action", who: "coco", name: "코코 깝치기", text: "까불면서 손은 빠르다. 한 명에게서 2장을 빼앗아요.", count: 2, need: "one", tags: ["steal"], hit: "target" },
    { k: "collect", type: "action", who: "colin", name: "모닝콜린의 윙크", text: "느끼한 윙크에 다들 홀렸다. 다른 모든 사람에게서 1장씩 받아요.", count: 2, tags: ["steal"], hit: "others" },
    { k: "xray", type: "action", who: "jaedam", name: "재담 핑크 와드", text: "시야는 장악, 연애는 못 장악. 한 명의 손패를 몰래 보고 1장을 골라 빼앗아요.", count: 1, need: "one", tags: ["steal"], hit: "target" },
    { k: "isangHand", type: "action", who: "isang", name: "이상손", text: "남자인 사람에게서 모두 1장씩 빼앗아요. (양심껏 고르기)", count: 1, need: "many", real: true, tags: ["steal"], hit: "target" },
    { k: "wantDonut", type: "action", who: "jinu", name: "지누 지갑 내놔", text: "'지누의 지갑'을 들고 있는 사람의 손패를 모두 빼앗아요.", count: 1, tags: ["steal"], hit: "donut" },
    { k: "ringleader", type: "action", name: "다 방장 탓", text: "이 게임 하자고 한 방장에게서 3장을 빼앗아요.", count: 1, tags: ["steal"], hit: "host" },
    // ---------- 행동: 버리게 하기 ----------
    { k: "blast", type: "action", who: "colin", name: "모닝콜린 느끼 공격", text: "너무 느끼해서 체했다. 한 명이 카드를 3장 버려요.", count: 3, need: "one", tags: ["discard"], hit: "target" },
    { k: "wipe", type: "action", who: "jaedam", name: "재담의 15분 서렌", text: "이번 시즌도 골드는 무리. 한 명이 손패를 모두 버려요.", count: 1, need: "one", tags: ["discard"], hit: "target" },
    { k: "quake", type: "action", who: "jihun", name: "지훈 대참사", text: "지훈이 또 사고 쳤다. 나를 포함해 모두 3장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "flop", type: "action", who: "jihun", name: "지훈 꽈당", text: "지훈이 넘어지면서 다 같이 엎어짐. 나를 포함해 모두 1장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "onlyOne", type: "action", who: "isang", name: "이상 뿐이야", text: "모두 손패를 1장만 남기고 버려요. (남는 카드는 무작위)", count: 1, tags: ["discard"], hit: "all" },
    { k: "myDonut", type: "action", who: "jinu", name: "지누의 지갑", text: "착한 지누가 또 다 사 줬다. 카드를 4장 버려요.", count: 1 },
    // ---------- 행동: 판 흔들기 ----------
    { k: "gift", type: "action", who: "jinu", name: "지누식 호구 선물", text: "지누처럼 착하게. 내 카드 2장을 골라 한 명에게 줘요.", count: 2, need: "give2" },
    { k: "hotPotato", type: "action", name: "폭탄 돌리기", text: "이 카드를 버리지 않고 한 명의 손에 떠넘겨요.", count: 2, need: "one" },
    { k: "swapHands", type: "action", who: "isang", name: "이상이 좀 받아줘", text: "한 명과 손패를 통째로 바꿔요.", count: 1, need: "one" },
    { k: "shuffleAll", type: "action", name: "칼바람 랜덤", text: "챔프는 랜덤이다. 모두의 손패를 모아 섞은 뒤 똑같이 나눠요.", count: 1 },
    { k: "trainBack", type: "action", who: "bat", name: "박쥐 편 갈아타기", text: "박쥐처럼 쓱. 모두가 바로 앞 차례 사람의 손패를 통째로 가져가요.", count: 1 },
    { k: "seven", type: "action", who: "colin", name: "모닝콜린 7시 모닝콜", text: "굿모닝~ 기상! 모두 손패를 7장으로 맞춰요(뽑거나 버리기).", count: 1 },
    { k: "fresh", type: "action", who: "jihun", name: "지훈 포맷", text: "다 까먹고 새 출발. 내 손패를 모두 버리고, 버린 만큼 새로 뽑아요.", count: 1 },
    { k: "reverse", type: "action", who: "jihun", name: "지훈 역주행", text: "길을 또 잘못 들었다. 진행 방향을 반대로 바꿔요.", count: 2 },
    { k: "skipOne", type: "action", who: "jaem", name: "잼민 탈주", text: "한 명이 잼민처럼 사라져서 다음 차례를 쉬어요.", count: 2, need: "one" },
    { k: "jump", type: "action", who: "coco", name: "고라니 무단횡단", text: "어디서 튀어나왔지? 고른 사람부터 이어서 진행해요.", count: 1, need: "one" },
    { k: "double", type: "action", who: "coco", name: "고라니 뜀박질", text: "빼빼 마른 다리로 겅중겅중. 이번 차례에 행동을 2번 더 할 수 있어요.", count: 1 },
    { k: "copycat", type: "action", who: "jihun", name: "지훈 커닝", text: "가장 최근에 쓰인 행동 카드를 따라 해요. (이해는 못 함)", count: 1 },
    { k: "banana", type: "action", who: "jihun", name: "지훈이 흘린 바나나", text: "이 카드를 카드 더미에 섞어 넣어요. 뽑은 사람은 3장을 버려요.", count: 1 },
    { k: "nothing", type: "action", who: "jihun", name: "지훈의 큰 그림", text: "아무 일도 일어나지 않아요. 지훈은 다 계획이 있었대요.", count: 1 },
    // ---------- 행동: 승리 조건 ----------
    { k: "fewestWins", type: "action", who: "jaedam", name: "재담 솔로 미니멀리즘", text: "연애도 카드도 없는 게 고급. 다음 내 차례가 시작될 때 손패가 가장 적은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "mostWins", type: "action", who: "jaedam", name: "재담 골드 가는 꿈", text: "꿈에서는 골드 간다. 다음 내 차례가 시작될 때 손패가 가장 많은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "setGoal", type: "action", who: "jaedam", name: "재담 룰 수정", text: "재담이 그게 맞대요. 승리 장수를 1~20 중 하나로 바꿔요.", count: 1, need: "number" },
    { k: "hold", type: "action", who: "prss", name: "prss 라떼는 말이야", text: "라떼 얘기가 끝날 때까지… 다음 내 차례까지 아무도 승리할 수 없어요.", count: 1 },
    // ---------- 행동: 함정·카운터 다루기 ----------
    { k: "clearTraps", type: "action", who: "jaedam", name: "재담 가위 싹둑", text: "그웬처럼 싹둑싹둑. 설치된 함정을 전부 잘라서 버려요.", count: 1 },
    { k: "exposeTraps", type: "action", who: "jinu", name: "지누가 다 불었다", text: "착해서 거짓말을 못 함. 한 명이 설치한 함정을 모두 버려요.", count: 1, need: "trapOwner" },
    { k: "stealTrap", type: "action", who: "colin", name: "모닝콜린 미소 강도", text: "미소에 홀려서 함정을 내줬다. 한 명이 설치한 함정 1장을 내 손으로 가져와요.", count: 1, need: "trapOwner" },
    { k: "noCounter", type: "action", who: "colin", name: "모닝콜린 '쉿'", text: "손가락을 입술에 대며 느끼하게. 다음 내 차례까지 아무도 카운터를 못 써요.", count: 1 },
    { k: "noAction", type: "action", who: "prss", name: "prss 허리 삐끗", text: "어르신 허리 삐끗, 다들 꼼짝 마. 다음 내 차례까지 행동 카드 금지.", count: 1 },
    // ---------- 행동: 진짜 세상 (양심껏 고르기) ----------
    { k: "hats", type: "action", who: "colin", name: "모닝콜린 패션 검사", text: "지금 모자를 쓴 사람은 모두 3장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "glasses", type: "action", name: "안경 동맹", text: "안경을 쓴 사람은 모두 2장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "catOwners", type: "action", name: "냥집사 검문", text: "고양이를 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "noDog", type: "action", name: "멍멍이 없는 설움", text: "강아지를 안 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "away", type: "action", name: "집 나간 사람 체크", text: "지금 자기 집이 아닌 곳에 있는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "eldest", type: "action", who: "prss", name: "prss 어르신 공경", text: "가장 나이가 많은 사람이 3장을 버려요. (보통 prss)", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "youngest", type: "action", name: "막내 검거", text: "가장 나이가 어린 사람이 3장을 버려요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "tall", type: "action", who: "coco", name: "코코 빼빼로 키재기", text: "가장 키가 작은 사람이 가장 큰 사람에게서 3장을 빼앗아요.", count: 1, need: "two", real: true, tags: ["steal"], hit: "second" },
    { k: "birthday", type: "action", name: "생일빵 면제권", text: "오늘이 내 생일이라면 승리! (양심에 맡길게요)", count: 1, need: "confirm", real: true },
    // ---------- 행동: 미니게임 (카운터로 못 막아요) ----------
    { k: "rps", type: "action", who: "jinu", name: "지누랑 가위바위보", text: "한 명과 가위바위보! 이긴 사람이 3장을 뽑아요. (지누는 늘 져 줌)", count: 2, need: "one", mini: true },
    { k: "coin", type: "action", who: "bat", name: "박쥐의 양다리 동전", text: "앞면이면 3장 뽑고, 뒷면이면 3장 버려요. 박쥐는 어느 쪽이든 좋대요.", count: 2, mini: true },
    { k: "react", type: "action", who: "coco", name: "고라니 반응속도", text: "고라니처럼 튀어! '지금!' 신호에 가장 늦게 누른 사람이 3장을 버려요.", count: 2, mini: true },
    { k: "pointVote", type: "action", who: "jihun", name: "누가 제일 지훈 같아?", text: "모두 동시에 한 명을 지목해요. 가장 많이 지목된 사람이 3장을 버려요.", count: 1, mini: true },
    { k: "duel", type: "action", name: "미드 1대1 솔킬", text: "한 명과 실제로 눈싸움이나 팔씨름을 해요. 이긴 사람이 3장을 뽑아요.", count: 1, need: "one", mini: true, real: true },
    { k: "photo", type: "action", who: "isang", name: "이상 카메라 샀어", text: "소중한 추억을 남겨요! 모두 모여서 찰칵. (그게 다예요)", count: 1, mini: true },

    // ---------- 함정: 주인이 직접 발동 (양심) ----------
    { k: "tMuffin", type: "trap", trig: "manual", name: "머핀 금지령", text: "누가 '머핀'이라고 말하면, 그 사람이 3장을 버려요.", count: 2, effect: { do: "discard", n: 3 } },
    { k: "tJump", type: "trap", trig: "manual", who: "coco", name: "고라니 비명", text: "누군가를 깜짝 놀라게 했다면, 놀란 사람이 3장을 버려요. 고라니처럼 꽥!", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tName", type: "trap", trig: "manual", who: "jaedam", name: "재담 연예인병", text: "누가 내 이름을 부르면, 그 사람이 3장을 버려요. 사인은 안 해 줘요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tSing", type: "trap", trig: "manual", who: "colin", name: "모닝콜린 세레나데 금지", text: "누가 노래를 부르면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tLaugh", type: "trap", trig: "manual", who: "jihun", name: "지훈 보고 웃지 마", text: "누가 소리 내 웃으면, 그 사람에게서 3장을 빼앗아요.", count: 2, effect: { do: "steal", n: 3 } },
    { k: "tWhine", type: "trap", trig: "manual", who: "jaedam", name: "재담 '나 원래 골드야'", text: "누가 게임에 불평하면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tTime", type: "trap", trig: "manual", who: "prss", name: "prss 9시 취침", text: "누가 몇 시냐고 물으면, 그 사람이 4장을 버려요. 어르신은 주무실 시간.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tYawn", type: "trap", trig: "manual", who: "jinu", name: "졸린 지누 감지기", text: "누가 하품하면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tWhat", type: "trap", trig: "manual", who: "jihun", name: "지훈의 '뭐라고?'", text: "누가 '뭐라고?'라고 되물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tHello", type: "trap", trig: "manual", who: "colin", name: "모닝콜린 '안녕, 자기'", text: "내가 '안녕'이라고 했을 때 대답한 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tPlease", type: "trap", trig: "manual", who: "isang", name: "이상의 마법의 단어", text: "누가 '~해줘'라고 말하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tCount", type: "trap", trig: "manual", who: "coco", name: "코코 패 훔쳐보기 금지", text: "누가 내 카드가 몇 장이냐고 물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tLong", type: "trap", trig: "manual", who: "jaem", name: "잼민 탈주 감지", text: "누가 게임이 너무 길다고 하면, 그 사람에게서 3장을 빼앗아요. 탈주각 잡지 마.", count: 1, effect: { do: "steal", n: 3 } },
    // ---------- 함정: 조건이 되면 저절로 ----------
    { k: "tEmptyRefill", type: "trap", trig: "empty", who: "jinu", name: "지누의 무한 리필", text: "내 손패가 0장이 되는 순간, 착한 지누가 채워 줘요. 카드를 10장 뽑아요.", count: 1 },
    { k: "tEmptyRob", type: "trap", trig: "empty", who: "bat", name: "박쥐 손절 후 환승", text: "내 손패가 0장이 되는 순간, 손패가 가장 많은 사람 쪽으로 붙어서 카드를 모두 빼앗아요.", count: 1 },
    { k: "tScavenge", type: "trap", trig: "discard", who: "jihun", name: "지훈 줍줍", text: "다른 사람이 카드를 버리게 되면, 버려진 카드를 내 손으로 주워 와요.", count: 1 },
    { k: "tThorns", type: "trap", trig: "steal", name: "람머스 가시갑옷", text: "옹. 누가 내 카드를 빼앗아 가면, 그 사람에게서 3장을 빼앗아요.", count: 1 },
    { k: "tGrudge", type: "trap", trig: "forced", who: "isang", name: "이상 울지마", text: "누가 나에게 카드를 버리게 하면, 그 사람도 같은 수만큼 버려요.", count: 1 },

    // ---------- 카운터: 언제든 대응 ----------
    { k: "cNope", type: "counter", who: "jaedam", name: "재담 팩트 체크", text: "그건 아니지. 방금 나온 행동·함정·카운터를 취소해요.", count: 4 },
    { k: "cMine", type: "counter", who: "isang", name: "이상 안돼!!!", text: "방금 나온 행동을 취소하고, 그 카드를 내 손으로 가져와요.", count: 2 },
    { k: "cBack", type: "counter", who: "coco", name: "고라니 뒷발차기", text: "뻥! 방금 나온 행동을 취소하고, 그 카드를 낸 사람이 3장을 버려요.", count: 2 },
    { k: "cReturn", type: "counter", who: "prss", name: "prss 돋보기 반송", text: "글씨가 안 보여서 반송. 방금 나온 행동을 취소하고, 낸 사람 손으로 돌려보내요.", count: 1 },
    { k: "cMirror", type: "counter", who: "colin", name: "모닝콜린 거울 셀카", text: "거울 속 미남은 나. 방금 나온 행동을 내가 낸 것으로 바꿔요. 나를 노린 효과는 낸 사람에게 가요.", count: 1 },
    { k: "cGhost", type: "counter", who: "jaem", name: "잼민 연막 탈주", text: "내가 설치한 함정을 모두 버리고 연막 속으로. 방금 나온 행동을 취소해요.", count: 1 },
    { k: "cDodge", type: "counter", who: "jinu", name: "지누 방패막이", text: "나에게 온 행동·함정을, 고른 다른 사람이 대신 받아요. (보통 지누가 맞음)", count: 2 },
    { k: "cWall", type: "counter", who: "jinu", name: "지누가 웬일로 철벽", text: "누가 내 카드를 빼앗으려 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cGrip", type: "counter", who: "prss", name: "prss 연륜의 버티기", text: "세월의 내공으로 버틴다. 누가 나에게 카드를 버리게 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cStopDraw", type: "counter", name: "카정 당했다", text: "남의 정글 몹 뺏기. 누가 카드를 뽑으려 할 때 취소해요.", count: 2 }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = CARDS;
  else root.MUFFIN_CARDS = CARDS;
})(this);
