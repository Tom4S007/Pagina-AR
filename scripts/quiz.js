// Trivia de identificación de aves: una pregunta a la vez, respuesta inmediata y repaso final.
// Para añadir preguntas basta con agregar un objeto a QUESTIONS (la respuesta correcta es el índice de `options`).

const QUESTIONS = [
  {
    icon: '🐦', bird: 'Turpial amarillo',
    question: '¿Cuál es una característica que permite identificar al turpial amarillo?',
    options: [
      'Tiene la espalda amarilla y una pequeña máscara y babero negros.',
      'Tiene el cuerpo completamente verde y la cara blancuzca.',
      'Tiene la corona y las partes inferiores de color rojo brillante.',
    ],
    correct: 0,
  },
  {
    icon: '🦜', bird: 'Guacamaya cariseca',
    question: '¿Qué característica distingue a la guacamaya cariseca?',
    options: [
      'Tiene el plumaje completamente amarillo y una cara uniforme.',
      'Es mayormente verde, tiene la cara blancuzca y la parte inferior de las alas rojiza.',
      'Tiene una máscara negra y una espalda amarilla.',
    ],
    correct: 1,
  },
  {
    icon: '🐤', bird: 'Reinita dorada',
    question: '¿Qué característica ayuda a identificar a la reinita dorada?',
    options: [
      'Tiene una cola canela muy extendida y suele visitar comederos.',
      'Tiene el vientre rojo brillante y habita principalmente en postes de cercas.',
      'Generalmente es amarilla y tiene la cara lisa y uniforme.',
    ],
    correct: 2,
  },
  {
    icon: '🐦', bird: 'Pechirrojo',
    question: '¿Cómo se reconoce al macho adulto del pechirrojo?',
    options: [
      'Por su corona y partes inferiores de color rojo brillante, con partes superiores marrón oscuro.',
      'Por su plumaje mayormente verde y su cara blancuzca.',
      'Por su cuerpo amarillo y su pequeña máscara negra.',
    ],
    correct: 0,
  },
  {
    icon: '🌺', bird: 'Colibrí colirufo',
    question: '¿Cuál es una característica del colibrí colirufo?',
    options: [
      'Tiene una espalda amarilla y un babero negro.',
      'Tiene el vientre gris más manchado y el color canela de la cola más extendido que especies similares, y no tiene la cola horquetada como el colibrí Buff-bellied.',
      'Tiene las partes inferiores de color rojo brillante y se alimenta de insectos en los postes de las carreteras.',
    ],
    correct: 1,
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];
const root = document.getElementById('quiz');
const section = document.getElementById('trivia');

if (root && section) {
  let index = 0;
  let score = 0;
  let answers = []; // índice elegido por pregunta

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function renderQuestion() {
    const q = QUESTIONS[index];
    const total = QUESTIONS.length;
    root.innerHTML = `
      <div class="quiz-progress" role="progressbar" aria-label="Progreso de la trivia" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${index + 1}">
        <span class="quiz-step">Pregunta ${index + 1} de ${total}</span>
        <span class="quiz-bar" aria-hidden="true"><i style="width:${((index + 1) / total) * 100}%"></i></span>
        <span class="quiz-score">${score} ${score === 1 ? 'acierto' : 'aciertos'}</span>
      </div>
      <p class="quiz-bird"><span aria-hidden="true">${q.icon}</span> ${esc(q.bird)}</p>
      <h3 class="quiz-question" id="quiz-question" tabindex="-1">${esc(q.question)}</h3>
      <div class="quiz-options" role="group" aria-labelledby="quiz-question">
        ${q.options.map((text, i) => `
          <button class="quiz-option" type="button" data-index="${i}">
            <span class="quiz-letter" aria-hidden="true">${LETTERS[i]}</span>
            <span class="quiz-option-text">${esc(text)}</span>
            <span class="quiz-mark" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quiz-feedback" role="status" hidden></div>
      <p class="quiz-hint">Toca una respuesta o pulsa <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> en el teclado.</p>`;
  }

  function answer(choice) {
    if (answers[index] !== undefined) return;
    const q = QUESTIONS[index];
    answers[index] = choice;
    const ok = choice === q.correct;
    if (ok) score += 1;

    root.querySelectorAll('.quiz-option').forEach((btn) => {
      const i = Number(btn.dataset.index);
      btn.disabled = true;
      if (i === q.correct) { btn.classList.add('is-correct'); btn.querySelector('.quiz-mark').textContent = '✓'; }
      else if (i === choice) { btn.classList.add('is-wrong'); btn.querySelector('.quiz-mark').textContent = '✕'; }
      else btn.classList.add('is-dim');
    });

    const last = index === QUESTIONS.length - 1;
    const feedback = root.querySelector('#quiz-feedback');
    feedback.className = `quiz-feedback ${ok ? 'is-correct' : 'is-wrong'}`;
    feedback.innerHTML = `
      <p><strong>${ok ? '¡Correcto!' : 'Casi.'}</strong> ${ok ? '' : `La respuesta correcta es <b>${LETTERS[q.correct]}</b>.`} Así se reconoce a ${esc(q.bird.toLowerCase())}: ${esc(q.options[q.correct].replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase()))}.</p>
      <button class="button button-dark quiz-next" type="button">${last ? 'Ver resultado' : 'Siguiente pregunta'} <span aria-hidden="true">→</span></button>`;
    feedback.hidden = false;
    root.querySelector('.quiz-hint').hidden = true;
    root.querySelector('.quiz-score').textContent = `${score} ${score === 1 ? 'acierto' : 'aciertos'}`;
    feedback.querySelector('.quiz-next').focus({ preventScroll: false });
  }

  function next() {
    if (answers[index] === undefined) return;
    if (index < QUESTIONS.length - 1) {
      index += 1;
      renderQuestion();
      root.querySelector('#quiz-question').focus({ preventScroll: true });
    } else renderResult();
  }

  function verdict() {
    const total = QUESTIONS.length;
    if (score === total) return ['¡Ojo de observador!', 'Las reconociste todas. Ya puedes salir a buscarlas en el campus.'];
    if (score >= total - 2) return ['Muy buen ojo', 'Vas por buen camino. Repasa las que fallaste y vuelve a intentarlo.'];
    return ['Sigue observando', 'Cada ave tiene su señal. Revisa la clave y prueba de nuevo.'];
  }

  function renderResult() {
    const [title, text] = verdict();
    root.innerHTML = `
      <div class="quiz-result">
        <p class="quiz-bird"><span aria-hidden="true">🏁</span> Resultado final</p>
        <h3 class="quiz-result-title" id="quiz-result-title" tabindex="-1">${title}</h3>
        <p class="quiz-result-score"><strong>${score}</strong> / ${QUESTIONS.length}</p>
        <p class="quiz-result-text">${text}</p>
        <h4 class="quiz-key-title">✅ Clave de respuestas</h4>
        <ul class="quiz-key">
          ${QUESTIONS.map((q, i) => `
            <li class="${answers[i] === q.correct ? 'is-correct' : 'is-wrong'}">
              <span class="quiz-key-mark" aria-label="${answers[i] === q.correct ? 'Acertaste' : 'Fallaste'}">${answers[i] === q.correct ? '✓' : '✕'}</span>
              <span class="quiz-key-bird">${q.icon} ${esc(q.bird)}</span>
              <span class="quiz-key-answer"><b>${LETTERS[q.correct]}</b> · ${esc(q.options[q.correct])}</span>
            </li>`).join('')}
        </ul>
        <div class="quiz-result-actions">
          <button class="button button-dark quiz-restart" type="button">Intentar de nuevo <span aria-hidden="true">↺</span></button>
          <a class="hero-text-link quiz-link" href="#explorar">Ver la guía de aves <span aria-hidden="true">↓</span></a>
        </div>
      </div>`;
    root.querySelector('#quiz-result-title').focus({ preventScroll: true });
  }

  function restart() {
    index = 0; score = 0; answers = [];
    renderQuestion();
    root.querySelector('#quiz-question').focus({ preventScroll: true });
  }

  root.addEventListener('click', (event) => {
    const option = event.target.closest('.quiz-option');
    if (option) return answer(Number(option.dataset.index));
    if (event.target.closest('.quiz-next')) return next();
    if (event.target.closest('.quiz-restart')) restart();
  });

  // Atajos de teclado: A/B/C (o 1/2/3) responden; flecha derecha avanza. Sólo si el foco está dentro de la trivia.
  section.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('a')) return;
    const key = event.key.toLowerCase();
    const pos = LETTERS.map((l) => l.toLowerCase()).indexOf(key);
    const num = ['1', '2', '3', '4'].indexOf(key);
    const choice = pos >= 0 ? pos : num;
    if (choice >= 0 && choice < QUESTIONS[index]?.options.length && root.querySelector('.quiz-option')) {
      event.preventDefault(); answer(choice);
    } else if (key === 'arrowright' && root.querySelector('.quiz-next')) { event.preventDefault(); next(); }
  });

  renderQuestion();
}