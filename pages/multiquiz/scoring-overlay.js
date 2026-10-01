/* scoring-overlay.js — 正答・誤答の視覚表示 + 一括/各問採点 */
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

    /** 1問分の採点表示を適用（共通） */
    function applyQuestionResult(idx, q, ans) {
      const ok = isAnswerCorrect(q, ans);
      const textEl = document.getElementById('text-' + idx);
      const qEl = textEl ? textEl.closest('.question') : null;
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

        // 入力をロック（各問採点後）
        qEl.querySelectorAll('input').forEach(function (inp) {
          inp.disabled = true;
        });
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
          } else if (q.type === 'multiple') {
            const val = parseInt(input.value, 10);
            const should = Array.isArray(q.correct) && q.correct.indexOf(val) >= 0;
            if (should) lab.classList.add('opt-correct');
            else if (input.checked) lab.classList.add('opt-wrong');
          }
        });
        if (q.type === 'input' || q.type === 'fill') {
          let ca = answersEl.querySelector('.correct-answer-line');
          if (!ca) {
            ca = document.createElement('div');
            ca.className = 'correct-answer-line';
            answersEl.appendChild(ca);
          }
          ca.textContent = ok ? '' : ('正答: ' + formatCorrectAnswer(q));
          ca.style.display = ok ? 'none' : 'block';
        }
      }
      const noteEl = document.getElementById('note-' + idx);
      if (noteEl) {
        noteEl.classList.remove('hidden');
        if (!noteEl.querySelector('.note-label')) {
          const lab = document.createElement('div');
          lab.className = 'note-label';
          lab.textContent = '解説';
          noteEl.insertBefore(lab, noteEl.firstChild);
        }
      }
      return ok;
    }

    function clearAllResults() {
      const summary = document.getElementById('scoreSummary');
      if (summary) { summary.classList.add('hidden'); summary.innerHTML = ''; }
      document.querySelectorAll('.question.is-correct, .question.is-incorrect, .question.is-scored').forEach(function (el) {
        el.classList.remove('is-correct', 'is-incorrect', 'is-scored');
      });
      document.querySelectorAll('.result-badge').forEach(function (el) { el.remove(); });
      document.querySelectorAll('.opt-correct, .opt-wrong').forEach(function (el) {
        el.classList.remove('opt-correct', 'opt-wrong');
      });
      document.querySelectorAll('.correct-answer-line').forEach(function (el) { el.remove(); });
      document.querySelectorAll('.question input').forEach(function (inp) { inp.disabled = false; });
      document.querySelectorAll('.note').forEach(function (n) { n.classList.add('hidden'); });
      // 各問採点ボタンを再表示
      document.querySelectorAll('.per-score-btn').forEach(function (btn) {
        btn.style.display = (window.__mqScoringMode === 'per') ? '' : 'none';
        btn.disabled = false;
      });
    }

    function updateRunningSummary() {
      const quiz = window.__mqCurrentQuiz;
      const answers = window.__mqUserAnswers || {};
      if (!quiz) return;
      let score = 0, total = 0, correctCount = 0, wrongCount = 0, scoredCount = 0;
      quiz.sections.forEach(function (section, secIdx) {
        section.questions.forEach(function (q, qIdx) {
          const idx = secIdx + '-' + qIdx;
          const qEl = document.getElementById('text-' + idx);
          const parent = qEl ? qEl.closest('.question') : null;
          if (!parent || !parent.classList.contains('is-scored')) return;
          scoredCount++;
          const pts = q.points || 2;
          total += pts;
          const ans = answers[idx];
          const ok = isAnswerCorrect(q, ans);
          if (ok) { score += pts; correctCount++; } else { wrongCount++; }
        });
      });
      if (scoredCount === 0) {
        const summary = document.getElementById('scoreSummary');
        if (summary) { summary.classList.add('hidden'); summary.innerHTML = ''; }
        return;
      }
      let summary = document.getElementById('scoreSummary');
      if (!summary) {
        summary = document.createElement('div');
        summary.id = 'scoreSummary';
        summary.className = 'score-summary';
        const footer = document.querySelector('.quiz-footer');
        if (footer && footer.parentNode) footer.parentNode.insertBefore(summary, footer);
      }
      const pct = total > 0 ? Math.round(score / total * 100) : 0;
      const mode = window.__mqScoringMode || 'batch';
      summary.innerHTML =
        '<div class="score-main">得点: <strong>' + score + '</strong> / ' + total + '（' + pct + '%）</div>' +
        '<div class="score-detail"><span class="score-ok">正解 ' + correctCount + ' 問</span> · <span class="score-ng">不正解 ' + wrongCount + ' 問</span>' +
        (mode === 'per' ? ' · 採点済 ' + scoredCount + ' 問' : '') + '</div>';
      summary.classList.remove('hidden');
    }

    /** 各問採点用（外部から呼ぶ） */
    window.__mqScoreOneQuestion = function (idx) {
      const quiz = window.__mqCurrentQuiz;
      const answers = window.__mqUserAnswers || {};
      if (!quiz) {
        alert('採点準備中です。問題を読み込んでからもう一度お試しください。');
        return;
      }
      const parts = String(idx).split('-');
      const secIdx = parseInt(parts[0], 10);
      const qIdx = parseInt(parts[1], 10);
      if (!quiz.sections[secIdx] || !quiz.sections[secIdx].questions[qIdx]) return;
      const q = quiz.sections[secIdx].questions[qIdx];
      const ans = answers[idx];
      // 未回答でも採点可能（不正解扱い）
      applyQuestionResult(idx, q, ans);
      const btn = document.querySelector('.per-score-btn[data-qidx="' + idx + '"]');
      if (btn) btn.disabled = true;
      updateRunningSummary();
    };

    // 一括採点
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) {
      const newBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newBtn, submitBtn);

      newBtn.addEventListener('click', function () {
        const quiz = window.__mqCurrentQuiz;
        const answers = window.__mqUserAnswers || {};
        if (!quiz) {
          alert('採点準備中です。問題を読み込んでからもう一度お試しください。');
          return;
        }
        // 既存結果をクリアしてから再採点
        clearAllResults();
        quiz.sections.forEach(function (section, secIdx) {
          section.questions.forEach(function (q, qIdx) {
            const idx = secIdx + '-' + qIdx;
            const ans = answers[idx];
            applyQuestionResult(idx, q, ans);
          });
        });
        updateRunningSummary();
        const summary = document.getElementById('scoreSummary');
        if (summary) summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        clearAllResults();
        // 回答もクリア
        if (typeof window.__mqClearUserAnswers === 'function') window.__mqClearUserAnswers();
        else window.__mqUserAnswers = {};
        document.querySelectorAll('.question input[type="radio"], .question input[type="checkbox"]').forEach(function (inp) {
          inp.checked = false;
        });
        document.querySelectorAll('.question input[type="text"]').forEach(function (inp) {
          inp.value = '';
        });
      });
    }
  });
})();
