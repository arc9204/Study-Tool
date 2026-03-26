// =====================
// STORAGE
// =====================
let decks = [];
let fcState = {};
let qzState = {};

function save() {
  localStorage.setItem('studyDecks', JSON.stringify(decks));
}

function load() {
  const d = localStorage.getItem('studyDecks');
  if (d) decks = JSON.parse(d);
}

// =====================
// UTILITIES
// =====================
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// =====================
// TABS
// =====================
function showTab(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'tab-flashcards') renderFlashcards();
  if (id === 'tab-quiz') renderQuizzes();
}

// =====================
// DECK EDITOR
// =====================
function addCardRow(term = '', def = '') {
  const editor = document.getElementById('cardsEditor');
  const row = document.createElement('div');
  row.className = 'card-row';
  row.innerHTML = `
    <textarea placeholder="Term / Front" style="flex:1">${term}</textarea>
    <textarea placeholder="Definition / Back" style="flex:2">${def}</textarea>
    <button class="remove-btn" onclick="this.parentElement.remove()">×</button>
  `;
  editor.appendChild(row);
}

function addQuizRow(q = '', choices = ['', '', '', ''], answer = 0) {
  const editor = document.getElementById('quizEditor');
  const id = uid();
  const letters = ['A', 'B', 'C', 'D'];
  const choicesHTML = choices.map((c, i) => `
    <div class="quiz-choice-wrap">
      <span class="choice-letter-label">${letters[i]}</span>
      <input type="text" placeholder="Choice ${letters[i]}" value="${c.replace(/"/g, '&quot;')}">
      <input type="radio" name="correct-${id}" value="${i}" ${i === answer ? 'checked' : ''}>
      <label>✓</label>
    </div>
  `).join('');

  const div = document.createElement('div');
  div.className = 'quiz-card-editor';
  div.innerHTML = `
    <div class="quiz-q-row">
      <input type="text" placeholder="Question text" value="${q.replace(/"/g, '&quot;')}">
    </div>
    <div class="quiz-choices-grid">${choicesHTML}</div>
    <button class="remove-q-btn" onclick="this.parentElement.remove()">Remove Question</button>
  `;
  editor.appendChild(div);
}

function cancelEdit() {
  document.getElementById('editingDeckId').value = '';
  document.getElementById('deckTitle').value = '';
  document.getElementById('deckColor').value = '#e63946';
  document.getElementById('cardsEditor').innerHTML = '';
  document.getElementById('quizEditor').innerHTML = '';
}

function saveDeck() {
  const title = document.getElementById('deckTitle').value.trim();
  if (!title) { alert('Please enter a deck title.'); return; }

  const color = document.getElementById('deckColor').value;
  const editId = document.getElementById('editingDeckId').value;

  const cardRows = document.querySelectorAll('#cardsEditor .card-row');
  const cards = [];
  cardRows.forEach(row => {
    const tas = row.querySelectorAll('textarea');
    const term = tas[0].value.trim();
    const def = tas[1].value.trim();
    if (term && def) cards.push({ term, def });
  });

  const qRows = document.querySelectorAll('#quizEditor .quiz-card-editor');
  const questions = [];
  qRows.forEach(row => {
    const qText = row.querySelector('.quiz-q-row input').value.trim();
    const choiceInputs = row.querySelectorAll('.quiz-choices-grid input[type=text]');
    const choices = Array.from(choiceInputs).map(i => i.value.trim());
    const radioChecked = row.querySelector('input[type=radio]:checked');
    const answer = radioChecked ? parseInt(radioChecked.value) : 0;
    if (qText && choices.some(c => c)) {
      questions.push({ q: qText, choices, answer });
    }
  });

  if (cards.length === 0 && questions.length === 0) {
    alert('Add at least one card or question.'); return;
  }

  if (editId) {
    const idx = decks.findIndex(d => d.id === editId);
    if (idx !== -1) {
      decks[idx] = { ...decks[idx], title, color, cards, questions };
    }
  } else {
    decks.push({ id: uid(), title, color, cards, questions });
  }

  save();
  cancelEdit();
  renderDeckList();
  renderFlashcards();
  renderQuizzes();
}

function editDeck(id) {
  const deck = decks.find(d => d.id === id);
  if (!deck) return;
  cancelEdit();
  document.getElementById('editingDeckId').value = id;
  document.getElementById('deckTitle').value = deck.title;
  document.getElementById('deckColor').value = deck.color || '#e63946';
  deck.cards.forEach(c => addCardRow(c.term, c.def));
  deck.questions.forEach(q => addQuizRow(q.q, q.choices, q.answer));
  document.getElementById('deckTitle').scrollIntoView({ behavior: 'smooth' });
}

function deleteDeck(id) {
  if (!confirm('Delete this deck?')) return;
  decks = decks.filter(d => d.id !== id);
  save();
  renderDeckList();
  renderFlashcards();
  renderQuizzes();
}

function renderDeckList() {
  const el = document.getElementById('deckList');
  if (decks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📚</div><p>No decks yet. Create one below!</p></div>';
    return;
  }
  el.innerHTML = decks.map(d => `
    <div class="deck-item">
      <div class="deck-item-info">
        <div class="deck-item-name">
          <span class="color-dot" style="background:${d.color}"></span>${d.title}
        </div>
        <div class="deck-item-meta">${d.cards.length} card${d.cards.length !== 1 ? 's' : ''} · ${d.questions.length} question${d.questions.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="deck-item-actions">
        <button class="btn secondary" onclick="editDeck('${d.id}')">✏️ Edit</button>
        <button class="btn secondary" style="color:var(--accent1)" onclick="deleteDeck('${d.id}')">🗑 Delete</button>
      </div>
    </div>
  `).join('');
}

// =====================
// FLASHCARDS
// =====================
function initFcState(deck) {
  if (!fcState[deck.id]) {
    fcState[deck.id] = { idx: 0, cards: [...deck.cards] };
  }
}

function renderFlashcards() {
  const el = document.getElementById('flashcardsContent');
  if (decks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🃏</div><p>No decks yet. Go to <strong>Manage Decks</strong> to create one.</p></div>';
    return;
  }

  el.innerHTML = decks.map((deck, di) => {
    initFcState(deck);
    const s = fcState[deck.id];
    return `
      <div>
        ${di > 0 ? '<div class="topic-sep"></div>' : ''}
        <div class="topic-header">
          <div class="topic-dot" style="background:${deck.color}"></div>
          <div>
            <h2>${deck.title}</h2>
            <span>${deck.cards.length} card${deck.cards.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        ${deck.cards.length === 0
          ? '<div class="empty-state"><div class="icon">😶</div><p>This deck has no flashcards yet.</p></div>'
          : `
          <div>
            <div class="progress-bar"><div class="progress-fill" id="fc-prog-${deck.id}"></div></div>
            <div class="flashcard-nav">
              <span class="fc-counter" id="fc-cnt-${deck.id}">1 / ${s.cards.length}</span>
              <div class="fc-controls">
                <button class="icon-btn" id="fc-prev-${deck.id}" onclick="fcMove('${deck.id}',-1)">←</button>
                <button class="icon-btn" onclick="fcShuffle('${deck.id}')">⇌</button>
                <button class="icon-btn" id="fc-next-${deck.id}" onclick="fcMove('${deck.id}',1)">→</button>
              </div>
            </div>
            <div class="scene" id="fc-scene-${deck.id}" onclick="fcFlip('${deck.id}')">
              <div class="card-inner" id="fc-inner-${deck.id}">
                <div class="card-face card-front">
                  <div class="card-label">Term</div>
                  <div class="card-term" id="fc-term-${deck.id}"></div>
                  <div class="card-hint">Tap to reveal definition</div>
                </div>
                <div class="card-face card-back">
                  <div class="card-label">Definition</div>
                  <div class="card-def" id="fc-def-${deck.id}"></div>
                </div>
              </div>
            </div>
            <p class="tap-hint">↑ tap card to flip</p>
          </div>
        `}
      </div>
    `;
  }).join('');

  decks.forEach(deck => {
    if (deck.cards.length > 0) fcRender(deck.id);
  });
}

function fcRender(id) {
  const s = fcState[id];
  if (!s || s.cards.length === 0) return;
  const c = s.cards[s.idx];
  document.getElementById(`fc-term-${id}`).textContent = c.term;
  document.getElementById(`fc-def-${id}`).textContent = c.def;
  document.getElementById(`fc-cnt-${id}`).textContent = `${s.idx + 1} / ${s.cards.length}`;
  document.getElementById(`fc-prog-${id}`).style.width = `${((s.idx + 1) / s.cards.length) * 100}%`;
  document.getElementById(`fc-prev-${id}`).disabled = s.idx === 0;
  document.getElementById(`fc-next-${id}`).disabled = s.idx === s.cards.length - 1;
  const scene = document.getElementById(`fc-scene-${id}`);
  if (scene) scene.classList.remove('flipped');
}

function fcFlip(id) {
  document.getElementById(`fc-scene-${id}`).classList.toggle('flipped');
}

function fcMove(id, dir) {
  const s = fcState[id];
  s.idx = Math.max(0, Math.min(s.cards.length - 1, s.idx + dir));
  fcRender(id);
}

function fcShuffle(id) {
  const deck = decks.find(d => d.id === id);
  if (!deck) return;
  fcState[id] = { idx: 0, cards: shuffle(deck.cards) };
  fcRender(id);
}

// =====================
// QUIZ
// =====================
function initQzState(deck) {
  if (!qzState[deck.id]) {
    qzState[deck.id] = {
      score: 0,
      answered: new Array(deck.questions.length).fill(false),
      order: deck.questions.map((_, i) => i)
    };
  }
}

function renderQuizzes() {
  const el = document.getElementById('quizContent');
  if (decks.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">✏️</div><p>No decks yet. Go to <strong>Manage Decks</strong> to create one.</p></div>';
    return;
  }

  el.innerHTML = decks.map((deck, di) => {
    initQzState(deck);
    return `
      <div>
        ${di > 0 ? '<div class="topic-sep"></div>' : ''}
        <div class="topic-header">
          <div class="topic-dot" style="background:${deck.color}"></div>
          <div>
            <h2>${deck.title} — Quiz</h2>
            <span>Multiple Choice</span>
          </div>
        </div>
        ${deck.questions.length === 0
          ? '<div class="empty-state"><div class="icon">😶</div><p>This deck has no quiz questions yet.</p></div>'
          : `
          <div class="quiz-header">
            <div class="quiz-score-badge">Score: <span id="qz-score-${deck.id}">0</span> / <span id="qz-total-${deck.id}">0</span></div>
            <button class="btn secondary" onclick="resetQuiz('${deck.id}')">↺ Reset & Shuffle</button>
          </div>
          <div id="qz-body-${deck.id}"></div>
        `}
      </div>
    `;
  }).join('');

  decks.forEach(deck => {
    if (deck.questions.length > 0) buildQuiz(deck.id);
  });
}

function buildQuiz(id) {
  const deck = decks.find(d => d.id === id);
  if (!deck) return;
  const s = qzState[id];
  const container = document.getElementById(`qz-body-${id}`);
  if (!container) return;
  const letters = ['A', 'B', 'C', 'D'];

  container.innerHTML = s.order.map((qi, displayIdx) => {
    const q = deck.questions[qi];
    const choicesHTML = q.choices.map((c, ci) => `
      <button class="choice" onclick="answerQ('${id}',${qi},${ci},${q.answer})" id="ch-${id}-${qi}-${ci}">
        <span class="choice-letter">${letters[ci]}</span>${c}
      </button>
    `).join('');
    return `
      <div class="question-card" id="qcard-${id}-${qi}">
        <div class="q-number">Question ${displayIdx + 1}</div>
        <div class="q-text">${q.q}</div>
        <div class="choices">${choicesHTML}</div>
        <div class="explanation" id="exp-${id}-${qi}"></div>
      </div>
    `;
  }).join('');

  updateQzScore(id);
}

function answerQ(id, qi, chosen, correct) {
  const s = qzState[id];
  if (s.answered[qi]) return;
  s.answered[qi] = true;
  const deck = decks.find(d => d.id === id);
  const q = deck.questions[qi];
  const letters = ['A', 'B', 'C', 'D'];

  q.choices.forEach((_, ci) => {
    const btn = document.getElementById(`ch-${id}-${qi}-${ci}`);
    if (!btn) return;
    btn.disabled = true;
    if (ci === correct) btn.classList.add('correct');
    else if (ci === chosen) btn.classList.add('wrong');
  });

  const expEl = document.getElementById(`exp-${id}-${qi}`);
  if (chosen === correct) {
    s.score++;
    expEl.className = 'explanation show correct-exp';
    expEl.textContent = `✓ Correct! The answer is ${letters[correct]}: ${q.choices[correct]}`;
  } else {
    expEl.className = 'explanation show wrong-exp';
    expEl.textContent = `✗ Incorrect. The correct answer is ${letters[correct]}: ${q.choices[correct]}`;
  }
  updateQzScore(id);
}

function resetQuiz(id) {
  const deck = decks.find(d => d.id === id);
  if (!deck) return;
  qzState[id] = {
    score: 0,
    answered: new Array(deck.questions.length).fill(false),
    order: shuffle(deck.questions.map((_, i) => i))
  };
  buildQuiz(id);
}

function updateQzScore(id) {
  const s = qzState[id];
  const answered = s.answered.filter(Boolean).length;
  const scoreEl = document.getElementById(`qz-score-${id}`);
  const totalEl = document.getElementById(`qz-total-${id}`);
  if (scoreEl) scoreEl.textContent = s.score;
  if (totalEl) totalEl.textContent = answered;
}

// =====================
// IMPORT / EXPORT
// =====================
function exportData() {
  const blob = new Blob([JSON.stringify(decks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'study-decks.json';
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      decks = data;
      save();
      fcState = {};
      qzState = {};
      renderDeckList();
      renderFlashcards();
      renderQuizzes();
      alert('Imported successfully!');
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAll() {
  if (!confirm('Clear ALL decks? This cannot be undone.')) return;
  decks = [];
  fcState = {};
  qzState = {};
  save();
  renderDeckList();
  renderFlashcards();
  renderQuizzes();
}

// =====================
// INIT
// =====================
load();
renderDeckList();
renderFlashcards();
renderQuizzes();
