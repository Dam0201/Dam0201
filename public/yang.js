window.Games = window.Games || {};
window.Games.yang = (function () {
  "use strict";
  var root, api, room, g, el, timer = null;
  var ui = { seconds: 30, word: "", askMode: null, askText: "", roundId: null };
  var prev = { phase: null, roundId: null, result: false };

  function esc(s) { return api.esc(s); }
  function members() {
    return Object.keys(room.members).map(function (id) { return { id: id, name: room.members[id].name, joinedAt: room.members[id].joinedAt }; })
      .sort(function (a, b) { return a.joinedAt - b.joinedAt; });
  }
  function label(v) { return ({ yes: "응", no: "아니", maybe: "애매해", correct: "정답", wrong: "오답" })[v] || v; }

  function mount(container, a) {
    root = container; api = a;
    root.innerHTML = '<div class="yang" id="yang"></div>';
    el = document.getElementById("yang");
    prev = { phase: null, roundId: null, result: false };
    el.addEventListener("click", onClick);
    el.addEventListener("input", onInput);
    el.addEventListener("change", onInput);
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      if (e.target.id === "word") sendWord();
      if (e.target.id === "ask-input") sendAsk();
    });
    timer = setInterval(refreshTimer, 250);
  }
  function unmount() { clearInterval(timer); }

  function update(r) {
    room = r; g = r.g;
    sounds();
    render();
  }

  function sounds() {
    var r = g.round;
    if (prev.phase && prev.phase !== g.phase) {
      if (g.phase === "writing") api.sfx.play("draw");
      else if (g.phase === "playing") api.sfx.play("turn");
      else if (g.phase === "ended") api.sfx.play("win");
    }
    if (r) {
      if (prev.roundId && r.id !== prev.roundId && r.askerId === api.uid) api.sfx.play("turn");
      if (r.result && !prev.result && prev.roundId === r.id) {
        api.sfx.play(r.result.correct ? "correct" : (r.mode === "guess" ? "wrong" : "pop"));
      }
      if (r.id !== ui.roundId) { ui.roundId = r.id; ui.askMode = null; ui.askText = ""; }
    }
    prev = { phase: g.phase, roundId: r ? r.id : null, result: !!(r && r.result) };
  }

  function render() {
    var active = document.activeElement;
    var focusId = active && el.contains(active) && active.id ? active.id : null;
    var sel = focusId && active.setSelectionRange ? [active.selectionStart, active.selectionEnd] : null;
    var html = "";
    if (g.phase === "lobby") html = lobbyHtml();
    else if (g.phase === "writing") html = writingHtml();
    else if (g.phase === "playing") html = gameHtml();
    else html = endedHtml();
    el.innerHTML = html;
    if (focusId) {
      var f = document.getElementById(focusId);
      if (f) { f.focus(); if (sel) try { f.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
    }
    refreshTimer();
  }

  function lobbyHtml() {
    var ms = members(), host = api.isHost();
    var list = ms.map(function (p) {
      return '<li><span><i class="dot' + (room.online[p.id] ? " on" : "") + '"></i>' + esc(p.name) + (p.id === api.uid ? " (나)" : "") + '</span>'
        + (p.id === room.hostId ? '<b class="host">HOST</b>' : "") + '</li>';
    }).join("");
    var opts = [15, 30, 45, 60].map(function (s) { return '<option value="' + s + '"' + (ui.seconds === s ? " selected" : "") + '>' + s + '초</option>'; }).join("");
    return '<h2 class="phase-title">친구를 기다리는 중</h2><p class="sub">위의 링크 복사 버튼으로 친구를 부르고, 모두 들어오면 시작하세요.</p>'
      + '<section class="panel members"><ul class="member-list">' + list + '</ul></section>'
      + (host
        ? '<section class="action"><div class="panel"><label>라운드 제한시간 <select id="seconds">' + opts + '</select></label>'
          + '<button class="primary" type="button" data-act="start"' + (ms.length < 2 ? " disabled" : "") + '>' + (ms.length < 2 ? "최소 2명 필요" : "게임 시작 →") + '</button></div></section>'
        : '<div class="waiting">호스트가 게임을 시작할 때까지 기다려주세요.</div>');
  }

  function writingHtml() {
    var target = g.roster[g.myTarget] || "다른 참가자";
    var sent = g.submissions[api.uid];
    var count = Object.keys(g.submissions).length, total = Object.keys(g.roster).length;
    if (!g.myTarget) return '<h2 class="phase-title">단어 적는 중</h2><div class="waiting">이번 판에는 참여하지 않아요. 다음 판을 기다려주세요.</div>';
    return '<h2 class="phase-title">단어 적기</h2><p class="sub">배정된 사람은 이 단어를 볼 수 없어요. 그 사람의 이마에 붙을 정체를 적어주세요.</p>'
      + '<section class="action"><div class="panel">'
      + (sent
        ? '<p class="writing-target">✅ 제출 완료!</p><p class="hint">다른 참가자를 기다리고 있어요. (' + count + '/' + total + ')</p>'
        : '<p class="hint">내가 단어를 적어줄 사람</p><p class="writing-target">' + esc(target) + '</p>'
          + '<label>단어 <input id="word" maxlength="16" placeholder="예: 손흥민, 피카츄, 고양이" value="' + esc(ui.word) + '"></label>'
          + '<button class="primary" type="button" data-act="send-word">단어 제출</button>'
          + '<p class="hint">제출 ' + count + '/' + total + '</p>')
      + '</div></section>';
  }

  function tableHtml() {
    var ids = Object.keys(g.roster), radius = 43;
    return ids.map(function (id, i) {
      var a = -Math.PI / 2 + Math.PI * 2 * i / ids.length;
      var x = 50 + radius * Math.cos(a), y = 50 + radius * Math.sin(a);
      var isMe = id === api.uid, done = g.finished.indexOf(id) >= 0;
      var word = g.words[id] != null ? g.words[id] : "???";
      var cls = "seat" + (isMe ? " me" : "") + (g.round && g.round.askerId === id ? " turn" : "") + (done ? " done" : "") + (room.online[id] ? "" : " off");
      return '<div class="' + cls + '" style="left:' + x + '%;top:' + y + '%"><div class="avatar">' + esc((g.roster[id] || "?").slice(0, 1)) + (done ? '<span class="badge">' + (g.finished.indexOf(id) + 1) + '</span>' : "") + '</div>'
        + '<span class="seat-name">' + esc(g.roster[id]) + (isMe ? " · 나" : "") + '</span><span class="word-tag">' + esc(word) + '</span></div>';
    }).join("");
  }

  function gameHtml() {
    var r = g.round;
    if (!r) return "";
    var asker = r.askerId === api.uid, askerName = esc(g.roster[r.askerId]);
    var content = "";
    if (r.result) {
      content = '<p class="result ' + (r.result.correct ? "good" : "") + '">' + (r.result.correct ? "🎉 정답!" : (r.mode === "guess" ? "땡! 오답이에요" : "답변 결과")) + '</p><p>' + esc(r.result.text) + '</p>';
    } else if (!r.mode && asker) {
      if (!ui.askMode) {
        content = '<p><b>질문하기</b> 또는 <b>정답 맞히기</b> 중 하나를 고르세요.</p><div class="choice-row">'
          + '<button class="primary" type="button" data-act="mode" data-mode="question">질문하기</button>'
          + '<button type="button" data-act="mode" data-mode="guess">정답 맞히기</button></div>';
      } else {
        var q = ui.askMode === "question";
        content = '<label>' + (q ? "예/아니오로 답할 질문" : "내 정체는?") + ' <input id="ask-input" maxlength="60" placeholder="' + (q ? "예: 나는 사람인가요?" : "예: 내가 손흥민이야?") + '" value="' + esc(ui.askText) + '"></label>'
          + '<div class="choice-row"><button class="primary" type="button" data-act="ask-send">' + (q ? "질문 보내기" : "정답 선언!") + '</button><button type="button" data-act="ask-cancel">다시 고르기</button></div>';
      }
    } else if (!r.mode) {
      content = '<p><b>' + askerName + '</b>님이 질문할지 정답을 맞힐지 고르는 중이에요.</p>';
    } else if (asker) {
      content = '<p><b>' + (r.mode === "question" ? "내 질문" : "내 정답 선언") + '</b></p><p class="writing-target">' + esc(r.prompt) + '</p>'
        + '<p class="hint">다른 사람들의 답을 기다리는 중… (' + Object.keys(r.votes).length + '/' + Math.max(0, Object.keys(g.roster).length - 1) + ')</p>';
    } else {
      var mine = r.votes[api.uid];
      var options = r.mode === "question" ? [["yes", "응", "yes"], ["no", "아니", "no"], ["maybe", "애매해", "maybe"]] : [["correct", "정답", "yes"], ["wrong", "오답", "no"]];
      content = '<p><b>' + askerName + '</b>님의 ' + (r.mode === "question" ? "질문" : "정답 선언") + '</p><p class="writing-target">' + esc(r.prompt) + '</p>'
        + (mine ? '<p class="hint">내 답변: <b>' + label(mine) + '</b> · 다른 사람을 기다리는 중</p>'
          : '<div class="vote-row">' + options.map(function (o) { return '<button class="' + o[2] + '" type="button" data-vote="' + o[0] + '">' + o[1] + '</button>'; }).join("") + '</div>');
    }
    return '<h2 class="phase-title">' + (asker ? "내 차례" : askerName + "님 차례") + '</h2>'
      + '<div class="table-wrap">' + tableHtml() + '<div class="table"><div><strong>' + (asker ? "당신의 차례" : "친구의 차례") + '</strong><small>'
      + (r.result ? "결과 확인" : r.mode ? (r.mode === "question" ? "질문" : "정답") + " 응답 중" : "선택 대기 중") + '</small></div></div></div>'
      + '<section class="action"><div class="panel">' + content
      + (r.result ? "" : '<div class="timer" aria-label="남은 시간"><i id="timer-fill"></i></div><p id="timer-text" class="hint"></p>') + '</div></section>';
  }

  function endedHtml() {
    var ranks = g.finished.map(function (id, i) {
      return '<li><span class="medal">' + (["🥇", "🥈", "🥉"][i] || (i + 1) + "위") + '</span><b>' + esc(g.roster[id]) + '</b><span class="hint">' + esc(g.words[id] || "") + '</span></li>';
    }).join("");
    return '<h2 class="phase-title">게임 끝!</h2><p class="sub">모두 자기 정체를 맞혔어요.</p><section class="panel ended-rank"><ol>' + ranks + '</ol>'
      + (api.isHost() ? '<button class="primary" type="button" data-act="restart">같은 멤버로 다시 하기</button>' : '<p class="hint">호스트가 다시 시작하면 같은 방에서 이어서 해요.</p>') + '</section>';
  }

  function refreshTimer() {
    if (!g || g.phase !== "playing" || !g.round) return;
    var fill = document.getElementById("timer-fill"), text = document.getElementById("timer-text");
    if (!fill || !text) return;
    var total = g.roundSeconds * 1000, left = Math.max(0, g.round.deadline - Date.now());
    fill.style.width = Math.min(100, left / total * 100) + "%";
    fill.classList.toggle("low", left < 5000);
    text.textContent = "남은 시간 " + Math.ceil(left / 1000) + "초";
  }

  function sendWord() {
    var w = ui.word.trim().slice(0, 16);
    if (!w) return;
    api.sfx.play("pop");
    api.act("submitWord", { word: w });
    ui.word = "";
  }
  function sendAsk() {
    var t = ui.askText.trim();
    if (!t || !ui.askMode) return;
    api.sfx.play("pop");
    api.act("ask", { mode: ui.askMode, prompt: t });
  }
  function onInput(e) {
    if (e.target.id === "word") ui.word = e.target.value;
    else if (e.target.id === "ask-input") ui.askText = e.target.value;
    else if (e.target.id === "seconds") ui.seconds = Number(e.target.value);
  }
  function onClick(e) {
    var b = e.target.closest("[data-act],[data-vote]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act");
    if (b.hasAttribute("data-vote")) { api.sfx.play("pop"); api.act("vote", { value: b.getAttribute("data-vote") }); return; }
    if (a === "start") { api.sfx.play("pop"); api.act("startWriting", { seconds: ui.seconds }); }
    else if (a === "send-word") sendWord();
    else if (a === "mode") {
      ui.askMode = b.getAttribute("data-mode");
      api.sfx.play("pop");
      render();
      var inp = document.getElementById("ask-input");
      if (inp) inp.focus();
    }
    else if (a === "ask-cancel") { ui.askMode = null; render(); }
    else if (a === "ask-send") sendAsk();
    else if (a === "restart") api.act("restart");
  }

  return { mount: mount, update: update, unmount: unmount };
})();
