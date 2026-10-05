/**
 * G⁵ Portal — Demoscene-class Easter Experience
 * Starfield warp · plasma · tunnel · sequenced synth · timeline
 * Loaded on demand from easter-eggs.js
 */
(function () {
  "use strict";
  if (window.G5Demo && window.G5Demo._ready) return;

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var reduced = false;
  try {
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /* ── Audio engine: sequenced chiptune-ish ── */
  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.playing = false;
    this._nodes = [];
  }

  AudioEngine.prototype.ensure = function () {
    if (!AudioCtx) return false;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      /* subtle filter for polish */
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 2800;
      this.master.connect(this.filter);
      this.filter.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  };

  AudioEngine.prototype.tone = function (freq, t0, dur, type, vol, slide) {
    if (!this.ctx) return;
    var osc = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  };

  AudioEngine.prototype.kick = function (t0) {
    this.tone(120, t0, 0.18, "sine", 0.22, 40);
  };

  AudioEngine.prototype.hat = function (t0) {
    if (!this.ctx) return;
    var bufSize = this.ctx.sampleRate * 0.05;
    var buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    var src = this.ctx.createBufferSource();
    var g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = 0.06;
    src.connect(g);
    g.connect(this.master);
    src.start(t0);
  };

  /* C minor-ish progressive sequence */
  var SCALE = [261.63, 293.66, 311.13, 349.23, 392.0, 415.3, 466.16, 523.25];

  AudioEngine.prototype.playSequence = function (bars) {
    if (!this.ensure()) return;
    var bpm = 108;
    var beat = 60 / bpm;
    var t0 = this.ctx.currentTime + 0.08;
    bars = bars || 8;
    for (var bar = 0; bar < bars; bar++) {
      for (var b = 0; b < 4; b++) {
        var t = t0 + (bar * 4 + b) * beat;
        if (b === 0 || b === 2) this.kick(t);
        this.hat(t + beat * 0.5);
        var note = SCALE[(bar * 3 + b * 2) % SCALE.length];
        var oct = bar % 2 === 0 ? 1 : 0.5;
        this.tone(note * oct, t, beat * 0.45, bar % 3 === 0 ? "sawtooth" : "square", 0.07);
        if (b === 0) {
          this.tone(note * 0.5, t, beat * 1.8, "triangle", 0.05);
        }
      }
    }
    this.playing = true;
  };

  AudioEngine.prototype.stop = function () {
    if (this.ctx && this.master) {
      var t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    }
    this.playing = false;
  };

  /* ── Main Demo Scene ── */
  function DemoScene() {
    this.root = null;
    this.canvas = null;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.raf = null;
    this.t0 = 0;
    this.running = false;
    this.audio = new AudioEngine();
    this.stars = [];
    this.phase = 0;
    this.onClose = null;
  }

  DemoScene.prototype.mount = function () {
    var root = document.createElement("div");
    root.className = "g5-demo-root";
    root.innerHTML =
      '<canvas class="g5-demo-canvas"></canvas>' +
      '<div class="g5-demo-hud">' +
      '<div class="g5-demo-logo">G<sup>5</sup> DEMO</div>' +
      '<div class="g5-demo-sub" data-sub>INITIALIZING…</div>' +
      '<div class="g5-demo-bar"><i data-bar></i></div>' +
      "</div>" +
      '<button type="button" class="g5-demo-skip" aria-label="skip">ESC / クリックで終了</button>';
    document.body.appendChild(root);
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.subEl = root.querySelector("[data-sub]");
    this.barEl = root.querySelector("[data-bar]");
    var self = this;
    function close() {
      self.stop();
    }
    root.querySelector(".g5-demo-skip").addEventListener("click", close);
    this._onKey = function (e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", this._onKey, true);
    this._onResize = function () {
      self.resize();
    };
    window.addEventListener("resize", this._onResize);
    this.resize();
    this.initStars();
  };

  DemoScene.prototype.resize = function () {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = (this.w * this.dpr) | 0;
    this.canvas.height = (this.h * this.dpr) | 0;
    this.canvas.style.width = this.w + "px";
    this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  DemoScene.prototype.initStars = function () {
    this.stars = [];
    var n = reduced ? 120 : 420;
    for (var i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random(),
        pz: 0
      });
    }
  };

  DemoScene.prototype.setSub = function (t) {
    if (this.subEl) this.subEl.textContent = t;
  };

  /* Plasma using layered sin fields (CPU, no WebGL) */
  DemoScene.prototype.drawPlasma = function (t, alpha) {
    var ctx = this.ctx;
    var w = this.w;
    var h = this.h;
    var step = reduced ? 12 : 6;
    var img = ctx.createImageData(Math.ceil(w / step), Math.ceil(h / step));
    var data = img.data;
    var iw = img.width;
    var ih = img.height;
    var t1 = t * 0.001;
    for (var y = 0; y < ih; y++) {
      for (var x = 0; x < iw; x++) {
        var nx = x / iw;
        var ny = y / ih;
        var v =
          Math.sin(nx * 6 + t1) +
          Math.sin(ny * 8 - t1 * 1.3) +
          Math.sin((nx + ny) * 5 + t1 * 0.7) +
          Math.sin(Math.sqrt(nx * nx + ny * ny) * 12 - t1);
        v = (v + 4) / 8;
        var i = (y * iw + x) * 4;
        data[i] = (80 + v * 175) | 0;
        data[i + 1] = (20 + v * 80) | 0;
        data[i + 2] = (140 + v * 115) | 0;
        data[i + 3] = (alpha * 255) | 0;
      }
    }
    /* draw scaled */
    var tmp = document.createElement("canvas");
    tmp.width = iw;
    tmp.height = ih;
    tmp.getContext("2d").putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, w, h);
    ctx.restore();
  };

  DemoScene.prototype.drawWarp = function (t, speed) {
    var ctx = this.ctx;
    var cx = this.w / 2;
    var cy = this.h / 2;
    var stars = this.stars;
    speed = speed || 0.012;
    ctx.fillStyle = "rgba(5,4,12,0.35)";
    ctx.fillRect(0, 0, this.w, this.h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.z -= speed;
      if (s.z <= 0.01) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 1;
        s.pz = 1;
      }
      var sx = (s.x / s.z) * cx + cx;
      var sy = (s.y / s.z) * cy + cy;
      var px = (s.x / (s.pz || s.z)) * cx + cx;
      var py = (s.y / (s.pz || s.z)) * cy + cy;
      s.pz = s.z;
      var size = (1 - s.z) * 3.2;
      var bright = 1 - s.z;
      ctx.beginPath();
      ctx.strokeStyle =
        "rgba(" +
        (180 + bright * 75) +
        "," +
        (100 + bright * 100) +
        "," +
        (220) +
        "," +
        (0.3 + bright * 0.7) +
        ")";
      ctx.lineWidth = size;
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  };

  DemoScene.prototype.drawTunnel = function (t) {
    var ctx = this.ctx;
    var cx = this.w / 2;
    var cy = this.h / 2;
    var maxR = Math.hypot(cx, cy);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.00015);
    for (var i = 0; i < 18; i++) {
      var z = ((t * 0.08 + i * 40) % 400) / 400;
      var r = z * maxR;
      var a = 0.15 + (1 - z) * 0.35;
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255,45,149," + a + ")" : "rgba(0,245,255," + a + ")";
      ctx.lineWidth = 2 + (1 - z) * 6;
      ctx.arc(0, 0, Math.max(8, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  DemoScene.prototype.drawTitle = function (t, text, yRatio) {
    var ctx = this.ctx;
    var pulse = 0.7 + Math.sin(t * 0.004) * 0.3;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.floor(this.w * 0.08) + "px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255," + pulse + ")";
    ctx.shadowColor = "#ff2d95";
    ctx.shadowBlur = 30 * pulse;
    ctx.fillText(text, this.w / 2, this.h * (yRatio || 0.45));
    ctx.font = Math.floor(this.w * 0.028) + "px system-ui,sans-serif";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(0,245,255,0.85)";
    ctx.fillText("REITAKU · 5G · PORTAL", this.w / 2, this.h * (yRatio || 0.45) + this.w * 0.05);
    ctx.restore();
  };

  DemoScene.prototype.drawSpectrum = function (t) {
    var ctx = this.ctx;
    var bars = 48;
    var bw = this.w / bars;
    for (var i = 0; i < bars; i++) {
      var h =
        (Math.sin(t * 0.008 + i * 0.4) * 0.5 + 0.5) *
        (Math.sin(t * 0.003 + i * 0.15) * 0.5 + 0.5) *
        this.h *
        0.22;
      var g = ctx.createLinearGradient(0, this.h - h, 0, this.h);
      g.addColorStop(0, "#ff2d95");
      g.addColorStop(1, "#00f5ff");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(i * bw + 1, this.h - h - 20, bw - 2, h);
    }
    ctx.globalAlpha = 1;
  };

  /* Timeline phases (ms) */
  var PHASES = [
    { at: 0, name: "boot", sub: "BOOT SEQUENCE" },
    { at: 2000, name: "warp", sub: "ENTERING HYPERSPACE" },
    { at: 7000, name: "plasma", sub: "PLASMA FIELD" },
    { at: 12000, name: "tunnel", sub: "G⁵ CORRIDOR" },
    { at: 17000, name: "title", sub: "IDENTITY LOCK" },
    { at: 22000, name: "finale", sub: "TRANSMISSION COMPLETE" }
  ];

  DemoScene.prototype.phaseAt = function (elapsed) {
    var p = PHASES[0];
    for (var i = 0; i < PHASES.length; i++) {
      if (elapsed >= PHASES[i].at) p = PHASES[i];
    }
    return p;
  };

  DemoScene.prototype.frame = function (now) {
    if (!this.running) return;
    var elapsed = now - this.t0;
    var total = 26000;
    var progress = clamp(elapsed / total, 0, 1);
    if (this.barEl) this.barEl.style.width = progress * 100 + "%";

    var phase = this.phaseAt(elapsed);
    if (phase.name !== this._lastPhase) {
      this._lastPhase = phase.name;
      this.setSub(phase.sub);
    }

    var ctx = this.ctx;
    ctx.fillStyle = "#05040c";
    ctx.fillRect(0, 0, this.w, this.h);

    if (phase.name === "boot") {
      this.drawWarp(elapsed, 0.004);
      ctx.fillStyle = "rgba(0,245,255," + (0.3 + Math.sin(elapsed * 0.01) * 0.2) + ")";
      ctx.font = "14px ui-monospace,monospace";
      ctx.textAlign = "left";
      var lines = [
        "> G5PORTAL BIOS v2",
        "> Memory check …… OK",
        "> Loading atmosphere …",
        "> Weather link …… OK",
        "> Easter core …… ACTIVE"
      ];
      for (var i = 0; i < lines.length; i++) {
        if (elapsed > i * 350) ctx.fillText(lines[i], 24, 40 + i * 22);
      }
    } else if (phase.name === "warp") {
      this.drawWarp(elapsed, 0.022);
      this.drawSpectrum(elapsed);
    } else if (phase.name === "plasma") {
      if (!reduced) this.drawPlasma(elapsed, 0.85);
      else this.drawWarp(elapsed, 0.01);
      this.drawSpectrum(elapsed);
    } else if (phase.name === "tunnel") {
      this.drawWarp(elapsed, 0.008);
      this.drawTunnel(elapsed);
    } else if (phase.name === "title") {
      this.drawWarp(elapsed, 0.006);
      this.drawTitle(elapsed, "G⁵ PORTAL", 0.42);
    } else if (phase.name === "finale") {
      this.drawWarp(elapsed, 0.003);
      this.drawTitle(elapsed, "G⁵", 0.4);
      ctx.textAlign = "center";
      ctx.font = "13px system-ui,sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.shadowBlur = 0;
      ctx.fillText("type  demo  again · or  Ctrl+` → help", this.w / 2, this.h * 0.62);
    }

    if (elapsed >= total) {
      this.stop();
      return;
    }
    this.raf = requestAnimationFrame(this._boundFrame);
  };

  DemoScene.prototype.start = function () {
    if (this.running) return;
    this.mount();
    this.running = true;
    this.t0 = performance.now();
    this._lastPhase = "";
    this._boundFrame = this.frame.bind(this);
    this.audio.playSequence(10);
    this.raf = requestAnimationFrame(this._boundFrame);
  };

  DemoScene.prototype.stop = function () {
    if (!this.running && !this.root) return;
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.audio.stop();
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._onResize);
    if (this.root) {
      this.root.classList.add("closing");
      var root = this.root;
      setTimeout(function () {
        if (root.parentNode) root.remove();
      }, 320);
    }
    this.root = null;
    if (typeof this.onClose === "function") this.onClose();
  };

  /* ── Gravity particle sandbox ── */
  function GravitySandbox() {
    this.root = null;
    this.canvas = null;
    this.running = false;
    this.particles = [];
    this.mouse = { x: 0, y: 0, down: false };
  }

  GravitySandbox.prototype.start = function () {
    if (this.running) return;
    var root = document.createElement("div");
    root.className = "g5-demo-root g5-sandbox-root";
    root.innerHTML =
      '<canvas class="g5-demo-canvas"></canvas>' +
      '<div class="g5-demo-hud g5-sandbox-hud">' +
      "<div class=\"g5-demo-logo\">GRAVITY</div>" +
      '<div class="g5-demo-sub">ドラッグで引力 · クリックで粒子追加 · ESC 終了</div>' +
      "</div>" +
      '<button type="button" class="g5-demo-skip">閉じる</button>';
    document.body.appendChild(root);
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.running = true;
    var self = this;
    function resize() {
      self.w = innerWidth;
      self.h = innerHeight;
      self.canvas.width = self.w;
      self.canvas.height = self.h;
    }
    resize();
    this._onResize = resize;
    window.addEventListener("resize", resize);

    var n = reduced ? 80 : 220;
    this.particles = [];
    for (var i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: 0,
        vy: 0,
        r: 1.2 + Math.random() * 2.2,
        c: ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5"][i % 4]
      });
    }

    function pos(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    this._onMove = function (e) {
      var p = pos(e);
      self.mouse.x = p.x;
      self.mouse.y = p.y;
    };
    this._onDown = function (e) {
      self.mouse.down = true;
      self._onMove(e);
      /* burst add */
      for (var k = 0; k < 12; k++) {
        self.particles.push({
          x: self.mouse.x,
          y: self.mouse.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          r: 1.5 + Math.random() * 2,
          c: "#fff"
        });
      }
      if (self.particles.length > 500) self.particles.splice(0, self.particles.length - 500);
    };
    this._onUp = function () {
      self.mouse.down = false;
    };
    this._onKey = function (e) {
      if (e.key === "Escape") self.stop();
    };
    root.addEventListener("mousemove", this._onMove);
    root.addEventListener("touchmove", this._onMove, { passive: true });
    root.addEventListener("mousedown", this._onDown);
    root.addEventListener("touchstart", this._onDown, { passive: true });
    root.addEventListener("mouseup", this._onUp);
    root.addEventListener("touchend", this._onUp);
    document.addEventListener("keydown", this._onKey, true);
    root.querySelector(".g5-demo-skip").addEventListener("click", function () {
      self.stop();
    });

    this.mouse.x = this.w / 2;
    this.mouse.y = this.h / 2;
    this._bound = this.frame.bind(this);
    requestAnimationFrame(this._bound);
  };

  GravitySandbox.prototype.frame = function () {
    if (!this.running) return;
    var ctx = this.ctx;
    var ps = this.particles;
    var mx = this.mouse.x;
    var my = this.mouse.y;
    var g = this.mouse.down ? 0.45 : 0.18;
    ctx.fillStyle = "rgba(5,4,12,0.22)";
    ctx.fillRect(0, 0, this.w, this.h);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var dx = mx - p.x;
      var dy = my - p.y;
      var d = Math.sqrt(dx * dx + dy * dy) + 20;
      var f = g / d;
      p.vx += dx * f;
      p.vy += dy * f;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;
      ctx.beginPath();
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.85;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* attractor ring */
    ctx.beginPath();
    ctx.strokeStyle = this.mouse.down ? "rgba(255,45,149,0.7)" : "rgba(0,245,255,0.4)";
    ctx.lineWidth = 2;
    ctx.arc(mx, my, this.mouse.down ? 28 : 18, 0, Math.PI * 2);
    ctx.stroke();
    requestAnimationFrame(this._bound);
  };

  GravitySandbox.prototype.stop = function () {
    this.running = false;
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._onResize);
    if (this.root && this.root.parentNode) this.root.remove();
    this.root = null;
  };

  /* Public API */
  var demoInstance = null;
  var sandboxInstance = null;

  window.G5Demo = {
    _ready: true,
    start: function () {
      if (demoInstance && demoInstance.running) return;
      demoInstance = new DemoScene();
      demoInstance.start();
    },
    stop: function () {
      if (demoInstance) demoInstance.stop();
    },
    sandbox: function () {
      if (sandboxInstance && sandboxInstance.running) return;
      sandboxInstance = new GravitySandbox();
      sandboxInstance.start();
    }
  };
})();
