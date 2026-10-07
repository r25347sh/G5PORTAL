(function () {
  "use strict";
  var KEY = "__g5_pr";
  var TTL = 2 * 60 * 60 * 1000;
  var ORDER = [3, 0, 2, 1];
  var gate = document.getElementById("gate");
  var room = document.getElementById("room");
  var gateO = document.getElementById("gate-o");
  var hint = document.getElementById("gate-hint");
  var zonesReady = false;
  var step = 0;
  var holdTimer = null;
  var holdMs = 1400;

  function hasJoinParam() {
    try {
      return !!(new URLSearchParams(location.search).get("r"));
    } catch (e) {
      return false;
    }
  }

  function unlocked() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return false;
      var o = JSON.parse(raw);
      if (!o || !o.t) return false;
      if (Date.now() - o.t > TTL) {
        sessionStorage.removeItem(KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function setUnlock() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: 1 }));
    } catch (e) {}
  }

  function openRoom() {
    if (gate) {
      gate.classList.add("fade-out");
      setTimeout(function () {
        gate.classList.add("hidden");
        gate.setAttribute("aria-hidden", "true");
      }, 280);
    }
    if (room) {
      room.classList.remove("hidden");
      room.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("room-on");
    window.__G5_PR_OK__ = true;
    window.dispatchEvent(new Event("g5-pr-unlock"));
  }

  /* Join links skip ritual; host path needs unlock or sequence */
  if (hasJoinParam() || unlocked()) {
    openRoom();
    return;
  }

  function onHoldStart(e) {
    if (zonesReady) return;
    e.preventDefault();
    holdTimer = setTimeout(function () {
      zonesReady = true;
      document.body.classList.add("hz-on");
      if (hint) hint.textContent = "·";
      step = 0;
    }, holdMs);
  }
  function onHoldEnd() {
    clearTimeout(holdTimer);
  }

  if (gateO) {
    gateO.addEventListener("mousedown", onHoldStart);
    gateO.addEventListener("touchstart", onHoldStart, { passive: false });
    gateO.addEventListener("mouseup", onHoldEnd);
    gateO.addEventListener("mouseleave", onHoldEnd);
    gateO.addEventListener("touchend", onHoldEnd);
    gateO.addEventListener("touchcancel", onHoldEnd);
  }

  var resetTimer = null;
  function resetStep() {
    step = 0;
    if (hint && zonesReady) hint.textContent = "·";
  }

  document.querySelectorAll(".hz").forEach(function (hz) {
    hz.addEventListener("click", function (e) {
      if (!zonesReady) return;
      e.preventDefault();
      e.stopPropagation();
      var id = parseInt(hz.getAttribute("data-hz"), 10);
      if (id === ORDER[step]) {
        step++;
        if (hint) hint.textContent = new Array(step + 1).join("·");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(resetStep, 3200);
        if (step >= ORDER.length) {
          clearTimeout(resetTimer);
          setUnlock();
          openRoom();
        }
      } else {
        resetStep();
      }
    });
  });

  window.__G5_PR_CHECK__ = function () {
    return unlocked() || hasJoinParam();
  };
})();
