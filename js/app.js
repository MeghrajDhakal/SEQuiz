document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    session: [],
    userAns: [],
    cur: 0,
    timerInv: null,
    elapsed: 0,
    revItems: []
  };

  // DOM Elements
  const els = {
    screens: {
      start: document.getElementById('screen-start'),
      quiz: document.getElementById('screen-quiz'),
      result: document.getElementById('screen-result')
    },
    timer: document.getElementById('timer'),
    qcur: document.getElementById('qcur'),
    prog: document.getElementById('prog'),
    qtext: document.getElementById('qtext'),
    btnReadAloud: document.getElementById('btn-read-aloud'),
    opts: document.getElementById('opts'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    ansCount: document.getElementById('ans-count'),
    spct: document.getElementById('spct'),
    rc: document.getElementById('r-c'),
    rw: document.getElementById('r-w'),
    ru: document.getElementById('r-u'),
    rs: document.getElementById('r-s'),
    ring: document.getElementById('ring'),
    grade: document.getElementById('grade'),
    revList: document.getElementById('rev-list'),
    filters: {
      all: document.getElementById('f-all'),
      correct: document.getElementById('f-correct'),
      wrong: document.getElementById('f-wrong'),
      unanswered: document.getElementById('f-unanswered')
    }
  };

  // Helper Functions
  const show = (el) => el.classList.add('active');
  const hide = (el) => el.classList.remove('active');
  
  const escapeHTML = (s) => {
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
  };

  const shuffle = (array) => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Core Logic
  const startQuiz = () => {
    // Check if QB is loaded
    if (typeof QB === 'undefined' || !QB.length) {
      alert("Question bank not loaded properly.");
      return;
    }

    const pool = Array.from({ length: QB.length }, (_, i) => i);
    const shuffledPool = shuffle(pool);
    
    // Select 100 questions (or all if less than 100)
    const qCount = Math.min(100, QB.length);
    state.session = shuffledPool.slice(0, qCount).map(i => QB[i]);
    state.userAns = new Array(qCount).fill(null);
    state.cur = 0;
    state.elapsed = 0;

    clearInterval(state.timerInv);
    state.timerInv = setInterval(() => {
      state.elapsed++;
      const m = String(Math.floor(state.elapsed / 60)).padStart(2, '0');
      const s = String(state.elapsed % 60).padStart(2, '0');
      els.timer.textContent = `${m}:${s}`;
    }, 1000);

    hide(els.screens.start);
    hide(els.screens.result);
    show(els.screens.quiz);
    
    // Update total count span
    document.querySelector('.q-counter span:nth-child(2)').textContent = qCount;

    renderQ();
  };

  const renderQ = () => {
    const q = state.session[state.cur];
    const qCount = state.session.length;
    
    els.qcur.textContent = state.cur + 1;
    els.prog.style.width = `${((state.cur + 1) / qCount) * 100}%`;
    els.qtext.textContent = `${state.cur + 1}. ${q.q}`;
    
    els.opts.innerHTML = '';
    const keys = ['A', 'B', 'C', 'D'];
    
    keys.forEach(k => {
      if (!q.o[k]) return; // Skip if option doesn't exist
      
      const btn = document.createElement('button');
      btn.className = `opt ${state.userAns[state.cur] === k ? 'selected' : ''}`;
      btn.innerHTML = `<span class="opt-key">${k}</span><span class="opt-text">${escapeHTML(q.o[k])}</span>`;
      btn.addEventListener('click', () => selectAns(k));
      els.opts.appendChild(btn);
    });

    els.btnPrev.disabled = (state.cur === 0);
    els.btnNext.disabled = (state.cur === qCount - 1);
    
    const done = state.userAns.filter(ans => ans !== null).length;
    els.ansCount.textContent = `${done}/${qCount} answered`;
  };

  const selectAns = (k) => {
    state.userAns[state.cur] = k;
    renderQ();
  };

  const goTo = (n) => {
    if (n < 0 || n >= state.session.length) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.cur = n;
    renderQ();
  };

  const confirmSubmit = () => {
    const qCount = state.session.length;
    const done = state.userAns.filter(ans => ans !== null).length;
    const left = qCount - done;
    
    if (left > 0 && !confirm(`You have ${left} unanswered question(s). Submit anyway?`)) {
      return;
    }
    submitQuiz();
  };

  const submitQuiz = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearInterval(state.timerInv);
    const qCount = state.session.length;
    let correct = 0, wrong = 0, unanswered = 0;

    state.session.forEach((q, i) => {
      if (state.userAns[i] === null) unanswered++;
      else if (state.userAns[i] === q.a) correct++;
      else wrong++;
    });

    const pct = Math.round((correct / qCount) * 100);
    
    els.spct.textContent = `${pct}%`;
    els.rc.textContent = correct;
    els.rw.textContent = wrong;
    els.ru.textContent = unanswered;
    els.rs.textContent = `${correct}/${qCount}`;
    
    els.filters.correct.textContent = `Correct (${correct})`;
    els.filters.wrong.textContent = `Wrong (${wrong})`;
    els.filters.unanswered.textContent = `Unanswered (${unanswered})`;

    setTimeout(() => {
      els.ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
      els.ring.style.strokeDashoffset = 364.4 - (364.4 * pct / 100);
    }, 100);

    const grades = [
      { min: 90, letter: 'A+', text: 'Outstanding', color: 'var(--success)' },
      { min: 80, letter: 'A', text: 'Excellent', color: 'var(--accent-secondary)' },
      { min: 70, letter: 'B', text: 'Good', color: 'var(--accent-secondary)' },
      { min: 60, letter: 'C', text: 'Average', color: 'var(--warning)' },
      { min: 50, letter: 'D', text: 'Below Average', color: 'var(--warning)' },
      { min: 0, letter: 'F', text: 'Needs Improvement', color: 'var(--danger)' }
    ];

    const grd = grades.find(g => pct >= g.min) || grades[grades.length - 1];
    
    els.grade.textContent = `${grd.letter} — ${grd.text}`;
    els.grade.style.background = `rgba(255, 255, 255, 0.05)`;
    els.grade.style.color = grd.color;
    els.grade.style.border = `1px solid ${grd.color}`;
    els.grade.style.boxShadow = `0 0 15px ${grd.color}40`;

    state.revItems = state.session.map((q, i) => {
      const ua = state.userAns[i];
      const st = ua === null ? 'unanswered' : ua === q.a ? 'correct' : 'wrong';
      return { q, ua, ca: q.a, st, idx: i };
    });

    renderRev('all');
    hide(els.screens.quiz);
    show(els.screens.result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderRev = (filter) => {
    const items = filter === 'all' ? state.revItems : state.revItems.filter(x => x.st === filter);
    els.revList.innerHTML = '';

    if (items.length === 0) {
      els.revList.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px">No items in this category.</p>';
      return;
    }

    items.forEach(it => {
      const div = document.createElement('div');
      div.className = `rev-item ${it.st}`;
      
      const pillText = it.st === 'correct' ? 'Correct' : it.st === 'wrong' ? 'Wrong' : 'Unanswered';
      const uaText = it.ua ? `${it.ua}. ${escapeHTML(it.q.o[it.ua])}` : '—';
      const caText = `${it.ca}. ${escapeHTML(it.q.o[it.ca])}`;
      const uaClass = it.st === 'correct' ? 'c' : it.st === 'wrong' ? 'w' : 'u';
      
      div.innerHTML = `
        <div class="rev-qnum">
          <span>Q${it.idx + 1}</span>
          <span class="pill ${it.st}">${pillText}</span>
        </div>
        <div class="rev-qtext">${escapeHTML(it.q.q)}</div>
        <div class="rev-ans">
          <div class="ra">
            <span class="ra-lbl">Your Answer:</span>
            <span class="${uaClass}">${uaText}</span>
          </div>
          <div class="ra">
            <span class="ra-lbl">Correct Answer:</span>
            <span class="c">${caText}</span>
          </div>
        </div>
      `;
      els.revList.appendChild(div);
    });
  };

  const setFilter = (f, btn) => {
    Object.values(els.filters).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRev(f);
  };

  const readAloud = () => {
    if (!window.speechSynthesis) {
      alert("Your browser does not support text-to-speech.");
      return;
    }
    window.speechSynthesis.cancel();
    const q = state.session[state.cur];
    let text = q.q + ". ";
    const keys = ['A', 'B', 'C', 'D'];
    keys.forEach(k => {
      if (q.o[k]) text += `Option ${k}: ${q.o[k]}. `;
    });
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Event Listeners
  els.btnReadAloud.addEventListener('click', readAloud);
  document.getElementById('btn-start').addEventListener('click', startQuiz);
  els.btnPrev.addEventListener('click', () => goTo(state.cur - 1));
  els.btnNext.addEventListener('click', () => goTo(state.cur + 1));
  document.getElementById('btn-submit').addEventListener('click', confirmSubmit);
  document.getElementById('btn-newquiz').addEventListener('click', startQuiz);
  document.getElementById('btn-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  
  els.filters.all.addEventListener('click', (e) => setFilter('all', e.target));
  els.filters.correct.addEventListener('click', (e) => setFilter('correct', e.target));
  els.filters.wrong.addEventListener('click', (e) => setFilter('wrong', e.target));
  els.filters.unanswered.addEventListener('click', (e) => setFilter('unanswered', e.target));
  
  // Show start screen initially
  show(els.screens.start);
});
