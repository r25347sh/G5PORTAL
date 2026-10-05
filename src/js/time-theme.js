/**
 * G⁵ Portal — time-theme.js
 * 時間帯・天気連動 + 各天気別アニメーション（雨粒・雪・霧・稲妻・流れ星）
 * data-atmosphere="off" のときは演出・取得を抑制
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
  var rainTimer = null; /* legacy alias target */
  var particleTimer = null;
  var currentParticleMode = null;
  var starLoopActive = true;

  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function atmosphereOn() {
    if (window.G5ThemeControl && typeof window.G5ThemeControl.isAtmosphereEnabled === 'function') {
      return window.G5ThemeControl.isAtmosphereEnabled();
    }
    return ROOT.getAttribute('data-atmosphere') !== 'off';
  }

  function weatherUrl() {
    return (
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      LAT +
      '&longitude=' +
      LON +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
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

  function palette(period, kind, isDay, temp, windSpeed, windDir, gusts) {
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
      dawn: { bg: '#fcfafc', accent: '#e91e8c', glow: 'rgba(233,30,140,0.08)' },
      morning: { bg: '#fafbfd', accent: '#e91e8c', glow: 'rgba(0,136,168,0.06)' },
      noon: { bg: '#fbfafc', accent: '#e91e8c', glow: 'rgba(184,148,31,0.07)' },
      afternoon: { bg: '#fcfaf8', accent: '#d63384', glow: 'rgba(255,100,60,0.06)' },
      dusk: { bg: '#fbf8fc', accent: '#e91e8c', glow: 'rgba(233,30,140,0.09)' },
      night: { bg: '#f8f6fb', accent: '#c2185b', glow: 'rgba(123,63,212,0.07)' },
      late: { bg: '#f7f5fa', accent: '#ad1457', glow: 'rgba(123,63,212,0.06)' }
    };
    var map = light ? baseLight : baseDark;
    var b = map[period] || map.night;

    if (kind === 'rain' || kind === 'rain-heavy') b.glow = light ? 'rgba(0,120,180,0.1)' : 'rgba(0,245,255,0.35)';
    else if (kind === 'storm') {
      b.glow = light ? 'rgba(123,63,212,0.12)' : 'rgba(155,93,229,0.55)';
      b.accent = light ? '#7b3fd4' : '#c77dff';
    } else if (kind === 'snow') b.glow = light ? 'rgba(180,190,220,0.1)' : 'rgba(255,200,230,0.35)';
    else if (kind === 'clear' && isDay) b.glow = light ? 'rgba(184,148,31,0.08)' : 'rgba(255,215,0,0.4)';
    else if (kind === 'fog') b.glow = light ? 'rgba(160,160,190,0.08)' : 'rgba(180,170,220,0.28)';

    if (typeof temp === 'number' && temp >= 30) {
      b.accent = light ? '#d6336c' : '#ff4d6d';
    }

    var wind = typeof windSpeed === 'number' ? windSpeed : 0;
    var intensity = 'normal';
    if (kind === 'storm' || (kind === 'rain-heavy' && wind > 12) || wind > 18) intensity = 'strong';
    else if (kind === 'rain' && wind < 4) intensity = 'light';
    else if (kind === 'snow' && wind > 10) intensity = 'strong';

    return {
      bg: b.bg,
      accent: b.accent,
      cyan: light ? '#0088a8' : '#00f5ff',
      gold: light ? '#b8941f' : '#ffd700',
      purple: light ? '#7b3fd4' : '#9b5de5',
      glow: b.glow,
      period: period,
      weather: kind,
      isDay: !!isDay,
      temp: temp,
      windSpeed: wind,
      windDir: typeof windDir === 'number' ? windDir : 0,
      gusts: typeof gusts === 'number' ? gusts : wind,
      intensity: intensity
    };
  }

  function apply(p) {
    if (!atmosphereOn()) {
      stopParticles();
      return;
    }

    if (!isLightScheme()) {
      ROOT.style.setProperty('--bg-deep', p.bg);
      ROOT.style.setProperty('--pink', p.accent);
      ROOT.style.setProperty('--pink-soft', hexToRgba(p.accent, 0.45));
      ROOT.style.setProperty('--cyan', p.cyan);
      ROOT.style.setProperty('--gold', p.gold);
      ROOT.style.setProperty('--purple', p.purple);
    } else {
      ROOT.style.setProperty('--pink', p.accent);
      ROOT.style.setProperty('--pink-soft', hexToRgba(p.accent, 0.14));
      ROOT.style.removeProperty('--bg-deep');
    }
    ROOT.style.setProperty('--g5-glow', p.glow);

    /* 風ベクトル（CSSで粒子が参照） */
    var rad = ((p.windDir || 0) - 90) * Math.PI / 180; // 気象学の風向 → 画面上の流れ
    var strength = Math.min(1.8, (p.windSpeed || 0) / 12);
    ROOT.style.setProperty('--wx-wind-x', (Math.cos(rad) * strength).toFixed(3));
    ROOT.style.setProperty('--wx-wind-y', (Math.sin(rad) * strength * 0.6).toFixed(3));
    ROOT.style.setProperty('--wx-wind-speed', (p.windSpeed || 0).toFixed(1));
    ROOT.style.setProperty('--wx-intensity', p.intensity || 'normal');

    ROOT.dataset.period = p.period;
    ROOT.dataset.weather = p.weather;
    ROOT.dataset.intensity = p.intensity || 'normal';
    if (p.temp != null) ROOT.dataset.temp = String(Math.round(p.temp));

    if (BODY) {
      BODY.dataset.period = p.period;
      BODY.dataset.weather = p.weather;
      BODY.dataset.intensity = p.intensity || 'normal';
      BODY.classList.toggle('is-day', p.isDay);
      BODY.classList.toggle('is-night', !p.isDay);
    }

    var layer = document.getElementById('g5-atmosphere');
    if (layer) {
      layer.className =
        'g5-atmosphere wx-' +
        p.weather +
        ' pd-' +
        p.period +
        ' intensity-' + (p.intensity || 'normal') +
        (p.isDay ? ' day' : ' night');
      syncBubbles(layer, p);
    }

    syncWeatherParticles(p);
    updateBadge(p);
  }

  function ensureParticleLayer() {
    var el = document.getElementById('g5-wx-particles');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'g5-wx-particles';
    el.className = 'g5-wx-particles';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  function clearParticles() {
    var el = document.getElementById('g5-wx-particles');
    if (el) el.innerHTML = '';
  }

  function stopParticles() {
    if (particleTimer) {
      clearInterval(particleTimer);
      particleTimer = null;
    }
    currentParticleMode = null;
    clearParticles();
  }

  /* backward compat alias */
  function stopRain() { stopParticles(); }

  function getWindOffset() {
    var wx = parseFloat(ROOT.style.getPropertyValue('--wx-wind-x')) || 0;
    var wy = parseFloat(ROOT.style.getPropertyValue('--wx-wind-y')) || 0;
    return { x: wx, y: wy };
  }

  function spawnRainDrop(container, heavy, intensity) {
    if (reducedMotion || !atmosphereOn()) return;
    var wind = getWindOffset();
    var drop = document.createElement('div');
    var size = heavy ? 7 + Math.random() * 14 : 4 + Math.random() * 10;
    drop.className = 'g5-drop' + (Math.random() < (heavy ? 0.4 : 0.22) ? ' is-drip' : '');
    drop.style.width = size + 'px';
    drop.style.height = size * (1.2 + Math.random() * 0.4) + 'px';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.top = Math.random() * 90 + '%';
    drop.style.setProperty('--drip-dur', (heavy ? 2.4 : 3.4) + Math.random() * 3.5 + 's');
    drop.style.setProperty('--drip-delay', 0.3 + Math.random() * 2 + 's');
    drop.style.setProperty('--drip-dist', 20 + Math.random() * 60 + 'px');
    /* 風による傾き */
    drop.style.setProperty('--wind-skew', (wind.x * 18).toFixed(1) + 'deg');
    drop.style.setProperty('--wind-x', (wind.x * 40).toFixed(1) + 'px');
    container.appendChild(drop);

    if (drop.classList.contains('is-drip')) {
      setTimeout(function () {
        if (!drop.parentNode || !atmosphereOn()) return;
        var trail = document.createElement('div');
        trail.className = 'g5-drop-trail';
        trail.style.left = drop.style.left;
        trail.style.top = drop.style.top;
        trail.style.height = 28 + Math.random() * 48 + 'px';
        trail.style.setProperty('--wind-x', (wind.x * 30).toFixed(1) + 'px');
        container.appendChild(trail);
        setTimeout(function () {
          if (trail.parentNode) trail.remove();
        }, 2800);
      }, 700);
    }

    var life = drop.classList.contains('is-drip') ? 4500 + Math.random() * 3500 : 3000 + Math.random() * 4000;
    setTimeout(function () {
      if (drop.parentNode) {
        drop.style.transition = 'opacity 0.7s ease';
        drop.style.opacity = '0';
        setTimeout(function () {
          if (drop.parentNode) drop.remove();
        }, 750);
      }
    }, life);
  }

  function spawnSnowflake(container, intensity) {
    if (reducedMotion || !atmosphereOn()) return;
    var wind = getWindOffset();
    var flake = document.createElement('div');
    var size = 3 + Math.random() * 10;
    var strong = intensity === 'strong';
    flake.className = 'g5-snowflake' + (strong ? ' strong' : '');
    flake.style.width = size + 'px';
    flake.style.height = size + 'px';
    flake.style.left = Math.random() * 100 + '%';
    flake.style.setProperty('--fall-dur', (strong ? 4.5 : 7) + Math.random() * (strong ? 6 : 9) + 's');
    flake.style.setProperty('--sway', (wind.x * 55 + (Math.random() * 50 - 25)).toFixed(1) + 'px');
    flake.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    flake.style.opacity = 0.5 + Math.random() * 0.45;
    container.appendChild(flake);
    setTimeout(function () {
      if (flake.parentNode) flake.remove();
    }, 15000);
  }

  function spawnFogWisp(container) {
    if (reducedMotion || !atmosphereOn()) return;
    var wind = getWindOffset();
    var wisp = document.createElement('div');
    var w = 90 + Math.random() * 200;
    var h = 35 + Math.random() * 70;
    wisp.className = 'g5-fog-wisp';
    wisp.style.width = w + 'px';
    wisp.style.height = h + 'px';
    wisp.style.left = Math.random() * 100 + '%';
    wisp.style.top = 5 + Math.random() * 75 + '%';
    wisp.style.setProperty('--drift-dur', 16 + Math.random() * 24 + 's');
    wisp.style.setProperty('--drift-x', (wind.x * 80 + Math.random() * 100 - 50).toFixed(1) + 'px');
    wisp.style.setProperty('--drift-y', (wind.y * 30 + Math.random() * 20 - 10).toFixed(1) + 'px');
    container.appendChild(wisp);
    setTimeout(function () {
      if (wisp.parentNode) wisp.remove();
    }, 42000);
  }

  function spawnSunMote(container) {
    if (reducedMotion || !atmosphereOn()) return;
    var mote = document.createElement('div');
    var size = 2 + Math.random() * 5;
    mote.className = 'g5-sun-mote';
    mote.style.width = size + 'px';
    mote.style.height = size + 'px';
    mote.style.left = 10 + Math.random() * 80 + '%';
    mote.style.top = 5 + Math.random() * 60 + '%';
    mote.style.setProperty('--float-dur', 9 + Math.random() * 14 + 's');
    mote.style.setProperty('--float-x', (Math.random() * 60 - 30).toFixed(1) + 'px');
    mote.style.setProperty('--float-y', (-40 - Math.random() * 80).toFixed(1) + 'px');
    container.appendChild(mote);
    setTimeout(function () {
      if (mote.parentNode) mote.remove();
    }, 22000);
  }

  function spawnLightning() {
    if (reducedMotion || document.hidden || !atmosphereOn()) return;
    var flash = document.createElement('div');
    flash.className = 'g5-lightning';
    document.body.appendChild(flash);
    setTimeout(function () {
      if (flash.parentNode) flash.remove();
    }, 260);
    if (Math.random() < 0.5) {
      setTimeout(function () {
        if (!atmosphereOn()) return;
        var flash2 = document.createElement('div');
        flash2.className = 'g5-lightning g5-lightning-soft';
        document.body.appendChild(flash2);
        setTimeout(function () {
          if (flash2.parentNode) flash2.remove();
        }, 160);
      }, 60 + Math.random() * 140);
    }
  }

  function syncWeatherParticles(p) {
    if (!atmosphereOn()) {
      stopParticles();
      return;
    }

    var mode = p.weather;
    var intensity = p.intensity || 'normal';
    var key = mode + '-' + intensity;

    if (mode === 'clear' && p.isDay) mode = 'clear-day';
    else if (mode === 'partly' || mode === 'cloudy') mode = 'clouds';
    else if (mode !== 'rain' && mode !== 'rain-heavy' && mode !== 'storm' && mode !== 'snow' && mode !== 'fog') {
      stopParticles();
      return;
    }

    if (currentParticleMode === key && particleTimer) return;

    stopParticles();
    currentParticleMode = key;
    var box = ensureParticleLayer();
    box.className = 'g5-wx-particles mode-' + mode + ' intensity-' + intensity;

    if (mode === 'rain' || mode === 'rain-heavy' || mode === 'storm') {
      var heavy = mode === 'rain-heavy' || mode === 'storm' || intensity === 'strong';
      var n = heavy ? 32 : (intensity === 'light' ? 12 : 20);
      for (var i = 0; i < n; i++) spawnRainDrop(box, heavy, intensity);
      particleTimer = setInterval(function () {
        if (document.hidden || !atmosphereOn()) return;
        var c = heavy ? 4 : (intensity === 'light' ? 1 : 2);
        for (var j = 0; j < c; j++) spawnRainDrop(box, heavy, intensity);
        while (box.children.length > (heavy ? 60 : 40)) {
          if (box.firstChild) box.removeChild(box.firstChild);
        }
        if (mode === 'storm' && Math.random() < 0.1) spawnLightning();
      }, heavy ? 380 : 650);
    } else if (mode === 'snow') {
      var sn = intensity === 'strong' ? 28 : 18;
      for (var s = 0; s < sn; s++) spawnSnowflake(box, intensity);
      particleTimer = setInterval(function () {
        if (document.hidden || !atmosphereOn()) return;
        var cnt = intensity === 'strong' ? 4 : 2;
        for (var k = 0; k < cnt; k++) spawnSnowflake(box, intensity);
        while (box.children.length > (intensity === 'strong' ? 55 : 42)) {
          if (box.firstChild) box.removeChild(box.firstChild);
        }
      }, intensity === 'strong' ? 700 : 950);
    } else if (mode === 'fog') {
      for (var f = 0; f < 10; f++) spawnFogWisp(box);
      particleTimer = setInterval(function () {
        if (document.hidden || !atmosphereOn()) return;
        if (box.children.length < 14) spawnFogWisp(box);
      }, 3200);
    } else if (mode === 'clear-day') {
      for (var m = 0; m < 14; m++) spawnSunMote(box);
      particleTimer = setInterval(function () {
        if (document.hidden || !atmosphereOn()) return;
        if (box.children.length < 18) spawnSunMote(box);
        while (box.children.length > 22) {
          if (box.firstChild) box.removeChild(box.firstChild);
        }
      }, 1800);
    }
  }

  /* backward compat */
  function syncRainGlass(p) {
    syncWeatherParticles(p);
  }

  function spawnShootingStar() {
    if (reducedMotion || document.hidden || !atmosphereOn()) return;
    var star = document.createElement('div');
    star.className = 'g5-shooting-star';
    star.style.left = 5 + Math.random() * 70 + 'vw';
    star.style.top = 2 + Math.random() * 35 + 'vh';
    var angle = -18 - Math.random() * 28;
    var dist = 180 + Math.random() * 220;
    var rad = (angle * Math.PI) / 180;
    star.style.setProperty('--shoot-angle', angle + 'deg');
    star.style.setProperty('--shoot-x', Math.cos(rad) * dist + 'px');
    star.style.setProperty('--shoot-y', Math.sin(rad) * dist + 'px');
    document.body.appendChild(star);
    setTimeout(function () {
      if (star.parentNode) star.remove();
    }, 1000);
  }

  function shootingStarLoop() {
    var delay = 8000 + Math.random() * 17000;
    setTimeout(function () {
      if (atmosphereOn()) {
        var period = ROOT.dataset.period;
        var night = period === 'night' || period === 'late' || period === 'dusk';
        if (night && Math.random() < 0.11) {
          spawnShootingStar();
          if (Math.random() < 0.15) setTimeout(spawnShootingStar, 400 + Math.random() * 600);
        }
      }
      if (starLoopActive) shootingStarLoop();
    }, delay);
  }

  function syncBubbles(layer, p) {
    var existing = layer.querySelector('.g5-bubbles');
    var want =
      atmosphereOn() &&
      !p.isDay &&
      (p.weather === 'clear' ||
        p.weather === 'partly' ||
        p.period === 'night' ||
        p.period === 'late' ||
        p.period === 'dusk');
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
    if (!atmosphereOn()) {
      el.textContent = '';
      return;
    }
    var labels = {
      clear: '快晴',
      partly: '晴れ',
      cloudy: '曇り',
      fog: '霧',
      rain: '雨',
      'rain-heavy': '強い雨',
      snow: '雪',
      storm: '嵐',
      unknown: '—'
    };
    var t = p.temp != null ? Math.round(p.temp) + '°' : '';
    var wind = p.windSpeed > 0.5 ? ' · ' + Math.round(p.windSpeed) + 'm/s' : '';
    var geo = geoReady ? ' · GPS' : '';
    el.textContent = (labels[p.weather] || p.weather) + (t ? ' ' + t : '') + wind + ' · ' + p.period + geo;
  }

  function tick() {
    if (!atmosphereOn()) {
      stopParticles();
      return null;
    }
    var hours = getLocalHours();
    var period = periodFromHours(hours);
    var w = lastWeather || {};
    var kind = weatherKind(w.weather_code, w.precipitation, w.cloud_cover);
    var isDay = w.is_day != null ? !!w.is_day : hours >= 6 && hours < 18;
    var p = palette(
      period,
      kind,
      isDay,
      w.temperature_2m,
      w.wind_speed_10m,
      w.wind_direction_10m,
      w.wind_gusts_10m
    );
    apply(p);
    return p;
  }

  function fetchWeather() {
    if (!atmosphereOn()) return Promise.resolve();
    return fetch(weatherUrl())
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data && data.current) {
          lastWeather = data.current;
          tick();
          try {
            sessionStorage.setItem(
              'g5-wx',
              JSON.stringify({ t: Date.now(), c: data.current, lat: LAT, lon: LON })
            );
          } catch (e) {}
        }
      })
      .catch(function () {
        tick();
      });
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
    if (!atmosphereOn()) return;
    if (!navigator.geolocation) {
      fetchWeather();
      return;
    }
    /* キャッシュがあれば先に使う */
    try {
      var cached = sessionStorage.getItem('g5-geo');
      if (cached) {
        var o = JSON.parse(cached);
        if (o && o.lat != null && Date.now() - o.t < 30 * 60 * 1000) {
          LAT = o.lat;
          LON = o.lon;
          geoReady = true;
          fetchWeather();
        }
      }
    } catch (e) {}

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
        /* 失敗時はキャッシュ or デフォルト（東京）で続行 */
        try {
          var c = sessionStorage.getItem('g5-geo');
          if (c) {
            var o = JSON.parse(c);
            if (o && o.lat != null) {
              LAT = o.lat;
              LON = o.lon;
              geoReady = true;
            }
          }
        } catch (e) {}
        fetchWeather();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }

  function onAtmosphereChange() {
    if (atmosphereOn()) {
      tick();
      requestGeo();
    } else {
      stopParticles();
      ROOT.style.removeProperty('--bg-deep');
      ROOT.style.removeProperty('--g5-glow');
    }
  }

  function boot() {
    ensureLayers();
    try {
      var cached = sessionStorage.getItem('g5-wx');
      if (cached) {
        var o = JSON.parse(cached);
        if (o && o.c && Date.now() - o.t < 15 * 60 * 1000) {
          lastWeather = o.c;
          if (o.lat != null) {
            LAT = o.lat;
            LON = o.lon;
            geoReady = true;
          }
        }
      }
    } catch (e) {}
    if (atmosphereOn()) {
      tick();
      requestGeo();
    }
    setInterval(function () {
      if (atmosphereOn()) tick();
    }, 30000);
    setInterval(function () {
      if (atmosphereOn()) fetchWeather();
    }, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && atmosphereOn()) {
        tick();
        fetchWeather();
      }
    });
    document.addEventListener('g5-theme-change', function () {
      if (atmosphereOn()) tick();
    });
    document.addEventListener('g5-atmosphere-change', onAtmosphereChange);
    shootingStarLoop();
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
    },
    spawnShootingStar: spawnShootingStar
  };
})();
