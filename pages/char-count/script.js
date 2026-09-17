/**
 * 文字数カウント — realtime stats
 */
(function () {
  "use strict";

  var input = document.getElementById("input");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var raf = null;

  function utf8Bytes(str) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(str).length;
    }
    try {
      return unescape(encodeURIComponent(str)).length;
    } catch (e) {
      return str.length;
    }
  }

  function countWords(str) {
    var t = str.trim();
    if (!t) return 0;
    var parts = t.split(/\s+/).filter(Boolean);
    return parts.length;
  }

  function countParas(str) {
    if (!str) return 0;
    return str.split(/\n\s*\n/).filter(function (p) {
      return p.trim().length > 0;
    }).length || (str.trim() ? 1 : 0);
  }

  function update() {
    var v = input.value;
    var chars = v.length;
    var charsNs = v.replace(/\s/g, "").length;
    var lines = v === "" ? 0 : v.split(/\n/).length;
    var words = countWords(v);
    var bytes = utf8Bytes(v);
    var paras = countParas(v);

    document.getElementById("s-chars").textContent = chars.toLocaleString();
    document.getElementById("s-chars-ns").textContent = charsNs.toLocaleString();
    document.getElementById("s-words").textContent = words.toLocaleString();
    document.getElementById("s-lines").textContent = lines.toLocaleString();
    document.getElementById("s-bytes").textContent = bytes.toLocaleString();
    document.getElementById("s-paras").textContent = paras.toLocaleString();
  }

  function scheduleUpdate() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }

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

  function copyText() {
    var t = input.value;
    if (!t) {
      showToast("コピーするテキストがありません");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(
        function () { showToast("コピーしました"); },
        function () { fallbackCopy(t); }
      );
    } else {
      fallbackCopy(t);
    }
  }

  function fallbackCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("コピーしました");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
    document.body.removeChild(ta);
  }

  input.addEventListener("input", scheduleUpdate);
  input.addEventListener("paste", function () { setTimeout(scheduleUpdate, 0); });
  document.getElementById("btn-clear").addEventListener("click", function () {
    input.value = "";
    update();
    input.focus();
  });
  document.getElementById("btn-copy").addEventListener("click", copyText);
  update();
})();
