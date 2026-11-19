(function () {
  "use strict";
  var viewEl = document.getElementById("view");
  var connEl = document.getElementById("conn");
  var tbLeft = document.getElementById("tb-left");
  var tbRoom = document.getElementById("tb-room");
  var muteBtn = document.getElementById("mute");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cleanCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }

  var profile = {};
  try { profile = JSON.parse(localStorage.getItem("pg-profile") || "{}"); } catch (e) {}
  if (!profile.uid) profile.uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
  function saveProfile() { try { localStorage.setItem("pg-profile", JSON.stringify(profile)); } catch (e) {} }
  saveProfile();
  var uid = profile.uid;

  var ws = null, room = null, wantsRejoin = null, mounted = null, lobbyErr = "", everConnected = false, reconnectTimer = null;
  var params = new URLSearchParams(location.search);
  var urlCode = cleanCode(params.get("room"));
  if (urlCode && profile.name) wantsRejoin = urlCode;

  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(Object.assign({ uid: uid }, o))); }

  var api = {
    uid: uid,
    esc: esc,
    sfx: window.SFX,
    act: function (a, extra) { send(Object.assign({ type: "act", a: a }, extra || {})); },
    isHost: function () { return !!room && room.hostId === uid; },
    room: function () { return room; }
  };

  function connect() {
    var proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(proto + "://" + location.host);
    ws.onopen = function () {
      connEl.hidden = true;
      everConnected = true;
      if (wantsRejoin && profile.name) send({ type: "join", code: wantsRejoin, name: profile.name });
    };
    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === "joined") {
        wantsRejoin = m.code;
        history.replaceState({}, "", location.pathname + "?room=" + m.code);
      } else if (m.type === "room") {
        room = m.room;
        lobbyErr = "";
        renderRoom();
      } else if (m.type === "error") {
        lobbyErr = m.message;
        if (m.code === "no_room" || m.code === "started") {
          urlCode = wantsRejoin || urlCode;
          wantsRejoin = null;
          room = null;
          history.replaceState({}, "", location.pathname);
          renderLobby();
        } else if (!room) renderLobby();
      }
    };
    ws.onclose = function () {
      if (everConnected) connEl.hidden = false;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 1500);
    };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }

  // ---------- top bar ----------
  var SPEAKER_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';
  var SPEAKER_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';
  function renderMute() {
    var m = SFX.isMuted();
    muteBtn.innerHTML = m ? SPEAKER_OFF : SPEAKER_ON;
    muteBtn.setAttribute("aria-label", m ? "소리 켜기" : "소리 끄기");
    muteBtn.title = m ? "소리 켜기" : "소리 끄기";
  }
  muteBtn.addEventListener("click", function () { SFX.setMuted(!SFX.isMuted()); renderMute(); SFX.play("pop"); });
  renderMute();

  var leaveArmed = false, leaveTimer = null;
  function renderTopbar() {
    if (!room) {
      tbLeft.innerHTML = '<span class="tb-brand">게임방</span>';
      tbRoom.innerHTML = "";
      return;
    }
    var title = room.game === "gold" ? "골드러쉬" : "양세찬 게임";
    tbLeft.innerHTML = '<button type="button" class="tb-back" id="tb-back">' + (leaveArmed ? "정말 나갈까요? 한 번 더" : "← 로비") + '</button><span class="tb-game">' + title + '</span>';
    tbRoom.innerHTML = '<span class="room-pill">방 <b>' + esc(room.code) + '</b><button type="button" id="tb-copy">링크 복사</button></span>';
  }
  tbLeft.addEventListener("click", function (e) {
    if (!e.target.closest("#tb-back")) return;
    var inLobbyPhase = room && room.g && room.g.phase === "lobby";
    if (!inLobbyPhase && !leaveArmed) {
      leaveArmed = true;
      renderTopbar();
      leaveTimer = setTimeout(function () { leaveArmed = false; renderTopbar(); }, 3000);
      return;
    }
    clearTimeout(leaveTimer);
    leaveArmed = false;
    send({ type: "leave" });
    room = null;
    wantsRejoin = null;
    urlCode = "";
    history.replaceState({}, "", location.pathname);
    renderLobby();
  });
  tbRoom.addEventListener("click", function (e) {
    var b = e.target.closest("#tb-copy");
    if (!b || !room) return;
    var link = location.origin + location.pathname + "?room=" + room.code;
    var done = function () { b.textContent = "복사됨!"; setTimeout(function () { b.textContent = "링크 복사"; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { window.prompt("이 링크를 복사하세요", link); });
    else window.prompt("이 링크를 복사하세요", link);
  });

  // ---------- lobby ----------
  function yangArt() {
    var seats = "";
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3;
      seats += '<circle cx="' + (80 + 46 * Math.cos(a)).toFixed(1) + '" cy="' + (56 + 40 * Math.sin(a)).toFixed(1) + '" r="9" fill="#fffdf6" stroke="#d8c4a1" stroke-width="3"/>';
    }
    return '<svg viewBox="0 0 160 112" aria-hidden="true"><ellipse cx="80" cy="56" rx="34" ry="29" fill="#0c6b49" stroke="#d7ae69" stroke-width="5"/>' + seats
      + '<rect x="66" y="40" width="28" height="24" rx="3" fill="#ffd667" transform="rotate(-6 80 52)"/><text x="80" y="58" text-anchor="middle" font-family="Black Han Sans, sans-serif" font-size="16" fill="#13251e">?</text></svg>';
  }
  function goldArt() {
    var cells = "", greys = ["#d2d5da", "#8f949b", "#4c5057"], gold = { 6: 1, 13: 1, 17: 1 };
    for (var i = 0; i < 25; i++) {
      var x = 30 + (i % 5) * 21, y = 6 + Math.floor(i / 5) * 21;
      var fill = gold[i] ? "#f6bf26" : greys[(i * 7) % 3];
      cells += '<rect x="' + x + '" y="' + y + '" width="17" height="17" rx="4" fill="' + fill + '"/>';
    }
    return '<svg viewBox="0 0 160 112" aria-hidden="true"><rect x="24" y="0" width="112" height="112" rx="12" fill="#2a2d33"/>' + cells + '</svg>';
  }
  function renderLobby() {
    if (mounted) { if (window.Games[mounted].unmount) window.Games[mounted].unmount(); mounted = null; }
    document.body.setAttribute("data-game", "");
    renderTopbar();
    if (wantsRejoin) { viewEl.innerHTML = '<p class="lobby-wait">방에 들어가는 중…</p>'; return; }
    viewEl.innerHTML = ''
      + '<section class="lobby">'
      + '<header class="hero"><p class="eyebrow">PARTY GAME ROOM</p><h1>게임방</h1><p>링크 하나로 친구들을 불러 모아요. 회원가입도 로그인도 필요 없어요.</p></header>'
      + '<label class="namebox">내 닉네임<input id="lb-name" maxlength="12" placeholder="예: 세찬" autocomplete="nickname" value="' + esc(profile.name || "") + '"></label>'
      + '<div class="tiles">'
      + '<article class="tile t-yang"><div class="art">' + yangArt() + '</div><div class="tile-body"><h2>양세찬 게임</h2>'
      + '<p>서로의 이마에 붙일 단어를 적어주고, 예·아니오 질문으로 내 정체를 맞혀요.</p><p class="meta">2명 이상 · 질문/정답 · 제한시간</p>'
      + '<button type="button" class="lb-create" data-game="yang">방 만들기</button></div></article>'
      + '<article class="tile t-gold"><div class="art">' + goldArt() + '</div><div class="tile-body"><h2>골드러쉬</h2>'
      + '<p>채굴 카드를 뽑아 5×5·3층 광산을 캐고, 돌·구리·은·금으로 가장 부자가 되세요.</p><p class="meta">2~6명 · 카드 · 채굴</p>'
      + '<button type="button" class="lb-create" data-game="gold">방 만들기</button></div></article>'
      + '</div>'
      + '<div class="joinbox"><label>친구 방에 참가<input id="lb-code" maxlength="6" placeholder="방 코드 (예: G7K2QP)" autocapitalize="characters" value="' + esc(urlCode || "") + '"></label>'
      + '<button type="button" id="lb-join">참가하기</button></div>'
      + '<p class="lb-err" id="lb-err"' + (lobbyErr ? "" : " hidden") + '>' + esc(lobbyErr) + '</p>'
      + '</section>';
    var nameIn = document.getElementById("lb-name"), codeIn = document.getElementById("lb-code"), err = document.getElementById("lb-err");
    function tell(s) { err.textContent = s; err.hidden = false; }
    function takeName() {
      var n = nameIn.value.trim().slice(0, 12);
      if (!n) { tell("닉네임을 먼저 입력해주세요."); nameIn.focus(); return null; }
      profile.name = n; saveProfile();
      return n;
    }
    codeIn.addEventListener("input", function () { codeIn.value = cleanCode(codeIn.value); });
    viewEl.querySelectorAll(".lb-create").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = takeName(); if (!n) return;
        SFX.play("pop");
        send({ type: "create", game: b.getAttribute("data-game"), name: n });
      });
    });
    function join() {
      var n = takeName(); if (!n) return;
      var c = cleanCode(codeIn.value);
      if (c.length < 6) { tell("6자리 방 코드를 입력해주세요."); codeIn.focus(); return; }
      SFX.play("pop");
      wantsRejoin = c;
      send({ type: "join", code: c, name: n });
    }
    document.getElementById("lb-join").addEventListener("click", join);
    codeIn.addEventListener("keydown", function (e) { if (e.key === "Enter") join(); });
    if (urlCode && !profile.name) nameIn.focus();
  }

  // ---------- room ----------
  function renderRoom() {
    if (!room) return renderLobby();
    var game = window.Games[room.game];
    if (mounted !== room.game) {
      if (mounted && window.Games[mounted].unmount) window.Games[mounted].unmount();
      viewEl.innerHTML = "";
      game.mount(viewEl, api);
      mounted = room.game;
      document.body.setAttribute("data-game", room.game);
    }
    renderTopbar();
    game.update(room);
  }

  renderLobby();
  connect();
})();
