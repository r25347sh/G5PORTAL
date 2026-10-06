/**
 * G⁵ Portal Radial Menu + Hamburger FAB
 * Calendar is independent (top-level). PDF tools under tools.
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
      { label: "ホーム", icon: "⌂", url: root + "index.html" },
      { label: "カレンダー", icon: "📅", url: root + "pages/calendar/index.html" },
      {
        label: "ツール",
        icon: "◈",
        items: [
          { label: "PDFビューアー", icon: "📄", url: root + "pages/pdf-viewer/index.html" },
          { label: "PDFパスワード", icon: "🔒", url: root + "pages/pdf-password/index.html" },
          { label: "PDF結合", icon: "📎", url: root + "pages/pdf-merge/index.html" },
          { label: "文字数カウント", icon: "文字", url: root + "pages/char-count/index.html" },
          { label: "文字拡大鏡", icon: "🔍", url: root + "pages/char-magnifier/index.html" },
          { label: "パスワード生成", icon: "鍵", url: root + "pages/password-gen/index.html" },
          { label: "暗号化・復号", icon: "🔐", url: root + "pages/crypto/index.html" },
          { label: "QRコード", icon: "QR", url: root + "pages/qr-code/index.html" },
          { label: "タイマー", icon: "⏱", url: root + "pages/timer/index.html" },
          { label: "コイン・サイコロ", icon: "🎲", url: root + "pages/random/index.html" },
          { label: "カラーピッカー", icon: "🎨", url: root + "pages/color-picker/index.html" },
          { label: "画面シェア", icon: "📺", url: root + "pages/screen-share/index.html" },
          { label: "ファイル共有", icon: "📁", url: root + "pages/file-share/index.html" },
          { label: "デジタル時計", icon: "🕐", url: root + "pages/clock/index.html" }
        ]
      },
      {
        label: "教材",
        icon: "◇",
        items: [
          { label: "MultiQuiz", icon: "◈", url: root + "pages/multiquiz/index.html" },
          { label: "副教材 (PDF)", icon: "◇", url: root + "pages/materials/index.html" }
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

  function renderItems(items) {
    if (!itemsContainer || !orbitsContainer) return;
    var old = itemsContainer.querySelectorAll(".rm-item");
    for (var i = 0; i < old.length; i++) {
      old[i].classList.remove("rendered");
      old[i].remove();
    }
    orbitsContainer.innerHTML = "";

    var layout = calculateShellLayout(items);
    var shellsUsed = {};
    layout.forEach(function (data, idx) {
      shellsUsed[data.shellIndex] = true;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rm-item" + (data.item.items ? " has-sub" : "");
      btn.setAttribute("data-label", data.item.label || "");
      btn.style.setProperty("--x", data.x + "px");
      btn.style.setProperty("--y", data.y + "px");
      btn.style.transitionDelay = idx * 28 + "ms";
      btn.innerHTML = "<span>" + (data.item.icon || "·") + "</span>";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (data.item.items && data.item.items.length) {
          menuStack.push(items);
          renderItems(data.item.items);
          if (coreBtn) coreBtn.classList.add("visible");
        } else if (data.item.url) {
          navigateWithDelay(data.item.url);
        }
      });
      itemsContainer.appendChild(btn);
      setTimeout(function () { btn.classList.add("rendered"); }, 14);
    });

    Object.keys(shellsUsed).forEach(function (s) {
      var orbit = document.createElement("div");
      orbit.className = "rm-shell-orbit";
      var r = SHELL_RADII[Number(s)];
      orbit.style.width = r * 2 + "px";
      orbit.style.height = r * 2 + "px";
      orbit.style.marginLeft = -r + "px";
      orbit.style.marginTop = -r + "px";
      orbit.style.left = "0";
      orbit.style.top = "0";
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
    coreBtn.setAttribute("aria-label", "戻る");
    coreBtn.innerHTML = "←";
    coreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menuStack.length) {
        renderItems(menuStack.pop());
      } else {
        closeMenu();
      }
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
    renderItems(buildMenuData());
  }

  function closeMenu() {
    if (!menuEl) return;
    menuEl.classList.remove("active");
    isOpen = false;
    menuStack = [];
    var items = menuEl.querySelectorAll(".rm-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove("rendered");
    }
    if (coreBtn) coreBtn.classList.remove("visible");
  }

  function ensureFab() {
    if (document.querySelector(".menu-fab")) return;
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "menu-fab";
    fab.setAttribute("aria-label", "メニュー");
    fab.innerHTML = "☰";
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
    ov.addEventListener("click", closeHamburger);
    document.body.appendChild(ov);

    var panel = document.createElement("div");
    panel.id = "ham-panel";
    panel.innerHTML =
      '<div class="ham-header">' +
      '<div class="ham-title">G⁵ Portal</div>' +
      '<button type="button" class="ham-close" id="ham-close">✕</button>' +
      '</div><div id="ham-list"></div>';
    document.body.appendChild(panel);
    document.getElementById("ham-close").onclick = closeHamburger;
  }

  function openHamburger() {
    ensureHamburgerUI();
    closeMenu();
    pieDisabled = true;
    var list = document.getElementById("ham-list");
    list.innerHTML = "";
    buildMenuData().forEach(function (entry) {
      if (entry.items && entry.items.length) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ham-group-btn";
        btn.textContent = (entry.icon ? entry.icon + " " : "") + entry.label;
        var sub = document.createElement("div");
        sub.className = "ham-sub";
        entry.items.forEach(function (it) {
          var a = document.createElement("a");
          a.href = it.url || "#";
          a.textContent = (it.icon ? it.icon + " " : "") + it.label;
          a.addEventListener("click", function (e) {
            e.preventDefault();
            navigateWithDelay(it.url);
          });
          sub.appendChild(a);
        });
        btn.onclick = function () { sub.classList.toggle("open"); };
        list.appendChild(btn);
        list.appendChild(sub);
      } else {
        var a = document.createElement("a");
        a.className = "ham-link";
        a.href = entry.url || "#";
        a.textContent = (entry.icon ? entry.icon + " " : "") + entry.label;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          navigateWithDelay(entry.url);
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
          e.target.closest("#ham-overlay") ||
          e.target.closest(".pdf-toolbar") ||
          e.target.closest(".pdf-sidebar") ||
          e.target.closest(".pdf-annot-layer"))
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
