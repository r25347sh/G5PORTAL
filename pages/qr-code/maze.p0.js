/**
 * G5 Maze v3 — HARD auto-maze · tight fog · traps · cyber UI
 * Default: 51×51 nightmare vision, moving hazards, compass pulse
 */
(function () {
  "use strict";
  if (window.__G5_MAZE_V3__) return;
  window.__G5_MAZE_V3__ = true;

  var DIFFS = {
    normal: { size: 41, vision: 3, traps: 6, label: "NORMAL", speed: 1 },
    hard: { size: 55, vision: 2, traps: 14, label: "HARD", speed: 1.15 },
    nightmare: { size: 71, vision: 1.6, traps: 28, label: "NIGHTMARE", speed: 1.35 }
  };

  function launchMaze(diffKey) {
    if (document.getElementById("g5-maze-root")) return;
    var diff = DIFFS[diffKey] || DIFFS.hard;

    var root = document.createElement("div");
    root.id = "g5-maze-root";
    root.innerHTML =
      '<div class="g5-mz-bar">' +
      '<span class="g5-mz-logo">MAZE</span>' +
      '<span class="g5-mz-diff" id="g5-mz-diff">' + diff.label + "</span>" +
      '<span class="g5-mz-stat" id="g5-mz-stat">—</span>' +
      '<button type="button" class="g5-mz-btn" data-d="normal">N</button>' +
      '<button type="button" class="g5-mz-btn" data-d="hard">H</button>' +
      '<button type="button" class="g5-mz-btn" data-d="nightmare">X</button>' +
      '<button type="button" class="g5-mz-btn" id="g5-mz-new">NEW</button>' +
      '<button type="button" class="g5-mz-btn g5-mz-x" id="g5-mz-x">×</button>' +
      "</div>" +
      '<canvas id="g5-mz-cv"></canvas>' +
      '<p class="g5-mz-hint">矢印 / WASD · 視界極狭 · トラップ回避 · Esc</p>';

    if (!document.getElementById("g5-mz-css")) {
      var st = document.createElement("style");
      st.id = "g5-mz-css";
      st.textContent = [
        "#g5-maze-root{position:fixed;inset:0;z-index:100090;display:flex;flex-direction:column;align-items:center;justify-content:center;",
        "background:#02010a;padding:max(.4rem,env(safe-area-inset-top)) .4rem max(.4rem,env(safe-area-inset-bottom));overflow:hidden}",
        "#g5-maze-root::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;",
        "background:radial-gradient(ellipse at 50% 0%,rgba(0,245,255,.14),transparent 50%),",
        "radial-gradient(ellipse at 80% 100%,rgba(255,45,149,.1),transparent 45%),",
        "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,245,255,.025) 3px,rgba(0,245,255,.025) 6px);",
        "animation:g5mz-scan 9s linear infinite}",
        "@keyframes g5mz-scan{to{transform:translateY(28px)}}",
        ".g5-mz-bar{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;width:min(98vw,780px);margin-bottom:.4rem}",
        ".g5-mz-logo{font-weight:900;letter-spacing:.28em;font-size:1.2rem;margin-right:auto;",
        "background:linear-gradient(90deg,#00f5ff,#ff2d95,#ffd700,#00f5ff);background-size:220% auto;",
        "-webkit-background-clip:text;background-clip:text;color:transparent;",
        "animation:g5mz-chrome 3.2s linear infinite;filter:drop-shadow(0 0 12px rgba(0,245,255,.55))}",
        "@keyframes g5mz-chrome{to{background-position:220% center}}",
        ".g5-mz-diff{font-size:.62rem;letter-spacing:.14em;padding:.22rem .5rem;border-radius:4px;",
        "border:1px solid rgba(255,45,149,.55);color:#ff8cc8;font-family:ui-monospace,monospace;",
        "background:rgba(255,45,149,.12);box-shadow:0 0 12px rgba(255,45,149,.2)}",
        ".g5-mz-stat{font-size:.7rem;color:rgba(0,245,255,.75);font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}",
        ".g5-mz-btn{appearance:none;border:1px solid rgba(0,245,255,.4);background:rgba(0,245,255,.08);color:#00f5ff;",
        "border-radius:6px;padding:.26rem .55rem;cursor:pointer;font-size:.7rem;font-family:ui-monospace,monospace;",
        "letter-spacing:.05em;transition:background .15s,box-shadow .15s,transform .12s}",
        ".g5-mz-btn:hover{background:rgba(0,245,255,.22);box-shadow:0 0 14px rgba(0,245,255,.3);transform:translateY(-1px)}",
        ".g5-mz-btn:active{transform:scale(.96)}",
        ".g5-mz-x{border-color:rgba(255,45,149,.45);color:#ff8cc8;background:rgba(255,45,149,.1)}",
        "#g5-mz-cv{position:relative;z-index:1;border:1px solid rgba(0,245,255,.32);border-radius:14px;",
        "box-shadow:0 0 0 1px rgba(255,45,149,.14),0 0 60px rgba(0,245,255,.1),inset 0 0 100px rgba(0,0,0,.55);",
        "background:#03020c;max-width:98vw;max-height:calc(100vh - 6.5rem);touch-action:none}",
        ".g5-mz-hint{position:relative;z-index:1;margin-top:.4rem;font-size:.65rem;color:rgba(0,245,255,.38);",
        "letter-spacing:.12em;font-f"
      ].join("");
    }
  }
})();
