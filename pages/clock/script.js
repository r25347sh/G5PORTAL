(function () {
  "use strict";
  /* Wall clock via Date + sub-ms from performance.now().
     True 1 ns HW accuracy is not available in browsers. */
  var hmsEl = document.getElementById("hms");
  var msEl = document.getElementById("ms");
  var usEl = document.getElementById("us");
  var nsEl = document.getElementById("ns");
  var dateLine = document.getElementById("date-line");
  var epochLine = document.getElementById("epoch-line");
  var timeMain = document.getElementById("time-main");
  var timeNano = document.getElementById("time-nano");
  var fracSpan = timeMain.querySelector(".frac");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var opt24 = document.getElementById("opt-24h");
  var optMs = document.getElementById("opt-ms");
  var optUs = document.getElementById("opt-us");
  var optPulse = document.getElementById("opt-pulse");
  var anchorWall = 0, anchorPerf = 0, lastSec = -1, raf = null;
  var weekdays = ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"];

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1600);
  }
  function sync() {
    var best = Infinity, wall = Date.now(), perf = performance.now();
    for (var i = 0; i < 8; i++) {
      var w0 = Date.now(), p0 = performance.now();
      var w1 = Date.now(), p1 = performance.now();
      var skew = Math.abs(w1 - w0);
      if (skew < best) {
        best = skew;
        wall = (w0 + w1) / 2;
        perf = (p0 + p1) / 2;
      }
    }
    anchorWall = wall;
    anchorPerf = perf;
  }
  function pad(n, w) { return String(n).padStart(w || 2, "0"); }
  function nowHighRes() {
    return anchorWall + (performance.now() - anchorPerf);
  }
  function tick() {
    var t = nowHighRes();
    var unixMs = Math.floor(t);
    var frac = t - unixMs;
    if (frac < 0) frac = 0;
    var subMs = frac * 1000;
    var us = Math.floor(subMs) % 1000;
    var ns = Math.floor((subMs - Math.floor(subMs)) * 1000) % 1000;
    var d = new Date(unixMs);
    var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), ms = d.getMilliseconds();
    var h12 = h % 12 || 12;
    var ampm = h < 12 ? "AM" : "PM";
    var hDisp = opt24.checked ? h : h12;
    hmsEl.textContent = pad(hDisp) + ":" + pad(m) + ":" + pad(s) + (opt24.checked ? "" : " " + ampm);
    msEl.textContent = pad(ms, 3);
    usEl.textContent = pad(us, 3);
    nsEl.textContent = pad(ns, 3);
    dateLine.textContent =
      d.getFullYear() + "\u5e74" + pad(d.getMonth() + 1) + "\u6708" + pad(d.getDate()) +
      "\u65e5（" + weekdays[d.getDay()] + "）";
    epochLine.textContent =
      "Unix ms: " + unixMs + "  \u00b7  \u0394perf " +
      (performance.now() - anchorPerf).toFixed(3) + " ms since sync";
    if (optPulse.checked && s !== lastSec) {
      timeMain.classList.add("pulse");
      setTimeout(function () { timeMain.classList.remove("pulse"); }, 120);
    }
    lastSec = s;
    raf = requestAnimationFrame(tick);
  }
  function applyOpts() {
    fracSpan.classList.toggle("hidden", !optMs.checked);
    timeNano.classList.toggle("hidden", !optUs.checked);
  }
  optMs.addEventListener("change", applyOpts);
  optUs.addEventListener("change", applyOpts);
  document.getElementById("btn-sync").addEventListener("click", function () {
    sync(); showToast("\u518d\u540c\u671f");
  });
  document.getElementById("btn-copy").addEventListener("click", function () {
    var t = nowHighRes();
    var d = new Date(Math.floor(t));
    var text =
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "." +
      pad(d.getMilliseconds(), 3);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast("copied"); });
    } else showToast(text);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else {
      sync();
      if (!raf) raf = requestAnimationFrame(tick);
    }
  });
  setInterval(sync, 60000);
  applyOpts();
  sync();
  raf = requestAnimationFrame(tick);
})();
