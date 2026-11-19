// 효과음은 전부 Web Audio로 합성해요 (외부 음원 파일 없음).
window.SFX = (function () {
  "use strict";
  var ctx = null, master = null, noiseBuf = null, muted = false, listeners = [];
  try { muted = localStorage.getItem("pg-mute") === "1"; } catch (e) {}

  function ac() {
    if (muted) return null;
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function env(g, t, a, d, v) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(o) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (o.t || 0), a = o.a || 0.005, d = o.d || 0.15;
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    env(g, t, a, d, o.v || 0.2);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + a + d + 0.05);
  }
  function noise(o) {
    var c = ac(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    var t = c.currentTime + (o.t || 0), a = o.a || 0.003, d = o.d || 0.2;
    var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf;
    f.type = o.ft || "lowpass";
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    f.Q.value = o.q || 0.8;
    env(g, t, a, d, o.v || 0.3);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + a + d + 0.05);
  }

  var sounds = {
    hit: function () {
      noise({ ft: "bandpass", f: 2400, q: 3, d: 0.05, v: 0.45 });
      tone({ f: 170, f2: 55, d: 0.13, v: 0.5 });
      tone({ type: "triangle", f: 1400, f2: 700, d: 0.05, v: 0.08 });
    },
    break: function () {
      noise({ f: 1800, f2: 250, d: 0.32, v: 0.55 });
      tone({ f: 95, f2: 38, d: 0.28, v: 0.55 });
      noise({ ft: "highpass", f: 3000, d: 0.12, v: 0.18, t: 0.05 });
    },
    gem: function (v) {
      if (v === 1) { tone({ type: "triangle", f: 330, d: 0.22, v: 0.22 }); return; }
      if (v === 2) { tone({ f: 523, d: 0.18, v: 0.2 }); tone({ f: 659, d: 0.25, v: 0.2, t: 0.08 }); return; }
      if (v === 3) { [659, 784, 988].forEach(function (f, i) { tone({ f: f, d: 0.25, v: 0.18, t: i * 0.07 }); }); return; }
      [784, 988, 1175, 1568, 2093].forEach(function (f, i) {
        tone({ f: f, d: 0.35, v: 0.18, t: i * 0.06 });
        tone({ type: "triangle", f: f * 2, d: 0.2, v: 0.05, t: i * 0.06 + 0.02 });
      });
    },
    draw: function () {
      noise({ ft: "bandpass", f: 1200, f2: 3500, q: 1.2, d: 0.14, v: 0.22 });
      tone({ f: 520, f2: 820, d: 0.1, v: 0.07, t: 0.04 });
    },
    bomb: function () {
      noise({ f: 3500, f2: 90, d: 0.75, v: 0.75 });
      tone({ f: 120, f2: 30, d: 0.6, v: 0.7 });
    },
    turn: function () {
      tone({ f: 660, d: 0.16, v: 0.16 });
      tone({ f: 880, d: 0.3, v: 0.16, t: 0.12 });
    },
    pop: function () { tone({ f: 760, f2: 1180, d: 0.08, v: 0.14 }); },
    correct: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone({ f: f, d: 0.22, v: 0.16, t: i * 0.08 }); });
    },
    wrong: function () {
      tone({ type: "sawtooth", f: 220, f2: 120, d: 0.28, v: 0.1 });
      tone({ type: "sawtooth", f: 165, f2: 90, d: 0.3, v: 0.08, t: 0.05 });
    },
    win: function () {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) {
        tone({ type: i < 4 ? "triangle" : "sine", f: f, d: i === 6 ? 0.7 : 0.18, v: 0.18, t: i * 0.11 });
      });
    }
  };

  function play(name, arg) {
    if (muted || !sounds[name]) return;
    try { sounds[name](arg); } catch (e) {}
  }
  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("pg-mute", muted ? "1" : "0"); } catch (e) {}
    if (!muted) ac();
    listeners.forEach(function (fn) { fn(muted); });
  }
  document.addEventListener("pointerdown", function () { ac(); }, { once: true });

  return {
    play: play,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
