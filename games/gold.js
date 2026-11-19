const SIZE = 5, LAYERS = 3;
// 층별 바위 뒷면 구성 (층마다 25개): 돌 1 · 구리 2 · 은 3 · 금 4 골드
// 1층엔 은·금이 없고, 3층엔 돌이 없어요. 깊을수록 좋은 광물이 많아요.
const LAYER_COUNTS = [
  { 1: 17, 2: 8 },              // 1층(맨 위): 평균 1.3골드
  { 1: 13, 2: 7, 3: 4, 4: 1 },  // 2층: 평균 1.7골드
  { 2: 9, 3: 10, 4: 6 }         // 3층(맨 아래): 평균 2.9골드
];
// 채굴 카드 구성
//  hit    : n번 곡괭이질, 원하는 칸에 나눠서
//  line   : 가로 또는 세로 한 줄 전체를 1번씩
//  triple : 드릴. 한 칸을 연달아 3번
//  gold   : 골드러쉬! 10번 곡괭이질
//  bomb   : 고른 칸과 상하좌우를 1번씩 (십자 폭약)
const DECK_SPEC = [
  { t: "hit", n: 1, count: 6, label: "1회 채굴" },
  { t: "hit", n: 2, count: 7, label: "2회 채굴" },
  { t: "hit", n: 3, count: 5, label: "3회 채굴" },
  { t: "line", n: 1, count: 4, label: "1줄 채굴" },
  { t: "triple", n: 3, count: 4, label: "드릴" },
  { t: "bomb", n: 1, count: 4, label: "폭약" }
];
// 골드러쉬(10번 채굴)는 덱에 없고, 카드를 뽑을 때마다 이 확률로 대신 나와요. 한 판에 한 번만.
const GOLD_CHANCE = process.env.GOLD_CHANCE ? Number(process.env.GOLD_CHANCE) : 0.015;
const GOLD_CARD = { t: "gold", n: 10, label: "골드러쉬" };
const COLORS = ["#ff6b5a", "#5cc8ff", "#9be564", "#b38cff", "#ff8fc7", "#ffa14a"];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildDeck() {
  const d = [];
  DECK_SPEC.forEach((s) => { for (let i = 0; i < s.count; i++) d.push({ t: s.t, n: s.n, label: s.label }); });
  return shuffle(d);
}

function init() { return { phase: "lobby" }; }
function canJoin(room) { return room.g.phase === "lobby"; }

function remaining(g) { return g.cells.reduce((a, c) => a + c.depth, 0); }
function emit(g, events) { g.seq = (g.seq || 0) + 1; g.events = events; }

function start(room) {
  const ids = Object.entries(room.members).sort((a, b) => a[1].joinedAt - b[1].joinedAt).map(([id]) => id);
  const players = shuffle(ids.map((id, i) => ({ uid: id, name: room.members[id].name, color: COLORS[i % COLORS.length], rocks: [] })));
  const vals = new Array(SIZE * SIZE * LAYERS);
  LAYER_COUNTS.forEach((counts, layer) => {
    let pool = [];
    Object.keys(counts).forEach((v) => { for (let i = 0; i < counts[v]; i++) pool.push(+v); });
    pool = shuffle(pool);
    for (let c = 0; c < SIZE * SIZE; c++) vals[c * LAYERS + layer] = pool[c];
  });
  room.secret = { vals };
  const cells = [];
  for (let i = 0; i < SIZE * SIZE; i++) cells.push({ depth: LAYERS, hits: 0 });
  room.g = { phase: "play", players, cells, cur: 0, deck: buildDeck(), discard: [], card: null, hitsLeft: 0, step: "draw", seq: room.g.seq || 0, events: [] };
  emit(room.g, [{ k: "turn" }]);
}

function hitCell(room, i, evs, by) {
  const g = room.g, cell = g.cells[i];
  if (cell.depth === 0) return;
  cell.hits++;
  evs.push({ k: "hit", i, by });
  const need = LAYERS + 1 - cell.depth;
  if (cell.hits >= need) {
    const v = room.secret.vals[i * LAYERS + (LAYERS - cell.depth)];
    cell.depth--;
    cell.hits = 0;
    g.players[g.cur].rocks.push(v);
    evs.push({ k: "break", i, v, by });
  }
}

function discardCard(g) {
  if (g.card && g.card.t !== "gold") g.discard.push(g.card);
}
function nextTurn(g) {
  discardCard(g);
  g.card = null;
  g.hitsLeft = 0;
  g.step = "draw";
  g.cur = (g.cur + 1) % g.players.length;
  emit(g, [{ k: "turn" }]);
}

function act(room, uid, msg, ctx) {
  const g = room.g;
  if (msg.a === "start") {
    if (uid !== room.hostId || g.phase !== "lobby" || Object.keys(room.members).length < 2) return false;
    start(room);
    return true;
  }
  if (msg.a === "restart") {
    if (uid !== room.hostId || g.phase !== "end") return false;
    room.g = { phase: "lobby", seq: g.seq };
    room.secret = null;
    return true;
  }
  if (g.phase !== "play") return false;
  const cur = g.players[g.cur];

  if (msg.a === "skip") {
    if (uid !== room.hostId || ctx.isOnline(cur.uid) || g.step === "wait") return false;
    nextTurn(g);
    return true;
  }
  if (cur.uid !== uid) return false;

  if (msg.a === "draw") {
    if (g.step !== "draw") return false;
    let card;
    if (!g.goldUsed && Math.random() < GOLD_CHANCE) {
      card = Object.assign({}, GOLD_CARD);
      g.goldUsed = true;
    } else {
      if (!g.deck.length) { g.deck = shuffle(g.discard); g.discard = []; }
      card = g.deck.pop();
    }
    g.card = card;
    g.hitsLeft = (card.t === "hit" || card.t === "gold") ? card.n : 1;
    g.step = "mine";
    emit(g, [{ k: "draw", t: card.t }]);
    return true;
  }

  if (msg.a === "hit") {
    if (g.step !== "mine" || !g.card) return false;
    const i = Number(msg.i);
    if (!Number.isInteger(i) || i < 0 || i >= SIZE * SIZE) return false;
    const cells = g.cells, evs = [];
    const r = Math.floor(i / SIZE), c = i % SIZE;
    switch (g.card.t) {
      case "hit":
      case "gold":
        if (cells[i].depth === 0) return false;
        hitCell(room, i, evs, uid);
        g.hitsLeft--;
        break;
      case "triple":
        if (cells[i].depth === 0) return false;
        for (let n = 0; n < 3 && cells[i].depth > 0; n++) hitCell(room, i, evs, uid);
        g.hitsLeft = 0;
        break;
      case "line": {
        const dir = msg.dir === "col" ? "col" : "row";
        const line = [];
        for (let k = 0; k < SIZE; k++) line.push(dir === "row" ? r * SIZE + k : k * SIZE + c);
        const targets = line.filter((t) => cells[t].depth > 0);
        if (!targets.length) return false;
        evs.push({ k: "line", dir, i });
        targets.forEach((t) => hitCell(room, t, evs, uid));
        g.hitsLeft = 0;
        break;
      }
      case "bomb": {
        const cross = [i];
        if (r > 0) cross.push(i - SIZE);
        if (r < SIZE - 1) cross.push(i + SIZE);
        if (c > 0) cross.push(i - 1);
        if (c < SIZE - 1) cross.push(i + 1);
        const targets = cross.filter((t) => cells[t].depth > 0);
        if (!targets.length) return false;
        evs.push({ k: "bomb", i });
        targets.forEach((t) => hitCell(room, t, evs, uid));
        g.hitsLeft = 0;
        break;
      }
      default:
        return false;
    }
    emit(g, evs);
    const hitsInAction = evs.filter((e) => e.k === "hit").length;
    if (remaining(g) === 0) {
      g.step = "wait";
      g.ending = true;
      g.nextAt = Date.now() + 1800 + hitsInAction * 150;
    } else if (g.hitsLeft <= 0) {
      g.step = "wait";
      g.nextAt = Date.now() + 1300 + hitsInAction * 150;
    }
    return true;
  }
  return false;
}

function tick(room) {
  const g = room.g;
  if (g.phase !== "play" || g.step !== "wait" || Date.now() < g.nextAt) return false;
  if (g.ending) {
    discardCard(g);
    g.card = null;
    g.phase = "end";
    emit(g, [{ k: "end" }]);
  } else {
    nextTurn(g);
  }
  return true;
}

function view(room) {
  const g = room.g;
  if (g.phase === "lobby") return { phase: "lobby", seq: g.seq || 0 };
  return {
    phase: g.phase,
    players: g.players.map((p) => ({ uid: p.uid, name: p.name, color: p.color, rocks: p.rocks })),
    cells: g.cells.map((c) => ({ d: c.depth, h: c.hits })),
    cur: g.cur, card: g.card, hitsLeft: g.hitsLeft, step: g.step,
    deckCount: g.deck.length, remaining: remaining(g), total: SIZE * SIZE * LAYERS,
    seq: g.seq, events: g.events
  };
}

module.exports = { init, canJoin, act, tick, view };
