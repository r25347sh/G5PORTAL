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
        else if (q.type==='matching'&&Array.isArray(q.right)&&q.right.length>1) {
          const indexed=q.right.map((t,i)=>({text:t,idx:i})); const sh=shuffleArray(indexed);
          q.right=sh.map(x=>x.text); const map={}; sh.forEach((x,ni)=>map[x.idx]=ni);
          if (Array.isArray(q.correct)) q.correct=q.correct.map(o=>map[o]);
        }
      });
    });
  }
  return { parse };
})();
window.MultiQuizScanner = MultiQuizScanner;

/* File Manager + Viewer */
(function () {
  const MQ_REPO = { owner: 'r25347sh', repo: 'multiquiz', root: 'G5PORTAL' };
  const MQ_API = 'https://api.github.com/repos/' + MQ_REPO.owner + '/' + MQ_REPO.repo + '/contents';
  const MQ_RAW = 'https://raw.githubusercontent.com/' + MQ_REPO.owner + '/' + MQ_REPO.repo + '/main';

  let currentQuiz = null, userAnswers = {}, fmPath = '';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const urlInput = document.getElementById('urlInput');
  const loadUrlBtn = document.getElementById('loadUrlBtn');
  const quizContainer = document.getElementById('quizContainer');
  const errorMessage = document.getElementById('errorMessage');
  const publishedSection = document.getElementById('publishedSection');
  const fmList = document.getElementById('fmList');
  const fmBreadcrumb = document.getElementById('fmBreadcrumb');
  const fmStatus = document.getElementById('fmStatus');
  const fmRefreshBtn = document.getElementById('fmRefreshBtn');
  const backToFmBtn = document.getElementById('backToFmBtn');

  function escapeHtml(s) { return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }
  function formatSize(n) { if (n<1024) return n+' B'; if (n<1048576) return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }

  async function fmLoad(path) {
    fmPath = path || '';
    if (fmStatus) fmStatus.textContent = '読み込み中…';
    if (fmList) fmList.innerHTML = '<p class="fm-loading">読み込み中…</p>';
    updateBreadcrumb();
    const apiPath = MQ_REPO.root + (fmPath ? '/' + fmPath : '');
    try {
      const res = await fetch(MQ_API + '/' + encodeURI(apiPath).replace(/%2F/g, '/'));
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [data];
      renderFmList(items);
      if (fmStatus) fmStatus.textContent = items.length + ' 件';
    } catch (e) {
      console.error(e);
      if (fmList) fmList.innerHTML = '<p class="fm-empty">読み込みに失敗しました</p>';
      if (fmStatus) fmStatus.textContent = 'エラー';
    }
  }

  function updateBreadcrumb() {
    if (!fmBreadcrumb) return;
    const parts = fmPath ? fmPath.split('/').filter(Boolean) : [];
    let html = '<button type="button" class="fm-crumb" data-path="">G5PORTAL</button>';
    let acc = '';
    parts.forEach(p => { acc = acc ? acc + '/' + p : p; html += '<button type="button" class="fm-crumb" data-path="' + acc + '">' + escapeHtml(p) + '</button>'; });
    fmBreadcrumb.innerHTML = html;
    fmBreadcrumb.querySelectorAll('.fm-crumb').forEach(btn => btn.addEventListener('click', () => fmLoad(btn.dataset.path || '')));
  }

  function renderFmList(items) {
    if (!fmList) return;
    const dirs = items.filter(i => i.type === 'dir').sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    const files = items.filter(i => i.type === 'file' && /\.(multiquiz|mq)$/i.test(i.name)).sort((a,b) => a.name.localeCompare(b.name, 'ja'));
    const filtered = [...dirs, ...files];
    if (!filtered.length) { fmList.innerHTML = '<p class="fm-empty">このフォルダに .multiquiz / .mq はありません</p>'; return; }
    fmList.innerHTML = '';
    filtered.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fm-item ' + (item.type === 'dir' ? 'dir' : 'file');
      const icon = item.type === 'dir' ? '📁' : '📄';
      const size = item.size != null ? formatSize(item.size) : '';
      btn.innerHTML = '<span class="fm-icon">' + icon + '</span><span class="fm-name">' + escapeHtml(item.name) + '</span><span class="fm-meta">' + size + '</span>';
      btn.addEventListener('click', () => {
        if (item.type === 'dir') fmLoad(fmPath ? fmPath + '/' + item.name : item.name);
        else loadPublishedFile(item);
      });
      fmList.appendChild(btn);
    });
  }

  async function loadPublishedFile(item) {
    const rel = (fmPath ? fmPath + '/' : '') + item.name;
    const rawUrl = MQ_RAW + '/' + MQ_REPO.root + '/' + rel.split('/').map(encodeURIComponent).join('/');
    if (fmStatus) fmStatus.textContent = '問題を読み込み中…';
    try {
      const res = await fetch(rawUrl);
      if (!res.ok) throw new Error('fetch ' + res.status);
      parseAndRender(await res.text());
      if (publishedSection) publishedSection.classList.add('hidden');
      const adv = document.querySelector('.mq-advanced');
      if (adv) adv.classList.add('hidden');
      if (fmStatus) fmStatus.textContent = '';
    } catch (e) {
      console.error(e);
      showError('公開問題の読み込みに失敗しました');
      if (fmStatus) fmStatus.textContent = 'エラー';
    }
  }

  function showPublishedList() {
    if (publishedSection) publishedSection.classList.remove('hidden');
    const adv = document.querySelector('.mq-advanced');
    if (adv) adv.classList.remove('hidden');
    if (quizContainer) quizContainer.classList.add('hidden');
    showError('');
  }

  if (fmRefreshBtn) fmRefreshBtn.addEventListener('click', () => fmLoad(fmPath));
  if (backToFmBtn) backToFmBtn.addEventListener('click', showPublishedList);
  if (fmList) fmLoad('');

  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.multiquiz') || file.name.endsWith('.mq'))) loadFile(file);
    });
  }
  if (fileInput) fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });
  if (loadUrlBtn) loadUrlBtn.addEventListener('click', () => { const url = urlInput && urlInput.value.trim(); if (url) loadFromUrl(url); });

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = e => parseAndRender(e.target.result);
    reader.readAsText(file);
  }
  async function loadFromUrl(url) {
    try { showError(''); const res = await fetch(url); if (!res.ok) throw new Error(); parseAndRender(await res.text()); }
    catch { showError('ファイルの読み込みに失敗しました'); }
  }
  function showError(msg) {
    if (!errorMessage) return;
    errorMessage.textContent = msg;
    errorMessage.classList.toggle('hidden', !msg);
  }
  function parseAndRender(content) {
    try {
      currentQuiz = MultiQuizScanner.parse(content);
      userAnswers = {};
      renderQuiz();
      if (quizContainer) quizContainer.classList.remove('hidden');
    } catch (err) { showError('解析エラー: ' + err.message); }
  }
  function renderQuiz() {
    document.getElementById('quizTitle').textContent = currentQuiz.title || 'Untitled Quiz';
    document.getElementById('quizDescription').textContent = currentQuiz.description || '';
    const sectionsDiv = document.getElementById('sections');
    sectionsDiv.innerHTML = '';
    currentQuiz.sections.forEach((section, secIdx) => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'section';
      sectionEl.innerHTML = '<h3>' + section.title + '</h3>';
      section.questions.forEach((q, qIdx) => {
        const globalQIdx = secIdx + '-' + qIdx;
        const qEl = document.createElement('div');
        qEl.className = 'question';
        qEl.innerHTML = '<div class="question-header"><span class="q-number">Q' + (qIdx+1) + '</span><span class="points">(' + (q.points||2) + '点)</span></div><div class="question-text" id="text-' + globalQIdx + '"></div><div class="answers" id="answers-' + globalQIdx + '"></div>' + (q.note ? '<div class="note hidden" id="note-' + globalQIdx + '">解説: ' + q.note + '</div>' : '');
        const textContainer = qEl.querySelector('#text-' + globalQIdx);
        const answersContainer = qEl.querySelector('#answers-' + globalQIdx);
        if (q.type === 'fill') { textContainer.innerHTML = '<strong>空欄に適切な語句を入力しなさい。</strong>'; renderFillQuestion(q, answersContainer, globalQIdx); }
        else if (q.type === 'matching') { textContainer.textContent = q.question || ''; renderMatchingQuestion(q, answersContainer, globalQIdx); }
        else { textContainer.innerHTML = q.question || ''; renderQuestionInput(q, answersContainer, globalQIdx); }
        sectionEl.appendChild(qEl);
      });
      sectionsDiv.appendChild(sectionEl);
    });
  }
  function renderQuestionInput(q, container, globalQIdx) {
    if (q.type === 'single') {
      (q.options||[]).forEach((opt, i) => {
        const label = document.createElement('label'); label.className = 'option';
        label.innerHTML = '<input type="radio" name="q-' + globalQIdx + '" value="' + i + '"> ' + opt;
        label.querySelector('input').addEventListener('change', e => { userAnswers[globalQIdx] = parseInt(e.target.value); });
        container.appendChild(label);
      });
    } else if (q.type === 'multiple') {
      (q.options||[]).forEach((opt, i) => {
        const label = document.createElement('label'); label.className = 'option';
        label.innerHTML = '<input type="checkbox" value="' + i + '"> ' + opt;
        label.querySelector('input').addEventListener('change', () => { userAnswers[globalQIdx] = Array.from(container.querySelectorAll('input:checked')).map(cb => parseInt(cb.value)); });
        container.appendChild(label);
      });
    } else if (q.type === 'truefalse') {
      const div = document.createElement('div');
      div.innerHTML = '<label class="option"><input type="radio" name="q-' + globalQIdx + '" value="true"> True</label><label class="option"><input type="radio" name="q-' + globalQIdx + '" value="false"> False</label>';
      div.querySelectorAll('input').forEach(r => r.addEventListener('change', e => { userAnswers[globalQIdx] = e.target.value === 'true'; }));
      container.appendChild(div);
    } else if (q.type === 'input') {
      const input = document.createElement('input'); input.type = 'text'; input.placeholder = '回答を入力';
      input.addEventListener('input', e => { userAnswers[globalQIdx] = e.target.value.trim(); });
      container.appendChild(input);
    } else if (q.type === 'sort') {
      const ul = document.createElement('ul'); ul.className = 'sortable';
      (q.items||[]).forEach(item => { const li = document.createElement('li'); li.draggable = true; li.textContent = item; li.dataset.value = item; ul.appendChild(li); });
      makeSortable(ul, globalQIdx); container.appendChild(ul);
    }
  }
  function renderFillQuestion(q, container, globalQIdx) {
    const fillDiv = document.createElement('div'); fillDiv.className = 'fill-container'; fillDiv.innerHTML = q.question || '';
    Object.keys(q.blanks||{}).forEach(key => {
      const regex = new RegExp('\\[\\[' + key + '\\]\\]', 'g');
      fillDiv.innerHTML = fillDiv.innerHTML.replace(regex, '<input type="text" class="blank-input" data-key="' + key + '" placeholder="' + key + '">');
    });
    fillDiv.querySelectorAll('.blank-input').forEach(inp => {
      inp.addEventListener('input', () => { if (!userAnswers[globalQIdx]) userAnswers[globalQIdx] = {}; userAnswers[globalQIdx][inp.dataset.key] = inp.value.trim(); });
    });
    container.appendChild(fillDiv);
  }
  function renderMatchingQuestion(q, container, globalQIdx) {
    const wrapper = document.createElement('div'); wrapper.className = 'matching-container';
    wrapper.innerHTML = '<div class="left-side" id="left-' + globalQIdx + '"></div><svg class="connection" id="svg-' + globalQIdx + '" width="100%" height="100%"></svg><div class="right-side" id="right-' + globalQIdx + '"></div>';
    const leftSide = wrapper.querySelector('#left-' + globalQIdx);
    const rightSide = wrapper.querySelector('#right-' + globalQIdx);
    const svg = wrapper.querySelector('#svg-' + globalQIdx);
    (q.left||[]).forEach((item, i) => { const el = document.createElement('div'); el.className = 'match-item'; el.textContent = item; el.dataset.index = i; leftSide.appendChild(el); });
    (q.right||[]).forEach((item, i) => { const el = document.createElement('div'); el.className = 'match-item right'; el.textContent = item; el.dataset.index = i; rightSide.appendChild(el); });
    let selectedLeft = null;
    leftSide.addEventListener('click', e => { const item = e.target.closest('.match-item'); if (!item) return; if (selectedLeft) selectedLeft.classList.remove('selected'); selectedLeft = item; item.classList.add('selected'); });
    rightSide.addEventListener('click', e => {
      const rightItem = e.target.closest('.match-item'); if (!rightItem || !selectedLeft) return;
      const leftIdx = parseInt(selectedLeft.dataset.index), rightIdx = parseInt(rightItem.dataset.index);
      if (!userAnswers[globalQIdx]) userAnswers[globalQIdx] = new Array((q.left||[]).length).fill(null);
      for (let i = 0; i < userAnswers[globalQIdx].length; i++) if (userAnswers[globalQIdx][i] === rightIdx) userAnswers[globalQIdx][i] = null;
      userAnswers[globalQIdx][leftIdx] = rightIdx;
      redrawAllConnections(svg, leftSide, rightSide, userAnswers[globalQIdx]);
      updateMatchItemStyles(leftSide, rightSide, userAnswers[globalQIdx]);
      selectedLeft.classList.remove('selected'); selectedLeft = null;
    });
    container.appendChild(wrapper);
  }
  function redrawAllConnections(svg, leftSide, rightSide, connections) {
    svg.innerHTML = '';
    connections.forEach((rightIdx, leftIdx) => { if (rightIdx !== null) drawSingleConnection(svg, leftSide, rightSide, leftIdx, rightIdx); });
  }
  function drawSingleConnection(svg, leftSide, rightSide, leftIdx, rightIdx) {
    const leftRect = leftSide.children[leftIdx].getBoundingClientRect();
    const rightRect = rightSide.children[rightIdx].getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', leftRect.right - svgRect.left + 2);
    line.setAttribute('y1', leftRect.top + leftRect.height/2 - svgRect.top);
    line.setAttribute('x2', rightRect.left - svgRect.left - 2);
    line.setAttribute('y2', rightRect.top + rightRect.height/2 - svgRect.top);
    line.setAttribute('stroke', '#ff2d95'); line.setAttribute('stroke-width', '3'); line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
  function updateMatchItemStyles(leftSide, rightSide, connections) {
    Array.from(leftSide.children).forEach((el, i) => el.classList.toggle('connected', connections[i] !== null));
    Array.from(rightSide.children).forEach((el, i) => el.classList.toggle('connected', connections.some(idx => idx === i)));
  }
  function makeSortable(ul, globalQIdx) {
    ul.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', e.target.dataset.value); e.target.classList.add('dragging'); });
    ul.addEventListener('dragend', e => e.target.classList.remove('dragging'));
    ul.addEventListener('dragover', e => e.preventDefault());
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const dragging = ul.querySelector('.dragging'), target = e.target.closest('li');
      if (dragging && target && dragging !== target) {
        const children = Array.from(ul.children);
        if (children.indexOf(dragging) < children.indexOf(target)) target.after(dragging); else target.before(dragging);
      }
      userAnswers[globalQIdx] = Array.from(ul.children).map(li => li.dataset.value);
    });
  }

  const submitBtn = document.getElementById('submitAllBtn');
  if (submitBtn) submitBtn.addEventListener('click', () => {
    if (!currentQuiz) return;
    let score = 0, total = 0;
    currentQuiz.sections.forEach((section, secIdx) => {
      section.questions.forEach((q, qIdx) => {
        const idx = secIdx + '-' + qIdx; const ans = userAnswers[idx]; total += q.points || 2;
        let correct = false;
        if (q.type === 'single') correct = parseInt(ans) === q.correct;
        else if (q.type === 'multiple') correct = JSON.stringify((ans||[]).sort()) === JSON.stringify((q.correct||[]).sort());
        else if (q.type === 'truefalse') correct = ans === q.correct;
        else if (q.type === 'input') correct = String(ans||'').trim() === String(q.correct||'').trim();
        else if (q.type === 'fill') correct = Object.keys(q.blanks||{}).every(k => (ans&&ans[k]) === q.blanks[k]);
        else if (q.type === 'sort') correct = JSON.stringify(ans) === JSON.stringify(q.correct);
        else if (q.type === 'matching') correct = JSON.stringify(ans) === JSON.stringify(q.correct);
        if (correct) score += q.points || 2;
        const noteEl = document.getElementById('note-' + idx); if (noteEl) noteEl.classList.remove('hidden');
      });
    });
    alert('得点: ' + score + ' / ' + total);
  });
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => { if (currentQuiz) { userAnswers = {}; renderQuiz(); } });
})();
