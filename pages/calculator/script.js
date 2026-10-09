/**
 * 電卓 — four operations, percent, sign, history
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
    }, 1600);
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
    displayEl.textContent = formatNum(parseFloat(current) || current === "." ? current : parseFloat(current));
    if (current === "Error") displayEl.textContent = "Error";
    else if (current.indexOf(".") >= 0 && !isNaN(current)) {
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
    updateDisplay();
  }

  function inputDot() {
    if (shouldReset || current === "Error") {
      current = "0.";
      shouldReset = false;
    } else if (current.indexOf(".") === -1) {
      current += ".";
    }
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
    updateDisplay();
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
    if (previous === null || !operator || current === "Error") return;
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
    addHistory(exprStr, result);
    previous = null;
    operator = null;
    shouldReset = true;
    updateDisplay();
  }

  function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    shouldReset = false;
    updateDisplay();
  }

  function toggleSign() {
    if (current === "Error" || current === "0") return;
    if (current.charAt(0) === "-") current = current.slice(1);
    else current = "-" + current;
    updateDisplay();
  }

  function percent() {
    if (current === "Error") return;
    var n = parseFloat(current) / 100;
    current = String(n);
    shouldReset = true;
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
    history.forEach(function (item, idx) {
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

  document.addEventListener("keydown", function (e) {
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
