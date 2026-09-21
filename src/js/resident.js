/**
 * G⁵ Portal — Site Resident (WebLLM-powered autonomous agent)
 * Uses character/residents1.svg with full ID-driven life.
 * HTML changes: script src only.
 * Model target: 0.5B–1.5B (Qwen2.5-0.5B preferred).
 */
(function () {
  "use strict";
  if (window.__G5_RESIDENT_BOOTED__) return;
  window.__G5_RESIDENT_BOOTED__ = true;

  // ─── Config ───────────────────────────────────────────────────────────────
  const MODEL_CANDIDATES = [
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    "SmolLM2-360M-Instruct-q4f16_1-MLC",
    "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  ];
  const PREFERRED_MODEL = MODEL_CANDIDATES[0];
  const AGENT_SIZE = 72;
  const MOVE_SPEED = 1.8;
  const CHAT_HISTORY_LIMIT = 12;

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
    if (path.includes("/pages/")) {
      return path.replace(/\/pages\/[^/]+\/[^/]*$/, "") || ".";
    }
    if (path.endsWith(".html")) {
      return path.replace(/\/[^/]+$/, "") || ".";
    }
    return path.replace(/\/$/, "") || ".";
  }

  const BASE = detectBase();
  function svgUrl() {
    if (location.pathname.includes("/pages/")) return "../../character/residents1.svg";
    const b = BASE.replace(/\/$/, "");
    if (b && b !== ".") return b + "/character/residents1.svg";
    return "character/residents1.svg";
  }
  const SVG_URL = svgUrl();

  let engine = null;
  let modelReady = false;
  let modelLoading = false;
  let chatOpen = false;
  let messages = [];
  let agentEl = null;
  let svgRoot = null;
  let chatPanel = null;
  let pos = { x: 40, y: 120 };
  let vel = { x: 0.6, y: 0.4 };
  let target = null;
  let mood = "idle";
  let lastAutonomous = 0;
  let animFrame = 0;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function injectStyles() {
    if (document.getElementById("g5-resident-styles")) return;
    const css = `#g5-resident-agent{position:fixed;z-index:99980;width:${AGENT_SIZE}px;height:${AGENT_SIZE}px;cursor:grab;user-select:none;touch-action:none;filter:drop-shadow(0 4px 12px rgba(0,131,143,.45));transition:filter .3s ease;will-change:transform}#g5-resident-agent:hover{filter:drop-shadow(0 6px 18px rgba(38,198,218,.7))}#g5-resident-agent.dragging{cursor:grabbing}#g5-resident-agent svg{width:100%;height:100%;overflow:visible;pointer-events:none}#g5-resident-chat{position:fixed;z-index:99990;width:min(360px,calc(100vw - 24px));max-height:min(480px,70vh);background:linear-gradient(165deg,#0d1b2a 0%,#1b263b 60%,#0a1628 100%);border:1px solid rgba(38,198,218,.35);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:scale(.92) translateY(12px);transition:opacity .25s ease,transform .25s ease;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#e0f7fa}#g5-resident-chat.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}#g5-resident-chat .g5r-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,131,143,.25);border-bottom:1px solid rgba(38,198,218,.2);font-size:.9rem;font-weight:600}#g5-resident-chat .g5r-header button{background:transparent;border:none;color:#80deea;font-size:1.2rem;cursor:pointer;padding:0 4px;line-height:1}#g5-resident-chat .g5r-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:.85rem;line-height:1.45}#g5-resident-chat .g5r-msg{max-width:92%;padding:8px 12px;border-radius:12px;word-break:break-word}#g5-resident-chat .g5r-msg.user{align-self:flex-end;background:rgba(38,198,218,.22);border:1px solid rgba(38,198,218,.3)}#g5-resident-chat .g5r-msg.assistant{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}#g5-resident-chat .g5r-msg.system{align-self:center;font-size:.75rem;color:#80deea;background:transparent;border:none;opacity:.85}#g5-resident-chat .g5r-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(38,198,218,.15);background:rgba(0,0,0,.2)}#g5-resident-chat .g5r-input-row input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(38,198,218,.25);border-radius:10px;padding:8px 12px;color:#e0f7fa;font-size:.9rem;outline:none}#g5-resident-chat .g5r-input-row input:focus{border-color:#26c6da}#g5-resident-chat .g5r-input-row button{background:linear-gradient(135deg,#00838f,#26c6da);border:none;border-radius:10px;color:#fff;padding:8px 14px;font-weight:600;cursor:pointer;font-size:.85rem}#g5-resident-chat .g5r-input-row button:disabled{opacity:.5;cursor:not-allowed}#g5-resident-chat .g5r-status{padding:4px 12px 8px;font-size:.72rem;color:#80deea;opacity:.8}#g5-resident-badge{position:absolute;top:-6px;right:-6px;width:14px;height:14px;border-radius:50%;background:#26c6da;border:2px solid #0d1b2a;opacity:0;transition:opacity .3s}#g5-resident-agent.ready #g5-resident-badge{opacity:1}#g5-resident-agent.loading #g5-resident-badge{opacity:1;background:#ffd54f;animation:g5r-pulse 1s infinite}@keyframes g5r-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`;
    const style = document.createElement("style");
    style.id = "g5-resident-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  async function createAgent() {
    agentEl = document.createElement("div");
    agentEl.id = "g5-resident-agent";
    agentEl.setAttribute("role", "button");
    agentEl.setAttribute("aria-label", "G⁵住民 — クリックで会話");
    agentEl.title = "G⁵住民（クリックで会話 / ドラッグで移動）";
    const badge = document.createElement("div");
    badge.id = "g5-resident-badge";
    agentEl.appendChild(badge);
    document.body.appendChild(agentEl);
    try {
      const res = await fetch(SVG_URL);
      if (!res.ok) throw new Error("SVG fetch failed");
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) throw new Error("No SVG root");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.removeAttribute("id");
      agentEl.appendChild(svg);
      svgRoot = svg;
    } catch (e) {
      console.warn("[G5 Resident] SVG load failed", e);
      agentEl.innerHTML = '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#4dd0e1,#006064);display:flex;align-items:center;justify-content:center;font-size:28px;">◈</div>';
    }
    pos.x = Math.min(window.innerWidth - AGENT_SIZE - 20, Math.max(20, window.innerWidth * 0.75));
    pos.y = Math.min(window.innerHeight - AGENT_SIZE - 80, Math.max(80, window.innerHeight * 0.55));
    applyPos();
    agentEl.addEventListener("pointerdown", onPointerDown);
    agentEl.addEventListener("click", onAgentClick);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);
  }

  function applyPos() {
    if (!agentEl) return;
    agentEl.style.left = pos.x + "px";
    agentEl.style.top = pos.y + "px";
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isDragging = true;
    agentEl.classList.add("dragging");
    dragOffset.x = e.clientX - pos.x;
    dragOffset.y = e.clientY - pos.y;
    agentEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    pos.x = Math.max(0, Math.min(window.innerWidth - AGENT_SIZE, e.clientX - dragOffset.x));
    pos.y = Math.max(0, Math.min(window.innerHeight - AGENT_SIZE, e.clientY - dragOffset.y));
    applyPos();
    vel.x = 0; vel.y = 0;
  }
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    agentEl.classList.remove("dragging");
    try { agentEl.releasePointerCapture(e.pointerId); } catch (_) {}
    vel.x = (Math.random() - 0.5) * 1.2;
    vel.y = (Math.random() - 0.5) * 1.2;
  }
  function onResize() {
    pos.x = Math.max(0, Math.min(window.innerWidth - AGENT_SIZE, pos.x));
    pos.y = Math.max(0, Math.min(window.innerHeight - AGENT_SIZE, pos.y));
    applyPos();
    if (chatOpen) positionChat();
  }
  function onAgentClick(e) {
    if (isDragging) return;
    toggleChat();
  }

  function createChatPanel() {
    chatPanel = document.createElement("div");
    chatPanel.id = "g5-resident-chat";
    chatPanel.innerHTML = '<div class="g5r-header"><span>◈ G⁵住民</span><button type="button" aria-label="閉じる" id="g5r-close">×</button></div><div class="g5r-messages" id="g5r-messages"></div><div class="g5r-status" id="g5r-status">モデル準備中…</div><div class="g5r-input-row"><input type="text" id="g5r-input" placeholder="話しかけてみて…" autocomplete="off" /><button type="button" id="g5r-send">送信</button></div>';
    document.body.appendChild(chatPanel);
    document.getElementById("g5r-close").addEventListener("click", () => setChatOpen(false));
    document.getElementById("g5r-send").addEventListener("click", sendUserMessage);
    document.getElementById("g5r-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    });
  }

  function positionChat() {
    if (!chatPanel || !agentEl) return;
    const rect = agentEl.getBoundingClientRect();
    const cw = chatPanel.offsetWidth || 340;
    const ch = chatPanel.offsetHeight || 360;
    let left = rect.left + rect.width / 2 - cw / 2;
    let top = rect.top - ch - 12;
    if (top < 8) top = rect.bottom + 12;
    if (left < 8) left = 8;
    if (left + cw > window.innerWidth - 8) left = window.innerWidth - cw - 8;
    if (top + ch > window.innerHeight - 8) top = window.innerHeight - ch - 8;
    chatPanel.style.left = left + "px";
    chatPanel.style.top = top + "px";
  }

  function setChatOpen(open) {
    chatOpen = open;
    if (open) {
      chatPanel.classList.add("open");
      positionChat();
      setMood("curious");
      document.getElementById("g5r-input").focus();
      if (!modelReady && !modelLoading) loadModel();
    } else {
      chatPanel.classList.remove("open");
      setMood("idle");
    }
  }
  function toggleChat() { setChatOpen(!chatOpen); }

  function appendMessage(role, text) {
    const box = document.getElementById("g5r-messages");
    if (!box) return;
    const div = document.createElement("div");
    div.className = "g5r-msg " + role;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
  function setStatus(text) {
    const el = document.getElementById("g5r-status");
    if (el) el.textContent = text;
  }

  function setMood(m) {
    mood = m;
    if (!svgRoot) return;
    const $ = (id) => svgRoot.getElementById(id);
    const leftArm = $("arm-left-group");
    const rightArm = $("arm-right-group");
    const mouth = $("agent-mouth");
    const browL = $("brow-left");
    const browR = $("brow-right");
    const pupilL = $("pupil-left");
    const pupilR = $("pupil-right");
    const antenna = $("antenna-tip");
    const wave = $("antenna-wave");
    if (leftArm) leftArm.setAttribute("transform", "rotate(0 5 8)");
    if (rightArm) rightArm.setAttribute("transform", "rotate(0 11 8)");
    if (browL) { browL.setAttribute("y1", "6.2"); browL.setAttribute("y2", "6.2"); }
    if (browR) { browR.setAttribute("y1", "6.2"); browR.setAttribute("y2", "6.2"); }
    if (pupilL) { pupilL.setAttribute("cx", "6.5"); pupilL.setAttribute("cy", "7.1"); }
    if (pupilR) { pupilR.setAttribute("cx", "9.3"); pupilR.setAttribute("cy", "7.1"); }
    if (mouth) mouth.setAttribute("d", "M 7.3 9.2 Q 8 9.8 8.7 9.2");
    if (wave) wave.setAttribute("opacity", "0.3");
    if (antenna) antenna.setAttribute("fill", "#FFF59D");
    switch (m) {
      case "happy":
        if (mouth) mouth.setAttribute("d", "M 7.1 9.0 Q 8 10.2 8.9 9.0");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-25 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(25 11 8)");
        if (browL) { browL.setAttribute("y1", "5.9"); browL.setAttribute("y2", "6.1"); }
        if (browR) { browR.setAttribute("y1", "5.9"); browR.setAttribute("y2", "6.1"); }
        break;
      case "thinking":
        if (mouth) mouth.setAttribute("d", "M 7.4 9.4 Q 8 9.3 8.6 9.4");
        if (pupilL) { pupilL.setAttribute("cx", "6.7"); pupilL.setAttribute("cy", "6.9"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.5"); pupilR.setAttribute("cy", "6.9"); }
        if (wave) wave.setAttribute("opacity", "0.9");
        if (antenna) antenna.setAttribute("fill", "#80DEEA");
        if (leftArm) leftArm.setAttribute("transform", "rotate(15 5 8)");
        break;
      case "talking":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.1 Q 8 9.9 8.8 9.1");
        if (wave) wave.setAttribute("opacity", "1");
        break;
      case "curious":
        if (mouth) mouth.setAttribute("d", "M 7.5 9.3 Q 8 9.5 8.5 9.3");
        if (pupilL) { pupilL.setAttribute("cx", "6.8"); pupilL.setAttribute("cy", "7.0"); }
        if (pupilR) { pupilR.setAttribute("cx", "9.6"); pupilR.setAttribute("cy", "7.0"); }
        if (browL) { browL.setAttribute("y1", "5.8"); browL.setAttribute("y2", "6.3"); }
        if (browR) { browR.setAttribute("y1", "5.8"); browR.setAttribute("y2", "6.3"); }
        break;
      case "excited":
        if (mouth) mouth.setAttribute("d", "M 7.0 8.9 Q 8 10.4 9.0 8.9");
        if (leftArm) leftArm.setAttribute("transform", "rotate(-40 5 8)");
        if (rightArm) rightArm.setAttribute("transform", "rotate(40 11 8)");
        if (antenna) antenna.setAttribute("fill", "#FFD54F");
        if (wave) wave.setAttribute("opacity", "1");
        break;
      case "error":
        if (mouth) mouth.setAttribute("d", "M 7.2 9.5 Q 8 9.0 8.8 9.5");
        if (browL) { browL.setAttribute("y1", "6.5"); browL.setAttribute("y2", "6.0"); }
        if (browR) { browR.setAttribute("y1", "6.5"); browR.setAttribute("y2", "6.0"); }
        if (antenna) antenna.setAttribute("fill", "#EF5350");
        break;
      default: break;
    }
  }

  function tickExpressions(t) {
    if (!svgRoot) return;
    const $ = (id) => svgRoot.getElementById(id);
    const shields = $("layer-shields");
    const pulse = $("aura-pulse");
    if (shields) {
      const rot = (t * 0.015) % 360;
      shields.setAttribute("transform", `rotate(${rot} 8 8)}`);
    }
    if (pulse) {
      const s = 1 + 0.08 * Math.sin(t * 0.004);
      pulse.setAttribute("r", String(5 * s));
      pulse.setAttribute("opacity", String(0.35 + 0.2 * Math.sin(t * 0.003)));
    }
    for (let i = 1; i <= 4; i++) {
      const p = $("particle-" + i);
      if (!p) continue;
      const base = (i - 1) * (Math.PI / 2);
      const r = 5.5 + (i % 2) * 1.2;
      const cx = 8 + Math.cos(t * 0.0015 + base) * r;
      const cy = 8 + Math.sin(t * 0.0015 + base) * r;
      p.setAttribute("cx", cx.toFixed(2));
      p.setAttribute("cy", cy.toFixed(2));
    }
    if (mood === "idle" || mood === "curious") {
      const pupilL = $("pupil-left");
      const pupilR = $("pupil-right");
      if (pupilL && pupilR) {
        const look = Math.sin(t * 0.0008) * 0.25;
        pupilL.setAttribute("cx", (6.5 + look).toFixed(2));
        pupilR.setAttribute("cx", (9.3 + look).toFixed(2));
      }
    }
    if (mood === "talking") {
      const mouth = $("agent-mouth");
      if (mouth) {
        const open = 9.2 + 0.5 * Math.abs(Math.sin(t * 0.02));
        mouth.setAttribute("d", `M 7.2 9.1 Q 8 ${open.toFixed(1)} 8.8 9.1`);
      }
    }
  }

  function tickMovement(dt) {
    if (isDragging || chatOpen) return;
    if (!target || Math.random() < 0.003) {
      if (Math.random() < 0.4) {
        const cards = document.querySelectorAll(".card, .tool-card, .hero, .btn");
        if (cards.length) {
          const c = cards[Math.floor(Math.random() * cards.length)];
          const r = c.getBoundingClientRect();
          target = { x: r.left + r.width / 2 - AGENT_SIZE / 2 + (Math.random() - 0.5) * 40, y: r.top + r.height / 2 - AGENT_SIZE / 2 + (Math.random() - 0.5) * 30 };
        } else {
          target = { x: 20 + Math.random() * (window.innerWidth - AGENT_SIZE - 40), y: 60 + Math.random() * (window.innerHeight - AGENT_SIZE - 100) };
        }
      } else {
        target = null;
        vel.x = (Math.random() - 0.5) * MOVE_SPEED * 1.4;
        vel.y = (Math.random() - 0.5) * MOVE_SPEED * 1.4;
      }
    }
    if (target) {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) { target = null; vel.x *= 0.3; vel.y *= 0.3; }
      else { vel.x = (dx / dist) * MOVE_SPEED * 0.9; vel.y = (dy / dist) * MOVE_SPEED * 0.9; }
    }
    pos.x += vel.x;
    pos.y += vel.y;
    if (pos.x < 4) { pos.x = 4; vel.x = Math.abs(vel.x) * 0.8; }
    if (pos.x > window.innerWidth - AGENT_SIZE - 4) { pos.x = window.innerWidth - AGENT_SIZE - 4; vel.x = -Math.abs(vel.x) * 0.8; }
    if (pos.y < 4) { pos.y = 4; vel.y = Math.abs(vel.y) * 0.8; }
    if (pos.y > window.innerHeight - AGENT_SIZE - 4) { pos.y = window.innerHeight - AGENT_SIZE - 4; vel.y = -Math.abs(vel.y) * 0.8; }
    vel.x *= 0.998;
    vel.y *= 0.998;
    applyPos();
  }

  let lastT = performance.now();
  function loop(t) {
    animFrame = t;
    const dt = Math.min(32, t - lastT);
    lastT = t;
    tickMovement(dt);
    tickExpressions(t);
    if (!chatOpen && t - lastAutonomous > 8000 + Math.random() * 12000) {
      lastAutonomous = t;
      const moods = ["idle", "curious", "happy", "thinking"];
      setMood(moods[Math.floor(Math.random() * moods.length)]);
      setTimeout(() => { if (!chatOpen) setMood("idle"); }, 2500 + Math.random() * 2000);
    }
    requestAnimationFrame(loop);
  }

  async function loadModel() {
    if (modelReady || modelLoading) return;
    modelLoading = true;
    agentEl.classList.add("loading");
    setStatus("モデルを読み込み中…（初回は数百MBのダウンロードがあります）");
    try {
      const { CreateMLCEngine } = await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
      let lastErr = null;
      for (const mid of MODEL_CANDIDATES) {
        try {
          setStatus(`読み込み中: ${mid} …`);
          engine = await CreateMLCEngine(mid, {
            initProgressCallback: (p) => {
              if (p && typeof p.progress === "number") setStatus(`読み込み ${Math.round(p.progress * 100)}% — ${p.text || mid}`);
              else if (p && p.text) setStatus(p.text);
            }
          });
          modelReady = true;
          modelLoading = false;
          agentEl.classList.remove("loading");
          agentEl.classList.add("ready");
          setStatus("準備完了 — 話しかけてください");
          setMood("happy");
          appendMessage("system", `モデル ${mid} をロードしました。サイトの案内やツール実行ができます。`);
          return;
        } catch (err) {
          lastErr = err;
          console.warn("[G5 Resident] model failed", mid, err);
        }
      }
      throw lastErr || new Error("All models failed");
    } catch (e) {
      modelLoading = false;
      agentEl.classList.remove("loading");
      setStatus("モデル読み込みに失敗しました。オフラインまたはWebGPU非対応の可能性があります。");
      setMood("error");
      appendMessage("system", "LLMをロードできませんでした。会話は制限されますが、移動や基本案内は可能です。");
      console.error(e);
    }
  }

  function buildSystemPrompt() {
    const toolList = Object.entries(TOOLS).map(([k, v]) => `- ${k}: ${v.label}（${v.desc}）→ path=${v.path}`).join("\n");
    return `あなたは「G⁵住民」です。麗澤高校5年G組の無料ツールポータル「G⁵ Portal」に住む自律エージェントです。
性格: 明るく親切、少しお茶目。日本語で短く自然に話します。
役割:
1. サイトの案内（ツールの説明・使い方）
2. ユーザーの要望に応じてツールを開く（全権あり）
3. 雑談も歓迎

利用可能なツール一覧:
${toolList}

ツールを実行したいときは、返答の最後に必ず次の形式で1行書いてください（他の文の後でも可）:
[ACTION:open:ツールキー]
例: [ACTION:open:qr-code]
ホームに戻る: [ACTION:open:home]

アクション以外の通常の返答では [ACTION:...] を書かないでください。
短く、親しみやすく答えてください。`;
  }

  async function sendUserMessage() {
    const input = document.getElementById("g5r-input");
    const sendBtn = document.getElementById("g5r-send");
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    appendMessage("user", text);
    messages.push({ role: "user", content: text });
    if (messages.length > CHAT_HISTORY_LIMIT) messages = messages.slice(-CHAT_HISTORY_LIMIT);
    if (!modelReady) {
      appendMessage("assistant", "まだモデルの準備ができていません。少々お待ちを… または「QRコードを開きたい」など具体的に言ってくれれば基本案内はできます。");
      handleFallback(text);
      return;
    }
    sendBtn.disabled = true;
    setMood("thinking");
    setStatus("考え中…");
    try {
      const sys = { role: "system", content: buildSystemPrompt() };
      const history = [sys, ...messages];
      const reply = await engine.chat.completions.create({ messages: history, temperature: 0.7, max_tokens: 256 });
      let content = (reply.choices?.[0]?.message?.content || "").trim();
      if (!content) content = "…うまく言葉が出ませんでした。もう一度聞いてくれる？";
      const actionMatch = content.match(/\[ACTION:open:([a-z0-9-]+)\]/i);
      let clean = content.replace(/\[ACTION:open:[a-z0-9-]+\]/gi, "").trim();
      if (!clean) clean = "了解！開くね。";
      appendMessage("assistant", clean);
      messages.push({ role: "assistant", content: clean });
      if (actionMatch) {
        const key = actionMatch[1].toLowerCase();
        executeAction(key);
      }
      setMood("talking");
      setTimeout(() => setMood(chatOpen ? "curious" : "idle"), 1800);
      setStatus("準備完了");
    } catch (e) {
      console.error(e);
      appendMessage("assistant", "すみません、少し調子が悪いみたい。もう一度試してね。");
      setMood("error");
      setStatus("エラーが発生しました");
    } finally {
      sendBtn.disabled = false;
    }
  }

  function handleFallback(text) {
    const t = text.toLowerCase();
    for (const [key, info] of Object.entries(TOOLS)) {
      if (t.includes(key) || t.includes(info.label) || (info.desc && t.includes(info.desc.slice(0, 4)))) {
        appendMessage("assistant", `${info.label} を開くね！`);
        executeAction(key);
        return;
      }
    }
    if (/案内|何ができる|ツール|使い方|help|ヘルプ/.test(t)) {
      appendMessage("assistant", "文字数カウント、QR、タイマー、画面シェア、MultiQuiz などいろいろあるよ。知りたいツール名を言ってね！");
    }
  }

  function resolveToolUrl(toolPath) {
    const base = (window.G5 && window.G5.BASE) ? String(window.G5.BASE).replace(/\/$/, "") : BASE.replace(/\/$/, "");
    const inPages = location.pathname.indexOf("/pages/") >= 0;
    if (toolPath === "index.html" || toolPath === "" || toolPath === "/") {
      if (inPages) return "../../index.html";
      if (base && base !== ".") return base + "/index.html";
      return "index.html";
    }
    if (inPages) return "../../" + toolPath;
    if (base && base !== ".") return base + "/" + toolPath;
    return toolPath;
  }

  function executeAction(key) {
    const tool = TOOLS[key];
    if (!tool) {
      appendMessage("system", `未知のツール: ${key}`);
      return;
    }
    setMood("excited");
    const url = resolveToolUrl(tool.path);
    appendMessage("system", `→ ${tool.label} へ移動します…`);
    setTimeout(() => { location.href = url; }, 600);
  }

  async function boot() {
    injectStyles();
    await createAgent();
    createChatPanel();
    setMood("idle");
    requestAnimationFrame(loop);
    setTimeout(() => {
      if (!chatOpen) {
        setMood("curious");
        setTimeout(() => setMood("idle"), 2000);
      }
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
