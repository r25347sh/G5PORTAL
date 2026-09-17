(function () {
  "use strict";

  var UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var LOWER = "abcdefghijklmnopqrstuvwxyz";
  var DIGITS = "0123456789";
  var SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
  var AMBIG = /[0OIl1]/g;

  var output = document.getElementById("output");
  var lenEl = document.getElementById("len");
  var lenVal = document.getElementById("len-val");
  var fill = document.getElementById("strength-fill");
  var strengthLabel = document.getElementById("strength-label");
  var histEl = document.getElementById("history");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var HIST_KEY = "g5_pw_hist";

  function secureRandom(max) {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      var limit = Math.floor(0x100000000 / max) * max;
      var x;
      do {
        crypto.getRandomValues(buf);
        x = buf[0];
      } while (x >= limit);
      return x % max;
    }
    return Math.floor(Math.random() * max);
  }

  function charset() {
    var s = "";
    if (document.getElementById("upper").checked) s += UPPER;
    if (document.getElementById("lower").checked) s += LOWER;
    if (document.getElementById("digits").checked) s += DIGITS;
    if (document.getElementById("symbols").checked) s += SYMBOLS;
    if (document.getElementById("exclude-ambig").checked) {
      s = s.replace(AMBIG, "");
    }
    return s;
  }

  function generate() {
    var set = charset();
    var n = +lenEl.value || 16;
    if (!set) {
      showToast("\u6587\u5b57\u7a2e\u3092\u0031\u3064\u4ee5\u4e0a\u9078\u3093\u3067\u304f\u3060\u3055\u3044");
      return;
    }
    var out = "";
    for (var i = 0; i < n; i++) {
      out += set.charAt(secureRandom(set.length));
    }
    out = enforceClasses(out, n);
    output.value = out;
    updateStrength(out);
    pushHistory(out);
  }

  function enforceClasses(pw, n) {
    var needed = [];
    if (document.getElementById("upper").checked) needed.push(filterSet(UPPER));
    if (document.getElementById("lower").checked) needed.push(filterSet(LOWER));
    if (document.getElementById("digits").checked) needed.push(filterSet(DIGITS));
    if (document.getElementById("symbols").checked) needed.push(filterSet(SYMBOLS));
    needed = needed.filter(Boolean);
    if (!needed.length) return pw;
    var arr = pw.split("");
    needed.forEach(function (set, idx) {
      if (idx >= n) return;
      var has = arr.some(function (c) { return set.indexOf(c) >= 0; });
      if (!has) {
        arr[idx] = set.charAt(secureRandom(set.length));
      }
    });
    return arr.join("");
  }

  function filterSet(s) {
    if (document.getElementById("exclude-ambig").checked) s = s.replace(AMBIG, "");
    return s;
  }

  function updateStrength(pw) {
    var score = 0;
    if (pw.length >= 12) score += 1;
    if (pw.length >= 16) score += 1;
    if (pw.length >= 24) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
    var pct = Math.min(100, Math.round((score / 6) * 100));
    fill.style.width = pct + "%";
    var label = "\u5f31\u3044";
    var color = "#ff6b8a";
    if (score >= 5) { label = "\u975e\u5e38\u306b\u5f37\u3044"; color = "#00f5ff"; }
    else if (score >= 4) { label = "\u5f37\u3044"; color = "#2ecc71"; }
    else if (score >= 2) { label = "\u666e\u901a"; color = "#ffd700"; }
    fill.style.background = color;
    strengthLabel.textContent = label;
    strengthLabel.style.color = color;
  }

  function getHist() {
    try {
      var raw = (window.G5 && G5.storage ? G5.storage.get(HIST_KEY) : localStorage.getItem(HIST_KEY)) || "[]";
      return JSON.parse(raw);
    } catch (e) { return []; }
  }

  function setHist(arr) {
    var s = JSON.stringify(arr.slice(0, 12));
    if (window.G5 && G5.storage) G5.storage.set(HIST_KEY, s);
    else { try { localStorage.setItem(HIST_KEY, s); } catch (e) {} }
  }

  function pushHistory(pw) {
    var arr = getHist().filter(function (x) { return x !== pw; });
    arr.unshift(pw);
    setHist(arr);
    renderHist();
  }

  function renderHist() {
    var arr = getHist();
    histEl.innerHTML = arr.length
      ? arr.map(function (p) {
          return "<li tabindex=\"0\" data-pw=\"" + escapeAttr(p) + "\">" + escapeHtml(p) + "</li>";
        }).join("")
      : "<li style=\"cursor:default;opacity:0.6\">\u307e\u3060\u3042\u308a\u307e\u305b\u3093</li>";
    histEl.querySelectorAll("li[data-pw]").forEach(function (li) {
      li.addEventListener("click", function () {
        output.value = li.getAttribute("data-pw");
        updateStrength(output.value);
        copyOut();
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function copyOut() {
    var t = output.value;
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () { showToast("\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f"); },
        function () { showToast("\u30b3\u30d4\u30fc\u5931\u6557"); }
      );
    } else {
      output.select();
      try { document.execCommand("copy"); showToast("\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f"); }
      catch (e) { showToast("\u30b3\u30d4\u30fc\u5931\u6557"); }
    }
  }

  lenEl.addEventListener("input", function () { lenVal.textContent = lenEl.value; });
  document.getElementById("btn-gen").addEventListener("click", generate);
  document.getElementById("btn-copy").addEventListener("click", copyOut);
  document.getElementById("btn-clear-hist").addEventListener("click", function () {
    setHist([]);
    renderHist();
  });
  renderHist();
  generate();
})();
