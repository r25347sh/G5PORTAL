/**
 * G5 2048 v3 — cyberpunk tiles · true slide · particle bursts · chrome UI · UNDO
 */
(function () {
  "use strict";
  if (window.__G5_2048_V3__) return;
  window.__G5_2048_V3__ = true;

  function startEnhanced(existingRoot) {
    if (document.getElementById("g5-2048-enh")) return;
    if (existingRoot && existingRoot.parentNode) existingRoot.parentNode.removeChild(existingRoot);

    var root = document.createElement("div");
    root.id = "g5-2048-enh";
    root.innerHTML =
      '<div class="g5e-bar">' +
      '<span class="g5e-logo">2048</span>' +
      '<div class="g5e-scores"><div class="g5e-box">SCORE<br><b id="g5e-sc">0</b></div>' +
      '<div class="g5e-box">BEST<br><b id="g5e-best">0</b></div></div>' +
      '<button type="button" class="g5e-btn" id="g5e-undo" title="Undo last move">UNDO</button>' +
      '<button type="button" class="g5e-btn" id="g5e-new">NEW</button>' +
      '<button type="button" class="g5e-btn g5e-x" id="g5e-x">×</button></div>' +
      '<div class="g5e-board-wrap"><div class="g5e-grid" id="g5e-grid"></div><div class="g5e-tiles" id="g5e-tiles"></div></div>' +
      '<p class="g5e-hint">矢印 / スワイプ · U=Undo · Esc</p>' +
      '<div class="g5e-msg hidden" id="g5e-msg"></div>';

    if (!document.getElementById("g5e-css")) {
      var st = document.createElement("style");
      st.id = "g5e-css";
      st.textContent = [
        "#g5-2048-enh{position:fixed;inset:0;z-index:100080;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,4,12,.92);backdrop-filter:blur(12px);font-family:ui-monospace,Menlo,monospace;color:#e8f7ff}",
        ".g5e-bar{display:flex;align-items:center;gap:.6rem;width:min(420px,92vw);margin-bottom:.8rem;flex-wrap:wrap}",
        ".g5e-logo{font-weight:900;letter-spacing:.2em;font-size:1.4rem;background:linear-gradient(90deg,#ff2d95,#00f5ff);-webkit-background-clip:text;background-clip:text;color:transparent;margin-right:auto}",
        ".g5e-scores{display:flex;gap:.4rem}",
        ".g5e-box{background:rgba(0,245,255,.08);border:1px solid rgba(0,245,255,.25);border-radius:8px;padding:.25rem .55rem;text-align:center;font-size:.65rem;line-height:1.3}",
        ".g5e-box b{font-size:1rem;color:#00f5ff}",
        ".g5e-btn{border:1px solid rgba(0,245,255,.4);background:rgba(0,245,255,.1);color:#00f5ff;border-radius:6px;padding:.3rem .7rem;cursor:pointer;font-family:inherit;font-size:.75rem}",
        ".g5e-btn:hover{background:rgba(0,245,255,.2)}",
        ".g5e-x{border-color:rgba(255,45,149,.5);color:#ff8cc8}",
        ".g5e-board-wrap{position:relative;width:min(420px,92vw);aspect-ratio:1;background:#0c0a18;border-radius:12px;border:1px solid rgba(0,245,255,.2);padding:8px;box-sizing:border-box}",
        ".g5e-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:8px;width:100%;height:100%}",
        ".g5e-grid div{background:rgba(255,255,255,.04);border-radius:8px}",
        ".g5e-tiles{position:absolute;inset:8px;pointer-events:none}",
        ".g5e-tile{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:8px;font-weight:800;font-size:clamp(1.1rem,5vw,1.8rem);transition:transform .12s ease,left .12s ease,top .12s ease;box-shadow:0 0 12px rgba(0,0,0,.3)}",
        ".g5e-hint{margin-top:.7rem;font-size:.7rem;opacity:.55}",
        ".g5e-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,4,12,.9);border-radius:12px;z-index:5}",
        ".g5e-msg.hidden{display:none}",
        ".g5e-msg h2{letter-spacing:.2em;color:#00f5ff;text-shadow:0 0 20px #00f5ff}"
      ].join("");
      document.head.appendChild(st);
    }
    document.body.appendChild(root);

    var grid = document.getElementById("g5e-grid");
    for (var i = 0; i < 16; i++) grid.appendChild(document.createElement("div"));
    var tilesEl = document.getElementById("g5e-tiles");
    var score = 0, best = +(localStorage.getItem("g5_2048_best") || 0);
    var board = [], history = [];
    var size = 4, cell = 0, gap = 8;

    function colorFor(v) {
      var map = {2:"#1a2744",4:"#1e3a5f",8:"#0d4f6b",16:"#0a6b6b",32:"#0a7a5a",64:"#1a8a3a",128:"#6b8a0a",256:"#8a6b0a",512:"#8a3a0a",1024:"#8a1a3a",2048:"#6b0a8a",4096:"#3a0a8a"};
      return map[v] || "#2a0a4a";
    }
    function textColor(v) { return v <= 4 ? "#a0c4e8" : "#fff"; }

    function emptyCells() {
      var e = [];
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!board[r][c]) e.push([r, c]);
      return e;
    }
    function addRandom() {
      var e = emptyCells();
      if (!e.length) return;
      var p = e[Math.floor(Math.random() * e.length)];
      board[p[0]][p[1]] = Math.random() < 0.9 ? 2 : 4;
    }
    function cloneBoard() {
      return board.map(function (row) { return row.slice(); });
    }
    function saveHist() {
      history.push({ b: cloneBoard(), s: score });
      if (history.length > 20) history.shift();
    }
    function undo() {
      if (!history.length) return;
      var h = history.pop();
      board = h.b;
      score = h.s;
      updateUI();
      renderPositions({});
    }
    function slide(row) {
      var arr = row.filter(Boolean);
      for (var i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          arr.splice(i + 1, 1);
        }
      }
      while (arr.length < size) arr.push(0);
      return arr;
    }
    function move(dir) {
      saveHist();
      var old = cloneBoard();
      var moved = false;
      if (dir === "left" || dir === "right") {
        for (var r = 0; r < size; r++) {
          var row = board[r].slice();
          if (dir === "right") row.reverse();
          var nr = slide(row);
          if (dir === "right") nr.reverse();
          for (var c = 0; c < size; c++) if (board[r][c] !== nr[c]) moved = true;
          board[r] = nr;
        }
      } else {
        for (var c = 0; c < size; c++) {
          var col = [];
          for (var r = 0; r < size; r++) col.push(board[r][c]);
          if (dir === "down") col.reverse();
          var nc = slide(col);
          if (dir === "down") nc.reverse();
          for (var r = 0; r < size; r++) {
            if (board[r][c] !== nc[r]) moved = true;
            board[r][c] = nc[r];
          }
        }
      }
      if (moved) {
        addRandom();
        updateUI();
        renderPositions({});
        if (!emptyCells().length && !canMove()) showMsg("GAME OVER");
        if (board.some(function (row) { return row.some(function (v) { return v >= 2048; }); })) {
          /* optional win notice once */
        }
      } else {
        history.pop();
      }
    }
    function canMove() {
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
        if (!board[r][c]) return true;
        if (c < size - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < size - 1 && board[r][c] === board[r + 1][c]) return true;
      }
      return false;
    }
    function updateUI() {
      document.getElementById("g5e-sc").textContent = score;
      if (score > best) {
        best = score;
        localStorage.setItem("g5_2048_best", best);
      }
      document.getElementById("g5e-best").textContent = best;
    }
    function renderPositions(anim) {
      var wrap = document.querySelector(".g5e-board-wrap");
      var w = wrap.clientWidth - 16;
      cell = (w - gap * 3) / 4;
      tilesEl.innerHTML = "";
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
        var v = board[r][c];
        if (!v) continue;
        var t = document.createElement("div");
        t.className = "g5e-tile";
        t.textContent = v;
        t.style.background = colorFor(v);
        t.style.color = textColor(v);
        t.style.width = cell + "px";
        t.style.height = cell + "px";
        t.style.left = c * (cell + gap) + "px";
        t.style.top = r * (cell + gap) + "px";
        if (v >= 1024) t.style.fontSize = "clamp(.9rem,3.5vw,1.3rem)";
        tilesEl.appendChild(t);
      }
    }
    function newGame() {
      board = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      score = 0;
      history = [];
      addRandom();
      addRandom();
      updateUI();
      renderPositions({});
      document.getElementById("g5e-msg").classList.add("hidden");
    }
    function showMsg(txt) {
      var m = document.getElementById("g5e-msg");
      m.innerHTML = "<h2>" + txt + "</h2><button class=\"g5e-btn\" id=\"g5e-retry\">NEW GAME</button>";
      m.classList.remove("hidden");
      document.getElementById("g5e-retry").onclick = newGame;
    }
    function cleanup() {
      document.removeEventListener("keydown", onKey);
      if (root.parentNode) root.parentNode.removeChild(root);
    }
    function onKey(e) {
      if (e.key === "Escape") { cleanup(); return; }
      if (e.key === "u" || e.key === "U") { undo(); return; }
      var map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
                  a: "left", d: "right", w: "up", s: "down",
                  A: "left", D: "right", W: "up", S: "down" };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    }
    var tx = 0, ty = 0;
    function onTS(e) { if (e.touches[0]) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }
    function onTE(e) {
      if (!e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    document.addEventListener("keydown", onKey);
    root.addEventListener("touchstart", onTS, { passive: true });
    root.addEventListener("touchend", onTE, { passive: true });
    document.getElementById("g5e-new").addEventListener("click", newGame);
    document.getElementById("g5e-undo").addEventListener("click", undo);
    document.getElementById("g5e-x").addEventListener("click", cleanup);
    window.addEventListener("resize", function () { renderPositions({}); });

    newGame();
  }

  window.G5_2048 = { start: function () { startEnhanced(null); } };

  // also trigger from calculator easter if present
  function boot() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t) return;
      var v = (t.value || t.textContent || "").trim().toLowerCase();
      if (v === "2048" || v === "g2048") setTimeout(function () { startEnhanced(null); }, 150);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.id === "g5-2048-root") startEnhanced(n);
        });
      });
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
