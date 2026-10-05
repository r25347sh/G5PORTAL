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

  var PAL = ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5", "#2ecc71", "#ff6b35"];

  function makeShell(title, sub) {
    var root = document.createElement("div");
    root.className = "g5-demo-root g5-sandbox-root";
    root.innerHTML =
      '<canvas class="g5-demo-canvas"></canvas>' +
      '<div class="g5-demo-hud g5-sandbox-hud">' +
      '<div class="g5-demo-logo">' +
      title +
      "</div>" +
      '<div class="g5-demo-sub">' +
      sub +
      "</div></div>" +
      '<button type="button" class="g5-demo-skip">閉じる · ESC</button>';
    document.body.appendChild(root);
    return root;
  }

  /* ── Gravity sandbox (orbit + emitters + no clump) ── */
  function GravitySandbox() {
    this.running = false;
    this.particles = [];
    this.mouse = { x: 0, y: 0, down: false };
    this.mode = 0; /* 0 orbit, 1 attract, 2 repel */
    this.emitAcc = 0;
    this.t0 = 0;
  }

  GravitySandbox.prototype.spawn = function (x, y, burst) {
    var speed = burst ? 4 + Math.random() * 5 : 0.5 + Math.random() * 2;
    var ang = Math.random() * Math.PI * 2;
    this.particles.push({
      x: x,
      y: y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 1.1 + Math.random() * 2.4,
      life: 1,
      age: 0,
      hue: (Math.random() * PAL.length) | 0
    });
  };

  GravitySandbox.prototype.spawnEdge = function () {
    var side = (Math.random() * 4) | 0;
    var x, y;
    if (side === 0) {
      x = Math.random() * this.w;
      y = -4;
    } else if (side === 1) {
      x = Math.random() * this.w;
      y = this.h + 4;
    } else if (side === 2) {
      x = -4;
      y = Math.random() * this.h;
    } else {
      x = this.w + 4;
      y = Math.random() * this.h;
    }
    this.spawn(x, y, false);
    /* bias toward center slightly */
    var p = this.particles[this.particles.length - 1];
    p.vx += (this.w / 2 - x) * 0.002;
    p.vy += (this.h / 2 - y) * 0.002;
  };

  GravitySandbox.prototype.start = function () {
    if (this.running) return;
    var root = makeShell(
      "GRAVITY",
      "マウス=軌道引力 · クリック=バースト · 1/2/3=モード · 端から粒子が湧く"
    );
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.running = true;
    this.mode = 0;
    this.t0 = performance.now();
    var self = this;
    function resize() {
      self.w = innerWidth;
      self.h = innerHeight;
      self.canvas.width = self.w;
      self.canvas.height = self.h;
      self.ctx.fillStyle = "#05040c";
      self.ctx.fillRect(0, 0, self.w, self.h);
    }
    resize();
    this._onResize = resize;
    window.addEventListener("resize", resize);

    this.particles = [];
    var n = reduced ? 100 : 280;
    for (var i = 0; i < n; i++) {
      this.spawn(Math.random() * this.w, Math.random() * this.h, false);
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
      for (var k = 0; k < 18; k++) self.spawn(self.mouse.x, self.mouse.y, true);
      self.trim();
    };
    this._onUp = function () {
      self.mouse.down = false;
    };
    this._onKey = function (e) {
      if (e.key === "Escape") self.stop();
      if (e.key === "1") self.mode = 0;
      if (e.key === "2") self.mode = 1;
      if (e.key === "3") self.mode = 2;
      if (e.key === " ") {
        for (var k = 0; k < 30; k++) self.spawnEdge();
        e.preventDefault();
      }
      var sub = root.querySelector(".g5-demo-sub");
      if (sub) {
        var labels = ["軌道 (orbit)", "引力 (attract)", "斥力 (repel)"];
        sub.textContent =
          "モード: " + labels[self.mode] + " · 1/2/3切替 · Space=噴出 · ESC終了";
      }
    };
    root.addEventListener("mousemove", this._onMove);
    root.addEventListener("touchmove", this._onMove, { passive: true });
    root.addEventListener("mousedown", this._onDown);
    root.addEventListener("touchstart", this._onDown, { passive: true });
    window.addEventListener("mouseup", this._onUp);
    window.addEventListener("touchend", this._onUp);
    document.addEventListener("keydown", this._onKey, true);
    root.querySelector(".g5-demo-skip").addEventListener("click", function () {
      self.stop();
    });
    this.mouse.x = this.w / 2;
    this.mouse.y = this.h / 2;
    this._bound = this.frame.bind(this);
    requestAnimationFrame(this._bound);
  };

  GravitySandbox.prototype.trim = function () {
    var max = reduced ? 280 : 520;
    if (this.particles.length > max) {
      this.particles.splice(0, this.particles.length - max);
    }
  };

  GravitySandbox.prototype.frame = function (now) {
    if (!this.running) return;
    var ctx = this.ctx;
    var ps = this.particles;
    var mx = this.mouse.x;
    var my = this.mouse.y;
    var dt = 1;
    /* soft trail */
    ctx.fillStyle = "rgba(5,4,12,0.18)";
    ctx.fillRect(0, 0, this.w, this.h);

    /* periodic edge emitters — keeps field alive */
    this.emitAcc += dt;
    if (this.emitAcc > (reduced ? 4 : 2)) {
      this.emitAcc = 0;
      var batch = reduced ? 2 : 5;
      for (var e = 0; e < batch; e++) this.spawnEdge();
      this.trim();
    }

    /* soft cull old / out-of-bounds slowly */
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.age++;
      var dx = mx - p.x;
      var dy = my - p.y;
      var d2 = dx * dx + dy * dy;
      var d = Math.sqrt(d2) + 1;
      var nx = dx / d;
      var ny = dy / d;

      /* force by mode — never pure 1/r collapse */
      var strength = this.mouse.down ? 0.55 : 0.22;
      var minD = 48;
      if (this.mode === 0) {
        /* orbital: tangential + mild radial */
        var radial = strength * 0.15 * (d > minD ? 1 : -1.2);
        var tang = strength * 1.1;
        p.vx += nx * radial + -ny * tang * (0.4 + Math.min(1, 120 / d));
        p.vy += ny * radial + nx * tang * (0.4 + Math.min(1, 120 / d));
      } else if (this.mode === 1) {
        var f = strength * (d > minD ? 80 / d : -1.5);
        p.vx += nx * f;
        p.vy += ny * f;
      } else {
        var fr = strength * (90 / Math.max(d, 30));
        p.vx -= nx * fr;
        p.vy -= ny * fr;
      }

      /* separation from a few neighbors (cheap) */
      if (i % 3 === 0 && i > 0) {
        var q = ps[i - 1];
        var sdx = p.x - q.x;
        var sdy = p.y - q.y;
        var sd = Math.sqrt(sdx * sdx + sdy * sdy) + 0.1;
        if (sd < 14) {
          p.vx += (sdx / sd) * 0.4;
          p.vy += (sdy / sd) * 0.4;
        }
      }

      p.vx *= 0.985;
      p.vy *= 0.985;
      /* speed limit */
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 9) {
        p.vx = (p.vx / sp) * 9;
        p.vy = (p.vy / sp) * 9;
      }
      p.x += p.vx;
      p.y += p.vy;

      /* recycle far particles */
      if (p.x < -40 || p.x > this.w + 40 || p.y < -40 || p.y > this.h + 40 || p.age > 900) {
        ps.splice(i, 1);
        continue;
      }

      var spd = Math.min(1, sp / 7);
      var col = PAL[p.hue % PAL.length];
      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35 + spd * 0.65;
      ctx.arc(p.x, p.y, p.r * (0.8 + spd * 0.6), 0, Math.PI * 2);
      ctx.fill();
      if (spd > 0.35) {
        ctx.beginPath();
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.35;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    /* cursor ring */
    ctx.beginPath();
    ctx.strokeStyle =
      this.mode === 2
        ? "rgba(255,107,53,0.7)"
        : this.mode === 1
          ? "rgba(255,45,149,0.7)"
          : "rgba(0,245,255,0.55)";
    ctx.lineWidth = 2;
    ctx.arc(mx, my, this.mouse.down ? 32 : 20, 0, Math.PI * 2);
    ctx.stroke();

    requestAnimationFrame(this._bound);
  };

  GravitySandbox.prototype.stop = function () {
    this.running = false;
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("mouseup", this._onUp);
    window.removeEventListener("touchend", this._onUp);
    if (this.root && this.root.parentNode) this.root.remove();
    this.root = null;
  };

  /* ── Flow field (Perlin-ish vector field) ── */
  function FlowField() {
    this.running = false;
  }

  /* compact value noise */
  function hash2(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function smoothNoise(x, y) {
    var x0 = Math.floor(x),
      y0 = Math.floor(y);
    var fx = x - x0,
      fy = y - y0;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    var a = hash2(x0, y0);
    var b = hash2(x0 + 1, y0);
    var c = hash2(x0, y0 + 1);
    var d = hash2(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  FlowField.prototype.start = function () {
    if (this.running) return;
    var root = makeShell("FLOW FIELD", "カーソルで渦 · 自動で流れる粒子 · ESC終了");
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
    this.mouse = { x: this.w / 2, y: this.h / 2 };
    this.particles = [];
    var n = reduced ? 400 : 900;
    for (var i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        life: Math.random()
      });
    }
    this.z = 0;
    this._onMove = function (e) {
      var t = e.touches ? e.touches[0] : e;
      if (t) {
        self.mouse.x = t.clientX;
        self.mouse.y = t.clientY;
      }
    };
    this._onKey = function (e) {
      if (e.key === "Escape") self.stop();
    };
    root.addEventListener("mousemove", this._onMove);
    root.addEventListener("touchmove", this._onMove, { passive: true });
    document.addEventListener("keydown", this._onKey, true);
    root.querySelector(".g5-demo-skip").addEventListener("click", function () {
      self.stop();
    });
    this.ctx.fillStyle = "#05040c";
    this.ctx.fillRect(0, 0, this.w, this.h);
    this._bound = this.frame.bind(this);
    requestAnimationFrame(this._bound);
  };

  FlowField.prototype.frame = function () {
    if (!this.running) return;
    var ctx = this.ctx;
    var w = this.w,
      h = this.h;
    ctx.fillStyle = "rgba(5,4,12,0.08)";
    ctx.fillRect(0, 0, w, h);
    this.z += 0.003;
    var scale = 0.0045;
    var mx = this.mouse.x,
      my = this.mouse.y;
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var n1 = smoothNoise(p.x * scale, p.y * scale + this.z);
      var n2 = smoothNoise(p.x * scale + 40, p.y * scale + this.z);
      var angle = n1 * Math.PI * 4;
      /* swirl near cursor */
      var dx = p.x - mx,
        dy = p.y - my;
      var dist = Math.sqrt(dx * dx + dy * dy) + 1;
      if (dist < 180) {
        angle += ((180 - dist) / 180) * 1.8;
      }
      var sp = 1.2 + n2 * 1.8;
      p.x += Math.cos(angle) * sp;
      p.y += Math.sin(angle) * sp;
      p.life -= 0.002;
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h || p.life <= 0) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.life = 0.5 + Math.random() * 0.5;
      }
      var c = PAL[(n1 * PAL.length) | 0];
      ctx.beginPath();
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.25 + p.life * 0.5;
      ctx.lineWidth = 1;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(angle) * 4, p.y - Math.sin(angle) * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(this._bound);
  };

  FlowField.prototype.stop = function () {
    this.running = false;
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._onResize);
    if (this.root && this.root.parentNode) this.root.remove();
    this.root = null;
  };

  /* ── Julia / Mandelbrot explorer ── */
  function FractalExplorer() {
    this.running = false;
  }

  FractalExplorer.prototype.start = function () {
    if (this.running) return;
    var root = makeShell(
      "FRACTAL",
      "ドラッグでパン · ホイールでズーム · J/M 切替 · ESC終了"
    );
    this.root = root;
    this.canvas = root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.running = true;
    this.mode = "julia"; /* julia | mandel */
    this.cx = 0;
    this.cy = 0;
    this.scale = 2.8;
    this.jx = -0.4;
    this.jy = 0.6;
    this.dirty = true;
    this.drag = null;
    var self = this;
    function resize() {
      self.w = Math.min(innerWidth, 900);
      self.h = Math.min(innerHeight - 80, 700);
      self.canvas.width = self.w;
      self.canvas.height = self.h;
      self.canvas.style.width = self.w + "px";
      self.canvas.style.height = self.h + "px";
      self.canvas.style.position = "relative";
      self.canvas.style.margin = "auto";
      self.canvas.style.top = "50%";
      self.canvas.style.transform = "translateY(-50%)";
      self.dirty = true;
    }
    resize();
    this._onResize = resize;
    window.addEventListener("resize", resize);

    this._onWheel = function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 1.12 : 0.89;
      self.scale *= factor;
      self.dirty = true;
    };
    this._onDown = function (e) {
      self.drag = { x: e.clientX, y: e.clientY, cx: self.cx, cy: self.cy };
    };
    this._onMove = function (e) {
      if (!self.drag) return;
      var dx = e.clientX - self.drag.x;
      var dy = e.clientY - self.drag.y;
      self.cx = self.drag.cx - (dx / self.w) * self.scale * 2;
      self.cy = self.drag.cy - (dy / self.h) * self.scale * 2;
      self.dirty = true;
    };
    this._onUp = function () {
      self.drag = null;
    };
    this._onKey = function (e) {
      if (e.key === "Escape") self.stop();
      if (e.key === "j" || e.key === "J") {
        self.mode = "julia";
        self.dirty = true;
      }
      if (e.key === "m" || e.key === "M") {
        self.mode = "mandel";
        self.dirty = true;
      }
      if (e.key === "r" || e.key === "R") {
        self.cx = 0;
        self.cy = 0;
        self.scale = 2.8;
        self.dirty = true;
      }
    };
    /* animate julia seed slowly */
    this.t0 = performance.now();
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("mousedown", this._onDown);
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
    document.addEventListener("keydown", this._onKey, true);
    root.querySelector(".g5-demo-skip").addEventListener("click", function () {
      self.stop();
    });
    this._bound = this.frame.bind(this);
    requestAnimationFrame(this._bound);
  };

  FractalExplorer.prototype.render = function () {
    var w = this.w,
      h = this.h;
    var img = this.ctx.createImageData(w, h);
    var data = img.data;
    var maxIter = reduced ? 40 : 64;
    var scale = this.scale;
    var cx = this.cx,
      cy = this.cy;
    var isJulia = this.mode === "julia";
    var jx = this.jx,
      jy = this.jy;
    for (var py = 0; py < h; py++) {
      for (var px = 0; px < w; px++) {
        var x0 = ((px / w) * 2 - 1) * scale + cx;
        var y0 = ((py / h) * 2 - 1) * scale * (h / w) + cy;
        var x, y, zx, zy;
        if (isJulia) {
          zx = x0;
          zy = y0;
          x = jx;
          y = jy;
        } else {
          zx = 0;
          zy = 0;
          x = x0;
          y = y0;
        }
        var iter = 0;
        while (zx * zx + zy * zy < 4 && iter < maxIter) {
          var nz = zx * zx - zy * zy + x;
          zy = 2 * zx * zy + y;
          zx = nz;
          iter++;
        }
        var i = (py * w + px) * 4;
        if (iter >= maxIter) {
          data[i] = 8;
          data[i + 1] = 6;
          data[i + 2] = 18;
          data[i + 3] = 255;
        } else {
          var t = iter / maxIter;
          data[i] = (20 + t * 255) | 0;
          data[i + 1] = (10 + t * 120) | 0;
          data[i + 2] = (80 + (1 - t) * 175) | 0;
          data[i + 3] = 255;
        }
      }
    }
    this.ctx.putImageData(img, 0, 0);
    this.ctx.fillStyle = "rgba(255,255,255,0.55)";
    this.ctx.font = "12px ui-monospace,monospace";
    this.ctx.fillText(
      (isJulia ? "Julia" : "Mandelbrot") + "  scale=" + scale.toFixed(4),
      12,
      20
    );
  };

  FractalExplorer.prototype.frame = function (now) {
    if (!this.running) return;
    if (this.mode === "julia") {
      var t = (now - this.t0) * 0.00025;
      this.jx = -0.4 + Math.sin(t) * 0.35;
      this.jy = 0.6 + Math.cos(t * 0.8) * 0.25;
      this.dirty = true;
    }
    if (this.dirty) {
      this.render();
      this.dirty = false;
    }
    requestAnimationFrame(this._bound);
  };

  FractalExplorer.prototype.stop = function () {
    this.running = false;
    document.removeEventListener("keydown", this._onKey, true);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("mouseup", this._onUp);
    if (this.canvas) this.canvas.removeEventListener("wheel", this._onWheel);
    if (this.root && this.root.parentNode) this.root.remove();
    this.root = null;
  };

  /* Public API */
  var demoInstance = null;
  var sandboxInstance = null;
  var flowInstance = null;
  var fractalInstance = null;

  window.G5Demo = {
    _ready: true,
    start: function () {
      if (demoInstance && demoInstance.running) return;
      demoInstance = new DemoScene();
      demoInstance.start();
    },
    stop: function () {
      if (demoInstance) demoInstance.stop();
      if (sandboxInstance) sandboxInstance.stop();
      if (flowInstance) flowInstance.stop();
      if (fractalInstance) fractalInstance.stop();
    },
    sandbox: function () {
      if (sandboxInstance && sandboxInstance.running) return;
      sandboxInstance = new GravitySandbox();
      sandboxInstance.start();
    },
    flow: function () {
      if (flowInstance && flowInstance.running) return;
      flowInstance = new FlowField();
      flowInstance.start();
    },
    fractal: function () {
      if (fractalInstance && fractalInstance.running) return;
      fractalInstance = new FractalExplorer();
      fractalInstance.start();
    }
  };
})();
