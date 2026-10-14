/**
 * G5 Maze — auto-generated maze easter egg (QR page)
 */
(function () {
  "use strict";
  if (window.__G5_MAZE__) return;
  window.__G5_MAZE__ = true;

  function launchMaze() {
    if (document.getElementById("g5-maze-root")) return;
    var root = document.createElement("div");
    root.id = "g5-maze-root";
    root.innerHTML =
      '<div class="g5-maze-bar">' +
      '<span class="g5-maze-title">MAZE</span>' +
      '<span class="g5-maze-stat" id="g5-maze-stat">矢印 / WASD</span>' +
      '<button type="button" class="g5-maze-btn" id="g5-maze-new">New</button>' +
      '<button type="button" class="g5-maze-btn" id="g5-maze-x">×</button>' +
      "</div>" +
      '<canvas id="g5-maze-cv" width="400" height="400"></canvas>' +
      '<p class="g5-maze-hint">S → G · Esc で閉じる</p>';
    document.body.appendChild(root);

    if (!document.getElementById("g5-maze-css")) {
      var st = document.createElement("style");
      st.id = "g5-maze-css";
      st.textContent =
        "#g5-maze-root{position:fixed;inset:0;z-index:100090;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "background:radial-gradient(ellipse at 30% 20%,rgba(0,245,255,.12),transparent 50%),#05040c;padding:1rem}" +
        ".g5-maze-bar{display:flex;gap:.5rem;align-items:center;width:min(400px,94vw);margin-bottom:.6rem;flex-wrap:wrap}" +
        ".g5-maze-title{font-weight:900;letter-spacing:.15em;color:#00f5ff;margin-right:auto;text-shadow:0 0 16px rgba(0,245,255,.5)}" +
        ".g5-maze-stat{font-size:.75rem;color:rgba(255,255,255,.5);font-family:ui-monospace,monospace}" +
        ".g5-maze-btn{appearance:none;border:1px solid rgba(0,245,255,.4);background:rgba(0,245,255,.1);color:#00f5ff;" +
        "border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:.8rem}" +
        ".g5-maze-btn:hover{background:rgba(0,245,255,.25)}" +
        "#g5-maze-cv{border:1px solid rgba(0,245,255,.3);border-radius:10px;background:#0a0814;" +
        "box-shadow:0 0 40px rgba(0,245,255,.1);max-width:94vw;max-height:70vh}" +
        ".g5-maze-hint{margin-top:.6rem;font-size:.72rem;color:rgba(0,245,255,.4);letter-spacing:.08em}";
      document.head.appendChild(st);
    }

    var cv = document.getElementById("g5-maze-cv");
    var ctx = cv.getContext("2d");
    var W = 21, H = 21;
    var cell = Math.floor(Math.min(cv.width, cv.height) / W);
    var maze = [];
    var px = 1, py = 1;
    var gx = W - 2, gy = H - 2;
    var steps = 0;
    var won = false;

    function gen() {
      maze = [];
      for (var y = 0; y < H; y++) {
        maze[y] = [];
        for (var x = 0; x < W; x++) maze[y][x] = 1;
      }
      function carve(x, y) {
        maze[y][x] = 0;
        var dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
        for (var i = dirs.length - 1; i > 0; i--) {
          var j = (Math.random() * (i + 1)) | 0;
          var t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t;
        }
        for (var d = 0; d < dirs.length; d++) {
          var nx = x + dirs[d][0], ny = y + dirs[d][1];
          if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && maze[ny][nx] === 1) {
            maze[y + dirs[d][1] / 2][x + dirs[d][0] / 2] = 0;
            carve(nx, ny);
          }
        }
      }
      carve(1, 1);
      maze[1][1] = 0;
      maze[H - 2][W - 2] = 0;
      px = 1; py = 1;
      gx = W - 2; gy = H - 2;
      steps = 0; won = false;
      draw();
    }

    function draw() {
      var pad = (cv.width - cell * W) / 2;
      ctx.fillStyle = "#0a0814";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          if (maze[y][x]) {
            ctx.fillStyle = "rgba(0, 245, 255, 0.12)";
            ctx.fillRect(pad + x * cell, pad + y * cell, cell - 1, cell - 1);
            ctx.strokeStyle = "rgba(0, 245, 255, 0.2)";
            ctx.strokeRect(pad + x * cell + 0.5, pad + y * cell + 0.5, cell - 2, cell - 2);
          }
        }
      }
      ctx.fillStyle = "#ff2d95";
      ctx.shadowColor = "#ff2d95";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pad + gx * cell + cell / 2, pad + gy * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#00f5ff";
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(pad + px * cell + cell / 2, pad + py * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      document.getElementById("g5-maze-stat").textContent = won ? "CLEAR · " + steps + " steps" : steps + " steps";
    }

    function tryMove(dx, dy) {
      if (won) return;
      var nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
      if (maze[ny][nx]) return;
      px = nx; py = ny; steps++;
      if (px === gx && py === gy) {
        won = true;
        document.getElementById("g5-maze-stat").textContent = "CLEAR · " + steps + " steps";
      }
      draw();
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

    function cleanup() {
      document.removeEventListener("keydown", onKey, true);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    document.addEventListener("keydown", onKey, true);
    document.getElementById("g5-maze-new").addEventListener("click", gen);
    document.getElementById("g5-maze-x").addEventListener("click", cleanup);
    gen();
  }

  window.G5Maze = { start: launchMaze };

  function boot() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var t = document.getElementById("qr-text");
      if (!t) return;
      var v = (t.value || "").trim().toLowerCase();
      if (v === "maze" || v === "迷路" || v === "labyrinth") {
        setTimeout(launchMaze, 300);
      }
    });
    var qrHost = document.getElementById("qr-out");
    if (qrHost) {
      var taps = 0, tmr = null;
      qrHost.addEventListener("click", function () {
        taps++;
        clearTimeout(tmr);
        tmr = setTimeout(function () { taps = 0; }, 800);
        if (taps >= 5) { taps = 0; launchMaze(); }
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
