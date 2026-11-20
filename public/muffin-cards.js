// 머핀타임 카드 목록 (서버와 화면이 같이 써요). 카드 이름과 문구는 이 게임을 위해 새로 지은 거예요.
// type: action(행동, 하늘색) · trap(함정, 빨강) · counter(카운터, 연두)
// need: 사용할 때 고를 것 — none · one(다른 한 명) · many(해당하는 사람들, 양심) · pick1(한 명, 나 포함) ·
//       two(작은 사람, 큰 사람) · number(1~20) · give2(내 카드 2장 + 한 명) · trapOwner(함정 있는 다른 한 명) · confirm
// hit: 빼앗기/버리기를 당하는 사람 — target · others · all · host · donut · second
// trig(함정): manual(주인이 발동하고 범인 고르기) · empty · discard · steal · forced
(function (root) {
  var CARDS = [
    // ---------- 행동: 내 손 늘리기 ----------
    { k: "feast", type: "action", name: "빵 터졌다", text: "카드를 5장 뽑아요.", count: 3, tags: ["draw"] },
    { k: "twoMore", type: "action", name: "한 접시 더", text: "내가 2장, 다른 사람은 모두 1장씩 뽑아요.", count: 2, tags: ["draw"] },
    { k: "shareDraw", type: "action", name: "너도 먹어", text: "나와 고른 한 명이 3장씩 뽑아요.", count: 2, need: "one", tags: ["draw"] },
    { k: "dumpster", type: "action", name: "쓰레기통 뒤지기", text: "버린 카드 더미 맨 위 3장을 가져와요.", count: 1 },
    { k: "peekTop", type: "action", name: "미리보기", text: "카드 더미 위 5장을 보고 1장을 골라 가져와요.", count: 1, tags: ["draw"] },
    { k: "treasureMap", type: "action", name: "보물 지도", text: "카드를 3장 뽑아요. 그중 '보물 상자'가 있으면 즉시 승리!", count: 1, tags: ["draw"] },
    { k: "treasureBox", type: "action", name: "보물 상자", text: "열어 보니 비었네요. 카드를 1장 뽑아요.", count: 1, tags: ["draw"] },
    // ---------- 행동: 빼앗기 ----------
    { k: "pick1", type: "action", name: "슬쩍", text: "한 명에게서 카드를 1장 빼앗아요.", count: 3, need: "one", tags: ["steal"], hit: "target" },
    { k: "pick2", type: "action", name: "소매치기", text: "한 명에게서 카드를 2장 빼앗아요.", count: 2, need: "one", tags: ["steal"], hit: "target" },
    { k: "collect", type: "action", name: "회비 걷기", text: "다른 모든 사람에게서 1장씩 빼앗아요.", count: 2, tags: ["steal"], hit: "others" },
    { k: "xray", type: "action", name: "투시 안경", text: "한 명의 손패를 몰래 보고 1장을 골라 빼앗아요.", count: 1, need: "one", tags: ["steal"], hit: "target" },
    { k: "wantDonut", type: "action", name: "내 도넛 내놔", text: "'내 도넛'을 들고 있는 사람의 손패를 모두 빼앗아요.", count: 1, tags: ["steal"], hit: "donut" },
    { k: "ringleader", type: "action", name: "주동자 처벌", text: "이 게임을 하자고 한 사람(방장)에게서 3장을 빼앗아요.", count: 1, tags: ["steal"], hit: "host" },
    // ---------- 행동: 버리게 하기 ----------
    { k: "blast", type: "action", name: "집중 포화", text: "한 명이 카드를 3장 버려요.", count: 3, need: "one", tags: ["discard"], hit: "target" },
    { k: "wipe", type: "action", name: "탈탈 털기", text: "한 명이 손패를 모두 버려요.", count: 1, need: "one", tags: ["discard"], hit: "target" },
    { k: "quake", type: "action", name: "지진 났다", text: "나를 포함해 모두 3장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "flop", type: "action", name: "다 같이 엎어져", text: "나를 포함해 모두 1장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "onlyOne", type: "action", name: "딱 한 장만", text: "모두 손패를 1장만 남기고 버려요. (남는 카드는 무작위)", count: 1, tags: ["discard"], hit: "all" },
    { k: "myDonut", type: "action", name: "내 도넛", text: "카드를 4장 버려요. (내 도넛은 소중하니까)", count: 1 },
    // ---------- 행동: 판 흔들기 ----------
    { k: "gift", type: "action", name: "선물 공세", text: "내 손에서 카드 2장을 골라 한 명에게 줘요.", count: 2, need: "give2" },
    { k: "hotPotato", type: "action", name: "뜨거운 감자", text: "이 카드를 버리지 않고 한 명의 손에 떠넘겨요.", count: 2, need: "one" },
    { k: "swapHands", type: "action", name: "손 바꿔", text: "한 명과 손패를 통째로 바꿔요.", count: 1, need: "one" },
    { k: "shuffleAll", type: "action", name: "다 섞어!", text: "모두의 손패를 모아 섞은 뒤 똑같이 나눠요.", count: 1 },
    { k: "trainBack", type: "action", name: "기차놀이", text: "모두가 바로 앞 차례 사람의 손패를 통째로 가져가요.", count: 1 },
    { k: "seven", type: "action", name: "럭키 세븐", text: "모두 손패가 7장이 될 때까지 뽑거나 버려요.", count: 1 },
    { k: "fresh", type: "action", name: "새 출발", text: "내 손패를 모두 버리고, 버린 만큼 새로 뽑아요.", count: 1 },
    { k: "reverse", type: "action", name: "뒤로 돌아", text: "진행 방향을 반대로 바꿔요.", count: 2 },
    { k: "skipOne", type: "action", name: "잠깐 쉬어", text: "한 명이 다음 차례를 쉬어요.", count: 2, need: "one" },
    { k: "jump", type: "action", name: "네 차례야", text: "고른 사람부터 이어서 진행해요.", count: 1, need: "one" },
    { k: "double", type: "action", name: "곱빼기", text: "이번 차례에 행동을 2번 더 할 수 있어요.", count: 1 },
    { k: "copycat", type: "action", name: "따라쟁이", text: "가장 최근에 쓰인 행동 카드의 효과를 따라 해요.", count: 1 },
    { k: "banana", type: "action", name: "바나나 껍질", text: "이 카드를 카드 더미에 섞어 넣어요. 뽑은 사람은 3장을 버려요.", count: 1 },
    { k: "nothing", type: "action", name: "아무 일도 없었다", text: "정말로 아무 일도 일어나지 않아요.", count: 1 },
    // ---------- 행동: 승리 조건 ----------
    { k: "fewestWins", type: "action", name: "이제 그만!", text: "다음 내 차례가 시작될 때 손패가 가장 적은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "mostWins", type: "action", name: "부자가 최고", text: "다음 내 차례가 시작될 때 손패가 가장 많은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "setGoal", type: "action", name: "골대 옮기기", text: "승리 장수를 10장에서 1~20 중 하나로 바꿔요.", count: 1, need: "number" },
    { k: "hold", type: "action", name: "아직 아니야", text: "다음 내 차례까지 아무도 승리할 수 없어요.", count: 1 },
    // ---------- 행동: 함정·카운터 다루기 ----------
    { k: "clearTraps", type: "action", name: "대청소", text: "설치된 함정을 전부 버려요.", count: 1 },
    { k: "exposeTraps", type: "action", name: "다 보여", text: "한 명이 설치한 함정을 모두 버려요.", count: 1, need: "trapOwner" },
    { k: "stealTrap", type: "action", name: "함정 훔치기", text: "한 명이 설치한 함정 1장을 내 손으로 가져와요.", count: 1, need: "trapOwner" },
    { k: "noCounter", type: "action", name: "입 다물어", text: "다음 내 차례까지 아무도 카운터 카드를 쓸 수 없어요.", count: 1 },
    { k: "noAction", type: "action", name: "행동 금지", text: "다음 내 차례까지 아무도 행동 카드를 쓸 수 없어요.", count: 1 },
    // ---------- 행동: 진짜 세상 (양심껏 고르기) ----------
    { k: "hats", type: "action", name: "모자 동호회", text: "지금 모자를 쓴 사람은 모두 3장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "glasses", type: "action", name: "안경 동맹", text: "안경을 쓴 사람은 모두 2장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "catOwners", type: "action", name: "집사 확인", text: "고양이를 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "noDog", type: "action", name: "강아지 없는 설움", text: "강아지를 안 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "away", type: "action", name: "집 나간 사람", text: "지금 자기 집이 아닌 곳에 있는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "eldest", type: "action", name: "최고참", text: "가장 나이가 많은 사람이 3장을 버려요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "youngest", type: "action", name: "막내 왔다", text: "가장 나이가 어린 사람이 3장을 버려요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "tall", type: "action", name: "키 재기", text: "가장 키가 작은 사람이 가장 큰 사람에게서 3장을 빼앗아요.", count: 1, need: "two", real: true, tags: ["steal"], hit: "second" },
    { k: "birthday", type: "action", name: "오늘 내 생일", text: "오늘이 내 생일이라면 승리! (양심에 맡길게요)", count: 1, need: "confirm", real: true },
    // ---------- 행동: 미니게임 (카운터로 못 막아요) ----------
    { k: "rps", type: "action", name: "가위바위보", text: "한 명과 가위바위보! 이긴 사람이 3장을 뽑아요.", count: 2, need: "one", mini: true },
    { k: "coin", type: "action", name: "수상한 동전", text: "동전을 던져요. 앞면이면 3장 뽑고, 뒷면이면 3장 버려요.", count: 2, mini: true },
    { k: "react", type: "action", name: "번개 반응", text: "'지금!' 신호에 가장 늦게 누른 사람이 3장을 버려요.", count: 2, mini: true },
    { k: "pointVote", type: "action", name: "범인은 너!", text: "모두 동시에 한 명을 지목해요. 가장 많이 지목된 사람이 3장을 버려요.", count: 1, mini: true },
    { k: "duel", type: "action", name: "맞짱", text: "한 명과 실제로 눈싸움이나 팔씨름을 해요. 이긴 사람이 3장을 뽑아요.", count: 1, need: "one", mini: true, real: true },
    { k: "photo", type: "action", name: "단체 사진", text: "모두 모여서 찰칵! 소중한 추억이에요. (그게 다예요)", count: 1, mini: true },

    // ---------- 함정: 주인이 직접 발동 (양심) ----------
    { k: "tMuffin", type: "trap", trig: "manual", name: "금지어: 머핀", text: "누가 '머핀'이라고 말하면, 그 사람이 3장을 버려요.", count: 2, effect: { do: "discard", n: 3 } },
    { k: "tJump", type: "trap", trig: "manual", name: "깜짝이야", text: "누군가를 깜짝 놀라게 했다면, 놀란 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tName", type: "trap", trig: "manual", name: "이름 불렀지", text: "누가 내 이름을 부르면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tSing", type: "trap", trig: "manual", name: "노래 금지", text: "누가 노래를 부르면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tLaugh", type: "trap", trig: "manual", name: "웃으면 지는 거", text: "누가 소리 내 웃으면, 그 사람에게서 3장을 빼앗아요.", count: 2, effect: { do: "steal", n: 3 } },
    { k: "tWhine", type: "trap", trig: "manual", name: "투덜이", text: "누가 게임에 불평하면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tTime", type: "trap", trig: "manual", name: "지금 몇 시?", text: "누가 몇 시냐고 물으면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tYawn", type: "trap", trig: "manual", name: "하품 감지기", text: "누가 하품하면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tWhat", type: "trap", trig: "manual", name: "뭐라고?", text: "누가 '뭐라고?'라고 되물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tHello", type: "trap", trig: "manual", name: "인사 함정", text: "내가 '안녕'이라고 했을 때 대답한 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tPlease", type: "trap", trig: "manual", name: "부탁 금지", text: "누가 '~해줘'라고 말하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tCount", type: "trap", trig: "manual", name: "몇 장이게?", text: "누가 내 카드가 몇 장이냐고 물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tLong", type: "trap", trig: "manual", name: "언제 끝나?", text: "누가 게임이 너무 길다고 하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    // ---------- 함정: 조건이 되면 저절로 ----------
    { k: "tEmptyRefill", type: "trap", trig: "empty", name: "바닥 탈출", text: "내 손패가 0장이 되는 순간, 카드를 10장 뽑아요.", count: 1 },
    { k: "tEmptyRob", type: "trap", trig: "empty", name: "빈손의 역습", text: "내 손패가 0장이 되는 순간, 손패가 가장 많은 사람의 카드를 모두 빼앗아요.", count: 1 },
    { k: "tScavenge", type: "trap", trig: "discard", name: "주워 먹기", text: "다른 사람이 카드를 버리게 되면, 버려진 카드를 내 손으로 가져와요.", count: 1 },
    { k: "tThorns", type: "trap", trig: "steal", name: "가시 갑옷", text: "누가 내 카드를 빼앗아 가면, 그 사람에게서 3장을 빼앗아요.", count: 1 },
    { k: "tGrudge", type: "trap", trig: "forced", name: "물귀신", text: "누가 나에게 카드를 버리게 하면, 그 사람도 같은 수만큼 버려요.", count: 1 },

    // ---------- 카운터: 언제든 대응 ----------
    { k: "cNope", type: "counter", name: "어림없지", text: "방금 나온 행동·함정·카운터를 취소해요.", count: 4 },
    { k: "cMine", type: "counter", name: "그거 내 거", text: "방금 나온 행동을 취소하고, 그 카드를 내 손으로 가져와요.", count: 2 },
    { k: "cBack", type: "counter", name: "되로 받고 말로", text: "방금 나온 행동을 취소하고, 그 카드를 낸 사람이 3장을 버려요.", count: 2 },
    { k: "cReturn", type: "counter", name: "도로 가져가", text: "방금 나온 행동을 취소하고, 낸 사람 손으로 되돌려요.", count: 1 },
    { k: "cMirror", type: "counter", name: "거울 반사", text: "방금 나온 행동을 내가 낸 것으로 바꿔요. 나를 노린 효과는 낸 사람에게 가요.", count: 1 },
    { k: "cGhost", type: "counter", name: "유령 탈출", text: "내가 설치한 함정을 모두 버리는 대신, 방금 나온 행동을 취소해요.", count: 1 },
    { k: "cDodge", type: "counter", name: "대신 맞아줘", text: "나에게 온 행동·함정을, 고른 다른 사람이 대신 받아요.", count: 2 },
    { k: "cWall", type: "counter", name: "철벽 방어", text: "누가 내 카드를 빼앗으려 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cGrip", type: "counter", name: "꽉 잡아", text: "누가 나에게 카드를 버리게 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cStopDraw", type: "counter", name: "손 치워", text: "누가 카드를 뽑으려 할 때 취소해요.", count: 2 }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = CARDS;
  else root.MUFFIN_CARDS = CARDS;
})(this);
