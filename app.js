let allQuestions = [];
let quizData = [];
let perPage = setPerPage();
let currentPage = 0;
let userAnswers = [];
let timerInterval;
let timeRemaining = 40 * 60;

let practiceMode = false;

/* ============================
    ESCAPAR CÓDIGO HTML
============================ */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================
   RESPONSIVE PER PAGE
============================ */
function setPerPage() {
  if (window.innerWidth <= 480) return 1;
  else if (window.innerWidth <= 768) return 2;
  else return 5;
}

window.addEventListener('resize', () => {
  if (!practiceMode) {
    perPage = setPerPage();
    renderPage();
  }
});

/* ============================
   EXAM MODE
============================ */
async function startExam() {
  practiceMode = false;

  if (allQuestions.length === 0) {
    const resp = await fetch('preguntas.json');
    allQuestions = await resp.json();
  }

  quizData = pickRandom(allQuestions, 50);
  userAnswers = Array(quizData.length).fill(null);

  shuffleQuizAnswers(quizData);

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('practiceInfo').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  document.getElementById('timer').classList.remove('hidden');

  currentPage = 0;
  renderPage();
  startTimer();
}

/* ============================
   PRACTICE MODE
============================ */
async function startPractice() {
  practiceMode = true;

  if (allQuestions.length === 0) {
    const resp = await fetch('preguntas.json');
    allQuestions = await resp.json();
  }

  quizData = [...allQuestions];  
  userAnswers = Array(quizData.length).fill(null);

  shuffleQuizAnswers(quizData);

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('practiceInfo').classList.remove('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  document.getElementById('timer').classList.add('hidden');

  renderPractice();
}

/* Mostrar todo en modo práctica */
function renderPractice() {
  const form = document.getElementById('quizForm');
  form.innerHTML = "";

  quizData.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'question';

    div.innerHTML = `
      <p><strong>${escapeHtml(item.q)}</strong>
      <span class="level ${item.level || ''}">${item.level?.toUpperCase() || ''}</span></p>
    `;

    if (item.code) {
      div.innerHTML += `
        <pre class="code-block"><code>${escapeHtml(item.code)}</code></pre>
      `;
    }

    item.options.forEach((opt, j) => {
      div.innerHTML += `
        <label>
          <input type="radio" name="q${i}" value="${j}"
            onclick="markAnswer(${i},${j},this)">
          ${String.fromCharCode(65 + j)}) ${escapeHtml(opt.text)}
        </label>`;
    });

    div.innerHTML += `<div class="explanation" id="exp${i}"></div>`;
    form.appendChild(div);
  });

  document.getElementById('prevBtn').style.display = "none";
  document.getElementById('nextBtn').style.display = "none";
}

/* ============================
   UTILIDADES
============================ */
function pickRandom(array, n) {
  return array
    .map(q => ({ ...q, rnd: Math.random() }))
    .sort((a, b) => a.rnd - b.rnd)
    .slice(0, n)
    .map(({ rnd, ...rest }) => rest);
}

function shuffleQuizAnswers(data) {
  data.forEach(item => {
    const correct = item.options.find(o => o.correct);
    item.options = item.options
      .map(o => ({ ...o, rnd: Math.random() }))
      .sort((a, b) => a.rnd - b.rnd)
      .map(o => {
        delete o.rnd;
        return o;
      });

    item.options.forEach(o => {
      o.correct = (o.text === correct.text);
      if (!o.correct) delete o.exp;
    });
  });
}

/* ============================
   TIMER (solo examen)
============================ */
function startTimer() {
  function update() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    document.getElementById('timer').textContent =
      `Time Remaining: ${m}:${s.toString().padStart(2, '0')}`;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showResults(true);
    }

    timeRemaining--;
  }

  update();
  timerInterval = setInterval(update, 1000);
}

/* ============================
   RENDER EXAM BY PAGES
============================ */
function renderPage() {
  const form = document.getElementById('quizForm');
  form.innerHTML = '';
  const start = currentPage * perPage;
  const end = Math.min(start + perPage, quizData.length);

  for (let i = start; i < end; i++) {
    const item = quizData[i];
    const div = document.createElement('div');
    div.className = 'question';

    div.innerHTML = `
      <p><strong>${escapeHtml(item.q)}</strong>
      <span class="level ${item.level || ''}">${item.level?.toUpperCase() || ''}</span></p>
    `;

    if (item.code) {
      div.innerHTML += `
        <pre class="code-block"><code>${escapeHtml(item.code)}</code></pre>
      `;
    }

    item.options.forEach((opt, j) => {
      const checked = userAnswers[i] === j ? 'checked' : '';
      const disabled = userAnswers[i] !== null ? 'disabled' : '';
      div.innerHTML += `
        <label>
          <input type="radio" name="q${i}" value="${j}" ${checked} ${disabled}
            onclick="markAnswer(${i},${j},this)">
          ${String.fromCharCode(65 + j)}) ${escapeHtml(opt.text)}
        </label>`;
    });

    div.innerHTML += `<div class="explanation" id="exp${i}"></div>`;
    form.appendChild(div);
  }

  document.getElementById('prevBtn').style.display = currentPage === 0 ? 'none' : 'inline-block';
  document.getElementById('nextBtn').textContent =
    end >= quizData.length ? 'Finish' : 'Next';
}

/* ============================
   MARCAR RESPUESTA
============================ */
function markAnswer(qIndex, optIndex, inputEl) {
  const q = quizData[qIndex];
  const parent = inputEl.closest('.question');
  const expDiv = parent.querySelector(`#exp${qIndex}`);

  parent.querySelectorAll('label').forEach(l => l.classList.remove('correct', 'incorrect'));

  const correctIndex = q.options.findIndex(o => o.correct);
  const chosen = q.options[optIndex];

  userAnswers[qIndex] = optIndex;

  if (!practiceMode) {
    parent.querySelectorAll('input').forEach(i => i.disabled = true);
  }

  if (chosen.correct) {
    inputEl.parentElement.classList.add('correct');
    expDiv.innerHTML = `✅ Correcto: ${escapeHtml(q.options[correctIndex].exp)}`;
  } else {
    inputEl.parentElement.classList.add('incorrect');
    parent.querySelectorAll('label')[correctIndex].classList.add('correct');

    expDiv.innerHTML =
      `❌ Incorrecto.<br><strong>${escapeHtml(q.options[correctIndex].text)}</strong><br>${escapeHtml(q.options[correctIndex].exp)}`;
  }
}

/* ============================
   PAGINACIÓN
============================ */
function saveCurrentPageAnswers() {}

function nextPage() {
  if ((currentPage + 1) * perPage >= quizData.length) {
    showResults();
    return;
  }
  currentPage++;
  renderPage();
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

/* ============================
   RESULTADOS
============================ */
function showResults(timeUp = false) {
  clearInterval(timerInterval);

  let score = 0;
  const wrongQuestions = [];

  quizData.forEach((item, idx) => {
    const correctIdx = item.options.findIndex(o => o.correct);
    if (userAnswers[idx] === correctIdx) score++;
    else wrongQuestions.push(item.q);
  });

  let html = `<h2>${timeUp ? '⏰ Tiempo agotado' : 'Resultados del examen'}</h2>`;
  html += `<div class="score">Puntuación total: ${score}/${quizData.length}</div>`;

  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultContent').innerHTML = html;
  document.getElementById('resultScreen').classList.remove('hidden');
}
