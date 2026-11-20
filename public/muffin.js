window.Games = window.Games || {};
window.Games.muffin = (function () {
  "use strict";
  var DEF = {};
  (window.MUFFIN_CARDS || []).forEach(function (c) { DEF[c.k] = c; });
  var TYPE = { action: "행동", trap: "함정", counter: "카운터" };

  var root, api, room, g, $ = {}, prevSeq = null, offset = 0, ticker = null, knownIds = {}, prevTurn = null, reactBeeped = false;
  var ui = { sel: null, mode: null };

  function esc(s) { return api.esc(s); }
  function q(id) { return document.getElementById(id); }
  function now() { return Date.now() + offset; }
  function nm(u) { var p = (g.players || []).find(function (x) { return x.uid === u; }); return p ? p.name : "누군가"; }
  function others() { return g.players.filter(function (p) { return p.uid !== api.uid; }); }
  function myTurn() { return g.phase === "play" && g.turn && g.turn.uid === api.uid; }
  function free() { return !g.pending && !g.sub; }

  function cardHtml(c, extra, attrs) {
    var d = DEF[c.k] || { name: "?", text: "", type: "action" };
    var fit = (d.name.length > 9 ? " ln" : "") + (d.text.length > 46 ? " lt2" : d.text.length > 34 ? " lt" : "");
    return '<button type="button" class="mcard t-' + d.type + fit + (extra || "") + '" ' + (attrs || "") + '>'
      + '<span class="mtype">' + TYPE[d.type] + (d.mini ? " · 미니게임" : d.real ? " · 양심" : (d.trig && d.trig !== "manual") ? " · 자동" : "") + '</span>'
      + '<span class="mname">' + esc(d.name) + '</span><span class="mtext">' + esc(d.text) + '</span></button>';
  }

  function mount(container, a) {
    root = container; api = a; prevSeq = null; knownIds = {}; prevTurn = null; ui = { sel: null, mode: null };
    root.innerHTML = '<div class="muf">'
      + '<section id="m-lobby" class="panel" hidden></section>'
      + '<section id="m-game" class="m-game" hidden>'
      + '<div id="m-status" class="m-status"></div>'
      + '<div id="m-players" class="m-players"></div>'
      + '<div class="m-mid"><div id="m-table" class="m-table"></div><ol id="m-log" class="m-log" aria-live="polite"></ol></div>'
      + '<div id="m-panel" class="m-panel panel"></div>'
      + '<div id="m-traps" class="m-traps"></div>'
      + '<div id="m-hand" class="m-hand"></div>'
      + '</section>'
      + '<section id="m-end" class="panel m-end" hidden></section>'
      + '</div>';
    ["m-lobby", "m-game", "m-status", "m-players", "m-table", "m-log", "m-panel", "m-traps", "m-hand", "m-end"].forEach(function (id) { $[id] = q(id); });
    root.addEventListener("click", onClick);
    root.addEventListener("input", function (e) { if (e.target.id === "m-num" && ui.mode) ui.mode.num = +e.target.value; });
    ticker = setInterval(tick, 150);
  }
  function unmount() { clearInterval(ticker); }

  function update(r) {
    room = r; g = r.g;
    if (g.serverNow) offset = g.serverNow - Date.now();
    var evs = null;
    if (prevSeq === null) prevSeq = g.seq || 0;
    else if ((g.seq || 0) > prevSeq) { evs = g.events || []; prevSeq = g.seq; }
    // 상황이 바뀌면 고르던 대상 선택 취소
    if (ui.mode && ui.mode.kind === "play" && (!myTurn() || !free() || !(g.myHand || []).some(function (c) { return c.id === ui.mode.id; }))) ui.mode = null;
    if (ui.mode && ui.mode.kind === "trigger" && (!free() || !(g.myTraps || []).some(function (c) { return c.id === ui.mode.id; }))) ui.mode = null;
    if (ui.mode && ui.mode.kind === "dodge" && (!g.pending || g.pending.myCounters.indexOf(ui.mode.id) < 0)) ui.mode = null;
    if (ui.sel && !(g.myHand || []).some(function (c) { return c.id === ui.sel; })) ui.sel = null;

    $["m-lobby"].hidden = g.phase !== "lobby";
    $["m-game"].hidden = g.phase !== "play";
    $["m-end"].hidden = g.phase !== "end";
    if (g.phase === "lobby") renderLobby();
    else if (g.phase === "play") renderGame();
    else renderEnd();
    if (evs) sounds(evs);
    if (g.phase === "play" && myTurn() && prevTurn !== api.uid) api.sfx.play("turn");
    prevTurn = g.phase === "play" && g.turn ? g.turn.uid : null;
  }

  function sounds(evs) {
    evs.forEach(function (e) {
      var s = { draw: "draw", play: "pop", counter: "hit", trap: "bomb", cancel: "wrong", win: "win", banana: "wrong", photo: "correct", discard: null, steal: "pop", setTrap: "pop" }[e.k];
      if (e.k === "coin") s = e.heads ? "correct" : "wrong";
      if (e.k === "rps") s = "hit";
      if (s) api.sfx.play(s);
    });
  }

  // ---------- 대기실 ----------
  function renderLobby() {
    var ms = Object.keys(room.members).map(function (id) { return { id: id, name: room.members[id].name, at: room.members[id].joinedAt }; })
      .sort(function (a, b) { return (a.id === room.hostId ? -1 : 0) - (b.id === room.hostId ? -1 : 0) || a.at - b.at; });
    var host = api.isHost(), dir = g.dir || 1;
    $["m-lobby"].innerHTML = '<h2>머핀 굽는 중</h2><p class="muted">링크로 친구를 부르세요. 음성 채팅을 켜고 하면 훨씬 웃겨요. 2~8명.</p>'
      + '<ul class="plist">' + ms.map(function (p) {
        return '<li><i class="dot' + (room.online[p.id] ? " on" : "") + '"></i>' + esc(p.name) + (p.id === api.uid ? ' <small>(나)</small>' : "") + (p.id === room.hostId ? '<b class="hostb">게임 제안자</b>' : "") + '</li>';
      }).join("") + '</ul>'
      + (host
        ? '<p class="label">진행 방향 (제안자가 정해요)</p><div class="seg"><button type="button" data-act="dir" data-dir="1" class="' + (dir === 1 ? "on" : "") + '">↻ 시계 방향</button><button type="button" data-act="dir" data-dir="-1" class="' + (dir === -1 ? "on" : "") + '">↺ 반시계 방향</button></div>'
          + '<button type="button" class="btn block" data-act="start"' + (ms.length < 2 ? " disabled" : "") + '>' + (ms.length < 2 ? "최소 2명 필요" : "머핀 타임 시작!") + '</button>'
        : '<p class="waitline">제안자(방장)가 시작하면 카드 3장씩 받고 시작해요.</p>')
      + rulesHtml();
  }
  function rulesHtml() {
    return '<details class="rules"><summary>규칙 보기</summary><ul>'
      + '<li><b>차례를 시작할 때 손패가 정확히 10장</b>이면 승리! 다들 3장씩 들고 시작해요.</li>'
      + '<li>내 차례엔 먼저 <b class="r">함정</b> 1장을 몰래 설치할 수 있어요. 그다음 <b>카드 1장 뽑기</b>나 <b class="b">행동</b> 카드 1장 쓰기 중 하나를 해요.</li>'
      + '<li><b class="gr">카운터</b>는 누군가 카드를 냈을 때 내 차례가 아니어도 써요. 받아친 카드를 또 받아칠 수도 있어요. 미니게임은 못 막아요.</li>'
      + '<li>"누가 웃으면" 같은 함정은 상황이 생기면 주인이 직접 <b>발동!</b>을 누르고 걸린 사람을 골라요. 양심껏!</li>'
      + '<li>카드 이름과 문구는 이 게임방에서 새로 지었어요.</li>'
      + '</ul></details>';
  }

  // ---------- 게임 ----------
  function renderGame() {
    var s = [];
    s.push('<span class="chip goal">목표 <b>' + g.target + '장</b></span>');
    s.push('<span class="chip">' + (g.dir === 1 ? "↻ 시계" : "↺ 반시계") + '</span>');
    if (g.locks.noCounter) s.push('<span class="chip warn">카운터 금지 (' + esc(nm(g.locks.noCounter)) + '님 차례까지)</span>');
    if (g.locks.noAction) s.push('<span class="chip warn">행동 금지 (' + esc(nm(g.locks.noAction)) + '님 차례까지)</span>');
    if (g.locks.noWin) s.push('<span class="chip warn">승리 금지 (' + esc(nm(g.locks.noWin)) + '님 차례까지)</span>');
    if (g.altWin) s.push('<span class="chip hot">' + esc(nm(g.altWin.owner)) + '님 차례에 손패 가장 ' + (g.altWin.type === "fewest" ? "적은" : "많은") + ' 사람 승리!</span>');
    $["m-status"].innerHTML = s.join("");

    $["m-players"].innerHTML = g.players.map(function (p) {
      var cls = "mp" + (g.turn.uid === p.uid ? " turn" : "") + (p.uid === api.uid ? " me" : "") + (room.online[p.uid] ? "" : " off") + (p.count === g.target ? " near" : "");
      var traps = "";
      for (var i = 0; i < p.traps; i++) traps += '<i class="trapi" title="설치된 함정"></i>';
      return '<div class="' + cls + '"><span class="pn">' + esc(p.name) + (p.uid === api.uid ? " (나)" : "") + '</span>'
        + '<span class="pc"><b>' + p.count + '</b>장</span><span class="pt">' + traps + (p.skips ? '<em>쉼</em>' : "") + '</span></div>';
    }).join("");

    $["m-table"].innerHTML = tableHtml();
    $["m-log"].innerHTML = (g.log || []).slice(-7).reverse().map(function (l, i) { return '<li class="' + (i === 0 ? "fresh" : "") + '">' + esc(l) + '</li>'; }).join("");
    $["m-panel"].innerHTML = panelHtml();
    $["m-traps"].innerHTML = trapsHtml();
    renderHand();
    tick();
  }

  var lastPend = "", lastStack = 0;
  function tableHtml() {
    var p = g.pending;
    if (p) {
      // 새로 나온 카드에만 '쾅' 애니메이션 (화면이 새로 그려질 때마다 다시 재생되지 않게)
      var key = p.type + p.by + (p.card || p.k || "");
      var freshMain = key !== lastPend, prevStack = freshMain ? 0 : lastStack;
      lastPend = key; lastStack = p.stack.length;
      var main = p.type === "draw" ? '<div class="drawcard">카드 뽑기</div>' : cardHtml({ k: p.card || p.k }, " big" + (freshMain ? " slam" : ""));
      var stack = p.stack.map(function (s, i) { return '<div class="stk">' + cardHtml({ k: s.k }, " small" + (i >= prevStack ? " slam" : "")) + '<span>' + esc(nm(s.by)) + (s.target ? " → " + esc(nm(s.target)) : "") + '</span></div>'; }).join("");
      return '<div class="pend">' + main + (stack ? '<div class="stack">' + stack + '</div>' : "") + '</div>'
        + '<p class="pby"><b>' + esc(nm(p.by)) + '</b>' + (p.targets && p.targets.length ? " → " + p.targets.map(function (x) { return esc(nm(x)); }).join(", ") : "")
        + (p.eligibleCount ? ' · <span class="hotx">누군가 받아칠 수 있어요!</span>' : "") + '</p>'
        + '<div class="cd"><i data-until="' + p.until + '" data-total="' + (p.eligibleCount ? 6000 : 900) + '"></i></div>';
    }
    lastPend = ""; lastStack = 0;
    var top = g.discardTop ? cardHtml({ k: g.discardTop }, " small dim") : '<div class="emptypile">버린 카드 없음</div>';
    return '<div class="piles"><div class="deckpile"><b>' + g.deckCount + '</b><span>카드 더미</span></div><div class="discpile">' + top + '<span>버린 더미</span></div></div>';
  }

  function trapsHtml() {
    var traps = g.myTraps || [];
    if (!traps.length) return "";
    return '<p class="label">내가 설치한 함정 <small>(다른 사람에겐 뒷면만 보여요)</small></p><div class="traprow">' + traps.map(function (c) {
      var manual = DEF[c.k].trig === "manual";
      var active = ui.mode && ui.mode.kind === "trigger" && ui.mode.id === c.id;
      return '<div class="trapcell">' + cardHtml(c, " small" + (active ? " sel" : "")) + (manual
        ? '<button type="button" class="btn red tiny" data-act="trigger" data-id="' + c.id + '"' + (free() ? "" : " disabled") + '>' + (active ? "누가 걸렸나요?" : "발동!") + '</button>'
        : '<span class="auto">조건이 되면 자동</span>') + '</div>';
    }).join("") + '</div>';
  }

  function playerButtons(list, act, extraAttr, selected) {
    return '<div class="pbtns">' + list.map(function (p) {
      return '<button type="button" class="pbtn' + (selected && selected.indexOf(p.uid) >= 0 ? " on" : "") + '" data-act="' + act + '" data-uid="' + p.uid + '"' + (extraAttr || "") + '>' + esc(p.name) + (p.uid === api.uid ? " (나)" : "") + '</button>';
    }).join("") + '</div>';
  }

  function panelHtml() {
    var host = api.isHost(), cur = g.turn.uid, h = "";
    if (g.sub) return subHtml();
    if (g.pending) {
      var p = g.pending, mine = p.myCounters || [];
      if (ui.mode && ui.mode.kind === "dodge") {
        return '<p class="big">누가 대신 맞을까요?</p>' + playerButtons(others(), "dodgeTo") + '<button type="button" class="btn ghost" data-act="cancelMode">취소</button>';
      }
      if (mine.length && !p.passed) {
        var cards = g.myHand.filter(function (c) { return mine.indexOf(c.id) >= 0; });
        return '<p class="big">받아칠까요? <span class="secs" data-secs="' + p.until + '"></span></p>'
          + '<div class="counters">' + cards.map(function (c) { return cardHtml(c, " small", 'data-act="counter" data-id="' + c.id + '"'); }).join("") + '</div>'
          + '<button type="button" class="btn ghost" data-act="passCounter">안 막을래요</button>';
      }
      return '<p class="muted">' + (p.eligibleCount ? "다른 사람이 받아칠지 고르는 중…" : "효과를 적용하는 중…") + '</p>';
    }
    if (myTurn() && ui.mode && ui.mode.kind === "play") return targetHtml();
    if (ui.mode && ui.mode.kind === "trigger") {
      return '<p class="big">함정에 누가 걸렸나요?</p><p class="muted">조건을 만족한 사람을 골라요. 양심껏!</p>' + playerButtons(others(), "triggerOn") + '<button type="button" class="btn ghost" data-act="cancelMode">취소</button>';
    }
    if (myTurn()) {
      var t = g.turn;
      h = '<p class="big">내 차례!' + (t.actionsLeft > 1 ? ' <small>(행동 ' + t.actionsLeft + '번 남음)</small>' : "") + '</p>'
        + '<p class="muted">' + (!t.trapSet && !t.acted ? "① 원하면 함정 1장을 먼저 설치하고, " : "") + "카드 1장을 뽑거나 행동 카드 1장을 쓰세요." + (g.locks.noAction ? " (지금은 행동 카드 금지!)" : "") + '</p>'
        + '<div class="row"><button type="button" class="btn" data-act="draw">카드 1장 뽑기</button></div>';
    } else {
      h = '<p class="muted"><b>' + esc(nm(cur)) + '</b>님 차례예요. 카운터와 함정 발동은 언제든 할 수 있어요.</p>';
      if (host && !room.online[cur]) h += '<button type="button" class="btn ghost tiny" data-act="skip">' + esc(nm(cur)) + '님 연결 끊김 · 차례 넘기기</button>';
    }
    return h + selectedHtml();
  }

  function selectedHtml() {
    if (!ui.sel) return '<p class="hint">카드를 누르면 자세히 보고 쓸 수 있어요.</p>';
    var c = g.myHand.find(function (x) { return x.id === ui.sel; });
    if (!c) return "";
    var d = DEF[c.k], btn = "";
    if (d.type === "action") {
      var eff = c.k === "copycat" ? g.lastAction : c.k;
      var ok = myTurn() && free() && g.turn.actionsLeft > 0 && !g.locks.noAction && eff;
      btn = '<button type="button" class="btn blue" data-act="use"' + (ok ? "" : " disabled") + '>' + (ok ? "이 카드 쓰기" : (myTurn() ? (eff ? "지금은 못 써요" : "따라 할 카드가 아직 없어요") : "내 차례에 쓸 수 있어요")) + '</button>'
        + (c.k === "copycat" && g.lastAction ? '<p class="hint">따라 할 카드: 「' + esc(DEF[g.lastAction].name) + '」</p>' : "");
    } else if (d.type === "trap") {
      var can = myTurn() && free() && !g.turn.trapSet && !g.turn.acted;
      btn = '<button type="button" class="btn red" data-act="setTrap"' + (can ? "" : " disabled") + '>' + (can ? "함정 설치" : "내 차례 시작에만 1장 설치할 수 있어요") + '</button>';
    } else {
      btn = '<p class="hint">카운터는 누군가 카드를 냈을 때 받아칠 수 있으면 자동으로 버튼이 떠요.</p>';
    }
    return '<div class="selbox">' + cardHtml(c, " small") + '<div>' + btn + '</div></div>';
  }

  function targetHtml() {
    var m = ui.mode, d = DEF[m.k], h = '<p class="big">「' + esc(DEF[m.card].name) + '」' + (m.card === "copycat" ? " → 「" + esc(d.name) + "」" : "") + '</p><p class="muted">' + esc(d.text) + '</p>';
    var all = g.players;
    if (d.need === "one") h += '<p class="label">누구에게?</p>' + playerButtons(others(), "tgt");
    else if (d.need === "pick1") h += '<p class="label">해당하는 사람은? (양심껏)</p>' + playerButtons(all, "tgt");
    else if (d.need === "trapOwner") {
      var owners = others().filter(function (p) { return p.traps > 0; });
      h += owners.length ? '<p class="label">누구의 함정?</p>' + playerButtons(owners, "tgt") : '<p class="hint">함정을 설치한 사람이 없어요.</p>';
    } else if (d.need === "many") {
      h += '<p class="label">해당하는 사람을 모두 고르세요 (양심껏, 없으면 그냥 확인)</p>' + playerButtons(all, "tgtToggle", "", m.targets)
        + '<button type="button" class="btn blue" data-act="confirmUse">' + m.targets.length + '명으로 쓰기</button>';
    } else if (d.need === "two") {
      h += '<p class="label">' + (m.targets.length === 0 ? "가장 키가 작은 사람은?" : "가장 키가 큰 사람은?") + '</p>'
        + playerButtons(all.filter(function (p) { return m.targets.indexOf(p.uid) < 0; }), "tgtTwo");
    } else if (d.need === "number") {
      h += '<label class="label">새 승리 장수 (1~20) <input id="m-num" type="number" min="1" max="20" value="' + (m.num || 7) + '"></label><button type="button" class="btn blue" data-act="confirmUse">바꾸기</button>';
    } else if (d.need === "give2") {
      var avail = g.myHand.filter(function (c) { return c.id !== m.id; }).length, need = Math.min(2, avail);
      h += '<p class="label">줄 카드 ' + need + '장을 아래 내 손패에서 고르세요 (' + m.cards.length + '/' + need + ')</p>'
        + '<p class="label">누구에게?</p>' + playerButtons(others(), "tgtGive", "", m.targets)
        + '<button type="button" class="btn blue" data-act="confirmUse"' + (m.cards.length === need && m.targets.length ? "" : " disabled") + '>선물하기</button>';
    } else if (d.need === "confirm") {
      h += '<button type="button" class="btn blue" data-act="confirmUse">정말 오늘이 제 생일이에요!</button>';
    }
    return h + '<button type="button" class="btn ghost" data-act="cancelMode">취소</button>';
  }

  function subHtml() {
    var s = g.sub, me = api.uid;
    if (s.type === "pick") {
      if (s.by !== me) return '<p class="muted"><b>' + esc(nm(s.by)) + '</b>님이 카드를 고르는 중… <span class="secs" data-secs="' + s.until + '"></span></p>';
      return '<p class="big">' + (s.src === "deck" ? "카드 더미 위에서 1장을 골라요" : esc(nm(s.from)) + "님의 손패! 1장을 골라 빼앗아요") + ' <span class="secs" data-secs="' + s.until + '"></span></p>'
        + '<div class="counters">' + (s.options || []).map(function (c) { return cardHtml(c, " small", 'data-act="subPick" data-id="' + c.id + '"'); }).join("") + '</div>';
    }
    if (s.type === "rps") {
      var head = '<p class="big">가위바위보! ' + esc(nm(s.a)) + ' vs ' + esc(nm(s.b)) + (s.round > 1 ? " (" + s.round + "판째)" : "") + ' <span class="secs" data-secs="' + s.until + '"></span></p>';
      if ((me === s.a || me === s.b) && !s.myPick) {
        return head + '<div class="rps"><button type="button" data-act="rps" data-h="s">가위</button><button type="button" data-act="rps" data-h="r">바위</button><button type="button" data-act="rps" data-h="p">보</button></div>';
      }
      return head + '<p class="muted">' + (s.myPick ? "냈어요! 상대를 기다리는 중…" : "두 사람이 내는 중…") + ' (' + s.done.length + '/2)</p>';
    }
    if (s.type === "react") {
      if (s.mine !== undefined) return '<p class="big">' + (s.mine < 0 ? "앗, 너무 빨랐어요! 부정 출발!" : "기록: " + s.mine + "ms") + '</p><p class="muted">다른 사람을 기다리는 중… (' + s.pressed.length + '/' + g.players.length + ')</p>';
      return '<p class="big">번개 반응!</p><p class="muted">"지금!"이 뜨면 바로 누르세요. 먼저 누르면 부정 출발이에요.</p>'
        + '<button type="button" class="reactbtn" data-act="react" data-go="' + s.goAt + '">기다려…</button>';
    }
    if (s.type === "vote") {
      if (s.mine) return '<p class="big">' + esc(nm(s.mine)) + '님을 지목했어요</p><p class="muted">모두 지목할 때까지 기다리는 중… (' + s.voted.length + '/' + g.players.length + ')</p>';
      return '<p class="big">범인은 너! 한 명을 지목하세요 <span class="secs" data-secs="' + s.until + '"></span></p>' + playerButtons(others(), "vote");
    }
    if (s.type === "duel") {
      if (me === s.a) return '<p class="big">' + esc(nm(s.b)) + '님과 진짜로 대결하세요!</p><p class="muted">눈싸움, 팔씨름, 손가락 씨름… 끝나면 이긴 사람을 골라요.</p>'
        + playerButtons(g.players.filter(function (p) { return p.uid === s.a || p.uid === s.b; }), "duelWin")
        + '<button type="button" class="btn ghost" data-act="duelWin" data-uid="none">무승부</button>';
      return '<p class="big">' + esc(nm(s.a)) + ' vs ' + esc(nm(s.b)) + ' 맞짱 중!</p><p class="muted">' + esc(nm(s.a)) + '님이 결과를 입력할 거예요.</p>';
    }
    return "";
  }

  function renderHand() {
    var hand = g.myHand || [];
    var giving = ui.mode && ui.mode.kind === "play" && DEF[ui.mode.k].need === "give2";
    var fresh = {};
    hand.forEach(function (c) { if (!knownIds[c.id]) fresh[c.id] = true; knownIds[c.id] = true; });
    var counts = { action: 0, trap: 0, counter: 0 };
    hand.forEach(function (c) { counts[DEF[c.k].type]++; });
    $["m-hand"].innerHTML = '<p class="label">내 손패 <b>' + hand.length + '</b>장 <small>· 행동 ' + counts.action + ' · 함정 ' + counts.trap + ' · 카운터 ' + counts.counter + '</small>'
      + (hand.length === g.target ? ' <span class="chip hot">목표 장수! 다음 내 차례에 시작하면 승리</span>' : "") + '</p>'
      + '<div class="handrow">' + hand.map(function (c) {
        var sel = giving ? ui.mode.cards.indexOf(c.id) >= 0 : ui.sel === c.id;
        var dim = giving && c.id === ui.mode.id;
        return cardHtml(c, (sel ? " sel" : "") + (fresh[c.id] && prevSeq ? " new" : "") + (dim ? " dim" : ""), 'data-act="hand" data-id="' + c.id + '"');
      }).join("") + (hand.length ? "" : '<p class="muted">손패가 텅 비었어요.</p>') + '</div>';
  }

  function tick() {
    if (!g || g.phase !== "play") return;
    root.querySelectorAll("[data-until]").forEach(function (el) {
      var until = +el.getAttribute("data-until"), total = +el.getAttribute("data-total");
      el.style.width = Math.max(0, Math.min(100, (until - now()) / total * 100)) + "%";
    });
    root.querySelectorAll("[data-secs]").forEach(function (el) {
      el.textContent = Math.max(0, Math.ceil((+el.getAttribute("data-secs") - now()) / 1000)) + "초";
    });
    var rb = root.querySelector(".reactbtn");
    if (rb) {
      var go = now() >= +rb.getAttribute("data-go");
      rb.classList.toggle("go", go);
      rb.textContent = go ? "지금!!" : "기다려…";
      if (go && !reactBeeped) { reactBeeped = true; api.sfx.play("turn"); }
    } else reactBeeped = false;
  }

  // ---------- 클릭 ----------
  function startUse(c) {
    var k = c.k === "copycat" ? g.lastAction : c.k;
    if (!k) return;
    var d = DEF[k];
    if (!d.need || d.need === "none") { api.act("play", { id: c.id }); ui.sel = null; return; }
    ui.mode = { kind: "play", id: c.id, card: c.k, k: k, targets: [], cards: [], num: 7 };
    render();
  }
  function sendUse() {
    var m = ui.mode, d = DEF[m.k];
    var msg = { id: m.id, targets: m.targets };
    if (d.need === "number") msg.num = Math.max(1, Math.min(20, Math.round(m.num || 7)));
    if (d.need === "give2") msg.cards = m.cards;
    if (d.need === "confirm") msg.confirm = true;
    api.act("play", msg);
    ui.mode = null; ui.sel = null;
    render();
  }
  function render() { if (g && g.phase === "play") renderGame(); }

  function onClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), id = b.getAttribute("data-id"), u = b.getAttribute("data-uid");
    var m = ui.mode;
    switch (a) {
      case "dir": api.act("dir", { dir: +b.getAttribute("data-dir") }); break;
      case "start": api.sfx.play("pop"); api.act("start"); break;
      case "restart": api.act("restart"); break;
      case "draw": api.act("draw"); ui.sel = null; break;
      case "skip": api.act("skip"); break;
      case "hand":
        if (m && m.kind === "play" && DEF[m.k].need === "give2") {
          if (id === m.id) return;
          var i = m.cards.indexOf(id), need = Math.min(2, g.myHand.length - 1);
          if (i >= 0) m.cards.splice(i, 1); else if (m.cards.length < need) m.cards.push(id);
        } else ui.sel = ui.sel === id ? null : id;
        api.sfx.play("pop");
        render();
        break;
      case "use": { var c = g.myHand.find(function (x) { return x.id === ui.sel; }); if (c) startUse(c); break; }
      case "setTrap": api.act("setTrap", { id: ui.sel }); ui.sel = null; break;
      case "tgt": m.targets = [u]; sendUse(); break;
      case "tgtToggle": { var j = m.targets.indexOf(u); if (j >= 0) m.targets.splice(j, 1); else m.targets.push(u); render(); break; }
      case "tgtTwo": m.targets.push(u); if (m.targets.length === 2) sendUse(); else render(); break;
      case "tgtGive": m.targets = [u]; render(); break;
      case "confirmUse": sendUse(); break;
      case "cancelMode": ui.mode = null; render(); break;
      case "trigger": ui.mode = { kind: "trigger", id: id }; render(); break;
      case "triggerOn": api.act("trigger", { id: m.id, target: u }); ui.mode = null; break;
      case "counter": {
        var card = g.myHand.find(function (x) { return x.id === id; });
        if (card && card.k === "cDodge") { ui.mode = { kind: "dodge", id: id }; render(); }
        else api.act("counter", { id: id });
        break;
      }
      case "dodgeTo": api.act("counter", { id: m.id, target: u }); ui.mode = null; break;
      case "passCounter": api.act("passCounter"); break;
      case "subPick": api.act("sub", { id: id }); break;
      case "rps": api.act("sub", { hand: b.getAttribute("data-h") }); break;
      case "react": api.act("sub", {}); break;
      case "vote": api.act("sub", { target: u }); break;
      case "duelWin": api.act("sub", { winner: u }); break;
    }
  }

  // ---------- 끝 ----------
  function renderEnd() {
    var w = g.winner || {};
    $["m-end"].innerHTML = '<div class="trophy" aria-hidden="true"><i class="top"></i><i class="cup"></i></div><h2>' + esc(nm(w.uid)) + '님 승리!</h2><p class="muted">' + esc(w.reason || "") + '</p>'
      + '<ul class="plist">' + (g.players || []).map(function (p) { return '<li' + (p.uid === w.uid ? ' class="win"' : "") + '>' + esc(p.name) + '<span class="cnt">' + p.count + '장</span></li>'; }).join("") + '</ul>'
      + (api.isHost() ? '<button type="button" class="btn block" data-act="restart">한 판 더 (대기실로)</button>' : '<p class="waitline">방장이 한 판 더를 누르면 대기실로 돌아가요.</p>')
      + '<details class="rules"><summary>마지막 기록</summary><ul>' + (g.log || []).slice().reverse().map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + '</ul></details>';
  }

  return { mount: mount, update: update, unmount: unmount, cardHtml: function (c, x) { api = api || { esc: function (s) { return String(s); } }; return cardHtml(c, x); } };
})();
