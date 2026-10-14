/**
 * G⁵ Easter patch v5.2
 * - Subpage: portal awaken OFF (soft toast only 「時は味方 · Calendar never ends」)
 * - Console: full command set (fortune/neofetch/status/…) + Tab + history
 * - Extra games: pong · rps · react
 * Loaded after easter-eggs.js by main.js
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_PATCH__) return;
  window.__G5_EASTER_PATCH__ = true;

  function isSubPage() {
    return (location.pathname || "").indexOf("/pages/") >= 0;
  }

  function softToast(msg) {
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
    }, 2600);
  }

  function neutralizePortalFx() {
    if (!isSubPage()) return;
    document.querySelectorAll(".g5-easter-portal").forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    var toast = document.getElementById("g5-easter-toast");
    if (
      toast &&
      /ポータル覚醒|Portal sequence|G⁵ ポータル|portal awaken/i.test(toast.textContent || "")
    ) {
      toast.textContent = "時は味方 · Calendar never ends";
    }
  }

  var CMD_LIST = [
    "help", "about", "version", "neofetch", "fortune", "status", "weather",
    "theme", "time", "date", "now", "ls", "whoami", "echo", "history",
    "demo", "sandbox", "gravity", "flow", "fractal", "games",
    "snake", "breakout", "pong", "rps", "react",
    "matrix", "portal", "roll", "cal", "calendar",
    "clear", "exit", "close", "konami", "pwd", "id"
  ];

  var FORTUNES = [
    "時は味方 · Calendar never ends",
    "5Gは速度だけじゃない · 仲間の密度だ",
    "Ctrl+` でいつでも戻ってこられる",
    "試験の前に deep breath",
    "今日の1コミットが明日を救う",
    "麗澤の空は広い · 君の可能性も",
    "バグは仕様の親戚 · 仲良くしよう",
    "コードは書くより読む時間が長い",
    "一息ついてから次の一行を",
    "コンソールは友達 · help で話しかけて"
  ];

  function esc(s) {
    var out = "";
    var amp = String.fromCharCode(38);
    for (var i = 0; i < String(s).length; i++) {
      var c = s.charCodeAt(i);
      if (c === 38 || c === 60 || c === 62 || c === 34) {
        out += amp + "#" + c + ";";
      } else {
        out += s.charAt(i);
      }
    }
    return out;
  }

  /* ---------- extra games (self-contained) ---------- */
  function startPong() {
    if (document.getElementById("g5-pong-shell")) return;
    var shell = document.createElement("div");
    shell.id = "g5-pong-shell";
    shell.className = "g5-game-shell";
    shell.innerHTML =
      '<div class="g5-game-bar"><span class="g5-game-title">PONG</span>' +
      '<span class="g5-game-score" id="g5-pong-score">0 : 0</span>' +
      '<button type="button" class="g5-game-close" aria-label="close">×</button></div>' +
      '<canvas class="g5-game-canvas" id="g5-pong-cv" width="480" height="320"></canvas>' +
      '<p class="g5-game-hint">↑↓ or mouse · Esc to quit</p>';
    document.body.appendChild(shell);
    var cv = document.getElementById("g5-pong-cv");
    var ctx = cv.getContext("2d");
    var scoreEl = document.getElementById("g5-pong-score");
    var W = 480, H = 320;
    var paddleH = 56, paddleW = 10;
    var p1 = { y: H / 2 - paddleH / 2, score: 0 };
    var p2 = { y: H / 2 - paddleH / 2, score: 0 };
    var ball = { x: W / 2, y: H / 2, vx: 4, vy: 2.5, r: 7 };
    var keys = {};
    var alive = true;
    var raf = 0;

    function resetBall(dir) {
      ball.x = W / 2;
      ball.y = H / 2;
      ball.vx = 4 * (dir || (Math.random() > 0.5 ? 1 : -1));
      ball.vy = (Math.random() * 3 + 1.5) * (Math.random() > 0.5 ? 1 : -1);
    }

    function draw() {
      ctx.fillStyle = "#0a0814";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(0,245,255,0.25)";
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff2d95";
      ctx.fillRect(12, p1.y, paddleW, paddleH);
      ctx.fillStyle = "#00f5ff";
      ctx.fillRect(W - 12 - paddleW, p2.y, paddleW, paddleH);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    function update() {
      if (keys[38] || keys[87]) p1.y = Math.max(0, p1.y - 6);
      if (keys[40] || keys[83]) p1.y = Math.min(H - paddleH, p1.y + 6);
      var target = ball.y - paddleH / 2;
      p2.y += (target - p2.y) * 0.09;
      p2.y = Math.max(0, Math.min(H - paddleH, p2.y));

      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.y - ball.r < 0 || ball.y + ball.r > H) ball.vy *= -1;

      if (ball.x - ball.r < 22 && ball.y > p1.y && ball.y < p1.y + paddleH) {
        ball.vx = Math.abs(ball.vx) * 1.05;
        ball.vy += (ball.y - (p1.y + paddleH / 2)) * 0.12;
      }
      if (ball.x + ball.r > W - 22 && ball.y > p2.y && ball.y < p2.y + paddleH) {
        ball.vx = -Math.abs(ball.vx) * 1.05;
        ball.vy += (ball.y - (p2.y + paddleH / 2)) * 0.12;
      }

      if (ball.x < 0) {
        p2.score++;
        scoreEl.textContent = p1.score + " : " + p2.score;
        resetBall(1);
      } else if (ball.x > W) {
        p1.score++;
        scoreEl.textContent = p1.score + " : " + p2.score;
        resetBall(-1);
      }
    }

    function loop() {
      if (!alive) return;
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e) {
      keys[e.keyCode] = e.type === "keydown";
      if (e.key === "Escape") cleanup();
    }
    function onMove(e) {
      var rect = cv.getBoundingClientRect();
      var y = ((e.clientY || (e.touches && e.touches[0].clientY)) - rect.top) / rect.height * H;
      p1.y = Math.max(0, Math.min(H - paddleH, y - paddleH / 2));
    }
    function cleanup() {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
      if (shell.parentNode) shell.parentNode.removeChild(shell);
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKey, true);
    cv.addEventListener("mousemove", onMove);
    cv.addEventListener("touchmove", function (e) {
      onMove(e);
      e.preventDefault();
    }, { passive: false });
    shell.querySelector(".g5-game-close").addEventListener("click", cleanup);
    resetBall();
    loop();
  }

  function startRps() {
    var choices = ["rock", "paper", "scissors"];
    var labels = { rock: "✊ Rock", paper: "✋ Paper", scissors: "✌️ Scissors" };
    var shell = document.createElement("div");
    shell.id = "g5-rps-shell";
    shell.className = "g5-game-shell";
    shell.innerHTML =
      '<div class="g5-game-bar"><span class="g5-game-title">RPS</span>' +
      '<span class="g5-game-score" id="g5-rps-score">You 0 · CPU 0</span>' +
      '<button type="button" class="g5-game-close">×</button></div>' +
      '<div style="text-align:center;padding:1.5rem;color:#e8f7ff">' +
      '<p id="g5-rps-msg" style="min-height:2.5rem;font-size:1.1rem">選んでね</p>' +
      '<div style="display:flex;gap:0.75rem;justify-content:center;margin-top:1rem">' +
      '<button type="button" data-c="rock" class="g5-rps-btn" style="padding:0.7rem 1.1rem;border-radius:10px;border:1px solid #ff2d95;background:rgba(255,45,149,0.15);color:#ff8cc8;cursor:pointer;font-size:1rem">✊</button>' +
      '<button type="button" data-c="paper" class="g5-rps-btn" style="padding:0.7rem 1.1rem;border-radius:10px;border:1px solid #00f5ff;background:rgba(0,245,255,0.12);color:#00f5ff;cursor:pointer;font-size:1rem">✋</button>' +
      '<button type="button" data-c="scissors" class="g5-rps-btn" style="padding:0.7rem 1.1rem;border-radius:10px;border:1px solid #ffd700;background:rgba(255,215,0,0.12);color:#ffd700;cursor:pointer;font-size:1rem">✌️</button>' +
      "</div></div>" +
      '<p class="g5-game-hint">Esc to quit</p>';
    document.body.appendChild(shell);
    var you = 0, cpu = 0;
    var msg = document.getElementById("g5-rps-msg");
    var scoreEl = document.getElementById("g5-rps-score");
    function play(c) {
      var ai = choices[(Math.random() * 3) | 0];
      var result;
      if (c === ai) result = "引き分け";
      else if (
        (c === "rock" && ai === "scissors") ||
        (c === "paper" && ai === "rock") ||
        (c === "scissors" && ai === "paper")
      ) {
        result = "勝ち！";
        you++;
      } else {
        result = "負け…";
        cpu++;
      }
      msg.textContent = labels[c] + " vs " + labels[ai] + " → " + result;
      scoreEl.textContent = "You " + you + " · CPU " + cpu;
    }
    shell.querySelectorAll(".g5-rps-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        play(btn.getAttribute("data-c"));
      });
    });
    function cleanup() {
      document.removeEventListener("keydown", onKey, true);
      if (shell.parentNode) shell.parentNode.removeChild(shell);
    }
    function onKey(e) {
      if (e.key === "Escape") cleanup();
    }
    document.addEventListener("keydown", onKey, true);
    shell.querySelector(".g5-game-close").addEventListener("click", cleanup);
  }

  function startReact() {
    var shell = document.createElement("div");
    shell.id = "g5-react-shell";
    shell.className = "g5-game-shell";
    shell.innerHTML =
      '<div class="g5-game-bar"><span class="g5-game-title">REACTION</span>' +
      '<span class="g5-game-score" id="g5-react-best">best: —</span>' +
      '<button type="button" class="g5-game-close">×</button></div>' +
      '<div id="g5-react-area" style="width:min(420px,90vw);height:220px;margin:0 auto;border-radius:14px;background:#1a1028;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;font-size:1.25rem;color:#e8f7ff;border:1px solid rgba(0,245,255,0.25)">クリックでスタート</div>' +
      '<p class="g5-game-hint">緑になったらすぐクリック · Esc to quit</p>';
    document.body.appendChild(shell);
    var area = document.getElementById("g5-react-area");
    var bestEl = document.getElementById("g5-react-best");
    var state = "idle";
    var t0 = 0;
    var timer = null;
    var best = null;
    try {
      var b = localStorage.getItem("g5_react_best");
      if (b) {
        best = +b;
        bestEl.textContent = "best: " + best + " ms";
      }
    } catch (e) {}

    function arm() {
      state = "wait";
      area.style.background = "#3a1520";
      area.textContent = "待て…";
      var delay = 1200 + Math.random() * 2800;
      timer = setTimeout(function () {
        state = "go";
        t0 = performance.now();
        area.style.background = "#0a3a28";
        area.textContent = "今だ！";
      }, delay);
    }

    area.addEventListener("click", function () {
      if (state === "idle" || state === "result") {
        arm();
      } else if (state === "wait") {
        clearTimeout(timer);
        state = "result";
        area.style.background = "#3a1520";
        area.textContent = "早すぎ！ もう一回";
      } else if (state === "go") {
        var ms = Math.round(performance.now() - t0);
        state = "result";
        area.style.background = "#0a2038";
        area.textContent = ms + " ms";
        if (best == null || ms < best) {
          best = ms;
          bestEl.textContent = "best: " + best + " ms";
          try {
            localStorage.setItem("g5_react_best", String(best));
          } catch (e) {}
        }
      }
    });

    function cleanup() {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey, true);
      if (shell.parentNode) shell.parentNode.removeChild(shell);
    }
    function onKey(e) {
      if (e.key === "Escape") cleanup();
    }
    document.addEventListener("keydown", onKey, true);
    shell.querySelector(".g5-game-close").addEventListener("click", cleanup);
  }

  /* ---------- console enhancements ---------- */
  function enhanceApi() {
    if (!window.G5Easter) return false;
    var origPortal = window.G5Easter.portal;
    window.G5Easter.portal = function () {
      if (isSubPage()) {
        softToast("時は味方 · Calendar never ends");
        return;
      }
      if (typeof origPortal === "function") origPortal();
    };
    window.G5Easter.pong = startPong;
    window.G5Easter.rps = startRps;
    window.G5Easter.react = startReact;

    document.querySelectorAll(".tool-header h1, .tool-header .title").forEach(function (el) {
      if (el._g5patched) return;
      el._g5patched = true;
      var clone = el.cloneNode(true);
      if (el.parentNode) el.parentNode.replaceChild(clone, el);
    });
    return true;
  }

  function attachConsole() {
    var consoleEl = document.getElementById("g5-console");
    if (!consoleEl || consoleEl._g5v52) return;
    consoleEl._g5v52 = true;

    var input = document.getElementById("g5-console-input");
    var out = document.getElementById("g5-console-out");
    if (!input || !out) return;

    var hist = [];
    try {
      var raw = localStorage.getItem("g5_console_hist");
      if (raw) hist = JSON.parse(raw) || [];
    } catch (e) {}

    function println(html) {
      var line = document.createElement("div");
      line.className = "g5-console-row";
      line.innerHTML = html;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    var EXTRA = {
      fortune: function () {
        return FORTUNES[(Math.random() * FORTUNES.length) | 0];
      },
      neofetch: function () {
        var r = document.documentElement;
        return [
          "guest@g5portal",
          "---------------",
          "OS: G⁵ Portal",
          "Host: Reitaku HS 5G",
          "Path: " + (location.pathname || "/"),
          "Scheme: " + (r.getAttribute("data-color-scheme") || "?"),
          "Period: " + (r.dataset.period || "?"),
          "Weather: " + (r.dataset.weather || "?") + " " + (r.dataset.temp || "?") + "°",
          "Screen: " + window.innerWidth + "×" + window.innerHeight,
          "Shell: G⁵ Terminal v5.2"
        ].join("\n");
      },
      status: function () {
        return EXTRA.neofetch();
      },
      weather: function () {
        var r = document.documentElement;
        return "weather: " + (r.dataset.weather || "?") + " · " + (r.dataset.temp || "?") + "°";
      },
      version: function () {
        return "G⁵ Terminal v5.2 · easter system";
      },
      date: function () {
        return new Date().toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long"
        });
      },
      now: function () {
        return new Date().toLocaleString("ja-JP", { timeZoneName: "short" });
      },
      echo: function (args) {
        return (args || []).join(" ");
      },
      history: function () {
        if (!hist.length) return "(empty)";
        return hist
          .slice(-20)
          .map(function (h, i) {
            return String(i + 1).padStart(3) + "  " + h;
          })
          .join("\n");
      },
      pwd: function () {
        return location.pathname || "/";
      },
      id: function () {
        return "uid=0(guest) gid=0(g5) groups=5G";
      },
      cal: function () {
        if (isSubPage() && (location.pathname || "").indexOf("calendar") >= 0) {
          return "すでにカレンダーにいます · 時は味方";
        }
        var base = isSubPage() ? "../../" : "./";
        try {
          location.href = base + "pages/calendar/";
        } catch (e) {}
        return "Opening calendar…";
      },
      calendar: function () {
        return EXTRA.cal();
      },
      games: function () {
        return "snake · breakout · pong · rps · react · demo · sandbox · flow · fractal";
      },
      pong: function () {
        startPong();
        return "Launching Pong…";
      },
      rps: function () {
        startRps();
        return "Launching Rock-Paper-Scissors…";
      },
      react: function () {
        startReact();
        return "Launching Reaction test…";
      },
      help: function () {
        return [
          "G⁵ Terminal v5.2 — commands:",
          "  help · about · version · neofetch · fortune · status · weather",
          "  theme · time · date · now · ls · whoami · echo · history · pwd",
          "  demo · sandbox · flow · fractal",
          "  games · snake · breakout · pong · rps · react",
          "  matrix · portal · roll · cal",
          "  clear · exit · konami",
          "Tab で補完 · ↑↓ で履歴 · Ctrl+` で開閉"
        ].join("\n");
      }
    };

    input.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Tab") {
          e.preventDefault();
          e.stopImmediatePropagation();
          var v = input.value;
          var parts = v.split(/\s+/);
          if (parts.length > 1) return;
          var prefix = (parts[0] || "").toLowerCase();
          if (!prefix) return;
          var matches = CMD_LIST.filter(function (c) {
            return c.indexOf(prefix) === 0;
          });
          if (matches.length === 1) {
            input.value = matches[0];
          } else if (matches.length > 1) {
            println("<span class='g5-c-cmd'>" + matches.join("  ") + "</span>");
            var common = matches[0];
            for (var i = 1; i < matches.length; i++) {
              while (common && matches[i].indexOf(common) !== 0) {
                common = common.slice(0, -1);
              }
            }
            if (common && common.length > prefix.length) input.value = common;
          }
          return;
        }

        if (e.key === "Enter") {
          var line = String(input.value || "").trim();
          if (!line) return;
          var parts = line.split(/\s+/);
          var cmd = parts[0].toLowerCase();
          var args = parts.slice(1);

          hist.push(line);
          if (hist.length > 80) hist = hist.slice(-80);
          try {
            localStorage.setItem("g5_console_hist", JSON.stringify(hist.slice(-40)));
          } catch (err) {}

          if (EXTRA[cmd]) {
            e.preventDefault();
            e.stopImmediatePropagation();
            input.value = "";
            println("<span class='g5-c-ps'>g5></span> " + esc(line));
            var outText = EXTRA[cmd](args);
            if (outText != null) {
              println(esc(outText).replace(/\n/g, "<br>"));
            }
          }
          /* else: let original handler run for snake/breakout/demo/matrix/… */
        }
      },
      true
    );
  }

  function tryPatch(n) {
    enhanceApi();
    attachConsole();
    if (n > 100) return;
    setTimeout(function () {
      tryPatch(n + 1);
    }, 100);
  }

  tryPatch(0);

  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function () {
      neutralizePortalFx();
      attachConsole();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (isSubPage()) {
    setInterval(neutralizePortalFx, 500);
  }
})();
