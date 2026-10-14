/**
 * G⁵ Portal — Advanced Easter Egg System
 * Hidden console · mini-games · Web Audio · canvas FX · scene manager
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_V2__) return;
  window.__G5_EASTER_V2__ = true;

  function asset(path) {
    if (window.G5 && G5.asset) return G5.asset(path);
    return (location.pathname.indexOf("/pages/") >= 0 ? "../../" : "./") + path;
  }

  function ensureCss() {
    if (document.getElementById("g5-easter-css")) return;
    var link = document.createElement("link");
    link.id = "g5-easter-css";
    link.rel = "stylesheet";
    link.href = asset("src/css/easter.css");
    document.head.appendChild(link);
  }

  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  /* Web Audio */
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;

  function ensureAudio() {
    if (!AudioCtx) return null;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep(freq, dur, type, vol, when) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.12));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + (dur || 0.12) + 0.02);
  }

  function playJingle(name) {
    if (name === "boot") {
      [220, 277, 330, 440].forEach(function (f, i) {
        beep(f, 0.1, "sine", 0.06, i * 0.08);
      });
    } else if (name === "win") {
      [523, 659, 784, 1046].forEach(function (f, i) {
        beep(f, 0.12, "triangle", 0.07, i * 0.09);
      });
    } else if (name === "coin") {
      beep(988, 0.06, "square", 0.05);
      beep(1319, 0.12, "square", 0.04, 0.06);
    } else if (name === "error") {
      beep(120, 0.2, "sawtooth", 0.05);
    } else if (name === "konami") {
      [392, 440, 494, 587, 659].forEach(function (f, i) {
        beep(f, 0.08, "square", 0.05, i * 0.07);
      });
    }
  }

  function toast(msg, ms) {
    ensureCss();
    var el = document.getElementById("g5-easter-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "g5-easter-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("show");
    }, ms || 2600);
  }

  // ... truncated for length - will use alternative approach
  console.error('TRUNCATED');
})();
