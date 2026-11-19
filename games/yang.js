function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function memberIds(room) {
  return Object.entries(room.members).sort((a, b) => a[1].joinedAt - b[1].joinedAt).map(([id]) => id);
}

function init() {
  return { phase: "lobby", roster: {}, writerTargets: {}, words: {}, submissions: {}, order: [], turnIndex: 0, finished: [], roundSeconds: 30, round: null };
}
function canJoin(room) { return room.g.phase === "lobby"; }

function newRound(g, askerId) {
  return {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    askerId, mode: null, prompt: "",
    deadline: Date.now() + g.roundSeconds * 1000,
    votes: {}, result: null, resultUntil: null
  };
}
function voters(g) { return Object.keys(g.roster).filter((id) => id !== g.round.askerId); }

function resolveRound(g) {
  const r = g.round;
  if (!r || r.result) return;
  const votes = Object.values(r.votes);
  const count = (v) => votes.filter((x) => x === v).length;
  const correct = r.mode === "guess" && count("correct") > count("wrong");
  const text = r.mode === "guess"
    ? (correct ? "모두가 정답이라고 했어요!" : "오답이에요.")
    : `응 ${count("yes")} · 아니 ${count("no")} · 애매 ${count("maybe")}`;
  r.result = { correct, text };
  r.resultUntil = Date.now() + 2200;
}

function advance(g, removeId) {
  const order = g.order.slice();
  let idx = g.turnIndex;
  if (removeId) {
    const at = order.indexOf(removeId);
    if (at >= 0) order.splice(at, 1);
    g.finished.push(removeId);
    if (!order.length) { g.phase = "ended"; g.order = order; g.round = null; return; }
    if (idx >= order.length) idx = 0;
  } else {
    idx = (idx + 1) % order.length;
  }
  g.order = order;
  g.turnIndex = idx;
  g.round = newRound(g, order[idx]);
}

function act(room, uid, msg) {
  const g = room.g;
  switch (msg.a) {
    case "startWriting": {
      if (room.hostId !== uid || g.phase !== "lobby") return false;
      const ids = memberIds(room);
      if (ids.length < 2) return false;
      const circle = shuffle(ids);
      g.writerTargets = {};
      circle.forEach((id, i) => { g.writerTargets[id] = circle[(i + 1) % circle.length]; });
      g.roster = Object.fromEntries(ids.map((id) => [id, room.members[id].name]));
      g.words = {}; g.submissions = {};
      g.roundSeconds = [15, 30, 45, 60].includes(msg.seconds) ? msg.seconds : 30;
      g.phase = "writing";
      return true;
    }
    case "submitWord": {
      if (g.phase !== "writing") return false;
      const word = String(msg.word || "").trim().slice(0, 16);
      const target = g.writerTargets[uid];
      if (!word || !target) return false;
      g.words[target] = word;
      g.submissions[uid] = true;
      const ids = Object.keys(g.roster);
      if (ids.every((id) => g.submissions[id])) {
        g.order = shuffle(ids);
        g.turnIndex = 0;
        g.finished = [];
        g.phase = "playing";
        g.round = newRound(g, g.order[0]);
      }
      return true;
    }
    case "ask": {
      const r = g.round;
      if (g.phase !== "playing" || !r || r.askerId !== uid || r.mode) return false;
      const prompt = String(msg.prompt || "").trim().slice(0, 60);
      if (!prompt) return false;
      r.mode = msg.mode === "guess" ? "guess" : "question";
      r.prompt = prompt;
      r.deadline = Date.now() + g.roundSeconds * 1000;
      r.votes = {};
      return true;
    }
    case "vote": {
      const r = g.round;
      if (g.phase !== "playing" || !r || !r.mode || r.result || r.askerId === uid || !g.roster[uid]) return false;
      const allowed = r.mode === "guess" ? ["correct", "wrong"] : ["yes", "no", "maybe"];
      if (!allowed.includes(msg.value)) return false;
      r.votes[uid] = msg.value;
      if (voters(g).every((id) => r.votes[id] !== undefined)) resolveRound(g);
      return true;
    }
    case "restart": {
      if (room.hostId !== uid || g.phase !== "ended") return false;
      const seconds = g.roundSeconds;
      room.g = init();
      room.g.roundSeconds = seconds;
      return true;
    }
  }
  return false;
}

function tick(room) {
  const g = room.g;
  if (g.phase !== "playing" || !g.round) return false;
  const r = g.round, now = Date.now();
  if (r.result) {
    if (now >= r.resultUntil) { advance(g, r.result.correct ? r.askerId : null); return true; }
  } else if (!r.mode) {
    if (now >= r.deadline) { advance(g, null); return true; }
  } else if (now >= r.deadline || voters(g).every((id) => r.votes[id] !== undefined)) {
    resolveRound(g);
    return true;
  }
  return false;
}

function view(room, uid) {
  const g = room.g;
  const words = {};
  if (g.phase === "playing" || g.phase === "ended") {
    for (const id of Object.keys(g.words)) {
      if (id !== uid || g.finished.includes(id) || g.phase === "ended") words[id] = g.words[id];
    }
  }
  return {
    phase: g.phase, roster: g.roster, roundSeconds: g.roundSeconds, order: g.order, turnIndex: g.turnIndex,
    finished: g.finished, round: g.round, submissions: g.submissions, myTarget: g.writerTargets[uid] || null, words
  };
}

module.exports = { init, canJoin, act, tick, view };
