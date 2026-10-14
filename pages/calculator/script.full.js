/**
 * 電卓 — four operations + history + easter eggs (incl. full 2048)
 */
(function () {
  "use strict";

  var displayEl = document.getElementById("display");
  var exprEl = document.getElementById("expr");
  var historyEl = document.getElementById("history");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  var current = "0";
  var previous = null;
  var operator = null;
  var shouldReset = false;
  var history = [];
  var MAX_HISTORY = 30;
  var STORAGE_KEY = "g5_calc_history";

  /* ---- easter sequence state ---- */
  var seqBuf = [];
  var seqTimer = null;
  var lastResult = null;
  var eqStreak = 0;
  var displayTaps = 0;
  var displayTapTimer = null;
  var arm2048 = false;
  var armTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.classList.add("hidden");
      }, 280);
    }, 1800);
  }

  function formatNum(n) {
    if (!isFinite(n)) return "Error";
    var s = String(n);
    if (s.indexOf("e") >= 0) return s;
    if (Math.abs(n) >= 1e12 || (Math.abs(n) > 0 && Math.abs(n) < 1e-8)) {
      return n.toExponential(8).replace(/\.?0+e/, "e");
    }
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (parts[1] && parts[1].length > 10) {
      parts[1] = String(parseFloat("0." + parts[1]).toFixed(10)).slice(2).replace(/0+$/, "");
    }
    return parts[1] ? parts[0] + "." + parts[1] : parts[0];
  }

  function updateDisplay() {
    if (current === "Error") {
      displayEl.textContent = "Error";
    } else if (current.indexOf(".") >= 0 && !isNaN(current)) {
      var raw = current;
      var parts = raw.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      displayEl.textContent = parts.join(".");
    } else if (!isNaN(current) && current !== "") {
      displayEl.textContent = formatNum(parseFloat(current));
    } else {
      displayEl.textContent = current;
    }

    if (previous !== null && operator) {
      var opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[operator] || operator;
      exprEl.textContent = formatNum(previous) + " " + opSym;
    } else {
      exprEl.textContent = "";
    }
  }

  function inputDigit(d) {
    if (shouldReset || current === "Error") {
      current = d;
      shouldReset = false;
    } else if (current === "0" && d !== ".") {
      current = d;
    } else {
      if (current.replace(".", "").replace("-", "").length >= 14) return;
      current += d;
    }
    pushSeq("n" + d);
    updateDisplay();
    checkTypedEggs();
  }

  function inputDot() {
    if (shouldReset || current === "Error") {
      current = "0.";
      shouldReset = false;
    } else if (current.indexOf(".") === -1) {
      current += ".";
    }
    pushSeq("dot");
    updateDisplay();
  }

  function setOperator(op) {
    if (current === "Error") return;
    var num = parseFloat(current);
    if (previous !== null && operator && !shouldReset) {
      num = compute(previous, num, operator);
      current = String(num);
      if (!isFinite(num)) {
        current = "Error";
        previous = null;
        operator = null;
        updateDisplay();
        return;
      }
    }
    previous = parseFloat(current);
    operator = op;
    shouldReset = true;
    pushSeq("op" + op);
    updateDisplay();
    checkOpSequence();
  }

  function compute(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function equals() {
    if (window.__g5_2048_ready__ && arm2048) {
      window.__g5_2048_ready__ = false;
      launch2048();
      return;
    }
    if (previous === null || !operator || current === "Error") {
      if (arm2048 || String(parseFloat(current)) === "2048") {
        eqStreak++;
        if (eqStreak >= 2) {
          eqStreak = 0;
          launch2048();
          return;
        }
        setTimeout(function () { eqStreak = 0; }, 1400);
      }
      return;
    }
    var a = previous;
    var b = parseFloat(current);
    var result = compute(a, b, operator);
    var opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[operator] || operator;
    var exprStr = formatNum(a) + " " + opSym + " " + formatNum(b);

    if (!isFinite(result)) {
      current = "Error";
      previous = null;
      operator = null;
      updateDisplay();
      return;
    }

    current = String(result);
    lastResult = result;
    addHistory(exprStr, result);
    previous = null;
    operator = null;
    shouldReset = true;
    pushSeq("eq");
    updateDisplay();
    checkResultEggs(result);
  }

  function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    shouldReset = false;
    pushSeq("ac");
    updateDisplay();
  }

  function toggleSign() {
    if (current === "Error" || current === "0") return;
    if (current.charAt(0) === "-") current = current.slice(1);
    else current = "-" + current;
    pushSeq("sign");
    updateDisplay();
  }

  function percent() {
    if (current === "Error") return;
    var n = parseFloat(current) / 100;
    current = String(n);
    shouldReset = true;
    pushSeq("pct");
    updateDisplay();
  }

  function addHistory(expr, result) {
    history.unshift({ expr: expr, result: result });
    if (history.length > MAX_HISTORY) history.pop();
    renderHistory();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) { /* ignore */ }
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach(function (item) {
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="h-expr">' + item.expr + "</span>" +
        '<span class="h-result">= ' + formatNum(item.result) + "</span>";
      li.addEventListener("click", function () {
        current = String(item.result);
        previous = null;
        operator = null;
        shouldReset = true;
        updateDisplay();
        showToast("結果を入力しました");
      });
      historyEl.appendChild(li);
    });
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];
      }
    } catch (e) {
      history = [];
    }
    renderHistory();
  }

  function pushSeq(token) {
    seqBuf.push(token);
    if (seqBuf.length > 24) seqBuf = seqBuf.slice(-24);
    clearTimeout(seqTimer);
    seqTimer = setTimeout(function () { seqBuf = []; }, 4500);
  }

  function seqEndsWith(arr) {
    if (seqBuf.length < arr.length) return false;
    for (var i = 0; i < arr.length; i++) {
      if (seqBuf[seqBuf.length - arr.length + i] !== arr[i]) return false;
    }
    return true;
  }

  function checkTypedEggs() {
    if (current === "2048" || current === "2,048") {
      arm2048 = true;
      clearTimeout(armTimer);
      armTimer = setTimeout(function () { arm2048 = false; }, 6000);
      showToast("…?");
    }
  }

  function checkOpSequence() {
    if (arm2048 && seqEndsWith(["op/", "op*", "op-", "op+"])) {
      showToast("あと = を…");
      window.__g5_2048_ready__ = true;
    }
  }

  function checkResultEggs(result) {
    var r = Math.round(result * 1e10) / 1e10;
    if (r === 2048 || r === 2048.0) {
      arm2048 = true;
      clearTimeout(armTimer);
      armTimer = setTimeout(function () { arm2048 = false; }, 8000);
      showToast("2048…");
    } else if (r === 42) {
      showToast("🌌 答えは 42");
    } else if (r === 1337) {
      showToast("1337 · 1ee7");
    } else if (r === 80085 || r === 8008 || r === 58008) {
      showToast("…classic");
    } else if (Math.abs(r - Math.PI) < 0.0001) {
      showToast("π ≈ " + r);
    } else if (r === 0 && seqEndsWith(["op/", "eq"])) {
      showToast("ゼロ除算は避けた？");
    }
    if (seqEndsWith(["ac", "ac", "ac"])) {
      showToast("三重クリア");
      seqBuf = [];
    }
  }

  function onDisplayTap() {
    displayTaps++;
    clearTimeout(displayTapTimer);
    displayTapTimer = setTimeout(function () { displayTaps = 0; }, 900);
    if (displayTaps >= 5 && (arm2048 || String(parseFloat(current)) === "2048")) {
      displayTaps = 0;
      launch2048();
    }
  }

  function launch2048() {
    if (document.getElementById("g5-2048-root")) return;
    arm2048 = false;
    window.__g5_2048_ready__ = false;
    showToast("2048 起動");

    var root = document.createElement("div");
    root.id = "g5-2048-root";
    root.innerHTML =
      '<div class="g5-2048-bar">' +
      '<span class="g5-2048-title">2048</span>' +
      '<span class="g5-2048-score">Score <b id="g5-2048-score">0</b></span>' +
      '<span class="g5-2048-best">Best <b id="g5-2048-best">0</b></span>' +
      '<button type="button" class="g5-2048-btn" id="g5-2048-new">New</button>' +
      '<button type="button" class="g5-2048-btn g5-2048-x" id="g5-2048-close" aria-label="close">×</button>' +
      "</div>" +
      '<div class="g5-2048-board" id="g5-2048-board"></div>' +
      '<p class="g5-2048-hint">矢印キー / スワイプ · Esc で閉じる</p>' +
      '<div class="g5-2048-msg hidden" id="g5-2048-msg"></div>';
    document.body.appendChild(root);

    var SIZE = 4;
    var grid = [];
    var score = 0;
    var best = 0;
    var won = false;
    var over = false;
    var boardEl = document.getElementById("g5-2048-board");
    var scoreEl = document.getElementById("g5-2048-score");
    var bestEl = document.getElementById("g5-2048-best");
    var msgEl = document.getElementById("g5-2048-msg");

    try {
      best = parseInt(localStorage.getItem("g5_2048_best") || "0", 10) || 0;
      bestEl.textContent = best;
    } catch (e) {}

    function emptyGrid() {
      grid = [];
      for (var r = 0; r < SIZE; r++) {
        grid[r] = [];
        for (var c = 0; c < SIZE; c++) grid[r][c] = 0;
      }
    }

    function spawn() {
      var empty = [];
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          if (!grid[r][c]) empty.push({ r: r, c: c });
        }
      }
      if (!empty.length) return;
      var pick = empty[(Math.random() * empty.length) | 0];
      grid[pick.r][pick.c] = Math.random() < 0.9 ? 2 : 4;
    }

    function render() {
      boardEl.innerHTML = "";
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          var v = grid[r][c];
          var cell = document.createElement("div");
          cell.className = "g5-2048-cell" + (v ? " v" + (v > 2048 ? "super" : v) : "");
          if (v) cell.textContent = v;
          boardEl.appendChild(cell);
        }
      }
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        try { localStorage.setItem("g5_2048_best", String(best)); } catch (e) {}
      }
    }

    function slide(row) {
      var arr = row.filter(function (x) { return x; });
      for (var i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
          arr[i] *= 2;
          score += arr[i];
          if (arr[i] === 2048 && !won) {
            won = true;
            msgEl.textContent = "2048 達成！ 続けられます";
            msgEl.classList.remove("hidden");
            setTimeout(function () { msgEl.classList.add("hidden"); }, 2200);
          }
          arr[i + 1] = 0;
        }
      }
      arr = arr.filter(function (x) { return x; });
      while (arr.length < SIZE) arr.push(0);
      return arr;
    }

    function move(dir) {
      if (over) return false;
      var prev = JSON.stringify(grid);
      var r, c;
      if (dir === "left") {
        for (r = 0; r < SIZE; r++) grid[r] = slide(grid[r]);
      } else if (dir === "right") {
        for (r = 0; r < SIZE; r++) grid[r] = slide(grid[r].slice().reverse()).reverse();
      } else if (dir === "up") {
        for (c = 0; c < SIZE; c++) {
          var col = [];
          for (r = 0; r < SIZE; r++) col.push(grid[r][c]);
          col = slide(col);
          for (r = 0; r < SIZE; r++) grid[r][c] = col[r];
        }
      } else if (dir === "down") {
        for (c = 0; c < SIZE; c++) {
          var col2 = [];
          for (r = 0; r < SIZE; r++) col2.push(grid[r][c]);
          col2 = slide(col2.reverse()).reverse();
          for (r = 0; r < SIZE; r++) grid[r][c] = col2[r];
        }
      }
      if (JSON.stringify(grid) !== prev) {
        spawn();
        render();
        if (!canMove()) {
          over = true;
          msgEl.textContent = "Game Over · Score " + score;
          msgEl.classList.remove("hidden");
        }
        return true;
      }
      return false;
    }

    function canMove() {
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          if (!grid[r][c]) return true;
          if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
          if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
      }
      return false;
    }

    function newGame() {
      emptyGrid();
      score = 0;
      won = false;
      over = false;
      msgEl.classList.add("hidden");
      spawn();
      spawn();
      render();
    }

    function onKey(e) {
      if (!document.getElementById("g5-2048-root")) return;
      var map = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
        h: "left", l: "right", k: "up", j: "down"
      };
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
        return;
      }
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    }

    var sx = 0, sy = 0;
    function onTouchStart(e) {
      if (e.touches[0]) {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      }
    }
    function onTouchEnd(e) {
      if (!e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    function cleanup() {
      document.removeEventListener("keydown", onKey, true);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    document.addEventListener("keydown", onKey, true);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    document.getElementById("g5-2048-new").addEventListener("click", newGame);
    document.getElementById("g5-2048-close").addEventListener("click", cleanup);

    newGame();
  }

  document.querySelector(".calc-keys").addEventListener("click", function (e) {
    var btn = e.target.closest("button.key");
    if (!btn) return;
    if (btn.dataset.num !== undefined) inputDigit(btn.dataset.num);
    else if (btn.dataset.op) setOperator(btn.dataset.op);
    else if (btn.dataset.action === "dot") inputDot();
    else if (btn.dataset.action === "equals") equals();
    else if (btn.dataset.action === "clear") clearAll();
    else if (btn.dataset.action === "sign") toggleSign();
    else if (btn.dataset.action === "percent") percent();
  });

  document.getElementById("btn-clear-history").addEventListener("click", function () {
    history = [];
    renderHistory();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    showToast("履歴をクリアしました");
  });

  var disp = document.querySelector(".calc-display");
  if (disp) {
    disp.addEventListener("click", onDisplayTap);
    disp.style.cursor = "pointer";
  }

  document.addEventListener("keydown", function (e) {
    if (document.getElementById("g5-2048-root")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    var k = e.key;
    if (k >= "0" && k <= "9") { e.preventDefault(); inputDigit(k); }
    else if (k === ".") { e.preventDefault(); inputDot(); }
    else if (k === "+" || k === "-" || k === "*" || k === "/") { e.preventDefault(); setOperator(k); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
    else if (k === "Escape" || k === "c" || k === "C") { e.preventDefault(); clearAll(); }
    else if (k === "%") { e.preventDefault(); percent(); }
    else if (k === "Backspace") {
      e.preventDefault();
      if (shouldReset || current === "Error") clearAll();
      else if (current.length <= 1 || (current.length === 2 && current.charAt(0) === "-")) current = "0";
      else current = current.slice(0, -1);
      updateDisplay();
    }
  });

  loadHistory();
  updateDisplay();
})();
