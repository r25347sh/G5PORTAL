/**
 * G⁵ Easter patch — subpage portal-awaken off
 * Loaded after easter-eggs.js
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_PATCH__) return;
  window.__G5_EASTER_PATCH__ = true;

  function isSubPage() {
    return (location.pathname || "").indexOf("/pages/") >= 0;
  }

  function softToast(msg) {
    var el = document.getElementById("g5-easter-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "g5-easter-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2600);
  }

  function patch() {
    if (!window.G5Easter) return false;

    var origPortal = window.G5Easter.portal;
    window.G5Easter.portal = function () {
      if (isSubPage()) {
        softToast("時は味方 · Calendar never ends");
        return;
      }
      if (typeof origPortal === "function") origPortal();
    };

    /* Drop tool-header title multi-click awaken listeners */
    document.querySelectorAll(".tool-header h1").forEach(function (el) {
      if (el._g5patched) return;
      el._g5patched = true;
      var clone = el.cloneNode(true);
      if (el.parentNode) el.parentNode.replaceChild(clone, el);
    });

    return true;
  }

  function tryPatch(n) {
    if (patch()) return;
    if (n > 40) return;
    setTimeout(function () {
      tryPatch(n + 1);
    }, 150);
  }

  tryPatch(0);
})();
