/**
 * G5 Portal · Calendar
 * Refresh: live Google Calendar ICS → events.json → local cache
 * Safe HTML description (br / a only) + type filter + search + easter egg
 */
(function () {
  "use strict";

  var ICS_URL =
    "https://calendar.google.com/calendar/ical/c_92306547d832f212203b39db04331ef15584f3b370d8d0d50317376f7723c116%40group.calendar.google.com/private-7b8b57d1a2538032e32bb0d9b5219155/basic.ics";

  var PROXY_URLS = [
    function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
    function (u) { return "https://corsproxy.io/?" + encodeURIComponent(u); },
    function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u); }
  ];

  var LOCAL_JSON = "events.json";
  var CACHE_KEY = "g5_cal_events_v9";
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var FETCH_TIMEOUT_MS = 16000;

  var EXAM_RE = /期末試験|期末テスト|中間試験|中間テスト|定期試験|定期テスト|模擬試験|模試/;
  var CEREMONY_RE = /^(終業式|始業式|修了式|卒業式)$/;
  var CTB_RE = /千葉トレイルブレイザーズ|\bCTB\b/i;
  var HOLIDAY_RE = /祝日|休日|休校|休講/;

  var statusEl = document.getElementById("cal-status");
  var toastEl = document.getElementById("toast");
  var btnRefresh = document.getElementById("btn-refresh");
  var btnToday = document.getElementById("btn-today");
  var calendarEl = document.getElementById("calendar");
  var searchEl = document.getElementById("cal-search");
  var filterEl = document.getElementById("cal-filters");
  var calendar = null;
  var toastTimer = null;
  var refreshing = false;
  var allEvents = [];
  var activeTypes = { default: true, ctb: true, exam: true, ceremony: true, holiday: true };
  var searchQuery = "";

  var TYPE_LABEL = { holiday: "休業", ctb: "CTB", exam: "試験", ceremony: "式典", default: "一般" };
  var TYPE_ORDER = ["default", "ctb", "exam", "ceremony", "holiday"];

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("ok", "err");
    if (kind) statusEl.classList.add(kind);
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || FETCH_TIMEOUT_MS);
    return fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
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
    } catch (e) { return null; }
  }

  function writeLsCache(events) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), events: events }));
    } catch (e) {}
  }

  function clearLsCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  function classifyEvent(title, description) {
    var t = String(title || "").trim();
    var blob = t + "\n" + String(description || "");
    if (HOLIDAY_RE.test(blob)) return "holiday";
    if (CTB_RE.test(blob)) return "ctb";
    if (EXAM_RE.test(t)) return "exam";
    if (CEREMONY_RE.test(t)) return "ceremony";
    return "default";
  }

  function decorateEvent(e) {
    var title = e.title || "(no title)";
    var description = (e.extendedProps && e.extendedProps.description) || e.description || "";
    var location = (e.extendedProps && e.extendedProps.location) || e.location || "";
    var type = classifyEvent(title, description);
    return {
      id: e.id,
      title: title,
      start: e.start,
      end: e.end,
      allDay: !!e.allDay,
      classNames: ["g5-ev", "g5-ev--" + type],
      extendedProps: { description: description, location: location, type: type }
    };
  }

  function normalizeEvents(list) {
    if (!Array.isArray(list)) return [];
    return list.map(decorateEvent);
  }

  function escapeHtml(str) {
    var out = "";
    var s = String(str == null ? "" : str);
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === "&") out += "&amp;";
      else if (c === "<") out += "&lt;";
      else if (c === ">") out += "&gt;";
      else if (c === '"') out += "&quot;";
      else out += c;
    }
    return out;
  }

  function stripHtml(html) {
    var s = String(html == null ? "" : html);
    s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
    s = s.replace(/<\s*\/\s*p\s*>/gi, "\n");
    s = s.replace(/<\s*p[^>]*>/gi, "");
    s = s.replace(/<\s*a\s[^>]*>([\s\S]*?)<\s*\/\s*a\s*>/gi, "$1");
    s = s.replace(/<[^>]+>/g, "");
    s = s.replace(/&nbsp;/gi, " ");
    s = s.replace(/&amp;/gi, "&");
    s = s.replace(/&lt;/gi, "<");
    s = s.replace(/&gt;/gi, ">");
    s = s.replace(/&quot;/gi, '"');
    s = s.replace(/&#39;/gi, "'");
    s = s.replace(/\n{3,}/g, "\n\n");
    return s.trim();
  }

  function isSafeHref(href) {
    if (!href) return false;
    var h = String(href).trim();
    if (/^https?:\/\//i.test(h)) return true;
    if (/^mailto:/i.test(h)) return true;
    return false;
  }

  function formatDescriptionHtml(raw) {
    var s = String(raw == null ? "" : raw);
    if (!s) return "";

    var looksHtml = /<\s*(br|a|p|div|span)\b/i.test(s);

    if (looksHtml) {
      var parts = [];
      var re = /<\s*br\s*\/?\s*>|<\s*a\s+([^>]*?)>([\s\S]*?)<\s*\/\s*a\s*>|([^<]+)|(<[^>]+>)/gi;
      var m;
      while ((m = re.exec(s)) !== null) {
        if (m[0].match(/^<\s*br/i)) {
          parts.push("<br>");
        } else if (m[1] !== undefined) {
          var attrs = m[1];
          var linkText = m[2];
          var hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i) ||
            attrs.match(/href\s*=\s*([^\s>]+)/i);
          var href = hrefMatch ? hrefMatch[1] : "";
          href = href.replace(/&amp;/g, "&");
          if (isSafeHref(href)) {
            parts.push(
              '<a href="' + escapeHtml(href) +
              '" target="_blank" rel="noopener noreferrer" class="cal-desc-link">' +
              escapeHtml(stripHtml(linkText) || href) +
              "</a>"
            );
          } else {
            parts.push(escapeHtml(stripHtml(linkText) || href));
          }
        } else if (m[3] !== undefined) {
          parts.push(linkifyPlain(escapeHtml(m[3])));
        } else {
          parts.push("");
        }
      }
      return parts.join("").replace(/(<br>\s*){3,}/g, "<br><br>");
    }

    var escaped = escapeHtml(s);
    escaped = linkifyPlain(escaped);
    escaped = escaped.replace(/\r\n|\r|\n/g, "<br>");
    return escaped;
  }

  function linkifyPlain(escapedText) {
    return escapedText.replace(
      /(https?:\/\/[^\s<&]+)/gi,
      function (url) {
        var clean = url.replace(/[.,;:!?)]+$/, "");
        var trail = url.slice(clean.length);
        return '<a href="' + clean + '" target="_blank" rel="noopener noreferrer" class="cal-desc-link">' +
          clean + "</a>" + trail;
      }
    );
  }

  function loadLocalJson() {
    var url = LOCAL_JSON + "?t=" + Date.now();
    return fetchWithTimeout(url, 8000)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var events = normalizeEvents(data.events || data);
        if (!events.length) throw new Error("empty local json");
        writeLsCache(events);
        return { events: events, source: "同期スナップ" };
      });
  }

  function icsToEvents(icsText) {
    if (typeof ICAL === "undefined") throw new Error("ical.js not loaded");
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
          if (end) endIso = end.toString();
          else {
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
        events.push(decorateEvent({
          id: ev.uid || undefined,
          title: ev.summary || "(no title)",
          start: startIso,
          end: endIso,
          allDay: allDay,
          description: ev.description || "",
          location: ev.location || ""
        }));
      } catch (err) {
        console.warn("[G5 cal] skip event", err);
      }
    });
    return events;
  }

  function fetchLiveIcs() {
    function tryOne(buildUrl) {
      var url = buildUrl(ICS_URL);
      return fetchWithTimeout(url, FETCH_TIMEOUT_MS)
        .then(function (res) { return res.text(); })
        .then(function (text) {
          if (!text || text.indexOf("BEGIN:VCALENDAR") < 0) throw new Error("Invalid ICS");
          return icsToEvents(text);
        });
    }

    var chain = Promise.reject(new Error("start"));
    chain = chain.catch(function () {
      return fetchWithTimeout(ICS_URL, 6000)
        .then(function (r) { return r.text(); })
        .then(function (t) {
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
      return { events: events, source: "Google Calendar" };
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
    var out = s.toLocaleDateString("ja-JP", optsDate) + " " + s.toLocaleTimeString("ja-JP", optsTime);
    if (e) {
      out += " – ";
      if (e.toDateString() !== s.toDateString()) out += e.toLocaleDateString("ja-JP", optsDate) + " ";
      out += e.toLocaleTimeString("ja-JP", optsTime);
    }
    return out;
  }

  function eventMatchesFilters(ev) {
    var type = (ev.extendedProps && ev.extendedProps.type) || "default";
    if (!activeTypes[type]) return false;
    if (!searchQuery) return true;
    var q = searchQuery.toLowerCase();
    var blob = (
      (ev.title || "") + " " +
      ((ev.extendedProps && ev.extendedProps.description) || "") + " " +
      ((ev.extendedProps && ev.extendedProps.location) || "") + " " +
      (TYPE_LABEL[type] || "")
    ).toLowerCase();
    blob = stripHtml(blob).toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function getFilteredEvents() {
    return allEvents.filter(eventMatchesFilters);
  }

  function reapplyCalendar() {
    if (!calendar) {
      initCalendar(getFilteredEvents());
      return;
    }
    calendar.removeAllEvents();
    calendar.addEventSource(getFilteredEvents());
    updateFilterCounts();
  }

  function updateFilterCounts() {
    if (!filterEl) return;
    var counts = { default: 0, ctb: 0, exam: 0, ceremony: 0, holiday: 0 };
    allEvents.forEach(function (ev) {
      var t = (ev.extendedProps && ev.extendedProps.type) || "default";
      if (counts[t] !== undefined) counts[t]++;
    });
    TYPE_ORDER.forEach(function (t) {
      var chip = filterEl.querySelector('[data-type="' + t + '"]');
      if (!chip) return;
      var countEl = chip.querySelector(".cal-filter-count");
      if (countEl) countEl.textContent = String(counts[t] || 0);
      chip.classList.toggle("is-off", !activeTypes[t]);
      chip.setAttribute("aria-pressed", activeTypes[t] ? "true" : "false");
    });
  }

  function buildFilters() {
    if (!filterEl) return;
    filterEl.innerHTML = "";
    TYPE_ORDER.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-filter-chip cal-filter-chip--" + t;
      btn.setAttribute("data-type", t);
      btn.setAttribute("aria-pressed", "true");
      btn.innerHTML =
        '<span class="cal-filter-dot"></span>' +
        '<span class="cal-filter-label">' + escapeHtml(TYPE_LABEL[t]) + "</span>" +
        '<span class="cal-filter-count">0</span>';
      btn.addEventListener("click", function () {
        activeTypes[t] = !activeTypes[t];
        reapplyCalendar();
      });
      filterEl.appendChild(btn);
    });
  }

  function openModal(info) {
    var ev = info.event;
    var type = (ev.extendedProps && ev.extendedProps.type) || "default";
    var backdrop = document.createElement("div");
    backdrop.className = "cal-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    var modal = document.createElement("div");
    modal.className = "cal-modal cal-modal--" + type;

    var badge = document.createElement("span");
    badge.className = "cal-type-badge cal-type-badge--" + type;
    badge.textContent = TYPE_LABEL[type] || type;
    modal.appendChild(badge);

    var title = document.createElement("h3");
    title.textContent = ev.title || "";
    modal.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "meta";
    meta.innerHTML = "<strong>日時</strong> " + escapeHtml(formatRange(ev.start, ev.end, ev.allDay));
    modal.appendChild(meta);

    var loc = ev.extendedProps && ev.extendedProps.location;
    if (loc) {
      var locEl = document.createElement("p");
      locEl.className = "meta";
      locEl.innerHTML = "<strong>場所</strong> " + escapeHtml(loc);
      modal.appendChild(locEl);
    }

    var desc = ev.extendedProps && ev.extendedProps.description;
    if (desc && String(desc).trim()) {
      var descEl = document.createElement("div");
      descEl.className = "desc";
      descEl.innerHTML = formatDescriptionHtml(desc);
      modal.appendChild(descEl);
    }

    var actions = document.createElement("div");
    actions.className = "modal-actions";

    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn-ghost";
    copyBtn.textContent = "コピー";
    copyBtn.addEventListener("click", function () {
      var lines = [];
      lines.push(ev.title || "");
      lines.push("日時: " + formatRange(ev.start, ev.end, ev.allDay));
      if (loc) lines.push("場所: " + loc);
      if (desc) lines.push("", stripHtml(desc));
      var text = lines.join("\n");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast("予定をコピーしました");
        }).catch(function () {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    });
    actions.appendChild(copyBtn);

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
    function onKey(e) { if (e.key === "Escape") close(); }
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", onKey);
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("予定をコピーしました");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
  }

  function initCalendar(events) {
    if (typeof FullCalendar === "undefined") {
      setStatus("FullCalendar 読み込み失敗", "err");
      return;
    }
    if (!calendarEl) {
      setStatus("#calendar missing", "err");
      return;
    }
    if (calendar) {
      calendar.destroy();
      calendar = null;
    }
    calendar = new FullCalendar.Calendar(calendarEl, {
      locale: "ja",
      initialView: window.matchMedia("(max-width: 640px)").matches ? "listMonth" : "dayGridMonth",
      headerToolbar: {
        left: "prev,next",
        center: "title",
        right: "dayGridMonth,dayGridWeek,listMonth"
      },
      buttonText: { today: "今日", month: "月", week: "週", list: "リスト" },
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
        var type = info.event.extendedProps && info.event.extendedProps.type;
        var tip = info.event.title || "";
        if (type && TYPE_LABEL[type]) tip = "[" + TYPE_LABEL[type] + "] " + tip;
        if (d) tip += "\n" + stripHtml(d);
        info.el.title = tip;
      }
    });
    calendar.render();
    updateFilterCounts();
  }

  function applyEvents(result, toastMsg) {
    allEvents = result.events || [];
    initCalendar(getFilteredEvents());
    var shown = getFilteredEvents().length;
    var total = allEvents.length;
    var statusText = total + " 件・" + result.source;
    if (shown !== total) statusText = shown + "/" + total + " 件・" + result.source;
    setStatus(statusText, "ok");
    if (toastMsg) showToast(toastMsg);
  }

  function refreshLiveFirst(showToastOnOk) {
    if (refreshing) return Promise.resolve();
    refreshing = true;
    setStatus("Google Calendar から取得中…", null);
    clearLsCache();

    return fetchLiveIcs()
      .then(function (r) {
        applyEvents(r, showToastOnOk ? "Google Calendar から更新（" + r.events.length + "件）" : null);
      })
      .catch(function (liveErr) {
        console.warn("[G5 cal] live failed", liveErr);
        setStatus("ライブ取得失敗 → 同期データ…", null);
        return loadLocalJson()
          .then(function (r) {
            applyEvents(r, showToastOnOk ? "同期データで更新（" + r.events.length + "件）" : null);
          })
          .catch(function () {
            var cached = readLsCache();
            if (cached && cached.length) {
              applyEvents(
                { events: normalizeEvents(cached), source: "キャッシュ" },
                showToastOnOk ? "キャッシュ表示" : null
              );
            } else if (!calendar) {
              setStatus("取得失敗", "err");
              allEvents = [];
              initCalendar([]);
              if (showToastOnOk) showToast("更新失敗");
            } else {
              var n = calendar.getEvents ? calendar.getEvents().length : 0;
              if (n) setStatus(n + " 件・オフライン表示", "err");
              if (showToastOnOk) showToast("更新失敗（オフライン）");
            }
          });
      })
      .then(function () { refreshing = false; });
  }

  function showStaleFast() {
    var cached = readLsCache();
    if (cached && cached.length) {
      applyEvents({ events: normalizeEvents(cached), source: "キャッシュ" });
      return Promise.resolve(true);
    }
    return loadLocalJson()
      .then(function (r) { applyEvents(r); return true; })
      .catch(function () { return false; });
  }

  function loadInitial() {
    setStatus("読み込み中…", null);
    return showStaleFast().then(function () {
      return loadLocalJson()
        .then(function (r) { applyEvents(r); })
        .catch(function () {})
        .then(function () {
          fetchLiveIcs()
            .then(function (r) {
              if (r && r.events && r.events.length) applyEvents(r, null);
            })
            .catch(function () {});
        });
    });
  }

  function triggerEasterEgg() {
    if (document.getElementById("g5-cal-egg")) return;
    var layer = document.createElement("div");
    layer.id = "g5-cal-egg";
    layer.className = "g5-cal-egg";
    layer.setAttribute("aria-hidden", "true");

    var stars = "";
    for (var i = 0; i < 48; i++) {
      var left = Math.random() * 100;
      var delay = Math.random() * 2.5;
      var size = 2 + Math.random() * 4;
      var hue = Math.random() > 0.5 ? "255,45,149" : "0,245,255";
      stars +=
        '<span class="g5-egg-star" style="left:' + left +
        "%;animation-delay:" + delay +
        "s;width:" + size + "px;height:" + size +
        "px;background:rgba(" + hue + ",0.95);box-shadow:0 0 8px rgba(" + hue + ",0.7)" +
        '"></span>';
    }

    layer.innerHTML =
      '<div class="g5-egg-core">' +
      '<div class="g5-egg-ring"></div>' +
      '<div class="g5-egg-ring g5-egg-ring--2"></div>' +
      '<p class="g5-egg-mark">G<sup>5</sup></p>' +
      '<p class="g5-egg-msg">時は味方 · Calendar never ends</p>' +
      "</div>" + stars;

    document.body.appendChild(layer);
    requestAnimationFrame(function () { layer.classList.add("open"); });
    showToast("✦ G⁵ Calendar · 発見おめでとう");

    setTimeout(function () {
      layer.classList.remove("open");
      setTimeout(function () {
        if (layer.parentNode) layer.parentNode.removeChild(layer);
      }, 600);
    }, 4200);
  }

  function setupEasterEgg() {
    var konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    var kIdx = 0;
    document.addEventListener("keydown", function (e) {
      if (e.keyCode === konami[kIdx]) {
        kIdx++;
        if (kIdx === konami.length) {
          kIdx = 0;
          triggerEasterEgg();
        }
      } else {
        kIdx = 0;
      }
    });

    var h1 = document.querySelector(".tool-header h1");
    var clicks = 0;
    var clickTimer = null;
    if (h1) {
      h1.style.cursor = "default";
      h1.title = "";
      h1.addEventListener("click", function () {
        clicks++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function () { clicks = 0; }, 3000);
        if (clicks >= 5) {
          clicks = 0;
          triggerEasterEgg();
        }
      });
    }

    var typed = "";
    document.addEventListener("keypress", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      typed += (e.key || "").toLowerCase();
      if (typed.length > 16) typed = typed.slice(-16);
      if (typed.indexOf("g5portal") !== -1) {
        typed = "";
        triggerEasterEgg();
      }
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", function () {
      refreshLiveFirst(true);
    });
  }
  if (btnToday) {
    btnToday.addEventListener("click", function () {
      if (calendar) calendar.today();
    });
  }
  if (searchEl) {
    var searchTimer = null;
    searchEl.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = (searchEl.value || "").trim();
        reapplyCalendar();
        var shown = getFilteredEvents().length;
        if (searchQuery) {
          setStatus(shown + " 件ヒット · 「" + searchQuery + "」", shown ? "ok" : "err");
        } else if (allEvents.length) {
          setStatus(allEvents.length + " 件", "ok");
        }
      }, 180);
    });
  }

  function boot() {
    if (typeof FullCalendar === "undefined") {
      setStatus("FullCalendar CDN failed", "err");
      return;
    }
    buildFilters();
    setupEasterEgg();
    loadInitial();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
