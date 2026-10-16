// MultiQuiz emergency fix: load last-good core then patch scoring hooks
(async function () {
  async function loadText(url) {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.text();
  }
  function inj(code) {
    const s = document.createElement('script');
    s.textContent = code;
    document.head.appendChild(s);
  }
  try {
    const coreUrl = 'https://raw.githubusercontent.com/r25347sh/G5PORTAL/502808ca69e3ea89f8c4f2fc99fb1bdf6e7fa6ff/pages/multiquiz/multiquiz.js';
    const soUrl = 'https://raw.githubusercontent.com/r25347sh/G5PORTAL/502808ca69e3ea89f8c4f2fc99fb1bdf6e7fa6ff/pages/multiquiz/scoring-overlay.js';
    let core = await loadText(coreUrl);
    core = core.replace(
      '<div class="question-text">\' + formatNoteHtml(q.question || \'\') + \'</div>\' +',
      '<div class="question-text" id="text-\' + idx + \'">\' + formatNoteHtml(q.question || \'\') + \'</div>\' +'
    );
    const needle = "secDiv.appendChild(qDiv);\n        renderAnswers(qDiv.querySelector('#answers-' + idx), q, idx);";
    const insert = "qDiv.insertAdjacentHTML('beforeend', '<button type=\"button\" class=\"btn btn-primary per-score-btn\" data-qidx=\"' + idx + '\" style=\"display:none\">この問題を採点</button>');\n        secDiv.appendChild(qDiv);\n        renderAnswers(qDiv.querySelector('#answers-' + idx), q, idx);\n        const _pb = qDiv.querySelector('.per-score-btn');\n        if (_pb) _pb.addEventListener('click', function () { if (typeof window.__mqScoreOneQuestion === 'function') window.__mqScoreOneQuestion(idx); });";
    if (core.indexOf(needle) >= 0) core = core.replace(needle, insert);
    inj(core);

    let so = await loadText(soUrl);
    so = so.replace(
      "const textEl = document.getElementById('text-' + idx);\n      const qEl = textEl ? textEl.closest('.question') : null;",
      "const textEl = document.getElementById('text-' + idx);\n      let qEl = textEl ? textEl.closest('.question') : null;\n      if (!qEl) qEl = document.querySelector('.question[data-qidx=\"' + idx + '\"]');"
    );
    inj(so);
  } catch (e) {
    console.error(e);
    const el = document.getElementById('errorMessage');
    if (el) { el.textContent = 'MultiQuiz load failed: ' + e.message; el.classList.remove('hidden'); }
  }
})();
