/**
 * G5 Invaders v3 — TRUE fullscreen cyberpunk invaders
 * Triggers (all robust): RGB sequence, type invader, 5-tap swatch/title, console
 */
(function () {
  "use strict";
  if (window.__G5_INVADERS_V3__) return;
  window.__G5_INVADERS_V3__ = true;

  function injectCSS() {
    if (document.getElementById("g5-inv-css")) return;
    var st = document.createElement("style");
    st.id = "g5-inv-css";
    st.textContent = [
      "#g5-cyber-trans{position:fixed;inset:0;z-index:100095;background:#000;display:flex;flex-direction:column;",
      "align-items:center;justify-content:center;overflow:hidden}",
      ".g5-ct-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,.08) 2px,rgba(0,245,255,.08) 4px);animation:g5ct-scan .7s linear infinite}",
      ".g5-ct-glitch{position:absolute;inset:0;background:linear-gradient(90deg,transparent 35%,rgba(255,45,149,.2) 50%,transparent 65%);animation:g5ct-glitch .9s ease infinite}",
      ".g5-ct-text{font-size:clamp(1.5rem,7vw,2.8rem);font-weight:900;letter-spacing:.3em;color:#00f5ff;",
      "text-shadow:0 0 24px #00f5ff,0 0 48px #ff2d95,0 0 90px #00f5ff;z-index:1;font-family:ui-monospace,monospace;",
      "animation:g5ct-pulse .55s ease infinite alternate}",
      ".g5-ct-sub{margin-top:1.2rem;font-size:.85rem;color:rgba(255,45,149,.9);letter-spacing:.22em;z-index:1;font-family:ui-monospace,monospace}",
      "@keyframes g5ct-scan{to{transform:translateY(18px)}}",
      "@keyframes g5ct-glitch{0%,100%{transform:translateX(0)}25%{transform:translateX(10px)}75%{transform:translateX(-8px)}}",
      "@keyframes g5ct-pulse{to{opacity:.65;letter-spacing:.38em}}",
      "@keyframes g5ct-out{to{opacity:0}}",
      "#g5-inv-root{position:fixed;inset:0;z-index:100100;background:#010008;display:flex;flex-direction:column;overflow:hidden}",
      "#g5-inv-root::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;",
      "background:radial-gradient(ellipse at 50% 100%,rgba(255,45,149,.12),transparent 48%),",
      "radial-gradient(ellipse at 50% 0%,rgba(0,245,255,.1),transparent 42%),",
      "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,245,255,.02) 3px,rgba(0,245,255,.02) 6px)}",
      ".g5-inv-hud{position:absolute;top:0;left:0;right:0;z-index:4;display:flex;align-items:center;gap:.55rem;",
      "padding:max(.5rem,env(safe-area-inset-top)) .85rem .45rem;flex-wrap:wrap;",
      "background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);pointer-events:none}",
      ".g5-inv-hud > *{pointer-events:auto}",
      ".g5-inv-title{font-weight:900;letter-spacing:.26em;font-size:clamp(.95rem,3.2vw,1.25rem);margin-right:auto;",
      "background:linear-gradient(90deg,#ff2d95,#00f5ff,#ffd700,#a855f7,#ff2d95);background-size:240% auto;",
      "-webkit-background-clip:text;background-clip:text;color:transparent;animation:g5inv-chrome 2.8s linear infinite;",
      "filter:drop-shadow(0 0 10px rgba(255,45,149,.45))}",
      "@keyframes g5inv-chrome{to{background-position:240% center}}",
      ".g5-inv-score,.g5-inv-lives,.g5-inv-wave{font-size:.74rem;font-family:ui-monospace,monospace;color:rgba(255,255,255,.5);letter-spacing:.07em}",
      ".g5-inv-score b{color:#00f5ff;text-shadow:0 0 12px #00f5ff}.g5-inv-lives b{color:#ff2d95;text-shadow:0 0 12px #ff2d95}.g5-inv-wave b{color:#ffd700;text-shadow:0 0 10px #ffd700}",
      ".g5-inv-x{margin-left:.2rem;width:2.2rem;height:2.2rem;border:1px solid rgba(0,245,255,.45);background:rgba(0,245,255,.1);",
      "color:#00f5ff;border-radius:8px;cursor:pointer;font-size:1.2rem;transition:background .15s,box-shadow .15s}",
      ".g5-inv-x:hover{background:rgba(0,245,255,.25);box-shadow:0 0 16px rgba(0,245,255,.35)}",
      "#g5-inv-cv{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;touch-action:none}",
      ".g5-inv-hint{position:absolute;bottom:0;left:0;right:0;z-index:4;text-align:center;",
      "padding:.4rem max(.5rem,env(safe-ar"
    ].join("");
  }
})();
