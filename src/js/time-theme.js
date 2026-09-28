/**
 * G⁵ Portal — time-theme.js
 * 時間帯・天気連動 + ガラス雨粒 + 希少流れ星
 * 天気: リアルタイム現在地 / Open-Meteo HTTPS
 */
(function () {
  'use strict';

  var ROOT = document.documentElement;
  var BODY = document.body;
  var LAT = 35.6812;
  var LON = 139.7671;
  var lastWeather = null;
  var geoReady = false;
  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function weatherUrl() {
    return (
      'https://api.open-meteo.com/v1/forecast?latitude=' + LAT +
      '&longitude=' + LON +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m' +
      '&timezone=auto'
    );
  }

  function getLocalHours() {
    var d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  function periodFromHours(hours) {
    if (hours >= 4.5 && hours < 6.5) return 'dawn';
    if (hours >= 6.5 && hours < 10) return 'morning';
    if (hours >= 10 && hours < 15) return 'noon';
    if (hours >= 15 && hours < 17.5) return 'afternoon';
    if (hours >= 17.5 && hours < 19.5) return 'dusk';
    if (hours >= 19.5 && hours < 22.5) return 'night';
    return 'late';
  }

  function weatherKind(code, precip, cloud) {
    if (code == null) return 'unknown';
    if (code === 0) return 'clear';
    if (code <= 3) return cloud >= 70 ? 'cloudy' : 'partly';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 67) return precip > 2 ? 'rain-heavy' : 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloudy';
  }

  function hexToRgba(hex, a) {
    var h = (hex || '#ff2d95').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return 'rgba(255,45,149,' + a + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function isLightScheme() {
    if (window.G5ThemeControl && window.G5ThemeControl.getScheme) {
      return window.G5ThemeControl.getScheme() === 'light';
    }
    return ROOT.getAttribute('data-color-scheme') === 'light';
  }

  function palette(period, kind, isDay, temp) {
    var light = isLightScheme();
    var baseDark = {
      dawn: { bg: '#12081a', accent: '#ff6bb5', glow: 'rgba(255,120,180,0.45)' },
      morning: { bg: '#0a0c18', accent: '#ff2d95', glow: 'rgba(0,245,255,0.28)' },
      noon: { bg: '#0c0814', accent: '#ff2d95', glow: 'rgba(255,215,0,0.28)' },
      afternoon: { bg: '#140a12', accent: '#ff4d8d', glow: 'rgba(255,100,60,0.32)' },
      dusk: { bg: '#120616', accent: '#ff2d95', glow: 'rgba(255,45,149,0.5)' },
      night: { bg: '#07050f', accent: '#ff2d95', glow: 'rgba(155,93,229,0.42)' },
      late: { bg: '#05040c', accent: '#e91e8c', glow: 'rgba(155,93,229,0.38)' }
    };
    var baseLight = {
      dawn: { bg: '#f6eef5', accent: '#e91e8c', glow: 'rgba(233,30,140,0.2)' },
      morning: { bg: '#f2f4fa', accent: '#e91e8c', glow: 'rgba(0,153,184,0.15)' },
      noon: { bg: '#f5f0fa', accent: '#e91e8c', glow: 'rgba(201,162,39,0.18)' },
      afternoon: { bg: '#f7efe8', accent: '#d63384', glow: 'rgba(255,100,60,0.15)' },
      dusk: { bg: '#f3e8f4', accent: '#e91e8c', glow: 'rgba(233,30,140,0.22)' },
      night: { bg: '#ebe4f4', accent: '#c2185b', glow: 'rgba(123,63,212,0.18)' },
      late: { bg: '#e8e2f0', accent: '#ad1457', glow: 'rgba(123,63,212,0.16)' }
    };
    var map = light ? baseLight : baseDark;
    var b = map[period] || map.night;

    if (kind === 'rain' || kind === 'rain-heavy') b.glow = light ? 'rgba(0,120,180,0.2)' : 'rgba(0,245,255,0.35)';
    else if (kind === 'storm') { b.glow = light ? 'rgba(123,63,212,0.25)' : 'rgba(155,93,229,0.55)'; b.accent = light ? '#7b3fd4' : '#c77dff'; }
    else if (kind === 'snow') b.glow = light ? 'rgba(200,180,220,0.25)' : 'rgba(255,200,230,0.35)';
    else if (kind === 'clear' && isDay) b.glow = light ? 'rgba(201,162,39,0.22)' : 'rgba(255,215,0,0.4)';

    if (typeof temp === 'number' && temp >= 30) {
      b.accent = light ? '#d6336c' : '#ff4d6d';
    }

    return {
      bg: b.bg,
      accent: b.accent,
      cyan: light ? '#0099b8' : '#00f5ff',
      gold: light ? '#c9a227' : '#ffd700',
      purple: light ? '#7b3fd4' : '#9b5de5',
      glow: b.glow,
      period: period,
      weather: kind,
      isDay: !!isDay,
      temp: temp
    };
  }

  function apply(p) {
    /* ライト時は CSS の data-color-scheme に任せる部分を尊重 */
    if (!isLightScheme()) {
      ROOT.style.setProperty('--bg-deep', p.bg);
      ROOT.style.setProperty('--pink', p.accent);
      ROOT.style.setProperty('--pink-soft', hexToRgba(p.accent, 0.45));
      ROOT.style.setProperty('--cyan', p.cyan);
      ROOT.style.setProperty('--gold', p.gold);
      ROOT.style.setProperty('--purple', p.purple);
    } else {
      ROOT.style.setProperty('--pink', p.accent);
      ROOT.style.setProperty('--pink-soft', hexToRgba(p.accent, 0.2));
    }
    ROOT.style.setProperty('--g5-glow', p.glow);

    ROOT.dataset.period = p.period;
    ROOT.dataset.weather = p.weather;
    if (p.temp != null) ROOT.dataset.temp = String(Math.round(p.temp));

    if (BODY) {
      BODY.dataset.period = p.period;
      BODY.dataset.weather = p.weather;
      BODY.classList.toggle('is-day', p.isDay);
      BODY.classList.toggle('is-night', !p.isDay);
    }

    var layer = document.getElementById('g5-atmosphere');
    if (layer) {
      layer.className =
        'g5-atmosphere wx-' + p.weather +
        ' pd-' + p.period +
        (p.isDay ? ' day' : ' night');
      syncBubbles(layer, p);
    }

    syncRainGlass(p);
    updateBadge(p);
  }

  /* ---------- ガラス雨粒 ---------- */
  function ensureRainGlass() {
    var el = document.getElementById('g5-rain-glass');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'g5-rain-glass';
    el.className = 'g5-rain-glass';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  function clearRainGlass() {
    var el = document.getElementById('g5-rain-glass');
    if (el) el.innerHTML = '';
  }

  function spawnDrop(container, heavy) {
    if (reducedMotion) return;
    var drop = document.createElement('div');
    var size = heavy ? (8 + Math.random() * 16) : (5 + Math.random() * 12);
    drop.className = 'g5-drop' + (Math.random() < (heavy ? 0.45 : 0.28) ? ' is-drip' : '');
    drop.style.width = size + 'px';
    drop.style.height = size * (1.15 + Math.random() * 0.35) + 'px';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.top = Math.random() * 92 + '%';
    drop.style.setProperty('--drip-dur', (3.2 + Math.random() * 4.5) + 's');
    drop.style.setProperty('--drip-delay', (0.4 + Math.random() * 2.5) + 's');
    drop.style.setProperty('--drip-dist', (24 + Math.random() * 70) + 'px');
    container.appendChild(drop);

    /* 垂れるものは跡を残す */
    if (drop.classList.contains('is-drip')) {
      setTimeout(function () {
        if (!drop.parentNode) return;
        var trail = document.createElement('div');
        trail.className = 'g5-drop-trail';
        trail.style.left = drop.style.left;
        trail.style.top = drop.style.top;
        trail.style.height = (30 + Math.random() * 50) + 'px';
        container.appendChild(trail);
        setTimeout(function () { if (trail.parentNode) trail.remove(); }, 3000);
      }, 900);
    }

    var life = drop.classList.contains('is-drip')
      ? 5000 + Math.random() * 4000
      : 3500 + Math.random() * 5000;
    setTimeout(function () {
      if (drop.parentNode) {
        drop.style.transition = 'opacity 0.8s ease';
        drop.style.opacity = '0';
        setTimeout(function () { if (drop.parentNode) drop.remove(); }, 850);
      }
    }, life);
  }

  var rainTimer = null;
  function syncRainGlass(p) {
    var raining = p.weather === 'rain' || p.weather === 'rain-heavy' || p.weather === 'storm';
    if (!raining) {
      if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
      clearRainGlass();
      return;
    }
    var box = ensureRainGlass();
    var heavy = p.weather === 'rain-heavy' || p.weather === 'storm';
    if (!rainTimer) {
      /* 初期付着 */
      var n = heavy ? 28 : 16;
      for (var i = 0; i < n; i++) spawnDrop(box, heavy);
      rainTimer = setInterval(function () {
        if (document.hidden) return;
        var c = heavy ? 3 : 2;
        for (var j = 0; j < c; j++) spawnDrop(box, heavy);
        /* 上限 */
        while (box.children.length > (heavy ? 55 : 36)) {
          if (box.firstChild) box.removeChild(box.firstChild);
        }
      }, heavy ? 420 : 700);
    }
  }

  /* ---------- 流れ星（夜のみ・希少） ---------- */
  function spawnShootingStar() {
    if (reducedMotion || document.hidden) return;
    var star = document.createElement('div');
    star.className = 'g5-shooting-star';
    var startX = 5 + Math.random() * 70;
    var startY = 2 + Math.random() * 35;
    star.style.left = startX + 'vw';
    star.style.top = startY + 'vh';
    var angle = -18 - Math.random() * 28;
    var dist = 180 + Math.random() * 220;
    var rad = (angle * Math.PI) / 180;
    star.style.setProperty('--shoot-angle', angle + 'deg');
    star.style.setProperty('--shoot-x', Math.cos(rad) * dist + 'px');
    star.style.setProperty('--shoot-y', Math.sin(rad) * dist + 'px');
    document.body.appendChild(star);
    setTimeout(function () { if (star.parentNode) star.remove(); }, 1000);
  }

  function shootingStarLoop() {
    /* 8〜25秒ごとに判定、夜帯のみ約 8〜12% の確率 */
    var delay = 8000 + Math.random() * 17000;
    setTimeout(function () {
      var period = ROOT.dataset.period;
      var night = period === 'night' || period === 'late' || period === 'dusk';
      if (night && Math.random() < 0.11) {
        spawnShootingStar();
        /* ごく稀に連続2発 */
        if (Math.random() < 0.15) {
          setTimeout(spawnShootingStar, 400 + Math.random() * 600);
        }
      }
      shootingStarLoop();
    }, delay);
  }

  function syncBubbles(layer, p) {
    var existing = layer.querySelector('.g5-bubbles');
    var want = !p.isDay && (p.weather === 'clear' || p.weather === 'partly' ||
      p.period === 'night' || p.period === 'late' || p.period === 'dusk');
    if (!want) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var box = document.createElement('div');
    box.className = 'g5-bubbles';
    for (var i = 0; i < 10; i++) {
      var b = document.createElement('div');
      b.className = 'g5-bubble';
      var size = 6 + Math.random() * 14;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = Math.random() * 100 + '%';
      b.style.animationDuration = 8 + Math.random() * 14 + 's';
      b.style.animationDelay = Math.random() * 8 + 's';
      box.appendChild(b);
    }
    layer.appendChild(box);
  }

  function updateBadge(p) {
    var el = document.getElementById('g5-wx-badge');
    if (!el) return;
    var labels = {
      clear: 'Clear', partly: 'Partly', cloudy: 'Cloudy', fog: 'Fog',
      rain: 'Rain', 'rain-heavy': 'Heavy Rain', snow: 'Snow', storm: 'Storm', unknown: '—'
    };
    var t = p.temp != null ? Math.round(p.temp) + '°' : '';
    var geo = geoReady ? ' · LOC' : '';
    el.textContent = (labels[p.weather] || p.weather) + (t ? ' ' + t : '') + ' · ' + p.period + geo;
  }

  function tick() {
    var hours = getLocalHours();
    var period = periodFromHours(hours);
    var w = lastWeather || {};
    var kind = weatherKind(w.weather_code, w.precipitation, w.cloud_cover);
    var isDay = w.is_day != null ? !!w.is_day : (hours >= 6 && hours < 18);
    var p = palette(period, kind, isDay, w.temperature_2m);
    apply(p);
    return p;
  }

  function fetchWeather() {
    return fetch(weatherUrl())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.current) {
          lastWeather = data.current;
          tick();
          try {
            sessionStorage.setItem('g5-wx', JSON.stringify({
              t: Date.now(), c: data.current, lat: LAT, lon: LON
            }));
          } catch (e) {}
        }
      })
      .catch(function () { tick(); });
  }

  function ensureLayers() {
    if (!document.getElementById('g5-period-overlay')) {
      var ov = document.createElement('div');
      ov.id = 'g5-period-overlay';
      ov.className = 'g5-period-overlay';
      ov.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(ov, document.body.firstChild);
    }
    if (!document.getElementById('g5-atmosphere')) {
      var el = document.createElement('div');
      el.id = 'g5-atmosphere';
      el.className = 'g5-atmosphere';
      el.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(el, document.body.firstChild);
    }
    if (!document.getElementById('g5-wx-badge')) {
      var badge = document.createElement('div');
      badge.id = 'g5-wx-badge';
      badge.setAttribute('aria-live', 'polite');
      badge.style.cssText =
        'position:fixed;top:max(0.5rem,env(safe-area-inset-top));' +
        'left:50%;transform:translateX(-50%);z-index:50;' +
        'font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;' +
        'color:var(--text-muted);pointer-events:none;' +
        'padding:0.25rem 0.7rem;border-radius:999px;' +
        'background:var(--bg-card);border:1px solid var(--border);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(badge);
    }
  }

  function requestGeo() {
    if (!navigator.geolocation) { fetchWeather(); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        LAT = pos.coords.latitude;
        LON = pos.coords.longitude;
        geoReady = true;
        try {
          sessionStorage.setItem('g5-geo', JSON.stringify({ t: Date.now(), lat: LAT, lon: LON }));
        } catch (e) {}
        fetchWeather();
      },
      function () {
        try {
          var c = sessionStorage.getItem('g5-geo');
          if (c) {
            var o = JSON.parse(c);
            if (o && o.lat != null && Date.now() - o.t < 60 * 60 * 1000) {
              LAT = o.lat; LON = o.lon; geoReady = true;
            }
          }
        } catch (e) {}
        fetchWeather();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  function boot() {
    ensureLayers();
    try {
      var cached = sessionStorage.getItem('g5-wx');
      if (cached) {
        var o = JSON.parse(cached);
        if (o && o.c && Date.now() - o.t < 15 * 60 * 1000) {
          lastWeather = o.c;
          if (o.lat != null) { LAT = o.lat; LON = o.lon; geoReady = true; }
        }
      }
    } catch (e) {}
    tick();
    requestGeo();
    setInterval(tick, 30000);
    setInterval(fetchWeather, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { tick(); fetchWeather(); }
    });
    document.addEventListener('g5-theme-change', function () { tick(); });
    shootingStarLoop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.G5Theme = {
    tick: tick,
    fetchWeather: fetchWeather,
    setCoords: function (lat, lon) {
      LAT = lat; LON = lon; geoReady = true; fetchWeather();
    },
    spawnShootingStar: spawnShootingStar
  };
})();
