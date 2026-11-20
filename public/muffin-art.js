// 머핀타임 카드 일러스트 (asdfmovie풍: 큰 머리 + 막대 몸 + 굵은 선). 서버 없이 SVG 문자열로 그려요.
// 브라우저에선 window.MuffinArt.render(카드키), Node에선 require(...).render(카드키)
(function (root) {
  "use strict";
  var K = "#1d1d24";
  var SK = ' stroke="' + K + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

  function ln(x1, y1, x2, y2) { return '<path d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '"/>'; }
  function txt(x, y, s, size, color, rot) {
    return '<text x="' + x + '" y="' + y + '" font-family="Jua, sans-serif" font-size="' + (size || 12) + '" text-anchor="middle" fill="' + (color || K) + '"'
      + (rot ? ' transform="rotate(' + rot + " " + x + " " + y + ')"' : "") + '>' + s + "</text>";
  }

  // ---------- 얼굴 ----------
  function face(mood, light) {
    var c = light ? "#fff" : K, e = "", m = "";
    var dot = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 1.7) + '" fill="' + c + '"/>'; };
    var p = function (d, w) { return '<path d="' + d + '" stroke="' + c + '" stroke-width="' + (w || 1.8) + '" fill="none" stroke-linecap="round"/>'; };
    switch (mood) {
      case "dumb":
        e = '<circle cx="-4.5" cy="-2" r="3.3" fill="#fff" stroke="' + c + '" stroke-width="1.4"/>' + dot(-3.6, -1.4, 1.3) + dot(4.8, -1, 1.2);
        m = '<ellipse cx="1" cy="5.5" rx="3" ry="2.4" fill="' + c + '"/><ellipse cx="1.6" cy="6.8" rx="1.6" ry="1" fill="#ff7b8a"/>';
        break;
      case "shock":
        e = '<circle cx="-4.5" cy="-2" r="2.9" fill="#fff" stroke="' + c + '" stroke-width="1.4"/><circle cx="4.5" cy="-2" r="2.9" fill="#fff" stroke="' + c + '" stroke-width="1.4"/>' + dot(-4.5, -2, .9) + dot(4.5, -2, .9);
        m = '<ellipse cx="0" cy="6" rx="2.3" ry="3" fill="' + c + '"/>';
        break;
      case "smug":
        e = p("M-7.5 -2.5 L-2 -2.5") + p("M2 -2.5 L7.5 -2.5") + dot(-4.2, -1, 1.2) + dot(5.2, -1, 1.2);
        m = p("M-3 5 Q2 7.5 5.5 3");
        break;
      case "sad":
        e = dot(-4.5, -1.5) + dot(4.5, -1.5) + '<path d="M-6.5 1 q-1 2.5 .3 3.4 q1.3 -.9 -.3 -3.4z" fill="#6ec6ff"/>';
        m = p("M-4 7 Q0 3 4 7");
        break;
      case "sleepy":
        e = p("M-7 -1.5 Q-4.5 .8 -2 -1.5") + p("M2 -1.5 Q4.5 .8 7 -1.5");
        m = '<ellipse cx="0" cy="5.5" rx="1.6" ry="2" fill="' + c + '"/>';
        break;
      case "yawn":
        e = p("M-7 -2 Q-4.5 -.5 -2 -2") + p("M2 -2 Q4.5 -.5 7 -2");
        m = '<ellipse cx="0" cy="5.5" rx="3.6" ry="4" fill="' + c + '"/>';
        break;
      case "wink":
        e = dot(-4.5, -1.5) + p("M2 -1 L4.5 -3.2 L7 -1");
        m = p("M-4 3.5 Q0 8 4 3.5");
        break;
      case "angry":
        e = dot(-4.5, -.8) + dot(4.5, -.8) + p("M-8 -6 L-2 -3.6", 2) + p("M8 -6 L2 -3.6", 2);
        m = p("M-3.5 6 L3.5 6");
        break;
      case "love":
        e = '<path d="M-4.5 0 l-2.6 -2.6 a1.5 1.5 0 0 1 2.6 -1.6 a1.5 1.5 0 0 1 2.6 1.6z" fill="#ff4d6d"/><path d="M4.5 0 l-2.6 -2.6 a1.5 1.5 0 0 1 2.6 -1.6 a1.5 1.5 0 0 1 2.6 1.6z" fill="#ff4d6d"/>';
        m = p("M-4 4 Q0 8 4 4");
        break;
      case "cry":
        e = p("M-7 -1 Q-4.5 -3.5 -2 -1") + p("M2 -1 Q4.5 -3.5 7 -1") + '<path d="M-5 0 L-6 9 M5 0 L6 9" stroke="#6ec6ff" stroke-width="2.2"/>';
        m = p("M-3.5 6.5 Q0 3.5 3.5 6.5");
        break;
      case "evil":
        e = dot(-4.5, -.8) + dot(4.5, -.8) + p("M-8 -5 L-2 -3", 2) + p("M8 -5 L2 -3", 2);
        m = p("M-5 3.5 Q0 9 5 3.5 Z");
        break;
      case "blank":
        e = dot(-4.5, -1.5, 1.3) + dot(4.5, -1.5, 1.3);
        m = p("M-2.5 5.5 L2.5 5.5");
        break;
      default:
        e = dot(-4.5, -1.5) + dot(4.5, -1.5);
        m = p("M-4 3.5 Q0 7.5 4 3.5");
    }
    return e + m;
  }

  // ---------- 머리 ----------
  var SKIN = "#ffe0cc";
  function head(who, mood, opt) {
    opt = opt || {};
    var h = "";
    switch (who) {
      case "jihun": // 노란 새
        h = '<circle r="12" fill="#ffd23f"' + SK + '/>'
          + '<path d="M-1 -12 Q1 -19 5 -13"' + SK + ' fill="none"/>'
          + (opt.nobeak ? "" : '<path d="M10 -1 L18 2 L10 5 Z" fill="#ff8c2a"' + SK + '/>')
          + '<g transform="translate(-1,0)">' + face(mood) + "</g>";
        break;
      case "coco": // 고라니
        h = '<ellipse cx="-11" cy="-9" rx="4" ry="8" fill="#9c6d45"' + SK + ' transform="rotate(-38 -11 -9)"/>'
          + '<ellipse cx="11" cy="-9" rx="4" ry="8" fill="#9c6d45"' + SK + ' transform="rotate(38 11 -9)"/>'
          + '<circle r="12" fill="#b5835a"' + SK + '/>'
          + '<ellipse cx="0" cy="5" rx="6.5" ry="4.6" fill="#ead3b5"/>'
          + face(mood === "dumb" ? "dumb" : mood).replace(/cy="5\.5"|cy="6"|cy="7"/g, 'cy="6.5"')
          + '<ellipse cx="0" cy="2.6" rx="2.2" ry="1.5" fill="' + K + '"/>'
          + '<path d="M-3 8.2 L-2 12 L-1 8.2 Z M1 8.2 L2 12 L3 8.2 Z" fill="#fff" stroke="' + K + '" stroke-width="1" stroke-linejoin="round"/>';
        break;
      case "isang": // 핑크 머리 (조이)
        h = '<path d="M-14 -3 C-17 8 -14 17 -9 20 L9 20 C14 17 17 8 14 -3 Z" fill="#ff6fae"' + SK + '/>'
          + '<circle r="12" fill="' + SKIN + '"' + SK + '/>'
          + '<path d="M-12.5 -2 C-12 -14 12 -14 12.5 -2 C9 -8 4 -7 1 -10 C-2 -7 -8 -8 -12.5 -2 Z" fill="#ff6fae"' + SK + '/>'
          + '<path d="M9 -10 l1.3 2.6 2.8 .4 -2 2 .5 2.8 -2.6 -1.3 -2.6 1.3 .5 -2.8 -2 -2 2.8 -.4z" fill="#ffe14a" stroke="' + K + '" stroke-width="1"/>'
          + face(mood);
        break;
      case "jinu": // 디스코드 얼굴
        h = '<path d="M-12 -4 C-12 -13 12 -13 12 -4 L13 6 C13 12 -13 12 -13 6 Z" fill="#fff"' + SK + '/>'
          + '<path d="M-8 -11 L-11 -16 M8 -11 L11 -16"' + SK + ' fill="none"/>'
          + (mood === "happy" || !mood
            ? '<ellipse cx="-4.5" cy="-1" rx="2.1" ry="2.9" fill="' + K + '"/><ellipse cx="4.5" cy="-1" rx="2.1" ry="2.9" fill="' + K + '"/><path d="M-4.5 5 Q0 8.5 4.5 5" stroke="' + K + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
            : face(mood));
        break;
      case "jaedam": // 파란 트윈테일 (그웬)
      case "wig": // 재담이 콜린 가발 쓴 모습 (부캐)
        h = '<ellipse cx="-14" cy="6" rx="5" ry="10" fill="#57c7ff"' + SK + '/>'
          + '<ellipse cx="14" cy="6" rx="5" ry="10" fill="#57c7ff"' + SK + '/>'
          + '<circle r="12" fill="' + SKIN + '"' + SK + '/>';
        if (who === "jaedam") {
          h += '<path d="M-12.5 -1 C-12 -14 12 -14 12.5 -1 C8 -7 5 -5 2 -9 C0 -5 -6 -6 -12.5 -1 Z" fill="#57c7ff"' + SK + '/>'
            + '<path d="M-14 -7 l-4 -3 l1 5 z M14 -7 l4 -3 l-1 5 z" fill="' + K + '"/>';
        } else {
          h += '<path d="M-13 0 C-14 -15 14 -16 13 0 L10 -6 L7 -2 L4 -8 L0 -3 L-4 -8 L-7 -2 L-10 -6 Z" fill="#ffe08a"' + SK + '/>';
        }
        h += face(mood);
        break;
      case "colin": // 금발 미소년
        h = '<circle r="12" fill="' + SKIN + '"' + SK + '/>'
          + '<path d="M-13 0 C-14 -15 14 -16 13 0 L10 -6 L7 -2 L4 -8 L0 -3 L-4 -8 L-7 -2 L-10 -6 Z" fill="#ffe08a"' + SK + '/>'
          + face(mood || "wink")
          + '<path d="M15 -12 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1z" fill="#fff" stroke="' + K + '" stroke-width=".8"/>';
        break;
      case "prss": // 검정 (어르신)
        h = '<circle r="12" fill="#17171b"' + SK + '/>' + face(mood, true)
          + '<circle cx="-4.5" cy="-1.5" r="3.6" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="4.5" cy="-1.5" r="3.6" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M-1 -1.5 L1 -1.5" stroke="#fff" stroke-width="1.2"/>';
        break;
      default: // 흰 머리 막대 사람
        h = '<circle r="12" fill="#fff"' + SK + '/>' + face(mood);
    }
    return h;
  }

  // ---------- 장신구 (머리 기준) ----------
  function acc(list) {
    if (!list) return "";
    return list.map(function (a) {
      switch (a) {
        case "crown": return '<path d="M-9 -12 L-10 -21 L-5 -16 L0 -23 L5 -16 L10 -21 L9 -12 Z" fill="#ffcf33"' + SK + '/>';
        case "tophat": return '<path d="M-11 -11 L11 -11 M-7 -11 L-7 -26 L7 -26 L7 -11"' + SK + ' fill="#2c2c3a"/><rect x="-7" y="-15" width="14" height="3" fill="#ff4d6d"/>';
        case "specs": return '<circle cx="-4.5" cy="-1.5" r="3.6" fill="none" stroke="' + K + '" stroke-width="1.3"/><circle cx="4.5" cy="-1.5" r="3.6" fill="none" stroke="' + K + '" stroke-width="1.3"/><path d="M-1 -1.5 L1 -1.5" stroke="' + K + '" stroke-width="1.3"/>';
        case "shades": return '<rect x="-9" y="-4.5" width="7.5" height="5" rx="2" fill="' + K + '"/><rect x="1.5" y="-4.5" width="7.5" height="5" rx="2" fill="' + K + '"/><path d="M-1.5 -3 L1.5 -3" stroke="' + K + '" stroke-width="1.4"/>';
        case "nightcap": return '<path d="M-11 -8 C-8 -20 6 -22 14 -12 L16 -4" fill="#6b8cff"' + SK + '/><circle cx="16" cy="-3" r="3" fill="#fff"' + SK + '/>';
        case "bonnet": return '<path d="M-14 4 C-16 -18 16 -18 14 4" fill="none" stroke="#ff9ec4" stroke-width="5"/><path d="M-13 6 L-17 12 M13 6 L17 12" stroke="#ff9ec4" stroke-width="2"/>';
        case "pacifier": return '<circle cx="0" cy="6" r="3.2" fill="#ffb3d1"' + SK + '/>';
        case "chef": return '<path d="M-9 -11 L-9 -17 C-14 -18 -13 -26 -7 -24 C-6 -29 6 -29 7 -24 C13 -26 14 -18 9 -17 L9 -11 Z" fill="#fff"' + SK + '/>';
        case "party": return '<path d="M-6 -11 L0 -27 L6 -11 Z" fill="#ff6fae"' + SK + '/><circle cx="0" cy="-27" r="2.4" fill="#ffd23f"/>';
        case "bandage": return '<path d="M3 -9 L9 -5 M7 -10 L5 -4" stroke="#f2c38f" stroke-width="3.2" stroke-linecap="round"/>';
        case "mic": return "";
        default: return "";
      }
    }).join("");
  }

  // ---------- 사람 ----------
  // o: x, y(발 위치), s(크기), mood, arms, legs, flip, rot, alpha, acc[], under(몸 뒤에), over(머리 위에), nobeak
  var ARMS = {
    down: [[-9, -15], [9, -15]], up: [[-11, -42], [11, -42]], cheer: [[-14, -40], [14, -40]],
    wave: [[-9, -15], [13, -42]], hold: [[-6, -19], [13, -22]], point: [[-9, -15], [18, -29]],
    out: [[-16, -25], [16, -25]], give: [[12, -23], [14, -21]], grab: [[16, -30], [17, -25]]
  };
  var LEGS = {
    stand: [[-6, 0], [6, 0]], run: [[-11, -3], [9, -7]], wide: [[-11, 0], [11, 0]], sit: [[-11, -12], [11, -12]],
    kick: [[-6, 0], [15, -10]], tip: [[-3, 0], [3, 0]], air: [[-8, -4], [8, -4]]
  };
  function fig(who, o) {
    o = o || {};
    var x = o.x == null ? 80 : o.x, y = o.y == null ? 86 : o.y, s = o.s || 1;
    var arms = o.arms || "down", legs = o.legs || "stand";
    var b = ln(0, -31, 0, -15);
    if (arms === "hip") b += '<path d="M0 -27 L-8 -21 L-3 -16"/><path d="M0 -27 L8 -21 L3 -16"/>';
    else if (arms === "cross") b += '<path d="M0 -27 L-7 -21 L7 -24"/><path d="M0 -27 L7 -21 L-7 -24"/>';
    else if (arms === "stretch") b += '<path d="M0 -27 C12 -40 22 -14 34 -26 C42 -34 50 -22 58 -28"/><path d="M0 -27 C-10 -16 -22 -36 -34 -24 C-42 -16 -50 -28 -58 -22"/>';
    else if (ARMS[arms]) b += ln(0, -27, ARMS[arms][0][0], ARMS[arms][0][1]) + ln(0, -27, ARMS[arms][1][0], ARMS[arms][1][1]);
    var L = LEGS[legs] || LEGS.stand;
    b += ln(0, -15, L[0][0], L[0][1]) + ln(0, -15, L[1][0], L[1][1]);
    var tf = "translate(" + x + "," + y + ") scale(" + (o.flip ? -s : s) + "," + s + ")" + (o.rot ? " rotate(" + o.rot + ")" : "");
    return '<g transform="' + tf + '"' + (o.alpha ? ' opacity="' + o.alpha + '"' : "") + '>'
      + (o.under || "")
      + '<g stroke="' + K + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none">' + b + "</g>"
      + '<g transform="translate(0,-43)">' + head(who, o.mood, o) + acc(o.acc) + "</g>"
      + (o.over || "") + "</g>";
  }
  // 머리만
  function headOnly(who, x, y, s, mood, extra) {
    return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')">' + head(who, mood, {}) + (extra || "") + "</g>";
  }

  // ---------- 소품 ----------
  var P = {
    card: function (x, y, rot, color) {
      return '<g transform="translate(' + x + "," + y + ") rotate(" + (rot || 0) + ')"><rect x="-6" y="-8.5" width="12" height="17" rx="2" fill="#fff"' + SK + '/><rect x="-6" y="-8.5" width="12" height="4.5" rx="1.5" fill="' + (color || "#49b4e3") + '"/></g>';
    },
    fan: function (x, y, n, color) {
      var s = "";
      for (var i = 0; i < n; i++) s += P.card(x + (i - (n - 1) / 2) * 7, y + Math.abs(i - (n - 1) / 2) * 1.6, (i - (n - 1) / 2) * 14, color);
      return s;
    },
    heart: function (x, y, s, broken) {
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><path d="M0 6 L-7 -1 A4 4 0 0 1 0 -6 A4 4 0 0 1 7 -1 Z" fill="#ff4d6d"' + SK + '/>'
        + (broken ? '<path d="M0 -5 L-2 -1 L1.5 1 L-1 5" stroke="#fff" stroke-width="1.6" fill="none"/>' : "") + "</g>";
    },
    boom: function (x, y, s, word) {
      var pts = [], n = 12;
      for (var i = 0; i < n * 2; i++) { var r = i % 2 ? 9 : 17, a = Math.PI * i / n; pts.push((Math.cos(a) * r).toFixed(1) + "," + (Math.sin(a) * r).toFixed(1)); }
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><polygon points="' + pts.join(" ") + '" fill="#ffb02e"' + SK + '/><circle r="7" fill="#fff36b"/>'
        + (word ? txt(0, 4.5, word, 10, "#c4260f") : "") + "</g>";
    },
    sparkle: function (x, y, s, color) {
      return '<path transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill="' + (color || "#fff6a8") + '" stroke="' + K + '" stroke-width=".9"/>';
    },
    sweat: function (x, y) { return '<path d="M' + x + " " + y + ' q-3 5 0 6 q3 -1 0 -6z" fill="#6ec6ff" stroke="' + K + '" stroke-width=".9"/>'; },
    zzz: function (x, y) { return txt(x, y, "Z", 11, "#5b6cff", -10) + txt(x + 8, y - 8, "z", 9, "#5b6cff", -10); },
    notes: function (x, y) { return txt(x, y, "♪", 14, "#7a4cff") + txt(x + 11, y - 8, "♫", 12, "#ff4d9d"); },
    q: function (x, y, s) { return txt(x, y, "?", s || 16, "#ff4d6d"); },
    bang: function (x, y, s) { return txt(x, y, "!", s || 16, "#ff4d6d"); },
    bubble: function (x, y, word, w) {
      w = w || word.length * 9 + 10;
      return '<g transform="translate(' + x + "," + y + ')"><rect x="' + (-w / 2) + '" y="-10" width="' + w + '" height="18" rx="8" fill="#fff"' + SK + '/><path d="M-3 8 L-7 14 L3 8" fill="#fff"' + SK + '/><rect x="-5" y="5" width="9" height="4" fill="#fff"/>' + txt(0, 4, word, 10.5) + "</g>";
    },
    speed: function (x, y, flip) {
      var d = flip ? 1 : -1;
      return '<g stroke="' + K + '" stroke-width="1.8" stroke-linecap="round" opacity=".55"><path d="M' + x + " " + y + " l" + (d * 14) + ' 0"/><path d="M' + (x + d * 3) + " " + (y + 6) + " l" + (d * 12) + ' 0"/><path d="M' + x + " " + (y - 6) + " l" + (d * 10) + ' 0"/></g>';
    },
    mine: function (x, y) { return '<path d="M' + (x - 12) + " " + y + " A12 9 0 0 1 " + (x + 12) + " " + y + ' Z" fill="#555a66"' + SK + '/><circle cx="' + x + '" cy="' + (y - 7) + '" r="2.4" fill="#ff3b3b"/>'; },
    trash: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-11 -20 L-9 0 L9 0 L11 -20 Z" fill="#9aa3b2"' + SK + '/><path d="M-13 -22 L13 -22"' + SK + '/><path d="M-4 -16 L-3 -4 M4 -16 L3 -4"' + SK + '/></g>'; },
    bridge: function () { return '<path d="M-2 40 Q80 -10 162 40 L162 48 Q80 2 -2 48 Z" fill="#c79a6b"' + SK + '/><path d="M30 26 L30 44 M130 26 L130 44 M80 14 L80 30"' + SK + '/>'; },
    lemon: function (x, y, s) { return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><ellipse rx="7" ry="5" fill="#ffe14a"' + SK + '/><path d="M6 -2 l3 -2"' + SK + '/></g>'; },
    potato: function (x, y, s, dead) {
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><path d="M-10 -2 C-10 -10 8 -12 11 -3 C13 6 -8 10 -10 -2 Z" fill="#c9995e"' + SK + '/>'
        + (dead ? '<path d="M-6 -5 l3 3 m0 -3 l-3 3 M2 -6 l3 3 m0 -3 l-3 3" stroke="' + K + '" stroke-width="1.4"/>' : '<circle cx="-4" cy="-3" r="1.2" fill="' + K + '"/><circle cx="3" cy="-4" r="1.2" fill="' + K + '"/>') + "</g>";
    },
    camera: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-10" y="-7" width="20" height="14" rx="3" fill="#3d4150"' + SK + '/><circle r="4.5" fill="#9fd3ff"' + SK + '/><rect x="3" y="-11" width="6" height="4" fill="#3d4150"' + SK + '/></g>'; },
    flash: function (x, y) { return P.sparkle(x, y, 2.2, "#fff"); },
    train: function (x, y) {
      return '<g transform="translate(' + x + "," + y + ')"><rect x="-30" y="-22" width="44" height="20" rx="4" fill="#ff6b5a"' + SK + '/><rect x="14" y="-14" width="14" height="12" rx="2" fill="#ff6b5a"' + SK + '/>'
        + '<rect x="-24" y="-18" width="10" height="9" fill="#cfefff"' + SK + '/><rect x="-8" y="-18" width="10" height="9" fill="#cfefff"' + SK + '/>'
        + '<circle cx="-20" cy="0" r="4.5" fill="#3d4150"' + SK + '/><circle cx="0" cy="0" r="4.5" fill="#3d4150"' + SK + '/><circle cx="20" cy="0" r="4.5" fill="#3d4150"' + SK + '/>'
        + '<rect x="20" y="-24" width="5" height="10" fill="#3d4150"' + SK + '/><circle cx="28" cy="-30" r="4" fill="#fff" opacity=".8"/><circle cx="36" cy="-35" r="5" fill="#fff" opacity=".7"/></g>';
    },
    medal: function (x, y, s, gold) {
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><path d="M-5 -14 L-2 -4 M5 -14 L2 -4" stroke="#5b6cff" stroke-width="3"/><circle r="7.5" fill="' + (gold ? "#ffcf33" : "#cfd6de") + '"' + SK + '/>' + txt(0, 3.5, gold ? "G" : "S", 9, K) + "</g>";
    },
    button: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-12" y="-6" width="24" height="8" rx="2" fill="#555a66"' + SK + '/><ellipse cx="0" cy="-7" rx="8" ry="4" fill="#ff3b3b"' + SK + '/></g>'; },
    coin: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><ellipse rx="6" ry="6" fill="#ffcf33"' + SK + '/>' + txt(0, 3.5, "₩", 8) + "</g>"; },
    clock: function (x, y, s, label) {
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><circle r="10" fill="#fff"' + SK + '/><path d="M0 0 L0 -6 M0 0 L-5 0"' + SK + '/>' + (label ? txt(0, 20, label, 9) : "") + "</g>";
    },
    moon: function (x, y) { return '<path d="M' + x + " " + (y - 14) + " A14 14 0 1 0 " + (x + 10) + " " + (y + 10) + " A11 11 0 1 1 " + x + " " + (y - 14) + ' Z" fill="#fff3a6"' + SK + '/>'; },
    map: function (x, y) {
      return '<g transform="translate(' + x + "," + y + ')"><path d="M-16 -11 L-5 -8 L5 -11 L16 -8 L16 11 L5 8 L-5 11 L-16 8 Z" fill="#f3e1b3"' + SK + '/><path d="M-10 3 Q-3 -6 4 2" stroke="' + K + '" stroke-width="1.2" stroke-dasharray="2 2" fill="none"/><path d="M6 -2 l5 5 m0 -5 l-5 5" stroke="#e5484d" stroke-width="2.2"/></g>';
    },
    stairs: function () { return '<path d="M30 86 L30 70 L60 70 L60 56 L90 56 L90 42 L130 42 L130 86 Z" fill="#cfd6de"' + SK + '/>'; },
    notebook: function (x, y) { return '<g transform="translate(' + x + "," + y + ') rotate(-8)"><rect x="-9" y="-12" width="18" height="22" rx="2" fill="#fff"' + SK + '/><path d="M-5 -6 L5 -6 M-5 -2 L5 -2"' + SK + '/>' + txt(1, 8, "A+", 8, "#e5484d") + "</g>"; },
    bag: function (x, y, color) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-6 -10 Q0 -17 6 -10"' + SK + ' fill="none"/><rect x="-9" y="-10" width="18" height="15" rx="3" fill="' + (color || "#ff9ec4") + '"' + SK + '/></g>'; },
    gift: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-8" y="-8" width="16" height="14" fill="#7c6cf0"' + SK + '/><path d="M0 -8 L0 6 M-8 -2 L8 -2" stroke="#ffd23f" stroke-width="3"/><path d="M0 -8 C-6 -15 -9 -8 0 -8 C9 -8 6 -15 0 -8" fill="#ffd23f"' + SK + '/></g>'; },
    table: function (x, y, flipped) {
      return flipped
        ? '<g transform="translate(' + x + "," + y + ') rotate(-28)"><rect x="-22" y="-4" width="44" height="6" fill="#c79a6b"' + SK + '/><path d="M-17 2 L-17 14 M17 2 L17 14"' + SK + '/></g>'
        : '<rect x="' + (x - 26) + '" y="' + (y - 4) + '" width="52" height="6" fill="#c79a6b"' + SK + '/><path d="M' + (x - 20) + " " + (y + 2) + " L" + (x - 20) + " " + (y + 18) + " M" + (x + 20) + " " + (y + 2) + " L" + (x + 20) + " " + (y + 18) + '"' + SK + '/>';
    },
    banana: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-10 0 C-6 -7 6 -7 10 0 C5 -3 -5 -3 -10 0 Z" fill="#ffe14a"' + SK + '/><path d="M0 -4 L-8 4 M0 -4 L8 4"' + SK + ' fill="none"/></g>'; },
    hill: function (dir) { return dir === "up" ? '<path d="M0 90 L160 40 L160 90 Z" fill="#9be07a"' + SK + '/>' : '<path d="M0 72 Q60 54 110 66 T170 64 L170 92 L0 92 Z" fill="#7fc965"' + SK + '/>'; },
    arrowUp: function (x, y) {
      var a = ' stroke="#ff4d6d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
      return '<path d="M' + x + " " + y + ' q14 -18 30 -24"' + a + '/><path d="M' + (x + 24) + " " + (y - 29) + " L" + (x + 31) + " " + (y - 24) + " L" + (x + 23) + " " + (y - 20) + '"' + a + "/>";
    },
    bench: function (x, y) { return '<rect x="' + (x - 22) + '" y="' + (y - 4) + '" width="44" height="5" fill="#c79a6b"' + SK + '/><path d="M' + (x - 18) + " " + y + " L" + (x - 18) + " " + (y + 12) + " M" + (x + 18) + " " + y + " L" + (x + 18) + " " + (y + 12) + '"' + SK + '/>'; },
    cane: function (x, y, h) {
      h = h || 26;
      return '<path d="M' + x + " " + y + " L" + x + " " + (y - h) + ' q0 -6 -6 -6" stroke="#8a5a33" stroke-width="3" fill="none" stroke-linecap="round"/>';
    },
    road: function () { return '<rect x="0" y="62" width="160" height="28" fill="#5d6270"/><path d="M6 77 L26 77 M46 77 L66 77 M86 77 L106 77 M126 77 L146 77" stroke="#fff" stroke-width="3"/>'; },
    car: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-22 -2 L-20 -12 L-10 -20 L10 -20 L18 -12 L24 -10 L24 -2 Z" fill="#5cc8ff"' + SK + '/><rect x="-8" y="-17" width="14" height="6" fill="#cfefff"' + SK + '/><circle cx="-12" cy="0" r="5" fill="#3d4150"' + SK + '/><circle cx="14" cy="0" r="5" fill="#3d4150"' + SK + '/><circle cx="24" cy="-8" r="2.4" fill="#fff36b"/></g>'; },
    factory: function () {
      return '<path d="M10 80 L10 40 L36 52 L36 40 L62 52 L62 30 L74 30 L74 80 Z" fill="#cfd6de"' + SK + '/><circle cx="68" cy="20" r="5" fill="#fff" opacity=".8"/><circle cx="76" cy="12" r="6" fill="#fff" opacity=".7"/>'
        + '<rect x="0" y="80" width="160" height="10" fill="#9aa3b2"' + SK + '/>' + P.muffin(112, 79) + P.muffin(131, 79) + P.muffin(150, 79);
    },
    muffin: function (x, y, s) {
      return '<g transform="translate(' + x + "," + y + ") scale(" + (s || 1) + ')"><path d="M-7 -6 L7 -6 L5 0 L-5 0 Z" fill="#f6efe2"' + SK + '/><ellipse cx="0" cy="-8" rx="8" ry="5.5" fill="#f2a65a"' + SK + '/><circle cx="-3" cy="-9" r="1.3" fill="#6b5bd0"/><circle cx="3" cy="-7" r="1.3" fill="#6b5bd0"/></g>';
    },
    scissors: function (x, y, rot) {
      return '<g transform="translate(' + x + "," + y + ") rotate(" + (rot || 0) + ')"><circle cx="-6" cy="5" r="3.5" fill="none"' + SK + '/><circle cx="6" cy="5" r="3.5" fill="none"' + SK + '/><path d="M-3.5 2.5 L5 -12 M3.5 2.5 L-5 -12" stroke="#cfd6de" stroke-width="3.2" stroke-linecap="round"/><path d="M-3.5 2.5 L5 -12 M3.5 2.5 L-5 -12" stroke="' + K + '" stroke-width="1"/></g>';
    },
    needle: function (x, y, rot) { return '<g transform="translate(' + x + "," + y + ") rotate(" + (rot || 0) + ')"><path d="M0 0 L0 -32" stroke="#cfd6de" stroke-width="3.4" stroke-linecap="round"/><path d="M0 0 L0 -32" stroke="' + K + '" stroke-width="1"/><ellipse cx="0" cy="-28" rx="1" ry="2.4" fill="#fff" stroke="' + K + '" stroke-width=".8"/></g>'; },
    house: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-24 0 L-24 -26 L0 -44 L24 -26 L24 0 Z" fill="#ffd9a8"' + SK + '/><rect x="-7" y="-18" width="14" height="18" fill="#9c6d45"' + SK + '/></g>'; },
    dog: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><ellipse cx="0" cy="-5" rx="9" ry="6" fill="#e8c39a"' + SK + '/><circle cx="9" cy="-11" r="5.5" fill="#e8c39a"' + SK + '/><ellipse cx="7" cy="-15" rx="2.4" ry="4" fill="#9c6d45"' + SK + '/><circle cx="11" cy="-12" r="1" fill="' + K + '"/><path d="M-9 -6 q-5 -4 -6 -8"' + SK + ' fill="none"/></g>'; },
    cat: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><circle r="8" fill="#ffb066"' + SK + '/><path d="M-7 -4 L-6 -12 L-1 -7 M7 -4 L6 -12 L1 -7" fill="#ffb066"' + SK + '/><circle cx="-3" cy="-1" r="1.2" fill="' + K + '"/><circle cx="3" cy="-1" r="1.2" fill="' + K + '"/><path d="M-2 3 L0 4 L2 3"' + SK + ' fill="none"/></g>'; },
    cake: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-16" y="-14" width="32" height="14" rx="2" fill="#ffb3d1"' + SK + '/><path d="M-16 -9 Q-8 -5 0 -9 T16 -9"' + SK + ' fill="none"/><path d="M-6 -14 L-6 -22 M0 -14 L0 -22 M6 -14 L6 -22"' + SK + '/><circle cx="-6" cy="-24" r="2" fill="#ffb02e"/><circle cx="0" cy="-24" r="2" fill="#ffb02e"/><circle cx="6" cy="-24" r="2" fill="#ffb02e"/></g>'; },
    bed: function (x, y) { return '<rect x="' + (x - 34) + '" y="' + (y - 8) + '" width="68" height="10" rx="3" fill="#8fb7ff"' + SK + '/><rect x="' + (x - 36) + '" y="' + (y - 20) + '" width="6" height="26" fill="#c79a6b"' + SK + '/><rect x="' + (x + 30) + '" y="' + (y - 14) + '" width="6" height="20" fill="#c79a6b"' + SK + '/>'; },
    wall: function (x, y) {
      var s = "";
      for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) s += '<rect x="' + (x + c * 14 - (r % 2) * 7) + '" y="' + (y - 12 - r * 10) + '" width="14" height="10" fill="#d9775a"' + SK + '/>';
      return '<g clip-path="none">' + s + "</g>";
    },
    mirror: function (x, y) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="22" ry="30" fill="#dff3ff" stroke="#c79a6b" stroke-width="5"/><ellipse cx="' + x + '" cy="' + y + '" rx="22" ry="30" fill="none"' + SK + '/>'; },
    plates: '<g fill="#6cc04a" stroke="' + K + '" stroke-width="1.8" stroke-linejoin="round">'
      + '<path d="M-8 -58 L-16 -70 L-2 -60 Z"/><path d="M-12 -50 L-26 -58 L-12 -42 Z"/><path d="M-6 -34 L-22 -38 L-6 -26 Z"/><path d="M-4 -24 L-18 -24 L-4 -17 Z"/></g>'
      + '<path d="M-1 -16 Q-16 -6 -30 -14" stroke="' + K + '" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-1 -16 Q-16 -6 -30 -14" stroke="#6cc04a" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
      + '<path d="M-30 -14 l-4 -5 M-30 -14 l-6 1" stroke="' + K + '" stroke-width="1.8"/>',
    cliff: function () { return '<path d="M0 50 L70 50 L70 90 L0 90 Z" fill="#a8b0bd"' + SK + '/>'; },
    stop: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><polygon points="-7,-17 7,-17 17,-7 17,7 7,17 -7,17 -17,7 -17,-7" fill="#e5484d"' + SK + '/>' + txt(0, 4, "STOP", 8.5, "#fff") + '<path d="M0 17 L0 38"' + SK + '/></g>'; },
    sheet: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><path d="M-14 0 C-15 -30 -12 -50 0 -50 C12 -50 15 -30 14 0 L9 -5 L4 0 L0 -5 L-4 0 L-9 -5 Z" fill="#fff"' + SK + '/><circle cx="-4" cy="-36" r="2" fill="' + K + '"/><circle cx="4" cy="-36" r="2" fill="' + K + '"/><path d="M11 -34 L18 -31 L11 -28 Z" fill="#ff8c2a"' + SK + '/></g>'; },
    desk: function (x, y) { return '<rect x="' + (x - 24) + '" y="' + (y - 18) + '" width="48" height="6" fill="#c79a6b"' + SK + '/><rect x="' + (x - 22) + '" y="' + (y - 12) + '" width="44" height="12" fill="#b5835a"' + SK + '/>'; },
    calendar: function (x, y, label) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-13" y="-13" width="26" height="24" rx="2" fill="#fff"' + SK + '/><rect x="-13" y="-13" width="26" height="7" fill="#e5484d"' + SK + '/>' + txt(0, 7, label, 8.5) + "</g>"; },
    thought: function (x, y, inner) { return '<circle cx="' + (x - 18) + '" cy="' + (y + 20) + '" r="2.4" fill="#fff"' + SK + '/><circle cx="' + (x - 12) + '" cy="' + (y + 14) + '" r="3.4" fill="#fff"' + SK + '/><ellipse cx="' + x + '" cy="' + y + '" rx="18" ry="13" fill="#fff"' + SK + '/>' + (inner || ""); },
    tissue: function (x, y) { return '<g transform="translate(' + x + "," + y + ')"><rect x="-6" y="-4" width="12" height="8" fill="#cfefff"' + SK + '/><path d="M-2 -4 Q0 -10 3 -6" fill="#fff"' + SK + '/></g>'; },
    redCard: function (x, y, rot) { return P.card(x, y, rot, "#e5484d"); },
    crack: function (x, y) {
      return '<path d="M' + x + " " + y + " l-5 -6 l4 -3 l-3 -6 M" + x + " " + y + ' l6 -4 l-2 -5 l5 -3" stroke="' + K + '" stroke-width="1.6" fill="none"/>';
    },
    mask: function (x, y) { return '<g transform="translate(' + x + "," + y + ')">' + head("colin", "wink") + '<path d="M0 12 L0 22" stroke="#8a5a33" stroke-width="2.4"/></g>'; },
    arrow: function (x1, y1, x2, y2) {
      var a = Math.atan2(y2 - y1, x2 - x1), h = 6;
      var p1 = (x2 - h * Math.cos(a - .5)).toFixed(1) + " " + (y2 - h * Math.sin(a - .5)).toFixed(1);
      var p2 = (x2 - h * Math.cos(a + .5)).toFixed(1) + " " + (y2 - h * Math.sin(a + .5)).toFixed(1);
      var st = ' stroke="#e5484d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
      return '<path d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '"' + st + '/><path d="M' + p1 + " L" + x2 + " " + y2 + " L" + p2 + '"' + st + "/>";
    },
    hand: function (x, y, rot) { return '<g transform="translate(' + x + "," + y + ") rotate(" + (rot || 0) + ')"><rect x="-4" y="-2" width="20" height="8" rx="4" fill="#fff"' + SK + '/><path d="M14 0 L22 -4"' + SK + '/></g>'; },
    crickets: function (x, y) { return txt(x, y, "…", 16, "#5d6270"); }
  };

  // ---------- 장면 ----------
  function bg(c, ground) {
    return '<rect width="160" height="90" fill="' + c + '"/>' + (ground ? '<rect y="' + (ground === true ? 84 : ground) + '" width="160" height="12" fill="' + "rgba(0,0,0,.08)" + '"/>' : "");
  }
  function rays(c1) {
    var s = "";
    for (var i = 0; i < 12; i++) s += '<path d="M80 45 L' + (80 + Math.cos(i * Math.PI / 6) * 120).toFixed(0) + " " + (45 + Math.sin(i * Math.PI / 6) * 120).toFixed(0) + " L" + (80 + Math.cos(i * Math.PI / 6 + .26) * 120).toFixed(0) + " " + (45 + Math.sin(i * Math.PI / 6 + .26) * 120).toFixed(0) + ' Z" fill="' + c1 + '"/>';
    return s;
  }

  var S = {
    // 행동: 뽑기
    feast: function () { return bg("#ffe9a8") + rays("#fff4c9") + fig("coco", { mood: "smug", arms: "cheer", legs: "wide" }) + P.fan(80, 22, 5) + P.sparkle(32, 30, 1.2) + P.sparkle(130, 26, 1) + P.speed(50, 60) + P.speed(110, 60, true); },
    twoMore: function () { return bg("#dff3ff") + P.stairs() + fig("jaedam", { x: 108, y: 42, s: .62, mood: "happy", arms: "cheer" }) + P.medal(48, 52, .9, false) + txt(108, 60, "LV UP", 9, "#5b6cff") + P.card(36, 80, -10) + P.card(72, 66, 8); },
    shareDraw: function () { return bg("#ffe1ef", true) + fig("isang", { x: 56, mood: "love", arms: "give" }) + fig("jinu", { x: 106, flip: true, mood: "love", arms: "give" }) + P.heart(81, 22, 1.1) + P.card(70, 60, -12) + P.card(92, 60, 12); },
    dumpster: function () { return bg("#cfe3f0") + P.bridge() + P.trash(80, 86) + headOnly("jihun", 80, 58, .95, "dumb") + P.card(60, 74, -25) + P.card(103, 72, 20) + P.card(80, 46, 4); },
    peekTop: function () { return bg("#e8f6fd", true) + fig("jaedam", { x: 62, mood: "smug", arms: "hold", acc: ["specs"] }) + P.notebook(80, 58) + P.fan(118, 38, 5) + P.sparkle(118, 18, .9); },
    treasureMap: function () { return bg("#fff1cf", true) + fig("coco", { x: 52, mood: "shock", arms: "point" }) + P.map(106, 56) + P.bang(70, 26) + P.sparkle(120, 34, 1); },
    treasureBox: function () { return bg("#2c2a5e") + P.moon(120, 28) + P.sparkle(30, 16, .8) + P.sparkle(60, 10, .6) + P.hill() + fig("coco", { x: 70, y: 70, s: .9, mood: "happy", arms: "up" }) + txt(100, 52, "아우~", 10, "#fff3a6"); },
    // 빼앗기
    pick1: function () { return bg("#fff0d6", true) + fig("jihun", { x: 54, mood: "shock", arms: "up", nobeak: true }) + fig("coco", { x: 110, flip: true, mood: "evil", arms: "hold" }) + '<path d="M93 61 L86 58 L93 55 Z" fill="#ff8c2a" stroke="' + K + '" stroke-width="2"/>' + P.q(54, 22); },
    pick2: function () { return bg("#f3dff5", true) + fig("jaedam", { x: 66, mood: "smug", arms: "hold" }) + P.mask(96, 52) + P.sparkle(118, 30, 1) + P.sparkle(32, 40, .8); },
    collect: function () { return bg("#ffe1f4") + rays("#fff0fa") + fig("wig", { x: 80, mood: "wink", arms: "wave" }) + P.sparkle(104, 26, 1.1) + P.sparkle(56, 22, .9) + fig("dude", { x: 26, s: .7, mood: "love", arms: "give" }) + fig("dude", { x: 136, s: .7, flip: true, mood: "love", arms: "give" }) + P.card(40, 62, -15) + P.card(122, 62, 15); },
    xray: function () { return bg("#e9ecf7", true) + fig("dude", { x: 104, flip: true, mood: "happy", arms: "hold" }) + P.fan(88, 58, 3) + fig("jinu", { x: 56, mood: "smug", arms: "grab", alpha: .4 }) + txt(48, 22, "슬쩍", 10, "#5b6cff"); },
    isangHand: function () { return bg("#ffe1ef", true) + fig("isang", { x: 80, mood: "evil", arms: "stretch" }) + fig("dude", { x: 14, s: .6, mood: "shock" }) + fig("dude", { x: 146, s: .6, mood: "shock", flip: true }) + P.card(138, 56, 20) + P.card(22, 60, -20); },
    wantDonut: function () { return bg("#fff7c2", true) + fig("isang", { x: 54, mood: "angry", arms: "point" }) + fig("jinu", { x: 110, flip: true, mood: "sad", arms: "hold" }) + P.lemon(92, 62) + P.lemon(100, 56) + P.sweat(124, 34); },
    ringleader: function () { return bg("#e8f6fd", true) + fig("dude", { x: 108, mood: "shock", acc: ["crown"] }) + fig("dude", { x: 40, s: .8, mood: "angry", arms: "point" }) + fig("dude", { x: 66, s: .7, mood: "angry", arms: "point" }) + P.q(126, 24) + txt(108, 14, "방장", 9, "#c4260f"); },
    // 버리게 하기
    blast: function () { return bg("#ffe3d6", true) + fig("jihun", { x: 50, mood: "dumb", arms: "hold" }) + P.potato(92, 52, 1.2, true) + P.boom(118, 44, .9, "펑") + P.speed(80, 52); },
    wipe: function () { return bg("#dfe4ee", true) + fig("jaedam", { x: 90, mood: "cry", arms: "up", rot: -14 }) + P.medal(36, 48, 1.1, false) + P.bubble(122, 22, "gg") + P.speed(120, 70, true); },
    quake: function () { return bg("#fff0d6") + P.mine(80, 86) + P.boom(80, 62, 1.3, "펑!") + fig("coco", { x: 80, y: 52, s: .66, mood: "shock", arms: "up", legs: "air", rot: 12 }) + fig("jihun", { x: 136, s: .8, mood: "dumb", arms: "point", flip: true }); },
    flop: function () { return bg("#e8f6fd") + '<rect y="76" width="160" height="14" fill="#cfe3c0"/>' + fig("jihun", { x: 22, y: 80, s: .9, mood: "dumb", rot: 82, arms: "up" }) + fig("coco", { x: 88, y: 80, s: .9, mood: "shock", rot: 82, arms: "up" }) + P.card(30, 60, 30) + P.card(130, 58, -30) + txt(80, 26, "꽈당", 14, "#c4260f"); },
    onlyOne: function () { return bg("#ffe1ef", true) + fig("isang", { x: 80, mood: "smug", arms: "hip", acc: ["crown"] }) + fig("jinu", { x: 30, s: .75, mood: "love", arms: "give" }) + fig("prss", { x: 132, s: .75, flip: true, mood: "love", arms: "give" }) + P.heart(46, 34, .7) + P.heart(116, 34, .7) + P.bubble(132, 16, "사촌?", 40); },
    myDonut: function () { return bg("#fff7c2", true) + fig("jinu", { x: 56, mood: "happy", arms: "give" }) + fig("isang", { x: 110, flip: true, mood: "love", arms: "give" }) + P.lemon(78, 60) + P.lemon(86, 54) + P.lemon(94, 60) + P.heart(84, 20, .8); },
    // 판 흔들기
    gift: function () { return bg("#efe9ff", true) + fig("jinu", { x: 56, mood: "happy", arms: "give" }) + fig("isang", { x: 112, flip: true, mood: "love", arms: "give" }) + P.gift(84, 58) + P.heart(84, 28, .9) + P.sparkle(130, 24, .8); },
    hotPotato: function () { return bg("#dff3ff") + fig("coco", { x: 70, y: 66, mood: "shock", arms: "out", legs: "run", rot: -28 }) + P.speed(36, 40) + P.speed(30, 54) + fig("dude", { x: 136, s: .8, flip: true, mood: "shock", arms: "up" }) + P.bang(120, 30); },
    swapHands: function () { return bg("#ffe1ef", true) + fig("isang", { x: 54, mood: "wink", arms: "give" }) + fig("jinu", { x: 112, flip: true, mood: "sad", arms: "out" }) + P.bag(96, 62, "#ff9ec4") + P.bag(128, 60, "#7c6cf0") + P.sweat(124, 34); },
    shuffleAll: function () { return bg("#ffe3d6", true) + P.table(98, 66, true) + fig("jihun", { x: 54, mood: "dumb", arms: "up" }) + P.card(108, 24, 30) + P.card(124, 40, -40) + P.card(92, 30, -10) + P.card(140, 22, 60) + P.bang(24, 26); },
    trainBack: function () { return bg("#dff3ff") + '<rect y="76" width="160" height="14" fill="#9aa3b2"/><path d="M0 80 L160 80" stroke="' + K + '" stroke-width="2"/>' + P.train(78, 76) + headOnly("prss", 59, 47, .55, "happy"); },
    seven: function () { return bg("#e9f8e1", true) + fig("prss", { x: 104, s: 1.25, mood: "happy", acc: [] }) + fig("coco", { x: 56, s: .8, mood: "shock", arms: "up", legs: "tip" }) + '<path d="M140 86 L140 20" stroke="' + K + '" stroke-width="1.6" stroke-dasharray="3 3"/>' + txt(140, 16, "7", 12, "#e5484d"); },
    fresh: function () { return bg("#fff0fa") + rays("#ffe1f4") + fig("jihun", { mood: "smug", arms: "hip", acc: ["shades"] }) + P.sparkle(50, 26, 1.2) + P.sparkle(112, 30, 1) + P.sparkle(120, 66, .7); },
    reverse: function () { return bg("#dff3ff") + P.hill("up") + fig("jihun", { x: 90, y: 60, s: .8, mood: "dumb", rot: 120, arms: "out" }) + P.arrowUp(40, 74) + P.q(122, 24); },
    skipOne: function () { return bg("#f0ead8", true) + P.bench(74, 72) + fig("prss", { x: 74, y: 72, mood: "sleepy", legs: "sit" }) + P.cane(96, 86, 30) + P.zzz(100, 30) + P.clock(130, 34, .9); },
    jump: function () { return bg("#cfe3f0") + P.road() + P.car(118, 80) + fig("coco", { x: 60, y: 64, s: .9, mood: "shock", arms: "up", legs: "run" }) + P.bang(84, 22) + P.speed(36, 40); },
    double: function () { return bg("#fff3df") + P.factory() + fig("jinu", { x: 90, y: 80, s: .72, mood: "happy", arms: "cheer", acc: ["chef"] }); },
    copycat: function () { return bg("#fffad1", true) + fig("jihun", { x: 52, mood: "dumb", arms: "cheer" }) + fig("coco", { x: 108, mood: "dumb", arms: "cheer", flip: true }) + P.q(52, 18) + P.q(108, 18); },
    banana: function () { return bg("#fff7c2", true) + P.banana(64, 84) + fig("jihun", { x: 92, y: 74, mood: "shock", arms: "up", legs: "kick", rot: -50 }) + P.bang(126, 26); },
    nothing: function () { return bg("#eef0f4", true) + fig("jihun", { mood: "blank" }) + P.bubble(110, 26, "…", 30) + '<circle cx="34" cy="80" r="7" fill="none" stroke="#b9a77c" stroke-width="2" stroke-dasharray="3 2"/>'; },
    // 승리 조건
    fewestWins: function () { return bg("#e6e6ef", true) + fig("jaedam", { x: 70, mood: "cry", arms: "down" }) + P.heart(104, 34, 1.2, true) + txt(126, 74, "-끝-", 14, K); },
    mostWins: function () { return bg("#f0ead8", true) + P.desk(70, 86) + fig("prss", { x: 70, y: 70, mood: "smug", arms: "hold" }) + P.calendar(126, 40, "D-365") + P.cane(104, 86, 24); },
    setGoal: function () { return bg("#2c2a5e") + fig("jaedam", { x: 36, y: 72, s: .9, mood: "sleepy", rot: 80, legs: "stand" }) + P.zzz(58, 40) + P.thought(110, 30, P.medal(110, 33, 1, true) + P.sparkle(126, 22, .7)); },
    hold: function () { return bg("#f0ead8", true) + fig("prss", { x: 74, mood: "sad", arms: "point" }) + P.cane(56, 86, 28) + P.bubble(118, 24, "잠깐…", 46) + '<path d="M64 52 l-6 -3 M64 56 l-7 0" stroke="#e5484d" stroke-width="1.8"/>'; },
    // 함정·카운터 다루기
    clearTraps: function () { return bg("#e8f6fd", true) + fig("jaedam", { x: 58, mood: "smug", arms: "hold" }) + P.scissors(82, 60, 40) + P.redCard(108, 72, 30) + P.redCard(124, 76, -20) + P.crickets(132, 34); },
    exposeTraps: function () { return bg("#fff0d6", true) + fig("coco", { x: 70, mood: "angry", arms: "up", legs: "kick" }) + P.redCard(96, 80, 70) + P.redCard(116, 82, -60) + P.crack(108, 84) + P.boom(132, 50, .6); },
    stealTrap: function () { return bg("#f3dff5", true) + fig("colin", { x: 70, mood: "wink", arms: "hold" }) + P.redCard(86, 60, 15) + P.sparkle(110, 28, 1.1) + P.sparkle(38, 34, .8); },
    noCounter: function () { return bg("#fffad1", true) + fig("jihun", { x: 30, s: .85, mood: "dumb" }) + fig("jihun", { x: 80, s: .85, mood: "dumb" }) + fig("jihun", { x: 130, s: .85, mood: "dumb" }) + txt(80, 16, "멍…", 12, "#5d6270"); },
    noAction: function () { return bg("#ffe1ef", true) + fig("isang", { x: 62, mood: "angry", arms: "cross" }) + fig("jinu", { x: 116, flip: true, mood: "shock", arms: "up" }) + '<path d="M38 20 L54 36 M54 20 L38 36" stroke="#e5484d" stroke-width="4" stroke-linecap="round"/>'; },
    // 진짜 세상
    hats: function () { return bg("#f3dff5") + rays("#fbeffc") + fig("colin", { mood: "wink", arms: "wave", acc: ["tophat"] }) + P.sparkle(110, 22, 1) + P.sparkle(50, 30, .8); },
    glasses: function () { return bg("#e8f6fd", true) + fig("jaedam", { x: 70, mood: "smug", arms: "hold", acc: ["specs"] }) + P.notebook(92, 58) + P.sparkle(120, 26, .9); },
    catOwners: function () { return bg("#fff0d6", true) + fig("dude", { x: 62, mood: "sleepy", arms: "up" }) + P.cat(116, 74) + txt(90, 30, "에취!", 12, "#e5484d"); },
    noDog: function () { return bg("#e9f8e1", true) + fig("dude", { x: 30, s: .8 }) + P.dog(50, 86) + fig("dude", { x: 120, s: .8, flip: true }) + P.dog(104, 86) + fig("jihun", { x: 80, s: .9, mood: "sad" }); },
    away: function () { return bg("#dff3ff", true) + P.house(52, 86) + fig("colin", { x: 112, y: 70, mood: "shock", rot: 30, arms: "out", legs: "air" }) + P.speed(84, 50) + P.bang(140, 22); },
    eldest: function () { return bg("#ffeef6", true) + fig("prss", { x: 80, s: 1.15, mood: "happy", acc: ["bonnet", "pacifier"] }) + P.cane(108, 86, 30); },
    youngest: function () { return bg("#ffeef6", true) + fig("dude", { x: 80, s: .7, mood: "happy", acc: ["bonnet", "pacifier"], legs: "sit", y: 82 }); },
    tall: function () { return bg("#e9f8e1", true) + '<rect x="40" y="70" width="28" height="16" fill="#c79a6b" stroke="' + K + '" stroke-width="2.2"/>' + fig("coco", { x: 54, y: 70, s: .8, mood: "smug", arms: "hip" }) + fig("prss", { x: 112, s: 1.2, mood: "shock" }); },
    birthday: function () { return bg("#fff0fa", true) + fig("dude", { x: 56, mood: "happy", arms: "cheer", acc: ["party"] }) + P.cake(112, 84) + P.sparkle(130, 24, 1) + P.sparkle(90, 18, .8); },
    // 미니게임
    rps: function () { return bg("#efe9ff", true) + fig("jinu", { x: 56, mood: "happy", arms: "give" }) + fig("isang", { x: 108, flip: true, mood: "smug", arms: "give" }) + P.bubble(44, 18, "가위", 34) + P.bubble(118, 18, "바위", 34) + P.heart(82, 40, .6); },
    coin: function () { return bg("#fffad1", true) + fig("jihun", { x: 60, mood: "dumb", arms: "hold" }) + P.button(84, 66) + P.coin(118, 28) + P.q(134, 50); },
    react: function () { return bg("#f0ead8", true) + fig("prss", { x: 60, mood: "sad", arms: "down", legs: "sit", y: 82 }) + P.cane(82, 86, 26) + txt(40, 30, "끙…", 12, "#5d6270") + fig("coco", { x: 120, mood: "smug", arms: "cheer" }); },
    pointVote: function () { return bg("#ffe3d6", true) + fig("jihun", { x: 58, mood: "shock" }) + fig("coco", { x: 102, mood: "shock" }) + P.arrow(6, 34, 40, 44) + P.arrow(154, 30, 120, 42) + P.arrow(80, 4, 80, 20) + P.arrow(30, 6, 50, 24); },
    duel: function () { return bg("#f3dff5", true) + P.table(80, 70) + fig("wig", { x: 44, mood: "angry", arms: "give" }) + fig("jaedam", { x: 116, flip: true, mood: "angry", arms: "give" }) + P.q(80, 24) + P.bang(92, 24); },
    photo: function () { return bg("#ffe1ef", true) + fig("isang", { x: 40, mood: "happy", arms: "hold" }) + P.camera(60, 58) + P.flash(76, 50) + fig("jinu", { x: 108, s: .8, mood: "happy", arms: "cheer" }) + fig("coco", { x: 138, s: .8, mood: "wink", arms: "wave" }); },
    // 함정 (주인이 발동)
    tMuffin: function () { return bg("#ffe9a8") + P.boom(96, 48, 1.4) + P.muffin(96, 54, 1.6) + fig("dude", { x: 42, mood: "shock", arms: "up" }) + P.bubble(42, 16, "머핀!", 40); },
    tJump: function () { return bg("#e9f8e1", true) + fig("coco", { x: 66, y: 74, mood: "shock", arms: "up", legs: "air" }) + P.bubble(96, 18, "꽥!", 30) + fig("dude", { x: 130, s: .8, mood: "evil", arms: "out" }); },
    tName: function () { return bg("#2c2a5e") + rays("#383571") + fig("jaedam", { x: 80, mood: "smug", arms: "wave", acc: ["shades"] }) + P.flash(30, 30) + P.flash(132, 24) + P.flash(124, 62); },
    tSing: function () { return bg("#f3dff5", true) + fig("colin", { x: 64, mood: "wink", arms: "up" }) + P.notes(92, 30) + fig("dude", { x: 130, s: .8, mood: "sad", arms: "up" }); },
    tLaugh: function () { return bg("#fffad1", true) + fig("jihun", { x: 54, mood: "dumb", arms: "cheer" }) + fig("dude", { x: 116, s: .85, mood: "wink" }) + txt(124, 26, "ㅋㅋㅋ", 13, "#e5484d"); },
    tWhine: function () { return bg("#e6e6ef", true) + fig("jaedam", { x: 66, mood: "cry", acc: ["bonnet"] }) + P.medal(98, 56, .9, false) + P.bubble(116, 18, "나 원래 골드야", 76); },
    tTime: function () { return bg("#2c2a5e") + P.bed(80, 80) + fig("prss", { x: 80, y: 74, mood: "sleepy", rot: 90, acc: ["nightcap"] }) + P.clock(130, 30, .9, "9시") + P.zzz(52, 34); },
    tYawn: function () { return bg("#efe9ff", true) + fig("jinu", { x: 62, mood: "yawn", arms: "up" }) + P.zzz(88, 26) + fig("isang", { x: 120, flip: true, s: .85, mood: "happy" }); },
    tWhat: function () { return bg("#fffad1", true) + fig("jihun", { x: 66, mood: "dumb", arms: "hold" }) + P.bubble(112, 22, "뭐어라고?!", 58); },
    tHello: function () { return bg("#f3dff5") + rays("#fbeffc") + fig("colin", { mood: "wink", arms: "wave" }) + P.bubble(120, 20, "안녕~", 40) + P.sparkle(44, 28, .9); },
    tPlease: function () { return bg("#ffe1ef", true) + fig("isang", { x: 58, mood: "smug", arms: "point", acc: ["crown"] }) + P.bubble(56, 14, "~해줘", 44) + fig("jinu", { x: 118, flip: true, mood: "love", arms: "give", legs: "sit", y: 84 }) + P.gift(100, 66); },
    tCount: function () { return bg("#e9f8e1", true) + fig("coco", { x: 70, mood: "smug", arms: "hold" }) + P.fan(92, 56, 3) + txt(124, 28, "3, 2, 1", 11, "#5b6cff"); },
    tLong: function () { return bg("#f0ead8", true) + P.bench(70, 72) + fig("prss", { x: 70, y: 72, mood: "angry", legs: "sit" }) + P.cane(92, 86, 30) + P.bubble(118, 24, "아직?", 40) + P.clock(132, 62, .7); },
    // 함정 (자동)
    tEmptyRefill: function () { return bg("#efe9ff") + fig("jinu", { mood: "happy", arms: "cheer" }) + P.card(40, 18, -20) + P.card(66, 10, 10) + P.card(96, 14, -8) + P.card(122, 20, 18) + P.card(56, 34, 30) + P.card(108, 36, -25); },
    tEmptyRob: function () { return bg("#fff0d6", true) + fig("coco", { x: 60, mood: "angry", arms: "grab", acc: ["bandage"] }) + fig("prss", { x: 118, flip: true, mood: "shock", arms: "up" }) + P.fan(86, 52, 4); },
    tScavenge: function () { return bg("#fffad1", true) + fig("jihun", { x: 70, mood: "happy", arms: "hold", legs: "sit", y: 84 }) + P.card(96, 80, 80) + P.card(116, 82, -70) + P.card(88, 60, 10); },
    tThorns: function () { return bg("#dff3ff", true) + fig("jaedam", { x: 56, mood: "evil", arms: "point" }) + P.needle(80, 58, 70) + fig("dude", { x: 128, flip: true, mood: "shock", arms: "up" }) + P.bang(116, 26); },
    tGrudge: function () { return bg("#ffe1ef", true) + fig("isang", { x: 80, mood: "cry" }) + fig("jinu", { x: 30, s: .8, mood: "shock", arms: "give", legs: "run" }) + fig("prss", { x: 132, s: .8, flip: true, mood: "shock", arms: "give", legs: "run" }) + P.tissue(48, 62) + P.tissue(114, 62); },
    // 카운터
    cNope: function () { return bg("#e8f6fd", true) + fig("jaedam", { x: 70, mood: "smug", arms: "point" }) + '<path d="M100 26 L124 50 M124 26 L100 50" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>'; },
    cMine: function () { return bg("#ffe1ef", true) + fig("isang", { x: 58, mood: "evil", arms: "grab" }) + fig("coco", { x: 116, flip: true, s: .85, mood: "shock", arms: "up" }) + P.card(80, 54, -20) + P.bubble(116, 16, "누나!", 38); },
    cBack: function () { return bg("#ffe1ef", true) + fig("isang", { x: 58, mood: "angry", arms: "point" }) + fig("coco", { x: 116, flip: true, s: .85, mood: "sad", arms: "down" }) + P.sweat(128, 40) + P.bang(84, 24); },
    cReturn: function () { return bg("#f0ead8", true) + fig("prss", { x: 60, mood: "angry", arms: "point" }) + P.cane(44, 86, 28) + fig("coco", { x: 118, flip: true, s: .85, mood: "sad", arms: "give" }) + P.card(98, 58, 10) + P.bubble(64, 14, "형 말 들어", 54); },
    cMirror: function () { return bg("#f3dff5", true) + P.mirror(112, 46) + headOnly("jaedam", 112, 44, 1, "shock") + fig("colin", { x: 54, mood: "wink", arms: "hold" }) + P.sparkle(88, 20, .9); },
    cGhost: function () { return bg("#2c2a5e") + P.sheet(80, 84) + P.redCard(40, 80, -30) + P.redCard(124, 82, 25) + txt(118, 30, "부우~", 11, "#cfefff"); },
    cDodge: function () { return bg("#e9f8e1", true) + fig("jinu", { x: 76, mood: "happy", arms: "out", under: P.plates }) + fig("isang", { x: 128, flip: true, s: .8, mood: "love" }) + P.card(30, 40, -30) + P.speed(44, 40); },
    cWall: function () { return bg("#dff3ff", true) + P.wall(74, 86) + headOnly("jinu", 96, 34, .9, "angry") + fig("dude", { x: 30, mood: "shock", arms: "grab" }); },
    cGrip: function () { return bg("#cfe3f0") + P.cliff() + fig("coco", { x: 70, y: 50, s: .8, mood: "shock", arms: "out", rot: 20 }) + fig("prss", { x: 36, y: 50, s: .8, mood: "angry", arms: "grab" }) + P.bubble(128, 18, "뛰지 마!", 50); },
    cStopDraw: function () { return bg("#fff0d6", true) + fig("jihun", { x: 56, mood: "shock", arms: "grab" }) + P.stop(116, 42) + P.card(82, 54, 15); }
  };

  var cache = {};
  function render(k) {
    if (cache[k]) return cache[k];
    var f = S[k];
    var body = f ? f() : bg("#3c3570") + P.muffin(80, 70, 3);
    cache[k] = '<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img">' + body + "</svg>";
    return cache[k];
  }
  var api = { render: render, keys: function () { return Object.keys(S); } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MuffinArt = api;
})(this);
