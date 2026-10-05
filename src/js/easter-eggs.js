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

  function spawnParticleField(opts) {
    opts = opts || {};
    ensureCss();
    var canvas = document.createElement("canvas");
    canvas.className = "g5-easter-fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w, h, particles = [], running = true, t0 = performance.now();

    function resize() {
      var dpr = window.devicePixelRatio > 1 ? 1.25 : 1;
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
    resize();
    window.addEventListener("resize", resize);

    var count = opts.count || 80;
    var colors = opts.colors || ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5", "#ffffff"];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (opts.speed || 2.5),
        vy: (Math.random() - 0.5) * (opts.speed || 2.5) - (opts.up || 0),
        r: 1 + Math.random() * (opts.maxR || 3.5),
        c: colors[(Math.random() * colors.length) | 0],
        life: 0.5 + Math.random() * 0.5
      });
    }

    function frame(now) {
      if (!running || !canvas.parentNode) return;
      var dt = Math.min(32, now - t0) / 16;
      t0 = now;
      ctx.fillStyle = opts.fade || "rgba(7,5,15,0.15)";
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= 0.004 * dt;
        if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w;
          p.y = opts.fromBottom ? h + 10 : Math.random() * h;
          p.life = 0.5 + Math.random() * 0.5;
        }
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    if (!reducedMotion) requestAnimationFrame(frame);

    setTimeout(function () {
      running = false;
      canvas.style.transition = "opacity 0.6s";
      canvas.style.opacity = "0";
      setTimeout(function () {
        if (canvas.parentNode) canvas.remove();
        window.removeEventListener("resize", resize);
      }, 650);
    }, opts.lifetime || 3500);
  }

  function barrelRoll() {
    ensureCss();
    playJingle("konami");
    document.body.classList.remove("g5-barrel-roll");
    void document.body.offsetWidth;
    document.body.classList.add("g5-barrel-roll");
    toast("🌀 Do a barrel roll!");
    spawnParticleField({ count: 60, speed: 4, lifetime: 1600 });
    setTimeout(function () {
      document.body.classList.remove("g5-barrel-roll");
    }, 1600);
  }

  function portalAwaken() {
    ensureCss();
    playJingle("boot");
    var ov = document.createElement("div");
    ov.className = "g5-easter-portal";
    document.body.appendChild(ov);
    spawnParticleField({ count: 100, speed: 3, up: 1.5, lifetime: 2200 });
    toast("✨ G⁵ ポータル覚醒");
    setTimeout(function () {
      if (ov.parentNode) ov.remove();
    }, 2000);
  }

  /* Console */
  var consoleOpen = false;
  var consoleEl = null;
  var consoleInput = null;
  var consoleOut = null;
  var consoleHistory = [];
  var consoleHistIdx = -1;

  var COMMANDS = {
    help: function () {
      return [
        "G⁵ Portal Console — commands:",
        "  help / about / theme / time / ls / whoami",
        "  games · snake · breakout",
        "  matrix · portal · roll",
        "  clear · exit · konami"
      ].join("\n");
    },
    about: function () {
      return "G⁵ Portal · Reitaku HS 5G\nEaster v2 · Web Audio + Canvas\n" + location.pathname;
    },
    games: function () {
      return "snake · breakout — type name to launch";
    },
    snake: function () {
      closeConsole();
      setTimeout(function () {
        GameSnake.start();
      }, 180);
      return "Launching Snake…";
    },
    breakout: function () {
      closeConsole();
      setTimeout(function () {
        GameBreakout.start();
      }, 180);
      return "Launching Breakout…";
    },
    matrix: function () {
      Matrix.toggle();
      return Matrix.active ? "Matrix ON" : "Matrix OFF";
    },
    portal: function () {
      portalAwaken();
      return "Portal sequence initiated.";
    },
    roll: function () {
      barrelRoll();
      return "Barrel roll!";
    },
    theme: function () {
      var r = document.documentElement;
      return (
        "scheme: " +
        (r.getAttribute("data-color-scheme") || "?") +
        "\nperiod: " +
        (r.dataset.period || "?") +
        "\nweather: " +
        (r.dataset.weather || "?") +
        "\ntemp: " +
        (r.dataset.temp || "?") +
        "°"
      );
    },
    time: function () {
      return new Date().toLocaleString("ja-JP", { timeZoneName: "short" });
    },
    clear: function () {
      if (consoleOut) consoleOut.innerHTML = "";
      return null;
    },
    exit: function () {
      closeConsole();
      return null;
    },
    close: function () {
      closeConsole();
      return null;
    },
    konami: function () {
      return "↑↑↓↓←→←→BA";
    },
    ls: function () {
      return "char-count password-gen crypto qr timer random\ncolor-picker clock calendar multiquiz materials";
    },
    whoami: function () {
      return "guest@g5portal · 5年G組";
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureConsole() {
    if (consoleEl) return;
    ensureCss();
    consoleEl = document.createElement("div");
    consoleEl.id = "g5-console";
    consoleEl.innerHTML =
      '<div class="g5-console-chrome"><span class="g5-console-title">G⁵ Terminal</span>' +
      '<button type="button" class="g5-console-x" aria-label="close">×</button></div>' +
      '<pre class="g5-console-out" id="g5-console-out"></pre>' +
      '<div class="g5-console-line"><span class="g5-console-ps">g5&gt;</span>' +
      '<input type="text" class="g5-console-input" id="g5-console-input" autocomplete="off" spellcheck="false" /></div>';
    document.body.appendChild(consoleEl);
    consoleOut = consoleEl.querySelector("#g5-console-out");
    consoleInput = consoleEl.querySelector("#g5-console-input");
    consoleEl.querySelector(".g5-console-x").addEventListener("click", closeConsole);
    consoleInput.addEventListener("keydown", onConsoleKey);
    println("G⁵ Portal Console v2 — type <span class='g5-c-cmd'>help</span>");
  }

  function println(html) {
    if (!consoleOut) return;
    var line = document.createElement("div");
    line.className = "g5-console-row";
    line.innerHTML = html;
    consoleOut.appendChild(line);
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  function runCommand(raw) {
    var line = String(raw || "").trim();
    if (!line) return;
    consoleHistory.push(line);
    consoleHistIdx = consoleHistory.length;
    println("<span class='g5-c-ps'>g5&gt;</span> " + escapeHtml(line));
    var cmd = line.split(/\s+/)[0].toLowerCase();
    var fn = COMMANDS[cmd];
    if (fn) {
      var out = fn();
      if (out != null) println(escapeHtml(out).replace(/\n/g, "<br>"));
      playJingle("coin");
    } else {
      println("<span class='g5-c-err'>command not found: " + escapeHtml(cmd) + "</span>");
      playJingle("error");
    }
  }

  function onConsoleKey(e) {
    if (e.key === "Enter") {
      var v = consoleInput.value;
      consoleInput.value = "";
      runCommand(v);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (consoleHistIdx > 0) {
        consoleHistIdx--;
        consoleInput.value = consoleHistory[consoleHistIdx] || "";
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (consoleHistIdx < consoleHistory.length - 1) {
        consoleHistIdx++;
        consoleInput.value = consoleHistory[consoleHistIdx] || "";
      } else {
        consoleHistIdx = consoleHistory.length;
        consoleInput.value = "";
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      closeConsole();
      e.preventDefault();
    }
  }

  function openConsole() {
    ensureConsole();
    consoleEl.classList.add("open");
    consoleOpen = true;
    playJingle("boot");
    setTimeout(function () {
      consoleInput.focus();
    }, 40);
  }

  function closeConsole() {
    if (!consoleEl) return;
    consoleEl.classList.remove("open");
    consoleOpen = false;
    if (consoleInput) consoleInput.blur();
  }

  function toggleConsole() {
    if (consoleOpen) closeConsole();
    else openConsole();
  }

  /* Matrix */
  var Matrix = {
    active: false,
    canvas: null,
    _raf: null,
    toggle: function () {
      if (this.active) this.stop();
      else this.start();
    },
    start: function () {
      if (this.active) return;
      ensureCss();
      this.active = true;
      var canvas = document.createElement("canvas");
      canvas.className = "g5-matrix-canvas";
      document.body.appendChild(canvas);
      this.canvas = canvas;
      var ctx = canvas.getContext("2d");
      var cols, drops, w, h;
      var chars = "G5PORTAL麗澤005Gｱｲｳｴｵｶｷｸｹｺ01";
      var self = this;
      function resize() {
        w = canvas.width = innerWidth;
        h = canvas.height = innerHeight;
        cols = Math.floor(w / 14);
        drops = [];
        for (var i = 0; i < cols; i++) drops[i] = (Math.random() * h) / 14;
      }
      resize();
      function onResize() {
        resize();
      }
      window.addEventListener("resize", onResize);
      canvas._onResize = onResize;
      function draw() {
        if (!self.active) return;
        ctx.fillStyle = "rgba(7,5,15,0.08)";
        ctx.fillRect(0, 0, w, h);
        ctx.font = "13px ui-monospace, monospace";
        for (var i = 0; i < drops.length; i++) {
          var ch = chars.charAt((Math.random() * chars.length) | 0);
          var y = drops[i] * 14;
          ctx.fillStyle = "#00f5ff";
          ctx.fillText(ch, i * 14, y);
          if (y > h && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        self._raf = requestAnimationFrame(draw);
      }
      draw();
      toast("Matrix ON · matrix で停止");
    },
    stop: function () {
      this.active = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this.canvas) {
        if (this.canvas._onResize) window.removeEventListener("resize", this.canvas._onResize);
        if (this.canvas.parentNode) this.canvas.remove();
      }
      this.canvas = null;
    }
  };

  function GameShell(title) {
    ensureCss();
    var root = document.createElement("div");
    root.className = "g5-game-shell";
    root.innerHTML =
      '<div class="g5-game-bar"><span class="g5-game-title">' +
      title +
      '</span><span class="g5-game-score" data-score>0</span>' +
      '<button type="button" class="g5-game-close" aria-label="close">×</button></div>' +
      '<canvas class="g5-game-canvas"></canvas><div class="g5-game-hint" data-hint></div>';
    document.body.appendChild(root);
    var canvas = root.querySelector("canvas");
    var scoreEl = root.querySelector("[data-score]");
    var hintEl = root.querySelector("[data-hint]");
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      root.classList.add("closing");
      setTimeout(function () {
        if (root.parentNode) root.remove();
      }, 280);
    }
    root.querySelector(".g5-game-close").addEventListener("click", close);
    return {
      root: root,
      canvas: canvas,
      setScore: function (n) {
        scoreEl.textContent = String(n);
      },
      setHint: function (t) {
        hintEl.textContent = t;
      },
      close: close,
      isClosed: function () {
        return closed;
      }
    };
  }

  var GameSnake = {
    start: function () {
      if (reducedMotion) {
        toast("reduced-motion: game skipped");
        return;
      }
      var shell = GameShell("SNAKE · G⁵");
      shell.setHint("矢印 / WASD · ESC 終了 · Space 再開");
      playJingle("boot");
      var canvas = shell.canvas;
      var ctx = canvas.getContext("2d");
      var grid = 20;
      var cols, rows, snake, dir, nextDir, food, score, alive, acc, last;
      var keyHandler;

      function resize() {
        var maxW = Math.min(innerWidth - 32, 480);
        var maxH = Math.min(innerHeight - 120, 480);
        cols = Math.floor(maxW / grid);
        rows = Math.floor(maxH / grid);
        canvas.width = cols * grid;
        canvas.height = rows * grid;
      }
      function placeFood() {
        var ok = false;
        while (!ok) {
          food = { x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0 };
          ok = !snake.some(function (s) {
            return s.x === food.x && s.y === food.y;
          });
        }
      }
      function reset() {
        resize();
        snake = [
          { x: (cols / 2) | 0, y: (rows / 2) | 0 },
          { x: ((cols / 2) | 0) - 1, y: (rows / 2) | 0 }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        alive = true;
        acc = 0;
        placeFood();
        shell.setScore(0);
      }
      function die() {
        alive = false;
        playJingle("error");
        shell.setHint("GAME OVER · Space 再開 · ESC 終了 · " + score);
      }
      function tick() {
        if (!alive) return;
        dir = nextDir;
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) return die();
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) return die();
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10;
          shell.setScore(score);
          playJingle("coin");
          placeFood();
        } else snake.pop();
      }
      function draw() {
        ctx.fillStyle = "#0a0814";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff2d95";
        ctx.shadowColor = "#ff2d95";
        ctx.shadowBlur = 12;
        ctx.fillRect(food.x * grid + 2, food.y * grid + 2, grid - 4, grid - 4);
        ctx.shadowBlur = 0;
        for (var i = 0; i < snake.length; i++) {
          ctx.fillStyle = i === 0 ? "#00f5ff" : "rgba(0,245,255,0.75)";
          if (i === 0) {
            ctx.shadowColor = "#00f5ff";
            ctx.shadowBlur = 10;
          }
          ctx.fillRect(snake[i].x * grid + 1, snake[i].y * grid + 1, grid - 2, grid - 2);
          ctx.shadowBlur = 0;
        }
        if (!alive) {
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        }
      }
      keyHandler = function (e) {
        if (shell.isClosed()) return;
        var k = e.key;
        if (k === "ArrowUp" || k === "w" || k === "W") {
          if (dir.y !== 1) nextDir = { x: 0, y: -1 };
          e.preventDefault();
        } else if (k === "ArrowDown" || k === "s" || k === "S") {
          if (dir.y !== -1) nextDir = { x: 0, y: 1 };
          e.preventDefault();
        } else if (k === "ArrowLeft" || k === "a" || k === "A") {
          if (dir.x !== 1) nextDir = { x: -1, y: 0 };
          e.preventDefault();
        } else if (k === "ArrowRight" || k === "d" || k === "D") {
          if (dir.x !== -1) nextDir = { x: 1, y: 0 };
          e.preventDefault();
        } else if ((k === " " || k === "Enter") && !alive) {
          reset();
          shell.setHint("矢印 / WASD · ESC 終了");
          e.preventDefault();
        } else if (k === "Escape") {
          document.removeEventListener("keydown", keyHandler, true);
          shell.close();
        }
      };
      document.addEventListener("keydown", keyHandler, true);
      reset();
      last = performance.now();
      var speed = 130;
      function loop(now) {
        if (shell.isClosed()) {
          document.removeEventListener("keydown", keyHandler, true);
          return;
        }
        acc += now - last;
        last = now;
        while (acc >= speed) {
          tick();
          acc -= speed;
        }
        draw();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
  };

  var GameBreakout = {
    start: function () {
      if (reducedMotion) {
        toast("reduced-motion: game skipped");
        return;
      }
      var shell = GameShell("BREAKOUT · G⁵");
      shell.setHint("マウス / タッチ · ESC 終了");
      playJingle("boot");
      var canvas = shell.canvas;
      var ctx = canvas.getContext("2d");
      var W = 400,
        H = 520;
      canvas.width = W;
      canvas.height = H;
      var paddle, ball, bricks, score, lives, running, keys;

      function reset() {
        paddle = { w: 72, h: 12, x: W / 2 - 36, y: H - 36, speed: 7 };
        ball = {
          x: W / 2,
          y: H - 60,
          r: 6,
          vx: 2.8 * (Math.random() > 0.5 ? 1 : -1),
          vy: -3.2
        };
        bricks = [];
        var colors = ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5", "#2ecc71"];
        var rows = 6,
          cols = 8,
          bw = (W - 40) / cols,
          bh = 16;
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            bricks.push({
              x: 20 + c * bw,
              y: 40 + r * (bh + 6),
              w: bw - 4,
              h: bh,
              alive: true,
              color: colors[r % colors.length]
            });
          }
        }
        score = 0;
        lives = 3;
        running = true;
        shell.setScore(0);
      }

      function collide(a, b) {
        return (
          a.x + a.r > b.x &&
          a.x - a.r < b.x + b.w &&
          a.y + a.r > b.y &&
          a.y - a.r < b.y + b.h
        );
      }

      function update() {
        if (!running) return;
        if (keys.left) paddle.x -= paddle.speed;
        if (keys.right) paddle.x += paddle.speed;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.x < ball.r || ball.x > W - ball.r) {
          ball.vx *= -1;
          beep(400, 0.04, "square", 0.03);
        }
        if (ball.y < ball.r) {
          ball.vy *= -1;
          beep(400, 0.04, "square", 0.03);
        }
        if (
          ball.y + ball.r > paddle.y &&
          ball.y - ball.r < paddle.y + paddle.h &&
          ball.x > paddle.x &&
          ball.x < paddle.x + paddle.w
        ) {
          ball.vy = -Math.abs(ball.vy);
          var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hit * 3.5;
          beep(600, 0.05, "triangle", 0.04);
        }
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          if (!br.alive) continue;
          if (collide(ball, br)) {
            br.alive = false;
            ball.vy *= -1;
            score += 15;
            shell.setScore(score);
            playJingle("coin");
            break;
          }
        }
        if (ball.y > H) {
          lives--;
          playJingle("error");
          if (lives <= 0) {
            running = false;
            shell.setHint("GAME OVER · Space 再開 · " + score);
          } else {
            ball.x = W / 2;
            ball.y = H - 60;
            ball.vx = 2.8 * (Math.random() > 0.5 ? 1 : -1);
            ball.vy = -3.2;
            shell.setHint("残機 " + lives);
          }
        }
        var left = 0;
        for (var j = 0; j < bricks.length; j++) if (bricks[j].alive) left++;
        if (left === 0) {
          running = false;
          playJingle("win");
          shell.setHint("CLEAR! " + score + " · Space 再開");
          spawnParticleField({ count: 90, lifetime: 2000 });
        }
      }

      function draw() {
        ctx.fillStyle = "#0a0814";
        ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          if (!br.alive) continue;
          ctx.fillStyle = br.color;
          ctx.shadowColor = br.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(br.x, br.y, br.w, br.h);
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = "#00f5ff";
        ctx.shadowColor = "#00f5ff";
        ctx.shadowBlur = 12;
        ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 10;
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "12px system-ui";
        ctx.fillText("Lives " + lives, 12, 18);
        if (!running) {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(0, 0, W, H);
        }
      }

      keys = { left: false, right: false };
      function onKey(e) {
        if (shell.isClosed()) return;
        if (e.key === "ArrowLeft" || e.key === "a") keys.left = e.type === "keydown";
        if (e.key === "ArrowRight" || e.key === "d") keys.right = e.type === "keydown";
        if ((e.key === " " || e.key === "Enter") && !running) {
          reset();
          shell.setHint("マウス / タッチ · ESC 終了");
          e.preventDefault();
        }
        if (e.key === "Escape") {
          cleanup();
          shell.close();
        }
      }
      function onMove(clientX) {
        var rect = canvas.getBoundingClientRect();
        var x = ((clientX - rect.left) / rect.width) * W;
        paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
      }
      function cleanup() {
        document.removeEventListener("keydown", onKey, true);
        document.removeEventListener("keyup", onKey, true);
        canvas.removeEventListener("mousemove", onMouse);
        canvas.removeEventListener("touchmove", onTouch);
      }
      function onMouse(e) {
        onMove(e.clientX);
      }
      function onTouch(e) {
        if (e.touches[0]) onMove(e.touches[0].clientX);
        e.preventDefault();
      }
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("keyup", onKey, true);
      canvas.addEventListener("mousemove", onMouse);
      canvas.addEventListener("touchmove", onTouch, { passive: false });
      reset();
      function loop() {
        if (shell.isClosed()) {
          cleanup();
          return;
        }
        update();
        draw();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
  };

  var KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  var konamiIdx = 0;
  var typeBuf = "";
  var typeTimer = null;
  var logoClicks = 0;
  var logoTimer = null;

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "`" || e.key === "k" || e.key === "K")) {
      toggleConsole();
      e.preventDefault();
      return;
    }
    if (consoleOpen) return;

    if (e.keyCode === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        barrelRoll();
        setTimeout(function () {
          toast("Ctrl+` でコンソール · snake / breakout");
        }, 900);
      }
    } else {
      konamiIdx = e.keyCode === KONAMI[0] ? 1 : 0;
    }

    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (isTypingTarget(e.target)) return;
      typeBuf += e.key.toLowerCase();
      if (typeBuf.length > 48) typeBuf = typeBuf.slice(-48);
      clearTimeout(typeTimer);
      typeTimer = setTimeout(function () {
        typeBuf = "";
      }, 2800);
      if (typeBuf.indexOf("barrel roll") >= 0) {
        typeBuf = "";
        barrelRoll();
      } else if (typeBuf.indexOf("g5portal") >= 0) {
        typeBuf = "";
        portalAwaken();
      } else if (typeBuf.indexOf("matrix") >= 0) {
        typeBuf = "";
        Matrix.toggle();
      } else if (typeBuf.indexOf("snake") >= 0) {
        typeBuf = "";
        GameSnake.start();
      } else if (typeBuf.indexOf("breakout") >= 0) {
        typeBuf = "";
        GameBreakout.start();
      } else if (typeBuf.indexOf("console") >= 0 || typeBuf.indexOf("terminal") >= 0) {
        typeBuf = "";
        openConsole();
      } else if (typeBuf.indexOf("askew") >= 0) {
        typeBuf = "";
        ensureCss();
        document.documentElement.classList.toggle("g5-askew");
      }
    }
  }

  function bindLogo() {
    document.querySelectorAll("h1, .hero h1, .hero-badge, .tool-header h1").forEach(function (el) {
      if (el._g5e2) return;
      el._g5e2 = true;
      el.addEventListener("click", function () {
        logoClicks++;
        clearTimeout(logoTimer);
        logoTimer = setTimeout(function () {
          logoClicks = 0;
        }, 800);
        if (logoClicks >= 5) {
          logoClicks = 0;
          portalAwaken();
        }
      });
    });
  }

  function toolEggs() {
    var path = location.pathname || "";
    if (path.indexOf("password-gen") >= 0) {
      var lenEl = document.getElementById("len");
      var btn = document.getElementById("btn-gen");
      if (btn && !btn._g5e2) {
        btn._g5e2 = true;
        btn.addEventListener("click", function () {
          if (lenEl && +lenEl.value === 42) {
            setTimeout(function () {
              toast("🌌 答えは 42");
              playJingle("win");
            }, 180);
          }
        });
      }
    }
    if (path.indexOf("char-count") >= 0) {
      var input = document.getElementById("input");
      if (input && !input._g5e2) {
        input._g5e2 = true;
        input.addEventListener("input", function () {
          var v = input.value || "";
          if (v === "console") openConsole();
          if (v === "snake") GameSnake.start();
          if (v === "麗澤") portalAwaken();
        });
      }
    }
  }

  function boot() {
    ensureCss();
    document.addEventListener("keydown", onKeydown, true);
    bindLogo();
    toolEggs();
    setTimeout(bindLogo, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.G5Easter = {
    console: toggleConsole,
    snake: function () {
      GameSnake.start();
    },
    breakout: function () {
      GameBreakout.start();
    },
    matrix: function () {
      Matrix.toggle();
    },
    roll: barrelRoll,
    portal: portalAwaken
  };
})();
