const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const GAMES = { yang: require("./games/yang"), gold: require("./games/gold"), dalmuti: require("./games/dalmuti"), muffin: require("./games/muffin") };
const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(req.url.split("?")[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
/** code -> { room, clients: Set<ws> } */
const rooms = new Map();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let s;
  do {
    s = "";
    for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  } while (rooms.has(s));
  return s;
}
function cleanCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }
function cleanName(s) { return String(s || "").trim().slice(0, 12); }
function cleanUid(s) { return String(s || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 64); }

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function onlineMap(entry) {
  const m = {};
  entry.clients.forEach((ws) => { if (ws.readyState === 1 && ws.data.uid) m[ws.data.uid] = true; });
  return m;
}
function broadcast(code) {
  const entry = rooms.get(code);
  if (!entry) return;
  const r = entry.room, online = onlineMap(entry), game = GAMES[r.game];
  entry.clients.forEach((ws) => {
    send(ws, { type: "room", room: { code: r.code, game: r.game, hostId: r.hostId, members: r.members, online, g: game.view(r, ws.data.uid) } });
  });
}
function ctxFor(entry) {
  return { isOnline: (uid) => !!onlineMap(entry)[uid] };
}

function leave(ws) {
  const { code, uid } = ws.data || {};
  const entry = code && rooms.get(code);
  ws.data = { code: null, uid: null };
  if (!entry) return;
  entry.clients.delete(ws);
  const room = entry.room;
  const stillHere = [...entry.clients].some((c) => c.data.uid === uid);
  if (!stillHere && GAMES[room.game].canJoin(room)) {
    delete room.members[uid];
    if (room.hostId === uid) {
      const next = Object.entries(room.members).sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0];
      if (next) room.hostId = next[0];
    }
  }
  if (!Object.keys(room.members).length) { rooms.delete(code); return; }
  broadcast(code);
}

function handle(ws, msg) {
  if (msg.type === "create") {
    const game = GAMES[msg.game] ? msg.game : null;
    const name = cleanName(msg.name), uid = cleanUid(msg.uid);
    if (!game || !name || !uid) return;
    if (ws.data.code) leave(ws);
    const code = makeCode();
    const room = { code, game, hostId: uid, members: { [uid]: { name, joinedAt: Date.now() } }, createdAt: Date.now(), lastActive: Date.now() };
    room.g = GAMES[game].init(room);
    rooms.set(code, { room, clients: new Set([ws]) });
    ws.data = { code, uid };
    send(ws, { type: "joined", code });
    broadcast(code);
    return;
  }
  if (msg.type === "join") {
    const code = cleanCode(msg.code), name = cleanName(msg.name), uid = cleanUid(msg.uid);
    const entry = rooms.get(code);
    if (!entry) return send(ws, { type: "error", message: "존재하지 않는 방 코드예요. 코드를 다시 확인해주세요.", code: "no_room" });
    if (!name || !uid) return;
    const room = entry.room;
    if (!room.members[uid] && !GAMES[room.game].canJoin(room)) {
      return send(ws, { type: "error", message: "이미 게임이 시작된 방이에요. 다음 판을 기다려주세요.", code: "started" });
    }
    if (ws.data.code && ws.data.code !== code) leave(ws);
    if (!room.members[uid]) room.members[uid] = { name, joinedAt: Date.now() };
    else room.members[uid].name = name;
    entry.clients.add(ws);
    ws.data = { code, uid };
    room.lastActive = Date.now();
    send(ws, { type: "joined", code });
    broadcast(code);
    return;
  }
  if (msg.type === "leave") { leave(ws); return; }
  if (msg.type === "act") {
    const entry = ws.data.code && rooms.get(ws.data.code);
    if (!entry) return send(ws, { type: "error", message: "방 연결이 끊겼어요. 로비로 돌아가 다시 참가해주세요.", code: "no_room" });
    entry.room.lastActive = Date.now();
    if (GAMES[entry.room.game].act(entry.room, ws.data.uid, msg, ctxFor(entry))) broadcast(ws.data.code);
  }
}

wss.on("connection", (ws) => {
  ws.data = { code: null, uid: null };
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    try { handle(ws, msg); } catch (e) { console.error(e); send(ws, { type: "error", message: "처리 중 오류가 발생했어요." }); }
  });
  ws.on("close", () => {
    const { code } = ws.data || {};
    const entry = code && rooms.get(code);
    if (entry) { entry.clients.delete(ws); broadcast(code); }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of rooms) {
    if (GAMES[entry.room.game].tick(entry.room, ctxFor(entry))) broadcast(code);
    if (entry.clients.size === 0 && now - entry.room.lastActive > 2 * 60 * 60 * 1000) rooms.delete(code);
  }
}, 250);

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

server.listen(PORT, () => console.log("파티 게임방 서버가 " + PORT + " 포트에서 실행 중"));
