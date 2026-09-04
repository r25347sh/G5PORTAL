/**
 * G⁵ Portal - main utilities
 * Token is loaded from secret repo / runtime config when needed for GitHub API writes.
 */
(function () {
  "use strict";

  function detectBase() {
    if (window.__G5_BASE__ != null) return window.__G5_BASE__ || ".";
    const path = location.pathname;
    if (path.includes("/G5PORTAL")) {
      const i = path.indexOf("/G5PORTAL");
      return path.slice(0, i + "/G5PORTAL".length).replace(/\/$/, "") || "/G5PORTAL";
    }
    if (path.endsWith(".html")) {
      return path.replace(/\/[^/]+\.html$/, "") || ".";
    }
    return path.replace(/\/$/, "") || ".";
  }

  const BASE = detectBase();
  window.G5 = window.G5 || {};
  G5.BASE = BASE;
  /* PAT is stored in secret repo token_key.yml under key G5PORTAL — do not commit raw PAT here */
  G5.TOKEN = "";

  function initAmbient() {
    const el = document.getElementById("ambient");
    if (!el) return;
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("div");
      p.className = "g5-ambient-particle " + ["pink", "cyan", "gold"][i % 3];
      p.style.left = Math.random() * 100 + "%";
      p.style.width = p.style.height = 2 + Math.random() * 4 + "px";
      p.style.animationDuration = 12 + Math.random() * 18 + "s";
      p.style.animationDelay = Math.random() * 10 + "s";
      el.appendChild(p);
    }
  }

  G5.getSession = function () {
    try { return JSON.parse(sessionStorage.getItem("g5_session") || "null"); } catch (e) { return null; }
  };
  G5.setSession = function (user) {
    sessionStorage.setItem("g5_session", JSON.stringify({
      id: user.id,
      name: user.name || user.id,
      role: user.role
    }));
  };
  G5.clearSession = function () {
    sessionStorage.removeItem("g5_session");
  };

  G5.canUpload = function () {
    const s = G5.getSession();
    return s && s.role && s.role !== "temporary";
  };

  function renderSessionBar() {
    const s = G5.getSession();
    let bar = document.getElementById("session-bar");
    if (!s) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "session-bar";
      bar.className = "session-bar";
      document.body.appendChild(bar);
    }
    bar.innerHTML = "<span>" + (s.name || s.id) + " (" + s.role + ")</span>" +
      "<button type=\"button\" id=\"btn-logout-bar\">ログアウト</button>";
    document.getElementById("btn-logout-bar").onclick = function () {
      G5.clearSession();
      location.reload();
    };
  }

  function boot() {
    initAmbient();
    renderSessionBar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
