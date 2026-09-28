/**
 * G⁵ Portal - core utilities (auth-free)
 * Ambient particles, base path, weather/time atmosphere loader.
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

  /** Resolve asset under src/ from any page depth */
  function asset(path) {
    var p = path.replace(/^\//, "");
    if (BASE === "." || BASE === "") return p;
    /* pages/xxx → ../../src/... */
    var depth = 0;
    var pathName = location.pathname || "";
    if (pathName.indexOf("/pages/") >= 0) depth = 2;
    else if (pathName.match(/\/[^/]+\/[^/]+\.html$/)) depth = 1;
    var prefix = depth === 2 ? "../../" : depth === 1 ? "../" : (BASE.charAt(0) === "/" ? BASE + "/" : "./");
    if (BASE.charAt(0) === "/") {
      return BASE.replace(/\/$/, "") + "/" + p;
    }
    return prefix + p;
  }

  G5.asset = asset;

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

  function loadAtmosphere() {
    if (!document.querySelector('link[href*="atmosphere.css"]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = asset("src/css/atmosphere.css");
      document.head.appendChild(link);
    }
    if (!window.G5Theme && !document.querySelector('script[src*="time-theme.js"]')) {
      var s = document.createElement("script");
      s.src = asset("src/js/time-theme.js");
      s.async = true;
      document.head.appendChild(s);
    }
  }

  function initAmbient() {
    var el = document.getElementById("ambient");
    if (!el) return;
    /* 多めのパーティクルでクラブ感 */
    var count = 18;
    for (var i = 0; i < count; i++) {
      var p = document.createElement("div");
      p.className = "g5-ambient-particle " + ["pink", "cyan", "gold"][i % 3];
      p.style.left = Math.random() * 100 + "%";
      p.style.width = p.style.height = 2 + Math.random() * 5 + "px";
      p.style.animationDuration = 10 + Math.random() * 20 + "s";
      p.style.animationDelay = Math.random() * 12 + "s";
      el.appendChild(p);
    }
  }

  function boot() {
    loadAtmosphere();
    initAmbient();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
