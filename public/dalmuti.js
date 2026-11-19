window.Games = window.Games || {};
window.Games.dalmuti = (function () {
  "use strict";
  var JOKER = 13;
  var NAMES = { 1: "달무티", 2: "대주교", 3: "시종장", 4: "남작부인", 5: "수녀원장", 6: "기사", 7: "재봉사", 8: "석공", 9: "요리사", 10: "양치기", 11: "광부", 12: "농노", 13: "어릿광대" };
  var root, api, room, g, $ = {}, prevSeq = null, sel = [], handKey = "", prevTurn = null;

  function esc(s) { return api.esc(s); }
  function q(id) { return document.getElementById(id); }
  function tier(v) { return v === JOKER ? "tj" : v === 1 ? "t1" : v <= 3 ? "t2" : v <= 6 ? "t3" : v <= 9 ? "t4" : "t5"; }
  function cardHtml(v, extra, idx) {
    return '<button type="button" class="dcard ' + tier(v) + (extra || "") + '"' + (idx != null ? ' data-idx="' + idx + '"' : ' tabindex="-1"') + ' aria-label="' + (v === JOKER ? "조커" : v + " " + NAMES[v]) + '">'
      + '<span class="num">' + (v === JOKER ? "J" : v) + '</span><span class="nm">' + NAMES[v] + '</span>'
      + (v === 1 ? '<span class="crown"></span>' : "") + '</button>';
  }
  function miniCards(list) { return '<span class="minis">' + list.map(function (v) { return cardHtml(v, " mini"); }).join("") + '</span>'; }
  function seat(id) { return (g.seats || []).find(function (s) { return s.id === id; }); }
  function nameOf(id) { var s = seat(id); return s ? s.name : (room.members[id] ? room.members[id].name : "누군가"); }
  function me() { return seat(api.uid); }

  function mount(container, a) {
    root = container; api = a; prevSeq = null; sel = []; handKey = ""; prevTurn = null;
    root.innerHTML = '<div class="dal">'
      + '<section id="d-lobby" class="panel" hidden></section>'
      + '<section id="d-game" class="d-game" hidden>'
      + '<div id="d-seats" class="seats"></div>'
      + '<div class="d-table"><div id="d-banner" class="banner"></div><div id="d-trick" class="trick"></div></div>'
      + '<div id="d-action" class="d-action panel"></div>'
      + '<div id="d-hand" class="hand" aria-label="내 패"></div>'
      + '</section>'
      + '<section id="d-end" class="panel d-end" hidden></section>'
      + '</div>';
    ["d-lobby", "d-game", "d-seats", "d-banner", "d-trick", "d-action", "d-hand", "d-end"].forEach(function (id) { $[id] = q(id); });
    $["d-hand"].addEventListener("click", onHandClick);
    $["d-action"].addEventListener("click", onAction);
    $["d-lobby"].addEventListener("click", onLobbyClick);
    $["d-end"].addEventListener("click", onLobbyClick);
  }
  function unmount() {}

  function update(r) {
    room = r; g = r.g;
    var evs = null;
    if (prevSeq === null) prevSeq = g.seq || 0;
    else if ((g.seq || 0) > prevSeq) { evs = g.events || []; prevSeq = g.seq; }
    var key = JSON.stringify(g.myHand || []);
    if (key !== handKey) { handKey = key; sel = []; }

    var inGame = g.phase === "revolt" || g.phase === "tax" || g.phase === "play";
    $["d-lobby"].hidden = g.phase !== "lobby";
    $["d-game"].hidden = !inGame;
    $["d-end"].hidden = g.phase !== "roundEnd";
    if (g.phase === "lobby") renderLobby();
    else if (inGame) renderGame();
    else renderEnd();
    if (evs) sounds(evs);
    if (g.phase === "play" && g.turn === api.uid && prevTurn !== api.uid) api.sfx.play("turn");
    prevTurn = g.phase === "play" ? g.turn : null;
  }

  function sounds(evs) {
    evs.forEach(function (e) {
      if (e.k === "deal") api.sfx.play("draw");
      else if (e.k === "play") api.sfx.play("draw");
      else if (e.k === "pass") api.sfx.play("pop");
      else if (e.k === "finish") api.sfx.play(e.by === api.uid ? "correct" : "pop");
      else if (e.k === "revolt") api.sfx.play("bomb");
      else if (e.k === "roundEnd") api.sfx.play("win");
    });
  }

  // ---------- lobby ----------
  function playerRows() {
    var humans = Object.keys(room.members).map(function (id) { return { id: id, name: room.members[id].name, at: room.members[id].joinedAt, bot: false }; })
      .sort(function (a, b) { return a.at - b.at; });
    return humans.concat((g.bots || []).map(function (b) { return { id: b.id, name: b.name, bot: true }; }));
  }
  function renderLobby() {
    var rows = playerRows(), host = api.isHost(), n = rows.length;
    $["d-lobby"].innerHTML = '<h2>신분 회의 대기 중</h2><p class="muted">링크로 친구를 부르고, 사람이 모자라면 봇을 앉히세요. 4~6명이 가장 재미있어요.</p>'
      + '<ul class="plist">' + rows.map(function (p) {
        return '<li><i class="dot' + (p.bot || room.online[p.id] ? " on" : "") + '"></i><span>' + esc(p.name) + (p.id === api.uid ? ' <small>(나)</small>' : "") + '</span>'
          + (p.bot ? '<span class="tag">봇</span>' + (host ? '<button type="button" class="x" data-act="removeBot" data-id="' + esc(p.id) + '" aria-label="봇 빼기">×</button>' : "") : "")
          + (p.id === room.hostId ? '<b class="hostb">HOST</b>' : "") + '</li>';
      }).join("") + '</ul>'
      + (host
        ? '<div class="row"><button type="button" class="btn ghost" data-act="addBot"' + (n >= 8 ? " disabled" : "") + '>+ 봇 추가</button>'
          + '<button type="button" class="btn" data-act="start"' + (n < 2 ? " disabled" : "") + '>' + (n < 2 ? "최소 2명 필요" : "게임 시작 (" + n + "명)") + '</button></div>'
        : '<p class="waitline">방장이 시작하면 카드를 나눠요.</p>')
      + rulesHtml();
  }
  function rulesHtml() {
    return '<details class="rules"><summary>규칙 보기</summary><ul>'
      + '<li>카드는 1(달무티) 1장, 2 2장 … 12 12장, 조커 2장으로 모두 80장이에요. 숫자가 작을수록 높은 신분, 좋은 카드예요.</li>'
      + '<li>선 플레이어는 같은 숫자를 원하는 장수만큼 내요. 다음 사람은 <b>같은 장수</b>로 <b>더 작은 숫자</b>를 내거나 패스해요.</li>'
      + '<li>모두 패스해서 마지막으로 낸 사람에게 돌아오면 판을 치우고, 그 사람이 다시 선이 돼요.</li>'
      + '<li>조커는 혼자 내면 13, 다른 카드와 함께 내면 그 숫자로 쳐요.</li>'
      + '<li>먼저 다 턴 순서대로 다음 판 신분이 정해져요. 판이 시작되면 농노는 가장 좋은 카드 2장을 달무티에게, 소작농은 1장을 총리대신에게 바치고, 윗사람은 아무 카드나 같은 장수만큼 돌려줘요.</li>'
      + '<li>조커 2장을 받은 사람은 혁명을 공개할 수 있어요. 세금이 없어지고, 농노가 공개하면 <b>대혁명</b>으로 신분이 뒤집혀요.</li>'
      + '</ul></details>';
  }

  // ---------- game ----------
  function renderGame() {
    var n = g.seats.length;
    $["d-seats"].innerHTML = g.seats.map(function (s, i) {
      var cls = "seat" + (g.phase === "play" && g.turn === s.id ? " turn" : "") + (s.place ? " done" : "") + (s.id === api.uid ? " me" : "")
        + (!s.bot && !room.online[s.id] ? " off" : "") + (s.passed ? " passed" : "");
      var state = s.place ? s.place + "등" : s.passed ? "패스" : (g.phase === "play" && g.turn === s.id ? "차례" : "");
      return '<div class="' + cls + '"><span class="title t' + titleClass(s.title) + '">' + esc(s.title) + '</span>'
        + '<span class="sname">' + esc(s.name) + (s.id === api.uid ? " (나)" : "") + (s.bot ? ' <small class="tag">봇</small>' : "") + '</span>'
        + '<span class="scount"><i></i>' + s.count + (state ? ' <b class="st">' + state + '</b>' : "") + '</span></div>'
        + (i < n - 1 ? '<span class="arrow" aria-hidden="true">›</span>' : "");
    }).join("");

    var banner = "";
    if (g.revolution) banner = g.revolution.type === "great"
      ? '<b class="rev great">대혁명!</b> ' + esc(nameOf(g.revolution.by)) + '님이 조커 2장을 공개해 신분이 뒤집혔어요. 이번 판은 세금이 없어요.'
      : '<b class="rev">혁명!</b> ' + esc(nameOf(g.revolution.by)) + '님이 조커 2장을 공개했어요. 이번 판은 세금이 없어요.';
    $["d-banner"].innerHTML = '<span class="round">' + g.round + '번째 판</span>' + (banner ? '<span class="btext">' + banner + '</span>' : "");
    $["d-banner"].classList.toggle("has", !!banner);

    if (g.phase === "play" && g.trick) {
      var t = g.trick;
      $["d-trick"].innerHTML = '<div class="tcards">' + t.cards.map(function (v) { return cardHtml(v, " big"); }).join("") + '</div>'
        + '<p class="tby"><b>' + esc(nameOf(t.by)) + '</b>님이 ' + (t.num === JOKER ? "조커" : t.num) + ' ' + t.count + '장</p>'
        + '<p class="tneed">다음 사람: <b>' + t.count + '장</b>, <b>' + (t.num === JOKER ? "13" : t.num) + '보다 작은 숫자</b></p>';
    } else if (g.phase === "play") {
      $["d-trick"].innerHTML = '<p class="tempty"><b>' + esc(nameOf(g.turn)) + '</b>님이 선이에요.<br>같은 숫자를 원하는 장수만큼 낼 수 있어요.</p>';
    } else if (g.phase === "tax") {
      $["d-trick"].innerHTML = '<p class="tempty">세금을 걷는 중…<br><small>' + taxLine() + '</small></p>';
    } else {
      $["d-trick"].innerHTML = '<p class="tempty">카드를 나누는 중…</p>';
    }
    $["d-action"].innerHTML = actionHtml();
    renderHand();
  }
  function titleClass(t) { return t === "달무티" ? "1" : t === "총리대신" ? "2" : t === "상인" ? "3" : t === "소작농" ? "4" : "5"; }
  function taxLine() {
    return (g.tax || []).map(function (t) { return esc(nameOf(t.bottom)) + " → " + esc(nameOf(t.top)) + " " + t.count + "장" + (t.done ? " ✓" : ""); }).join(" · ");
  }
  function myTax() { return (g.tax || []).find(function (t) { return t.top === api.uid && !t.done; }); }

  function actionHtml() {
    var h = "", host = api.isHost();
    if (g.phase === "revolt") {
      if (g.revoltMine) {
        var bottom = g.order[g.order.length - 1] === api.uid;
        h = '<p class="big">조커 2장이 들어왔어요!</p><p class="muted">' + (bottom
          ? "공개하면 <b>대혁명</b>! 신분이 뒤집혀 내가 달무티가 되고, 세금도 없어요."
          : "공개하면 <b>혁명</b>! 이번 판은 세금 없이 모두 평등하게 시작해요. 대신 조커가 있다는 게 알려져요.") + '</p>'
          + '<div class="row"><button type="button" class="btn red" data-act="revolt" data-yes="1">' + (bottom ? "대혁명 일으키기!" : "혁명 공개") + '</button>'
          + '<button type="button" class="btn ghost" data-act="revolt" data-yes="0">숨기고 진행</button></div>';
      } else h = '<p class="muted">카드를 나누고 있어요. 잠시만 기다려 주세요…</p>';
      return h + skipHtml(host);
    }
    if (g.phase === "tax") {
      var mt = myTax();
      var asBottom = (g.tax || []).find(function (t) { return t.bottom === api.uid; });
      var asTopDone = (g.tax || []).find(function (t) { return t.top === api.uid && t.done; });
      if (mt) {
        h = '<p><b>' + esc(nameOf(mt.bottom)) + '</b>님이 바친 카드 ' + miniCards(mt.gave || []) + '</p>'
          + '<p class="muted">돌려줄 카드 <b>' + mt.count + '장</b>을 내 패에서 고르세요. 가장 쓸모없는 카드를 주면 돼요.</p>'
          + '<div class="row"><button type="button" class="btn" data-act="return"' + (sel.length === mt.count ? "" : " disabled") + '>'
          + (sel.length === mt.count ? mt.count + "장 돌려주기" : "카드 " + mt.count + "장 선택 (" + sel.length + "/" + mt.count + ")") + '</button></div>';
      } else if (asBottom) {
        h = '<p>' + esc(nameOf(asBottom.top)) + '님에게 가장 좋은 카드 ' + miniCards(asBottom.gave || []) + '를 바쳤어요.</p>'
          + (asBottom.done ? '<p>돌려받은 카드 ' + miniCards(asBottom.back || []) + '</p>' : '<p class="muted">돌려받을 카드를 기다리는 중…</p>');
      } else if (asTopDone) {
        h = '<p>' + miniCards(asTopDone.back || []) + ' 를 돌려줬어요. 다른 세금이 끝나길 기다리는 중…</p>';
      } else h = '<p class="muted">세금을 걷는 중이에요. ' + taxLine() + '</p>';
      return h + skipHtml(host);
    }
    // play
    var mine = me();
    if (mine && mine.place) return '<p class="big">' + mine.place + '등으로 다 털었어요!</p><p class="muted">다음 판엔 <b>' + titleForPlace(mine.place) + '</b>이에요. 남은 사람들을 기다리는 중…</p>';
    if (g.turn !== api.uid) return '<p class="muted"><b>' + esc(nameOf(g.turn)) + '</b>님 차례예요.</p>' + skipHtml(host);
    var check = validate();
    h = '<p class="big">내 차례!</p><p class="hint ' + (check.ok ? "ok" : "") + '">' + check.msg + '</p>'
      + '<div class="row"><button type="button" class="btn" data-act="play"' + (check.ok ? "" : " disabled") + '>' + (sel.length ? sel.length + "장 내기" : "낼 카드 고르기") + '</button>'
      + '<button type="button" class="btn ghost" data-act="pass"' + (g.trick ? "" : " disabled") + '>패스</button>'
      + (sel.length ? '<button type="button" class="btn ghost" data-act="clearSel">선택 취소</button>' : "") + '</div>';
    return h;
  }
  function titleForPlace(place) {
    var n = g.seats.length, pos = place - 1;
    if (pos === 0) return "달무티";
    if (pos === n - 1) return "농노";
    if (n >= 4 && pos === 1) return "총리대신";
    if (n >= 4 && pos === n - 2) return "소작농";
    return "상인";
  }
  function skipHtml(host) {
    if (!host) return "";
    var target = g.phase === "play" ? g.turn : g.phase === "tax" ? ((g.tax || []).find(function (t) { return !t.done; }) || {}).top : null;
    var s = target && seat(target);
    if (!s || s.bot || room.online[target]) return "";
    return '<button type="button" class="btn ghost small" data-act="skip">' + esc(s.name) + '님 연결 끊김 · 대신 진행</button>';
  }

  function selectedCards() { return sel.map(function (i) { return g.myHand[i]; }); }
  function validate() {
    if (!sel.length) return { ok: false, msg: g.trick ? "같은 장수(" + g.trick.count + "장)로 더 작은 숫자를 고르거나 패스하세요. 카드를 누르면 필요한 만큼 골라져요." : "낼 숫자의 카드를 누르세요. 같은 숫자가 한꺼번에 골라져요." };
    var cards = selectedCards();
    var nums = cards.filter(function (v) { return v !== JOKER; });
    if (nums.some(function (v) { return v !== nums[0]; })) return { ok: false, msg: "같은 숫자끼리만 낼 수 있어요. 조커는 섞어도 돼요." };
    var num = nums.length ? nums[0] : JOKER;
    if (g.trick) {
      if (cards.length !== g.trick.count) return { ok: false, msg: g.trick.count + "장을 내야 해요. 지금 " + cards.length + "장 골랐어요." };
      if (num >= g.trick.num) return { ok: false, msg: (g.trick.num === JOKER ? 13 : g.trick.num) + "보다 작은 숫자만 낼 수 있어요." };
    }
    return { ok: true, msg: (num === JOKER ? "조커" : num + " " + NAMES[num]) + " " + cards.length + "장을 낼 수 있어요." };
  }

  function canSelect() { return (g.phase === "play" && g.turn === api.uid) || !!myTax(); }
  function renderHand() {
    var hand = g.myHand || [];
    if (!hand.length) { $["d-hand"].innerHTML = g.phase === "play" && me() && me().place ? "" : '<p class="muted">패가 없어요.</p>'; return; }
    var can = canSelect(), html = "", prev = null;
    hand.forEach(function (v, i) {
      html += cardHtml(v, (sel.indexOf(i) >= 0 ? " sel" : "") + (prev !== null && v !== prev ? " gap" : "") + (can ? "" : " idle"), i);
      prev = v;
    });
    $["d-hand"].innerHTML = '<div class="hand-in">' + html + '</div><p class="hcount">내 패 ' + hand.length + '장</p>';
  }

  function onHandClick(e) {
    var c = e.target.closest(".dcard[data-idx]");
    if (!c || !canSelect()) return;
    var i = +c.getAttribute("data-idx"), hand = g.myHand, v = hand[i], at = sel.indexOf(i);
    var tax = myTax();
    if (at >= 0) sel.splice(at, 1);
    else if (tax) { if (sel.length < tax.count) sel.push(i); }
    else if (v === JOKER) sel.push(i);
    else {
      // 숫자를 누르면 같은 숫자를 한꺼번에 (앞 패가 있으면 필요한 장수만큼, 모자라면 조커로 채움)
      sel = sel.filter(function (k) { return hand[k] === JOKER; });
      var same = [];
      hand.forEach(function (x, k) { if (x === v) same.push(k); });
      if (g.trick) {
        var need = g.trick.count;
        sel = same.slice(0, need);
        if (sel.length < need) {
          hand.forEach(function (x, k) { if (x === JOKER && sel.length < need) sel.push(k); });
        }
      } else sel = sel.concat(same);
    }
    api.sfx.play("pop");
    $["d-action"].innerHTML = actionHtml();
    renderHand();
  }
  function onAction(e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act");
    if (a === "play") { api.act("play", { cards: selectedCards() }); }
    else if (a === "pass") { api.act("pass"); }
    else if (a === "clearSel") { sel = []; $["d-action"].innerHTML = actionHtml(); renderHand(); }
    else if (a === "return") { api.act("return", { cards: selectedCards() }); }
    else if (a === "revolt") { api.act("revolt", { yes: b.getAttribute("data-yes") === "1" }); }
    else if (a === "skip") { api.act("skip"); }
  }
  function onLobbyClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act");
    api.sfx.play("pop");
    if (a === "removeBot") api.act("removeBot", { id: b.getAttribute("data-id") });
    else api.act(a);
  }

  // ---------- round end ----------
  function renderEnd() {
    var host = api.isHost();
    var ranks = g.lastRanks || [];
    var newcomers = playerRows().filter(function (p) { return ranks.indexOf(p.id) < 0; });
    $["d-end"].innerHTML = '<h2>' + g.round + '번째 판 결과</h2><p class="muted">인생은 불공평해요. 먼저 턴 순서대로 다음 판 신분이 정해졌어요.</p>'
      + '<ol class="ranklist">' + ranks.map(function (id, i) {
        var t = g.newTitles ? g.newTitles[id] : "";
        return '<li class="' + (i === 0 ? "first" : "") + '"><span class="pos">' + (i + 1) + '</span><span class="title t' + titleClass(t) + '">' + esc(t) + '</span><b>' + esc(nameOf(id)) + '</b>'
          + (id === api.uid ? ' <small>(나)</small>' : "") + '</li>';
      }).join("") + '</ol>'
      + (newcomers.length ? '<p class="muted">새로 들어온 ' + newcomers.map(function (p) { return esc(p.name); }).join(", ") + '님은 다음 판에 맨 아래 신분으로 앉아요.</p>' : "")
      + (host ? '<div class="row"><button type="button" class="btn" data-act="next">다음 판 시작</button><button type="button" class="btn ghost" data-act="toLobby">대기실로 (봇 조정)</button></div>'
        : '<p class="waitline">방장이 다음 판을 시작하면 카드를 다시 나눠요.</p>')
      + historyHtml();
  }
  function historyHtml() {
    var hs = (g.history || []).slice().reverse();
    if (hs.length < 2) return "";
    return '<details class="rules"><summary>지난 판 기록</summary><ul>' + hs.map(function (h) {
      return '<li>' + h.round + '판: ' + h.ranks.map(esc).join(" → ") + (h.revolution ? (h.revolution.type === "great" ? " (대혁명)" : " (혁명)") : "") + '</li>';
    }).join("") + '</ul></details>';
  }

  return { mount: mount, update: update, unmount: unmount };
})();
