/**
 * G5 Maze v2 — hard auto-maze with fog of war + cyber UI
 */
(function () {
  "use strict";
  if (window.__G5_MAZE_V2__) return;
  window.__G5_MAZE_V2__ = true;

  var DIFFS = {
    normal: { size: 31, vision: 4, label: "NORMAL" },
    hard: { size: 41, vision: 3, label: "HARD" },
    nightmare: { size: 51, vision: 2, label: "NIGHTMARE" }
  };

  function launchMaze(diffKey) {
    if (document.getElementById("g5-maze-root")) return;
    var diff = DIFFS[diffKey] || DIFFS.hard;

    var root = document.createElement("div");
    root.id = "g5-maze-root";
    root.innerHTML =
      '<div class="g5-mz-bar">' +
      '<span class="g5-mz-logo">MAZE</span>' +
      '<span class="g5-mz-diff" id="g5-mz-diff">' + diff.label + "</span>" +
      '<span class="g5-mz-stat" id="g5-mz-stat">—</span>' +
      '<button type="button" class="g5-mz-btn" data-d="normal">N</button>' +
      '<button type="button" class="g5-mz-btn" data-d="hard">H</button>' +
      '<button type="button" class="g5-mz-btn" data-d="nightmare">X</button>' +
      '<button type="button" class="g5-mz-btn" id="g5-mz-new">NEW</button>' +
      '<button type="button" class="g5-mz-btn g5-mz-x" id="g5-mz-x">×</button>' +
      "</div>" +
      '<canvas id="g5-mz-cv"></canvas>' +
      '<p class="g5-mz-hint">矢印 / WASD · 視界制限 · Esc</p>';

    if (!document.getElementById("g5-mz-css")) {
      var st = document.createElement("style");
      st.id = "g5-mz-css";
      st.textContent = [
        "#g5-maze-root{position:fixed;inset:0;z-index:100090;display:flex;flex-direction:column;align-items:center;justify-content:center;",
        "background:#03020a;padding:max(.5rem,env(safe-area-inset-top)) .5rem max(.5rem,env(safe-area-inset-bottom))}",
        "#g5-maze-root::before{content:'';position:absolute;inset:0;pointer-events:none;",
        "background:radial-gradient(ellipse at 50% 0%,rgba(0,245,255,.12),transparent 55%),",
        "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,245,255,.02) 3px,rgba(0,245,255,.02) 6px);animation:g5mz-scan 10s linear infinite}",
        "@keyframes g5mz-scan{to{transform:translateY(24px)}}",
        ".g5-mz-bar{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;width:min(96vw,720px);margin-bottom:.5rem}",
        ".g5-mz-logo{font-weight:900;letter-spacing:.2em;font-size:1.15rem;margin-right:auto;",
        "background:linear-gradient(90deg,#00f5ff,#ff2d95,#00f5ff);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;",
        "animation:g5mz-chrome 4s linear infinite;filter:drop-shadow(0 0 10px rgba(0,245,255,.4))}",
        "@keyframes g5mz-chrome{to{background-position:200% center}}",
        ".g5-mz-diff{font-size:.65rem;letter-spacing:.12em;padding:.2rem .45rem;border-radius:4px;border:1px solid rgba(255,45,149,.45);color:#ff8cc8;font-family:ui-monospace,monospace}",
        ".g5-mz-stat{font-size:.72rem;color:rgba(0,245,255,.7);font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}",
        ".g5-mz-btn{appearance:none;border:1px solid rgba(0,245,255,.35);background:rgba(0,245,255,.08);color:#00f5ff;",
        "border-radius:6px;padding:.28rem .55rem;cursor:pointer;font-size:.72rem;font-family:ui-monospace,monospace;letter-spacing:.04em;transition:background .15s,box-shadow .15s}",
        ".g5-mz-btn:hover{background:rgba(0,245,255,.2);box-shadow:0 0 12px rgba(0,245,255,.25)}",
        ".g5-mz-x{border-color:rgba(255,45,149,.4);color:#ff8cc8;background:rgba(255,45,149,.1)}",
        "#g5-mz-cv{position:relative;z-index:1;border:1px solid rgba(0,245,255,.28);border-radius:12px;",
        "box-shadow:0 0 0 1px rgba(255,45,149,.12),0 0 48px rgba(0,245,255,.08),inset 0 0 80px rgba(0,0,0,.5);",
        "background:#05040e;max-width:96vw;max-height:calc(100vh - 7rem);touch-action:none}",
        ".g5-mz-hint{position:relative;z-index:1;margin-top:.45rem;font-size:.68rem;color:rgba(0,245,255,.4);letter-spacing:.1em;font-family:ui-monospace,monospace}",
        ".g5-mz-win{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;",
        "background:rgba(3,2,10,.82);backdrop-filter:blur(8px);animation:g5mz-in .35s ease}",
        ".g5-mz-win h2{font-size:1.8rem;letter-spacing:.2em;color:#00f5ff;text-shadow:0 0 24px #00f5ff;margin-bottom:.5rem}",
        ".g5-mz-win p{color:rgba(255,255,255,.7);font-family:ui-monospace,monospace;font-size:.9rem}",
        "@keyframes g5mz-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}"
      ].join("");
      document.head.appendChild(st);
    }
    document.body.appendChild(root);

    var cv = document.getElementById("g5-mz-cv");
    var ctx = cv.getContext("2d");
    var SIZE = diff.size;
    var VISION = diff.vision;
    var maze = [];
    var px = 1, py = 1, gx = SIZE - 2, gy = SIZE - 2;
    var steps = 0, won = false, t0 = Date.now();
    var trail = {};
    var cell = 12;
    var anim = { x: 1, y: 1 };
    var raf = 0, alive = true;

    function resize() {
      var maxW = Math.min(window.innerWidth - 16, 720);
      var maxH = window.innerHeight - 110;
      var side = Math.min(maxW, maxH);
      cell = Math.max(6, Math.floor(side / SIZE));
      cv.width = cell * SIZE;
      cv.height = cell * SIZE;
      draw();
    }

    function gen() {
      maze = [];
      for (var y = 0; y < SIZE; y++) {
        maze[y] = [];
        for (var x = 0; x < SIZE; x++) maze[y][x] = 1;
      }
      function carve(x, y) {
        maze[y][x] = 0;
        var dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
        for (var i = dirs.length - 1; i > 0; i--) {
          var j = (Math.random() * (i + 1)) | 0;
          var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
        }
        for (var d = 0; d < 4; d++) {
          var nx = x + dirs[d][0], ny = y + dirs[d][1];
          if (nx > 0 && ny > 0 && nx < SIZE - 1 && ny < SIZE - 1 && maze[ny][nx] === 1) {
            maze[y + dirs[d][1] / 2][x + dirs[d][0] / 2] = 0;
            carve(nx, ny);
          }
        }
      }
      carve(1, 1);
      var braid = Math.floor(SIZE * SIZE * 0.02);
      for (var b = 0; b < braid; b++) {
        var bx = 1 + 2 * ((Math.random() * ((SIZE - 1) / 2)) | 0);
        var by = 1 + 2 * ((Math.random() * ((SIZE - 1) / 2)) | 0);
        if (maze[by] && maze[by][bx] === 1) {
          var nbs = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(function (d) {
            var tx = bx + d[0], ty = by + d[1];
            return tx > 0 && ty > 0 && tx < SIZE - 1 && ty < SIZE - 1 && maze[ty][tx] === 0;
          });
          if (nbs.length >= 2) maze[by][bx] = 0;
        }
      }
      maze[1][1] = 0;
      maze[SIZE - 2][SIZE - 2] = 0;
      px = py = 1;
      gx = gy = SIZE - 2;
      anim.x = 1; anim.y = 1;
      steps = 0; won = false; t0 = Date.now(); trail = {};
      trail["1,1"] = true;
      var w = root.querySelector(".g5-mz-win");
      if (w) w.remove();
      draw();
    }

    function dist(x1, y1, x2, y2) {
      return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    function draw() {
      var t = Date.now();
      ctx.fillStyle = "#05040e";
      ctx.fillRect(0, 0, cv.width, cv.height);

      for (var y = 0; y < SIZE; y++) {
        for (var x = 0; x < SIZE; x++) {
          var d = dist(x, y, px, py);
          var visible = d <= VISION || (x === gx && y === gy && d <= VISION + 2);
          if (!visible) {
            if (trail[x + "," + y]) {
              ctx.fillStyle = "rgba(0, 245, 255, 0.03)";
              ctx.fillRect(x * cell, y * cell, cell, cell);
            }
            continue;
          }
          var alpha = 1 - (d / (VISION + 1)) * 0.55;
          if (maze[y][x]) {
            var g = ctx.createLinearGradient(x * cell, y * cell, x * cell + cell, y * cell + cell);
            g.addColorStop(0, "rgba(0, 180, 200, " + (0.14 * alpha) + ")");
            g.addColorStop(1, "rgba(0, 80, 120, " + (0.1 * alpha) + ")");
            ctx.fillStyle = g;
            ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
            ctx.strokeStyle = "rgba(0, 245, 255, " + (0.18 * alpha) + ")";
            ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
          } else if (trail[x + "," + y]) {
            ctx.fillStyle = "rgba(255, 45, 149, " + (0.08 * alpha) + ")";
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }

      if (dist(gx, gy, px, py) <= VISION + 2) {
        var pulse = 0.5 + 0.5 * Math.sin(t / 200);
        ctx.shadowColor = "#ff2d95";
        ctx.shadowBlur = 12 + pulse * 10;
        ctx.fillStyle = "#ff2d95";
        ctx.beginPath();
        ctx.arc(gx * cell + cell / 2, gy * cell + cell / 2, cell * (0.22 + pulse * 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      var ax = anim.x * cell + cell / 2;
      var ay = anim.y * cell + cell / 2;
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#00f5ff";
      ctx.beginPath();
      ctx.arc(ax, ay, cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ax, ay, cell * 0.1, 0, Math.PI * 2);
      ctx.fill();

      var elapsed = ((Date.now() - t0) / 1000) | 0;
      var mm = (elapsed / 60) | 0;
      var ss = elapsed % 60;
      document.getElementById("g5-mz-stat").textContent =
        steps + " steps · " + mm + ":" + (ss < 10 ? "0" : "") + ss + " · vis " + VISION;
    }

    function loop() {
      if (!alive) return;
      anim.x += (px - anim.x) * 0.28;
      anim.y += (py - anim.y) * 0.28;
      if (Math.abs(anim.x - px) < 0.02) anim.x = px;
      if (Math.abs(anim.y - py) < 0.02) anim.y = py;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function tryMove(dx, dy) {
      if (won) return;
      var nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return;
      if (maze[ny][nx]) return;
      px = nx; py = ny; steps++;
      trail[px + "," + py] = true;
      if (px === gx && py === gy) {
        won = true;
        var elapsed = ((Date.now() - t0) / 1000) | 0;
        var ov = document.createElement("div");
        ov.className = "g5-mz-win";
        ov.innerHTML = "<h2>CLEAR</h2><p>" + steps + " steps · " + elapsed + "s · " + diff.label + "</p>";
        root.appendChild(ov);
      }
    }

    function onKey(e) {
      if (!document.getElementById("g5-maze-root")) return;
      var m = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0]
      };
      if (e.key === "Escape") { cleanup(); return; }
      if (m[e.key]) { e.preventDefault(); tryMove(m[e.key][0], m[e.key][1]); }
    }

    var sx = 0, sy = 0;
    function onTS(e) { if (e.touches[0]) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }
    function onTE(e) {
      if (!e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
      else tryMove(0, dy > 0 ? 1 : -1);
    }

    function cleanup() {
      alive = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", resize);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    function setDiff(key) {
      diff = DIFFS[key] || DIFFS.hard;
      SIZE = diff.size;
      VISION = diff.vision;
      document.getElementById("g5-mz-diff").textContent = diff.label;
      resize();
      gen();
    }

    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", resize);
    cv.addEventListener("touchstart", onTS, { passive: true });
    cv.addEventListener("touchend", onTE, { passive: true });
    document.getElementById("g5-mz-new").addEventListener("click", gen);
    document.getElementById("g5-mz-x").addEventListener("click", cleanup);
    root.querySelectorAll(".g5-mz-btn[data-d]").forEach(function (btn) {
      btn.addEventListener("click", function () { setDiff(btn.getAttribute("data-d")); });
    });

    resize();
    gen();
    loop();
  }

  window.G5Maze = { start: function () { launchMaze("hard"); } };

  function boot() {
    document.addEventListener("click", function (e) {
      var t = document.getElementById("qr-text");
      if (!t) return;
      var btn = e.target.closest("#btn-gen, button");
      if (!btn) return;
      var v = (t.value || "").trim().toLowerCase();
      if (v === "maze" || v === "迷路" || v === "labyrinth" || v === "hardmaze") {
        setTimeout(function () { launchMaze(v === "hardmaze" ? "nightmare" : "hard"); }, 280);
      }
    });
    var qrHost = document.getElementById("qr-out");
    if (qrHost) {
      var taps = 0, tmr = null;
      qrHost.addEventListener("click", function () {
        taps++;
        clearTimeout(tmr);
        tmr = setTimeout(function () { taps = 0; }, 900);
        if (taps >= 5) { taps = 0; launchMaze("hard"); }
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
