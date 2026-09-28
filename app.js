const STORAGE_KEY = 'mathQuizHighscores_v1';

const state = {
  category: 'einmaleins',
  score: 0,
  timer: 60,
  timerId: null,
  currentQuestion: null,
  answered: false,
  running: false,
  roundStarted: false,
};

const els = {
  categorySelect: document.getElementById('categorySelect'),
  categoryBadge: document.getElementById('categoryBadge'),
  questionText: document.getElementById('questionText'),
  questionMeta: document.getElementById('questionMeta'),
  feedbackBox: document.getElementById('feedbackBox'),
  solutionPanel: document.getElementById('solutionPanel'),
  scoreValue: document.getElementById('scoreValue'),
  timerValue: document.getElementById('timerValue'),
  highscoreValue: document.getElementById('highscoreValue'),
  answerInput: document.getElementById('answerInput'),
  submitBtn: document.getElementById('submitBtn'),
  nextBtn: document.getElementById('nextBtn'),
  skipBtn: document.getElementById('skipBtn'),
  abortBtn: document.getElementById('abortBtn'),
};

const categoryMeta = {
  einmaleins: 'Einmaleins',
  bruchrechnung: 'Bruchrechnung',
  quadratzahlen: 'Quadratzahlen',
  fakultaet: 'Fakultät',
  potenzen: 'Potenzen',
  logarithmen: 'Logarithmen',
  logarithmen_wurzeln: 'Logarithmen mit Wurzeln',
  binaer: 'Binärsystem',
  hex: 'Hexadezimalsystem',
  modulo: 'Modulo',
  boolesche_logik: 'Boolesche Logik',
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function simplifyFraction(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  const sign = (n < 0) ^ (d < 0) ? -1 : 1;
  n = Math.abs(n);
  d = Math.abs(d);
  const g = gcd(n, d);
  return { n: sign * (n / g), d: d / g };
}

function formatFraction(n, d) {
  const s = simplifyFraction(n, d);
  if (s.d === 1) return String(s.n);
  return `${s.n}/${s.d}`;
}

function parseFractionInput(raw) {
  const s = String(raw || '').trim().replace(',', '.').replace(/\s+/g, '');
  if (!s) return null;

  const mixed = s.match(/^([-+]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const sign = mixed[1].startsWith('-') ? -1 : 1;
    const whole = Number(mixed[1].replace(/^[+-]/, ''));
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return sign * (whole + num / den);
  }

  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      const a = Number(parts[0]);
      const b = Number(parts[1]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
      return a / b;
    }
  }

  const val = Number(s);
  return Number.isFinite(val) ? val : null;
}

function normalizeText(raw) {
  return String(raw || '').trim().replace(/\s+/g, '').toLowerCase();
}

function parseBinaryValue(raw) {
  const s = normalizeText(raw);
  if (!s) return null;
  if (/^[-+]?0b[01]+$/i.test(s)) {
    const value = parseInt(s.replace(/^[-+]?0b/i, ''), 2);
    return s.startsWith('-') ? -value : value;
  }
  if (/^[-+]?[01]+$/.test(s)) {
    const value = parseInt(s, 2);
    return s.startsWith('-') ? -value : value;
  }
  if (/^[-+]?\d+$/.test(s)) return Number(s);
  return null;
}

function parseHexValue(raw) {
  const s = normalizeText(raw);
  if (!s) return null;
  if (/^[-+]?0x[0-9a-f]+$/i.test(s)) {
    const value = parseInt(s, 16);
    return s.startsWith('-') ? -value : value;
  }
  if (/^[-+]?[0-9a-f]+$/i.test(s)) {
    const value = parseInt(s, 16);
    return s.startsWith('-') ? -value : value;
  }
  if (/^[-+]?\d+$/.test(s)) return Number(s);
  return null;
}

function answerEquals(raw, expected, mode) {
  const input = String(raw || '').trim();
  if (!input) return false;

  if (mode === 'fraction') {
    const val = parseFractionInput(input);
    const exp = parseFractionInput(expected);
    if (val === null || exp === null) return false;
    return Math.abs(val - exp) < 1e-9;
  }

  if (mode === 'binary') {
    const val = parseBinaryValue(input);
    const exp = Number(expected);
    if (val === null) return false;
    return val === exp;
  }

  if (mode === 'hex') {
    const val = parseHexValue(input);
    const exp = Number(expected);
    if (val === null) return false;
    return val === exp;
  }

  if (mode === 'boolean') {
    const val = Number(input);
    if (!Number.isFinite(val)) return false;
    return val === Number(expected);
  }

  const val = Number(input);
  if (!Number.isFinite(val)) return false;
  return Math.abs(val - Number(expected)) < 1e-9;
}

function setInputAttributes(config) {
  const input = els.answerInput;
  input.type = 'text';
  input.setAttribute('type', 'text');
  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');

  const type = config && config.type ? config.type : 'text';
  const inputmode = config && config.inputmode ? config.inputmode : 'text';
  const pattern = config && config.pattern ? config.pattern : '';

  input.type = type;
  input.setAttribute('type', type);
  input.setAttribute('inputmode', inputmode);
  input.inputMode = inputmode;

  if (pattern) {
    input.setAttribute('pattern', pattern);
  } else {
    input.removeAttribute('pattern');
  }
}

function getHighscore(category) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return Number(all[category] || 0);
  } catch {
    return 0;
  }
}

function saveHighscore(category, score) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[category] = Math.max(Number(all[category] || 0), Number(score || 0));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function updateHighscoreDisplay() {
  els.highscoreValue.textContent = String(getHighscore(state.category));
}

function updateStatus() {
  els.scoreValue.textContent = String(state.score);
  els.timerValue.textContent = String(state.timer);
  els.categoryBadge.textContent = categoryMeta[state.category] || 'Lernspiel';
  updateHighscoreDisplay();
}

function setFeedback(text, type) {
  els.feedbackBox.textContent = text;
  els.feedbackBox.className = 'feedback show ' + type;
}

function clearFeedback() {
  els.feedbackBox.textContent = '';
  els.feedbackBox.className = 'feedback';
}

function revealSolutionHTML(text, title = 'Lösung') {
  els.solutionPanel.innerHTML = `
    <h3 class="solution-title">${title}</h3>
    ${text}
  `;
  els.solutionPanel.classList.add('show');
}

function hideSolution() {
  els.solutionPanel.classList.remove('show');
  els.solutionPanel.innerHTML = '';
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  stopTimer();
  state.running = true;
  state.roundStarted = true;
  state.timer = 60;
  els.timerValue.textContent = '60';

  state.timerId = setInterval(() => {
    if (!state.running || state.answered) return;
    state.timer -= 1;
    els.timerValue.textContent = String(state.timer);

    if (state.timer <= 0) {
      stopTimer();
      state.running = false;
      endRound({
        correct: false,
        forced: true,
        message: 'Die Zeit ist abgelaufen!',
        answerText: state.currentQuestion ? state.currentQuestion.correctAnswerText : 'die richtige Antwort',
      });
    }
  }, 1000);
}

function buildQuestionForCategory(category) {
  if (category === 'einmaleins') return buildMultiplicationQuestion();
  if (category === 'bruchrechnung') return buildFractionQuestion();
  if (category === 'quadratzahlen') return buildSquareQuestion();
  if (category === 'fakultaet') return buildFactorialQuestion();
  if (category === 'potenzen') return buildPowerQuestion();
  if (category === 'logarithmen') return buildLogQuestion();
  if (category === 'logarithmen_wurzeln') return buildRootLogQuestion();
  if (category === 'binaer') return buildBinaryQuestion();
  if (category === 'hex') return buildHexQuestion();
  if (category === 'modulo') return buildModuloQuestion();
  if (category === 'boolesche_logik') return buildBooleanQuestion();
  return buildMultiplicationQuestion();
}

function setQuestion(question) {
  state.currentQuestion = question;
  els.questionText.textContent = question.prompt;
  els.questionMeta.textContent = question.meta || '';
  setInputAttributes(question.input);
  els.answerInput.value = '';
  els.answerInput.placeholder = question.placeholder || 'Antwort eingeben';
  els.answerInput.focus();
}

function endRound({ correct, forced = false, message, answerText }) {
  if (state.answered) return;
  state.answered = true;
  state.running = false;
  stopTimer();
  els.answerInput.blur();

  if (correct) {
    state.score += 1;
    saveHighscore(state.category, state.score);
    setFeedback(`${message} Richtig!`, 'success');
  } else {
    setFeedback(`${message} Die richtige Antwort war: ${answerText}.`, 'error');
  }

  const html = state.currentQuestion && state.currentQuestion.explanation ? state.currentQuestion.explanation() : '';
  revealSolutionHTML(html, 'Lösungsweg');
  els.nextBtn.classList.remove('hidden');
  els.submitBtn.disabled = true;
  els.skipBtn.disabled = true;
  updateStatus();
}

function handleSubmit() {
  if (!state.currentQuestion || state.answered) return;

  const raw = els.answerInput.value;
  if (!raw || !String(raw).trim()) {
    setFeedback('Bitte gib eine Antwort ein.', 'info');
    els.answerInput.focus();
    return;
  }

  const ok = state.currentQuestion.check(raw);
  if (ok) {
    endRound({
      correct: true,
      message: 'Richtig!',
      answerText: state.currentQuestion.correctAnswerText,
    });
  } else {
    endRound({
      correct: false,
      message: 'Falsch.',
      answerText: state.currentQuestion.correctAnswerText,
    });
  }
}

function handleSkip() {
  if (!state.currentQuestion || state.answered) return;
  endRound({
    correct: false,
    message: 'Übersprungen.',
    answerText: state.currentQuestion.correctAnswerText,
  });
}

function resetGame() {
  state.score = 0;
  state.timer = 60;
  state.answered = false;
  state.running = false;
  state.roundStarted = false;
  clearFeedback();
  hideSolution();
  els.nextBtn.classList.add('hidden');
  els.submitBtn.disabled = false;
  els.skipBtn.disabled = false;
  updateStatus();
  const q = buildQuestionForCategory(state.category);
  setQuestion(q);
  startTimer();
}

function abortGame() {
  stopTimer();
  state.score = 0;
  state.timer = 60;
  state.answered = false;
  state.running = false;
  state.roundStarted = false;
  clearFeedback();
  hideSolution();
  els.nextBtn.classList.add('hidden');
  els.submitBtn.disabled = false;
  els.skipBtn.disabled = false;
  updateStatus();
  const q = buildQuestionForCategory(state.category);
  setQuestion(q);
  startTimer();
}

function showNextQuestion() {
  clearFeedback();
  hideSolution();
  els.nextBtn.classList.add('hidden');
  els.submitBtn.disabled = false;
  els.skipBtn.disabled = false;
  state.answered = false;
  state.running = false;
  const q = buildQuestionForCategory(state.category);
  setQuestion(q);
  startTimer();
  window.setTimeout(() => {
    els.answerInput.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 80);
}

function buildMultiplicationQuestion() {
  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  const result = a * b;
  return {
    prompt: `Berechne ${a} × ${b}.`,
    meta: 'Einmaleins: Zahlen richtig multiplizieren.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      return `
        <ol>
          <li>Wir rechnen ${a} × ${b}.</li>
          <li>Das bedeutet: ${a} + ${a} + ... (${b} mal).</li>
          <li>Oder als Zusammenfassung: ${a} × ${b} = ${result}.</li>
          <li>Ergebnis: <strong>${result}</strong>.</li>
        </ol>
      `;
    },
  };
}

function buildFractionQuestion() {
  const types = ['+', '-', '*', '/'];
  const op = types[randomInt(0, types.length - 1)];
  let a = randomInt(1, 9);
  let b = randomInt(2, 9);
  let c = randomInt(1, 9);
  let d = randomInt(2, 9);

  if (op === '/' && c === 0) c = 1;

  let resultN = 0;
  let resultD = 1;

  if (op === '+') {
    resultN = a * d + c * b;
    resultD = b * d;
  } else if (op === '-') {
    resultN = a * d - c * b;
    resultD = b * d;
  } else if (op === '*') {
    resultN = a * c;
    resultD = b * d;
  } else {
    resultN = a * d;
    resultD = b * c;
  }

  const reduced = simplifyFraction(resultN, resultD);
  const resultString = formatFraction(reduced.n, reduced.d);

  return {
    prompt: `Berechne ${a}/${b} ${op} ${c}/${d}.`,
    meta: 'Bruchrechnung mit Schritt-für-Schritt-Lösung.',
    input: { type: 'text', inputmode: 'text', pattern: '[-0-9/\s]*' },
    expected: resultString,
    correctAnswerText: resultString,
    mode: 'fraction',
    check(raw) {
      return answerEquals(raw, resultString, 'fraction');
    },
    explanation() {
      if (op === '+') {
        const h = b * d;
        return `
          <ol>
            <li>Hauptnenner finden: ${b} × ${d} = ${h}.</li>
            <li>Erweitern: ${a}/${b} = ${(a * d)}/${h}; ${c}/${d} = ${(c * b)}/${h}.</li>
            <li>Addieren: ${(a * d)}/${h} + ${(c * b)}/${h} = ${resultN}/${h}.</li>
            <li>Kürzen: ${formatFraction(resultN, h)} = ${resultString}.</li>
          </ol>
        `;
      }

      if (op === '-') {
        const h = b * d;
        return `
          <ol>
            <li>Hauptnenner finden: ${b} × ${d} = ${h}.</li>
            <li>Erweitern: ${a}/${b} = ${(a * d)}/${h}; ${c}/${d} = ${(c * b)}/${h}.</li>
            <li>Subtrahieren: ${(a * d)}/${h} - ${(c * b)}/${h} = ${resultN}/${h}.</li>
            <li>Kürzen: ${formatFraction(resultN, h)} = ${resultString}.</li>
          </ol>
        `;
      }

      if (op === '*') {
        return `
          <ol>
            <li>Zähler mal Zähler: ${a} × ${c} = ${a * c}.</li>
            <li>Nenner mal Nenner: ${b} × ${d} = ${b * d}.</li>
            <li>Ergebnis: ${a * c}/${b * d}.</li>
            <li>Kürzen: ${resultString}.</li>
          </ol>
        `;
      }

      return `
        <ol>
          <li>Dividieren durch einen Bruch heißt: mit dem Kehrwert multiplizieren.</li>
          <li>${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c}.</li>
          <li>Multiplizieren: ${a} × ${d} = ${a * d}; ${b} × ${c} = ${b * c}.</li>
          <li>Ergebnis: ${a * d}/${b * c}.</li>
          <li>Kürzen: ${resultString}.</li>
        </ol>
      `;
    },
  };
}

function buildSquareQuestion() {
  const n = randomInt(1, 12);
  const result = n * n;
  return {
    prompt: `Berechne ${n}².`,
    meta: 'Quadratzahl: Zahl mal sich selbst.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      return `
        <ol>
          <li>Ein Quadrat bedeutet: ${n} × ${n}.</li>
          <li>${n} × ${n} = ${result}.</li>
          <li>Also gilt: ${n}² = ${result}.</li>
        </ol>
      `;
    },
  };
}

function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function buildFactorialQuestion() {
  const n = randomInt(1, 10);
  const result = factorial(n);
  return {
    prompt: `Berechne ${n}!`,
    meta: 'Fakultät: Produkt aller positiven ganzen Zahlen bis n.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      const chain = Array.from({ length: n }, (_, i) => i + 1).join(' × ');
      return `
        <ol>
          <li>${n}! bedeutet: ${chain}.</li>
          <li>Rechne schrittweise:</li>
          <li>${Array.from({ length: n }, (_, i) => i + 1).join(' × ')} = ${result}.</li>
          <li>Ergebnis: <strong>${result}</strong>.</li>
        </ol>
      `;
    },
  };
}

function buildPowerQuestion() {
  const base = randomInt(2, 9);
  const exp = randomInt(2, 5);
  const result = Math.pow(base, exp);
  return {
    prompt: `Berechne ${base}<sup>${exp}</sup>.`,
    meta: 'Potenzen: Basis hoch Exponent.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      let chain = `${base}`;
      for (let i = 1; i < exp; i++) {
        chain += ` × ${base}`;
      }
      return `
        <ol>
          <li>${base}<sup>${exp}</sup> = ${base} × ${base} × ... (${exp} mal).</li>
          <li>${chain} = ${result}.</li>
          <li>Ergebnis: <strong>${result}</strong>.</li>
        </ol>
      `;
    },
  };
}

function buildLogQuestion() {
  const base = randomInt(2, 9);
  const exponent = randomInt(2, 5);
  const value = Math.pow(base, exponent);
  return {
    prompt: `Berechne log<sub>${base}</sub>(${value}).`,
    meta: 'Logarithmus: Welcher Exponent passt zur Basis?',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(exponent),
    correctAnswerText: String(exponent),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, exponent, 'number');
    },
    explanation() {
      return `
        <ol>
          <li>Der Logarithmus fragt: ${base}<sup>${exponent}</sup> = ${value}?</li>
          <li>Wir prüfen: ${base}<sup>${exponent}</sup> = ${Math.pow(base, exponent)}.</li>
          <li>Da ${Math.pow(base, exponent)} = ${value}, gilt:</li>
          <li>log<sub>${base}</sub>(${value}) = ${exponent}.</li>
        </ol>
      `;
    },
  };
}

function buildRootLogQuestion() {
  const base = randomInt(2, 5);
  const root = randomInt(2, 6);
  const number = Math.pow(base, root);
  const result = root / 2;
  return {
    prompt: `Berechne log<sub>${base}</sub>(√${number}).`,
    meta: 'Logarithmus mit Wurzel: Wurzel als Potenz mit Bruchexponent.',
    input: { type: 'text', inputmode: 'decimal', pattern: '[-0-9.]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      return `
        <ol>
          <li>√${number} = ${number}^{1/2}.</li>
          <li>Da ${number} = ${base}<sup>${root}</sup>, ist √${number} = (${base}<sup>${root}</sup>)<sup>1/2</sup>.</li>
          <li>Potenzregel: (${base}<sup>${root}</sup>)<sup>1/2</sup> = ${base}<sup>${root / 2}</sup>.</li>
          <li>Also gilt: log<sub>${base}</sub>(√${number}) = ${root / 2}.</li>
        </ol>
      `;
    },
  };
}

function buildBinaryQuestion() {
  const mode = Math.random() < 0.5 ? 'dec2bin' : 'bin2dec';
  if (mode === 'dec2bin') {
    const n = randomInt(0, 255);
    const binary = n.toString(2);
    return {
      prompt: `Wandle ${n} ins Binärsystem um.`,
      meta: 'Binärsystem: Stellenwerte 1, 2, 4, 8, ...',
      input: { type: 'text', inputmode: 'text', pattern: '[0-1]*' },
      expected: binary,
      correctAnswerText: binary,
      mode: 'binary',
      check(raw) {
        return answerEquals(raw, n, 'binary');
      },
      explanation() {
        return `
          <ol>
            <li>Schreibe die Zweierpotenzen: 128, 64, 32, 16, 8, 4, 2, 1.</li>
            <li>Prüfe nacheinander, welche Werte zu ${n} passen.</li>
            <li>Die passende Kombination ist <strong>${binary}</strong>.</li>
          </ol>
        `;
      },
    };
  }

  const bits = Array.from({ length: randomInt(4, 8) }, () => randomInt(0, 1)).join('');
  const value = parseInt(bits, 2);
  return {
    prompt: `Wandle ${bits} ins Dezimalsystem um.`,
    meta: 'Binärsystem: Stellenwerte beachten.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(value),
    correctAnswerText: String(value),
    mode: 'binary',
    check(raw) {
      return answerEquals(raw, value, 'binary');
    },
    explanation() {
      const arr = bits.split('').reverse();
      return `
        <ol>
          <li>Von rechts nach links sind die Stellenwerte: 1, 2, 4, 8, 16, ...</li>
          <li>${arr.map((bit, idx) => `${bit} × ${Math.pow(2, idx)}`).join(' + ')}</li>
          <li>Ergebnis: <strong>${value}</strong>.</li>
        </ol>
      `;
    },
  };
}

function buildHexQuestion() {
  const mode = Math.random() < 0.5 ? 'dec2hex' : 'hex2dec';
  if (mode === 'dec2hex') {
    const n = randomInt(0, 255);
    const text = n.toString(16).toUpperCase();
    return {
      prompt: `Wandle ${n} ins Hexadezimalsystem um.`,
      meta: 'Hexadezimal: 0-9 A-F.',
      input: { type: 'text', inputmode: 'text', pattern: '[0-9A-Fa-f]*' },
      expected: text,
      correctAnswerText: text,
      mode: 'hex',
      check(raw) {
        return answerEquals(raw, n, 'hex');
      },
      explanation() {
        return `
          <ol>
            <li>Hexadezimal nutzt 16er-Stellen: 1, 16, 256, ...</li>
            <li>${n} ÷ 16 = ${Math.floor(n / 16)} Rest ${n % 16}.</li>
            <li>Der Rest ${n % 16} entspricht ${n % 16 === 10 ? 'A' : n % 16 === 11 ? 'B' : n % 16 === 12 ? 'C' : n % 16 === 13 ? 'D' : n % 16 === 14 ? 'E' : n % 16 === 15 ? 'F' : n % 16}.</li>
            <li>Ergebnis: <strong>${text}</strong>.</li>
          </ol>
        `;
      },
    };
  }

  const value = randomInt(0, 255);
  const text = value.toString(16).toUpperCase();
  return {
    prompt: `Wandle ${text} ins Dezimalsystem um.`,
    meta: 'Hexadezimal in Dezimal wandeln.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(value),
    correctAnswerText: String(value),
    mode: 'hex',
    check(raw) {
      return answerEquals(raw, value, 'hex');
    },
    explanation() {
      return `
        <ol>
          <li>${text} besteht aus einer Stelle mit Wert ${value}.</li>
          <li>Im Hex-System gilt: A=10, B=11, C=12, D=13, E=14, F=15.</li>
          <li>Wenn ${text} nur 2 Stellen hat, ist die Berechnung mit 16er-Schritten.</li>
          <li>Ergebnis: <strong>${value}</strong>.</li>
        </ol>
      `;
    },
  };
}

function buildModuloQuestion() {
  const a = randomInt(10, 99);
  const b = randomInt(2, 12);
  const result = a % b;
  return {
    prompt: `Berechne ${a} mod ${b}.`,
    meta: 'Modulo: Division mit Rest.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'number',
    check(raw) {
      return answerEquals(raw, result, 'number');
    },
    explanation() {
      const q = Math.floor(a / b);
      return `
        <ol>
          <li>Dividiere ${a} durch ${b}: ${a} = ${b} × ${q} + ${result}.</li>
          <li>Der Rest ist ${result}.</li>
          <li>Also gilt: ${a} mod ${b} = ${result}.</li>
        </ol>
      `;
    },
  };
}

function buildBooleanQuestion() {
  const op = ['AND', 'OR', 'XOR'][randomInt(0, 2)];
  const a = randomInt(0, 15);
  const b = randomInt(0, 15);
  let result = 0;

  if (op === 'AND') result = a & b;
  else if (op === 'OR') result = a | b;
  else result = a ^ b;

  return {
    prompt: `Berechne ${a} ${op} ${b}.`,
    meta: 'Boolesche Logik: bitweise Verknüpfungen.',
    input: { type: 'text', inputmode: 'numeric', pattern: '[0-9]*' },
    expected: String(result),
    correctAnswerText: String(result),
    mode: 'boolean',
    check(raw) {
      return answerEquals(raw, result, 'boolean');
    },
    explanation() {
      return `
        <ol>
          <li>${a} in Binär: ${a.toString(2)}.</li>
          <li>${b} in Binär: ${b.toString(2)}.</li>
          <li>${op} verknüpft die Bits bitweise.</li>
          <li>Ergebnis: <strong>${result}</strong>.</li>
        </ol>
      `;
    },
  };
}

els.categorySelect.addEventListener('change', (e) => {
  state.category = e.target.value;
  resetGame();
});

els.answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    event.preventDefault();
    handleSubmit();
  }
});

els.submitBtn.addEventListener('click', handleSubmit);
els.skipBtn.addEventListener('click', handleSkip);
els.nextBtn.addEventListener('click', showNextQuestion);
els.abortBtn.addEventListener('click', abortGame);

state.category = els.categorySelect.value;
updateStatus();
resetGame();
