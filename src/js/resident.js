/**
 * G⁵ Portal — Site Resident (WebLLM)
 * Lives on the *site* (can leave the viewport). Auto power-on.
 * Can operate tools, not only navigate.
 */
(function () {
  "use strict";
  if (window.__G5_RESIDENT_BOOTED__) return;
  window.__G5_RESIDENT_BOOTED__ = true;

  const MODEL_CANDIDATES = [
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "SmolLM2-360M-Instruct-q4f16_1-MLC",
    "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  ];
  const AGENT_SIZE = 68;
  const CHAT_HISTORY_LIMIT = 10;
  const CARD_CACHE_MS = 4000;
  const MAX_PULL = 18;
  const OFFSCREEN_SOFT = 120;
  const PENDING_KEY = "g5_resident_pending";

  const TOOLS = {
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

  const TOOL_OPS = {
    "qr-code": {
      fill: function (p) {
        var ta = document.getElementById("qr-text");
        if (ta && p.text != null) { ta.value = p.text; ta.dispatchEvent(new Event("input", { bubbles: true })); }
      },
      generate: function () {
        var btn = document.getElementById("btn-gen");
        if (btn) btn.click();
      }
    },
    "timer": {
      start: function () {
        var b = document.getElementById("btn-start") || document.querySelector("[data-action=start], .btn-start, #start");
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
        if (ta && p.text != null) { ta.value = p.text; ta.dispatchEvent(new Event("input", { bubbles: true })); }
      }
    },
    "random": {
      roll: function () {
        var b = document.querySelector("#btn-roll, #btn-coin, #btn-dice, button.btn-primary");
        if (b) b.click();
      }
    },
    "color-picker": {},
    "crypto": {
      fill: function (p) {
        var ta = document.querySelector("textarea, #plain, #input");
        if (ta && p.text != null) { ta.value = p.text; ta.dispatchEvent(new Event("input", { bubbles: true })); }
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
    return null;
  }

  var engine = null, modelReady = false, modelLoading = false;
  var chatOpen = false, messages = [];
  var agentEl = null, svgRoot = null, chatPanel = null;
  var pos = { x: 40, y: 140 }, vel = { x: 0, y: 0 };
  var target = null, mood = "off", powerState = "off";
  var lastCardScan = 0, lastInteract = 0;
  var isDragging = false, dragOffset = { x: 0, y: 0 };
  var mouse = { x: -999, y: -999 };
  var cachedCards = [], interest = null;
  var behavior = "wander", behaviorUntil = 0;
  var tabHidden = false, dragMoved = false;

  function injectStyles() {
    if (document.getElementById("g5-resident-styles")) return;
    var css = "#g5-resident-agent{position:fixed;z-index:99980;width:" + AGENT_SIZE + "px;height:" + AGENT_SIZE + "px;cursor:grab;user-select:none;touch-action:none;will-change:left,top,filter,opacity;transition:filter .4s ease,opacity .6s ease;overflow:visible}#g5-resident-agent.off{opacity:.38;filter:grayscale(.85) brightness(.55) drop-shadow(0 2px 6px rgba(0,0,0,.4))}#g5-resident-agent.booting{opacity:.72;filter:grayscale(.35) brightness(.85) drop-shadow(0 0 12px rgba(255,213,79,.55))}#g5-resident-agent.on{opacity:1;filter:drop-shadow(0 4px 14px rgba(0,131,143,.5))}#g5-resident-agent.on:hover{filter:drop-shadow(0 6px 20px rgba(38,198,218,.75))}#g5-resident-agent.dragging{cursor:grabbing}#g5-resident-agent svg{width:100%;height:100%;overflow:visible;pointer-events:none;display:block}#g5-resident-badge{position:absolute;top:-5px;right:-5px;width:12px;height:12px;border-radius:50%;border:2px solid #0d1b2a;opacity:0;transition:opacity .3s,background .3s;pointer-events:none}#g5-resident-agent.off #g5-resident-badge{opacity:1;background:#546e7a}#g5-resident-agent.booting #g5-resident-badge{opacity:1;background:#ffd54f;animation:g5r-pulse 1.1s infinite}#g5-resident-agent.on #g5-resident-badge{opacity:1;background:#26c6da}@keyframes g5r-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}#g5-resident-chat{position:fixed;z-index:99990;width:min(340px,calc(100vw - 20px));max-height:min(440px,68vh);background:linear-gradient(165deg,#0d1b2a,#1b263b 55%,#0a1628);border:1px solid rgba(38,198,218,.32);border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:scale(.94) translateY(10px);transition:opacity .22s ease,transform .22s ease;font-family:system-ui,-apple-system,sans-serif;color:#e0f7fa}#g5-resident-chat.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}#g5-resident-chat .g5r-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(0,131,143,.22);border-bottom:1px solid rgba(38,198,218,.18);font-size:.88rem;font-weight:600}#g5-resident-chat .g5r-header button{background:0;border:0;color:#80deea;font-size:1.15rem;cursor:pointer;line-height:1}#g5-resident-chat .g5r-messages{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;font-size:.82rem;line-height:1.4}#g5-resident-chat .g5r-msg{max-width:92%;padding:7px 11px;border-radius:11px;word-break:break-word}#g5-resident-chat .g5r-msg.user{align-self:flex-end;background:rgba(38,198,218,.2);border:1px solid rgba(38,198,218,.28)}#g5-resident-chat .g5r-msg.assistant{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07)}#g5-resident-chat .g5r-msg.system{align-self:center;font-size:.72rem;color:#80deea;opacity:.85;border:0;background:0}#g5-resident-chat .g5r-input-row{display:flex;gap:7px;padding:9px 11px;border-top:1px solid rgba(38,198,218,.14);background:rgba(0,0,0,.18)}#g5-resident-chat .g5r-input-row input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(38,198,218,.22);border-radius:9px;padding:7px 11px;color:#e0f7fa;font-size:.88rem;outline:0}#g5-resident-chat .g5r-input-row input:focus{border-color:#26c6da}#g5-resident-chat .g5r-input-row button{background:linear-gradient(135deg,#00838f,#26c6da);border:0;border-radius:9px;color:#fff;padding:7px 12px;font-weight:600;cursor:pointer;font-size:.82rem}#g5-resident-chat .g5r-input-row button:disabled{opacity:.45;cursor:not-allowed}#g5-resident-chat .g5r-status{padding:3px 11px 7px;font-size:.7rem;color:#80deea;opacity:.8}.g5r-nibble{animation:g5r-nibble .55s ease}@keyframes g5r-nibble{0%{transform:scale(1)}35%{transform:scale(.92)}70%{transform:scale(1.04)}100%{transform:scale(1)}}.g5r-pulling{transition:transform .4s cubic-bezier(.2,.8,.3,1)!important}";
    var s = document.createElement("style");
    s.id = "g5-resident-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  async function createAgent() {
    agentEl = document.createElement("div");
    agentEl.id = "g5-resident-agent";
    agentEl.className = "off";
    agentEl.setAttribute("role", "button");
    agentEl.setAttribute("aria-label", "G⁵住民");
    agentEl.title = "G⁵住民（クリックで会話 / ドラッグで移動）";
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
      agentEl.insertAdjacentHTML("afterbegin", '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#455a64,#263238);display:flex;align-items:center;justify-content:center;font-size:26px;opacity:.6;">◈</div>');
    }
    pos.x = Math.min(window.innerWidth - AGENT_SIZE - 24, Math.max(24, window.innerWidth * 0.78));
    pos.y = Math.min(window.innerHeight - AGENT_SIZE - 90, Math.max(90, window.innerHeight * 0.5));
    applyPos();
    agentEl.addEventListener("pointerdown", onPointerDown);
    agentEl.addEventListener("click", onAgentClick);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", function () { tabHidden = document.hidden; });
    window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  }

  function applyPos() {
    if (!agentEl) return;
    agentEl.style.left = pos.x + "px";
    agentEl.style.top = pos.y + "px";
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

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isDragging = true; dragMoved = false;
    agentEl.classList.add("dragging");
    dragOffset.x = e.clientX - pos.x;
    dragOffset.y = e.clientY - pos.y;
    agentEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    var nx = e.clientX - dragOffset.x;
    var ny = e.clientY - dragOffset.y;
    if (Math.abs(nx - pos.x) + Math.abs(ny - pos.y) > 4) dragMoved = true;
    pos.x = nx; pos.y = ny;
    applyPos();
    vel.x = 0; vel.y = 0;
  }
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    agentEl.classList.remove("dragging");
    try { agentEl.releasePointerCapture(e.pointerId); } catch (_) {}
    if (dragMoved) {
      vel.x = (Math.random() - 0.5) * 0.8;
      vel.y = (Math.random() - 0.5) * 0.8;
    }
  }
  function onResize() {
    if (chatOpen) positionChat();
  }
  function onAgentClick(e) {
    if (dragMoved) return;
    lastInteract = performance.now();
    if (powerState === "off" || powerState === "booting") {
      if (powerState === "off" && !modelLoading) {
        setPower("booting");
        loadModel();
      }
      setChatOpen(true);
      return;
    }
    toggleChat();
  }

  function createChatPanel() {
    chatPanel = document.createElement("div");
    chatPanel.id = "g5-resident-chat";
    chatPanel.innerHTML = '<div class="g5r-header"><span>◈ G⁵住民</span><button type="button" id="g5r-close" aria-label="閉じる">×</button></div><div class="g5r-messages" id="g5r-messages"></div><div class="g5r-status" id="g5r-status">電源オフ</div><div class="g5r-input-row"><input type="text" id="g5r-input" placeholder="話しかけてみて…" autocomplete="off" /><button type="button" id="g5r-send">送信</button></div>';
    document.body.appendChild(chatPanel);
    document.getElementById("g5r-close").addEventListener("click", function () { setChatOpen(false); });
    document.getElementById("g5r-send").addEventListener("click", sendUserMessage);
    document.getElementById("g5r-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    });
  }
  function positionChat() {
    if (!chatPanel || !agentEl) return;
    var r = agentEl.getBoundingClientRect();
    var cw = chatPanel.offsetWidth || 320, ch = chatPanel.offsetHeight || 340;
    var left = r.left + r.width / 2 - cw / 2, top = r.top - ch - 10;
    if (top < 6) top = Math.min(window.innerHeight - ch - 6, Math.max(6, r.bottom + 10));
    if (left < 6) left = 6;
    if (left + cw > window.innerWidth - 6) left = window.innerWidth - cw - 6;
    if (top + ch > window.innerHeight - 6) top = window.innerHeight - ch - 6;
    if (top < 6) top = 6;
    chatPanel.style.left = left + "px";
    chatPanel.style.top = top + "px";
  }
  function setChatOpen(open) {
    chatOpen = open;
    if (open) {
      chatPanel.classList.add("open");
      positionChat();
      setMood(powerState === "on" ? "curious" : mood);
      document.getElementById("g5r-input").focus();
    } else {
      chatPanel.classList.remove("open");
      if (powerState === "on") setMood("idle");
    }
  }
  function toggleChat() { setChatOpen(!chatOpen); }
  function appendMessage(role, text) {
    var box = document.getElementById("g5r-messages");
    if (!box) return;
    var d = document.createElement("div");
    d.className = "g5r-msg " + role;
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function setStatus(t) {
    var el = document.getElementById("g5r-status");
    if (el) el.textContent = t;
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
        if (core) core.setAttribute("opacity", "0.55");
        break;
      case "booting":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.35 Q 8 9.2 8.6 9.35");
        if (antenna) antenna.setAttribute("fill", "#ffd54f");
        if (wave) wave.setAttribute("opacity", "0.6");
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
      case "talking":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.1 Q 8 9.85 8.8 9.1");
        if (wave) wave.setAttribute("opacity", "1");
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
        if (browL) { browL.setAttribute("y1", "6.55"); browL.setAttribute("y2", "5.95"); }
        if (browR) { browR.setAttribute("y1", "6.55"); browR.setAttribute("y2", "5.95"); }
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
    var speed = powerState === "booting" ? 0.006 : 0.014;
    if (shields) shields.setAttribute("transform", "rotate(" + ((t * speed) % 360).toFixed(2) + " 8 8)");
    if (pulse && powerState === "on") {
      var s = 1 + 0.07 * Math.sin(t * 0.0035);
      pulse.setAttribute("r", String(5 * s));
      pulse.setAttribute("opacity", String(0.3 + 0.18 * Math.sin(t * 0.0028)));
    }
    if (powerState === "on") {
      for (var i = 1; i <= 4; i++) {
        var p = $("particle-" + i);
        if (!p) continue;
        var base = (i - 1) * (Math.PI / 2);
        var rr = 5.2 + (i % 2) * 1.1;
        p.setAttribute("cx", (8 + Math.cos(t * 0.0012 + base) * rr).toFixed(2));
        p.setAttribute("cy", (8 + Math.sin(t * 0.0012 + base) * rr).toFixed(2));
      }
    }
    if ((mood === "idle" || mood === "curious") && powerState === "on") {
      var pupilL = $("pupil-left"), pupilR = $("pupil-right");
      if (pupilL && pupilR) {
        var ax = pos.x + AGENT_SIZE / 2, ay = pos.y + AGENT_SIZE / 2;
        var dx = mouse.x - ax, dy = mouse.y - ay;
        var dist = Math.hypot(dx, dy);
        if (dist < 280 && dist > 8) {
          var lookX = Math.max(-0.35, Math.min(0.35, dx / 180));
          var lookY = Math.max(-0.25, Math.min(0.25, dy / 180));
          pupilL.setAttribute("cx", (6.5 + lookX).toFixed(2));
          pupilL.setAttribute("cy", (7.1 + lookY).toFixed(2));
          pupilR.setAttribute("cx", (9.3 + lookX).toFixed(2));
          pupilR.setAttribute("cy", (7.1 + lookY).toFixed(2));
        }
      }
    }
    if (mood === "talking") {
      var mouth = $("agent-mouth");
      if (mouth) {
        var open = 9.15 + 0.45 * Math.abs(Math.sin(t * 0.022));
        mouth.setAttribute("d", "M 7.2 9.1 Q 8 " + open.toFixed(2) + " 8.8 9.1");
      }
    }
    if (powerState === "booting") {
      var core = $("agent-core");
      if (core) core.setAttribute("opacity", String(0.5 + 0.45 * Math.abs(Math.sin(t * 0.004))));
    }
  }

  function scanCards() {
    var now = performance.now();
    if (now - lastCardScan < CARD_CACHE_MS) return cachedCards;
    lastCardScan = now;
    var nodes = document.querySelectorAll(".card, .tool-card, .hero, .btn-primary, .section-header, footer");
    cachedCards = [];
    for (var i = 0; i < nodes.length && cachedCards.length < 24; i++) {
      var el = nodes[i], r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 12) continue;
      cachedCards.push({ el: el, r: r });
    }
    return cachedCards;
  }

  function pickInterest() {
    var cards = scanCards();
    if (!cards.length) return null;
    if (mouse.x > -500) {
      var best = null, bestD = 1e9;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var cx = c.r.left + c.r.width / 2, cy = c.r.top + c.r.height / 2;
        var d = Math.hypot(cx - mouse.x, cy - mouse.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best && bestD < 260) return best;
    }
    return cards[Math.floor(Math.random() * cards.length)];
  }

  function startBehavior(name, durationMs) {
    behavior = name;
    behaviorUntil = performance.now() + durationMs;
  }

  function decideNextBehavior(t) {
    if (t < behaviorUntil) return;
    if (powerState !== "on" || isDragging || chatOpen) { behavior = "rest"; return; }
    var idleLong = t - lastInteract > 28000;
    var r = Math.random();
    if (idleLong && r < 0.3) {
      startBehavior("sleep", 6000 + Math.random() * 8000);
      setMood("sleepy");
      return;
    }
    if (r < 0.26) {
      interest = pickInterest();
      if (interest) { startBehavior("inspect", 3500 + Math.random() * 4000); setMood("curious"); return; }
    }
    if (r < 0.4) {
      interest = pickInterest();
      if (interest && Math.random() < 0.55) { startBehavior("nibble", 1800); setMood("excited"); return; }
      if (interest) { startBehavior("pull", 2200); setMood("curious"); return; }
    }
    if (r < 0.52) { startBehavior("rest", 2500 + Math.random() * 3000); setMood("idle"); return; }
    startBehavior("wander", 5000 + Math.random() * 6000);
    setMood(Math.random() < 0.3 ? "curious" : "idle");
    var margin = 80;
    target = {
      x: -margin + Math.random() * (window.innerWidth + margin * 2 - AGENT_SIZE),
      y: -margin + Math.random() * (window.innerHeight + margin * 2 - AGENT_SIZE)
    };
  }

  function nibbleCard() {
    if (!interest || !interest.el) return;
    var el = interest.el;
    el.classList.add("g5r-nibble");
    setTimeout(function () { el.classList.remove("g5r-nibble"); }, 600);
    if (agentEl) {
      agentEl.style.transform = "scale(1.12)";
      setTimeout(function () { if (agentEl) agentEl.style.transform = ""; }, 280);
    }
    setMood("happy");
  }

  function pullCard() {
    if (!interest || !interest.el) return;
    var el = interest.el, r = el.getBoundingClientRect();
    var ax = pos.x + AGENT_SIZE / 2, ay = pos.y + AGENT_SIZE / 2;
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = ax - cx, dy = ay - cy, dist = Math.hypot(dx, dy) || 1;
    var strength = Math.min(MAX_PULL, 120 / dist * 10);
    var ox = (dx / dist) * strength, oy = (dy / dist) * strength;
    el.classList.add("g5r-pulling");
    el.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px)";
    setTimeout(function () {
      el.style.transform = "";
      setTimeout(function () { el.classList.remove("g5r-pulling"); }, 400);
    }, 500);
  }

  function tickMovement(t, dt) {
    if (isDragging || tabHidden) return;
    if (powerState === "off") {
      vel.x *= 0.9; vel.y *= 0.9;
      pos.x += vel.x * 0.15;
      pos.y += vel.y * 0.15;
      applyPos();
      return;
    }
    if (powerState === "booting") {
      pos.y += Math.sin(t * 0.002) * 0.15;
      applyPos();
      return;
    }
    if (chatOpen) {
      vel.x *= 0.92; vel.y *= 0.92;
      pos.x += vel.x;
      pos.y += vel.y;
      applyPos();
      return;
    }
    decideNextBehavior(t);
    if (behavior === "sleep") {
      vel.x *= 0.85; vel.y *= 0.85;
      pos.x += vel.x * 0.2;
      pos.y += vel.y * 0.2;
    } else if (behavior === "inspect" && interest) {
      var r = interest.el.getBoundingClientRect();
      var tx = r.left + r.width * 0.7 - AGENT_SIZE / 2;
      var ty = r.top - AGENT_SIZE - 6;
      var dx = tx - pos.x, dy = ty - pos.y, dist = Math.hypot(dx, dy);
      if (dist > 6) { vel.x = (dx / dist) * 1.35; vel.y = (dy / dist) * 1.35; }
      else { vel.x *= 0.7; vel.y *= 0.7; }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "nibble" && interest) {
      var r2 = interest.el.getBoundingClientRect();
      var tx2 = r2.left + r2.width / 2 - AGENT_SIZE / 2;
      var ty2 = r2.top + r2.height / 2 - AGENT_SIZE / 2;
      var dx2 = tx2 - pos.x, dy2 = ty2 - pos.y, dist2 = Math.hypot(dx2, dy2);
      if (dist2 > 10) { vel.x = (dx2 / dist2) * 2.1; vel.y = (dy2 / dist2) * 2.1; }
      else { nibbleCard(); startBehavior("rest", 1200); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "pull" && interest) {
      var r3 = interest.el.getBoundingClientRect();
      var tx3 = r3.left - AGENT_SIZE - 8;
      var ty3 = r3.top + r3.height / 2 - AGENT_SIZE / 2;
      var dx3 = tx3 - pos.x, dy3 = ty3 - pos.y, dist3 = Math.hypot(dx3, dy3);
      if (dist3 > 12) { vel.x = (dx3 / dist3) * 1.6; vel.y = (dy3 / dist3) * 1.6; }
      else { pullCard(); startBehavior("rest", 1400); setMood("happy"); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "wander" && target) {
      var dx4 = target.x - pos.x, dy4 = target.y - pos.y, dist4 = Math.hypot(dx4, dy4);
      if (dist4 < 10) { target = null; vel.x *= 0.4; vel.y *= 0.4; }
      else { vel.x = (dx4 / dist4) * 1.25; vel.y = (dy4 / dist4) * 1.25; }
      pos.x += vel.x; pos.y += vel.y;
    } else {
      if (Math.random() < 0.01) {
        vel.x += (Math.random() - 0.5) * 0.4;
        vel.y += (Math.random() - 0.5) * 0.4;
      }
      vel.x *= 0.97; vel.y *= 0.97;
      pos.x += vel.x; pos.y += vel.y;
    }
    var lim = OFFSCREEN_SOFT + AGENT_SIZE;
    if (pos.x < -lim) { pos.x = -lim; vel.x = Math.abs(vel.x) * 0.5; }
    if (pos.x > window.innerWidth + lim) { pos.x = window.innerWidth + lim; vel.x = -Math.abs(vel.x) * 0.5; }
    if (pos.y < -lim) { pos.y = -lim; vel.y = Math.abs(vel.y) * 0.5; }
    if (pos.y > window.innerHeight + lim) { pos.y = window.innerHeight + lim; vel.y = -Math.abs(vel.y) * 0.5; }
    applyPos();
  }

  var lastT = performance.now(), frameSkip = 0;
  function loop(t) {
    if (tabHidden) { requestAnimationFrame(loop); return; }
    if (powerState === "off") {
      frameSkip++;
      if (frameSkip % 3 !== 0) { requestAnimationFrame(loop); return; }
    }
    var dt = Math.min(40, t - lastT);
    lastT = t;
    tickMovement(t, dt);
    tickExpressions(t);
    requestAnimationFrame(loop);
  }

  async function loadModel() {
    if (modelReady || modelLoading) return;
    modelLoading = true;
    setPower("booting");
    setStatus("給電中…（初回はモデル取得）");
    try {
      var mod = await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
      var CreateMLCEngine = mod.CreateMLCEngine;
      var lastErr = null;
      for (var mi = 0; mi < MODEL_CANDIDATES.length; mi++) {
        var mid = MODEL_CANDIDATES[mi];
        try {
          setStatus("給電中: " + mid);
          engine = await CreateMLCEngine(mid, {
            initProgressCallback: function (p) {
              if (p && typeof p.progress === "number") setStatus("給電 " + Math.round(p.progress * 100) + "%");
              else if (p && p.text) setStatus(String(p.text).slice(0, 48));
            }
          });
          modelReady = true;
          modelLoading = false;
          setPower("on");
          setMood("happy");
          setStatus("オンライン — 話しかけてね");
          appendMessage("system", "電源ON（" + mid + "）。ツールの操作もできるよ。");
          setTimeout(function () { setMood("idle"); }, 2000);
          return;
        } catch (err) {
          lastErr = err;
          console.warn("[G5 Resident]", mid, err);
        }
      }
      throw lastErr || new Error("all models failed");
    } catch (e) {
      modelLoading = false;
      setPower("on");
      setMood("error");
      setStatus("モデル給電失敗（移動・基本操作は可能）");
      appendMessage("system", "LLMは起きなかったけど、サイトの中は歩き回れてツールも触れるよ。");
      console.error(e);
    }
  }

  function buildSystemPrompt() {
    var list = Object.keys(TOOLS).map(function (k) { return "- " + k + ": " + TOOLS[k].label; }).join("\n");
    var here = currentToolKey();
    return "あなたは「G⁵住民」。G⁵ Portalに住むエージェント。日本語で短く親しみやすく。\n" +
      "今いるページのツールキー: " + (here || "home") + "\n" +
      "役割: 案内・ツール起動・ツール操作・雑談。\nツール:\n" + list + "\n" +
      "アクション（返答末尾に1行だけ）:\n" +
      "[ACTION:open:キー] ページを開く\n" +
      "[ACTION:use:キー:op] または [ACTION:use:キー:op:値] そのツールを操作\n" +
      "op例: generate / start / reset / roll / fill\n" +
      "例: [ACTION:use:qr-code:fill:https://example.com]\n" +
      "例: [ACTION:use:qr-code:generate]\n" +
      "例: [ACTION:use:timer:start]\n" +
      "通常返答では ACTION を書かない。";
  }

  async function sendUserMessage() {
    var input = document.getElementById("g5r-input");
    var sendBtn = document.getElementById("g5r-send");
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    lastInteract = performance.now();
    appendMessage("user", text);
    messages.push({ role: "user", content: text });
    if (messages.length > CHAT_HISTORY_LIMIT) messages = messages.slice(-CHAT_HISTORY_LIMIT);
    if (!modelReady) {
      appendMessage("assistant", "まだ給電中だよ。少し待ってね。キーワードでツール操作もできるよ。");
      handleFallback(text);
      return;
    }
    sendBtn.disabled = true;
    setMood("thinking");
    setStatus("考え中…");
    try {
      var reply = await engine.chat.completions.create({
        messages: [{ role: "system", content: buildSystemPrompt() }].concat(messages),
        temperature: 0.7,
        max_tokens: 240
      });
      var content = (reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content || "").trim() || "…もう一回？";
      var actions = [];
      var re = /\[ACTION:([^\]]+)\]/gi, m;
      while ((m = re.exec(content))) actions.push(m[1].trim());
      var clean = content.replace(/\[ACTION:[^\]]+\]/gi, "").trim() || "了解！";
      appendMessage("assistant", clean);
      messages.push({ role: "assistant", content: clean });
      for (var ai = 0; ai < actions.length; ai++) runActionString(actions[ai]);
      setMood("talking");
      setTimeout(function () { setMood(chatOpen ? "curious" : "idle"); }, 1600);
      setStatus("オンライン");
    } catch (e) {
      appendMessage("assistant", "調子が悪いみたい。もう一度試してね。");
      setMood("error");
      setStatus("エラー");
    } finally {
      sendBtn.disabled = false;
    }
  }

  function handleFallback(text) {
    var t = text.toLowerCase();
    var keys = Object.keys(TOOLS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i], info = TOOLS[key];
      if (t.indexOf(key) >= 0 || t.indexOf(info.label) >= 0) {
        if (/生成|つくって|作って|generate|スタート|開始|振|roll/.test(t)) {
          appendMessage("assistant", info.label + " を操作するね！");
          runActionString("use:" + key + ":generate");
        } else {
          appendMessage("assistant", info.label + " を開くね！");
          runActionString("open:" + key);
        }
        return;
      }
    }
    if (/案内|何ができる|ツール|ヘルプ|help/.test(t)) {
      appendMessage("assistant", "QR生成・タイマー開始・画面シェアなど、ツールを自分で触れるよ。名前を言ってね！");
    }
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

  function runActionString(raw) {
    var parts = raw.split(":");
    var kind = (parts[0] || "").toLowerCase();
    if (kind === "open") { executeOpen(parts[1]); return; }
    if (kind === "use") {
      var key = (parts[1] || "").toLowerCase();
      var op = (parts[2] || "generate").toLowerCase();
      var val = parts.slice(3).join(":") || "";
      executeUse(key, op, val);
      return;
    }
    if (TOOLS[kind]) executeOpen(kind);
  }

  function executeOpen(key) {
    var tool = TOOLS[key];
    if (!tool) { appendMessage("system", "未知のツール: " + key); return; }
    setMood("excited");
    appendMessage("system", "→ " + tool.label + " へ移動…");
    setTimeout(function () { location.href = resolveToolUrl(tool.path); }, 500);
  }

  function executeUse(key, op, val) {
    var tool = TOOLS[key];
    if (!tool) { appendMessage("system", "未知: " + key); return; }
    var here = currentToolKey();
    var payload = { key: key, op: op, val: val, ts: Date.now() };
    if (here === key) {
      applyToolOp(key, op, val);
      appendMessage("system", "ツール操作: " + tool.label + " / " + op);
      setMood("excited");
      return;
    }
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload)); } catch (e) {}
    setMood("excited");
    appendMessage("system", "→ " + tool.label + " で " + op + " するよ…");
    setTimeout(function () { location.href = resolveToolUrl(tool.path); }, 500);
  }

  function applyToolOp(key, op, val) {
    var ops = TOOL_OPS[key];
    if (!ops) return;
    try {
      if (op === "fill" && typeof ops.fill === "function") {
        ops.fill({ text: val });
        if (typeof ops.generate === "function" && key === "qr-code") {
          setTimeout(function () { ops.generate(); }, 200);
        }
      } else if (op === "generate" && typeof ops.generate === "function") {
        ops.generate();
      } else if (op === "start" && typeof ops.start === "function") {
        ops.start();
      } else if (op === "reset" && typeof ops.reset === "function") {
        ops.reset();
      } else if (op === "roll" && typeof ops.roll === "function") {
        ops.roll();
      } else if (typeof ops[op] === "function") {
        ops[op]({ text: val });
      } else if (typeof ops.generate === "function") {
        ops.generate();
      }
    } catch (e) {
      console.warn("[G5 Resident] tool op failed", key, op, e);
    }
  }

  function consumePendingAction() {
    var raw = null;
    try { raw = sessionStorage.getItem(PENDING_KEY); } catch (e) {}
    if (!raw) return;
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
    var payload = null;
    try { payload = JSON.parse(raw); } catch (e) { return; }
    if (!payload || !payload.key) return;
    if (Date.now() - (payload.ts || 0) > 60000) return;
    var here = currentToolKey();
    if (here !== payload.key) return;
    setTimeout(function () {
      applyToolOp(payload.key, payload.op || "generate", payload.val || "");
      appendMessage("system", "到着したのでツールを操作したよ（" + payload.op + "）");
      setMood("happy");
    }, 700);
  }

  async function boot() {
    injectStyles();
    await createAgent();
    createChatPanel();
    setPower("off");
    setStatus("給電準備…");
    requestAnimationFrame(loop);
    setTimeout(function () {
      if (!modelReady && !modelLoading) {
        setPower("booting");
        loadModel();
      }
    }, 400);
    setTimeout(function () {
      if (powerState === "off" || powerState === "booting") {
        vel.x = (Math.random() - 0.5) * 0.2;
        vel.y = (Math.random() - 0.5) * 0.12;
      }
    }, 1200);
    consumePendingAction();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
