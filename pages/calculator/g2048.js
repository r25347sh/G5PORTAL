/**
 * G5 2048 v4 — cyberpunk · smooth slide animation · UNDO · particles
 */
(function () {
  "use strict";
  if (window.__G5_2048_V4__) return;
  window.__G5_2048_V4__ = true;

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
      '<button type="button" class="g5e-btn" id="g5e-undo" title="Undo">UNDO</button>' +
      '<button type="button" class="g5e-btn" id="g5e-new">NEW</button>' +
      '<button type="button" class="g5e-btn g5e-x" id="g5e-x">×</button></div>' +
      '<div class="g5e-board-wrap"><div class="g5e-grid" id="g5e-grid"></div><div class="g5e-tiles" id="g5e-tiles"></div></div>' +
      '<p class="g5e-hint">矢印 / スワイプ · U=Undo · Esc</p>' +
      '<div class="g5e-msg hidden" id="g5e-msg"></div>';

    if (!document.getElementById("g5e-css")) {
      var st = document.createElement("style");
      st.id = "g5e-css";
      st.textContent = [
        "#g5-2048-enh{position:fixed;inset:0;z-index:100080;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,4,12,.93);backdrop-filter:blur(12px);font-family:ui-monospace,Menlo,monospace;color:#e8f7ff}",
        ".g5e-bar{display:flex;align-items:center;gap:.55rem;width:min(420px,92vw);margin-bottom:.75rem;flex-wrap:wrap}",
        ".g5e-logo{font-weight:900;letter-spacing:.18em;font-size:1.35rem;background:linear-gradient(90deg,#ff2d95,#00f5ff);-webkit-background-clip:text;background-clip:text;color:transparent;margin-right:auto}",
        ".g5e-scores{display:flex;gap:.35rem}",
        ".g5e-box{background:rgba(0,245,255,.08);border:1px solid rgba(0,245,255,.25);border-radius:8px;padding:.22rem .5rem;text-align:center;font-size:.62rem;line-height:1.25}",
        ".g5e-box b{font-size:.95rem;color:#00f5ff}",
        ".g5e-btn{border:1px solid rgba(0,245,255,.4);background:rgba(0,245,255,.1);color:#00f5ff;border-radius:6px;padding:.28rem .65rem;cursor:pointer;font-family:inherit;font-size:.72rem}",
        ".g5e-btn:hover{background:rgba(0,245,255,.22)}",
        ".g5e-x{border-color:rgba(255,45,149,.5);color:#ff8cc8}",
        ".g5e-board-wrap{position:relative;width:min(420px,92vw);aspect-ratio:1;background:#0c0a18;border-radius:12px;border:1px solid rgba(0,245,255,.22);padding:8px;box-sizing:border-box}",
        ".g5e-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:8px;width:100%;height:100%}",
        ".g5e-grid div{background:rgba(255,255,255,.045);border-radius:8px}",
        ".g5e-tiles{position:absolute;inset:8px;pointer-events:none}",
        ".g5e-tile{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:8px;font-weight:800;font-size:clamp(1.05rem,4.8vw,1.75rem);box-shadow:0 0 14px rgba(0,0,0,.35);transition:left .15s cubic-bezier(.22,.9,.3,1),top .15s cubic-bezier(.22,.9,.3,1),transform .12s ease;will-change:left,top,transform}",
        ".g5e-tile.spawn{animation:g5e-pop .18s ease-out}",
        ".g5e-tile.merge{animation:g5e-merge .2s ease-out}",
        "@keyframes g5e-pop{0%{transform:scale(.35);opacity:.4}100%{transform:scale(1);opacity:1}}",
        "@keyframes g5e-merge{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}",
        ".g5e-hint{margin-top:.65rem;font-size:.68rem;opacity:.55}",
        ".g5e-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(5,4,12,.92);border-radius:12px;z-index:5}",
        ".g5e-msg.hidden{display:none}",
        ".g5e-msg h2{letter-spacing:.18em;color:#00f5ff;text-shadow:0 0 18px #00f5ff;margin-bottom:.6rem}"
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
    var tileEls = {};
    var animating = false;

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
    function addRandom(spawnAnim) {
      var e = emptyCells();
      if (!e.length) return null;
      var p = e[Math.floor(Math.random() * e.length)];
      var v = Math.random() < 0.9 ? 2 : 4;
      board[p[0]][p[1]] = v;
      return { r: p[0], c: p[1], v: v, spawn: !!spawnAnim };
    }
    function cloneBoard() {
      return board.map(function (row) { return row.slice(); });
    }
    function saveHist() {
      history.push({ b: cloneBoard(), s: score });
      if (history.length > 24) history.shift();
    }
    function undo() {
      if (!history.length || animating) return;
      var h = history.pop();
      board = h.b;
      score = h.s;
      updateUI();
      syncTiles(true);
    }
    function slide(row) {
      var arr = row.filter(Boolean);
      var merged = [];
      for (var i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          merged.push(i);
          arr.splice(i + 1, 1);
        }
      }
      while (arr.length < size) arr.push(0);
      return { row: arr, merged: merged };
    }
    function move(dir) {
      if (animating) return;
      saveHist();
      var moved = false;
      var mergeFlags = {};

      if (dir === "left" || dir === "right") {
        for (var r = 0; r < size; r++) {
          var row = board[r].slice();
          if (dir === "right") row.reverse();
          var res = slide(row);
          var nr = res.row;
          if (dir === "right") {
            nr.reverse();
            res.merged = res.merged.map(function (i) { return size - 1 - i; });
          }
          for (var c = 0; c < size; c++) {
            if (board[r][c] !== nr[c]) moved = true;
            board[r][c] = nr[c];
          }
          res.merged.forEach(function (c) { mergeFlags[r + "," + c] = true; });
        }
      } else {
        for (var c = 0; c < size; c++) {
          var col = [];
          for (var r = 0; r < size; r++) col.push(board[r][c]);
          if (dir === "down") col.reverse();
          var res = slide(col);
          var nc = res.row;
          if (dir === "down") {
            nc.reverse();
            res.merged = res.merged.map(function (i) { return size - 1 - i; });
          }
          for (var r = 0; r < size; r++) {
            if (board[r][c] !== nc[r]) moved = true;
            board[r][c] = nc[r];
          }
          res.merged.forEach(function (r) { mergeFlags[r + "," + c] = true; });
        }
      }

      if (moved) {
        animating = true;
        syncTiles(false, mergeFlags);
        setTimeout(function () {
          var added = addRandom(true);
          updateUI();
          syncTiles(false, mergeFlags, added);
          animating = false;
          if (!emptyCells().length && !canMove()) showMsg("GAME OVER");
        }, 155);
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
    function measure() {
      var wrap = document.querySelector(".g5e-board-wrap");
      var w = wrap.clientWidth - 16;
      cell = (w - gap * 3) / 4;
    }
    function makeTileEl(v, r, c, extraClass) {
      var t = document.createElement("div");
      t.className = "g5e-tile" + (extraClass ? " " + extraClass : "");
      t.textContent = v;
      t.style.background = colorFor(v);
      t.style.color = textColor(v);
      t.style.width = cell + "px";
      t.style.height = cell + "px";
      t.style.left = c * (cell + gap) + "px";
      t.style.top = r * (cell + gap) + "px";
      if (v >= 1024) t.style.fontSize = "clamp(.85rem,3.2vw,1.25rem)";
      return t;
    }
    function syncTiles(instant, mergeFlags, spawned) {
      measure();
      mergeFlags = mergeFlags || {};
      var needed = {};
      for (var r = 0; r < size; r++)
        for (var c = 0; c < size; c++)
          if (board[r][c]) needed[r + "," + c] = board[r][c];

      Object.keys(tileEls).forEach(function (k) {
        if (!needed[k]) {
          if (tileEls[k].parentNode) tileEls[k].parentNode.removeChild(tileEls[k]);
          delete tileEls[k];
        }
      });

      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          var v = board[r][c];
          if (!v) continue;
          var key = r + "," + c;
          var el = tileEls[key];
          if (!el) {
            var isSpawn = spawned && spawned.r === r && spawned.c === c;
            el = makeTileEl(v, r, c, isSpawn ? "spawn" : (mergeFlags[key] ? "merge" : ""));
            if (instant) el.style.transition = "none";
            tilesEl.appendChild(el);
            tileEls[key] = el;
            if (instant) { void el.offsetWidth; el.style.transition = ""; }
          } else {
            if (instant) el.style.transition = "none";
            el.textContent = v;
            el.style.background = colorFor(v);
            el.style.color = textColor(v);
            el.style.width = cell + "px";
            el.style.height = cell + "px";
            el.style.left = c * (cell + gap) + "px";
            el.style.top = r * (cell + gap) + "px";
            if (v >= 1024) el.style.fontSize = "clamp(.85rem,3.2vw,1.25rem)";
            else el.style.fontSize = "";
            if (mergeFlags[key]) {
              el.classList.remove("merge");
              void el.offsetWidth;
              el.classList.add("merge");
            }
            if (instant) { void el.offsetWidth; el.style.transition = ""; }
          }
        }
      }
    }
    function newGame() {
      board = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      score = 0;
      history = [];
      tileEls = {};
      tilesEl.innerHTML = "";
      addRandom(true);
      addRandom(true);
      updateUI();
      measure();
      syncTiles(true);
      document.getElementById("g5e-msg").classList.add("hidden");
    }
    function showMsg(txt) {
      var m = document.getElementById("g5e-msg");
      m.innerHTML = "<h2>" + txt + '</h2><button type="button" class="g5e-btn" id="g5e-retry">NEW GAME</button>';
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
      if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    document.addEventListener("keydown", onKey);
    root.addEventListener("touchstart", onTS, { passive: true });
    root.addEventListener("touchend", onTE, { passive: true });
    document.getElementById("g5e-new").addEventListener("click", newGame);
    document.getElementById("g5e-undo").addEventListener("click", undo);
    document.getElementById("g5e-x").addEventListener("click", cleanup);
    window.addEventListener("resize", function () { syncTiles(true); });

    newGame();
  }

  window.G5_2048 = { start: function () { startEnhanced(null); } };

  function isTrigger(v) {
    if (!v) return false;
    v = String(v).trim().toLowerCase();
    return v === "2048" || v === "g2048";
  }

  function boot() {
    document.addEventListener("click", function () {
      var d = document.getElementById("display");
      if (d && isTrigger(d.textContent)) setTimeout(function () { startEnhanced(null); }, 80);
    });
    var buf = "";
    document.addEventListener("keydown", function (e) {
      if (e.key.length !== 1) return;
      buf += e.key;
      if (buf.length > 6) buf = buf.slice(-6);
      if (buf.indexOf("2048") >= 0) {
        buf = "";
        setTimeout(function () { startEnhanced(null); }, 60);
      }
    });
    var obs = new MutationObserver(function () {
      var d = document.getElementById("display");
      if (d && d.textContent === "2048") {
        setTimeout(function () { startEnhanced(null); }, 200);
      }
    });
    var disp = document.getElementById("display");
    if (disp) obs.observe(disp, { childList: true, characterData: true, subtree: true });
    console.log("%c[G5] 2048 ready — type 2048 on calc or G5_2048.start()", "color:#00f5ff");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  if (typeof MutationObserver !== "undefined") {
    var obs2 = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.id === "g5-2048-root") startEnhanced(n);
        });
      });
    });
    obs2.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
