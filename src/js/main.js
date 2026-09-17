/**
 * G⁵ Portal - core utilities (auth-free)
 * Ambient particles, base path detection, shared helpers.
 */
(function () {
  "use strict";

  function detectBase() {
    if (window.__G5_BASE__ != null) return window.__G5_BASE__ || ".";
    var path = location.pathname;
    if (path.indexOf("/G5PORTAL") >= 0) {
      var i = path.indexOf("/G5PORTAL");
      return path.slice(0, i + "/G5PORTAL".length).replace(/\/$/, "") || "/G5PORTAL";
    }
    if (path.endsWith(".html")) {
      return path.replace(/\/[^/]+\.html$/, "") || ".";
    }
    return path.replace(/\/$/, "") || ".";
  }

  var BASE = detectBase();
  window.G5 = window.G5 || {};
  G5.BASE = BASE;

  /** Safe localStorage wrapper (memory fallback) */
  var _mem = Object.create(null);
  G5.storage = {
    get: function (key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return _mem[key] != null ? _mem[key] : null;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        _mem[key] = value;
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        delete _mem[key];
      }
    }
  };

  function initAmbient() {
    var el = document.getElementById("ambient");
    if (!el) return;
    for (var i = 0; i < 12; i++) {
      var p = document.createElement("div");
      p.className = "g5-ambient-particle " + ["pink", "cyan", "gold"][i % 3];
      p.style.left = Math.random() * 100 + "%";
      p.style.width = p.style.height = 2 + Math.random() * 4 + "px";
      p.style.animationDuration = 12 + Math.random() * 18 + "s";
      p.style.animationDelay = Math.random() * 10 + "s";
      el.appendChild(p);
    }
  }

  function boot() {
    initAmbient();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
