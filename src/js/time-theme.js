/**
 * G⁵ Portal — time-theme.js
 * 時間帯・天気連動（ナイトラグジュアリー演出）
 * 天気座標: リアルタイム現在地（失敗時は東京）
 * Open-Meteo は HTTPS / body に filter なし
 */
(function () {
  'use strict';

  var ROOT = document.documentElement;
  var BODY = document.body;
  var LAT = 35.6812;
  var LON = 139.7671;
  var lastWeather = null;
  var geoReady = false;

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
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function palette(period, kind, isDay, temp) {
    var base = {
      dawn: { bg: '#12081a', accent: '#ff6bb5', glow: 'rgba(255,120,180,0.45)', lab: '#00f5ff' },
      morning: { bg: '#0a0c18', accent: '#ff2d95', glow: 'rgba(0,245,255,0.28)', lab: '#00f5ff' },
      noon: { bg: '#0c0814', accent: '#ff2d95', glow: 'rgba(255,215,0,0.28)', lab: '#ffd700' },
      afternoon: { bg: '#140a12', accent: '#ff4d8d', glow: 'rgba(255,100,60,0.32)', lab: '#ffd700' },
      dusk: { bg: '#120616', accent: '#ff2d95', glow: 'rgba(255,45,149,0.5)', lab: '#9b5de5' },
      night: { bg: '#07050f', accent: '#ff2d95', glow: 'rgba(155,93,229,0.42)', lab: '#00f5ff' },
      late: { bg: '#05040c', accent: '#e91e8c', glow: 'rgba(155,93,229,0.38)', lab: '#9b5de5' }
    };
    var b = base[period] || base.night;

    if (kind === 'rain' || kind === 'rain-heavy') {
      b.glow = 'rgba(0,245,255,0.35)';
      b.lab = '#00f5ff';
    } else if (kind === 'storm') {
      b.glow = 'rgba(155,93,229,0.55)';
      b.accent = '#c77dff';
    } else if (kind === 'snow') {
      b.glow = 'rgba(255,200,230,0.35)';
      b.lab = '#ffd700';
    } else if (kind === 'fog') {
      b.glow = 'rgba(255,180,220,0.3)';
    } else if (kind === 'clear' && isDay) {
      b.glow = 'rgba(255,215,0,0.4)';
      b.lab = '#ffd700';
    }

    if (typeof temp === 'number' && temp >= 30) {
      b.accent = '#ff4d6d';
      b.glow = 'rgba(255,80,100,0.4)';
    }

    return {
      bg: b.bg,
      accent: b.accent,
      cyan: '#00f5ff',
      gold: '#ffd700',
      purple: '#9b5de5',
      glow: b.glow,
      lab: b.lab,
      period: period,
      weather: kind,
      isDay: !!isDay,
      temp: temp
    };
  }

  function apply(p) {
    ROOT.style.setProperty('--bg-deep', p.bg);
    ROOT.style.setProperty('--pink', p.accent);
    ROOT.style.setProperty('--pink-soft', hexToRgba(p.accent, 0.45));
    ROOT.style.setProperty('--g5-glow', p.glow);
    ROOT.style.setProperty('--cyan', p.cyan);
    ROOT.style.setProperty('--gold', p.gold);
    ROOT.style.setProperty('--purple', p.purple);

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
      layer.style.display = '';
      syncBubbles(layer, p);
    }

    updateBadge(p);
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
        'color:rgba(245,240,255,0.55);pointer-events:none;' +
        'padding:0.25rem 0.7rem;border-radius:999px;' +
        'background:rgba(7,5,15,0.45);border:1px solid rgba(255,255,255,0.08);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(badge);
    }
  }

  function requestGeo() {
    if (!navigator.geolocation) {
      fetchWeather();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        LAT = pos.coords.latitude;
        LON = pos.coords.longitude;
        geoReady = true;
        try {
          sessionStorage.setItem('g5-geo', JSON.stringify({
            t: Date.now(), lat: LAT, lon: LON
          }));
        } catch (e) {}
        fetchWeather();
      },
      function () {
        try {
          var c = sessionStorage.getItem('g5-geo');
          if (c) {
            var o = JSON.parse(c);
            if (o && o.lat != null && Date.now() - o.t < 60 * 60 * 1000) {
              LAT = o.lat;
              LON = o.lon;
              geoReady = true;
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.G5Theme = {
    tick: tick,
    fetchWeather: fetchWeather,
    setCoords: function (lat, lon) {
      LAT = lat;
      LON = lon;
      geoReady = true;
      fetchWeather();
    }
  };
})();
