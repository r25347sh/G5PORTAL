/**
 * G⁵ Portal — Site Resident (WebLLM-powered)
 * Living agent: patrols, inspects, eats/pulls elements, sleeps, reacts.
 * Loading = powered-off machine. Performance-conscious.
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

  const TOOLS = {
    "multiquiz": { label: "MultiQuiz", path: "pages/multiquiz/index.html", desc: "多形式クイズ" },
    "char-count": { label: "文字数カウント", path: "pages/char-count/index.html", desc: "文字・単語・行集計" },
    "char-magnifier": { label: "文字拡大鏡", path: "pages/char-magnifier/index.html", desc: "文字拡大表示" },
    "password-gen": { label: "パスワード生成", path: "pages/password-gen/index.html", desc: "安全なパスワード生成" },
    "crypto": { label: "暗号化・復号", path: "pages/crypto/index.html", desc: "AES-GCM暗号化" },
    "qr-code": { label: "QRコード", path: "pages/qr-code/index.html", desc: "QR作成・読取" },
    "timer": { label: "タイマー/SW", path: "pages/timer/index.html", desc: "タイマー・ストップウォッチ" },
    "random": { label: "コイン/サイコロ/抽選", path: "pages/random/index.html", desc: "乱数ツール" },
    "color-picker": { label: "カラーピッカー", path: "pages/color-picker/index.html", desc: "色選択・スポイト" },
    "screen-share": { label: "画面シェア", path: "pages/screen-share/index.html", desc: "WebRTC画面共有" },
    "file-share": { label: "ファイル共有", path: "pages/file-share/index.html", desc: "WebRTCファイル転送" },
    "clock": { label: "デジタル時計", path: "pages/clock/index.html", desc: "高精度時計" },
    "materials": { label: "副教材", path: "pages/materials/index.html", desc: "PDF教材" },
    "home": { label: "トップ", path: "index.html", desc: "ポータルホーム" }
  };

  function detectBase() {
    if (window.__G5_BASE__ != null) return window.__G5_BASE__ || ".";
    if (window.G5 && window.G5.BASE) return window.G5.BASE;
    const path = location.pathname;
    if (path.indexOf("/G5PORTAL") >= 0) {
      const i = path.indexOf("/G5PORTAL");
      return path.slice(0, i + "/G5PORTAL".length).replace(/\/$/, "") || "/G5PORTAL";
    }
    if (path.includes("/pages/")) return path.replace(/\/pages\/[^/]+\/[^/]*$/, "") || ".";
    if (path.endsWith(".html")) return path.replace(/\/[^/]+$/, "") || ".";
    return path.replace(/\/$/, "") || ".";
  }
  const BASE = detectBase();
  function svgUrl() {
    if (location.pathname.includes("/pages/")) return "../../character/residents1.svg";
    const b = BASE.replace(/\/$/, "");
    return (b && b !== ".") ? b + "/character/residents1.svg" : "character/residents1.svg";
  }

  let engine = null, modelReady = false, modelLoading = false;
  let chatOpen = false, messages = [];
  let agentEl = null, svgRoot = null, chatPanel = null;
  let pos = { x: 40, y: 140 }, vel = { x: 0, y: 0 };
  let target = null, mood = "off", powerState = "off";
  let lastCardScan = 0, lastInteract = 0;
  let isDragging = false, dragOffset = { x: 0, y: 0 };
  let mouse = { x: -999, y: -999 };
  let cachedCards = [], interest = null;
  let behavior = "wander", behaviorUntil = 0;
  let tabHidden = false, dragMoved = false;

  function injectStyles() {
    if (document.getElementById("g5-resident-styles")) return;
    const css = `#g5-resident-agent{position:fixed;z-index:99980;width:${AGENT_SIZE}px;height:${AGENT_SIZE}px;cursor:grab;user-select:none;touch-action:none;will-change:transform,filter,opacity;transition:filter .4s ease,opacity .6s ease}#g5-resident-agent.off{opacity:.35;filter:grayscale(.85) brightness(.55) drop-shadow(0 2px 6px rgba(0,0,0,.4))}#g5-resident-agent.booting{opacity:.7;filter:grayscale(.4) brightness(.8) drop-shadow(0 0 10px rgba(255,213,79,.5))}#g5-resident-agent.on{opacity:1;filter:drop-shadow(0 4px 14px rgba(0,131,143,.5))}#g5-resident-agent.on:hover{filter:drop-shadow(0 6px 20px rgba(38,198,218,.75))}#g5-resident-agent.dragging{cursor:grabbing}#g5-resident-agent svg{width:100%;height:100%;overflow:visible;pointer-events:none}#g5-resident-badge{position:absolute;top:-5px;right:-5px;width:12px;height:12px;border-radius:50%;border:2px solid #0d1b2a;opacity:0;transition:opacity .3s,background .3s}#g5-resident-agent.off #g5-resident-badge{opacity:1;background:#546e7a}#g5-resident-agent.booting #g5-resident-badge{opacity:1;background:#ffd54f;animation:g5r-pulse 1.1s infinite}#g5-resident-agent.on #g5-resident-badge{opacity:1;background:#26c6da}@keyframes g5r-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.65}}#g5-resident-chat{position:fixed;z-index:99990;width:min(340px,calc(100vw - 20px));max-height:min(440px,68vh);background:linear-gradient(165deg,#0d1b2a,#1b263b 55%,#0a1628);border:1px solid rgba(38,198,218,.32);border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:scale(.94) translateY(10px);transition:opacity .22s ease,transform .22s ease;font-family:system-ui,-apple-system,sans-serif;color:#e0f7fa}#g5-resident-chat.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}#g5-resident-chat .g5r-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(0,131,143,.22);border-bottom:1px solid rgba(38,198,218,.18);font-size:.88rem;font-weight:600}#g5-resident-chat .g5r-header button{background:0;border:0;color:#80deea;font-size:1.15rem;cursor:pointer;line-height:1}#g5-resident-chat .g5r-messages{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px;font-size:.82rem;line-height:1.4}#g5-resident-chat .g5r-msg{max-width:92%;padding:7px 11px;border-radius:11px;word-break:break-word}#g5-resident-chat .g5r-msg.user{align-self:flex-end;background:rgba(38,198,218,.2);border:1px solid rgba(38,198,218,.28)}#g5-resident-chat .g5r-msg.assistant{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07)}#g5-resident-chat .g5r-msg.system{align-self:center;font-size:.72rem;color:#80deea;opacity:.85;border:0;background:0}#g5-resident-chat .g5r-input-row{display:flex;gap:7px;padding:9px 11px;border-top:1px solid rgba(38,198,218,.14);background:rgba(0,0,0,.18)}#g5-resident-chat .g5r-input-row input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(38,198,218,.22);border-radius:9px;padding:7px 11px;color:#e0f7fa;font-size:.88rem;outline:0}#g5-resident-chat .g5r-input-row input:focus{border-color:#26c6da}#g5-resident-chat .g5r-input-row button{background:linear-gradient(135deg,#00838f,#26c6da);border:0;border-radius:9px;color:#fff;padding:7px 12px;font-weight:600;cursor:pointer;font-size:.82rem}#g5-resident-chat .g5r-input-row button:disabled{opacity:.45;cursor:not-allowed}#g5-resident-chat .g5r-status{padding:3px 11px 7px;font-size:.7rem;color:#80deea;opacity:.8}.g5r-nibble{animation:g5r-nibble .55s ease}@keyframes g5r-nibble{0%{transform:scale(1)}35%{transform:scale(.92)}70%{transform:scale(1.04)}100%{transform:scale(1)}}.g5r-pulling{transition:transform .4s cubic-bezier(.2,.8,.3,1)!important}`;
    const s = document.createElement("style");
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
    const badge = document.createElement("div");
    badge.id = "g5-resident-badge";
    agentEl.appendChild(badge);
    document.body.appendChild(agentEl);
    try {
      const res = await fetch(svgUrl());
      if (!res.ok) throw new Error("svg");
      const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) throw new Error("no root");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.removeAttribute("id");
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
    dragOffset.x = e.clientX - pos.x; dragOffset.y = e.clientY - pos.y;
    agentEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    const nx = Math.max(0, Math.min(window.innerWidth - AGENT_SIZE, e.clientX - dragOffset.x));
    const ny = Math.max(0, Math.min(window.innerHeight - AGENT_SIZE, e.clientY - dragOffset.y));
    if (Math.abs(nx - pos.x) + Math.abs(ny - pos.y) > 4) dragMoved = true;
    pos.x = nx; pos.y = ny; applyPos(); vel.x = 0; vel.y = 0;
  }
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    agentEl.classList.remove("dragging");
    try { agentEl.releasePointerCapture(e.pointerId); } catch (_) {}
    if (dragMoved) { vel.x = (Math.random() - 0.5) * 0.8; vel.y = (Math.random() - 0.5) * 0.8; }
  }
  function onResize() {
    pos.x = Math.max(0, Math.min(window.innerWidth - AGENT_SIZE, pos.x));
    pos.y = Math.max(0, Math.min(window.innerHeight - AGENT_SIZE, pos.y));
    applyPos(); if (chatOpen) positionChat();
  }
  function onAgentClick(e) {
    if (dragMoved) return;
    lastInteract = performance.now();
    if (powerState === "off") {
      if (!modelLoading && !modelReady) { setPower("booting"); loadModel(); }
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
    const r = agentEl.getBoundingClientRect();
    const cw = chatPanel.offsetWidth || 320, ch = chatPanel.offsetHeight || 340;
    let left = r.left + r.width / 2 - cw / 2, top = r.top - ch - 10;
    if (top < 6) top = r.bottom + 10;
    if (left < 6) left = 6;
    if (left + cw > window.innerWidth - 6) left = window.innerWidth - cw - 6;
    if (top + ch > window.innerHeight - 6) top = window.innerHeight - ch - 6;
    chatPanel.style.left = left + "px"; chatPanel.style.top = top + "px";
  }
  function setChatOpen(open) {
    chatOpen = open;
    if (open) {
      chatPanel.classList.add("open"); positionChat(); setMood("curious");
      document.getElementById("g5r-input").focus();
      if (!modelReady && !modelLoading) { setPower("booting"); loadModel(); }
    } else {
      chatPanel.classList.remove("open");
      if (powerState === "on") setMood("idle");
    }
  }
  function toggleChat() { setChatOpen(!chatOpen); }
  function appendMessage(role, text) {
    const box = document.getElementById("g5r-messages");
    if (!box) return;
    const d = document.createElement("div");
    d.className = "g5r-msg " + role; d.textContent = text;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  function setStatus(t) {
    const el = document.getElementById("g5r-status");
    if (el) el.textContent = t;
  }

  function setMood(m) {
    mood = m;
    if (!svgRoot) return;
    const $ = function (id) { return svgRoot.getElementById(id); };
    const leftArm = $("arm-left-group"), rightArm = $("arm-right-group");
    const mouth = $("agent-mouth"), browL = $("brow-left"), browR = $("brow-right");
    const pupilL = $("pupil-left"), pupilR = $("pupil-right");
    const antenna = $("antenna-tip"), wave = $("antenna-wave"), core = $("agent-core");
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
        if (pupilL) pupilL.setAttribute("cy", "7.3"); if (pupilR) pupilR.setAttribute("cy", "7.3");
        if (antenna) antenna.setAttribute("fill", "#607d8b"); if (wave) wave.setAttribute("opacity", "0");
        if (core) core.setAttribute("opacity", "0.55"); break;
      case "booting":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.35 Q 8 9.2 8.6 9.35");
        if (antenna) antenna.setAttribute("fill", "#ffd54f"); if (wave) wave.setAttribute("opacity", "0.6"); break;
      case "happy":
        if (mouth) mouth.setAttribute("d", "M 7.1 9.0 Q 8 10.15 8.9 9.0");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-22 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(22 11 8)"); break;
      case "thinking":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.4 Q 8 9.25 8.6 9.4");
        if (pupilL) { pupilL.setAttribute("cx", "6.7"); pupilL.setAttribute("cy", "6.85"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.5"); pupilR.setAttribute("cy", "6.85"); }
        if (wave) wave.setAttribute("opacity", "0.9"); if (antenna) antenna.setAttribute("fill", "#80DEEA");
        if (leftArm) leftArm.setAttribute("transform", "rotate(12 5 8)"); break;
      case "talking":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.1 Q 8 9.85 8.8 9.1"); if (wave) wave.setAttribute("opacity", "1"); break;
      case "curious":
        if (mouth) mouth.setAttribute("d", "M 7.5 9.25 Q 8 9.45 8.5 9.25");
        if (pupilL) { pupilL.setAttribute("cx", "6.85"); pupilL.setAttribute("cy", "7.0"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.55"); pupilR.setAttribute("cy", "7.0"); }
        if (browL) { browL.setAttribute("y1", "5.85"); browL.setAttribute("y2", "6.25"); }
        if (browR) { browR.setAttribute("y1", "5.85"); browR.setAttribute("y2", "6.25"); } break;
      case "excited":
        if (mouth) mouth.setAttribute("d", "M 7.0 8.85 Q 8 10.3 9.0 8.85");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-38 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(38 11 8)");
        if (antenna) antenna.setAttribute("fill", "#FFD54F"); if (wave) wave.setAttribute("opacity", "1"); break;
      case "sleepy":
        if (mouth) mouth.setAttribute("d", "M 7.3 9.35 Q 8 9.5 8.7 9.35");
        if (pupilL) pupilL.setAttribute("cy", "7.35"); if (pupilR) pupilR.setAttribute("cy", "7.35");
        if (browL) { browL.setAttribute("y1", "6.5"); browL.setAttribute("y2", "6.35"); }
        if (browR) { browR.setAttribute("y1", "6.5"); browR.setAttribute("y2", "6.35"); } break;
      case "error":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.5 Q 8 9.0 8.8 9.5");
        if (browL) { browL.setAttribute("y1", "6.55"); browL.setAttribute("y2", "5.95"); }
        if (browR) { browR.setAttribute("y1", "6.55"); browR.setAttribute("y2", "5.95"); }
        if (antenna) antenna.setAttribute("fill", "#EF5350"); break;
      default: break;
    }
  }

  function tickExpressions(t) {
    if (!svgRoot || powerState === "off") return;
    const $ = function (id) { return svgRoot.getElementById(id); };
    const shields = $("layer-shields"), pulse = $("aura-pulse");
    const speed = powerState === "booting" ? 0.006 : 0.014;
    if (shields) shields.setAttribute("transform", "rotate(" + ((t * speed) % 360) + " 8 8)");
    if (pulse && powerState === "on") {
      const s = 1 + 0.07 * Math.sin(t * 0.0035);
      pulse.setAttribute("r", String(5 * s));
      pulse.setAttribute("opacity", String(0.3 + 0.18 * Math.sin(t * 0.0028)));
    }
    if (powerState === "on") {
      for (let i = 1; i <= 4; i++) {
        const p = $("particle-" + i); if (!p) continue;
        const base = (i - 1) * (Math.PI / 2), r = 5.2 + (i % 2) * 1.1;
        p.setAttribute("cx", (8 + Math.cos(t * 0.0012 + base) * r).toFixed(2));
        p.setAttribute("cy", (8 + Math.sin(t * 0.0012 + base) * r).toFixed(2));
      }
    }
    if ((mood === "idle" || mood === "curious") && powerState === "on") {
      const pupilL = $("pupil-left"), pupilR = $("pupil-right");
      if (pupilL && pupilR) {
        const ax = pos.x + AGENT_SIZE / 2, ay = pos.y + AGENT_SIZE / 2;
        const dx = mouse.x - ax, dy = mouse.y - ay, dist = Math.hypot(dx, dy);
        if (dist < 280 && dist > 8) {
          const lookX = Math.max(-0.35, Math.min(0.35, dx / 180));
          const lookY = Math.max(-0.25, Math.min(0.25, dy / 180));
          pupilL.setAttribute("cx", (6.5 + lookX).toFixed(2)); pupilL.setAttribute("cy", (7.1 + lookY).toFixed(2));
          pupilR.setAttribute("cx", (9.3 + lookX).toFixed(2)); pupilR.setAttribute("cy", (7.1 + lookY).toFixed(2));
        }
      }
    }
    if (mood === "talking") {
      const mouth = $("agent-mouth");
      if (mouth) {
        const open = 9.15 + 0.45 * Math.abs(Math.sin(t * 0.022));
        mouth.setAttribute("d", "M 7.2 9.1 Q 8 " + open.toFixed(2) + " 8.8 9.1");
      }
    }
    if (powerState === "booting") {
      const core = $("agent-core");
      if (core) core.setAttribute("opacity", String(0.5 + 0.45 * Math.abs(Math.sin(t * 0.004))));
    }
  }

  function scanCards() {
    const now = performance.now();
    if (now - lastCardScan < CARD_CACHE_MS) return cachedCards;
    lastCardScan = now;
    const nodes = document.querySelectorAll(".card, .tool-card, .hero, .btn-primary, .section-header, footer");
    cachedCards = [];
    for (let i = 0; i < nodes.length && cachedCards.length < 24; i++) {
      const el = nodes[i], r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 12) continue;
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
      cachedCards.push({ el: el, r: r });
    }
    return cachedCards;
  }

  function pickInterest() {
    const cards = scanCards();
    if (!cards.length) return null;
    if (mouse.x > 0) {
      let best = null, bestD = 1e9;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i], cx = c.r.left + c.r.width / 2, cy = c.r.top + c.r.height / 2;
        const d = Math.hypot(cx - mouse.x, cy - mouse.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best && bestD < 220) return best;
    }
    return cards[Math.floor(Math.random() * cards.length)];
  }

  function startBehavior(name, durationMs) {
    behavior = name; behaviorUntil = performance.now() + durationMs;
  }

  function decideNextBehavior(t) {
    if (t < behaviorUntil) return;
    if (powerState !== "on" || isDragging || chatOpen) { behavior = "rest"; return; }
    const idleLong = t - lastInteract > 28000;
    const r = Math.random();
    if (idleLong && r < 0.35) { startBehavior("sleep", 6000 + Math.random() * 8000); setMood("sleepy"); return; }
    if (r < 0.28) {
      interest = pickInterest();
      if (interest) { startBehavior("inspect", 3500 + Math.random() * 4000); setMood("curious"); return; }
    }
    if (r < 0.42) {
      interest = pickInterest();
      if (interest && Math.random() < 0.55) { startBehavior("nibble", 1800); setMood("excited"); return; }
      if (interest) { startBehavior("pull", 2200); setMood("curious"); return; }
    }
    if (r < 0.55) { startBehavior("rest", 2500 + Math.random() * 3000); setMood("idle"); return; }
    startBehavior("wander", 4000 + Math.random() * 5000);
    setMood(Math.random() < 0.3 ? "curious" : "idle");
    target = { x: 16 + Math.random() * (window.innerWidth - AGENT_SIZE - 32), y: 50 + Math.random() * (window.innerHeight - AGENT_SIZE - 80) };
  }

  function nibbleCard() {
    if (!interest || !interest.el) return;
    const el = interest.el;
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
    const el = interest.el, r = el.getBoundingClientRect();
    const ax = pos.x + AGENT_SIZE / 2, ay = pos.y + AGENT_SIZE / 2;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = ax - cx, dy = ay - cy, dist = Math.hypot(dx, dy) || 1;
    const strength = Math.min(MAX_PULL, 120 / dist * 10);
    const ox = (dx / dist) * strength, oy = (dy / dist) * strength;
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
      vel.x *= 0.9; vel.y *= 0.9; pos.x += vel.x * 0.15; pos.y += vel.y * 0.15; applyPos(); return;
    }
    if (powerState === "booting") { pos.y += Math.sin(t * 0.002) * 0.15; applyPos(); return; }
    if (chatOpen) { vel.x *= 0.92; vel.y *= 0.92; pos.x += vel.x; pos.y += vel.y; applyPos(); return; }
    decideNextBehavior(t);
    if (behavior === "sleep") {
      vel.x *= 0.85; vel.y *= 0.85; pos.x += vel.x * 0.2; pos.y += vel.y * 0.2;
    } else if (behavior === "inspect" && interest) {
      const r = interest.el.getBoundingClientRect();
      const tx = r.left + r.width * 0.7 - AGENT_SIZE / 2, ty = r.top - AGENT_SIZE - 6;
      const dx = tx - pos.x, dy = ty - pos.y, dist = Math.hypot(dx, dy);
      if (dist > 6) { vel.x = (dx / dist) * 1.35; vel.y = (dy / dist) * 1.35; } else { vel.x *= 0.7; vel.y *= 0.7; }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "nibble" && interest) {
      const r = interest.el.getBoundingClientRect();
      const tx = r.left + r.width / 2 - AGENT_SIZE / 2, ty = r.top + r.height / 2 - AGENT_SIZE / 2;
      const dx = tx - pos.x, dy = ty - pos.y, dist = Math.hypot(dx, dy);
      if (dist > 10) { vel.x = (dx / dist) * 2.1; vel.y = (dy / dist) * 2.1; }
      else { nibbleCard(); startBehavior("rest", 1200); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "pull" && interest) {
      const r = interest.el.getBoundingClientRect();
      const tx = r.left - AGENT_SIZE - 8, ty = r.top + r.height / 2 - AGENT_SIZE / 2;
      const dx = tx - pos.x, dy = ty - pos.y, dist = Math.hypot(dx, dy);
      if (dist > 12) { vel.x = (dx / dist) * 1.6; vel.y = (dy / dist) * 1.6; }
      else { pullCard(); startBehavior("rest", 1400); setMood("happy"); }
      pos.x += vel.x; pos.y += vel.y;
    } else if (behavior === "wander" && target) {
      const dx = target.x - pos.x, dy = target.y - pos.y, dist = Math.hypot(dx, dy);
      if (dist < 10) { target = null; vel.x *= 0.4; vel.y *= 0.4; }
      else { vel.x = (dx / dist) * 1.25; vel.y = (dy / dist) * 1.25; }
      pos.x += vel.x; pos.y += vel.y;
    } else {
      if (Math.random() < 0.01) { vel.x += (Math.random() - 0.5) * 0.4; vel.y += (Math.random() - 0.5) * 0.4; }
      vel.x *= 0.97; vel.y *= 0.97; pos.x += vel.x; pos.y += vel.y;
    }
    if (pos.x < 4) { pos.x = 4; vel.x = Math.abs(vel.x) * 0.6; }
    if (pos.x > window.innerWidth - AGENT_SIZE - 4) { pos.x = window.innerWidth - AGENT_SIZE - 4; vel.x = -Math.abs(vel.x) * 0.6; }
    if (pos.y < 4) { pos.y = 4; vel.y = Math.abs(vel.y) * 0.6; }
    if (pos.y > window.innerHeight - AGENT_SIZE - 4) { pos.y = window.innerHeight - AGENT_SIZE - 4; vel.y = -Math.abs(vel.y) * 0.6; }
    applyPos();
  }

  let lastT = performance.now(), frameSkip = 0;
  function loop(t) {
    if (tabHidden) { requestAnimationFrame(loop); return; }
    if (powerState === "off") {
      frameSkip++; if (frameSkip % 3 !== 0) { requestAnimationFrame(loop); return; }
    }
    const dt = Math.min(40, t - lastT); lastT = t;
    tickMovement(t, dt); tickExpressions(t);
    requestAnimationFrame(loop);
  }

  async function loadModel() {
    if (modelReady || modelLoading) return;
    modelLoading = true; setPower("booting"); setStatus("起動中…（初回はモデル取得があります）");
    try {
      const mod = await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
      const CreateMLCEngine = mod.CreateMLCEngine;
      let lastErr = null;
      for (let mi = 0; mi < MODEL_CANDIDATES.length; mi++) {
        const mid = MODEL_CANDIDATES[mi];
        try {
          setStatus("起動中: " + mid);
          engine = await CreateMLCEngine(mid, {
            initProgressCallback: function (p) {
              if (p && typeof p.progress === "number") setStatus("起動 " + Math.round(p.progress * 100) + "%");
              else if (p && p.text) setStatus(String(p.text).slice(0, 48));
            }
          });
          modelReady = true; modelLoading = false; setPower("on"); setMood("happy");
          setStatus("オンライン — 話しかけてね");
          appendMessage("system", "電源ON（" + mid + "）。案内やツール起動ができるよ。");
          setTimeout(function () { setMood("idle"); }, 2000);
          return;
        } catch (err) { lastErr = err; console.warn("[G5 Resident]", mid, err); }
      }
      throw lastErr || new Error("all models failed");
    } catch (e) {
      modelLoading = false; setPower("on"); setMood("error");
      setStatus("モデル起動失敗（移動・基本案内は可能）");
      appendMessage("system", "LLMを起動できなかったけど、サイトの中は歩き回れるよ。");
      console.error(e);
    }
  }

  function buildSystemPrompt() {
    const list = Object.keys(TOOLS).map(function (k) { return "- " + k + ": " + TOOLS[k].label; }).join("\n");
    return "あなたは「G⁵住民」。G⁵ Portalに住む明るいエージェント。日本語で短く親しみやすく。\n役割: サイト案内・ツール起動・雑談。\nツール:\n" + list + "\nツールを開くときは返答末尾に [ACTION:open:キー] を1行だけ付ける。例: [ACTION:open:qr-code]\n通常返答では ACTION を書かない。";
  }

  async function sendUserMessage() {
    const input = document.getElementById("g5r-input");
    const sendBtn = document.getElementById("g5r-send");
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = ""; lastInteract = performance.now();
    appendMessage("user", text);
    messages.push({ role: "user", content: text });
    if (messages.length > CHAT_HISTORY_LIMIT) messages = messages.slice(-CHAT_HISTORY_LIMIT);
    if (!modelReady) {
      appendMessage("assistant", "まだ起動中だよ。少し待ってね。または「QRを開きたい」など言ってくれれば案内するよ。");
      handleFallback(text); return;
    }
    sendBtn.disabled = true; setMood("thinking"); setStatus("考え中…");
    try {
      const reply = await engine.chat.completions.create({
        messages: [{ role: "system", content: buildSystemPrompt() }].concat(messages),
        temperature: 0.7, max_tokens: 220
      });
      let content = (reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content || "").trim() || "…もう一回言って？";
      const actionMatch = content.match(/\[ACTION:open:([a-z0-9-]+)\]/i);
      let clean = content.replace(/\[ACTION:open:[a-z0-9-]+\]/gi, "").trim() || "了解！";
      appendMessage("assistant", clean);
      messages.push({ role: "assistant", content: clean });
      if (actionMatch) executeAction(actionMatch[1].toLowerCase());
      setMood("talking");
      setTimeout(function () { setMood(chatOpen ? "curious" : "idle"); }, 1600);
      setStatus("オンライン");
    } catch (e) {
      appendMessage("assistant", "ちょっと調子が悪いみたい。もう一度試してね。");
      setMood("error"); setStatus("エラー");
    } finally { sendBtn.disabled = false; }
  }

  function handleFallback(text) {
    const t = text.toLowerCase();
    const keys = Object.keys(TOOLS);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i], info = TOOLS[key];
      if (t.indexOf(key) >= 0 || t.indexOf(info.label) >= 0) {
        appendMessage("assistant", info.label + " を開くね！"); executeAction(key); return;
      }
    }
    if (/案内|何ができる|ツール|ヘルプ|help/.test(t)) {
      appendMessage("assistant", "QR・タイマー・画面シェア・MultiQuiz などあるよ。名前を言ってね！");
    }
  }

  function resolveToolUrl(toolPath) {
    const base = (window.G5 && window.G5.BASE) ? String(window.G5.BASE).replace(/\/$/, "") : BASE.replace(/\/$/, "");
    const inPages = location.pathname.indexOf("/pages/") >= 0;
    if (toolPath === "index.html" || !toolPath) {
      if (inPages) return "../../index.html";
      return (base && base !== ".") ? base + "/index.html" : "index.html";
    }
    if (inPages) return "../../" + toolPath;
    return (base && base !== ".") ? base + "/" + toolPath : toolPath;
  }

  function executeAction(key) {
    const tool = TOOLS[key];
    if (!tool) { appendMessage("system", "未知: " + key); return; }
    setMood("excited");
    appendMessage("system", "→ " + tool.label + " へ…");
    setTimeout(function () { location.href = resolveToolUrl(tool.path); }, 550);
  }

  async function boot() {
    injectStyles();
    await createAgent();
    createChatPanel();
    setPower("off");
    setStatus("電源オフ — クリックで起動");
    requestAnimationFrame(loop);
    setTimeout(function () {
      if (powerState === "off") {
        vel.x = (Math.random() - 0.5) * 0.15;
        vel.y = (Math.random() - 0.5) * 0.1;
      }
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
