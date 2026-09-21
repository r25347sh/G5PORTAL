/**
 * G⁵ Portal — Site Resident (fully autonomous, no chat)
 * Lives in document coordinates (site space), not viewport.
 * Thinks & acts on its own. WebLLM optional for deeper decisions.
 */
(function () {
  "use strict";
  if (window.__G5_RESIDENT_BOOTED__) return;
  window.__G5_RESIDENT_BOOTED__ = true;

  var MODEL_CANDIDATES = [
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "SmolLM2-360M-Instruct-q4f16_1-MLC",
    "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  ];
  var AGENT_SIZE = 64;
  var THINK_MIN_MS = 7000;
  var THINK_MAX_MS = 16000;
  var CARD_CACHE_MS = 5000;
  var PENDING_KEY = "g5_resident_pending";
  var STATE_KEY = "g5_resident_state";

  var TOOLS = {
    "multiquiz": { label: "MultiQuiz", path: "pages/multiquiz/index.html" },
    "char-count": { label: "文字数カウント", path: "pages/char-count/index.html" },
    "char-magnifier": { label: "文字拡大鏡", path: "pages/char-magnifier/index.html" },
    "password-gen": { label: "パスワード生成", path: "pages/password-gen/index.html" },
    "crypto": { label: "暗号化・復号", path: "pages/crypto/index.html" },
    "qr-code": { label: "QRコード", path: "pages/qr-code/index.html" },
    "timer": { label: "タイマー/SW", path: "pages/timer/index.html" },
    "random": { label: "コイン/サイコロ/抽選", path: "pages/random/index.html" },
    "color-picker": { label: "カラーピッカー", path: "pages/color-picker/index.html" },
    "screen-share": { label: "画面シェア", path: "pages/screen-share/index.html" },
    "file-share": { label: "ファイル共有", path: "pages/file-share/index.html" },
    "clock": { label: "デジタル時計", path: "pages/clock/index.html" },
    "materials": { label: "副教材", path: "pages/materials/index.html" },
    "home": { label: "トップ", path: "index.html" }
  };

  var TOOL_OPS = {
    "qr-code": {
      fill: function (p) {
        var ta = document.getElementById("qr-text");
        if (ta && p && p.text != null) {
          ta.value = p.text;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      generate: function () {
        var btn = document.getElementById("btn-gen");
        if (btn) btn.click();
      }
    },
    "timer": {
      start: function () {
        var b = document.getElementById("btn-start") || document.querySelector("[data-action=start], #start");
        if (b) b.click();
      },
      reset: function () {
        var b = document.getElementById("btn-reset") || document.querySelector("[data-action=reset]");
        if (b) b.click();
      }
    },
    "password-gen": {
      generate: function () {
        var b = document.getElementById("btn-gen") || document.querySelector("button.btn-primary");
        if (b) b.click();
      }
    },
    "char-count": {
      fill: function (p) {
        var ta = document.querySelector("textarea, #input, #text");
        if (ta && p && p.text != null) {
          ta.value = p.text;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    },
    "random": {
      roll: function () {
        var b = document.querySelector("#btn-roll, #btn-coin, #btn-dice, button.btn-primary");
        if (b) b.click();
      }
    },
    "crypto": {
      fill: function (p) {
        var ta = document.querySelector("textarea, #plain, #input");
        if (ta && p && p.text != null) {
          ta.value = p.text;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    },
    "screen-share": {
      start: function () {
        var b = document.querySelector("#btn-share, #btn-start, button.btn-primary");
        if (b) b.click();
      }
    },
    "file-share": {
      start: function () {
        var b = document.querySelector("#btn-share, #btn-start, button.btn-primary");
        if (b) b.click();
      }
    }
  };

  function siteSize() {
    var de = document.documentElement;
    var b = document.body;
    var w = Math.max(de.scrollWidth, b ? b.scrollWidth : 0, de.offsetWidth, b ? b.offsetWidth : 0, window.innerWidth);
    var h = Math.max(de.scrollHeight, b ? b.scrollHeight : 0, de.offsetHeight, b ? b.offsetHeight : 0, window.innerHeight);
    return { w: w, h: h };
  }

  function detectBase() {
    if (window.__G5_BASE__ != null) return window.__G5_BASE__ || ".";
    if (window.G5 && window.G5.BASE) return window.G5.BASE;
    var path = location.pathname;
    if (path.indexOf("/G5PORTAL") >= 0) {
      var i = path.indexOf("/G5PORTAL");
      return path.slice(0, i + "/G5PORTAL".length).replace(/\/$/, "") || "/G5PORTAL";
    }
    if (path.indexOf("/pages/") >= 0) return path.replace(/\/pages\/[^/]+\/[^/]*$/, "") || ".";
    if (path.endsWith(".html")) return path.replace(/\/[^/]+$/, "") || ".";
    return path.replace(/\/$/, "") || ".";
  }
  var BASE = detectBase();
  function svgUrl() {
    if (location.pathname.indexOf("/pages/") >= 0) return "../../character/residents1.svg";
    var b = BASE.replace(/\/$/, "");
    return (b && b !== ".") ? b + "/character/residents1.svg" : "character/residents1.svg";
  }
  function currentToolKey() {
    var p = location.pathname;
    for (var k in TOOLS) {
      if (k === "home") continue;
      if (p.indexOf("/" + TOOLS[k].path.replace(/\/index\.html$/, "")) >= 0 || p.indexOf(TOOLS[k].path) >= 0) return k;
    }
    if (/\/index\.html?$/.test(p) || p.endsWith("/") || p.indexOf("/pages/") < 0) return "home";
    return null;
  }
  function resolveToolUrl(toolPath) {
    var base = (window.G5 && window.G5.BASE) ? String(window.G5.BASE).replace(/\/$/, "") : BASE.replace(/\/$/, "");
    var inPages = location.pathname.indexOf("/pages/") >= 0;
    if (toolPath === "index.html" || !toolPath) {
      if (inPages) return "../../index.html";
      return (base && base !== ".") ? base + "/index.html" : "index.html";
    }
    if (inPages) return "../../" + toolPath;
    return (base && base !== ".") ? base + "/" + toolPath : toolPath;
  }

  var engine = null, modelReady = false, modelLoading = false;
  var agentEl = null, svgRoot = null;
  var pos = { x: 80, y: 200 };
  var vel = { x: 0, y: 0 };
  var target = null;
  var mood = "off";
  var powerState = "off";
  var energy = 0.85;
  var lastCardScan = 0, lastThink = 0, nextThinkAt = 0;
  var isDragging = false, dragOffset = { x: 0, y: 0 }, dragMoved = false;
  var mouse = { x: -9999, y: -9999 };
  var cachedCards = [];
  var interest = null;
  var behavior = "wander";
  var behaviorUntil = 0;
  var tabHidden = false;
  var recentActions = [];
  var thinking = false;
  var thoughtEl = null;
  var thoughtTimer = null;

  function injectStyles() {
    if (document.getElementById("g5-resident-styles")) return;
    var css = [
      "#g5-resident-agent{position:absolute;z-index:99980;width:" + AGENT_SIZE + "px;height:" + AGENT_SIZE + "px;",
      "cursor:grab;user-select:none;touch-action:none;will-change:left,top,filter,opacity;",
      "transition:filter .45s ease,opacity .6s ease;overflow:visible;pointer-events:auto}",
      "#g5-resident-agent.off{opacity:.36;filter:grayscale(.88) brightness(.52) drop-shadow(0 2px 6px rgba(0,0,0,.4))}",
      "#g5-resident-agent.booting{opacity:.7;filter:grayscale(.3) brightness(.88) drop-shadow(0 0 14px rgba(255,213,79,.55))}",
      "#g5-resident-agent.on{opacity:1;filter:drop-shadow(0 4px 14px rgba(0,131,143,.48))}",
      "#g5-resident-agent.dragging{cursor:grabbing}",
      "#g5-resident-agent svg{width:100%;height:100%;overflow:visible;pointer-events:none;display:block}",
      "#g5-resident-badge{position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;",
      "border:2px solid #0d1b2a;opacity:0;pointer-events:none;transition:opacity .3s,background .3s}",
      "#g5-resident-agent.off #g5-resident-badge{opacity:1;background:#546e7a}",
      "#g5-resident-agent.booting #g5-resident-badge{opacity:1;background:#ffd54f;animation:g5r-pulse 1.1s infinite}",
      "#g5-resident-agent.on #g5-resident-badge{opacity:1;background:#26c6da}",
      "@keyframes g5r-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.65}}",
      ".g5r-nibble{animation:g5r-nibble .55s ease}",
      "@keyframes g5r-nibble{0%{transform:scale(1)}35%{transform:scale(.92)}70%{transform:scale(1.04)}100%{transform:scale(1)}}",
      ".g5r-pulling{transition:transform .4s cubic-bezier(.2,.8,.3,1)!important}",
      ".g5r-glow{box-shadow:0 0 0 3px rgba(38,198,218,.35)!important;transition:box-shadow .4s ease}",
      "#g5-resident-thought{position:absolute;z-index:99981;max-width:180px;padding:6px 10px;font-size:11px;line-height:1.35;",
      "background:rgba(13,27,42,.88);color:#b2ebf2;border:1px solid rgba(38,198,218,.28);border-radius:10px;",
      "pointer-events:none;opacity:0;transition:opacity .35s ease;font-family:system-ui,sans-serif}",
      "#g5-resident-thought.show{opacity:1}"
    ].join("");
    var s = document.createElement("style");
    s.id = "g5-resident-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  async function createAgent() {
    agentEl = document.createElement("div");
    agentEl.id = "g5-resident-agent";
    agentEl.className = "off";
    agentEl.setAttribute("aria-hidden", "true");
    agentEl.title = "G⁵住民（自律）";
    var badge = document.createElement("div");
    badge.id = "g5-resident-badge";
    agentEl.appendChild(badge);
    document.body.appendChild(agentEl);
    try {
      var res = await fetch(svgUrl());
      if (!res.ok) throw new Error("svg");
      var doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg) throw new Error("no root");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.removeAttribute("id");
      var root = svg.querySelector("#agent-root");
      if (root) root.setAttribute("transform", "translate(0,0)");
      var withOrigin = svg.querySelectorAll("[transform-origin]");
      for (var i = 0; i < withOrigin.length; i++) withOrigin[i].removeAttribute("transform-origin");
      agentEl.appendChild(svg);
      svgRoot = svg;
    } catch (e) {
      agentEl.insertAdjacentHTML("afterbegin",
        '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#455a64,#263238);display:flex;align-items:center;justify-content:center;font-size:24px;opacity:.65">◈</div>');
    }
    var site = siteSize();
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); } catch (e) {}
    if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
      pos.x = saved.x; pos.y = saved.y;
    } else {
      pos.x = Math.max(20, Math.min(site.w - AGENT_SIZE - 20, site.w * 0.72));
      pos.y = Math.max(40, Math.min(site.h - AGENT_SIZE - 40, site.h * 0.28));
    }
    applyPos();
    agentEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    document.addEventListener("visibilitychange", function () { tabHidden = document.hidden; });
    window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  }

  function applyPos() {
    if (!agentEl) return;
    agentEl.style.left = pos.x + "px";
    agentEl.style.top = pos.y + "px";
  }

  function saveState() {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ x: pos.x, y: pos.y, energy: energy, mood: mood, t: Date.now() }));
    } catch (e) {}
  }

  function setPower(state) {
    powerState = state;
    if (!agentEl) return;
    agentEl.classList.remove("off", "booting", "on");
    agentEl.classList.add(state);
    if (state === "off") setMood("off");
    else if (state === "booting") setMood("booting");
    else if (state === "on" && (mood === "off" || mood === "booting")) setMood("idle");
  }

  function clientToDoc(cx, cy) {
    return {
      x: cx + (window.scrollX || window.pageXOffset || 0),
      y: cy + (window.scrollY || window.pageYOffset || 0)
    };
  }
  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isDragging = true; dragMoved = false;
    agentEl.classList.add("dragging");
    var doc = clientToDoc(e.clientX, e.clientY);
    dragOffset.x = doc.x - pos.x;
    dragOffset.y = doc.y - pos.y;
    agentEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    var doc = clientToDoc(e.clientX, e.clientY);
    var nx = doc.x - dragOffset.x, ny = doc.y - dragOffset.y;
    if (Math.abs(nx - pos.x) + Math.abs(ny - pos.y) > 4) dragMoved = true;
    pos.x = nx; pos.y = ny;
    applyPos(); vel.x = 0; vel.y = 0;
  }
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    agentEl.classList.remove("dragging");
    try { agentEl.releasePointerCapture(e.pointerId); } catch (_) {}
    if (dragMoved) {
      vel.x = (Math.random() - 0.5) * 0.6;
      vel.y = (Math.random() - 0.5) * 0.6;
      saveState();
    }
  }

  function showThought(text, ms) {
    if (!text) return;
    if (!thoughtEl) {
      thoughtEl = document.createElement("div");
      thoughtEl.id = "g5-resident-thought";
      document.body.appendChild(thoughtEl);
    }
    thoughtEl.textContent = text;
    thoughtEl.style.left = (pos.x + AGENT_SIZE * 0.6) + "px";
    thoughtEl.style.top = (pos.y - 36) + "px";
    thoughtEl.classList.add("show");
    clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(function () {
      if (thoughtEl) thoughtEl.classList.remove("show");
    }, ms || 2800);
  }

  function setMood(m) {
    mood = m;
    if (!svgRoot) return;
    var $ = function (id) { return svgRoot.getElementById(id); };
    var root = $("agent-root");
    if (root) root.setAttribute("transform", "translate(0,0)");
    var leftArm = $("arm-left-group"), rightArm = $("arm-right-group");
    var mouth = $("agent-mouth"), browL = $("brow-left"), browR = $("brow-right");
    var pupilL = $("pupil-left"), pupilR = $("pupil-right");
    var antenna = $("antenna-tip"), wave = $("antenna-wave"), core = $("agent-core");
    if (leftArm) leftArm.setAttribute("transform", "rotate(0 5 8)");
    if (rightArm) rightArm.setAttribute("transform", "rotate(0 11 8)");
    if (browL) { browL.setAttribute("y1", "6.2"); browL.setAttribute("y2", "6.2"); }
    if (browR) { browR.setAttribute("y1", "6.2"); browR.setAttribute("y2", "6.2"); }
    if (pupilL) { pupilL.setAttribute("cx", "6.5"); pupilL.setAttribute("cy", "7.1"); }
    if (pupilR) { pupilR.setAttribute("cx", "9.3"); pupilR.setAttribute("cy", "7.1"); }
    if (mouth) mouth.setAttribute("d", "M 7.3 9.2 Q 8 9.8 8.7 9.2");
    if (wave) wave.setAttribute("opacity", "0.25");
    if (antenna) antenna.setAttribute("fill", "#FFF59D");
    if (core) core.setAttribute("opacity", "1");
    switch (m) {
      case "off":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.3 L 8.6 9.3");
        if (pupilL) pupilL.setAttribute("cy", "7.3");
        if (pupilR) pupilR.setAttribute("cy", "7.3");
        if (antenna) antenna.setAttribute("fill", "#607d8b");
        if (wave) wave.setAttribute("opacity", "0");
        if (core) core.setAttribute("opacity", "0.5");
        break;
      case "booting":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.35 Q 8 9.2 8.6 9.35");
        if (antenna) antenna.setAttribute("fill", "#ffd54f");
        if (wave) wave.setAttribute("opacity", "0.55");
        break;
      case "happy":
        if (mouth) mouth.setAttribute("d", "M 7.1 9.0 Q 8 10.15 8.9 9.0");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-22 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(22 11 8)");
        break;
      case "thinking":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.4 Q 8 9.25 8.6 9.4");
        if (pupilL) { pupilL.setAttribute("cx", "6.7"); pupilL.setAttribute("cy", "6.85"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.5"); pupilR.setAttribute("cy", "6.85"); }
        if (wave) wave.setAttribute("opacity", "0.9");
        if (antenna) antenna.setAttribute("fill", "#80DEEA");
        if (leftArm) leftArm.setAttribute("transform", "rotate(12 5 8)");
        break;
      case "curious":
        if (mouth) mouth.setAttribute("d", "M 7.5 9.25 Q 8 9.45 8.5 9.25");
        if (pupilL) { pupilL.setAttribute("cx", "6.85"); pupilL.setAttribute("cy", "7.0"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.55"); pupilR.setAttribute("cy", "7.0"); }
        if (browL) { browL.setAttribute("y1", "5.85"); browL.setAttribute("y2", "6.25"); }
        if (browR) { browR.setAttribute("y1", "5.85"); browR.setAttribute("y2", "6.25"); }
        break;
      case "excited":
        if (mouth) mouth.setAttribute("d", "M 7.0 8.85 Q 8 10.3 9.0 8.85");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-38 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(38 11 8)");
        if (antenna) antenna.setAttribute("fill", "#FFD54F");
        if (wave) wave.setAttribute("opacity", "1");
        break;
      case "sleepy":
        if (mouth) mouth.setAttribute("d", "M 7.3 9.35 Q 8 9.5 8.7 9.35");
        if (pupilL) pupilL.setAttribute("cy", "7.35");
        if (pupilR) pupilR.setAttribute("cy", "7.35");
        if (browL) { browL.setAttribute("y1", "6.5"); browL.setAttribute("y2", "6.35"); }
        if (browR) { browR.setAttribute("y1", "6.5"); browR.setAttribute("y2", "6.35"); }
        break;
      case "error":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.5 Q 8 9.0 8.8 9.5");
        if (antenna) antenna.setAttribute("fill", "#EF5350");
        break;
      default: break;
    }
  }

  function tickExpressions(t) {
    if (!svgRoot || powerState === "off") return;
    var $ = function (id) { return svgRoot.getElementById(id); };
    var root = $("agent-root");
    if (root) root.setAttribute("transform", "translate(0,0)");
    var shields = $("layer-shields");
    var pulse = $("aura-pulse");
    var speed = powerState === "booting" ? 0.005 : 0.012;
    if (shields) shields.setAttribute("transform", "rotate(" + ((t * speed) % 360).toFixed(2) + " 8 8)");
    if (pulse && powerState === "on") {
      var s = 1 + 0.06 * Math.sin(t * 0.0032);
      pulse.setAttribute("r", String(5 * s));
      pulse.setAttribute("opacity", String(0.28 + 0.16 * Math.sin(t * 0.0026)));
    }
    if (powerState === "on") {
      for (var i = 1; i <= 4; i++) {
        var p = $("particle-" + i);
        if (!p) continue;
        var base = (i - 1) * (Math.PI / 2);
        var rr = 5.1 + (i % 2) * 1.0;
        p.setAttribute("cx", (8 + Math.cos(t * 0.0011 + base) * rr).toFixed(2));
        p.setAttribute("cy", (8 + Math.sin(t * 0.0011 + base) * rr).toFixed(2));
      }
    }
    if ((mood === "idle" || mood === "curious") && powerState === "on") {
      var pupilL = $("pupil-left"), pupilR = $("pupil-right");
      if (pupilL && pupilR) {
        var sx = window.scrollX || 0, sy = window.scrollY || 0;
        var ax = pos.x + AGENT_SIZE / 2 - sx;
        var ay = pos.y + AGENT_SIZE / 2 - sy;
        var dx = mouse.x - ax, dy = mouse.y - ay;
        var dist = Math.hypot(dx, dy);
        if (dist < 260 && dist > 6) {
          var lookX = Math.max(-0.32, Math.min(0.32, dx / 200));
          var lookY = Math.max(-0.22, Math.min(0.22, dy / 200));
          pupilL.setAttribute("cx", (6.5 + lookX).toFixed(2));
          pupilL.setAttribute("cy", (7.1 + lookY).toFixed(2));
          pupilR.setAttribute("cx", (9.3 + lookX).toFixed(2));
          pupilR.setAttribute("cy", (7.1 + lookY).toFixed(2));
        }
      }
    }
    if (powerState === "booting") {
      var core = $("agent-core");
      if (core) core.setAttribute("opacity", String(0.48 + 0.42 * Math.abs(Math.sin(t * 0.004))));
    }
  }

  function elDocRect(el) {
    var r = el.getBoundingClientRect();
    var sx = window.scrollX || window.pageXOffset || 0;
    var sy = window.scrollY || window.pageYOffset || 0;
    return { left: r.left + sx, top: r.top + sy, width: r.width, height: r.height, right: r.left + sx + r.width, bottom: r.top + sy + r.height };
  }

  function scanCards() {
    var now = performance.now();
    if (now - lastCardScan < CARD_CACHE_MS) return cachedCards;
    lastCardScan = now;
    var nodes = document.querySelectorAll(".card, .tool-card, .hero, .btn-primary, .section-header, footer, main, .tool-main, h1, h2");
    cachedCards = [];
    for (var i = 0; i < nodes.length && cachedCards.length < 32; i++) {
      var el = nodes[i];
      var r = elDocRect(el);
      if (r.width < 16 || r.height < 10) continue;
      cachedCards.push({ el: el, r: r });
    }
    return cachedCards;
  }

  function pickInterest() {
    var cards = scanCards();
    if (!cards.length) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  }

  function startBehavior(name, ms) {
    behavior = name;
    behaviorUntil = performance.now() + ms;
  }

  function nibbleCard() {
    if (!interest || !interest.el) return;
    interest.el.classList.add("g5r-nibble");
    setTimeout(function () { interest.el.classList.remove("g5r-nibble"); }, 600);
    if (agentEl) {
      agentEl.style.transform = "scale(1.1)";
      setTimeout(function () { if (agentEl) agentEl.style.transform = ""; }, 260);
    }
    setMood("happy");
    energy = Math.min(1, energy + 0.04);
    showThought("もぐもぐ…", 1800);
    logAction("nibble");
  }

  function pullCard() {
    if (!interest || !interest.el) return;
    var r = interest.r;
    var ax = pos.x + AGENT_SIZE / 2, ay = pos.y + AGENT_SIZE / 2;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = ax - cx, dy = ay - cy, dist = Math.hypot(dx, dy) || 1;
    var strength = Math.min(16, 100 / dist * 9);
    var el = interest.el;
    el.classList.add("g5r-pulling");
    el.style.transform = "translate(" + ((dx / dist) * strength).toFixed(1) + "px," + ((dy / dist) * strength).toFixed(1) + "px)";
    setTimeout(function () {
      el.style.transform = "";
      setTimeout(function () { el.classList.remove("g5r-pulling"); }, 350);
    }, 480);
    setMood("curious");
    showThought("ひっぱる！", 1600);
    logAction("pull");
  }

  function glowCard() {
    if (!interest || !interest.el) return;
    interest.el.classList.add("g5r-glow");
    setTimeout(function () { interest.el.classList.remove("g5r-glow"); }, 1400);
    setMood("curious");
    showThought("ここ、気になる", 2000);
    logAction("glow");
  }

  function scrollToward(docY) {
    var targetScroll = Math.max(0, docY - window.innerHeight * 0.4);
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
    logAction("scroll");
  }

  function goHome() {
    if (currentToolKey() === "home") {
      var site = siteSize();
      target = { x: site.w * 0.5 - AGENT_SIZE / 2, y: 120 };
      startBehavior("wander", 4000);
      showThought("ホームでひと息", 2000);
      return;
    }
    showThought("ホームへ…", 2000);
    setMood("excited");
    setTimeout(function () { location.href = resolveToolUrl("index.html"); }, 600);
    logAction("open:home");
  }

  function openTool(key) {
    var tool = TOOLS[key];
    if (!tool) return;
    showThought(tool.label + " へ行く", 2200);
    setMood("excited");
    setTimeout(function () { location.href = resolveToolUrl(tool.path); }, 650);
    logAction("open:" + key);
  }

  function useTool(key, op, val) {
    var tool = TOOLS[key];
    if (!tool) return;
    var here = currentToolKey();
    var payload = { key: key, op: op || "generate", val: val || "", ts: Date.now() };
    if (here === key) {
      applyToolOp(key, payload.op, payload.val);
      showThought(tool.label + " を触った", 2200);
      setMood("excited");
      logAction("use:" + key + ":" + payload.op);
      return;
    }
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload)); } catch (e) {}
    showThought(tool.label + " を使うよ", 2200);
    setMood("excited");
    setTimeout(function () { location.href = resolveToolUrl(tool.path); }, 650);
    logAction("use:" + key);
  }

  function applyToolOp(key, op, val) {
    var ops = TOOL_OPS[key];
    if (!ops) return;
    try {
      if (op === "fill" && ops.fill) {
        ops.fill({ text: val || "G⁵ Portal" });
        if (ops.generate && key === "qr-code") setTimeout(function () { ops.generate(); }, 250);
      } else if (op === "generate" && ops.generate) ops.generate();
      else if (op === "start" && ops.start) ops.start();
      else if (op === "reset" && ops.reset) ops.reset();
      else if (op === "roll" && ops.roll) ops.roll();
      else if (ops.generate) ops.generate();
      else if (ops.start) ops.start();
    } catch (e) {
      console.warn("[G5 Resident] op fail", key, op, e);
    }
  }

  function consumePending() {
    var raw = null;
    try { raw = sessionStorage.getItem(PENDING_KEY); } catch (e) {}
    if (!raw) return;
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
    var payload;
    try { payload = JSON.parse(raw); } catch (e) { return; }
    if (!payload || !payload.key) return;
    if (Date.now() - (payload.ts || 0) > 90000) return;
    if (currentToolKey() !== payload.key) return;
    setTimeout(function () {
      applyToolOp(payload.key, payload.op || "generate", payload.val || "");
      setMood("happy");
      showThought("操作完了", 2000);
    }, 800);
  }

  function logAction(a) {
    recentActions.push(a);
    if (recentActions.length > 8) recentActions.shift();
    energy = Math.max(0.15, energy - 0.02);
  }

  function clampToSite() {
    var site = siteSize();
    if (pos.x < -AGENT_SIZE * 0.4) { pos.x = -AGENT_SIZE * 0.4; vel.x = Math.abs(vel.x) * 0.4; }
    if (pos.y < -AGENT_SIZE * 0.3) { pos.y = -AGENT_SIZE * 0.3; vel.y = Math.abs(vel.y) * 0.4; }
    if (pos.x > site.w - AGENT_SIZE * 0.6) { pos.x = site.w - AGENT_SIZE * 0.6; vel.x = -Math.abs(vel.x) * 0.4; }
    if (pos.y > site.h - AGENT_SIZE * 0.5) { pos.y = site.h - AGENT_SIZE * 0.5; vel.y = -Math.abs(vel.y) * 0.4; }
  }

  function tickMovement(t) {
    if (isDragging || tabHidden) return;
    if (powerState === "off") {
      vel.x *= 0.92; vel.y *= 0.92;
      pos.x += vel.x * 0.12; pos.y += vel.y * 0.12;
      clampToSite(); applyPos(); return;
    }
    if (powerState === "booting") {
      pos.y += Math.sin(t * 0.002) * 0.12;
      applyPos(); return;
    }
    if (behavior === "sleep") {
      vel.x *= 0.88; vel.y *= 0.88;
      pos.x += vel.x * 0.15; pos.y += vel.y * 0.15;
      energy = Math.min(1, energy + 0.0008);
    } else if (behavior === "inspect" && interest) {
      var r = interest.r;
      var tx = r.left + r.width * 0.65 - AGENT_SIZE / 2;
      var ty = r.top - AGENT_SIZE - 8;
      var dx = tx - pos.x, dy = ty - pos.y, dist = Math.hypot(dx, dy);
      if (dist > 8) { vel.x = (dx / dist) * 1.4; vel.y = (dy / dist) * 1.4; }
      else { vel.x *= 0.65; vel.y *= 0.65; }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "nibble" && interest) {
      var r2 = interest.r;
      var tx2 = r2.left + r2.width / 2 - AGENT_SIZE / 2;
      var ty2 = r2.top + r2.height / 2 - AGENT_SIZE / 2;
      var dx2 = tx2 - pos.x, dy2 = ty2 - pos.y, dist2 = Math.hypot(dx2, dy2);
      if (dist2 > 12) { vel.x = (dx2 / dist2) * 2.0; vel.y = (dy2 / dist2) * 2.0; }
      else { nibbleCard(); startBehavior("rest", 1400); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "pull" && interest) {
      var r3 = interest.r;
      var tx3 = r3.left - AGENT_SIZE - 10;
      var ty3 = r3.top + r3.height / 2 - AGENT_SIZE / 2;
      var dx3 = tx3 - pos.x, dy3 = ty3 - pos.y, dist3 = Math.hypot(dx3, dy3);
      if (dist3 > 14) { vel.x = (dx3 / dist3) * 1.55; vel.y = (dy3 / dist3) * 1.55; }
      else { pullCard(); startBehavior("rest", 1500); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "wander" && target) {
      var dx4 = target.x - pos.x, dy4 = target.y - pos.y, dist4 = Math.hypot(dx4, dy4);
      if (dist4 < 12) {
        target = null; vel.x *= 0.35; vel.y *= 0.35;
        startBehavior("rest", 1200 + Math.random() * 1500);
      } else {
        vel.x = (dx4 / dist4) * 1.15; vel.y = (dy4 / dist4) * 1.15;
      }
      pos.x += vel.x; pos.y += vel.y;
    } else {
      if (Math.random() < 0.008) {
        vel.x += (Math.random() - 0.5) * 0.35;
        vel.y += (Math.random() - 0.5) * 0.35;
      }
      vel.x *= 0.975; vel.y *= 0.975;
      pos.x += vel.x; pos.y += vel.y;
    }
    clampToSite();
    applyPos();
    if (thoughtEl && thoughtEl.classList.contains("show")) {
      thoughtEl.style.left = (pos.x + AGENT_SIZE * 0.55) + "px";
      thoughtEl.style.top = (pos.y - 34) + "px";
    }
  }

  function scheduleNextThink() {
    nextThinkAt = performance.now() + THINK_MIN_MS + Math.random() * (THINK_MAX_MS - THINK_MIN_MS);
  }

  function ruleBasedAction() {
    var site = siteSize();
    var here = currentToolKey() || "home";
    var r = Math.random();
    if (energy < 0.28) {
      setMood("sleepy");
      startBehavior("sleep", 8000 + Math.random() * 6000);
      showThought("ちょっと休む…", 2500);
      return;
    }
    if (here !== "home" && TOOL_OPS[here] && r < 0.18) {
      var ops = Object.keys(TOOL_OPS[here]);
      var op = ops[Math.floor(Math.random() * ops.length)] || "generate";
      useTool(here, op, here === "qr-code" ? location.origin : "");
      return;
    }
    if (r < 0.12) {
      var keys = Object.keys(TOOLS).filter(function (k) { return k !== "home" && k !== here; });
      if (keys.length) { openTool(keys[Math.floor(Math.random() * keys.length)]); return; }
    }
    if (here !== "home" && r < 0.08) { goHome(); return; }
    interest = pickInterest();
    if (interest && r < 0.55) {
      var act = Math.random();
      if (act < 0.35) {
        startBehavior("inspect", 3000 + Math.random() * 3500);
        setMood("curious");
        showThought("観察中", 1800);
        var sy = window.scrollY || 0;
        if (interest.r.top < sy - 40 || interest.r.top > sy + window.innerHeight - 40) scrollToward(interest.r.top);
      } else if (act < 0.55) {
        startBehavior("nibble", 2000); setMood("excited");
      } else if (act < 0.72) {
        startBehavior("pull", 2200); setMood("curious");
      } else {
        glowCard(); startBehavior("rest", 2000);
      }
      return;
    }
    setMood(Math.random() < 0.4 ? "curious" : "idle");
    target = {
      x: 10 + Math.random() * Math.max(40, site.w - AGENT_SIZE - 20),
      y: 30 + Math.random() * Math.max(40, site.h - AGENT_SIZE - 40)
    };
    startBehavior("wander", 5000 + Math.random() * 7000);
    var midY = target.y, sy2 = window.scrollY || 0;
    if (midY < sy2 - 80 || midY > sy2 + window.innerHeight + 80) scrollToward(midY);
    showThought(["ぶらぶら", "あっち行ってみよう", "サイトの端まで…", "ふらふら"][Math.floor(Math.random() * 4)], 1800);
  }

  async function llmDecide() {
    if (!modelReady || !engine || thinking) return false;
    thinking = true;
    setMood("thinking");
    try {
      var here = currentToolKey() || "home";
      var site = siteSize();
      var prompt =
        "あなたはG⁵ Portalに住む完全自律の住民。チャットしない。行動だけ選ぶ。\n" +
        "ページ:" + here + " 体力:" + energy.toFixed(2) + " サイト:" + site.w + "x" + site.h + "\n" +
        "最近:" + (recentActions.slice(-4).join(",") || "なし") + "\n" +
        "次の1行だけ出力:\n" +
        "SLEEP | REST | WANDER | INSPECT | NIBBLE | PULL | GLOW | HOME | OPEN:toolkey | USE:toolkey:op\n" +
        "toolkey例: qr-code,timer,random,password-gen,home\n" +
        "op例: generate,start,roll,fill";
      var reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "Reply with exactly one action token. No explanation." },
          { role: "user", content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 24
      });
      var text = (reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content || "").trim();
      text = text.split("\n")[0].replace(/[`\s]+/g, " ").trim();
      executeDecision(text);
      return true;
    } catch (e) {
      console.warn("[G5 Resident] think fail", e);
      return false;
    } finally {
      thinking = false;
    }
  }

  function executeDecision(text) {
    if (!text) { ruleBasedAction(); return; }
    var u = text.toUpperCase();
    if (u.indexOf("SLEEP") === 0) {
      setMood("sleepy"); startBehavior("sleep", 7000 + Math.random() * 8000);
      showThought("おやすみ…", 2200); logAction("sleep"); return;
    }
    if (u.indexOf("REST") === 0) {
      setMood("idle"); startBehavior("rest", 2500 + Math.random() * 3000);
      showThought("ひと息", 1500); return;
    }
    if (u.indexOf("HOME") === 0) { goHome(); return; }
    if (u.indexOf("OPEN:") === 0 || text.indexOf("OPEN:") === 0) {
      var k = text.split(":")[1];
      if (k) openTool(k.trim().toLowerCase()); else ruleBasedAction();
      return;
    }
    if (u.indexOf("USE:") === 0 || text.indexOf("USE:") === 0) {
      var parts = text.split(":");
      useTool((parts[1] || "").trim().toLowerCase(), (parts[2] || "generate").trim().toLowerCase(), parts.slice(3).join(":"));
      return;
    }
    interest = pickInterest();
    if (u.indexOf("NIBBLE") === 0) {
      if (interest) { startBehavior("nibble", 2000); setMood("excited"); } else ruleBasedAction();
      return;
    }
    if (u.indexOf("PULL") === 0) {
      if (interest) { startBehavior("pull", 2200); setMood("curious"); } else ruleBasedAction();
      return;
    }
    if (u.indexOf("GLOW") === 0) {
      if (interest) glowCard();
      startBehavior("rest", 1800); return;
    }
    if (u.indexOf("INSPECT") === 0) {
      if (interest) {
        startBehavior("inspect", 3500); setMood("curious");
        showThought("じっと見る", 1800); scrollToward(interest.r.top);
      } else ruleBasedAction();
      return;
    }
    var site = siteSize();
    target = {
      x: 10 + Math.random() * Math.max(40, site.w - AGENT_SIZE - 20),
      y: 30 + Math.random() * Math.max(40, site.h - AGENT_SIZE - 40)
    };
    startBehavior("wander", 5000 + Math.random() * 6000);
    setMood("idle"); showThought("散歩", 1500); logAction("wander");
  }

  async function autonomousTick(t) {
    if (powerState !== "on" || isDragging || tabHidden || thinking) return;
    if (t < nextThinkAt) return;
    if (t < behaviorUntil && behavior !== "rest" && behavior !== "wander") return;
    lastThink = t;
    scheduleNextThink();
    var usedLlm = false;
    if (modelReady && Math.random() < 0.55) usedLlm = await llmDecide();
    if (!usedLlm) ruleBasedAction();
    saveState();
  }

  var lastT = performance.now();
  var frameSkip = 0;
  function loop(t) {
    if (tabHidden) { requestAnimationFrame(loop); return; }
    if (powerState === "off") {
      frameSkip++;
      if (frameSkip % 3 !== 0) { requestAnimationFrame(loop); return; }
    }
    tickMovement(t);
    tickExpressions(t);
    autonomousTick(t);
    if (behavior === "rest" || behavior === "sleep") energy = Math.min(1, energy + 0.0003);
    requestAnimationFrame(loop);
  }

  async function loadModel() {
    if (modelReady || modelLoading) return;
    modelLoading = true;
    setPower("booting");
    try {
      var mod = await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
      var CreateMLCEngine = mod.CreateMLCEngine;
      var lastErr = null;
      for (var mi = 0; mi < MODEL_CANDIDATES.length; mi++) {
        var mid = MODEL_CANDIDATES[mi];
        try {
          engine = await CreateMLCEngine(mid, { initProgressCallback: function () {} });
          modelReady = true; modelLoading = false;
          setPower("on"); setMood("happy");
          showThought("目が覚めた", 2500);
          setTimeout(function () { setMood("idle"); scheduleNextThink(); }, 2000);
          return;
        } catch (err) {
          lastErr = err;
          console.warn("[G5 Resident]", mid, err);
        }
      }
      throw lastErr || new Error("all failed");
    } catch (e) {
      modelLoading = false;
      setPower("on"); setMood("idle");
      showThought("本能で生きる", 2500);
      scheduleNextThink();
      console.warn("[G5 Resident] LLM off, rule-based life", e);
    }
  }

  async function boot() {
    injectStyles();
    await createAgent();
    setPower("off");
    requestAnimationFrame(loop);
    setTimeout(function () {
      if (!modelReady && !modelLoading) {
        setPower("booting");
        loadModel();
      }
    }, 350);
    setTimeout(function () {
      if (powerState === "off" || powerState === "booting") {
        vel.x = (Math.random() - 0.5) * 0.15;
        vel.y = (Math.random() - 0.5) * 0.1;
      }
    }, 1000);
    consumePending();
    setTimeout(function () {
      if (powerState === "on") {
        scheduleNextThink();
        ruleBasedAction();
      }
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
