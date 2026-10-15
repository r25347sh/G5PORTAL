// MultiQuiz loader — sources live in r25347sh/multiquiz G5PORTAL/_viewer/
(async function () {
  async function loadJs(path) {
    const urls = [
      'https://cdn.jsdelivr.net/gh/r25347sh/multiquiz@main/' + path,
      'https://raw.githubusercontent.com/r25347sh/multiquiz/main/' + path
    ];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) { lastErr = new Error('HTTP ' + res.status); continue; }
        const code = await res.text();
        const s = document.createElement('script');
        s.textContent = code;
        document.head.appendChild(s);
        return;
      } catch (e) { lastErr = e; }
    }
    console.error('MultiQuiz load failed:', path, lastErr);
    const el = document.getElementById('errorMessage');
    if (el) { el.textContent = 'MultiQuiz本体の読み込みに失敗しました: ' + path; el.classList.remove('hidden'); }
  }
  await loadJs('G5PORTAL/_viewer/multiquiz.js');
  await loadJs('G5PORTAL/_viewer/scoring-overlay.js');
})();
