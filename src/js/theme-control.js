/**
 * G⁵ Portal — theme-control.js
 * ダーク / ライト / システム（デフォルト: ダーク）
 * localStorage: g5-color-mode
 */
(function () {
  'use strict';

  var STORAGE = 'g5-color-mode';
  var ROOT = document.documentElement;
  var VALID = { dark: 1, light: 1, system: 1 };

  function readMode() {
    try {
      var m = localStorage.getItem(STORAGE);
      if (m === 'classic') return 'light';
      if (VALID[m]) return m;
    } catch (e) {}
    return 'dark';
  }

  function systemPrefersDark() {
    return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveScheme(mode) {
    if (mode === 'light') return 'light';
    if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return 'dark';
  }

  function flash() {
    ROOT.classList.add('g5-theme-switching');
    void ROOT.offsetHeight;
    setTimeout(function () { ROOT.classList.remove('g5-theme-switching'); }, 80);
  }

  function apply(mode, instant) {
    if (instant !== false) flash();
    var scheme = resolveScheme(mode);
    ROOT.setAttribute('data-color-mode', mode);
    ROOT.setAttribute('data-color-scheme', scheme);
    try { ROOT.style.colorScheme = scheme; } catch (e) {}
    return scheme;
  }

  var state = { mode: readMode() };
  apply(state.mode, false);

  function setMode(mode) {
    if (!VALID[mode]) return;
    state.mode = mode;
    try { localStorage.setItem(STORAGE, mode); } catch (e) {}
    apply(state.mode, true);
    syncUI();
    document.dispatchEvent(new CustomEvent('g5-theme-change', {
      detail: { mode: state.mode, scheme: resolveScheme(state.mode) }
    }));
    if (window.G5Theme && typeof window.G5Theme.tick === 'function') {
      window.G5Theme.tick();
    }
  }

  var panelEl = null;
  var triggerEl = null;

  function sunSVG() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"/></svg>';
  }

  function syncUI() {
    if (!panelEl) return;
    panelEl.querySelectorAll('.g5-theme-mode').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-mode') === state.mode);
    });
  }

  function injectUI() {
    if (document.getElementById('g5-theme-ctrl')) return;
    var wrap = document.createElement('div');
    wrap.className = 'g5-theme-ctrl';
    wrap.id = 'g5-theme-ctrl';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'g5-theme-trigger';
    btn.setAttribute('aria-label', 'テーマ設定');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = sunSVG();
    triggerEl = btn;

    var panel = document.createElement('div');
    panel.className = 'g5-theme-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'カラーテーマ');
    panel.innerHTML =
      '<button type="button" class="g5-theme-mode" data-mode="dark">ダーク</button>' +
      '<button type="button" class="g5-theme-mode" data-mode="light">ライト</button>' +
      '<button type="button" class="g5-theme-mode" data-mode="system">システム</button>';
    panelEl = panel;

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.querySelectorAll('.g5-theme-mode').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        setMode(b.getAttribute('data-mode'));
      });
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        panel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        panel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    syncUI();
  }

  if (window.matchMedia) {
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (state.mode === 'system') {
          apply(state.mode, true);
          if (window.G5Theme && window.G5Theme.tick) window.G5Theme.tick();
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {}
  }

  function boot() { injectUI(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.G5ThemeControl = {
    getMode: function () { return state.mode; },
    getScheme: function () { return resolveScheme(state.mode); },
    setMode: setMode,
    resolveScheme: resolveScheme
  };
})();
