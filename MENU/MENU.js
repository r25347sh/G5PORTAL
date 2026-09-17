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
          { label: "MultiQuiz", icon: "\u25c8", url: root + "pages/multiquiz/index.html" },
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
        items: [{ label: "\u526f\u6559\u6750", icon: "\u25c7", url: root + "pages/materials/index.html" }]
      }
    ];
  }

  var LONG_PRESS_MS = 360;
  var TRIPLE_TAP_DELAY_MS = 300;
  var MOVE_THRESHOLD = 8;
  var SHELL_CAPACITIES = [6, 10, 14];
  var SHELL_RADII = [118, 190, 262];
  var menuEl, itemsContainer, orbitsContainer, coreBtn;
  var timer, startX, startY, isOpen = false, menuStack = [];
  var pieDisabled = false;
  var tapCount = 0, tapTimer = null;

  function navigateWithDelay(url) {
    closeMenu();
    closeHamburger();
    setTimeout(function () { location.href = url; }, 180);
  }

  function calculateShellLayout(items) {
    var layout = [], remaining = items.length, itemIdx = 0;
    for (var sIdx = 0; sIdx < SHELL_CAPACITIES.length && remaining > 0; sIdx++) {
      var count = Math.min(remaining, SHELL_CAPACITIES[sIdx]);
      var radius = SHELL_RADII[sIdx];
      for (var i = 0; i < count; i++) {
        var angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        layout.push({
          item: items[itemIdx],
          x: Math.round(Math.cos(angle) * radius),
          y: Math.round(Math.sin(angle) * radius),
          shellIndex: sIdx
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
    for (var i = 0; i < old.length; i++) {
      old[i].classList.remove("rendered");
      (function (el) {
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
      })(old[i]);
    }
    orbitsContainer.innerHTML = "";
    var layout = calculateShellLayout(items);
    var activeShells = {};
    layout.forEach(function (data, index) {
      activeShells[data.shellIndex] = true;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rm-item" + (data.item.items ? " has-sub" : "");
      btn.setAttribute("data-label", data.item.label);
      btn.innerHTML = data.item.icon || "\u2022";
      btn.style.setProperty("--x", data.x + "px");
      btn.style.setProperty("--y", data.y + "px");
      btn.style.transitionDelay = index * 0.024 + "s";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (data.item.items && data.item.items.length) {
          menuStack.push(items);
          renderMenuLevel(data.item.items);
        } else if (data.item.url) {
          navigateWithDelay(data.item.url);
        }
      });
      itemsContainer.appendChild(btn);
      requestAnimationFrame(function () {
        setTimeout(function () { btn.classList.add("rendered"); }, 14);
      });
    });
    Object.keys(activeShells).forEach(function (sIdx) {
      sIdx = +sIdx;
      var orbit = document.createElement("div");
      orbit.className = "rm-shell-orbit";
      var d = SHELL_RADII[sIdx] * 2;
      orbit.style.width = d + "px";
      orbit.style.height = d + "px";
      orbit.style.marginTop = -SHELL_RADII[sIdx] + "px";
      orbit.style.marginLeft = -SHELL_RADII[sIdx] + "px";
      orbitsContainer.appendChild(orbit);
    });
    if (coreBtn) coreBtn.classList.toggle("visible", menuStack.length > 0);
  }

  function createMenuDOM() {
    if (document.querySelector(".radial-menu-wrapper")) return;
    menuEl = document.createElement("div");
    menuEl.className = "radial-menu-wrapper";
    var canvas = document.createElement("canvas");
    canvas.className = "rm-canvas-layer";
    menuEl.appendChild(canvas);
    orbitsContainer = document.createElement("div");
    menuEl.appendChild(orbitsContainer);
    itemsContainer = document.createElement("div");
    menuEl.appendChild(itemsContainer);
    coreBtn = document.createElement("button");
    coreBtn.type = "button";
    coreBtn.className = "rm-core-btn";
    coreBtn.setAttribute("aria-label", "\u623b\u308b");
    coreBtn.innerHTML = "\u2190";
    coreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuStack.length) renderMenuLevel(menuStack.pop());
      else closeMenu();
    });
    menuEl.appendChild(coreBtn);
    document.body.appendChild(menuEl);
  }

  function openMenu(x, y) {
    if (!menuEl) return;
    var margin = 180;
    var cx = typeof x === "number" ? x : window.innerWidth / 2;
    var cy = typeof y === "number" ? y : window.innerHeight / 2;
    menuEl.style.left = Math.max(margin, Math.min(cx, window.innerWidth - margin)) + "px";
    menuEl.style.top = Math.max(margin, Math.min(cy, window.innerHeight - margin)) + "px";
    menuEl.classList.add("active");
    isOpen = true;
    menuStack = [];
    renderMenuLevel(buildMenuData());
  }

  function closeMenu() {
    if (!menuEl) return;
    menuEl.classList.remove("active");
    if (itemsContainer) {
      itemsContainer.querySelectorAll(".rm-item").forEach(function (i) {
        i.classList.remove("rendered");
      });
    }
    if (coreBtn) coreBtn.classList.remove("visible");
    isOpen = false;
  }

  function ensureFab() {
    if (document.querySelector(".menu-fab")) return;
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "menu-fab";
    fab.setAttribute("aria-label", "\u30e1\u30cb\u30e5\u30fc");
    fab.innerHTML = "\u2630";
    document.body.appendChild(fab);
    fab.addEventListener("click", function (e) {
      e.stopPropagation();
      openHamburger();
    });
  }

  function ensureHamburgerUI() {
    if (document.getElementById("ham-overlay")) return;
    var ov = document.createElement("div");
    ov.id = "ham-overlay";
    ov.setAttribute("aria-hidden", "true");
    var panel = document.createElement("div");
    panel.id = "ham-panel";
    panel.setAttribute("role", "dialog");
    panel.innerHTML =
      '<div class="ham-header">' +
      '<div class="ham-title">G\u2075 Portal</div>' +
      '<button type="button" class="ham-close" id="ham-close">\u2715</button>' +
      '</div><div id="ham-list"></div>';
    document.body.appendChild(ov);
    document.body.appendChild(panel);
    document.getElementById("ham-close").onclick = closeHamburger;
    ov.onclick = closeHamburger;
  }

  function openHamburger() {
    ensureHamburgerUI();
    pieDisabled = true;
    closeMenu();
    var list = document.getElementById("ham-list");
    if (!list) return;
    list.innerHTML = "";
    buildMenuData().forEach(function (item) {
      if (item.items && item.items.length) {
        var wrap = document.createElement("div");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ham-group-btn";
        btn.textContent = (item.icon ? item.icon + " " : "") + item.label;
        var sub = document.createElement("div");
        sub.className = "ham-sub";
        item.items.forEach(function (subItem) {
          var a = document.createElement("a");
          a.href = subItem.url || "#";
          a.textContent = (subItem.icon ? subItem.icon + " " : "") + subItem.label;
          a.addEventListener("click", function (e) {
            e.preventDefault();
            navigateWithDelay(subItem.url);
          });
          sub.appendChild(a);
        });
        btn.onclick = function () { sub.classList.toggle("open"); };
        wrap.appendChild(btn);
        wrap.appendChild(sub);
        list.appendChild(wrap);
      } else {
        var a = document.createElement("a");
        a.className = "ham-link";
        a.href = item.url || "#";
        a.textContent = (item.icon ? item.icon + " " : "") + item.label;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          navigateWithDelay(item.url);
        });
        list.appendChild(a);
      }
    });
    var ov = document.getElementById("ham-overlay");
    var panel = document.getElementById("ham-panel");
    if (ov) { ov.classList.add("open"); ov.setAttribute("aria-hidden", "false"); }
    if (panel) panel.classList.add("open");
  }

  function closeHamburger() {
    var ov = document.getElementById("ham-overlay");
    var panel = document.getElementById("ham-panel");
    if (ov) { ov.classList.remove("open"); ov.setAttribute("aria-hidden", "true"); }
    if (panel) panel.classList.remove("open");
    pieDisabled = false;
  }

  function initEvents() {
    document.addEventListener("pointerdown", function (e) {
      if (
        e.target.closest &&
        (e.target.closest(".menu-fab") ||
          e.target.closest(".radial-menu-wrapper") ||
          e.target.closest("#ham-panel") ||
          e.target.closest("#ham-overlay"))
      ) return;
      if (isOpen && menuEl && !menuEl.contains(e.target)) {
        closeMenu();
        return;
      }
      startX = e.clientX;
      startY = e.clientY;
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount === 3) {
        clearTimeout(timer);
        timer = null;
        tapCount = 0;
        if (!pieDisabled) openMenu(startX, startY);
        return;
      }
      tapTimer = setTimeout(function () { tapCount = 0; }, TRIPLE_TAP_DELAY_MS);
      if (pieDisabled) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (pieDisabled) return;
        tapCount = 0;
        openMenu(startX, startY);
      }, LONG_PRESS_MS);
    });

    document.addEventListener("pointermove", function (e) {
      if (!timer || isOpen) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_THRESHOLD) {
        clearTimeout(timer);
        timer = null;
      }
    });

    document.addEventListener("pointerup", function () {
      if (timer && !isOpen) {
        clearTimeout(timer);
        timer = null;
      }
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (pieDisabled) return;
        if (isOpen) closeMenu();
        else openMenu();
      }
      if (e.key === "Escape") {
        if (document.getElementById("ham-panel") &&
            document.getElementById("ham-panel").classList.contains("open")) {
          closeHamburger();
        }
        if (isOpen) closeMenu();
      }
    });
  }

  function boot() {
    createMenuDOM();
    ensureFab();
    initEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
