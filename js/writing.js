import { requireAuth, wireLogout } from "./auth-guard.js";
import { listenWords, updateWord } from "./db.js";

let uid = null;
let pool = [];
let queue = [];
let current = null;
let sessionCorrect = 0;
let sessionWrong = 0;

init();

async function init() {
  uid = await requireAuth();
  wireLogout();
  listenWords(uid, (words) => {
    pool = words.filter((w) => (w.senses || []).some((s) => (s.definitions || []).length > 0));
    if (queue.length === 0) buildQueue();
    updateStats();
    if (!current) nextCard();
  });
}

function buildQueue() {
  queue = shuffle(pool.map((w) => w.id));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickPrompt(word) {
  const sensesWithDefs = (word.senses || []).filter((s) => (s.definitions || []).length > 0);
  const sense = sensesWithDefs[Math.floor(Math.random() * sensesWithDefs.length)];
  const def = sense.definitions[Math.floor(Math.random() * sense.definitions.length)];
  const example = (def.examples && def.examples[0]) || "";
  const blanked = example
    ? example.replace(new RegExp(word.word, "ig"), "_____")
    : "";
  return { pos: sense.pos, meaning: def.meaning, example: blanked };
}

function nextCard() {
  const stage = document.getElementById("stage");

  if (pool.length === 0) {
    stage.innerHTML = `<div class="empty"><h3>Chưa có từ có định nghĩa</h3><p>Hãy thêm từ (kèm nghĩa) ở trang "Sổ từ" trước nhé.</p></div>`;
    return;
  }
  if (queue.length === 0) buildQueue();

  const wordId = queue.shift();
  current = pool.find((w) => w.id === wordId);
  if (!current) { nextCard(); return; }

  const prompt = pickPrompt(current);

  stage.innerHTML = `
    <div class="prompt-box">
      ${prompt.pos ? `<span class="pos-tag">${escapeHtml(prompt.pos)}</span>` : ""}
      <div class="meaning">${escapeHtml(prompt.meaning)}</div>
      ${prompt.example ? `<div class="hint" style="margin-top:10px;">“${escapeHtml(prompt.example)}”</div>` : ""}
    </div>
    <form id="answerForm" class="answer-row">
      <input type="text" id="answerInput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…" required>
      <button type="submit" class="btn btn-primary">Kiểm tra</button>
    </form>
    <div id="feedbackHost"></div>
  `;

  document.getElementById("answerInput").focus();
  document.getElementById("answerForm").addEventListener("submit", onSubmit);
}

async function onSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("answerInput");
  const guess = input.value.trim().toLowerCase();
  const correct = guess === current.word.trim().toLowerCase();
  const feedbackHost = document.getElementById("feedbackHost");

  if (correct) {
    sessionCorrect++;
    feedbackHost.innerHTML = `<div class="feedback ok">Chính xác! <b>${escapeHtml(current.word)}</b></div>`;
    await updateWord(uid, current.id, { writingCorrect: (current.writingCorrect || 0) + 1 });
  } else {
    sessionWrong++;
    feedbackHost.innerHTML = `<div class="feedback no">Chưa đúng — đáp án là <b>${escapeHtml(current.word)}</b></div>`;
    await updateWord(uid, current.id, { writingWrong: (current.writingWrong || 0) + 1 });
  }
  updateStats();
  input.disabled = true;
  document.querySelector("#answerForm button").disabled = true;

  setTimeout(nextCard, correct ? 900 : 1800);
}

function updateStats() {
  document.getElementById("statCorrect").textContent = sessionCorrect;
  document.getElementById("statWrong").textContent = sessionWrong;
  document.getElementById("statLeft").textContent = queue.length;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
