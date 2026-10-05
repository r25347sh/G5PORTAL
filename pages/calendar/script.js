/**
 * G⁵ Portal · Calendar
 * FullCalendar + ical.js
 * Primary: same-origin events.json (reliable)
 * Live: Google ICS via CORS proxy (on refresh)
 */
(function () {
  "use strict";

  var ICS_URL =
    "https://calendar.google.com/calendar/ical/c_92306547d832f212203b39db04331ef15584f3b370d8d0d50317376f7723c116%40group.calendar.google.com/private-7b8b57d1a2538032e32bb0d9b5219155/basic.ics";

  /* Working CORS proxies (legacy corsproxy.io / allorigins often fail) */
  var PROXY_URLS = [
    function (u) { return "https://cors.eu.org/" + u; },
    function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u); }
  ];

  var LOCAL_JSON = "events.json";
  var CACHE_KEY = "g5_cal_events_v2";
  var CACHE_TTL_MS = 30 * 60 * 1000;
  var FETCH_TIMEOUT_MS = 12000;

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

  function fetchWithTimeout(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, ms || FETCH_TIMEOUT_MS);
    return fetch(url, {
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res;
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function readLsCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ts || !Array.isArray(obj.events)) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.events;
    } catch (e) {
      return null;
    }
  }

  function writeLsCache(events) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), events: events })
      );
    } catch (e) {}
  }

  function normalizeEvents(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (e) {
      return {
        id: e.id,
        title: e.title || "(no title)",
        start: e.start,
        end: e.end,
        allDay: !!e.allDay,
        extendedProps: {
          description: (e.extendedProps && e.extendedProps.description) || e.description || "",
          location: (e.extendedProps && e.extendedProps.location) || e.location || ""
        }
      };
    });
  }

  function loadLocalJson() {
    return fetchWithTimeout(LOCAL_JSON, 8000)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var events = normalizeEvents(data.events || data);
        if (!events.length) throw new Error("empty local json");
        writeLsCache(events);
        return { events: events, source: "同期スナップ" };
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
          startIso = start.toString();
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

  function fetchLiveIcs() {
    function tryOne(buildUrl) {
      var url = buildUrl(ICS_URL);
      return fetchWithTimeout(url, FETCH_TIMEOUT_MS).then(function (res) {
        return res.text();
      }).then(function (text) {
        if (!text || text.indexOf("BEGIN:VCALENDAR") < 0) {
          throw new Error("Invalid ICS");
        }
        return icsToEvents(text);
      });
    }

    var chain = Promise.reject(new Error("start"));
    /* direct first (usually CORS-fails in browser) */
    chain = chain.catch(function () {
      return fetchWithTimeout(ICS_URL, 5000).then(function (r) { return r.text(); }).then(function (t) {
        if (!t || t.indexOf("BEGIN:VCALENDAR") < 0) throw new Error("bad");
        return icsToEvents(t);
      });
    });
    PROXY_URLS.forEach(function (builder) {
      chain = chain.catch(function () { return tryOne(builder); });
    });
    return chain.then(function (events) {
      if (!events.length) throw new Error("no events");
      writeLsCache(events);
      return { events: events, source: "ライブ" };
    });
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
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
      "<strong>日時</strong> " + formatRange(ev.start, ev.end, ev.allDay);
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
    requestAnimationFrame(function () { backdrop.classList.add("open"); });

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

  function initCalendar(events) {
    if (typeof FullCalendar === "undefined") {
      setStatus("FullCalendar 読み込み失敗", "err");
      return;
    }
    if (!calendarEl) {
      setStatus("#calendar が見つかりません", "err");
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
        var d = info.event.extendedProps && info.event.extendedProps.description;
        if (d) info.el.title = d;
      }
    });
    calendar.render();
  }

  function applyEvents(result, toastMsg) {
    initCalendar(result.events);
    setStatus(result.events.length + " 件・" + result.source, "ok");
    if (toastMsg) showToast(toastMsg);
  }

  /**
   * force=false: local JSON → LS cache (never hang on live ICS)
   * force=true: live ICS first, then local JSON fallback
   */
  function load(force) {
    setStatus("読み込み中…", null);

    if (!force) {
      return loadLocalJson()
        .then(function (r) { applyEvents(r); })
        .catch(function () {
          var cached = readLsCache();
          if (cached && cached.length) {
            applyEvents({ events: cached, source: "キャッシュ" });
            return;
          }
          /* last resort: try live once */
          return fetchLiveIcs()
            .then(function (r) { applyEvents(r); })
            .catch(function (err) {
              console.error("[G5 cal]", err);
              setStatus("取得失敗（events.json / プロキシ）", "err");
              initCalendar([]);
            });
        });
    }

    /* manual refresh: prefer live */
    return fetchLiveIcs()
      .then(function (r) {
        applyEvents(r, "更新しました");
      })
      .catch(function (err) {
        console.warn("[G5 cal] live failed", err);
        return loadLocalJson()
          .then(function (r) {
            applyEvents(r, "ライブ失敗・スナップを表示");
          })
          .catch(function () {
            var cached = readLsCache();
            if (cached && cached.length) {
              applyEvents({ events: cached, source: "キャッシュ" }, "オフラインキャッシュ");
            } else {
              setStatus("更新失敗", "err");
              showToast("取得できませんでした");
            }
          });
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

  function boot() {
    if (typeof FullCalendar === "undefined") {
      setStatus("FullCalendar CDN 読み込み失敗", "err");
      return;
    }
    load(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
