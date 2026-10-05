/**
 * G⁵ Portal — Easter Eggs (Google-style hidden delights)
 * Loaded site-wide via main.js
 */
(function () {
  "use strict";
  if (window.__G5_EASTER__) return;
  window.__G5_EASTER__ = true;

  var KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
  var konamiIdx = 0;
  var typeBuf = "";
  var typeTimer = null;
  var logoClicks = 0;
  var logoTimer = null;

  function asset(path) {
    if (window.G5 && G5.asset) return G5.asset(path);
    var depth = (location.pathname.indexOf("/pages/") >= 0) ? "../../" : "./";
    return depth + path;
  }

  function ensureCss() {
    if (document.getElementById("g5-easter-css")) return;
    var link = document.createElement("link");
    link.id = "g5-easter-css";
    link.rel = "stylesheet";
    link.href = asset("src/css/easter.css");
    document.head.appendChild(link);
  }

  function toast(msg, ms) {
    var el = document.getElementById("g5-easter-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "g5-easter-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.classList.remove("show");
    }, ms || 2800);
  }

  /* ─── Barrel roll (Google classic) ─── */
  function barrelRoll() {
    ensureCss();
    var body = document.body;
    body.classList.remove("g5-barrel-roll");
    void body.offsetWidth;
    body.classList.add("g5-barrel-roll");
    toast("🌀 Do a barrel roll!");
    setTimeout(function () {
      body.classList.remove("g5-barrel-roll");
    }, 1600);
  }

  /* ─── Neon confetti burst ─── */
  function confettiBurst() {
    ensureCss();
    var box = document.createElement("div");
    box.className = "g5-easter-confetti";
    box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);
    var colors = ["#ff2d95", "#00f5ff", "#ffd700", "#9b5de5", "#fff"];
    for (var i = 0; i < 48; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.animationDuration = 1.2 + Math.random() * 1.4 + "s";
      p.style.width = p.style.height = 4 + Math.random() * 8 + "px";
      box.appendChild(p);
    }
    setTimeout(function () {
      if (box.parentNode) box.remove();
    }, 2800);
  }

  /* ─── Portal flash ─── */
  function portalAwaken() {
    ensureCss();
    confettiBurst();
    var overlay = document.createElement("div");
    overlay.className = "g5-easter-portal";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    toast("✨ G⁵ ポータル覚醒");
    setTimeout(function () {
      if (overlay.parentNode) overlay.remove();
    }, 2000);
  }

  /* ─── Gravity flip (fun) ─── */
  function gravityFlip() {
    ensureCss();
    document.documentElement.classList.toggle("g5-upside-down");
    var on = document.documentElement.classList.contains("g5-upside-down");
    toast(on ? "🙃 重力反転 ON" : "重力復帰");
  }

  /* ─── Matrix rain on ambient ─── */
  function matrixRain() {
    ensureCss();
    if (document.getElementById("g5-matrix")) {
      document.getElementById("g5-matrix").remove();
      toast("マトリックス終了");
      return;
    }
    var canvas = document.createElement("canvas");
    canvas.id = "g5-matrix";
    canvas.className = "g5-matrix-canvas";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w, h, cols, drops;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cols = Math.floor(w / 14);
      drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -40;
    }
    resize();
    window.addEventListener("resize", resize);
    var chars = "G5PORTAL麗澤高等学校5年G組01アイウエオ";
    var running = true;
    function draw() {
      if (!running || !canvas.parentNode) return;
      ctx.fillStyle = "rgba(7,5,15,0.12)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#00f5ff";
      ctx.font = "13px monospace";
      for (var i = 0; i < drops.length; i++) {
        var ch = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(ch, i * 14, drops[i] * 14);
        if (drops[i] * 14 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      requestAnimationFrame(draw);
    }
    draw();
    toast("緑の雨… もう一度同じ操作で停止");
    canvas._stop = function () {
      running = false;
      canvas.remove();
    };
    setTimeout(function () {
      if (canvas.parentNode) {
        running = false;
        canvas.remove();
      }
    }, 12000);
  }

  /* ─── Konami ─── */
  function onKeydown(e) {
    if (e.keyCode === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        barrelRoll();
        confettiBurst();
      }
    } else {
      konamiIdx = e.keyCode === KONAMI[0] ? 1 : 0;
    }

    /* typing buffer for phrases */
    if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) {
        /* still allow buffer for global phrases when not in form? skip when typing in fields */
        return;
      }
      typeBuf += e.key.toLowerCase();
      if (typeBuf.length > 40) typeBuf = typeBuf.slice(-40);
      clearTimeout(typeTimer);
      typeTimer = setTimeout(function () { typeBuf = ""; }, 2500);
      checkPhrases();
    }
  }

  function checkPhrases() {
    if (typeBuf.indexOf("do a barrel roll") >= 0 || typeBuf.indexOf("barrel roll") >= 0) {
      typeBuf = "";
      barrelRoll();
    } else if (typeBuf.indexOf("g5portal") >= 0 || typeBuf.indexOf("g⁵") >= 0) {
      typeBuf = "";
      portalAwaken();
    } else if (typeBuf.indexOf("reitaku") >= 0 || typeBuf.indexOf("麗澤") >= 0) {
      typeBuf = "";
      confettiBurst();
      toast("🏫 麗澤高等学校 · 5G");
    } else if (typeBuf.indexOf("matrix") >= 0 || typeBuf.indexOf("アウェイクン") >= 0) {
      typeBuf = "";
      matrixRain();
    } else if (typeBuf.indexOf("flip") >= 0 || typeBuf.indexOf("さかさま") >= 0) {
      typeBuf = "";
      gravityFlip();
    } else if (typeBuf.indexOf("askew") >= 0) {
      typeBuf = "";
      ensureCss();
      document.documentElement.classList.toggle("g5-askew");
      toast(document.documentElement.classList.contains("g5-askew") ? "📐 askew" : "戻した");
    }
  }

  /* ─── Logo / title multi-click ─── */
  function bindLogoClicks() {
    var targets = document.querySelectorAll(
      "h1, .hero h1, .hero-badge, .tool-header h1, .site-footer strong"
    );
    targets.forEach(function (el) {
      if (el._g5easter) return;
      el._g5easter = true;
      el.style.cursor = "default";
      el.addEventListener("click", function () {
        logoClicks++;
        clearTimeout(logoTimer);
        logoTimer = setTimeout(function () { logoClicks = 0; }, 900);
        if (logoClicks >= 5) {
          logoClicks = 0;
          portalAwaken();
        }
      });
    });
  }

  /* ─── Tool-specific eggs ─── */
  function toolEggs() {
    var path = location.pathname || "";

    /* Password: length 42 → Hitchhiker */
    if (path.indexOf("password-gen") >= 0) {
      var lenEl = document.getElementById("len");
      var btn = document.getElementById("btn-gen");
      if (lenEl && btn && !btn._g5egg) {
        btn._g5egg = true;
        btn.addEventListener("click", function () {
          if (+lenEl.value === 42) {
            setTimeout(function () {
              toast("🌌 答えは 42。生命、宇宙、そして万物について…");
            }, 200);
          }
        });
      }
    }

    /* Char count: special strings */
    if (path.indexOf("char-count") >= 0) {
      var input = document.getElementById("input");
      if (input && !input._g5egg) {
        input._g5egg = true;
        input.addEventListener("input", function () {
          var v = input.value || "";
          if (v === "G5" || v === "g5" || v === "５Ｇ") {
            toast("📡 5G 接続確立… というのは冗談です");
          } else if (v.indexOf("Hello World") >= 0 || v.indexOf("hello world") >= 0) {
            toast("👋 Hello, G⁵ Portal!");
          } else if (v === "麗澤" || v === "reitaku") {
            confettiBurst();
            toast("🏫 麗澤へようこそ");
          }
        });
      }
    }

    /* Random: all heads / snake eyes message via mutation of result if present */
    if (path.indexOf("random") >= 0) {
      var observer = new MutationObserver(function () {
        var result = document.querySelector(".result, #result, .coin-result, .dice-result");
        if (!result) return;
        var t = (result.textContent || "").trim();
        if (t === "6" || t === "1") {
          /* rare flavor — only occasionally */
          if (Math.random() < 0.15) {
            toast(t === "6" ? "🎲 最強の目！" : "🎲 スネークアイズ…");
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    /* Clock: 5:55 */
    if (path.indexOf("clock") >= 0 || path.indexOf("/clock") >= 0) {
      setInterval(function () {
        var d = new Date();
        if (d.getHours() === 5 && d.getMinutes() === 55 && d.getSeconds() < 2) {
          toast("🕔 5:55 — G⁵ の時間");
          confettiBurst();
        }
      }, 1000);
    }

    /* Color picker: pure pink #ff2d95 */
    if (path.indexOf("color-picker") >= 0) {
      document.addEventListener("click", function () {
        var hex = document.querySelector("#hex, .hex, input[id*='hex']");
        if (hex && /#ff2d95/i.test(hex.value || hex.textContent || "")) {
          toast("💗 G⁵ シグネチャーピンク");
        }
      }, true);
    }
  }

  /* ─── Long-press badge for secret menu ─── */
  function bindBadgeLongPress() {
    var badge = document.querySelector(".hero-badge, .tool-back");
    if (!badge) return;
    var pressTimer = null;
    function start() {
      pressTimer = setTimeout(function () {
        ensureCss();
        toast("🎮 隠しコマンド: Konami / barrel roll / matrix / flip / g5portal");
      }, 1200);
    }
    function end() {
      clearTimeout(pressTimer);
    }
    badge.addEventListener("mousedown", start);
    badge.addEventListener("touchstart", start, { passive: true });
    badge.addEventListener("mouseup", end);
    badge.addEventListener("mouseleave", end);
    badge.addEventListener("touchend", end);
  }

  function boot() {
    ensureCss();
    document.addEventListener("keydown", onKeydown, true);
    bindLogoClicks();
    bindBadgeLongPress();
    toolEggs();
    /* re-bind logo after dynamic content */
    setTimeout(bindLogoClicks, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.G5Easter = {
    barrelRoll: barrelRoll,
    portalAwaken: portalAwaken,
    confetti: confettiBurst,
    matrix: matrixRain,
    flip: gravityFlip
  };
})();
