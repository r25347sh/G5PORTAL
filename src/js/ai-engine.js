/**
 * G⁵ Portal — Autonomous AI Life Engine
 * Free site roam (incl. off-screen), eat DOM elements, sleep, walk with SVG swap
 */
(function () {
  "use strict";
  if (window.__G5_AI_ENGINE__) return;
  window.__G5_AI_ENGINE__ = true;

  var MODEL_IDS = [
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"
  ];

  var PIVOTS_FRONT = {
    head: { cx: 32, cy: 42 },
    "left-arm": { cx: 22, cy: 48 },
    "right-arm": { cx: 42, cy: 48 },
    "left-leg": { cx: 24, cy: 85 },
    "right-leg": { cx: 40, cy: 85 }
  };
  var PIVOTS_SIDE = {
    head: { cx: 32, cy: 42 },
    "left-arm": { cx: 32, cy: 48 },
    "right-arm": { cx: 32, cy: 48 },
    "left-leg": { cx: 32, cy: 85 },
    "right-leg": { cx: 32, cy: 85 }
  };

  var JOINT_IDS = ["head", "left-arm", "right-arm", "left-leg", "right-leg"];
  var AGENT_W = 72;
  var AGENT_H = 144;
  var OFFSCREEN_MARGIN = 180;

  var desire = {
    hunger: 8 + Math.random() * 12,
    fatigue: 5 + Math.random() * 10,
    boredom: 6 + Math.random() * 12,
    energy: 15 + Math.random() * 10
  };

  var pose = { head: 0, "left-arm": 0, "right-arm": 0, "left-leg": 0, "right-leg": 0 };
  var targetPose = { head: 0, "left-arm": 0, "right-arm": 0, "left-leg": 0, "right-leg": 0 };

  var engine = null, modelReady = false, modelLoading = false;
  var currentAction = "idle";
  var actionUntil = 0;
  var svgMode = "front";
  var svgRoot = null, agentHost = null;
  var thinking = false, lifeTick = 0;
  var pos = { x: 80, y: 120 };
  var vel = { x: 0, y: 0 };
  var walkDir = 1;
  var interest = null;
  var eatProgress = 0;
  var sleepZ = 0;
  var thoughtEl = null, thoughtTimer = null;
  var cachedFood = [];
  var lastFoodScan = 0;
  var walkTarget = null;
  var walkArriveCb = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function siteSize() {
    var de = document.documentElement, b = document.body;
    return {
      w: Math.max(de.scrollWidth, b ? b.scrollWidth : 0, window.innerWidth),
      h: Math.max(de.scrollHeight, b ? b.scrollHeight : 0, window.innerHeight)
    };
  }

  function basePath() {
    return location.pathname.indexOf("/pages/") >= 0 ? "../../character/" : "character/";
  }

  function injectStyles() {
    if (document.getElementById("g5-ai-engine-css")) return;
    var css = [
      "#g5-ai-agent{position:absolute;z-index:99980;width:" + AGENT_W + "px;height:" + AGENT_H + "px;",
      "pointer-events:none;user-select:none;overflow:visible;",
      "filter:drop-shadow(0 6px 14px rgba(0,0,0,.4));will-change:left,top,transform}",
      "#g5-ai-agent.flip{transform:scaleX(-1)}",
      "#g5-ai-agent svg{width:100%;height:100%;overflow:visible;display:block}",
      "#g5-ai-thought{position:absolute;z-index:99981;max-width:200px;padding:6px 10px;",
      "font-size:11px;line-height:1.35;background:rgba(20,18,28,.92);color:#e8e0d0;",
      "border:1px solid rgba(246,211,101,.35);border-radius:10px;",
      "pointer-events:none;opacity:0;transition:opacity .3s;font-family:system-ui,sans-serif}",
      "#g5-ai-thought.show{opacity:1}",
      ".g5-food-target{outline:2px dashed rgba(246,211,101,.55)!important;outline-offset:3px;",
      "transition:outline .3s,opacity .6s,transform .5s}",
      ".g5-being-eaten{animation:g5-chomp .45s ease;opacity:.35!important;transform:scale(.85)!important}",
      "@keyframes g5-chomp{0%{transform:scale(1)}40%{transform:scale(.7) rotate(-3deg)}100%{transform:scale(.85)}}",
      ".g5-eaten-gone{opacity:0!important;transform:scale(0)!important;pointer-events:none!important;",
      "transition:opacity .8s,transform .8s}"
    ].join("");
    var s = document.createElement("style");
    s.id = "g5-ai-engine-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  async function loadSvgText(name) {
    var res = await fetch(basePath() + name);
    if (!res.ok) throw new Error(name);
    return res.text();
  }

  async function mountAgent() {
    agentHost = document.createElement("div");
    agentHost.id = "g5-ai-agent";
    document.body.appendChild(agentHost);
    await switchSvg("front");
    var site = siteSize();
    pos.x = Math.max(20, Math.min(site.w - AGENT_W - 20, site.w * 0.7));
    pos.y = Math.max(40, Math.min(site.h - AGENT_H - 20, site.h * 0.25));
    applyHostPos();
  }

  async function switchSvg(mode) {
    if (svgMode === mode && svgRoot) return;
    var file = mode === "side" ? "walking1.svg" : "residents1.svg";
    try {
      var text = await loadSvgText(file);
      var doc = new DOMParser().parseFromString(text, "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg) return;
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      while (agentHost.firstChild) agentHost.removeChild(agentHost.firstChild);
      agentHost.appendChild(document.importNode(svg, true));
      svgRoot = agentHost.querySelector("svg");
      svgMode = mode;
      for (var i = 0; i < JOINT_IDS.length; i++) {
        pose[JOINT_IDS[i]] = 0;
        targetPose[JOINT_IDS[i]] = 0;
        applyJoint(JOINT_IDS[i], 0);
      }
    } catch (e) {
      console.warn("[G5 AI] svg switch", mode, e);
    }
  }

  function pivots() {
    return svgMode === "side" ? PIVOTS_SIDE : PIVOTS_FRONT;
  }

  function applyJoint(id, degrees) {
    if (!svgRoot) return;
    var el = svgRoot.getElementById(id);
    if (!el) return;
    var p = pivots()[id];
    if (!p) return;
    el.setAttribute("transform", "rotate(" + degrees.toFixed(2) + ", " + p.cx + ", " + p.cy + ")");
  }

  function renderPose() {
    for (var i = 0; i < JOINT_IDS.length; i++) {
      var id = JOINT_IDS[i];
      pose[id] += (targetPose[id] - pose[id]) * 0.14;
      applyJoint(id, pose[id]);
    }
  }

  function setTargetPose(next) {
    if (!next) return;
    for (var i = 0; i < JOINT_IDS.length; i++) {
      var id = JOINT_IDS[i];
      if (typeof next[id] === "number") targetPose[id] = clamp(next[id], -55, 55);
    }
  }

  function applyHostPos() {
    if (!agentHost) return;
    agentHost.style.left = pos.x + "px";
    agentHost.style.top = pos.y + "px";
    if (walkDir < 0) agentHost.classList.add("flip");
    else agentHost.classList.remove("flip");
  }

  function tickDesires() {
    desire.hunger = clamp(desire.hunger + 1.2, 0, 100);
    desire.fatigue = clamp(desire.fatigue + 0.55, 0, 100);
    desire.boredom = clamp(desire.boredom + 0.9, 0, 100);
    desire.energy = clamp(desire.energy - 0.45, 0, 100);

    if (currentAction === "eating") {
      desire.hunger = clamp(desire.hunger - 10, 0, 100);
      desire.energy = clamp(desire.energy + 3, 0, 100);
      desire.boredom = clamp(desire.boredom - 1, 0, 100);
    } else if (currentAction === "sleeping") {
      desire.fatigue = clamp(desire.fatigue - 7, 0, 100);
      desire.energy = clamp(desire.energy + 6, 0, 100);
      desire.hunger = clamp(desire.hunger + 0.4, 0, 100);
    } else if (currentAction === "slacking") {
      desire.boredom = clamp(desire.boredom - 6, 0, 100);
      desire.fatigue = clamp(desire.fatigue + 0.3, 0, 100);
    } else if (currentAction === "walking") {
      desire.energy = clamp(desire.energy - 1.5, 0, 100);
      desire.boredom = clamp(desire.boredom - 2, 0, 100);
      desire.fatigue = clamp(desire.fatigue + 1.0, 0, 100);
    }
  }

  function poseForAction(action, t) {
    var s = Math.sin(t * 0.014);
    var s2 = Math.sin(t * 0.014 + Math.PI);
    switch (action) {
      case "eating":
        return {
          head: 12 + Math.sin(t * 0.03) * 6,
          "left-arm": -30 + Math.sin(t * 0.04) * 14,
          "right-arm": 12,
          "left-leg": 2,
          "right-leg": -2
        };
      case "sleeping":
        return {
          head: 22,
          "left-arm": -12,
          "right-arm": 14,
          "left-leg": 8,
          "right-leg": -6
        };
      case "slacking":
        return {
          head: -8,
          "left-arm": 6,
          "right-arm": 32 + Math.sin(t * 0.02) * 8,
          "left-leg": 3,
          "right-leg": -3
        };
      case "walking":
        return {
          head: s * 4,
          "left-arm": s2 * 16,
          "right-arm": s * 16,
          "left-leg": s * 20,
          "right-leg": s2 * 20
        };
      default:
        return {
          head: Math.sin(t * 0.003) * 2.5,
          "left-arm": -5 + Math.sin(t * 0.004) * 4,
          "right-arm": 5 + Math.sin(t * 0.004 + 1.2) * 4,
          "left-leg": 0,
          "right-leg": 0
        };
    }
  }

  function elDocRect(el) {
    var r = el.getBoundingClientRect();
    var sx = window.scrollX || window.pageXOffset || 0;
    var sy = window.scrollY || window.pageYOffset || 0;
    return {
      left: r.left + sx, top: r.top + sy,
      width: r.width, height: r.height,
      cx: r.left + sx + r.width / 2,
      cy: r.top + sy + r.height / 2
    };
  }

  function scanFood() {
    var now = performance.now();
    if (now - lastFoodScan < 4000 && cachedFood.length) return cachedFood;
    lastFoodScan = now;
    var nodes = document.querySelectorAll(
      ".card, .tool-card, .btn-primary, .btn-ghost, .hero-badge, h2, h3, .card-icon"
    );
    cachedFood = [];
    for (var i = 0; i < nodes.length && cachedFood.length < 28; i++) {
      var el = nodes[i];
      if (el.classList.contains("g5-eaten-gone")) continue;
      var r = elDocRect(el);
      if (r.width < 12 || r.height < 10) continue;
      cachedFood.push({ el: el, r: r });
    }
    return cachedFood;
  }

  function pickFood() {
    var list = scanFood();
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function beginEating() {
    interest = pickFood();
    if (!interest) {
      currentAction = "idle";
      showThought("食べるものがない…");
      return;
    }
    interest.el.classList.add("g5-food-target");
    eatProgress = 0;
    showThought("あれ、食べよう");
    var tx = interest.r.cx - AGENT_W / 2;
    var ty = interest.r.cy - AGENT_H * 0.55;
    startWalkTo(tx, ty, function () {
      currentAction = "eating";
      actionUntil = performance.now() + 5000 + Math.random() * 3000;
      switchSvg("front");
      showThought("もぐもぐ…");
    });
  }

  function chompFood() {
    if (!interest || !interest.el) return;
    var el = interest.el;
    el.classList.remove("g5-food-target");
    el.classList.add("g5-being-eaten");
    setTimeout(function () {
      el.classList.remove("g5-being-eaten");
      el.classList.add("g5-eaten-gone");
    }, 500);
    desire.hunger = clamp(desire.hunger - 25, 0, 100);
    desire.energy = clamp(desire.energy + 8, 0, 100);
    showThought("おいしい…");
    interest = null;
    cachedFood = [];
  }

  function startWalkTo(x, y, cb) {
    walkTarget = { x: x, y: y };
    walkArriveCb = cb || null;
    currentAction = "walking";
    actionUntil = performance.now() + 20000;
    walkDir = (x >= pos.x) ? 1 : -1;
    switchSvg("side");
  }

  function startRandomWalk() {
    var site = siteSize();
    var x = -OFFSCREEN_MARGIN + Math.random() * (site.w + OFFSCREEN_MARGIN * 2 - AGENT_W);
    var y = -OFFSCREEN_MARGIN * 0.5 + Math.random() * (site.h + OFFSCREEN_MARGIN - AGENT_H);
    startWalkTo(x, y, function () {
      currentAction = "idle";
      actionUntil = performance.now() + 2000;
      switchSvg("front");
      showThought("着いた");
    });
    showThought(["ぶらぶら", "あっち行こう", "散歩", "ふらふら"][Math.floor(Math.random() * 4)]);
  }

  function beginSleep() {
    currentAction = "sleeping";
    actionUntil = performance.now() + 10000 + Math.random() * 8000;
    switchSvg("front");
    showThought("おやすみ…");
    sleepZ = 0;
  }

  function beginSlack() {
    currentAction = "slacking";
    actionUntil = performance.now() + 6000 + Math.random() * 4000;
    switchSvg("front");
    showThought("ちょっとサボる");
  }

  function softClampPos() {
    var site = siteSize();
    var minX = -OFFSCREEN_MARGIN;
    var maxX = site.w + OFFSCREEN_MARGIN - AGENT_W * 0.3;
    var minY = -OFFSCREEN_MARGIN * 0.4;
    var maxY = site.h + OFFSCREEN_MARGIN * 0.6 - AGENT_H * 0.3;
    if (pos.x < minX) { pos.x = minX; vel.x = Math.abs(vel.x); }
    if (pos.x > maxX) { pos.x = maxX; vel.x = -Math.abs(vel.x); }
    if (pos.y < minY) { pos.y = minY; vel.y = Math.abs(vel.y); }
    if (pos.y > maxY) { pos.y = maxY; vel.y = -Math.abs(vel.y); }
  }

  function maybeScrollFollow() {
    var sy = window.scrollY || 0;
    var midY = pos.y + AGENT_H / 2;
    var margin = 80;
    if (midY < sy + margin) {
      window.scrollTo({ top: Math.max(0, midY - window.innerHeight * 0.35), behavior: "smooth" });
    } else if (midY > sy + window.innerHeight - margin) {
      window.scrollTo({ top: midY - window.innerHeight * 0.55, behavior: "smooth" });
    }
  }

  function tickMovement(t) {
    if (currentAction === "walking" && walkTarget) {
      var dx = walkTarget.x - pos.x;
      var dy = walkTarget.y - pos.y;
      var dist = Math.hypot(dx, dy);
      if (dist < 14) {
        walkTarget = null;
        var cb = walkArriveCb;
        walkArriveCb = null;
        if (cb) cb();
        else {
          currentAction = "idle";
          switchSvg("front");
        }
      } else {
        var spd = 1.8;
        vel.x = (dx / dist) * spd;
        vel.y = (dy / dist) * spd;
        walkDir = vel.x >= 0 ? 1 : -1;
        pos.x += vel.x;
        pos.y += vel.y;
        if (Math.random() < 0.02) maybeScrollFollow();
      }
    } else if (currentAction === "sleeping") {
      vel.x *= 0.8;
      vel.y *= 0.8;
      pos.x += vel.x * 0.1;
      pos.y += vel.y * 0.1;
      sleepZ++;
      if (sleepZ % 90 === 0) showThought("z…");
    } else if (currentAction === "eating") {
      vel.x *= 0.85;
      vel.y *= 0.85;
      eatProgress++;
      if (eatProgress === 40) chompFood();
    } else {
      if (Math.random() < 0.006) {
        vel.x += (Math.random() - 0.5) * 0.3;
        vel.y += (Math.random() - 0.5) * 0.2;
      }
      vel.x *= 0.97;
      vel.y *= 0.97;
      pos.x += vel.x;
      pos.y += vel.y;
    }

    softClampPos();
    applyHostPos();
    setTargetPose(poseForAction(currentAction, t));
  }

  function showThought(text) {
    if (!text) return;
    if (!thoughtEl) {
      thoughtEl = document.createElement("div");
      thoughtEl.id = "g5-ai-thought";
      document.body.appendChild(thoughtEl);
    }
    thoughtEl.textContent = text;
    thoughtEl.style.left = (pos.x + AGENT_W * 0.55) + "px";
    thoughtEl.style.top = (pos.y - 28) + "px";
    thoughtEl.classList.add("show");
    clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(function () {
      if (thoughtEl) thoughtEl.classList.remove("show");
    }, 3500);
  }

  async function initWebLLM() {
    if (modelReady || modelLoading) return;
    modelLoading = true;
    try {
      var mod = await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
      var CreateMLCEngine = mod.CreateMLCEngine;
      var lastErr = null;
      for (var i = 0; i < MODEL_IDS.length; i++) {
        try {
          engine = await CreateMLCEngine(MODEL_IDS[i], { initProgressCallback: function () {} });
          modelReady = true;
          modelLoading = false;
          return;
        } catch (err) { lastErr = err; }
      }
      throw lastErr || new Error("fail");
    } catch (e) {
      modelLoading = false;
      console.warn("[G5 AI] rule-based only", e);
    }
  }

  var SYSTEM_PROMPT =
    "You control a character on a website. Reply ONLY with valid JSON:\n" +
    '{"thought":"short","action":"eating|sleeping|slacking|walking|idle"}\n' +
    "Prefer eating when hunger high, sleep when fatigue high or energy low, " +
    "walking/slacking when boredom high. No markdown.";

  function parseJsonLoose(text) {
    if (!text) return null;
    var a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
  }

  async function lifeCycleDecide() {
    if (thinking) return;
    if (performance.now() < actionUntil) return;
    thinking = true;
    lifeTick++;

    var context = {
      desire: {
        hunger: Math.round(desire.hunger),
        fatigue: Math.round(desire.fatigue),
        boredom: Math.round(desire.boredom),
        energy: Math.round(desire.energy)
      },
      lastAction: currentAction,
      foodAround: scanFood().length
    };

    var decided = null;
    if (modelReady && engine) {
      try {
        var reply = await engine.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(context) + "\nDecide next action JSON only." }
          ],
          temperature: 0.75,
          max_tokens: 80
        });
        var raw = (reply.choices && reply.choices[0] && reply.choices[0].message &&
          reply.choices[0].message.content) || "";
        decided = parseJsonLoose(raw);
      } catch (e) {}
    }
    if (!decided) decided = ruleBased(context.desire);
    applyDecision(decided);
    thinking = false;
  }

  function ruleBased(d) {
    if (d.hunger >= 55) return { thought: "お腹すいた", action: "eating" };
    if (d.fatigue >= 60 || d.energy <= 18) return { thought: "眠い…", action: "sleeping" };
    if (d.boredom >= 50) {
      return Math.random() < 0.45
        ? { thought: "サボりたい", action: "slacking" }
        : { thought: "歩こう", action: "walking" };
    }
    if (d.energy > 45 && Math.random() < 0.4) return { thought: "散歩", action: "walking" };
    return { thought: "ぼーっと", action: "idle" };
  }

  function applyDecision(dec) {
    if (!dec) return;
    if (dec.thought) showThought(String(dec.thought).slice(0, 60));
    var act = (dec.action || "idle").toLowerCase();
    if (["eating", "sleeping", "slacking", "walking", "idle"].indexOf(act) < 0) act = "idle";

    if (act === "eating") beginEating();
    else if (act === "sleeping") beginSleep();
    else if (act === "slacking") beginSlack();
    else if (act === "walking") startRandomWalk();
    else {
      currentAction = "idle";
      actionUntil = performance.now() + 3000 + Math.random() * 3000;
      switchSvg("front");
    }
  }

  function startLoops() {
    setInterval(tickDesires, 2800);
    setInterval(function () {
      if (!document.hidden) lifeCycleDecide();
    }, 10000);

    function frame(t) {
      if (!document.hidden) {
        tickMovement(t);
        renderPose();
        if (thoughtEl && thoughtEl.classList.contains("show")) {
          thoughtEl.style.left = (pos.x + AGENT_W * 0.55) + "px";
          thoughtEl.style.top = (pos.y - 28) + "px";
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    setTimeout(function () { lifeCycleDecide(); }, 2000);
  }

  async function boot() {
    injectStyles();
    await mountAgent();
    startLoops();
    initWebLLM();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
