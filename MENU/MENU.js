/**
 * G⁵ Portal Radial Menu + Hamburger
 */
(function () {
  "use strict";

  function detectRoot() {
    var path = location.pathname || "";
    if (path.indexOf("/pages/") >= 0) {
      var depth = (path.split("/pages/")[1] || "").split("/").filter(Boolean).length;
      if (depth >= 2) return "../../";
      if (depth === 1) return "../";
    }
    return "";
  }

  var root = detectRoot();

  function buildMenuData() {
    return [
      { label: "\u30db\u30fc\u30e0", icon: "\u2302", url: root + "index.html" },
      {
        label: "\u30c4\u30fc\u30eb",
        icon: "\u25c8",
        items: [
          { label: "\u6587\u5b57\u6570\u30ab\u30a6\u30f3\u30c8", icon: "\u6587\u5b57", url: root + "pages/char-count/index.html" },
          { label: "\u6587\u5b57\u62e1\u5927\u93e1", icon: "\ud83d\udd0d", url: root + "pages/char-magnifier/index.html" },
          { label: "\u30d1\u30b9\u30ef\u30fc\u30c9\u751f\u6210", icon: "\u9375", url: root + "pages/password-gen/index.html" },
          { label: "\u6697\u53f7\u5316\u30fb\u5fa9\u53f7", icon: "\ud83d\udd12", url: root + "pages/crypto/index.html" },
          { label: "QR\u30b3\u30fc\u30c9", icon: "QR", url: root + "pages/qr-code/index.html" },
          { label: "\u30bf\u30a4\u30de\u30fc", icon: "\u23f1", url: root + "pages/timer/index.html" },
          { label: "\u30b3\u30a4\u30f3\u30fb\u30b5\u30a4\u30b3\u30ed", icon: "\ud83c\udfb2", url: root + "pages/random/index.html" },
          { label: "\u30ab\u30e9\u30fc\u30d4\u30c3\u30ab\u30fc", icon: "\ud83c\udfa8", url: root + "pages/color-picker/index.html" },
          { label: "\u753b\u9762\u30b7\u30a7\u30a2", icon: "\ud83d\udcfa", url: root + "pages/screen-share/index.html" },
          { label: "\u30d5\u30a1\u30a4\u30eb\u5171\u6709", icon: "\ud83d\udcc1", url: root + "pages/file-share/index.html" },
          { label: "\u30c7\u30b8\u30bf\u30eb\u6642\u8a08", icon: "\ud83d\udd50", url: root + "pages/clock/index.html" }
        ]
      },
      {
        label: "\u6559\u6750",
        icon: "\u25c7",
        items: [
          { label: "MultiQuiz", icon: "\u25c8", url: root + "pages/multiquiz/index.html" },
          { label: "\u526f\u6559\u6750 (PDF)", icon: "\u25c7", url: root + "pages/materials/index.html" }
        ]
      }
    ];
  }

  var LONG_PRESS_MS = 360;
  var TRIPLE_TAP_DELAY_MS = 300;
  var MOVE_THRESHOLD = 8;
  var SHELL_CAPACITIES = [6, 10, 14];
  var SHELL_RADII = [118, 190, 262];
  var menuEl, itemsContainer, orbitsContainer, coreBtn;
  var timer, startX, startY, isOpen = false;
  var menuStack = [];
  var tapTimes = [];

  function calculateShellLayout(items) {
    var layout = [], remaining = items.length, itemIdx = 0;
    for (var s = 0; s < SHELL_CAPACITIES.length && remaining > 0; s++) {
      var cap = SHELL_CAPACITIES[s];
      var count = Math.min(remaining, cap);
      var radius = SHELL_RADII[s];
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        layout.push({
          item: items[itemIdx],
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          shell: s
        });
        itemIdx++;
      }
      remaining -= count;
    }
    return layout;
  }

  function renderMenuLevel(items) {
    if (!itemsContainer) return;
    var old = itemsContainer.querySelectorAll(".rm-item");
    old.forEach(function (el) { el.remove(); });
    if (orbitsContainer) orbitsContainer.innerHTML = "";

    var layout = calculateShellLayout(items);
    layout.forEach(function (data, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rm-item" + (data.item.items ? " has-sub" : "");
      btn.style.setProperty("--x", data.x + "px");
      btn.style.setProperty("--y", data.y + "px");
      btn.style.setProperty("--delay", idx * 30 + "ms");
      btn.innerHTML = "<span class=\"rm-icon\">" + (data.item.icon || "·") + "</span><span class=\"rm-label\">" + data.item.label + "</span>";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (data.item.items && data.item.items.length) {
          menuStack.push(items);
          renderMenuLevel(data.item.items);
        } else if (data.item.url) {
          location.href = data.item.url;
        }
      });
      itemsContainer.appendChild(btn);
    });

    // orbits
    if (orbitsContainer) {
      var shells = {};
      layout.forEach(function (d) { shells[d.shell] = true; });
      Object.keys(shells).forEach(function (s) {
        var ring = document.createElement("div");
        ring.className = "rm-orbit";
        ring.style.width = SHELL_RADII[s] * 2 + "px";
        ring.style.height = SHELL_RADII[s] * 2 + "px";
        orbitsContainer.appendChild(ring);
      });
    }
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    menuStack = [];
    if (menuEl) menuEl.classList.add("open");
    renderMenuLevel(buildMenuData());
  }

  function closeMenu() {
    isOpen = false;
    if (menuEl) menuEl.classList.remove("open");
    menuStack = [];
  }

  function goBack() {
    if (menuStack.length) {
      renderMenuLevel(menuStack.pop());
    } else {
      closeMenu();
    }
  }

  function createMenuDom() {
    menuEl = document.createElement("div");
    menuEl.id = "radialMenu";
    menuEl.className = "radial-menu";
    menuEl.setAttribute("aria-hidden", "true");

    orbitsContainer = document.createElement("div");
    orbitsContainer.className = "rm-orbits";
    menuEl.appendChild(orbitsContainer);

    itemsContainer = document.createElement("div");
    menuEl.appendChild(itemsContainer);

    coreBtn = document.createElement("button");
    coreBtn.type = "button";
    coreBtn.className = "rm-core";
    coreBtn.setAttribute("aria-label", "メニュー");
    coreBtn.innerHTML = "<span></span><span></span><span></span>";
    coreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isOpen) goBack();
      else openMenu();
    });
    menuEl.appendChild(coreBtn);

    document.body.appendChild(menuEl);

    document.addEventListener("click", function (e) {
      if (isOpen && menuEl && !menuEl.contains(e.target)) closeMenu();
    });
  }

  // Long-press / triple-tap on empty area
  function onPointerDown(e) {
    if (e.target.closest("a, button, input, textarea, select, .radial-menu")) return;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    timer = setTimeout(function () {
      openMenu();
      timer = null;
    }, LONG_PRESS_MS);
  }
  function onPointerMove(e) {
    if (!timer) return;
    var x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    if (Math.abs(x - startX) > MOVE_THRESHOLD || Math.abs(y - startY) > MOVE_THRESHOLD) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function onPointerUp() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function onTap(e) {
    if (e.target.closest("a, button, input, textarea, select, .radial-menu")) return;
    var now = Date.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(function (t) { return now - t < TRIPLE_TAP_DELAY_MS * 2; });
    if (tapTimes.length >= 3) {
      tapTimes = [];
      openMenu();
    }
  }

  function init() {
    createMenuDom();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("touchmove", onPointerMove, { passive: true });
    document.addEventListener("touchend", onPointerUp);
    document.addEventListener("click", onTap);

    // Hamburger fallback in header if present
    var ham = document.getElementById("menuToggle") || document.querySelector(".menu-toggle");
    if (ham) ham.addEventListener("click", function (e) { e.preventDefault(); openMenu(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
