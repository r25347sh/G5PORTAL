/**
 * G⁵ Easter patch v5.1
 * - Subpage: no portal awaken FX (only soft toast 「時は味方 · Calendar never ends」)
 * - Console evolution: Tab autocomplete, history persist, date/echo/cal/pwd/id, better help
 * Loaded after easter-eggs.js by main.js
 */
(function () {
  "use strict";
  if (window.__G5_EASTER_PATCH__) return;
  window.__G5_EASTER_PATCH__ = true;

  function isSubPage() {
    return (location.pathname || "").indexOf("/pages/") >= 0;
  }

  function softToast(msg) {
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
    }, 2600);
  }

  function neutralizePortalFx() {
    if (!isSubPage()) return;
    document.querySelectorAll(".g5-easter-portal").forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    var toast = document.getElementById("g5-easter-toast");
    if (
      toast &&
      /ポータル覚醒|Portal sequence|G⁵ ポータル|portal awaken/i.test(
        toast.textContent || ""
      )
    ) {
      toast.textContent = "時は味方 · Calendar never ends";
    }
  }

  var CMD_LIST = [
    "help", "about", "version", "neofetch", "fortune", "status", "weather",
    "theme", "time", "date", "now", "ls", "whoami", "echo", "history",
    "demo", "sandbox", "gravity", "flow", "fractal", "games",
    "snake", "breakout", "matrix", "portal", "roll", "cal", "calendar",
    "clear", "exit", "close", "konami", "pwd", "id"
  ];

  function enhanceConsole() {
    if (!window.G5Easter) return false;
    var origPortal = window.G5Easter.portal;
    window.G5Easter.portal = function () {
      if (isSubPage()) {
        softToast("時は味方 · Calendar never ends");
        return;
      }
      if (typeof origPortal === "function") origPortal();
    };

    document.querySelectorAll(".tool-header h1, .tool-header .title").forEach(function (el) {
      if (el._g5patched) return;
      el._g5patched = true;
      var clone = el.cloneNode(true);
      if (el.parentNode) el.parentNode.replaceChild(clone, el);
    });

    return true;
  }

  function attachConsoleEnhancements() {
    var consoleEl = document.getElementById("g5-console");
    if (!consoleEl || consoleEl._g5v51) return;
    consoleEl._g5v51 = true;

    var input = document.getElementById("g5-console-input");
    var out = document.getElementById("g5-console-out");
    if (!input || !out) return;

    var hist = [];
    try {
      var raw = localStorage.getItem("g5_console_hist");
      if (raw) hist = JSON.parse(raw) || [];
    } catch (e) {}

    function println(html) {
      var line = document.createElement("div");
      line.className = "g5-console-row";
      line.innerHTML = html;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    function escapeHtml(s) {
      function e(n) { return String.fromCharCode(n); }
      return String(s).replace(/[\x26<>"]/g, function (c) {
        if (c.charCodeAt(0) === 38) return e(38) + e(97) + e(109) + e(112) + e(59);
        if (c === "<") return e(38) + e(108) + e(116) + e(59);
        if (c === ">") return e(38) + e(103) + e(116) + e(59);
        if (c === '"') return e(38) + e(113) + e(117) + e(111) + e(116) + e(59);
        return c;
      });
    }

    var EXTRA = {
      date: function () {
        return new Date().toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long"
        });
      },
      now: function () {
        return new Date().toLocaleString("ja-JP", { timeZoneName: "short" });
      },
      echo: function (args) {
        return (args || []).join(" ");
      },
      history: function () {
        if (!hist.length) return "(empty)";
        return hist
          .slice(-20)
          .map(function (h, i) {
            return String(i + 1).padStart(3) + "  " + h;
          })
          .join("\n");
      },
      pwd: function () {
        return location.pathname || "/";
      },
      id: function () {
        return "uid=0(guest) gid=0(g5) groups=5G";
      },
      cal: function () {
        if (isSubPage() && (location.pathname || "").indexOf("calendar") >= 0) {
          return "すでにカレンダーにいます · 時は味方";
        }
        var base = isSubPage() ? "../../" : "./";
        try {
          location.href = base + "pages/calendar/";
        } catch (e) {}
        return "Opening calendar…";
      },
      calendar: function () {
        return EXTRA.cal();
      },
      help: function () {
        return [
          "G⁵ Terminal v5.1 — commands:",
          "  help · about · version · neofetch · fortune · status · weather",
          "  theme · time · date · now · ls · whoami · echo · history · pwd",
          "  demo · sandbox · flow · fractal · games · snake · breakout",
          "  matrix · portal · roll · cal",
          "  clear · exit · konami",
          "Tab で補完 · ↑↓ で履歴 · Ctrl+` で開閉"
        ].join("\n");
      }
    };

    input.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Tab") {
          e.preventDefault();
          e.stopImmediatePropagation();
          var v = input.value;
          var parts = v.split(/\s+/);
          if (parts.length > 1) return;
          var prefix = (parts[0] || "").toLowerCase();
          if (!prefix) return;
          var matches = CMD_LIST.filter(function (c) {
            return c.indexOf(prefix) === 0;
          });
          if (matches.length === 1) {
            input.value = matches[0];
          } else if (matches.length > 1) {
            println("<span class='g5-c-cmd'>" + matches.join("  ") + "</span>");
            var common = matches[0];
            for (var i = 1; i < matches.length; i++) {
              while (common && matches[i].indexOf(common) !== 0) {
                common = common.slice(0, -1);
              }
            }
            if (common && common.length > prefix.length) input.value = common;
          }
          return;
        }

        if (e.key === "Enter") {
          var line = String(input.value || "").trim();
          if (!line) return;
          var parts = line.split(/\s+/);
          var cmd = parts[0].toLowerCase();
          var args = parts.slice(1);
          if (EXTRA[cmd]) {
            e.preventDefault();
            e.stopImmediatePropagation();
            input.value = "";
            hist.push(line);
            if (hist.length > 80) hist = hist.slice(-80);
            try {
              localStorage.setItem("g5_console_hist", JSON.stringify(hist.slice(-40)));
            } catch (err) {}
            println("<span class='g5-c-ps'>g5" + String.fromCharCode(62) + "</span> " + escapeHtml(line));
            var outText = EXTRA[cmd](args);
            if (outText != null) {
              println(escapeHtml(outText).replace(/\n/g, "<br>"));
            }
          } else {
            hist.push(line);
            if (hist.length > 80) hist = hist.slice(-80);
            try {
              localStorage.setItem("g5_console_hist", JSON.stringify(hist.slice(-40)));
            } catch (err) {}
          }
        }
      },
      true
    );
  }

  function tryPatch(n) {
    enhanceConsole();
    attachConsoleEnhancements();
    if (n > 80) return;
    setTimeout(function () {
      tryPatch(n + 1);
    }, 120);
  }

  tryPatch(0);

  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function () {
      neutralizePortalFx();
      attachConsoleEnhancements();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (isSubPage()) {
    setInterval(neutralizePortalFx, 500);
  }
})();
