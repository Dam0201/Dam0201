window.Games = window.Games || {};
window.Games.gold = (function () {
  "use strict";
  var SIZE = 5;
  var ROCK = { 1: { name: "돌", cls: "v1" }, 2: { name: "구리", cls: "v2" }, 3: { name: "은", cls: "v3" }, 4: { name: "금", cls: "v4" } };
  var PICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21 L16 10" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M6 8 C10 3.5 17 4 21 9 C16 7 12.5 8 10.5 10.5 Z" stroke-width="1" stroke-linejoin="round"/></svg>';
  function pickArt(head, handle, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 64 64" aria-hidden="true"><rect x="29" y="16" width="6" height="46" rx="3" fill="' + handle + '" stroke="#4a2e17" stroke-width="1.6"/>'
      + '<path d="M4 27 C14 8 50 8 60 27 C52 19 41 16 32 16 C23 16 12 19 4 27 Z" fill="' + head + '" stroke="#262a30" stroke-width="2.2" stroke-linejoin="round"/>'
      + '<rect x="26.5" y="11.5" width="11" height="9" rx="2" fill="#6b7078" stroke="#262a30" stroke-width="1.6"/></svg>';
  }
  var PICK_BIG = pickArt("#d5dbe1", "#9a6434");
  var ART = {
    pick: pickArt("#d5dbe1", "#9a6434", "art-pick"),
    goldPick: pickArt("#ffe27a", "#c98a12", "art-pick"),
    drill: '<svg class="art-drill" viewBox="0 0 64 64" aria-hidden="true">'
      + '<rect x="12" y="5" width="30" height="22" rx="6" fill="#e3a72f" stroke="#2a1b10" stroke-width="2"/>'
      + '<rect x="42" y="11" width="12" height="9" rx="2.5" fill="#3b3f46" stroke="#2a1b10" stroke-width="2"/>'
      + '<rect x="18" y="12" width="14" height="5" rx="2" fill="#fff4cf" opacity=".6"/>'
      + '<rect x="20" y="27" width="14" height="12" rx="3" fill="#3b3f46" stroke="#2a1b10" stroke-width="2"/>'
      + '<path d="M20 39 L34 39 L27 61 Z" fill="#c9d0d7" stroke="#2a1b10" stroke-width="2" stroke-linejoin="round"/>'
      + '<path d="M21.5 44 L33 42 M23 49 L31.5 47 M24.5 54 L30 52.5" stroke="#2a1b10" stroke-width="1.7" stroke-linecap="round"/></svg>',
    bomb: '<svg class="art-bomb" viewBox="0 0 64 64" aria-hidden="true">'
      + '<circle cx="27" cy="39" r="18" fill="#2b2f35" stroke="#111" stroke-width="2"/>'
      + '<rect x="33" y="15" width="11" height="9" rx="2" transform="rotate(38 38.5 19.5)" fill="#6b7078" stroke="#111" stroke-width="2"/>'
      + '<path d="M42 15 C46 9 50 10 52 5" fill="none" stroke="#9a6434" stroke-width="2.6" stroke-linecap="round"/>'
      + '<path d="M53 0 L55 4.5 L60 4.5 L56.2 7.4 L57.8 12 L53.2 9.4 L49 12 L50.4 7.4 L46.6 4.5 L51.5 4.5 Z" fill="#ffb02e" stroke="#c4460f" stroke-width="1"/>'
      + '<circle cx="20" cy="32" r="4.5" fill="#fff" opacity=".22"/></svg>'
  };

  var root, api, room, g, $ = {}, built = false, prevSeq = null, freshCard = false, endShown = false;
  var ui = { dir: "row" };
  var cursorEl = null, cursorVisible = false;

  function esc(s) { return api.esc(s); }
  function q(id) { return document.getElementById(id); }

  function mount(container, a) {
    root = container; api = a; built = false; prevSeq = null; endShown = false;
    root.innerHTML = '<div class="gold">'
      + '<section id="g-lobby" class="lobbyp panel" hidden></section>'
      + '<section id="g-play" class="game" hidden>'
      + '<div class="score"><div id="g-players" class="players"></div><div class="remain" id="g-remain"></div></div>'
      + '<div class="boardwrap"><div class="frame" id="g-frame"><div class="cap"><span>THE MINE</span><span id="g-cap"></span></div>'
      + '<div class="shaft" id="g-shaft"><div id="g-grid" class="grid"></div><div id="g-toast" class="toast" aria-live="polite"></div></div></div>'
      + '<div class="legend">'
      + '<span><i style="background:var(--l1)"></i>1층 · 1번 · 돌·구리</span><span><i style="background:var(--l2)"></i>2층 · 2번 · 전부</span><span><i style="background:var(--l3)"></i>3층 · 3번 · 구리~금</span>'
      + '<span class="v"><i style="background:var(--stone)"></i>돌 1</span><span class="v"><i style="background:var(--copper)"></i>구리 2</span>'
      + '<span class="v"><i style="background:var(--silver)"></i>은 3</span><span class="v"><i style="background:var(--gold)"></i>금 4</span></div></div>'
      + '<div class="side panel"><div id="g-panel"></div></div>'
      + '</section>'
      + '<section id="g-end" class="end panel" hidden></section>'
      + '</div>';
    ["g-lobby", "g-play", "g-end", "g-players", "g-remain", "g-frame", "g-cap", "g-shaft", "g-grid", "g-toast", "g-panel"].forEach(function (id) { $[id] = q(id); });

    cursorEl = document.createElement("div");
    cursorEl.className = "pick-cursor";
    cursorEl.hidden = true;
    cursorEl.innerHTML = PICK_BIG;
    document.body.appendChild(cursorEl);

    $["g-frame"].addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !armed()) { hideCursor(); return; }
      cursorVisible = true;
      cursorEl.hidden = false;
      cursorEl.style.transform = "translate(" + (e.clientX + 8) + "px," + (e.clientY - 42) + "px)";
    });
    $["g-frame"].addEventListener("pointerleave", hideCursor);
    $["g-grid"].addEventListener("click", onCellClick);
    $["g-grid"].addEventListener("mouseover", function (e) { var c = e.target.closest(".cell"); if (c) preview(+c.getAttribute("data-i")); });
    $["g-grid"].addEventListener("mouseleave", clearPreview);
    $["g-panel"].addEventListener("click", onPanelClick);
    $["g-lobby"].addEventListener("click", function (e) { if (e.target.closest("[data-act=start]")) { api.sfx.play("pop"); api.act("start"); } });
    $["g-end"].addEventListener("click", function (e) { if (e.target.closest("[data-act=restart]")) { api.sfx.play("pop"); api.act("restart"); } });
  }
  function unmount() { if (cursorEl) cursorEl.remove(); cursorEl = null; cursorVisible = false; }
  function hideCursor() { cursorVisible = false; if (cursorEl) cursorEl.hidden = true; }

  function me() { return g.players ? g.players[g.cur] : null; }
  function myTurn() { return g.phase === "play" && me() && me().uid === api.uid; }
  function armed() { return myTurn() && g.step === "mine"; }
  function nameOf(uid) {
    var p = (g.players || []).find(function (x) { return x.uid === uid; });
    return p ? p.name : (room.members[uid] ? room.members[uid].name : "누군가");
  }
  function total(p) { return p.rocks.reduce(function (a, b) { return a + b; }, 0); }

  function update(r) {
    room = r; g = r.g;
    var evs = null;
    if (prevSeq === null) prevSeq = g.seq || 0;
    else if ((g.seq || 0) > prevSeq) { evs = g.events || []; prevSeq = g.seq; }
    if (evs && evs.some(function (e) { return e.k === "draw"; })) freshCard = true;

    $["g-lobby"].hidden = g.phase !== "lobby";
    $["g-play"].hidden = g.phase !== "play";
    $["g-end"].hidden = g.phase !== "end";
    if (g.phase !== "end") endShown = false;

    if (g.phase === "lobby") renderLobby();
    else if (g.phase === "play") renderPlay();
    else renderEnd();
    freshCard = false;
    if (evs) playEvents(evs);
  }

  // ---------- lobby ----------
  function renderLobby() {
    var ms = Object.keys(room.members).map(function (id) { return { id: id, name: room.members[id].name, at: room.members[id].joinedAt }; })
      .sort(function (a, b) { return a.at - b.at; });
    var host = api.isHost();
    $["g-lobby"].innerHTML = '<h2>광부를 모으는 중</h2><p class="muted">위의 <b>링크 복사</b>로 친구를 부르세요. 2~6명이 함께 캐요.</p>'
      + '<ul class="mlist">' + ms.map(function (p) {
        return '<li><i class="dot' + (room.online[p.id] ? " on" : "") + '"></i>' + esc(p.name) + (p.id === api.uid ? ' <span class="muted">(나)</span>' : "") + (p.id === room.hostId ? '<b class="hostb">HOST</b>' : "") + '</li>';
      }).join("") + '</ul>'
      + (host ? '<button class="btn block" type="button" data-act="start"' + (ms.length < 2 ? " disabled" : "") + '>' + (ms.length < 2 ? "최소 2명 필요" : "채굴 시작 →") + '</button>'
        : '<p class="waitline">호스트가 시작하면 바로 광산으로 들어가요.</p>')
      + '<ul class="rules">'
      + '<li>내 차례에 채굴 카드를 뽑고, 적힌 대로 광산을 캐요.</li>'
      + '<li>5×5칸, 3층 구조예요. 위층이 깨져야 그 칸의 아래층을 캘 수 있어요. 1층 1번, 2층 2번, 3층 3번 맞으면 깨져요.</li>'
      + '<li>카드: 1·2·3회 채굴, 1줄 채굴(가로/세로 한 줄), 드릴(한 칸에 3번), 폭약(십자 5칸). 아주 가끔, 한 판에 딱 한 번 <b>골드러쉬</b>(10번 채굴)가 나와요!</li>'
      + '<li>깬 바위는 내 것! 돌 1 · 구리 2 · 은 3 · 금 4 골드. 바위가 전부 깨지면 골드가 가장 많은 사람이 우승해요.</li>'
      + '<li>깊이 팔수록 좋은 광물이 나와요. 1층엔 돌·구리뿐이고, 맨 아래 3층엔 돌이 없어요.</li>'
      + '</ul>';
  }

  // ---------- board ----------
  function buildBoard() {
    var grid = $["g-grid"];
    grid.innerHTML = "";
    for (var i = 0; i < SIZE * SIZE; i++) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "cell"; b.setAttribute("data-i", i);
      b.innerHTML = '<i class="slab k3"></i><i class="slab k2"></i><i class="slab k1"></i><span class="pips"></span>';
      grid.appendChild(b);
    }
    built = true;
  }
  function updateCell(i) {
    var c = g.cells[i], el = $["g-grid"].children[i];
    var top = 4 - c.d;
    el.classList.toggle("empty", c.d === 0);
    el.setAttribute("data-top", c.d ? top : 0);
    for (var k = 1; k <= 3; k++) {
      var s = el.querySelector(".k" + k);
      s.style.display = (c.d > 0 && k >= top) ? "" : "none";
      s.style.setProperty("--p", k - top);
    }
    var pips = "";
    if (c.d > 0) for (var n = 0; n < top; n++) pips += '<b class="pip' + (n < c.h ? " f" : "") + '"></b>';
    el.querySelector(".pips").innerHTML = pips;
    el.setAttribute("aria-label", c.d ? (Math.floor(i / SIZE) + 1) + "행 " + (i % SIZE + 1) + "열, " + top + "층, " + (top - c.h) + "번 남음" : "빈 칸");
  }

  function targetsFor(i) {
    if (!g.card) return [];
    var r = Math.floor(i / SIZE), c = i % SIZE, t = g.card.t, out = [];
    if (t === "line") {
      for (var k = 0; k < SIZE; k++) out.push(ui.dir === "row" ? r * SIZE + k : k * SIZE + c);
    } else if (t === "bomb") {
      out.push(i);
      if (r > 0) out.push(i - SIZE);
      if (r < SIZE - 1) out.push(i + SIZE);
      if (c > 0) out.push(i - 1);
      if (c < SIZE - 1) out.push(i + 1);
    } else out.push(i);
    return out.filter(function (x) { return g.cells[x].d > 0; });
  }
  function clearPreview() { $["g-grid"].querySelectorAll(".pv").forEach(function (c) { c.classList.remove("pv"); }); }
  function preview(i) {
    clearPreview();
    if (!armed()) return;
    targetsFor(i).forEach(function (x) { $["g-grid"].children[x].classList.add("pv"); });
  }

  function onCellClick(e) {
    var c = e.target.closest(".cell");
    if (!c || !armed()) return;
    var i = +c.getAttribute("data-i");
    if (!targetsFor(i).length) return;
    if (cursorEl && cursorVisible) {
      cursorEl.classList.remove("swing"); void cursorEl.offsetWidth; cursorEl.classList.add("swing");
    }
    api.act("hit", { i: i, dir: ui.dir });
  }

  // ---------- render play ----------
  function pillsHtml(p) {
    var cnt = { 1: 0, 2: 0, 3: 0, 4: 0 };
    p.rocks.forEach(function (v) { cnt[v]++; });
    var s = "";
    [4, 3, 2, 1].forEach(function (v) { if (cnt[v]) s += '<span class="mn ' + ROCK[v].cls + '"><em></em>' + ROCK[v].name + ' ×' + cnt[v] + '</span>'; });
    return s || '<span class="mn none">아직 캔 광물이 없어요</span>';
  }
  function renderPlay() {
    if (!built) buildBoard();
    for (var i = 0; i < g.cells.length; i++) updateCell(i);
    var arm = armed();
    $["g-grid"].classList.toggle("armed", arm);
    $["g-frame"].classList.toggle("mycur", arm);
    if (!arm) { hideCursor(); clearPreview(); }

    $["g-players"].innerHTML = g.players.map(function (p, idx) {
      return '<div class="pl' + (idx === g.cur ? " turn" : "") + (p.uid === api.uid ? " me" : "") + (room.online[p.uid] ? "" : " off") + '" data-uid="' + esc(p.uid) + '">'
        + '<div class="pl-top"><i style="background:' + p.color + '"></i><span class="nm">' + esc(p.name) + (p.uid === api.uid ? ' <small>나</small>' : "") + '</span>'
        + '<span class="gsum"><b>' + total(p) + '</b>골드</span></div>'
        + '<div class="minerals">' + pillsHtml(p) + '</div></div>';
    }).join("");
    $["g-remain"].innerHTML = '남은 바위 <b>' + g.remaining + '</b> / ' + g.total + '<div class="bar"><i style="width:' + (g.remaining / g.total * 100) + '%"></i></div>';
    $["g-cap"].textContent = g.remaining + " / " + g.total;
    $["g-panel"].innerHTML = panelHtml();
  }

  function cardFace(card) {
    var cls = "card c-" + card.t + (freshCard ? " deal" : "");
    function face(corner, art, unit, small) {
      return '<div class="' + cls + '"><span class="corner">' + corner + '</span><div class="art">' + art + '</div>'
        + '<div class="unit">' + unit + '</div>' + (small ? '<div class="small">' + small + '</div>' : "") + '</div>';
    }
    if (card.t === "hit") {
      var picks = "";
      for (var k = 0; k < card.n; k++) picks += ART.pick;
      return face(card.n, '<div class="picks n' + card.n + '">' + picks + '</div>', card.n + "회 채굴", "");
    }
    if (card.t === "gold") return face("10", '<div class="picks n1">' + ART.goldPick + '</div><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>', "골드러쉬", "10번 채굴");
    if (card.t === "line") return face("줄", '<div class="lineart">' + ART.pick + '<div class="linep"><b></b><b></b><b></b><b></b><b></b></div></div>', "1줄 채굴", "가로·세로 한 줄");
    if (card.t === "triple") return face("3", ART.drill, "드릴", "한 칸에 3번");
    var cells = "";
    for (var i = 0; i < 9; i++) cells += '<b class="' + (i === 4 ? "c" : (i % 2 === 1 ? "x" : "")) + '"></b>';
    return face("✕", '<div class="bombart">' + ART.bomb + '<div class="cross">' + cells + '</div></div>', "폭약", "십자 5칸 1번씩");
  }
  function cardInfo() {
    var c = g.card, p = me(), mine = myTurn(), nm = esc(p.name);
    if (g.step === "wait") return '<p class="hint">' + (g.remaining === 0 ? "마지막 바위까지 깼어요! 결과를 집계하는 중…" : "채굴 끝! 다음 사람에게 넘어가요…") + '</p>';
    if (c.t === "hit" || c.t === "gold") {
      var icons = "";
      for (var k = 0; k < c.n; k++) icons += PICK.replace("<svg", '<svg class="' + (k < c.n - g.hitsLeft ? "used" : "") + '"');
      return '<div class="hitsleft">' + icons + '</div><p class="hint">' + (mine
        ? '남은 곡괭이질 <b>' + g.hitsLeft + '번</b>. 원하는 칸을 눌러 내려치세요.'
        : nm + '님이 채굴 중이에요. 남은 곡괭이질 <b>' + g.hitsLeft + '번</b>') + '</p>';
    }
    if (c.t === "line") {
      return (mine ? '<div class="dirs"><button type="button" data-dir="row" class="' + (ui.dir === "row" ? "on" : "") + '">가로줄</button><button type="button" data-dir="col" class="' + (ui.dir === "col" ? "on" : "") + '">세로줄</button></div>' : "")
        + '<p class="hint">' + (mine ? "캘 줄의 아무 칸이나 누르세요. 줄 전체가 1번씩 맞아요." : nm + "님이 캘 줄을 고르는 중이에요.") + '</p>';
    }
    if (c.t === "triple") return '<p class="hint">' + (mine ? "드릴로 뚫을 칸을 고르세요. 한 칸을 연달아 3번 캐고, 위층이 깨지면 아래층까지 이어서 뚫어요." : nm + "님이 드릴로 뚫을 칸을 고르는 중이에요.") + '</p>';
    return '<p class="hint">' + (mine ? "폭약을 놓을 칸을 누르세요. 그 칸과 상하좌우가 1번씩 맞아요." : nm + "님이 폭약을 설치하는 중이에요.") + '</p>';
  }
  function panelHtml() {
    var p = me(), mine = myTurn(), h = "";
    h += '<h3 class="turn-title"><i style="background:' + p.color + '"></i>' + (mine ? "내 차례!" : esc(p.name) + "님 차례") + (room.online[p.uid] ? "" : ' <small class="offl">연결 끊김</small>') + '</h3>';
    if (g.step === "draw") {
      h += mine
        ? '<p class="hint">채굴 카드를 뽑아 이번 차례에 할 일을 확인하세요.</p><div class="drawwrap"><button class="btn block" type="button" data-act="draw">채굴 카드 뽑기</button></div>'
        : '<p class="hint">' + esc(p.name) + '님이 채굴 카드를 뽑는 중이에요.</p>';
    } else if (g.card) {
      h += '<div class="cardrow">' + cardFace(g.card) + '<div class="cinfo">' + cardInfo() + '</div></div>';
    }
    if (api.isHost() && !room.online[p.uid] && g.step !== "wait") h += '<button class="btn ghost" type="button" data-act="skip">자리비움 · 이 사람 턴 넘기기</button>';
    h += '<div class="deck"><span class="stack"></span>남은 카드 ' + g.deckCount + '장</div>';
    return h;
  }
  function onPanelClick(e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.getAttribute("data-act") === "draw") { api.act("draw"); }
    else if (b.getAttribute("data-act") === "skip") { api.act("skip"); }
    else if (b.hasAttribute("data-dir")) {
      ui.dir = b.getAttribute("data-dir");
      api.sfx.play("pop");
      $["g-panel"].innerHTML = panelHtml();
    }
  }

  // ---------- effects ----------
  function cellEl(i) { return $["g-grid"].children[i]; }
  function pulse(i, cls) { var el = cellEl(i); if (!el) return; el.classList.remove("hit", "break"); void el.offsetWidth; el.classList.add(cls); }
  function ghostSwing(i) {
    var el = cellEl(i); if (!el) return;
    var s = document.createElement("span");
    s.className = "ghost-pick";
    s.innerHTML = PICK_BIG;
    el.appendChild(s);
    setTimeout(function () { s.remove(); }, 480);
  }
  function gemPop(i, v) {
    var el = cellEl(i); if (!el) return;
    var s = document.createElement("span");
    s.className = "gem " + ROCK[v].cls;
    s.innerHTML = '<i></i><b>' + ROCK[v].name + ' +' + v + '</b>';
    el.appendChild(s);
    setTimeout(function () { s.remove(); }, 1500);
  }
  var toastTimer = null;
  function toast(text, cls) {
    var t = $["g-toast"];
    t.className = "toast show " + (cls || "");
    t.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 2200);
  }
  function flashPlayer(uid) {
    var row = $["g-players"].querySelector('[data-uid="' + CSS.escape(uid) + '"]');
    if (!row) return;
    row.classList.remove("gain"); void row.offsetWidth; row.classList.add("gain");
  }

  function playEvents(evs) {
    var t = 0;
    evs.forEach(function (e) {
      if (e.k === "hit") {
        (function (d) {
          setTimeout(function () {
            if (g.phase !== "play" && g.phase !== "end") return;
            pulse(e.i, "hit");
            if (!(e.by === api.uid && cursorVisible)) ghostSwing(e.i);
            api.sfx.play("hit");
          }, d);
        })(t);
        t += 150;
      } else if (e.k === "break") {
        (function (d) {
          setTimeout(function () {
            pulse(e.i, "break");
            api.sfx.play("break");
            gemPop(e.i, e.v);
            flashPlayer(e.by);
            var who = e.by === api.uid ? "내가" : nameOf(e.by) + "님이";
            toast(who + " " + ROCK[e.v].name + (e.v === 2 ? "를" : "을") + " 캤어요! +" + e.v + "골드", ROCK[e.v].cls);
            setTimeout(function () { api.sfx.play("gem", e.v); }, 140);
          }, d);
        })(Math.max(0, t - 150) + 70);
      } else if (e.k === "bomb") {
        api.sfx.play("bomb");
        var sh = $["g-shaft"];
        sh.classList.remove("boom"); void sh.offsetWidth; sh.classList.add("boom");
      } else if (e.k === "line") {
        api.sfx.play("draw");
      } else if (e.k === "draw") {
        api.sfx.play("draw");
        if (g.card && g.card.t === "gold") setTimeout(function () { api.sfx.play("gem", 4); }, 150);
      } else if (e.k === "turn") {
        if (myTurn()) api.sfx.play("turn");
      } else if (e.k === "end") {
        api.sfx.play("win");
      }
    });
  }

  // ---------- end ----------
  function renderEnd() {
    var ranked = g.players.map(function (p) { return { p: p, t: total(p) }; }).sort(function (a, b) { return b.t - a.t; });
    var max = ranked.length ? ranked[0].t : 0;
    var winners = ranked.filter(function (x) { return x.t === max; });
    var place = 0, last = null;
    var rows = ranked.map(function (x, i) {
      if (x.t !== last) { place = i + 1; last = x.t; }
      return '<div class="res-row' + (x.t === max ? " win" : "") + '"><span class="rank">' + place + '</span>'
        + '<span class="who"><i style="background:' + x.p.color + '"></i>' + esc(x.p.name) + (x.p.uid === api.uid ? ' <small class="muted">(나)</small>' : "") + '</span>'
        + '<span class="tot"><span class="n" data-t="' + x.t + '">' + (endShown ? x.t : 0) + '</span><small>골드</small></span>'
        + '<div class="minerals">' + pillsHtml(x.p) + '</div></div>';
    }).join("");
    $["g-end"].innerHTML = '<h2>광산이 비었어요!</h2><p class="muted">바위 ' + g.total + '개를 모두 캤어요. 최종 결과예요.</p>'
      + '<div class="res" id="g-res">' + rows + '</div>'
      + '<div class="winner-banner">' + (winners.length > 1 ? "공동 우승! " : "우승! ") + winners.map(function (w) { return esc(w.p.name); }).join(", ") + " · " + max + '골드</div>'
      + (api.isHost() ? '<div class="btns"><button class="btn" type="button" data-act="restart">같은 멤버로 다시 하기</button></div>'
        : '<p class="waitline">호스트가 다시 시작하면 같은 방에서 이어서 해요.</p>');
    if (!endShown) {
      endShown = true;
      var nums = $["g-end"].querySelectorAll(".n"), start = performance.now();
      var step = function (now) {
        var k = Math.min(1, (now - start) / 1600);
        nums.forEach(function (n) { n.textContent = Math.round(+n.getAttribute("data-t") * k); });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(function () { nums.forEach(function (n) { n.textContent = n.getAttribute("data-t"); }); }, 1700);
    }
  }

  return { mount: mount, update: update, unmount: unmount, cardFace: cardFace };
})();
