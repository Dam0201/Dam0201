// 머핀타임 카드 목록 (서버와 화면이 같이 써요). 원작 카드 이름을 우리 친구들 버전으로 비튼 이름이에요.
// type: action(행동, 하늘색) · trap(함정, 빨강) · counter(카운터, 연두)
// who: 카드 그림 주인 — jihun · coco · isang · jinu · jaedam · colin · prss (없으면 머핀)
// need: 사용할 때 고를 것 — none · one(다른 한 명) · many(해당하는 사람들, 양심) · pick1(한 명, 나 포함) ·
//       two(작은 사람, 큰 사람) · number(1~20) · give2(내 카드 2장 + 한 명) · trapOwner(함정 있는 다른 한 명) · confirm
// hit: 빼앗기/버리기를 당하는 사람 — target · others · all · host · donut · second
// trig(함정): manual(주인이 발동하고 범인 고르기) · empty · discard · steal · forced
(function (root) {
  var CARDS = [
    // ---------- 행동: 내 손 늘리기 ----------
    { k: "feast", type: "action", who: "coco", name: "코코 타임", text: "코코가 깝칠 시간! 카드를 5장 뽑아요.", count: 3, tags: ["draw"] },
    { k: "twoMore", type: "action", who: "jaedam", name: "재담이 레벨 업", text: "레벨은 올랐는데 아직도 실버. 나는 2장, 다른 사람은 모두 1장씩 뽑아요.", count: 2, tags: ["draw"] },
    { k: "shareDraw", type: "action", who: "isang", name: "이거 이상이야?", text: "커플은 나눠 먹는다. 카드 3장을 뽑고, 다른 한 명을 골라 그 사람도 3장을 뽑아요.", count: 2, need: "one", tags: ["draw"] },
    { k: "dumpster", type: "action", who: "jihun", name: "지훈이는 주워 왔어", text: "다리 밑에서 주워 왔대요. 버린 카드 맨 위 3장을 주워 와요.", count: 1 },
    { k: "peekTop", type: "action", who: "jaedam", name: "재담이 숙제 검사", text: "잘난 척은 전교 1등. 카드 더미 위 5장을 보고 1장을 골라 가져와요.", count: 1, tags: ["draw"] },
    { k: "treasureMap", type: "action", who: "coco", name: "고라니 찾았다", text: "카드를 3장 뽑아요. 그중 '코코 더 문 고라니'가 있으면 즉시 승리!", count: 1, tags: ["draw"] },
    { k: "treasureBox", type: "action", who: "coco", name: "코코 더 문 고라니", text: "달빛 아래서 깝치는 중. 카드를 1장 뽑아요.", count: 1, tags: ["draw"] },
    // ---------- 행동: 빼앗기 ----------
    { k: "pick1", type: "action", who: "jihun", name: "지훈이 코 여깄다", text: "바보 듀오 코코가 지훈이 부리를 훔쳐 감. 한 명에게서 1장을 빼앗아요.", count: 3, need: "one", tags: ["steal"], hit: "target" },
    { k: "pick2", type: "action", who: "colin", name: "도둑맞은 콜린 얼굴", text: "재담이가 부캐 얼굴을 빌려 감. 한 명에게서 2장을 빼앗아요.", count: 2, need: "one", tags: ["steal"], hit: "target" },
    { k: "collect", type: "action", who: "colin", name: "와! 콜린이다!", text: "사실 재담이 부캐라는 건 비밀. 다른 모든 사람에게서 1장씩 받아요.", count: 2, tags: ["steal"], hit: "others" },
    { k: "xray", type: "action", who: "jinu", name: "투명인간 지누", text: "착해서 존재감이 없다. 한 명의 손패를 몰래 보고 1장을 골라 빼앗아요.", count: 1, need: "one", tags: ["steal"], hit: "target" },
    { k: "isangHand", type: "action", who: "isang", name: "이상손", text: "남자인 사람에게서 모두 1장씩 빼앗아요. (양심껏 고르기)", count: 1, need: "many", real: true, tags: ["steal"], hit: "target" },
    { k: "wantDonut", type: "action", who: "jinu", name: "지누 레몬 내놔", text: "'지누의 레몬'을 들고 있는 사람의 손패를 모두 빼앗아요.", count: 1, tags: ["steal"], hit: "donut" },
    { k: "ringleader", type: "action", name: "이거 누구 아이디어야?", text: "이 게임 하자고 한 방장에게서 3장을 빼앗아요.", count: 1, tags: ["steal"], hit: "host" },
    // ---------- 행동: 버리게 하기 ----------
    { k: "blast", type: "action", who: "jihun", name: "죽어라 지훈 감자", text: "감자 같은 지훈이의 한 방. 한 명이 카드를 3장 버려요.", count: 3, need: "one", tags: ["discard"], hit: "target" },
    { k: "wipe", type: "action", who: "jaedam", name: "재담이 끌어내!", text: "이번 시즌도 골드는 무리. 한 명이 손패를 모두 버려요.", count: 1, need: "one", tags: ["discard"], hit: "target" },
    { k: "quake", type: "action", who: "coco", name: "지뢰 고라니", text: "지훈이가 밟아 보래서 밟았다! 나를 포함해 모두 3장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "flop", type: "action", who: "jihun", name: "지훈이 따라 모두 엎어져", text: "바보 듀오가 같이 엎어짐. 나를 포함해 모두 1장씩 버려요.", count: 2, tags: ["discard"], hit: "all" },
    { k: "onlyOne", type: "action", who: "isang", name: "이상이 뿐이야", text: "지누냐 prss냐, 원픽만 남긴다(근데 prss는 사촌). 모두 손패를 1장만 남기고 버려요.", count: 1, tags: ["discard"], hit: "all" },
    { k: "myDonut", type: "action", who: "jinu", name: "지누의 레몬", text: "남친 지누가 레몬을 이상이한테 다 줬다. 카드를 4장 버려요.", count: 1 },
    // ---------- 행동: 판 흔들기 ----------
    { k: "gift", type: "action", who: "jinu", name: "지누의 일부", text: "이상이한테 다 퍼 주는 지누. 내 카드 2장을 골라 한 명에게 줘요.", count: 2, need: "give2" },
    { k: "hotPotato", type: "action", who: "coco", name: "고라니 날아온다", text: "피해! 이 카드를 버리지 않고 한 명의 손에 떠넘겨요.", count: 2, need: "one" },
    { k: "swapHands", type: "action", who: "isang", name: "이상이 좀 받아줘", text: "가방은 남친 지누 몫. 한 명과 손패를 통째로 바꿔요.", count: 1, need: "one" },
    { k: "shuffleAll", type: "action", who: "jihun", name: "지훈아 뭐 하는 거야?!", text: "지훈이가 판을 엎었다. 모두의 손패를 모아 섞은 뒤 똑같이 나눠요.", count: 1 },
    { k: "trainBack", type: "action", who: "prss", name: "prss는 기차가 좋아", text: "어르신은 기차 여행. 모두가 바로 앞 차례 사람의 손패를 통째로 가져가요.", count: 1 },
    { k: "seven", type: "action", who: "coco", name: "코코는 빨리 자라고 싶어", text: "형 prss만큼 크고 싶은 빼빼 코코. 모두 손패를 7장으로 맞춰요(뽑거나 버리기).", count: 1 },
    { k: "fresh", type: "action", who: "jihun", name: "완전히 달라진 지훈이", text: "다 까먹고 새 출발. 내 손패를 모두 버리고, 버린 만큼 새로 뽑아요.", count: 1 },
    { k: "reverse", type: "action", who: "jihun", name: "지훈이는 굴러 올라가기", text: "어떻게 한 건지 아무도 모름. 진행 방향을 반대로 바꿔요.", count: 2 },
    { k: "skipOne", type: "action", who: "prss", name: "prss는 기다려야지", text: "어르신은 천천히. 한 명이 다음 차례를 쉬어요.", count: 2, need: "one" },
    { k: "jump", type: "action", who: "coco", name: "고라니가 뭘 기다려?!", text: "갑자기 튀어나왔다. 고른 사람부터 이어서 진행해요.", count: 1, need: "one" },
    { k: "double", type: "action", who: "jinu", name: "지누의 머핀 공장", text: "착한 지누가 머핀을 마구 굽는다. 이번 차례에 행동을 2번 더 할 수 있어요.", count: 1 },
    { k: "copycat", type: "action", who: "jihun", name: "지훈이랑 코코 동기화", text: "바보 듀오는 생각도 같다(없다). 가장 최근에 쓰인 행동 카드를 따라 해요.", count: 1 },
    { k: "banana", type: "action", who: "jihun", name: "지훈이의 바나나 껍질", text: "이 카드를 카드 더미에 섞어 넣어요. 뽑은 사람은 3장을 버려요.", count: 1 },
    { k: "nothing", type: "action", who: "jihun", name: "의미 없는 지훈이", text: "아무 일도 일어나지 않아요. 지훈이는 다 계획이 있었대요.", count: 1 },
    // ---------- 행동: 승리 조건 ----------
    { k: "fewestWins", type: "action", who: "jaedam", name: "재담이 연애 -끝-", text: "다음 내 차례가 시작될 때 손패가 가장 적은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "mostWins", type: "action", who: "prss", name: "prss 정년 1년 남으셨습니다", text: "다음 내 차례가 시작될 때 손패가 가장 많은 사람이 승리해요. (동점이면 한 바퀴 더)", count: 1 },
    { k: "setGoal", type: "action", who: "jaedam", name: "재담이는 골드 가는 게 꿈", text: "꿈은 크게. 승리 장수를 1~20 중 하나로 바꿔요.", count: 1, need: "number" },
    { k: "hold", type: "action", who: "prss", name: "prss 좀 기다려봐", text: "어르신 무릎이 아직… 다음 내 차례까지 아무도 승리할 수 없어요.", count: 1 },
    // ---------- 행동: 함정·카운터 다루기 ----------
    { k: "clearTraps", type: "action", who: "jaedam", name: "갑자기 분위기 재담", text: "잘난 척 시작하자 분위기 싸해짐. 설치된 함정을 전부 버려요.", count: 1 },
    { k: "exposeTraps", type: "action", who: "coco", name: "고라니 뿌셔뿌셔", text: "고라니가 다 밟고 지나감. 한 명이 설치한 함정을 모두 버려요.", count: 1, need: "trapOwner" },
    { k: "stealTrap", type: "action", who: "colin", name: "이제 콜린 겁니다", text: "느끼하게 웃으며 가져감. 한 명이 설치한 함정 1장을 내 손으로 가져와요.", count: 1, need: "trapOwner" },
    { k: "noCounter", type: "action", who: "jihun", name: "우린 다 지훈이가 될 거야", text: "코코까지 지훈이가 됐다. 다음 내 차례까지 아무도 카운터를 못 써요.", count: 1 },
    { k: "noAction", type: "action", who: "isang", name: "이상이는 절대 안 돼", text: "다음 내 차례까지 아무도 행동 카드를 쓸 수 없어요.", count: 1 },
    // ---------- 행동: 진짜 세상 (양심껏 고르기) ----------
    { k: "hats", type: "action", who: "colin", name: "콜린의 근사한 모자", text: "지금 모자를 쓴 사람은 모두 3장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "glasses", type: "action", who: "jaedam", name: "재담이는 범생이", text: "안경을 쓴 사람은 모두 2장씩 뽑아요.", count: 1, need: "many", real: true },
    { k: "catOwners", type: "action", name: "고양이 알러지", text: "고양이를 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "noDog", type: "action", who: "jihun", name: "지훈이만 강아지 없어", text: "강아지를 안 키우는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "away", type: "action", who: "colin", name: "콜린, 우리 집에서 나가", text: "지금 자기 집이 아닌 곳에 있는 사람은 모두 2장씩 버려요.", count: 1, need: "many", real: true, tags: ["discard"], hit: "target" },
    { k: "eldest", type: "action", who: "prss", name: "거대 아기 prss", text: "가장 나이가 많은 사람이 3장을 버려요. (보통 prss)", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "youngest", type: "action", name: "작은 아기", text: "가장 나이가 어린 사람이 3장을 버려요.", count: 1, need: "pick1", real: true, tags: ["discard"], hit: "target" },
    { k: "tall", type: "action", who: "coco", name: "작은 거인 코코", text: "형 prss랑 키 재기. 가장 키가 작은 사람이 가장 큰 사람에게서 3장을 빼앗아요.", count: 1, need: "two", real: true, tags: ["steal"], hit: "second" },
    { k: "birthday", type: "action", name: "오늘은 내 생일", text: "오늘이 내 생일이라면 승리! (양심에 맡길게요)", count: 1, need: "confirm", real: true },
    // ---------- 행동: 미니게임 (카운터로 못 막아요) ----------
    { k: "rps", type: "action", who: "jinu", name: "지누랑 결투 시작", text: "이상이한테는 늘 져 주는 지누. 한 명과 가위바위보! 이긴 사람이 3장을 뽑아요.", count: 2, need: "one", mini: true },
    { k: "coin", type: "action", who: "jihun", name: "지훈이의 수상한 버튼", text: "아무 버튼이나 누르는 지훈이. 앞면이면 3장 뽑고, 뒷면이면 3장 버려요.", count: 2, mini: true },
    { k: "react", type: "action", who: "prss", name: "prss 일어서기 수업", text: "'지금!' 신호에 가장 늦게 누른 사람이 3장을 버려요. 어르신 무릎 주의.", count: 2, mini: true },
    { k: "pointVote", type: "action", who: "jihun", name: "준비, 발사!", text: "모두 동시에 한 명을 지목해요. 가장 많이 지목된 사람이 3장을 버려요. (보통 바보 듀오)", count: 1, mini: true },
    { k: "duel", type: "action", who: "colin", name: "콜린이랑 한판 붙어 볼래?", text: "본캐 재담이 vs 부캐 콜린?! 한 명과 실제로 눈싸움이나 팔씨름을 해요. 이긴 사람이 3장을 뽑아요.", count: 1, need: "one", mini: true, real: true },
    { k: "photo", type: "action", who: "isang", name: "이상이가 카메라 샀어", text: "소중한 추억을 남겨요! 모두 모여서 찰칵. (그게 다예요)", count: 1, mini: true },

    // ---------- 함정: 주인이 직접 발동 (양심) ----------
    { k: "tMuffin", type: "trap", trig: "manual", name: "빵 터졌네", text: "누가 '머핀'이라고 말하면, 그 사람이 3장을 버려요.", count: 2, effect: { do: "discard", n: 3 } },
    { k: "tJump", type: "trap", trig: "manual", who: "coco", name: "고라니가 깜짝 놀랐지!", text: "누군가를 깜짝 놀라게 했다면, 놀란 사람이 3장을 버려요. 고라니처럼 꽥!", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tName", type: "trap", trig: "manual", who: "jaedam", name: "재담이의 이름은", text: "누가 내 이름을 부르면, 그 사람이 3장을 버려요. 사인은 안 해 줘요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tSing", type: "trap", trig: "manual", who: "colin", name: "콜린이 행복하다면", text: "누가 노래를 부르면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tLaugh", type: "trap", trig: "manual", who: "jihun", name: "와 지훈이 재밌다", text: "누가 소리 내 웃으면, 그 사람에게서 3장을 빼앗아요.", count: 2, effect: { do: "steal", n: 3 } },
    { k: "tWhine", type: "trap", trig: "manual", who: "jaedam", name: "울보 아기 재담이", text: "누가 게임에 불평하면, 그 사람이 3장을 버려요. '나 원래 골드야' 금지.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tTime", type: "trap", trig: "manual", who: "prss", name: "prss, 지금 몇 시야?", text: "누가 몇 시냐고 물으면, 그 사람이 4장을 버려요. 어르신은 9시면 주무셔요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tYawn", type: "trap", trig: "manual", who: "jinu", name: "지누야, 피곤하니?", text: "누가 하품하면, 그 사람이 4장을 버려요.", count: 1, effect: { do: "discard", n: 4 } },
    { k: "tWhat", type: "trap", trig: "manual", who: "jihun", name: "지훈이가 뭐어라고?!", text: "누가 '뭐라고?'라고 되물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tHello", type: "trap", trig: "manual", who: "colin", name: "콜린이 모두들 안녕", text: "내가 '안녕'이라고 했을 때 대답한 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tPlease", type: "trap", trig: "manual", who: "isang", name: "이상이의 마법의 단어", text: "누가 '~해줘'라고 말하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    { k: "tCount", type: "trap", trig: "manual", who: "coco", name: "코코 카운트다운", text: "누가 내 카드가 몇 장이냐고 물으면, 그 사람이 3장을 버려요.", count: 1, effect: { do: "discard", n: 3 } },
    { k: "tLong", type: "trap", trig: "manual", who: "prss", name: "prss, 아직 멀었어?", text: "누가 게임이 너무 길다고 하면, 그 사람에게서 3장을 빼앗아요.", count: 1, effect: { do: "steal", n: 3 } },
    // ---------- 함정: 조건이 되면 저절로 ----------
    { k: "tEmptyRefill", type: "trap", trig: "empty", who: "jinu", name: "지누는 오히려 좋아", text: "내 손패가 0장이 되는 순간 카드를 10장 뽑아요. 지누는 뭘 당해도 웃음.", count: 1 },
    { k: "tEmptyRob", type: "trap", trig: "empty", who: "coco", name: "코코는 쓰러지지 않는다", text: "형 prss 카드부터 턴다. 내 손패가 0장이 되는 순간, 손패가 가장 많은 사람의 카드를 모두 빼앗아요.", count: 1 },
    { k: "tScavenge", type: "trap", trig: "discard", who: "jihun", name: "멍청하군, 지훈이", text: "다른 사람이 카드를 버리게 되면, 버려진 카드를 내 손으로 주워 와요.", count: 1 },
    { k: "tThorns", type: "trap", trig: "steal", who: "jaedam", name: "재담이의 바늘들", text: "그웬 바늘 콕. 누가 내 카드를 빼앗아 가면, 그 사람에게서 3장을 빼앗아요.", count: 1 },
    { k: "tGrudge", type: "trap", trig: "forced", who: "isang", name: "이상이 울지마", text: "지누랑 prss가 동시에 달려온다. 누가 나에게 카드를 버리게 하면, 그 사람도 같은 수만큼 버려요.", count: 1 },

    // ---------- 카운터: 언제든 대응 ----------
    { k: "cNope", type: "counter", who: "jaedam", name: "재담이가 오늘은 아니래", text: "방금 나온 행동·함정·카운터를 취소해요.", count: 4 },
    { k: "cMine", type: "counter", who: "isang", name: "이상이 안돼!!!", text: "사촌동생 코코 것도 내 것. 방금 나온 행동을 취소하고, 그 카드를 내 손으로 가져와요.", count: 2 },
    { k: "cBack", type: "counter", who: "coco", name: "아, 코코 제발 좀!", text: "사촌누나 이상이의 잔소리. 방금 나온 행동을 취소하고, 그 카드를 낸 사람이 3장을 버려요.", count: 2 },
    { k: "cReturn", type: "counter", who: "prss", name: "prss가 다 돌려놔", text: "동생 코코 혼내는 형. 방금 나온 행동을 취소하고, 낸 사람 손으로 돌려보내요.", count: 1 },
    { k: "cMirror", type: "counter", who: "colin", name: "콜린의 반대의 날", text: "부캐 해제! 거울 속엔 재담이가. 방금 나온 행동을 내가 낸 것으로 바꿔요. 나를 노린 효과는 낸 사람에게 가요.", count: 1 },
    { k: "cGhost", type: "counter", who: "jihun", name: "지훈이는 유령이야", text: "내가 설치한 함정을 모두 버리고, 방금 나온 행동을 취소해요.", count: 1 },
    { k: "cDodge", type: "counter", who: "jinu", name: "지누사우르스", text: "여친 이상이 대신 맞아 주는 지누. 나에게 온 행동·함정을, 고른 다른 사람이 대신 받아요.", count: 2 },
    { k: "cWall", type: "counter", who: "jinu", name: "안 돼, 지누 돌아가", text: "이상이 지키는 철벽 남친. 누가 내 카드를 빼앗으려 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cGrip", type: "counter", who: "coco", name: "고라니야 뛰어내리지 마", text: "형 prss가 붙잡아 준다. 누가 나에게 카드를 버리게 하면, 나만 쏙 빠져요.", count: 2 },
    { k: "cStopDraw", type: "counter", who: "jihun", name: "지훈이 멈춰!", text: "누가 카드를 뽑으려 할 때 취소해요.", count: 2 }
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = CARDS;
  else root.MUFFIN_CARDS = CARDS;
})(this);
