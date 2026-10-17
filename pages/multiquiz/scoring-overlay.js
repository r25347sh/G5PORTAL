/* scoring-overlay.js — 正答・誤答の視覚表示 + 一括/各問採点 + KaTeX */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    function isAnswerCorrect(q, ans) {
      if (q.type === 'single') return parseInt(ans, 10) === q.correct;
      if (q.type === 'multiple') {
        const a = Array.isArray(ans) ? ans.slice().map(Number).sort(function(x,y){return x-y;}) : [];
        const c = Array.isArray(q.correct) ? q.correct.slice().map(Number).sort(function(x,y){return x-y;}) : [];
        return JSON.stringify(a) === JSON.stringify(c);
      }
      if (q.type === 'truefalse') return ans === q.correct;
      if (q.type === 'input') {
        const u = String(ans || '').trim();
        const c = String(q.correct || '').trim();
        if (q.caseSensitive === false) return u.toLowerCase() === c.toLowerCase();
        return u === c;
      }
      if (q.type === 'fill') {
        if (!q.blanks) return false;
        return Object.keys(q.blanks).every(function(k) {
          return String((ans && ans[k]) || '').trim() === String(q.blanks[k]).trim();
        });
      }
      if (q.type === 'sort' || q.type === 'matching') return JSON.stringify(ans) === JSON.stringify(q.correct);
      return false;
    }

    function formatCorrectAnswer(q) {
      if (q.type === 'single' && Array.isArray(q.options))
        return q.options[q.correct] != null ? q.options[q.correct] : String(q.correct);
      if (q.type === 'multiple' && Array.isArray(q.options) && Array.isArray(q.correct))
        return q.correct.map(function(i) { return q.options[i]; }).join('、');
      if (q.type === 'truefalse') return q.correct ? 'True' : 'False';
      if (q.type === 'input') return String(q.correct || '');
      if (q.type === 'fill' && q.blanks)
        return Object.keys(q.blanks).map(function(k) { return k + '=' + q.blanks[k]; }).join(', ');
      if (q.type === 'sort' && Array.isArray(q.correct)) return q.correct.join(' → ');
      return '';
    }

    function applyQuestionResult(idx, q, ans) {
      const ok = isAnswerCorrect(q, ans);
      const textEl = document.getElementById('text-' + idx);
      let qEl = textEl ? textEl.closest('.question') : null;
      if (!qEl) qEl = document.querySelector('.question[data-qidx="' + idx + '"]');
      if (qEl) {
        qEl.classList.remove('is-correct', 'is-incorrect');
        qEl.classList.add(ok ? 'is-correct' : 'is-incorrect');
        qEl.classList.add('is-scored');
        let badge = qEl.querySelector('.result-badge');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'result-badge';
          const header = qEl.querySelector('.question-header');
          if (header) header.appendChild(badge);
          else qEl.insertBefore(badge, qEl.firstChild);
        }
        badge.textContent = ok ? '正解' : '不正解';
        badge.className = 'result-badge ' + (ok ? 'badge-ok' : 'badge-ng');
        qEl.querySelectorAll('input').forEach(function (inp) { inp.disabled = true; });
      }

      const answersEl = document.getElementById('answers-' + idx);
      if (answersEl) {
        answersEl.querySelectorAll('.option').forEach(function (lab) {
          lab.classList.remove('opt-correct', 'opt-wrong');
          const input = lab.querySelector('input');
          if (!input) return;
          if (q.type === 'single' || q.type === 'truefalse') {
            const val = q.type === 'truefalse' ? (input.value === 'true') : parseInt(input.value, 10);
            const isCorrectOpt = (q.type === 'truefalse') ? (val === q.correct) : (val === q.correct);
            if (isCorrectOpt) lab.classList.add('opt-correct');
            else if (input.checked) lab.classList.add('opt-wrong');
          } else if (q.type === 'multiple' && Array.isArray(q.correct)) {
            const val = parseInt(input.value, 10);
            const should = q.correct.indexOf(val) >= 0;
            if (should) lab.classList.add('opt-correct');
            else if (input.checked) lab.classList.add('opt-wrong');
          }
        });
      }

      const noteEl = document.getElementById('note-' + idx);
      if (noteEl) {
        noteEl.classList.remove('hidden');
        if (typeof renderMathInElement === 'function') {
          try {
            renderMathInElement(noteEl, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
              ],
              throwOnError: false,
              strict: 'ignore'
            });
          } catch (e) {}
        }
      }
      return ok;
    }

    function scoreAll() {
      const quiz = window.__mqCurrentQuiz;
      const answers = window.__mqUserAnswers || {};
      if (!quiz) return;
      let total = 0, earned = 0, count = 0;
      quiz.sections.forEach(function (sec, si) {
        sec.questions.forEach(function (q, qi) {
          const idx = si + '-' + qi;
          count++;
          const pts = q.points || 2;
          total += pts;
          const ok = applyQuestionResult(idx, q, answers[idx]);
          if (ok) earned += pts;
        });
      });
      let summary = document.getElementById('scoreSummary');
      if (!summary) {
        summary = document.createElement('div');
        summary.id = 'scoreSummary';
        summary.className = 'score-summary';
        const footer = document.querySelector('.quiz-footer');
        if (footer) footer.parentNode.insertBefore(summary, footer);
      }
      summary.classList.remove('hidden');
      summary.innerHTML = '<strong>採点結果</strong>: ' + earned + ' / ' + total + ' 点（' + count + ' 問）';
    }

    window.__mqScoreOneQuestion = function (idx) {
      const quiz = window.__mqCurrentQuiz;
      const answers = window.__mqUserAnswers || {};
      if (!quiz) return;
      const parts = String(idx).split('-');
      const si = parseInt(parts[0], 10), qi = parseInt(parts[1], 10);
      if (!quiz.sections[si] || !quiz.sections[si].questions[qi]) return;
      applyQuestionResult(idx, quiz.sections[si].questions[qi], answers[idx]);
    };

    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) submitBtn.addEventListener('click', scoreAll);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      if (typeof window.__mqClearUserAnswers === 'function') window.__mqClearUserAnswers();
      document.querySelectorAll('.question').forEach(function (el) {
        el.classList.remove('is-correct', 'is-incorrect', 'is-scored');
        el.querySelectorAll('input').forEach(function (inp) { inp.disabled = false; inp.checked = false; if (inp.type==='text') inp.value=''; });
        el.querySelectorAll('.option').forEach(function (o) { o.classList.remove('opt-correct', 'opt-wrong'); });
        const b = el.querySelector('.result-badge'); if (b) b.remove();
      });
      document.querySelectorAll('.note').forEach(function (n) { n.classList.add('hidden'); });
      const summary = document.getElementById('scoreSummary');
      if (summary) { summary.classList.add('hidden'); summary.innerHTML = ''; }
    });
  });
})();
