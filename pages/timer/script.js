(function () {
  "use strict";
  var mode = "timer", running = false, raf = null, startTs = 0, elapsed = 0;
  var phases = [], phaseIdx = 0, phaseRemain = 0, laps = [], customAudio = null, audioCtx = null;
  var display = document.getElementById("display");
  var phaseLabel = document.getElementById("phase-label");
  var btnStart = document.getElementById("btn-start");
  var btnLap = document.getElementById("btn-lap");
  var phasesEl = document.getElementById("phases");
  var lapsEl = document.getElementById("laps");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var preset = document.getElementById("sound-preset");
  var soundFile = document.getElementById("sound-file");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }
  function fmt(ms) {
    var neg = ms < 0; ms = Math.abs(ms);
    var totalCs = Math.floor(ms / 10);
    var cs = totalCs % 100;
    var totalSec = Math.floor(totalCs / 100);
    var s = totalSec % 60;
    var m = Math.floor(totalSec / 60);
    var pad = function (n, w) { return String(n).padStart(w || 2, "0"); };
    return (neg ? "-" : "") + pad(m) + ":" + pad(s) + "." + pad(cs);
  }
  function setMode(m) {
    if (running) stop();
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-mode") === m);
    });
    document.getElementById("panel-timer").classList.toggle("hidden", m !== "timer");
    document.getElementById("panel-sw").classList.toggle("hidden", m !== "stopwatch");
    btnLap.classList.toggle("hidden", m !== "stopwatch");
    reset();
  }
  document.querySelectorAll(".mode-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); });
  });
  function bindPhaseRow(row) {
    var rm = row.querySelector(".rm-phase");
    if (rm) rm.onclick = function () {
      if (phasesEl.children.length <= 1) return;
      row.remove();
    };
  }
  Array.prototype.forEach.call(phasesEl.querySelectorAll(".phase-row"), bindPhaseRow);
  document.getElementById("btn-add-phase").addEventListener("click", function () {
    var row = document.createElement("div");
    row.className = "phase-row";
    row.innerHTML = '<input type="number" min="0" max="999" value="5" class="phase-min"><span>分</span><input type="number" min="0" max="59" value="0" class="phase-sec"><span>秒</span><button type="button" class="btn-icon rm-phase">\u00d7</button>';
    phasesEl.appendChild(row);
    bindPhaseRow(row);
  });
  var btnPick = document.getElementById("btn-pick-sound");
  preset.addEventListener("change", function () {
    var custom = preset.value === "custom";
    btnPick.classList.toggle("hidden", !custom);
    if (custom) soundFile.click();
  });
  btnPick.addEventListener("click", function () { soundFile.click(); });
  soundFile.addEventListener("change", function () {
    if (soundFile.files && soundFile.files[0]) {
      if (customAudio) URL.revokeObjectURL(customAudio.src);
      customAudio = new Audio(URL.createObjectURL(soundFile.files[0]));
      showToast("sound set");
    }
  });
  function ensureAudio() {
    if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  function playTone(type) {
    if (preset.value === "custom" && customAudio) {
      customAudio.currentTime = 0;
      customAudio.play().catch(function () {});
      return;
    }
    ensureAudio();
    if (!audioCtx) return;
    var now = audioCtx.currentTime;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    if (type === "chime") {
      o.type = "sine"; o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      o.start(now); o.stop(now + 0.65);
    } else if (type === "alarm") {
      o.type = "square"; o.frequency.setValueAtTime(660, now);
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      o.start(now); o.stop(now + 0.4);
      setTimeout(function () { playTone("beep"); }, 450);
    } else {
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      o.start(now); o.stop(now + 0.4);
    }
  }
  function readPhases() {
    var list = [];
    Array.prototype.forEach.call(phasesEl.querySelectorAll(".phase-row"), function (row) {
      var m = +row.querySelector(".phase-min").value || 0;
      var s = +row.querySelector(".phase-sec").value || 0;
      var ms = (m * 60 + s) * 1000;
      if (ms > 0) list.push(ms);
    });
    return list;
  }
  function tick(now) {
    if (!running) return;
    if (mode === "stopwatch") {
      elapsed = now - startTs;
      display.textContent = fmt(elapsed);
    } else {
      var left = phaseRemain - (now - startTs);
      if (left <= 0) {
        playTone(preset.value);
        phaseIdx++;
        if (phaseIdx >= phases.length) {
          display.textContent = "00:00.00"; phaseLabel.textContent = "\u5b8c\u4e86";
          stop(); showToast("done"); return;
        }
        phaseRemain = phases[phaseIdx]; startTs = now;
        phaseLabel.textContent = "\u533a\u9593 " + (phaseIdx + 1) + " / " + phases.length;
        left = phaseRemain;
      }
      display.textContent = fmt(Math.max(0, left));
    }
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) { stop(); return; }
    if (mode === "timer") {
      phases = readPhases();
      if (!phases.length) { showToast("set phase"); return; }
      phaseIdx = 0; phaseRemain = phases[0];
      phaseLabel.textContent = "\u533a\u9593 1 / " + phases.length;
    } else phaseLabel.textContent = "";
    running = true;
    startTs = performance.now() - (mode === "stopwatch" ? elapsed : 0);
    if (mode === "timer") startTs = performance.now();
    btnStart.textContent = "\u30b9\u30c8\u30c3\u30d7";
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    if (mode === "stopwatch") {
      elapsed = performance.now() - startTs;
      display.textContent = fmt(elapsed);
    }
    btnStart.textContent = "\u30b9\u30bf\u30fc\u30c8";
  }
  function reset() {
    stop(); elapsed = 0; phaseIdx = 0; phases = []; phaseRemain = 0; laps = [];
    lapsEl.innerHTML = ""; display.textContent = "00:00.00"; phaseLabel.textContent = "";
    btnStart.textContent = "\u30b9\u30bf\u30fc\u30c8";
  }
  btnStart.addEventListener("click", start);
  document.getElementById("btn-reset").addEventListener("click", reset);
  btnLap.addEventListener("click", function () {
    if (mode !== "stopwatch") return;
    var t = running ? performance.now() - startTs : elapsed;
    laps.push(t);
    var li = document.createElement("li");
    li.innerHTML = "<span>Lap " + laps.length + "</span><strong>" + fmt(t) + "</strong>";
    lapsEl.insertBefore(li, lapsEl.firstChild);
  });
})();
