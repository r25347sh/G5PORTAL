// multiquiz.js — MultiQuiz parser + G5 viewer + File Manager (root: multiquiz/G5PORTAL)

const MultiQuizScanner = (function () {
  function parse(content) {
    const lines = content.split(/\r?\n/);
    const quiz = { title: 'クイズタイトル', description: '', points_default: 2, shuffle_questions: false, shuffle_options: false, variables: {}, sections: [] };
    let currentSection = null, i = 0;
    while (i < lines.length) {
      let line = lines[i].trim();
      if (!line || line.startsWith('//')) { i++; continue; }
      if (line.startsWith('title:')) quiz.title = unquote(line.substring(6).trim());
      else if (line.startsWith('description:')) quiz.description = unquote(line.substring(12).trim());
      else if (line.startsWith('points_default:')) quiz.points_default = parseInt(line.substring(15).trim(), 10) || 2;
      else if (line.startsWith('shuffle_questions:')) quiz.shuffle_questions = toBool(line.substring(18).trim());
      else if (line.startsWith('shuffle_options:')) quiz.shuffle_options = toBool(line.substring(16).trim());
      else if (line.includes('=') && !line.startsWith('section:') && !line.startsWith('{')) {
        const eq = line.indexOf('='); const key = line.substring(0, eq).trim();
        let value = unquote(line.substring(eq + 1).trim().replace(/;$/, ''));
        quiz.variables[key] = value;
      } else if (line.startsWith('section:')) {
        currentSection = { title: unquote(line.substring(8).trim()), questions: [], shuffle: null };
        const m = line.match(/shuffle\s*:\s*(true|false)/i);
        if (m) currentSection.shuffle = toBool(m[1]);
        quiz.sections.push(currentSection);
      } else if (line.startsWith('{')) {
        let block = '', brace = 1; block += line + '\n'; i++;
        while (i < lines.length && brace > 0) {
          const nl = lines[i]; block += nl + '\n';
          brace += (nl.match(/\{/g) || []).length - (nl.match(/\}/g) || []).length; i++;
        }
        if (currentSection) {
          const q = parseQuestionBlock(block, quiz.points_default);
          if (q) { expandVariables(q, quiz.variables); currentSection.questions.push(q); }
        }
        continue;
      }
      i++;
    }
    applyShuffle(quiz); return quiz;
  }
  function unquote(s) { if (!s) return ''; s = s.trim(); if ((s[0]==='"'&&s.slice(-1)==='"')||(s[0]==="'"&&s.slice(-1)==="'")) return s.slice(1,-1); return s; }
  function toBool(v) { if (typeof v==='boolean') return v; const s=String(v).toLowerCase().trim(); return s==='true'||s==='1'||s==='yes'||s==='on'; }
  function parseQuestionBlock(blockStr, defaultPoints) {
    try {
      let cleaned = blockStr.replace(/\/\/.*$/gm,'').replace(/(\w+)\s*:/g,'"$1":').replace(/,\s*([}\]])/g,'$1').trim();
      const q = (new Function('return '+cleaned))();
      if (q.points==null) q.points=defaultPoints; if (!q.type) q.type='input'; if (q.shuffle_options==null) q.shuffle_options=null;
      return q;
    } catch(e) { console.error('parse error', e); return null; }
  }
  function expandVariables(obj, vars) {
    if (!vars || !Object.keys(vars).length) return;
    const replaceStr = str => typeof str!=='string' ? str : str.replace(/\{\{(\w+)\}\}/g, (_,k)=> vars[k]!=null?vars[k]:'{{'+k+'}}');
    if (obj.question) obj.question=replaceStr(obj.question);
    if (obj.note) obj.note=replaceStr(obj.note);
    if (Array.isArray(obj.options)) obj.options=obj.options.map(replaceStr);
    if (Array.isArray(obj.items)) obj.items=obj.items.map(replaceStr);
    if (Array.isArray(obj.left)) obj.left=obj.left.map(replaceStr);
    if (Array.isArray(obj.right)) obj.right=obj.right.map(replaceStr);
    if (obj.blanks && typeof obj.blanks==='object') { const n={}; for (const k of Object.keys(obj.blanks)) n[k]=replaceStr(obj.blanks[k]); obj.blanks=n; }
    if (typeof obj.correct==='string') obj.correct=replaceStr(obj.correct);
  }
  function shuffleArray(arr) { const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function applyShuffle(quiz) {
    quiz.sections.forEach(section => {
      const doS = section.shuffle!=null ? section.shuffle : quiz.shuffle_questions;
      if (doS && section.questions.length>1) section.questions=shuffleArray(section.questions);
      section.questions.forEach(q => {
        const doO = q.shuffle_options!=null ? q.shuffle_options : quiz.shuffle_options;
        if (!doO) return;
        if ((q.type==='single'||q.type==='multiple') && Array.isArray(q.options)&&q.options.length>1) {
          const indexed=q.options.map((t,i)=>({text:t,idx:i})); const sh=shuffleArray(indexed);
          q.options=sh.map(x=>x.text); const map={}; sh.forEach((x,ni)=>map[x.idx]=ni);
          if (q.type==='single') q.correct=map[q.correct]; else if (Array.isArray(q.correct)) q.correct=q.correct.map(o=>map[o]).sort((a,b)=>a-b);
        } else if (q.type==='sort'&&Array.isArray(q.items)) q.items=shuffleArray(q.items);
      });
    });
  }
  return { parse };
})();
window.MultiQuizScanner = MultiQuizScanner;

(function () {
  const GITHUB_OWNER = 'r25347sh';
  const GITHUB_REPO = 'multiquiz';
  const ROOT_PATH = 'G5PORTAL';
  let currentPath = '';
  let currentQuiz = null;
  let userAnswers = {};

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  function formatNoteHtml(s) {
    if (s == null) return '';
    return escapeHtml(String(s).replace(/\\n/g, '\n')).replace(/\n/g, '<br>');
  }

  async function loadTree(path) {
    const apiPath = path ? ROOT_PATH + '/' + path : ROOT_PATH;
    const url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + encodeURIComponent(apiPath).replace(/%2F/g, '/');
    const res = await fetch(url);
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    return await res.json();
  }

  async function loadFileContent(path) {
    const raw = 'https://raw.githubusercontent.com/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/main/' + path;
    const res = await fetch(raw);
    if (!res.ok) throw new Error('raw ' + res.status);
    return await res.text();
  }

  function renderBreadcrumb() {
    const nav = document.getElementById('fmBreadcrumb');
    if (!nav) return;
    nav.innerHTML = '';
    const rootBtn = document.createElement('button');
    rootBtn.type = 'button'; rootBtn.className = 'fm-crumb'; rootBtn.dataset.path = ''; rootBtn.textContent = 'G5PORTAL';
    nav.appendChild(rootBtn);
    if (currentPath) {
      const parts = currentPath.split('/');
      let acc = '';
      parts.forEach((p, i) => {
        acc = acc ? acc + '/' + p : p;
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'fm-crumb'; btn.dataset.path = acc; btn.textContent = p;
        nav.appendChild(btn);
      });
    }
    nav.querySelectorAll('.fm-crumb').forEach(btn => {
      btn.addEventListener('click', () => { currentPath = btn.dataset.path || ''; refreshFm(); });
    });
  }

  function renderList(items) {
    const list = document.getElementById('fmList');
    if (!list) return;
    list.innerHTML = '';
    if (!items || !items.length) {
      list.innerHTML = '<p class="fm-empty">このフォルダには公開中の問題がありません</p>';
      return;
    }
    const dirs = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    const files = items.filter(i => i.type === 'file' && /\.(multiquiz|mq)$/i.test(i.name)).sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    [...dirs, ...files].forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fm-item ' + (item.type === 'dir' ? 'dir' : 'file');
      btn.innerHTML = '<span class="fm-icon">' + (item.type === 'dir' ? '📁' : '📄') + '</span><span class="fm-name">' + escapeHtml(item.name) + '</span>' +
        (item.type === 'file' ? '<span class="fm-meta">.multiquiz</span>' : '');
      btn.addEventListener('click', () => {
        if (item.type === 'dir') {
          currentPath = currentPath ? currentPath + '/' + item.name : item.name;
          refreshFm();
        } else {
          openQuizFile((currentPath ? currentPath + '/' : '') + item.name);
        }
      });
      list.appendChild(btn);
    });
  }

  async function refreshFm() {
    const status = document.getElementById('fmStatus');
    const list = document.getElementById('fmList');
    if (status) status.textContent = '読み込み中…';
    if (list) list.innerHTML = '<p class="fm-loading">読み込み中…</p>';
    renderBreadcrumb();
    try {
      const data = await loadTree(currentPath);
      const items = Array.isArray(data) ? data.map(d => ({
        name: d.name,
        type: d.type === 'dir' ? 'dir' : 'file',
        path: d.path
      })) : [];
      renderList(items);
      if (status) status.textContent = items.length + ' 件';
    } catch (e) {
      console.error(e);
      if (list) list.innerHTML = '<p class="fm-empty">読み込みに失敗しました: ' + escapeHtml(e.message) + '</p>';
      if (status) status.textContent = 'エラー';
    }
  }

  async function openQuizFile(relPath) {
    const fullPath = ROOT_PATH + '/' + relPath;
    try {
      const content = await loadFileContent(fullPath);
      const quiz = MultiQuizScanner.parse(content);
      currentQuiz = quiz;
      userAnswers = {};
      window.__mqCurrentQuiz = currentQuiz;
      window.__mqUserAnswers = userAnswers;
      document.getElementById('publishedSection').classList.add('hidden');
      document.getElementById('quizContainer').classList.remove('hidden');
      document.getElementById('errorMessage').classList.add('hidden');
      renderQuiz();
    } catch (e) {
      console.error(e);
      showError('ファイルの読み込みに失敗しました: ' + e.message);
    }
  }

  function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  function renderQuiz() {
    if (!currentQuiz) return;
    document.getElementById('quizTitle').textContent = currentQuiz.title || 'クイズ';
    document.getElementById('quizDescription').textContent = currentQuiz.description || '';
    const sectionsEl = document.getElementById('sections');
    sectionsEl.innerHTML = '';
    currentQuiz.sections.forEach((section, secIdx) => {
      const secDiv = document.createElement('div');
      secDiv.className = 'section';
      const h3 = document.createElement('h3');
      h3.textContent = section.title || ('セクション ' + (secIdx + 1));
      secDiv.appendChild(h3);
      section.questions.forEach((q, qIdx) => {
        const idx = secIdx + '-' + qIdx;
        const qDiv = document.createElement('div');
        qDiv.className = 'question';
        qDiv.innerHTML = '<div class="question-header"><span class="q-number">Q' + (qIdx + 1) + '</span><span class="points">' + (q.points || 2) + '点</span></div>' +
          '<div class="question-text" id="text-' + idx + '">' + formatNoteHtml(q.question || '') + '</div>' +
          '<div class="answers" id="answers-' + idx + '"></div>' +
          (q.note ? '<div class="note hidden" id="note-' + idx + '"><div class="note-label">解説</div><div class="note-body">' + formatNoteHtml(q.note) + '</div></div>' : '');
        secDiv.appendChild(qDiv);
        const answersEl = qDiv.querySelector('#answers-' + idx);
        renderAnswers(answersEl, q, idx);
      });
      sectionsEl.appendChild(secDiv);
    });
  }

  function renderAnswers(container, q, globalQIdx) {
    container.innerHTML = '';
    if (q.type === 'single' || q.type === 'truefalse') {
      const opts = q.type === 'truefalse' ? [{v: true, t: 'True'}, {v: false, t: 'False'}] : (q.options || []).map((t, i) => ({v: i, t}));
      opts.forEach(o => {
        const lab = document.createElement('label');
        lab.className = 'option';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'q-' + globalQIdx; input.value = String(o.v);
        input.addEventListener('change', () => {
          userAnswers[globalQIdx] = q.type === 'truefalse' ? (o.v === true || o.v === 'true') : parseInt(o.v, 10);
          window.__mqUserAnswers = userAnswers;
        });
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(' ' + o.t));
        container.appendChild(lab);
      });
    } else if (q.type === 'multiple') {
      (q.options || []).forEach((t, i) => {
        const lab = document.createElement('label');
        lab.className = 'option';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.value = String(i);
        input.addEventListener('change', () => {
          if (!userAnswers[globalQIdx]) userAnswers[globalQIdx] = [];
          const arr = userAnswers[globalQIdx];
          const val = parseInt(input.value, 10);
          if (input.checked) { if (arr.indexOf(val) < 0) arr.push(val); } else { const ix = arr.indexOf(val); if (ix >= 0) arr.splice(ix, 1); }
          window.__mqUserAnswers = userAnswers;
        });
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(' ' + t));
        container.appendChild(lab);
      });
    } else if (q.type === 'input') {
      const input = document.createElement('input');
      input.type = 'text'; input.placeholder = '回答を入力';
      input.addEventListener('input', () => { userAnswers[globalQIdx] = input.value; window.__mqUserAnswers = userAnswers; });
      container.appendChild(input);
    } else if (q.type === 'fill') {
      const div = document.createElement('div');
      div.className = 'fill-container';
      Object.keys(q.blanks || {}).forEach(k => {
        const row = document.createElement('div');
        row.style.marginBottom = '0.5rem';
        row.innerHTML = '<label>' + escapeHtml(k) + ': </label>';
        const input = document.createElement('input');
        input.type = 'text';
        input.addEventListener('input', () => {
          if (!userAnswers[globalQIdx]) userAnswers[globalQIdx] = {};
          userAnswers[globalQIdx][k] = input.value;
          window.__mqUserAnswers = userAnswers;
        });
        row.appendChild(input);
        div.appendChild(row);
      });
      container.appendChild(div);
    } else {
      container.textContent = '（この問題タイプのUIは簡略表示です）';
    }
  }

  const submitBtn = document.getElementById('submitAllBtn');
  if (submitBtn) {
    /* scoring handled by scoring-overlay.js */
  }

  const backBtn = document.getElementById('backToListBtn');
  if (backBtn) backBtn.addEventListener('click', () => {
    document.getElementById('quizContainer').classList.add('hidden');
    document.getElementById('publishedSection').classList.remove('hidden');
    refreshFm();
  });

  if (document.getElementById('fmList')) refreshFm();
})();
