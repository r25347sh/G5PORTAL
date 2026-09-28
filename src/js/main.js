/**
 * G⁵ Portal - core utilities
 * Ambient particles, atmosphere + theme loaders
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

  function asset(path) {
    var p = path.replace(/^\//, "");
    var pathName = location.pathname || "";
    var depth = 0;
    if (pathName.indexOf("/pages/") >= 0) depth = 2;
    else if (pathName.match(/\/[^/]+\/[^/]+\.html$/)) depth = 1;
    if (BASE.charAt(0) === "/") {
      return BASE.replace(/\/$/, "") + "/" + p;
    }
    var prefix = depth === 2 ? "../../" : depth === 1 ? "../" : "./";
    return prefix + p;
  }
  G5.asset = asset;

  var _mem = Object.create(null);
  G5.storage = {
    get: function (key) {
      try { return localStorage.getItem(key); } catch (e) { return _mem[key] != null ? _mem[key] : null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, value); } catch (e) { _mem[key] = value; }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (e) { delete _mem[key]; }
    }
  };

  function ensureStylesheet(hrefFragment, href) {
    if (document.querySelector('link[href*="' + hrefFragment + '"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(srcFragment, src) {
    if (window[srcFragment] || document.querySelector('script[src*="' + srcFragment + '"]')) return;
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    document.head.appendChild(s);
  }

  function loadAtmosphere() {
    ensureStylesheet("atmosphere.css", asset("src/css/atmosphere.css"));
    ensureStylesheet("theme-selector.css", asset("src/css/theme-selector.css"));
    if (!window.G5ThemeControl) {
      var tc = document.createElement("script");
      tc.src = asset("src/js/theme-control.js");
      tc.onload = function () {
        if (!window.G5Theme && !document.querySelector('script[src*="time-theme.js"]')) {
          var s = document.createElement("script");
          s.src = asset("src/js/time-theme.js");
          s.async = true;
          document.head.appendChild(s);
        }
      };
      document.head.appendChild(tc);
    } else if (!window.G5Theme && !document.querySelector('script[src*="time-theme.js"]')) {
      var s2 = document.createElement("script");
      s2.src = asset("src/js/time-theme.js");
      s2.async = true;
      document.head.appendChild(s2);
    }
  }

  function initAmbient() {
    var el = document.getElementById("ambient");
    if (!el) return;
    for (var i = 0; i < 18; i++) {
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
