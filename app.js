/* ============================================================
   Angular Junior — app.js (versión final PRO)
   - selección uniforme modo examen/práctica
   - persistencia de respuestas y explicaciones
   - contador 3s antes del examen
   - pantalla final con fallos + aprobado >=35
   - estadísticas completas guardadas en localStorage
   - mejor / peor / media / total aciertos / nº exámenes
   - modo oscuro persistido
============================================================ */

/* ---------- GLOBAL STATE ---------- */
let allQuestions = [];
let quizData = [];
let perPage = setPerPage();
let currentPage = 0;
let userAnswers = [];
let timerInterval = null;
let timeRemaining = 40 * 60;
let practiceMode = false;

/* ---------- DOM refs ---------- */
let themeToggleBtn, currentThemeLabel;
let backBtnEl, globalCountEl, lastScoreEl, modeLabelEl;
let examCountEl, bestScoreEl, worstScoreEl, totalCorrectEl, avgPercentEl;
let countdownOverlayEl;

/* ---------- ESCAPE HTML ---------- */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   THEME
============================================================ */
function applyTheme(theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  currentThemeLabel.textContent = theme === "dark" ? "Oscuro" : "Claro";
  localStorage.setItem("aj_theme", theme);
}

function toggleTheme() {
  const current = localStorage.getItem("aj_theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

/* ============================================================
   RESPONSIVE PER PAGE
============================================================ */
function setPerPage() {
  if (window.innerWidth <= 480) return 1;
  if (window.innerWidth <= 768) return 2;
  return 5;
}

window.addEventListener("resize", () => {
  perPage = setPerPage();
  if (quizData.length) renderPage();
});

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  themeToggleBtn = document.getElementById("themeToggle");
  currentThemeLabel = document.getElementById("currentTheme");
  backBtnEl = document.getElementById("backBtn");
  globalCountEl = document.getElementById("globalCount");
  lastScoreEl = document.getElementById("lastScore");
  modeLabelEl = document.getElementById("modeLabel");

  examCountEl = document.getElementById("examCount");
  bestScoreEl = document.getElementById("bestScore");
  worstScoreEl = document.getElementById("worstScore");
  totalCorrectEl = document.getElementById("totalCorrect");
  avgPercentEl = document.getElementById("avgPercent");

  countdownOverlayEl = document.getElementById("countdownOverlay");

  // Theme
  const savedTheme = localStorage.getItem("aj_theme");
  applyTheme(savedTheme ? savedTheme : "light");

  themeToggleBtn.addEventListener("click", toggleTheme);

  // Back to home
  backBtnEl.addEventListener("click", () => {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById("quizScreen").classList.add("hidden");
    document.getElementById("resultScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    modeLabelEl.textContent = "—";
  });

  // Load stats
  loadStatsUI();

  // Load questions count
  fetchQuestionsCount();
});

/* ============================================================
   FETCH QUESTIONS COUNT
============================================================ */
async function fetchQuestionsCount() {
  try {
    const resp = await fetch("preguntas.json");
    const arr = await resp.json();
    allQuestions = arr;
    globalCountEl.textContent = arr.length;
  } catch {
    globalCountEl.textContent = "—";
  }
}

/* ============================================================
   STATS HANDLING
============================================================ */
function loadStatsUI() {
  lastScoreEl.textContent = localStorage.getItem("aj_last_score") || "—";
  examCountEl.textContent = localStorage.getItem("aj_exam_count") || "0";
  bestScoreEl.textContent = localStorage.getItem("aj_best_score") || "—";
  worstScoreEl.textContent = localStorage.getItem("aj_worst_score") || "—";
  totalCorrectEl.textContent = localStorage.getItem("aj_total_correct") || "0";
  avgPercentEl.textContent = localStorage.getItem("aj_avg_percent") || "—";
}

function updateStats(score, total) {
  const examCount = Number(localStorage.getItem("aj_exam_count") || 0) + 1;
  localStorage.setItem("aj_exam_count", examCount);

  const percent = Math.round((score / total) * 100);

  localStorage.setItem("aj_last_score", `${score}/${total}`);

  // best
  const best = localStorage.getItem("aj_best_score");
  if (!best || percent > Number(best)) {
    localStorage.setItem("aj_best_score", percent);
  }

  // worst
  const worst = localStorage.getItem("aj_worst_score");
  if (!worst || percent < Number(worst)) {
    localStorage.setItem("aj_worst_score", percent);
  }

  // total correct
  const totalCorrect = Number(localStorage.getItem("aj_total_correct") || 0) + score;
  localStorage.setItem("aj_total_correct", totalCorrect);

  // average %
  const avg = Math.round(
    (Number(localStorage.getItem("aj_total_correct")) / (examCount * total)) * 100
  );
  localStorage.setItem("aj_avg_percent", avg + "%");

  loadStatsUI();
}

/* ============================================================
   START EXAM + COUNTDOWN
============================================================ */
async function beginExam() {
  practiceMode = false;

  if (!allQuestions.length) {
    const resp = await fetch("preguntas.json");
    allQuestions = await resp.json();
  }

  quizData = pickRandom(allQuestions, 50);
  userAnswers = Array(50).fill(null);

  shuffleQuizAnswers(quizData);

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");
  document.getElementById("resultScreen").classList.add("hidden");

  document.getElementById("timer").style.display = "";
  document.getElementById("practiceCounter").textContent = "";
  modeLabelEl.textContent = "Examen";

  perPage = setPerPage();
  currentPage = 0;
  renderPage();
  startTimer();
}

function startExam() {
  const overlay = countdownOverlayEl;
  document.querySelectorAll("button").forEach(b => b.disabled = true);

  overlay.classList.add("show");
  overlay.textContent = "3";

  let c = 3;
  const interval = setInterval(() => {
    c--;
    if (c > 0) overlay.textContent = c;
    else {
      clearInterval(interval);
      overlay.classList.remove("show");
      overlay.textContent = "";
      document.querySelectorAll("button").forEach(b => b.disabled = false);
      beginExam();
    }
  }, 1000);
}

/* ============================================================
   START PRACTICE
============================================================ */
async function startPractice() {
  practiceMode = true;

  if (!allQuestions.length) {
    const resp = await fetch("preguntas.json");
    allQuestions = await resp.json();
  }

  quizData = [...allQuestions];
  userAnswers = Array(quizData.length).fill(null);
  shuffleQuizAnswers(quizData);

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");
  document.getElementById("resultScreen").classList.add("hidden");

  document.getElementById("timer").style.display = "none";
  document.getElementById("practiceCounter").textContent =
    `Total preguntas: ${quizData.length}`;
  modeLabelEl.textContent = "Práctica";

  perPage = setPerPage();
  currentPage = 0;
  renderPage();
}

/* ============================================================
   UTILS
============================================================ */
function pickRandom(arr, n) {
  return arr
    .map(q => ({ ...q, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map(({ r, ...rest }) => rest);
}

function shuffleQuizAnswers(data) {
  data.forEach(q => {
    const correct = q.options.find(o => o.correct);

    q.options = q.options
      .map(o => ({ ...o, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map(o => {
        delete o.r;
        return o;
      });

    q.options.forEach(o => {
      o.correct = (o.text === correct.text);
      if (!o.correct) delete o.exp;
    });
  });
}

/* ============================================================
   TIMER
============================================================ */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timeRemaining = 40 * 60;

  function tick() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    document.getElementById("timer").textContent =
      `Tiempo restante: ${m}:${s.toString().padStart(2, "0")}`;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showResults(true);
    }
    timeRemaining--;
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

/* ============================================================
   BREADCRUMB
============================================================ */
function updateBreadcrumb() {
  const totalPages = Math.ceil(quizData.length / perPage);
  document.getElementById("breadcrumb").textContent =
    `${practiceMode ? "Práctica" : "Examen"} — Página ${currentPage+1} de ${totalPages}`;
}

/* ============================================================
   RENDER PAGE
============================================================ */
function renderPage() {
  updateBreadcrumb();

  const form = document.getElementById("quizForm");
  form.innerHTML = "";

  const start = currentPage * perPage;
  const end = Math.min(start + perPage, quizData.length);

  for (let i = start; i < end; i++) {
    const q = quizData[i];

    const box = document.createElement("div");
    box.className = "question";

    box.innerHTML =
      `<p>${escapeHtml(q.q)} <span class="level ${q.level}">${(q.level||"").toUpperCase()}</span></p>`;

    if (q.code) {
      const code = document.createElement("div");
      code.className = "code-block";
      code.innerHTML = `<code>${escapeHtml(q.code)}</code>`;
      box.appendChild(code);
    }

    const optionsDiv = document.createElement("div");

    q.options.forEach((opt, j) => {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${i}`;
      input.value = j;
      input.onclick = () => markAnswer(i, j, input);

      if (userAnswers[i] === j) {
        input.checked = true;
        label.classList.add("selected");
      }

      if (!practiceMode && userAnswers[i] !== null) {
        input.disabled = true;
      }

      label.appendChild(input);
      label.insertAdjacentHTML("beforeend",
        `${String.fromCharCode(65+j)}) ${escapeHtml(opt.text)}`
      );

      optionsDiv.appendChild(label);
    });

    box.appendChild(optionsDiv);

    const exp = document.createElement("div");
    exp.className = "explanation";
    exp.id = `exp${i}`;
    box.appendChild(exp);

    // If question already answered, restore explanation + classes
    if (userAnswers[i] !== null) {
      restoreAnswerState(i, box);
    }

    form.appendChild(box);
  }

  document.getElementById("prevBtn").style.display =
    currentPage === 0 ? "none" : "inline-block";

  document.getElementById("nextBtn").textContent =
    end >= quizData.length ? "Finish" : "Next";
}

function restoreAnswerState(idx, parent) {
  const q = quizData[idx];
  const chosenIdx = userAnswers[idx];
  const correctIdx = q.options.findIndex(o => o.correct);

  const labels = [...parent.querySelectorAll("label.option")];
  const exp = parent.querySelector(`#exp${idx}`);

  labels.forEach((lab, i) => {
    lab.classList.remove("selected","correct","incorrect");
    if (i === chosenIdx) lab.classList.add("selected");
  });

  if (chosenIdx === correctIdx) {
    labels[correctIdx].classList.add("correct");
    exp.innerHTML = `✅ Correcto: ${escapeHtml(q.options[correctIdx].exp || "")}`;
  } else {
    labels[chosenIdx].classList.add("incorrect");
    labels[correctIdx].classList.add("correct");
    exp.innerHTML =
      `❌ Incorrecto.<br><strong>${escapeHtml(q.options[correctIdx].text)}</strong><br>${escapeHtml(q.options[correctIdx].exp || "")}`;
  }
}

/* ============================================================
   MARK ANSWER
============================================================ */
function markAnswer(qIndex, optIndex, inputEl) {
  const q = quizData[qIndex];
  const parent = inputEl.closest(".question");
  const exp = parent.querySelector(`#exp${qIndex}`);

  parent.querySelectorAll("label.option").forEach(l =>
    l.classList.remove("selected","correct","incorrect")
  );

  userAnswers[qIndex] = optIndex;

  const chosenLabel = inputEl.closest("label.option");
  chosenLabel.classList.add("selected");

  const correctIdx = q.options.findIndex(o => o.correct);

  if (!practiceMode) {
    parent.querySelectorAll("input").forEach(i => (i.disabled = true));
  }

  if (optIndex === correctIdx) {
    chosenLabel.classList.add("correct");
    exp.innerHTML =
      `✅ Correcto: ${escapeHtml(q.options[correctIdx].exp || "")}`;
  } else {
    chosenLabel.classList.add("incorrect");
    const labels = parent.querySelectorAll("label.option");
    labels[correctIdx].classList.add("correct");

    exp.innerHTML =
      `❌ Incorrecto.<br><strong>${escapeHtml(q.options[correctIdx].text)}</strong><br>${escapeHtml(q.options[correctIdx].exp || "")}`;
  }
}

/* ============================================================
   PAGINATION
============================================================ */
function nextPage() {
  const nextStart = (currentPage + 1) * perPage;
  if (nextStart >= quizData.length) {
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

/* ============================================================
   RESULTS
============================================================ */
function showResults(timeUp = false) {
  if (timerInterval) clearInterval(timerInterval);

  let score = 0;
  const wrong = [];

  quizData.forEach((q, i) => {
    const correctIdx = q.options.findIndex(o => o.correct);
    if (userAnswers[i] === correctIdx) score++;
    else {
      wrong.push({
        q: q.q,
        code: q.code,
        your:
          userAnswers[i] != null ? q.options[userAnswers[i]].text : null,
        correct: q.options[correctIdx].text,
        exp: q.options[correctIdx].exp || ""
      });
    }
  });

  const total = quizData.length;
  const pass = (!practiceMode && total === 50) ? score >= 35 : null;

  // Save statistics only if exam, not practice
  if (!practiceMode) {
    updateStats(score, total);
  }

  let html = `<h2>${timeUp ? "⏰ Tiempo agotado" : "Resultados"}</h2>`;
  html += `<div class="score">Puntuación: ${score}/${total}</div>`;

  if (!practiceMode) {
    html += `<div style="text-align:center;font-weight:700;margin-top:8px">
      ${pass ? "✅ APROBADO" : "❌ SUSPENSO"} — Necesitas 35 puntos para aprobar
    </div>`;
  }

  if (wrong.length > 0) {
    html += `<h3 style="margin-top:18px">Preguntas falladas (${wrong.length})</h3><ol>`;
    wrong.forEach(w => {
      html += `<li style="margin-bottom:14px;padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--card)">
        <div style="font-weight:700">${escapeHtml(w.q)}</div>`;
      if (w.code) {
        html += `<pre class="code-block"><code>${escapeHtml(w.code)}</code></pre>`;
      }
      html += `
        <div><strong>Tu respuesta:</strong> ${w.your ? escapeHtml(w.your) : "<em>No respondida</em>"}</div>
        <div><strong>Correcta:</strong> ${escapeHtml(w.correct)}</div>
        <div style="color:var(--muted)"><em>${escapeHtml(w.exp)}</em></div>
      </li>`;
    });
    html += `</ol>`;
  }

  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("resultContent").innerHTML = html;
  document.getElementById("resultScreen").classList.remove("hidden");
}

/* ============================================================
   EXPORT
============================================================ */
window.startExam = startExam;
window.startPractice = startPractice;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.markAnswer = markAnswer;
