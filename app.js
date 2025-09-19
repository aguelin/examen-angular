let allQuestions = [];
let quizData = [];
let perPage = setPerPage();
let currentPage = 0;
let userAnswers = [];
let timerInterval;
let timeRemaining = 40 * 60;

function setPerPage() {
  if (window.innerWidth <= 480) return 1;
  else if (window.innerWidth <= 768) return 2;
  else return 5;
}
window.addEventListener('resize', () => {
  perPage = setPerPage();
  renderPage();
});

async function startExam() {
  if (allQuestions.length === 0) {
    const resp = await fetch('preguntas.json');
    allQuestions = await resp.json();
  }
  quizData = pickRandom(allQuestions, 50);
  userAnswers = Array(quizData.length).fill(null);
  shuffleQuizAnswers(quizData);

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  renderPage();
  startTimer();
}

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
      .map(o => { delete o.rnd; return o; });
    item.options.forEach(o => {
      o.correct = (o.text === correct.text);
      if (!o.correct) delete o.exp;
    });
  });
}

function startTimer() {
  const timerDisplay = document.getElementById('timer');
  function update() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    timerDisplay.textContent = `Time Remaining: ${m}:${s.toString().padStart(2, '0')}`;
    if (timeRemaining <= 0) { clearInterval(timerInterval); showResults(true); }
    timeRemaining--;
  }
  update();
  timerInterval = setInterval(update, 1000);
}

function renderPage() {
  const form = document.getElementById('quizForm');
  form.innerHTML = '';
  const start = currentPage * perPage;
  const end = Math.min(start + perPage, quizData.length);

  for (let i = start; i < end; i++) {
    const item = quizData[i];
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `<p><strong>${item.q}</strong>
      <span class="level ${item.level || ''}">${item.level?.toUpperCase() || ''}</span></p>`;
    item.options.forEach((opt, j) => {
      const checked = userAnswers[i] === j ? 'checked' : '';
      const disabled = userAnswers[i] !== null ? 'disabled' : '';
      div.innerHTML += `
        <label>
          <input type="radio" name="q${i}" value="${j}" ${checked} ${disabled}
            onclick="markAnswer(${i},${j},this)">
          ${String.fromCharCode(65 + j)}) ${opt.text}
        </label>`;
    });
    div.innerHTML += `<div class="explanation" id="exp${i}"></div>`;
    form.appendChild(div);
  }

  document.getElementById('prevBtn').style.display = currentPage === 0 ? 'none' : 'inline-block';
  document.getElementById('nextBtn').textContent =
    end >= quizData.length ? 'Finish' : 'Next';
}

function markAnswer(qIndex, optIndex, inputEl) {
  const q = quizData[qIndex];
  const parent = inputEl.closest('.question');
  const expDiv = parent.querySelector(`#exp${qIndex}`);
  parent.querySelectorAll('label').forEach(l => l.classList.remove('correct', 'incorrect'));

  const chosen = q.options[optIndex];
  const correctIndex = q.options.findIndex(o => o.correct);
  userAnswers[qIndex] = optIndex;

  parent.querySelectorAll('input').forEach(inp => inp.disabled = true);

  if (chosen.correct) {
    inputEl.parentElement.classList.add('correct');
    expDiv.textContent = `✅ Correcto: ${q.options[correctIndex].exp}`;
  } else {
    inputEl.parentElement.classList.add('incorrect');
    parent.querySelectorAll('label')[correctIndex].classList.add('correct');
    expDiv.textContent =
      `❌ Incorrecto. ✅ Correcto: ${q.options[correctIndex].text} — ${q.options[correctIndex].exp}`;
  }
}

function saveCurrentPageAnswers() {
  const start = currentPage * perPage;
  const end = Math.min(start + perPage, quizData.length);
  for (let i = start; i < end; i++) {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    userAnswers[i] = sel ? parseInt(sel.value) : userAnswers[i];
  }
}

function nextPage() {
  saveCurrentPageAnswers();
  if ((currentPage + 1) * perPage >= quizData.length) { showResults(); return; }
  currentPage++;
  renderPage();
}

function prevPage() {
  saveCurrentPageAnswers();
  if (currentPage > 0) { currentPage--; renderPage(); }
}

function showResults(timeUp = false) {
  saveCurrentPageAnswers();
  clearInterval(timerInterval);
  let score = 0;
  const levelScores = {};
  const wrongQuestions = [];

  quizData.forEach((item, idx) => {
    const correctIdx = item.options.findIndex(o => o.correct);
    const lvl = item.level || 'General';
    if (!levelScores[lvl]) levelScores[lvl] = { correct: 0, total: 0 };
    levelScores[lvl].total++;

    if (userAnswers[idx] === correctIdx) {
      score++;
      levelScores[lvl].correct++;
    } else {
      wrongQuestions.push({
        question: item.q,
        chosen:
          userAnswers[idx] !== null
            ? item.options[userAnswers[idx]].text
            : 'No contestada',
        correct: item.options[correctIdx].text
      });
    }
  });

  let html = `<h2>${timeUp ? '⏰ Tiempo agotado' : 'Resultados del examen'}</h2>`;
  html += `<div class="score">Puntuación total: ${score}/${quizData.length}</div>`;
  html += `<div class="level-scores">`;
  for (const lvl in levelScores) {
    const s = levelScores[lvl];
    html += `<p><strong>Nivel ${lvl}:</strong> ${s.correct}/${s.total}</p>`;
  }
  html += `</div>`;

  if (wrongQuestions.length > 0) {
    html += `<h3>❌ Preguntas falladas o no contestadas</h3><ul class="wrong-list">`;
    wrongQuestions.forEach((w, i) => {
      html += `
        <li class="wrong-item">
          <h3>${i + 1}) ${w.question}</h3>
          <p class="your-answer">Tu respuesta: ${w.chosen}</p>
          <p class="correct-answer">Correcta: ${w.correct}</p>
        </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p class="score" style="color:var(--correct)">
              🎉 ¡Has acertado todas las preguntas!
            </p>`;
  }

  // Oculta la pantalla de examen y muestra la de resultados
  document.getElementById('quizScreen').classList.add('hidden');
  const resultDiv = document.getElementById('resultContent');
  resultDiv.innerHTML = html;
  document.getElementById('resultScreen').classList.remove('hidden');
}
