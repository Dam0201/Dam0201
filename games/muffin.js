const CARDS = require("../public/muffin-cards.js");
const DEF = Object.fromEntries(CARDS.map((c) => [c.k, c]));

const WINDOW_MS = 6000;   // 카운터를 낼 수 있는 시간
const SHOW_MS = 900;      // 아무도 카운터가 없을 때 카드를 보여주는 시간
const SUB_MS = 20000;     // 고르기·가위바위보·투표 제한 시간
const REACT_MS = 6000;    // 번개 반응: 신호 뒤 기다리는 시간
const MAX_PLAYERS = 8;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function newDeck() {
  const tag = Math.random().toString(36).slice(2, 6);
  const d = [];
  let n = 0;
  CARDS.forEach((c) => { for (let i = 0; i < c.count; i++) d.push({ id: tag + (n++), k: c.k }); });
  return shuffle(d);
}
function randomTake(hand, n) {
  const out = [];
  while (out.length < n && hand.length) out.push(hand.splice(Math.floor(Math.random() * hand.length), 1)[0]);
  return out;
}

function init() { return { phase: "lobby", dir: 1, seq: 0 }; }
function canJoin(room) { return room.g.phase === "lobby" || room.g.phase === "end"; }

// ---------- 기록 · 이벤트 ----------
function nm(g, u) { return (g.names && g.names[u]) || "누군가"; }
function log(g, text) { g.log.push(text); if (g.log.length > 14) g.log.shift(); }
function ev(g, e) { (g._ev = g._ev || []).push(e); }
function flush(g) { g.seq = (g.seq || 0) + 1; g.events = g._ev || []; g._ev = []; }

// ---------- 순서 ----------
function nextOf(g, u) { const n = g.players.length, i = g.players.indexOf(u); return g.players[(i + g.dir + n) % n]; }
function prevOf(g, u) { const n = g.players.length, i = g.players.indexOf(u); return g.players[(i - g.dir + n) % n]; }

function start(room) {
  const old = room.g;
  const ids = [room.hostId].concat(Object.entries(room.members).filter(([id]) => id !== room.hostId)
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt).map(([id]) => id)).filter((id) => room.members[id]);
  const g = room.g = {
    phase: "play", dir: old.dir || 1, seq: old.seq || 0, hostId: room.hostId,
    players: ids, names: Object.fromEntries(ids.map((id) => [id, room.members[id].name])),
    hands: {}, traps: {}, deck: newDeck(), discard: [], target: 10,
    locks: {}, altWin: null, skips: {}, pending: null, sub: null, lastAction: null,
    log: [], winner: null, nextOverride: null, prot: {}, _ev: []
  };
  ids.forEach((id) => { g.hands[id] = []; g.traps[id] = []; drawCards(g, id, 3); });
  log(g, nm(g, ids[0]) + "님(게임을 하자고 한 사람)부터 " + (g.dir === 1 ? "시계 방향" : "반시계 방향") + "으로 시작해요.");
  ev(g, { k: "start" });
  beginTurn(g, ids[0], 0);
}

function win(g, u, reason) {
  g.phase = "end";
  g.winner = { uid: u, reason };
  g.pending = null;
  g.sub = null;
  log(g, nm(g, u) + "님 승리! " + reason);
  ev(g, { k: "win", by: u });
}

function beginTurn(g, u, guard) {
  if (g.phase !== "play") return;
  ["noCounter", "noAction", "noWin"].forEach((k) => { if (g.locks[k] === u) delete g.locks[k]; });
  g.turn = { uid: u, trapSet: false, actionsLeft: 1, acted: false };
  if (g.altWin && g.altWin.owner === u && !g.locks.noWin) {
    const counts = g.players.map((p) => g.hands[p].length);
    const best = g.altWin.type === "fewest" ? Math.min(...counts) : Math.max(...counts);
    const winners = g.players.filter((p) => g.hands[p].length === best);
    if (winners.length === 1) return win(g, winners[0], g.altWin.type === "fewest" ? "손패가 가장 적어요!" : "손패가 가장 많아요!");
    log(g, "승리 조건 동점! 한 바퀴 더 가요.");
  }
  if (g.skips[u] > 0 && guard < g.players.length * 2) {
    g.skips[u]--;
    log(g, nm(g, u) + "님은 이번 차례를 쉬어요.");
    return beginTurn(g, nextOf(g, u), guard + 1);
  }
  if (!g.locks.noWin && g.hands[u].length === g.target) return win(g, u, "차례를 시작할 때 손패가 딱 " + g.target + "장!");
  ev(g, { k: "turn", by: u });
}
function endTurn(g) {
  if (g.phase !== "play") return;
  const next = g.nextOverride && g.players.includes(g.nextOverride) ? g.nextOverride : nextOf(g, g.turn.uid);
  g.nextOverride = null;
  beginTurn(g, next, 0);
}
function after(g) {
  if (g.phase !== "play" || g.pending || g.sub) return;
  if (g.turn.actionsLeft <= 0) endTurn(g);
}

// ---------- 카드 이동 ----------
function hasTrap(g, u, k) { return (g.traps[u] || []).some((c) => c.k === k); }
function revealTrap(g, u, k, msg) {
  const i = g.traps[u].findIndex((c) => c.k === k);
  if (i < 0) return;
  g.discard.push(g.traps[u].splice(i, 1)[0]);
  log(g, nm(g, u) + "님의 함정 「" + DEF[k].name + "」 발동! " + msg);
  ev(g, { k: "trap", by: u, card: k });
}
function takeFromHand(g, u, id) {
  const h = g.hands[u], i = h.findIndex((c) => c.id === id);
  return i < 0 ? null : h.splice(i, 1)[0];
}
function drawCards(g, u, n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!g.deck.length) {
      if (!g.discard.length) break;
      g.deck = shuffle(g.discard);
      g.discard = [];
    }
    const c = g.deck.pop();
    if (c.k === "banana") {
      g.discard.push(c);
      log(g, nm(g, u) + "님이 지훈이 흘린 바나나를 밟았어요! 3장을 버려요.");
      ev(g, { k: "banana", by: u });
      discardFrom(g, u, 3, null);
      continue;
    }
    g.hands[u].push(c);
    got.push(c);
  }
  if (got.length) { ev(g, { k: "draw", by: u, n: got.length }); log(g, nm(g, u) + "님이 " + got.length + "장 뽑았어요."); }
  return got;
}
function checkEmpty(g, u) {
  if (g.phase !== "play" || g.hands[u].length) return;
  if (hasTrap(g, u, "tEmptyRefill")) {
    revealTrap(g, u, "tEmptyRefill", "카드를 10장 뽑아요!");
    drawCards(g, u, 10);
  } else if (hasTrap(g, u, "tEmptyRob")) {
    const rich = g.players.filter((p) => p !== u).sort((a, b) => g.hands[b].length - g.hands[a].length)[0];
    if (rich && g.hands[rich].length) {
      revealTrap(g, u, "tEmptyRob", nm(g, rich) + "님의 카드를 모두 빼앗아요!");
      g.hands[u].push(...g.hands[rich].splice(0));
    }
  }
}
function discardFrom(g, u, n, cause) {
  if (n <= 0 || !g.hands[u].length) return [];
  if (g.prot[u]) { log(g, nm(g, u) + "님은 꽉 잡고 안 버렸어요!"); return []; }
  const out = randomTake(g.hands[u], Math.min(n, g.hands[u].length));
  const sc = g.players.find((p) => p !== u && hasTrap(g, p, "tScavenge"));
  if (sc) {
    revealTrap(g, sc, "tScavenge", nm(g, u) + "님이 버린 카드 " + out.length + "장을 주워 먹었어요!");
    g.hands[sc].push(...out);
  } else g.discard.push(...out);
  ev(g, { k: "discard", by: u, n: out.length });
  log(g, nm(g, u) + "님이 " + out.length + "장을 버렸어요.");
  if (cause && cause !== u && hasTrap(g, u, "tGrudge") && !g._grudge) {
    revealTrap(g, u, "tGrudge", nm(g, cause) + "님도 " + out.length + "장을 버려요!");
    g._grudge = true;
    discardFrom(g, cause, out.length, null);
    g._grudge = false;
  }
  checkEmpty(g, u);
  return out;
}
function stealFrom(g, from, to, n, pickId) {
  if (from === to || n <= 0 || !g.hands[from].length) return [];
  if (g.prot[from]) { log(g, nm(g, from) + "님은 철벽 방어!"); return []; }
  let out;
  if (pickId) { const c = takeFromHand(g, from, pickId); out = c ? [c] : []; }
  else out = randomTake(g.hands[from], Math.min(n, g.hands[from].length));
  g.hands[to].push(...out);
  ev(g, { k: "steal", by: to, from, n: out.length });
  if (out.length) log(g, nm(g, to) + "님이 " + nm(g, from) + "님에게서 " + out.length + "장을 빼앗았어요.");
  if (out.length && hasTrap(g, from, "tThorns") && !g._thorns) {
    revealTrap(g, from, "tThorns", nm(g, to) + "님에게서 3장을 도로 빼앗아요!");
    g._thorns = true;
    stealFrom(g, to, from, 3, null);
    g._thorns = false;
  }
  checkEmpty(g, from);
  return out;
}

// ---------- 카운터 ----------
function victimsOf(g, p) {
  if (p.type === "trap") return { kind: DEF[p.card.k].effect.do, list: p.targets };
  if (p.type !== "action") return { kind: null, list: [] };
  const d = DEF[p.k], tags = d.tags || [];
  const kind = tags.includes("steal") ? "steal" : tags.includes("discard") ? "discard" : null;
  let list = [];
  if (d.hit === "target") list = p.targets;
  else if (d.hit === "others") list = g.players.filter((x) => x !== p.by);
  else if (d.hit === "all") list = g.players;
  else if (d.hit === "host") list = [g.hostId];
  else if (d.hit === "donut") list = g.players.filter((x) => x !== p.by && g.hands[x].some((c) => c.k === "myDonut"));
  else if (d.hit === "second") list = p.targets.slice(1, 2);
  return { kind, list };
}
function countersFor(g, u) {
  const p = g.pending;
  if (!p || !p.window || g.locks.noCounter || !g.hands[u]) return [];
  const top = p.stack.length ? p.stack[p.stack.length - 1] : null;
  if (u === (top ? top.by : p.by)) return [];
  const vic = victimsOf(g, p);
  const already = (k) => p.stack.some((s) => s.by === u && s.card.k === k);
  const isAction = p.type === "action";
  return g.hands[u].filter((c) => {
    switch (c.k) {
      case "cNope": return top ? true : p.type !== "draw";
      case "cMine": case "cBack": case "cReturn": case "cMirror": return isAction && u !== p.by;
      case "cGhost": return isAction && u !== p.by && g.traps[u].length > 0;
      case "cDodge": return (isAction || p.type === "trap") && p.targets.includes(u) && g.players.length > 2 && !already("cDodge");
      case "cWall": return vic.kind === "steal" && vic.list.includes(u) && !already("cWall");
      case "cGrip": return vic.kind === "discard" && vic.list.includes(u) && !already("cGrip");
      case "cStopDraw": return u !== p.by && (p.type === "draw" || (isAction && (DEF[p.k].tags || []).includes("draw")));
      default: return false;
    }
  }).map((c) => c.id);
}
function openWindow(g, quickIfNone) {
  const p = g.pending;
  p.window = { until: Infinity, eligible: [], passed: {} };
  const eligible = g.players.filter((u) => countersFor(g, u).length > 0);
  if (!eligible.length && quickIfNone) { resolvePending(g); return; }
  p.window = { until: Date.now() + (eligible.length ? WINDOW_MS : SHOW_MS), eligible, passed: {} };
}
function resolvePending(g) {
  const p = g.pending;
  g.pending = null;
  const st = p.stack, dead = {};
  let cancelled = false, dest = null, punish = null;
  for (let i = st.length - 1; i >= 0; i--) {
    if (dead[i]) continue;
    const c = st[i];
    if (c.on >= 0) { dead[c.on] = true; log(g, "「" + DEF[st[c.on].card.k].name + "」이(가) 무효가 됐어요."); continue; }
    switch (c.card.k) {
      case "cNope": case "cStopDraw": cancelled = true; break;
      case "cMine": cancelled = true; dest = c.by; break;
      case "cReturn": cancelled = true; dest = p.by; break;
      case "cBack": cancelled = true; punish = c.by; break;
      case "cGhost": cancelled = true; g.discard.push(...g.traps[c.by].splice(0)); break;
      case "cMirror": p.mirror = c.by; break;
      case "cDodge": p.targets = p.targets.map((t) => (t === c.by ? c.target : t)); break;
      case "cWall": case "cGrip": p.protect[c.by] = true; break;
    }
  }
  st.forEach((c) => g.discard.push(c.card));
  const label = p.type === "draw" ? "카드 뽑기" : "「" + DEF[(p.card || {}).k || p.k].name + "」";
  if (cancelled) {
    log(g, label + " 취소!");
    ev(g, { k: "cancel" });
    if (p.card) {
      if (dest) g.hands[dest].push(p.card);
      else g.discard.push(p.card);
    }
    if (punish) discardFrom(g, p.by, 3, punish);
  } else {
    if (p.mirror) {
      const orig = p.by;
      p.by = p.mirror;
      p.targets = p.targets.map((t) => (t === p.mirror ? orig : t));
      log(g, "거울 셀카 찰칵! 이제 " + nm(g, p.by) + "님이 쓴 걸로 쳐요.");
    }
    resolveBase(g, p);
  }
  after(g);
}

function resolveBase(g, p) {
  g.prot = p.protect || {};
  if (p.type === "draw") {
    drawCards(g, p.by, 1);
  } else if (p.type === "trap") {
    const e = DEF[p.card.k].effect, culprit = p.targets[0];
    if (e.do === "discard") discardFrom(g, culprit, e.n, p.by);
    else stealFrom(g, culprit, p.by, e.n, null);
    g.discard.push(p.card);
  } else {
    p.cardDest = "discard";
    applyAction(g, p);
    if (p.cardDest === "discard") g.discard.push(p.card);
    else if (p.cardDest === "deck") { g.deck.splice(Math.floor(Math.random() * (g.deck.length + 1)), 0, p.card); }
    else if (p.cardDest) g.hands[p.cardDest].push(p.card);
  }
  g.prot = {};
}

// ---------- 행동 효과 ----------
function applyAction(g, p) {
  const u = p.by, t = p.targets[0], P = g.players, H = g.hands;
  const others = P.filter((x) => x !== u);
  switch (p.k) {
    case "feast": drawCards(g, u, 5); break;
    case "twoMore": drawCards(g, u, 2); others.forEach((x) => drawCards(g, x, 1)); break;
    case "shareDraw": drawCards(g, u, 3); drawCards(g, t, 3); break;
    case "dumpster": { const top = g.discard.splice(Math.max(0, g.discard.length - 3)); H[u].push(...top); log(g, nm(g, u) + "님이 버린 카드 " + top.length + "장을 주웠어요."); break; }
    case "peekTop":
      if (!g.deck.length) { g.deck = shuffle(g.discard); g.discard = []; }
      g.sub = { type: "pick", by: u, src: "deck", options: g.deck.slice(-5).map((c) => c.id), until: Date.now() + SUB_MS };
      break;
    case "treasureMap": {
      const got = drawCards(g, u, 3);
      if (got.some((c) => c.k === "treasureBox")) win(g, u, "잼민의 비상금 상자를 찾았어요!");
      break;
    }
    case "treasureBox": drawCards(g, u, 1); break;
    case "pick1": stealFrom(g, t, u, 1, null); break;
    case "pick2": stealFrom(g, t, u, 2, null); break;
    case "collect": others.forEach((x) => stealFrom(g, x, u, 1, null)); break;
    case "isangHand": p.targets.filter((x) => x !== u).forEach((x) => stealFrom(g, x, u, 1, null)); break;
    case "xray": g.sub = { type: "pick", by: u, src: "hand", from: t, until: Date.now() + SUB_MS }; break;
    case "wantDonut": {
      const holder = others.find((x) => H[x].some((c) => c.k === "myDonut"));
      if (holder) stealFrom(g, holder, u, H[holder].length, null);
      else log(g, "아무도 '지누의 지갑'을 안 들고 있었어요.");
      break;
    }
    case "ringleader":
      if (g.hostId !== u && P.includes(g.hostId)) stealFrom(g, g.hostId, u, 3, null);
      else log(g, "방장이 바로 자기 자신이었어요…");
      break;
    case "blast": discardFrom(g, t, 3, u); break;
    case "wipe": discardFrom(g, t, H[t].length, u); break;
    case "quake": P.forEach((x) => discardFrom(g, x, 3, u)); break;
    case "flop": P.forEach((x) => discardFrom(g, x, 1, u)); break;
    case "onlyOne": P.forEach((x) => discardFrom(g, x, H[x].length - 1, u)); break;
    case "myDonut": discardFrom(g, u, 4, null); break;
    case "gift": {
      const give = (p.opts.cards || []).map((id) => takeFromHand(g, u, id)).filter(Boolean);
      H[t].push(...give);
      log(g, nm(g, u) + "님이 " + nm(g, t) + "님에게 카드 " + give.length + "장을 선물했어요.");
      checkEmpty(g, u);
      break;
    }
    case "hotPotato": p.cardDest = t; log(g, nm(g, t) + "님에게 폭탄이 넘어갔어요!"); break;
    case "swapHands": { const a = H[u]; H[u] = H[t]; H[t] = a; log(g, nm(g, u) + "님과 " + nm(g, t) + "님이 손패를 바꿨어요."); checkEmpty(g, u); checkEmpty(g, t); break; }
    case "shuffleAll": {
      const pool = shuffle(P.reduce((acc, x) => acc.concat(H[x].splice(0)), []));
      let x = u;
      pool.forEach((c) => { H[x].push(c); x = nextOf(g, x); });
      log(g, "모두의 손패를 섞어서 다시 나눴어요.");
      P.forEach((y) => checkEmpty(g, y));
      break;
    }
    case "trainBack": {
      const nh = {};
      P.forEach((x) => { nh[x] = H[prevOf(g, x)]; });
      g.hands = nh;
      log(g, "박쥐처럼 쓱! 모두 앞 사람 손패로 갈아탔어요.");
      P.forEach((y) => checkEmpty(g, y));
      break;
    }
    case "seven":
      P.forEach((x) => { const d = 7 - H[x].length; if (d > 0) drawCards(g, x, d); else if (d < 0) discardFrom(g, x, -d, u); });
      break;
    case "fresh": { const n = H[u].length; g.discard.push(...H[u].splice(0)); drawCards(g, u, n); break; }
    case "reverse": g.dir *= -1; log(g, "진행 방향이 " + (g.dir === 1 ? "시계" : "반시계") + " 방향으로 바뀌었어요."); break;
    case "skipOne": g.skips[t] = (g.skips[t] || 0) + 1; log(g, nm(g, t) + "님은 다음 차례를 쉬어요."); break;
    case "jump": g.nextOverride = t; log(g, "다음은 " + nm(g, t) + "님부터!"); break;
    case "double": g.turn.actionsLeft += 2; log(g, nm(g, u) + "님은 행동을 2번 더 할 수 있어요."); break;
    case "banana": p.cardDest = "deck"; log(g, "지훈이 카드 더미 어딘가에 바나나를 흘렸어요…"); break;
    case "nothing": log(g, "…아무 일도 일어나지 않았어요. 지훈은 다 계획이 있었대요."); break;
    case "fewestWins": case "mostWins":
      g.altWin = { type: p.k === "fewestWins" ? "fewest" : "most", owner: u };
      log(g, nm(g, u) + "님의 다음 차례에 손패가 가장 " + (p.k === "fewestWins" ? "적은" : "많은") + " 사람이 승리해요!");
      break;
    case "setGoal": g.target = p.opts.num; log(g, "이제 승리 장수는 " + g.target + "장이에요!"); break;
    case "hold": g.locks.noWin = u; log(g, nm(g, u) + "님의 다음 차례까지 아무도 승리할 수 없어요."); break;
    case "clearTraps": P.forEach((x) => g.discard.push(...g.traps[x].splice(0))); log(g, "설치된 함정을 싹 치웠어요."); break;
    case "exposeTraps": g.discard.push(...g.traps[t].splice(0)); log(g, nm(g, t) + "님의 함정을 모두 치웠어요."); break;
    case "stealTrap": { const tr = randomTake(g.traps[t], 1); H[u].push(...tr); log(g, nm(g, t) + "님의 함정을 하나 훔쳤어요."); break; }
    case "noCounter": g.locks.noCounter = u; log(g, nm(g, u) + "님의 다음 차례까지 카운터 금지!"); break;
    case "noAction": g.locks.noAction = u; log(g, nm(g, u) + "님의 다음 차례까지 행동 카드 금지!"); break;
    case "hats": p.targets.forEach((x) => drawCards(g, x, 3)); break;
    case "glasses": p.targets.forEach((x) => drawCards(g, x, 2)); break;
    case "catOwners": case "noDog": case "away": p.targets.forEach((x) => discardFrom(g, x, 2, u)); break;
    case "eldest": case "youngest": discardFrom(g, t, 3, u); break;
    case "tall": stealFrom(g, p.targets[1], p.targets[0], 3, null); break;
    case "birthday": win(g, u, "생일 축하해요!"); break;
    case "rps": g.sub = { type: "rps", a: u, b: t, picks: {}, round: 1, until: Date.now() + SUB_MS }; break;
    case "coin": {
      const heads = Math.random() < 0.5;
      log(g, "동전이 " + (heads ? "앞면" : "뒷면") + "! " + nm(g, u) + "님이 3장을 " + (heads ? "뽑아요." : "버려요."));
      ev(g, { k: "coin", by: u, heads });
      if (heads) drawCards(g, u, 3); else discardFrom(g, u, 3, null);
      break;
    }
    case "react": {
      const goAt = Date.now() + 1800 + Math.floor(Math.random() * 2600);
      g.sub = { type: "react", by: u, goAt, presses: {}, until: goAt + REACT_MS };
      break;
    }
    case "pointVote": g.sub = { type: "vote", by: u, votes: {}, until: Date.now() + SUB_MS }; break;
    case "duel": g.sub = { type: "duel", a: u, b: t, until: Date.now() + 90000 }; break;
    case "photo": log(g, "찰칵! 모두의 소중한 추억이 생겼어요."); ev(g, { k: "photo" }); break;
  }
}

// ---------- 미니게임 · 고르기 ----------
function finishSub(g) { g.sub = null; after(g); }
function resolveRps(g) {
  const s = g.sub, beats = { r: "s", s: "p", p: "r" }, names = { r: "바위", p: "보", s: "가위" };
  [s.a, s.b].forEach((x) => { if (!s.picks[x]) s.picks[x] = ["r", "p", "s"][Math.floor(Math.random() * 3)]; });
  const A = s.picks[s.a], B = s.picks[s.b];
  ev(g, { k: "rps", a: s.a, b: s.b, pa: A, pb: B });
  if (A === B) {
    log(g, "가위바위보 " + names[A] + " vs " + names[B] + ", 비겼어요!" + (s.round < 3 ? " 다시!" : " 승부 없음."));
    if (s.round < 3) { g.sub = { type: "rps", a: s.a, b: s.b, picks: {}, round: s.round + 1, until: Date.now() + SUB_MS, last: { pa: A, pb: B } }; return; }
    return finishSub(g);
  }
  const w = beats[A] === B ? s.a : s.b;
  log(g, "가위바위보 " + names[A] + " vs " + names[B] + "! " + nm(g, w) + "님이 이겨서 3장을 뽑아요.");
  drawCards(g, w, 3);
  finishSub(g);
}
function resolveReact(g) {
  const s = g.sub;
  const time = (x) => (s.presses[x] === undefined ? Infinity : s.presses[x] < 0 ? 1e9 : s.presses[x]);
  const worst = Math.max(...g.players.map(time));
  const losers = g.players.filter((x) => time(x) === worst);
  log(g, "번개 반응! 가장 늦은 " + losers.map((x) => nm(g, x)).join(", ") + "님이 3장을 버려요.");
  ev(g, { k: "reactDone", losers, presses: s.presses });
  g.sub = null;
  losers.forEach((x) => discardFrom(g, x, 3, s.by));
  after(g);
}
function resolveVote(g) {
  const s = g.sub, count = {};
  Object.values(s.votes).forEach((v) => { count[v] = (count[v] || 0) + 1; });
  const max = Math.max(0, ...Object.values(count));
  const losers = max ? Object.keys(count).filter((x) => count[x] === max) : [];
  log(g, losers.length ? "범인은 " + losers.map((x) => nm(g, x)).join(", ") + "님! (" + max + "표) 3장을 버려요." : "아무도 지목하지 않았어요.");
  ev(g, { k: "voteDone", losers });
  g.sub = null;
  losers.forEach((x) => discardFrom(g, x, 3, s.by));
  after(g);
}

// ---------- 입력 검사 ----------
function readTargets(g, uid, def, msg, playedId) {
  const P = g.players, tg = Array.isArray(msg.targets) ? msg.targets : [];
  switch (def.need) {
    case undefined: case "none": return [];
    case "one": return P.includes(tg[0]) && tg[0] !== uid ? [tg[0]] : null;
    case "pick1": return P.includes(tg[0]) ? [tg[0]] : null;
    case "many": { const s = [...new Set(tg)]; return s.every((x) => P.includes(x)) ? s : null; }
    case "two": return tg.length === 2 && tg[0] !== tg[1] && P.includes(tg[0]) && P.includes(tg[1]) ? [tg[0], tg[1]] : null;
    case "number": return Number.isInteger(msg.num) && msg.num >= 1 && msg.num <= 20 ? [] : null;
    case "trapOwner": return P.includes(tg[0]) && tg[0] !== uid && g.traps[tg[0]].length ? [tg[0]] : null;
    case "confirm": return msg.confirm === true ? [] : null;
    case "give2": {
      if (!(P.includes(tg[0]) && tg[0] !== uid)) return null;
      const avail = g.hands[uid].filter((c) => c.id !== playedId).map((c) => c.id);
      const cards = [...new Set(Array.isArray(msg.cards) ? msg.cards : [])];
      if (cards.length !== Math.min(2, avail.length) || !cards.every((id) => avail.includes(id))) return null;
      return [tg[0]];
    }
  }
  return null;
}

// ---------- 액션 ----------
function act(room, uid, msg, ctx) {
  const g = room.g;
  g._ev = [];
  const ok = doAct(room, g, uid, msg, ctx);
  if (ok) flush(room.g);
  return ok;
}
function doAct(room, g, uid, msg, ctx) {
  if (msg.a === "dir") {
    if (uid !== room.hostId || g.phase !== "lobby") return false;
    g.dir = msg.dir === -1 ? -1 : 1;
    return true;
  }
  if (msg.a === "start") {
    const n = Object.keys(room.members).length;
    if (uid !== room.hostId || !canJoin(room) || n < 2 || n > MAX_PLAYERS) return false;
    start(room);
    return true;
  }
  if (msg.a === "restart") {
    if (uid !== room.hostId || g.phase !== "end") return false;
    room.g = { phase: "lobby", dir: g.dir, seq: g.seq };
    return true;
  }
  if (g.phase !== "play" || !g.players.includes(uid)) return false;
  const t = g.turn, myTurn = t.uid === uid, free = !g.pending && !g.sub;

  switch (msg.a) {
    case "setTrap": {
      if (!myTurn || !free || t.trapSet || t.acted) return false;
      const c = (g.hands[uid].find((x) => x.id === msg.id) || {});
      if (!DEF[c.k] || DEF[c.k].type !== "trap") return false;
      g.traps[uid].push(takeFromHand(g, uid, msg.id));
      t.trapSet = true;
      log(g, nm(g, uid) + "님이 함정을 몰래 설치했어요.");
      ev(g, { k: "setTrap", by: uid });
      checkEmpty(g, uid);
      return true;
    }
    case "draw": {
      if (!myTurn || !free || t.actionsLeft <= 0) return false;
      t.actionsLeft--; t.acted = true;
      g.pending = { type: "draw", by: uid, targets: [], stack: [], protect: {} };
      openWindow(g, true);
      return true;
    }
    case "play": {
      if (!myTurn || !free || t.actionsLeft <= 0 || g.locks.noAction) return false;
      const c = g.hands[uid].find((x) => x.id === msg.id);
      if (!c || DEF[c.k].type !== "action") return false;
      let k = c.k;
      if (k === "copycat") { if (!g.lastAction) return false; k = g.lastAction; }
      const def = DEF[k];
      const targets = readTargets(g, uid, def, msg, c.id);
      if (!targets) return false;
      takeFromHand(g, uid, c.id);
      t.actionsLeft--; t.acted = true;
      g.lastAction = k;
      log(g, nm(g, uid) + "님이 「" + DEF[c.k].name + "」" + (c.k === "copycat" ? "(→「" + def.name + "」)" : "") + "을(를) 썼어요." + (targets.length ? " → " + targets.map((x) => nm(g, x)).join(", ") : ""));
      ev(g, { k: "play", by: uid, card: c.k, eff: k });
      const base = { type: "action", card: c, k, by: uid, targets, opts: { num: msg.num, cards: msg.cards }, stack: [], protect: {} };
      if (def.mini) { resolveBase(g, base); after(g); }
      else { g.pending = base; openWindow(g, false); }
      checkEmpty(g, uid);
      return true;
    }
    case "trigger": {
      if (!free) return false;
      const c = g.traps[uid].find((x) => x.id === msg.id);
      if (!c || DEF[c.k].trig !== "manual") return false;
      const culprit = msg.target;
      if (!g.players.includes(culprit) || culprit === uid) return false;
      g.traps[uid].splice(g.traps[uid].indexOf(c), 1);
      log(g, nm(g, uid) + "님의 함정 「" + DEF[c.k].name + "」! 걸린 사람: " + nm(g, culprit));
      ev(g, { k: "trap", by: uid, card: c.k, target: culprit });
      g.pending = { type: "trap", card: c, by: uid, targets: [culprit], stack: [], protect: {} };
      openWindow(g, false);
      return true;
    }
    case "counter": {
      const p = g.pending;
      if (!p || !countersFor(g, uid).includes(msg.id)) return false;
      const c = g.hands[uid].find((x) => x.id === msg.id);
      const entry = { card: c, by: uid, on: c.k === "cNope" && p.stack.length ? p.stack.length - 1 : -1 };
      if (c.k === "cDodge") {
        if (!g.players.includes(msg.target) || msg.target === uid) return false;
        entry.target = msg.target;
      }
      takeFromHand(g, uid, c.id);
      p.stack.push(entry);
      log(g, nm(g, uid) + "님의 카운터 「" + DEF[c.k].name + "」!" + (entry.target ? " → " + nm(g, entry.target) : ""));
      ev(g, { k: "counter", by: uid, card: c.k });
      openWindow(g, false);
      checkEmpty(g, uid);
      return true;
    }
    case "passCounter": {
      const p = g.pending;
      if (!p || !p.window || !p.window.eligible.includes(uid)) return false;
      p.window.passed[uid] = true;
      if (p.window.eligible.every((x) => p.window.passed[x])) resolvePending(g);
      return true;
    }
    case "sub": {
      const s = g.sub;
      if (!s) return false;
      if (s.type === "pick" && s.by === uid) {
        if (s.src === "deck") {
          if (!s.options.includes(msg.id)) return false;
          const i = g.deck.findIndex((c) => c.id === msg.id);
          if (i >= 0) g.hands[uid].push(g.deck.splice(i, 1)[0]);
          log(g, nm(g, uid) + "님이 미리보기로 카드 1장을 골랐어요.");
        } else {
          if (!g.hands[s.from].some((c) => c.id === msg.id)) return false;
          stealFrom(g, s.from, uid, 1, msg.id);
          log(g, nm(g, uid) + "님이 " + nm(g, s.from) + "님의 손패를 보고 1장을 골라 갔어요.");
        }
        finishSub(g);
        return true;
      }
      if (s.type === "rps" && (uid === s.a || uid === s.b) && ["r", "p", "s"].includes(msg.hand) && !s.picks[uid]) {
        s.picks[uid] = msg.hand;
        if (s.picks[s.a] && s.picks[s.b]) resolveRps(g);
        return true;
      }
      if (s.type === "react" && s.presses[uid] === undefined) {
        const now = Date.now();
        s.presses[uid] = now < s.goAt ? -1 : now - s.goAt;
        if (g.players.every((x) => s.presses[x] !== undefined)) resolveReact(g);
        return true;
      }
      if (s.type === "vote" && s.votes[uid] === undefined && g.players.includes(msg.target) && msg.target !== uid) {
        s.votes[uid] = msg.target;
        if (g.players.every((x) => s.votes[x] !== undefined)) resolveVote(g);
        return true;
      }
      if (s.type === "duel" && uid === s.a && [s.a, s.b, "none"].includes(msg.winner)) {
        log(g, msg.winner === "none" ? "맞짱은 무승부!" : "맞짱 승자는 " + nm(g, msg.winner) + "님! 3장을 뽑아요.");
        if (msg.winner !== "none") drawCards(g, msg.winner, 3);
        finishSub(g);
        return true;
      }
      return false;
    }
    case "skip": {
      const cur = t.uid;
      if (uid !== room.hostId || ctx.isOnline(cur) || g.pending) return false;
      log(g, nm(g, cur) + "님이 자리를 비워서 차례를 넘겼어요.");
      if (g.sub) g.sub = null;
      t.actionsLeft = 0;
      endTurn(g);
      return true;
    }
  }
  return false;
}

function tick(room) {
  const g = room.g;
  if (g.phase !== "play") return false;
  g._ev = [];
  const now = Date.now();
  let changed = false;
  if (g.pending && g.pending.window && now >= g.pending.window.until) { resolvePending(g); changed = true; }
  else if (g.sub && now >= g.sub.until) {
    const s = g.sub;
    changed = true;
    if (s.type === "pick") {
      const opts = s.src === "deck" ? s.options : g.hands[s.from].map((c) => c.id);
      if (opts.length) doAct(room, g, s.by, { a: "sub", id: opts[Math.floor(Math.random() * opts.length)] }, { isOnline: () => true });
      else finishSub(g);
    } else if (s.type === "rps") resolveRps(g);
    else if (s.type === "react") resolveReact(g);
    else if (s.type === "vote") resolveVote(g);
    else { log(g, "맞짱 결과가 안 나와서 그냥 넘어가요."); finishSub(g); }
  }
  if (changed) flush(g);
  return changed;
}

function cardList(cards) { return cards.map((c) => ({ id: c.id, k: c.k })); }
function view(room, uid) {
  const g = room.g;
  if (g.phase === "lobby") return { phase: "lobby", dir: g.dir || 1, seq: g.seq || 0, events: [] };
  const p = g.pending, s = g.sub;
  let sub = null;
  if (s) {
    sub = { type: s.type, until: s.until, by: s.by, a: s.a, b: s.b, round: s.round, last: s.last };
    if (s.type === "pick" && s.by === uid) {
      sub.options = s.src === "deck"
        ? g.deck.filter((c) => s.options.includes(c.id)).map((c) => ({ id: c.id, k: c.k }))
        : cardList(g.hands[s.from] || []);
      sub.from = s.from;
    }
    if (s.type === "pick") sub.src = s.src;
    if (s.type === "rps") { sub.myPick = s.picks[uid] || null; sub.done = Object.keys(s.picks); }
    if (s.type === "react") { sub.goAt = s.goAt; sub.pressed = Object.keys(s.presses); sub.mine = s.presses[uid]; }
    if (s.type === "vote") { sub.voted = Object.keys(s.votes); sub.mine = s.votes[uid] || null; }
  }
  return {
    phase: g.phase, seq: g.seq, events: g.events || [], serverNow: Date.now(),
    players: g.players.map((x) => ({ uid: x, name: g.names[x], count: (g.hands[x] || []).length, traps: (g.traps[x] || []).length, skips: g.skips[x] || 0 })),
    hostId: g.hostId,
    myHand: cardList(g.hands[uid] || []), myTraps: cardList(g.traps[uid] || []),
    deckCount: g.deck.length, discardTop: g.discard.length ? g.discard[g.discard.length - 1].k : null,
    turn: g.turn, dir: g.dir, target: g.target, locks: g.locks, altWin: g.altWin, lastAction: g.lastAction,
    log: g.log, winner: g.winner,
    pending: p ? {
      type: p.type, k: p.k || (p.card && p.card.k) || null, card: p.card ? p.card.k : null, by: p.by, targets: p.targets,
      stack: p.stack.map((c) => ({ k: c.card.k, by: c.by, target: c.target || null })),
      until: p.window ? p.window.until : 0, eligibleCount: p.window ? p.window.eligible.length : 0,
      myCounters: countersFor(g, uid), passed: !!(p.window && p.window.passed[uid])
    } : null,
    sub
  };
}

module.exports = { init, canJoin, act, tick, view, _test: { DEF, countersFor } };
