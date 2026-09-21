/**
 * G⁵ Portal — Autonomous AI Life Engine
 * Desire meters + WebLLM (Qwen) + 64×128 SVG joint animation
 */
(function () {
  "use strict";
  if (window.__G5_AI_ENGINE__) return;
  window.__G5_AI_ENGINE__ = true;

  var MODEL_IDS = [
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"
  ];

  var PIVOTS = {
    head: { cx: 32, cy: 42 },
    "left-arm": { cx: 22, cy: 48 },
    "right-arm": { cx: 42, cy: 48 },
    "left-leg": { cx: 24, cy: 85 },
    "right-leg": { cx: 40, cy: 85 }
  };

  var JOINT_IDS = ["head", "left-arm", "right-arm", "left-leg", "right-leg"];

  var desire = {
    hunger: 5 + Math.random() * 10,
    fatigue: 3 + Math.random() * 8,
    boredom: 4 + Math.random() * 10,
    energy: 12 + Math.random() * 8
  };

  var pose = {
    head: 0,
    "left-arm": 0,
    "right-arm": 0,
    "left-leg": 0,
    "right-leg": 0
  };

  var targetPose = {
    head: 0,
    "left-arm": 0,
    "right-arm": 0,
    "left-leg": 0,
    "right-leg": 0
  };

  var engine = null;
  var modelReady = false;
  var modelLoading = false;
  var currentAction = "idle";
  var lastThought = "";
  var walkPhase = 0;
  var lifeTick = 0;
  var svgRoot = null;
  var agentHost = null;
  var thinking = false;
  var pos = { x: 40, y: 80 };
  var vel = { x: 0, y: 0 };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function svgPath() {
    var path = location.pathname;
    if (path.indexOf("/pages/") >= 0) return "../../character/residents1.svg";
    return "character/residents1.svg";
  }

  function injectStyles() {
    if (document.getElementById("g5-ai-engine-css")) return;
    var css = [
      "#g5-ai-agent{position:fixed;z-index:99980;width:72px;height:144px;",
      "pointer-events:none;user-select:none;overflow:visible;",
      "filter:drop-shadow(0 4px 12px rgba(0,0,0,.35));",
      "transition:opacity .4s ease}",
      "#g5-ai-agent svg{width:100%;height:100%;overflow:visible;display:block}",
      "#g5-ai-thought{position:fixed;z-index:99981;max-width:200px;padding:6px 10px;",
      "font-size:11px;line-height:1.35;background:rgba(20,18,28,.9);color:#e8e0d0;",
      "border:1px solid rgba(246,211,101,.35);border-radius:10px;",
      "pointer-events:none;opacity:0;transition:opacity .3s ease;",
      "font-family:system-ui,sans-serif}",
      "#g5-ai-thought.show{opacity:1}"
    ].join("");
    var s = document.createElement("style");
    s.id = "g5-ai-engine-css";
    s.textContent = css;
    document.head.appendChild(s);
  }

  async function mountSvg() {
    agentHost = document.createElement("div");
    agentHost.id = "g5-ai-agent";
    document.body.appendChild(agentHost);
    try {
      var res = await fetch(svgPath());
      if (!res.ok) throw new Error("svg fetch");
      var text = await res.text();
      var doc = new DOMParser().parseFromString(text, "image/svg+xml");
      var svg = doc.querySelector("svg");
      if (!svg) throw new Error("no svg");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      agentHost.appendChild(document.importNode(svg, true));
      svgRoot = agentHost.querySelector("svg");
    } catch (e) {
      console.warn("[G5 AI Engine] SVG load failed", e);
    }
    pos.x = Math.max(16, window.innerWidth * 0.75 - 36);
    pos.y = Math.max(40, window.innerHeight * 0.45 - 72);
    applyHostPos();
  }

  function applyHostPos() {
    if (!agentHost) return;
    agentHost.style.left = pos.x + "px";
    agentHost.style.top = pos.y + "px";
  }

  function applyJoint(id, degrees) {
    if (!svgRoot) return;
    var el = svgRoot.getElementById(id);
    if (!el) return;
    var p = PIVOTS[id];
    if (!p) return;
    el.setAttribute("transform", "rotate(" + degrees.toFixed(2) + ", " + p.cx + ", " + p.cy + ")");
  }

  function renderPose() {
    for (var i = 0; i < JOINT_IDS.length; i++) {
      var id = JOINT_IDS[i];
      pose[id] += (targetPose[id] - pose[id]) * 0.12;
      applyJoint(id, pose[id]);
    }
  }

  function setTargetPose(next) {
    if (!next) return;
    for (var i = 0; i < JOINT_IDS.length; i++) {
      var id = JOINT_IDS[i];
      if (typeof next[id] === "number") {
        targetPose[id] = clamp(next[id], -60, 60);
      }
    }
  }

  function tickDesires() {
    desire.hunger = clamp(desire.hunger + 1.0, 0, 100);
    desire.fatigue = clamp(desire.fatigue + 0.5, 0, 100);
    desire.boredom = clamp(desire.boredom + 0.8, 0, 100);
    desire.energy = clamp(desire.energy - 0.4, 0, 100);

    if (currentAction === "eating") {
      desire.hunger = clamp(desire.hunger - 8, 0, 100);
      desire.energy = clamp(desire.energy + 2, 0, 100);
    } else if (currentAction === "sleeping") {
      desire.fatigue = clamp(desire.fatigue - 6, 0, 100);
      desire.energy = clamp(desire.energy + 5, 0, 100);
      desire.boredom = clamp(desire.boredom + 0.3, 0, 100);
    } else if (currentAction === "slacking") {
      desire.boredom = clamp(desire.boredom - 5, 0, 100);
      desire.fatigue = clamp(desire.fatigue + 0.2, 0, 100);
    } else if (currentAction === "walking") {
      desire.energy = clamp(desire.energy - 1.2, 0, 100);
      desire.boredom = clamp(desire.boredom - 1.5, 0, 100);
      desire.fatigue = clamp(desire.fatigue + 0.8, 0, 100);
    }
  }

  function poseForAction(action, t) {
    var w = Math.sin(t * 0.012) * 18;
    var w2 = Math.sin(t * 0.012 + Math.PI) * 18;
    switch (action) {
      case "eating":
        return {
          head: 8 + Math.sin(t * 0.02) * 4,
          "left-arm": -25 + Math.sin(t * 0.025) * 10,
          "right-arm": 15,
          "left-leg": 0,
          "right-leg": 0
        };
      case "sleeping":
        return {
          head: 18,
          "left-arm": -8,
          "right-arm": 8,
          "left-leg": 4,
          "right-leg": -4
        };
      case "slacking":
        return {
          head: -6,
          "left-arm": 5,
          "right-arm": 28 + Math.sin(t * 0.015) * 6,
          "left-leg": 2,
          "right-leg": -2
        };
      case "walking":
        return {
          head: Math.sin(t * 0.012) * 3,
          "left-arm": w2 * 0.7,
          "right-arm": w * 0.7,
          "left-leg": w,
          "right-leg": w2
        };
      case "idle":
      default:
        return {
          head: Math.sin(t * 0.003) * 2,
          "left-arm": -4 + Math.sin(t * 0.004) * 3,
          "right-arm": 4 + Math.sin(t * 0.004 + 1) * 3,
          "left-leg": 0,
          "right-leg": 0
        };
    }
  }

  function applyActionVisual(t) {
    if (currentAction === "walking" || currentAction === "idle" ||
        currentAction === "eating" || currentAction === "sleeping" ||
        currentAction === "slacking") {
      setTargetPose(poseForAction(currentAction, t));
    }

    if (currentAction === "walking") {
      walkPhase += 0.04;
      vel.x = Math.cos(walkPhase * 0.5) * 0.6;
      pos.x += vel.x;
      if (pos.x < 8) pos.x = 8;
      if (pos.x > window.innerWidth - 80) pos.x = window.innerWidth - 80;
      applyHostPos();
    } else {
      vel.x *= 0.9;
    }
  }

  var thoughtEl = null;
  var thoughtTimer = null;
  function showThought(text) {
    if (!text) return;
    if (!thoughtEl) {
      thoughtEl = document.createElement("div");
      thoughtEl.id = "g5-ai-thought";
      document.body.appendChild(thoughtEl);
    }
    thoughtEl.textContent = text;
    thoughtEl.style.left = Math.min(window.innerWidth - 210, pos.x + 50) + "px";
    thoughtEl.style.top = Math.max(8, pos.y - 28) + "px";
    thoughtEl.classList.add("show");
    clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(function () {
      if (thoughtEl) thoughtEl.classList.remove("show");
    }, 4000);
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
          engine = await CreateMLCEngine(MODEL_IDS[i], {
            initProgressCallback: function () {}
          });
          modelReady = true;
          modelLoading = false;
          console.info("[G5 AI Engine] model ready:", MODEL_IDS[i]);
          return;
        } catch (err) {
          lastErr = err;
          console.warn("[G5 AI Engine]", MODEL_IDS[i], err);
        }
      }
      throw lastErr || new Error("model load failed");
    } catch (e) {
      modelLoading = false;
      console.warn("[G5 AI Engine] WebLLM unavailable — rule-based life", e);
    }
  }

  var SYSTEM_PROMPT =
    "You are an autonomous character living on a web page. " +
    "Respond with ONLY valid JSON, no markdown, no extra text. Schema:\n" +
    '{"thought":"short internal monologue","action":"eating|sleeping|slacking|walking|idle",' +
    '"pose":{"head":0,"left-arm":0,"right-arm":0,"left-leg":0,"right-leg":0}}\n' +
    "Angles are degrees, range -45 to 45. Choose action that best reduces high desire meters.";

  function parseJsonLoose(text) {
    if (!text) return null;
    var s = text.trim();
    var a = s.indexOf("{");
    var b = s.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch (e) {
      return null;
    }
  }

  async function lifeCycleDecide() {
    if (thinking) return;
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
      tick: lifeTick
    };

    var decided = null;

    if (modelReady && engine) {
      try {
        var reply = await engine.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: "Current state JSON:\n" + JSON.stringify(context) +
                "\nReturn only the decision JSON."
            }
          ],
          temperature: 0.7,
          max_tokens: 160
        });
        var raw = (reply.choices && reply.choices[0] && reply.choices[0].message &&
          reply.choices[0].message.content) || "";
        decided = parseJsonLoose(raw);
      } catch (e) {
        console.warn("[G5 AI Engine] decide fail", e);
      }
    }

    if (!decided) {
      decided = ruleBasedDecision(context.desire);
    }

    applyDecision(decided);
    thinking = false;
  }

  function ruleBasedDecision(d) {
    var action = "idle";
    var thought = "…";
    if (d.hunger >= 60) {
      action = "eating";
      thought = "お腹すいた…";
    } else if (d.fatigue >= 65 || d.energy <= 20) {
      action = "sleeping";
      thought = "眠い…";
    } else if (d.boredom >= 55) {
      action = Math.random() < 0.5 ? "slacking" : "walking";
      thought = action === "slacking" ? "ちょっとサボる" : "散歩しよう";
    } else if (d.energy >= 50 && Math.random() < 0.35) {
      action = "walking";
      thought = "歩いてみる";
    } else {
      action = "idle";
      thought = "ぼーっとする";
    }
    return {
      thought: thought,
      action: action,
      pose: poseForAction(action, performance.now())
    };
  }

  function applyDecision(dec) {
    if (!dec) return;
    if (dec.thought) {
      lastThought = String(dec.thought).slice(0, 80);
      showThought(lastThought);
    }
    var act = (dec.action || "idle").toLowerCase();
    if (["eating", "sleeping", "slacking", "walking", "idle"].indexOf(act) < 0) {
      act = "idle";
    }
    currentAction = act;
    if (dec.pose) setTargetPose(dec.pose);
    else setTargetPose(poseForAction(act, performance.now()));
  }

  function startLoops() {
    setInterval(tickDesires, 3000);

    setInterval(function () {
      if (document.hidden) return;
      lifeCycleDecide();
    }, 12000);

    function frame(t) {
      if (!document.hidden) {
        applyActionVisual(t);
        renderPose();
        if (thoughtEl && thoughtEl.classList.contains("show")) {
          thoughtEl.style.left = Math.min(window.innerWidth - 210, pos.x + 50) + "px";
          thoughtEl.style.top = Math.max(8, pos.y - 28) + "px";
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    setTimeout(function () {
      lifeCycleDecide();
    }, 2500);
  }

  async function boot() {
    injectStyles();
    await mountSvg();
    startLoops();
    initWebLLM();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
