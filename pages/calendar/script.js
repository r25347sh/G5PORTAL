/**
 * G⁵ Portal · Calendar
 * FullCalendar + ical.js · Google Calendar ICS feed
 */
(function () {
  "use strict";

  var ICS_URL =
    "https://calendar.google.com/calendar/ical/c_92306547d832f212203b39db04331ef15584f3b370d8d0d50317376f7723c116%40group.calendar.google.com/private-7b8b57d1a2538032e32bb0d9b5219155/basic.ics";

  /* CORS proxy fallback (Google ICS has no ACAO header) */
  var PROXY_PREFIXES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url="
  ];

  var CACHE_KEY = "g5_cal_ics_v1";
  var CACHE_TTL_MS = 15 * 60 * 1000; /* 15 min */

  var statusEl = document.getElementById("cal-status");
  var toastEl = document.getElementById("toast");
  var btnRefresh = document.getElementById("btn-refresh");
  var btnToday = document.getElementById("btn-today");
  var calendarEl = document.getElementById("calendar");
  var calendar = null;
  var toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("ok", "err");
    if (kind) statusEl.classList.add(kind);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: data })
      );
    } catch (e) {
      /* quota / private mode */
    }
  }

  function fetchIcsText(force) {
    if (!force) {
      var cached = readCache();
      if (cached) return Promise.resolve({ text: cached, fromCache: true });
    }

    function tryFetch(url) {
      return fetch(url, { cache: "no-store" }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      });
    }

    /* 1) direct, 2) proxies */
    return tryFetch(ICS_URL)
      .catch(function () {
        return tryFetch(PROXY_PREFIXES[0] + encodeURIComponent(ICS_URL));
      })
      .catch(function () {
        return tryFetch(PROXY_PREFIXES[1] + encodeURIComponent(ICS_URL));
      })
      .then(function (text) {
        if (!text || text.indexOf("BEGIN:VCALENDAR") < 0) {
          throw new Error("Invalid ICS");
        }
        writeCache(text);
        return { text: text, fromCache: false };
      });
  }

  function icsToEvents(icsText) {
    if (typeof ICAL === "undefined") {
      throw new Error("ical.js not loaded");
    }
    var jcal = ICAL.parse(icsText);
    var comp = new ICAL.Component(jcal);
    var vevents = comp.getAllSubcomponents("vevent");
    var events = [];

    vevents.forEach(function (ve) {
      try {
        var ev = new ICAL.Event(ve);
        var start = ev.startDate;
        var end = ev.endDate;
        if (!start) return;

        var allDay = start.isDate;
        var startIso, endIso;

        if (allDay) {
          /* FullCalendar all-day: exclusive end */
          startIso = start.toString(); /* YYYY-MM-DD */
          if (end) {
            endIso = end.toString();
          } else {
            var d = start.toJSDate();
            d.setUTCDate(d.getUTCDate() + 1);
            endIso = d.toISOString().slice(0, 10);
          }
        } else {
          startIso = start.toJSDate().toISOString();
          endIso = end
            ? end.toJSDate().toISOString()
            : new Date(start.toJSDate().getTime() + 3600000).toISOString();
        }

        events.push({
          id: ev.uid || undefined,
          title: ev.summary || "(no title)",
          start: startIso,
          end: endIso,
          allDay: allDay,
          description: ev.description || "",
          location: ev.location || "",
          extendedProps: {
            description: ev.description || "",
            location: ev.location || ""
          }
        });
      } catch (err) {
        console.warn("[G5 cal] skip event", err);
      }
    });

    return events;
  }

  function formatRange(start, end, allDay) {
    if (!start) return "";
    var optsDate = { year: "numeric", month: "long", day: "numeric", weekday: "short" };
    var optsTime = { hour: "2-digit", minute: "2-digit" };
    var s = new Date(start);
    var e = end ? new Date(end) : null;

    if (allDay) {
      var sStr = s.toLocaleDateString("ja-JP", optsDate);
      if (!e) return sStr;
      /* exclusive end → display last inclusive day */
      var last = new Date(e.getTime() - 86400000);
      if (last.toDateString() === s.toDateString()) return sStr;
      return sStr + " – " + last.toLocaleDateString("ja-JP", optsDate);
    }

    var out =
      s.toLocaleDateString("ja-JP", optsDate) +
      " " +
      s.toLocaleTimeString("ja-JP", optsTime);
    if (e) {
      out += " – ";
      if (e.toDateString() !== s.toDateString()) {
        out += e.toLocaleDateString("ja-JP", optsDate) + " ";
      }
      out += e.toLocaleTimeString("ja-JP", optsTime);
    }
    return out;
  }

  function openModal(info) {
    var ev = info.event;
    var backdrop = document.createElement("div");
    backdrop.className = "cal-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");

    var modal = document.createElement("div");
    modal.className = "cal-modal";

    var title = document.createElement("h3");
    title.textContent = ev.title || "";
    modal.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "meta";
    meta.innerHTML =
      "<strong>日時</strong> " +
      formatRange(ev.start, ev.end, ev.allDay);
    modal.appendChild(meta);

    var loc = ev.extendedProps && ev.extendedProps.location;
    if (loc) {
      var locEl = document.createElement("p");
      locEl.className = "meta";
      locEl.innerHTML = "<strong>場所</strong> " + escapeHtml(loc);
      modal.appendChild(locEl);
    }

    var desc = ev.extendedProps && ev.extendedProps.description;
    if (desc) {
      var descEl = document.createElement("div");
      descEl.className = "desc";
      descEl.textContent = desc;
      modal.appendChild(descEl);
    }

    var actions = document.createElement("div");
    actions.className = "modal-actions";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-primary";
    closeBtn.textContent = "閉じる";
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    requestAnimationFrame(function () {
      backdrop.classList.add("open");
    });

    function close() {
      backdrop.classList.remove("open");
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }, 280);
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", onKey);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function initCalendar(events) {
    if (typeof FullCalendar === "undefined") {
      setStatus("FullCalendar 読み込み失敗", "err");
      return;
    }

    if (calendar) {
      calendar.destroy();
      calendar = null;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
      locale: "ja",
      initialView: window.matchMedia("(max-width: 640px)").matches
        ? "listMonth"
        : "dayGridMonth",
      headerToolbar: {
        left: "prev,next",
        center: "title",
        right: "dayGridMonth,listMonth"
      },
      buttonText: {
        today: "今日",
        month: "月",
        list: "リスト"
      },
      height: "auto",
      navLinks: true,
      editable: false,
      dayMaxEvents: 3,
      events: events,
      eventClick: function (info) {
        info.jsEvent.preventDefault();
        openModal(info);
      },
      eventDidMount: function (info) {
        if (info.event.extendedProps.description) {
          info.el.title = info.event.extendedProps.description;
        }
      }
    });

    calendar.render();
  }

  function load(force) {
    setStatus("読み込み中…", null);
    return fetchIcsText(!!force)
      .then(function (result) {
        var events = icsToEvents(result.text);
        initCalendar(events);
        var label =
          events.length +
          " 件・" +
          (result.fromCache ? "キャッシュ" : "最新");
        setStatus(label, "ok");
        if (force && !result.fromCache) showToast("更新しました");
      })
      .catch(function (err) {
        console.error("[G5 cal]", err);
        setStatus("取得失敗・キャッシュまたはプロキシを確認", "err");
        /* try stale cache as last resort */
        try {
          var raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            var obj = JSON.parse(raw);
            if (obj && obj.data) {
              var events = icsToEvents(obj.data);
              initCalendar(events);
              setStatus(events.length + " 件・古いキャッシュ", "err");
              showToast("オフラインキャッシュを表示");
            }
          }
        } catch (e2) {}
      });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      load(true);
    });
  }
  if (btnToday) {
    btnToday.addEventListener("click", function () {
      if (calendar) calendar.today();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      load(false);
    });
  } else {
    load(false);
  }
})();
