// 달무티: 1(달무티) 1장, 2 2장 … 12 12장 + 조커(13) 2장 = 80장
const JOKER = 13;
const MAX_PLAYERS = 8;
const BOT_NAMES = ["봇 돌쇠", "봇 마님", "봇 대감", "봇 머슴", "봇 아씨", "봇 사또", "봇 도령", "봇 꺽정"];
const BOT_DELAY = 900;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sortHand(h) { h.sort((a, b) => a - b); }
function countOf(hand) {
  const c = {};
  hand.forEach((v) => { c[v] = (c[v] || 0) + 1; });
  return c;
}
function removeCards(hand, cards) {
  const copy = hand.slice();
  for (const v of cards) {
    const i = copy.indexOf(v);
    if (i < 0) return null;
    copy.splice(i, 1);
  }
  return copy;
}
function emit(g, events) { g.seq = (g.seq || 0) + 1; g.events = events; }

// 카드 묶음 해석: 조커 아닌 카드는 모두 같은 숫자여야 하고, 조커는 그 숫자를 복제. 조커만이면 13.
function parsePlay(cards) {
  if (!Array.isArray(cards) || !cards.length) return null;
  const nums = cards.filter((v) => v !== JOKER);
  if (nums.some((v) => v !== nums[0])) return null;
  return { num: nums.length ? nums[0] : JOKER, count: cards.length };
}

function titleFor(pos, n) {
  if (pos === 0) return "달무티";
  if (pos === n - 1) return "농노";
  if (n >= 4 && pos === 1) return "총리대신";
  if (n >= 4 && pos === n - 2) return "소작농";
  return "상인";
}

function init() { return { phase: "lobby", bots: [], round: 0, ranks: [], history: [] }; }
function canJoin(room) { return room.g.phase === "lobby" || room.g.phase === "roundEnd"; }

function seatList(room) {
  const g = room.g;
  const humans = Object.entries(room.members).sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    .map(([id, m]) => ({ id, name: m.name, bot: false }));
  return humans.concat(g.bots.map((b) => ({ id: b.id, name: b.name, bot: true })));
}

function startRound(room) {
  const g = room.g;
  const seats = seatList(room);
  const byId = Object.fromEntries(seats.map((s) => [s.id, s]));
  let order;
  if (g.ranks.length) {
    // 지난 판 순위대로, 새로 온 사람은 맨 아래(농노 쪽)에
    order = g.ranks.filter((id) => byId[id]).concat(seats.map((s) => s.id).filter((id) => !g.ranks.includes(id)));
  } else {
    order = shuffle(seats.map((s) => s.id));
  }
  const n = order.length;
  const deck = [];
  for (let v = 1; v <= 12; v++) for (let k = 0; k < v; k++) deck.push(v);
  deck.push(JOKER, JOKER);
  const cards = shuffle(deck);
  // 똑같이 나누고, 남는 카드는 낮은 신분부터 한 장씩 더
  const base = Math.floor(cards.length / n), extra = cards.length % n;
  const hands = {};
  let p = 0;
  order.forEach((id, pos) => {
    const size = base + (pos >= n - extra ? 1 : 0);
    hands[id] = cards.slice(p, p + size);
    sortHand(hands[id]);
    p += size;
  });
  g.round++;
  g.order = order;
  g.players = Object.fromEntries(order.map((id) => [id, { name: byId[id].name, bot: byId[id].bot }]));
  g.hands = hands;
  g.titles = Object.fromEntries(order.map((id, pos) => [id, titleFor(pos, n)]));
  g.revolution = null;
  g.tax = [];
  g.trick = null;
  g.lastPlayBy = null;
  g.passed = {};
  g.finished = [];
  g.turn = null;
  const holder = order.find((id) => hands[id].filter((v) => v === JOKER).length === 2);
  if (holder) {
    g.phase = "revolt";
    g.revoltHolder = holder;
    g.actAt = Date.now() + BOT_DELAY;
  } else {
    g.revoltHolder = null;
    beginTax(g);
  }
  emit(g, [{ k: "deal" }]);
}

function beginTax(g) {
  const n = g.order.length;
  const pairs = [{ top: g.order[0], bottom: g.order[n - 1], count: 2 }];
  if (n >= 4) pairs.push({ top: g.order[1], bottom: g.order[n - 2], count: 1 });
  g.tax = pairs.map((t) => {
    // 낮은 신분은 가장 좋은(숫자가 작은) 카드를 자동으로 바쳐요
    const hand = g.hands[t.bottom];
    const gave = hand.slice(0, t.count);
    g.hands[t.bottom] = hand.slice(t.count);
    g.hands[t.top] = g.hands[t.top].concat(gave);
    sortHand(g.hands[t.top]);
    return { top: t.top, bottom: t.bottom, count: t.count, gave, back: null };
  });
  g.phase = "tax";
  g.actAt = Date.now() + BOT_DELAY;
}

function finishTaxIfDone(g) {
  if (g.tax.every((t) => t.back)) beginPlay(g);
}

function beginPlay(g) {
  g.phase = "play";
  g.trick = null;
  g.lastPlayBy = null;
  g.passed = {};
  setTurn(g, g.order[0]);
}

function setTurn(g, id) {
  g.turn = id;
  g.actAt = Date.now() + BOT_DELAY;
}
function active(g, id) { return g.hands[id] && g.hands[id].length > 0; }

function advance(g, fromId, events) {
  const n = g.order.length;
  const stillIn = g.order.filter((id) => active(g, id));
  if (stillIn.length <= 1) {
    if (stillIn.length === 1) g.finished.push(stillIn[0]);
    endRound(g, events);
    return;
  }
  let idx = g.order.indexOf(fromId);
  for (let k = 1; k <= n * 2; k++) {
    const cand = g.order[(idx + k) % n];
    if (cand === g.lastPlayBy && g.trick) {
      // 한 바퀴 돌아 마지막으로 낸 사람에게 왔으면 판을 치우고 그 사람이 선
      g.trick = null;
      g.passed = {};
      events.push({ k: "clear", by: cand });
      if (active(g, cand)) { setTurn(g, cand); return; }
      continue; // 그 사람이 이미 다 털었으면 다음 사람이 선
    }
    if (active(g, cand)) { setTurn(g, cand); return; }
  }
}

function endRound(g, events) {
  g.phase = "roundEnd";
  g.ranks = g.finished.slice();
  g.turn = null;
  g.history.push({ round: g.round, ranks: g.ranks.map((id) => g.players[id].name), revolution: g.revolution });
  if (g.history.length > 10) g.history.shift();
  events.push({ k: "roundEnd" });
}

function doPlay(g, id, cards, events) {
  if (g.phase !== "play" || g.turn !== id) return false;
  const play = parsePlay(cards);
  if (!play) return false;
  const left = removeCards(g.hands[id], cards);
  if (!left) return false;
  if (g.trick && (play.count !== g.trick.count || play.num >= g.trick.num)) return false;
  g.hands[id] = left;
  g.trick = { num: play.num, count: play.count, cards: cards.slice().sort((a, b) => a - b), by: id };
  g.lastPlayBy = id;
  g.passed = {};
  events.push({ k: "play", by: id, num: play.num, count: play.count });
  if (!left.length) {
    g.finished.push(id);
    events.push({ k: "finish", by: id, pos: g.finished.length });
  }
  advance(g, id, events);
  return true;
}

function doPass(g, id, events) {
  if (g.phase !== "play" || g.turn !== id || !g.trick) return false;
  g.passed[id] = true;
  events.push({ k: "pass", by: id });
  advance(g, id, events);
  return true;
}

function doReturn(g, id, cards) {
  if (g.phase !== "tax") return false;
  const t = g.tax.find((x) => x.top === id && !x.back);
  if (!t || !Array.isArray(cards) || cards.length !== t.count) return false;
  const left = removeCards(g.hands[id], cards);
  if (!left) return false;
  g.hands[id] = left;
  g.hands[t.bottom] = g.hands[t.bottom].concat(cards);
  sortHand(g.hands[t.bottom]);
  t.back = cards.slice();
  return true;
}

function doRevolt(g, id, yes, events) {
  if (g.phase !== "revolt" || g.revoltHolder !== id) return false;
  if (yes) {
    const n = g.order.length;
    const isBottom = g.order[n - 1] === id;
    if (isBottom) {
      g.order = g.order.slice().reverse();
      g.titles = Object.fromEntries(g.order.map((pid, pos) => [pid, titleFor(pos, n)]));
      g.revolution = { type: "great", by: id };
    } else {
      g.revolution = { type: "normal", by: id };
    }
    events.push({ k: "revolt", type: g.revolution.type, by: id });
    beginPlay(g);
  } else {
    beginTax(g);
  }
  return true;
}

// ---------- 봇 ----------
function botChoosePlay(hand, trick) {
  const c = countOf(hand), jokers = c[JOKER] || 0;
  const nums = Object.keys(c).map(Number).filter((v) => v !== JOKER).sort((a, b) => b - a);
  if (!trick) {
    if (!nums.length) return hand.slice();
    const x = nums[0];
    return new Array(c[x]).fill(x);
  }
  const need = trick.count, below = trick.num;
  for (const x of nums) {
    if (x < below && c[x] >= need) return new Array(need).fill(x);
  }
  const nearEnd = hand.length <= need + 4;
  if (jokers && (nearEnd || Math.random() < 0.3)) {
    for (const x of nums) {
      if (x < below && c[x] + jokers >= need) {
        return new Array(c[x] >= need ? need : c[x]).fill(x).concat(new Array(Math.max(0, need - c[x])).fill(JOKER));
      }
    }
  }
  return null;
}
function botReturn(hand, count) {
  const sorted = hand.slice().sort((a, b) => {
    if (a === JOKER) return 1;
    if (b === JOKER) return -1;
    return b - a;
  });
  return sorted.slice(0, count);
}
function autoAct(g, id, events) {
  if (g.phase === "revolt" && g.revoltHolder === id) {
    const pos = g.order.indexOf(id), n = g.order.length;
    return doRevolt(g, id, g.players[id].bot && pos >= Math.floor(n / 2), events);
  }
  if (g.phase === "tax") {
    const t = g.tax.find((x) => x.top === id && !x.back);
    if (t) { doReturn(g, id, botReturn(g.hands[id], t.count)); finishTaxIfDone(g); return true; }
    return false;
  }
  if (g.phase === "play" && g.turn === id) {
    const choice = botChoosePlay(g.hands[id], g.trick);
    if (choice && doPlay(g, id, choice, events)) return true;
    if (g.trick) return doPass(g, id, events);
    return doPlay(g, id, [g.hands[id][g.hands[id].length - 1]], events);
  }
  return false;
}

// ---------- 액션 ----------
function act(room, uid, msg, ctx) {
  const g = room.g;
  const events = [];
  let ok = false;
  switch (msg.a) {
    case "addBot": {
      if (uid !== room.hostId || !canJoin(room)) return false;
      if (seatList(room).length >= MAX_PLAYERS) return false;
      const used = new Set(g.bots.map((b) => b.name));
      const name = BOT_NAMES.find((nm) => !used.has(nm)) || "봇 " + (g.bots.length + 1);
      g.bots.push({ id: "bot-" + Math.random().toString(36).slice(2, 9), name });
      return true;
    }
    case "removeBot": {
      if (uid !== room.hostId || !canJoin(room)) return false;
      const i = g.bots.findIndex((b) => b.id === msg.id);
      if (i < 0) return false;
      g.bots.splice(i, 1);
      g.ranks = g.ranks.filter((id) => id !== msg.id);
      return true;
    }
    case "start":
    case "next": {
      if (uid !== room.hostId || !canJoin(room)) return false;
      const n = seatList(room).length;
      if (n < 2 || n > MAX_PLAYERS) return false;
      startRound(room);
      return true;
    }
    case "toLobby": {
      if (uid !== room.hostId || g.phase !== "roundEnd") return false;
      g.phase = "lobby";
      return true;
    }
    case "revolt": ok = doRevolt(g, uid, !!msg.yes, events); break;
    case "return": ok = doReturn(g, uid, msg.cards); if (ok) finishTaxIfDone(g); break;
    case "play": ok = doPlay(g, uid, msg.cards, events); break;
    case "pass": ok = doPass(g, uid, events); break;
    case "skip": {
      // 방장이 연결이 끊긴 사람 대신 진행 (봇처럼 자동으로)
      if (uid !== room.hostId) return false;
      const target = g.phase === "play" ? g.turn : g.phase === "revolt" ? g.revoltHolder
        : g.phase === "tax" ? (g.tax.find((t) => !t.back) || {}).top : null;
      if (!target || g.players[target].bot || ctx.isOnline(target)) return false;
      ok = autoAct(g, target, events);
      break;
    }
    default: return false;
  }
  if (ok) emit(g, events);
  return ok;
}

function tick(room) {
  const g = room.g;
  if (!g.order || Date.now() < (g.actAt || 0)) return false;
  const events = [];
  let ok = false;
  const isBot = (id) => id && g.players[id] && g.players[id].bot;
  if (g.phase === "revolt" && isBot(g.revoltHolder)) ok = autoAct(g, g.revoltHolder, events);
  else if (g.phase === "tax") {
    const t = g.tax.find((x) => !x.back && isBot(x.top));
    if (t) ok = autoAct(g, t.top, events);
  } else if (g.phase === "play" && isBot(g.turn)) ok = autoAct(g, g.turn, events);
  if (ok) emit(g, events);
  return ok;
}

function view(room, uid) {
  const g = room.g;
  const base = {
    phase: g.phase, round: g.round, seq: g.seq || 0, events: g.events || [],
    bots: g.bots, history: g.history, lastRanks: g.ranks
  };
  if (!g.order) return base;
  const n = g.order.length;
  return Object.assign(base, {
    order: g.order,
    seats: g.order.map((id, pos) => ({
      id, name: g.players[id].name, bot: g.players[id].bot, title: g.titles[id],
      count: (g.hands[id] || []).length, place: g.finished.indexOf(id) + 1, passed: !!g.passed[id]
    })),
    myHand: g.hands[uid] || null,
    turn: g.turn, trick: g.trick, lastPlayBy: g.lastPlayBy,
    revolution: g.revolution,
    revoltMine: g.phase === "revolt" && g.revoltHolder === uid,
    tax: (g.tax || []).map((t) => {
      const mine = t.top === uid || t.bottom === uid;
      return { top: t.top, bottom: t.bottom, count: t.count, done: !!t.back, gave: mine ? t.gave : null, back: mine ? t.back : null };
    }),
    finished: g.finished,
    newTitles: g.phase === "roundEnd" ? Object.fromEntries(g.ranks.map((id, pos) => [id, titleFor(pos, n)])) : null
  });
}

module.exports = { init, canJoin, act, tick, view, _test: { parsePlay, botChoosePlay, titleFor } };
