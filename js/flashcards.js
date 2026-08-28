import { requireAuth, wireLogout } from "./auth-guard.js";
import { listenWords, updateWord } from "./db.js";

const POS_LABEL_VI = {
  "": "", noun: "danh từ", verb: "động từ", adjective: "tính từ",
  adverb: "trạng từ", preposition: "giới từ", conjunction: "liên từ",
  pronoun: "đại từ", "phrasal verb": "cụm động từ", idiom: "thành ngữ"
};

let uid = null;
let allWords = [];
let deck = [];
let idx = 0;
let flipped = false;

init();

async function init() {
  uid = await requireAuth();
  wireLogout();
  document.getElementById("includeMastered").addEventListener("change", buildDeck);
  listenWords(uid, (words) => {
    allWords = words;
    buildDeck();
  });
}

function buildDeck() {
  const includeMastered = document.getElementById("includeMastered").checked;
  const pool = includeMastered ? allWords : allWords.filter((w) => w.status !== "mastered");
  deck = shuffle([...pool]);
  idx = 0;
  flipped = false;
  render();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function render() {
  const stage = document.getElementById("stage");
  const label = document.getElementById("deckLabel");

  if (allWords.length === 0) {
    label.textContent = "Sổ từ đang trống";
    stage.innerHTML = `<div class="empty"><h3>Chưa có từ nào</h3><p>Hãy thêm từ ở trang "Sổ từ" trước nhé.</p></div>`;
    return;
  }
  if (deck.length === 0) {
    label.textContent = "Không có từ để ôn";
    stage.innerHTML = `<div class="empty"><h3>Đã thuộc hết rồi!</h3><p>Bật "Bao gồm từ đã thuộc" để ôn lại, hoặc thêm từ mới.</p></div>`;
    return;
  }
  if (idx >= deck.length) {
    label.textContent = "Hoàn thành phiên ôn tập";
    stage.innerHTML = `
      <div class="empty">
        <h3>Xong bộ thẻ! 🎉</h3>
        <p>Bạn vừa ôn ${deck.length} từ.</p>
        <button class="btn btn-primary" id="restartBtn" style="margin-top:14px;">Ôn lại từ đầu</button>
      </div>`;
    document.getElementById("restartBtn").addEventListener("click", buildDeck);
    return;
  }

  const w = deck[idx];
  label.textContent = `Thẻ ${idx + 1} / ${deck.length}`;

  const backHtml = (w.senses || []).map((s) => `
    <div class="def-block">
      <b>${POS_LABEL_VI[s.pos] || s.pos || "?"}${s.senseGuide ? " · " + escapeHtml(s.senseGuide) : ""}</b>
      ${(s.definitions || []).map((d) => `
        <div style="margin-top:4px;">${escapeHtml(d.meaning)}</div>
        ${(d.examples || []).map((ex) => `<div class="example">“${escapeHtml(ex)}”</div>`).join("")}
      `).join("")}
    </div>
  `).join("") || `<div class="def-block"><em>Chưa có định nghĩa được lưu.</em></div>`;

  stage.innerHTML = `
    <div class="flip-card" id="flipCard">
      <div class="flip-card-inner">
        <div class="flip-face front">
          <div class="stamp">${w.status === "mastered" ? "Đã thuộc" : w.status === "learning" ? "Đang học" : "Mới"}</div>
          <div class="word">${escapeHtml(w.word)}</div>
          <div class="ipa">${w.ipaUK || ""}</div>
          <div class="hint" style="margin-top:14px;">Bấm để xem nghĩa</div>
        </div>
        <div class="flip-face back">
          <div class="eyebrow">${escapeHtml(w.word)}</div>
          ${backHtml}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:14px;align-items:center;">
      <button class="speak-btn" id="speakBtn" title="Phát âm">🔊</button>
    </div>
    <div class="rate-row">
      <button class="btn btn-red" id="dontKnowBtn">Chưa nhớ</button>
      <button class="btn btn-green" id="knowBtn">Nhớ rồi</button>
    </div>
  `;

  document.getElementById("flipCard").addEventListener("click", () => {
    flipped = !flipped;
    document.getElementById("flipCard").classList.toggle("flipped", flipped);
  });
  document.getElementById("speakBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    speak(w.word);
  });
  document.getElementById("dontKnowBtn").addEventListener("click", () => rate(w, false));
  document.getElementById("knowBtn").addEventListener("click", () => rate(w, true));
}

async function rate(word, knew) {
  const box = knew ? Math.min((word.box || 0) + 1, 4) : 0;
  const status = knew ? (box >= 3 ? "mastered" : "learning") : "learning";
  await updateWord(uid, word.id, { box, status, lastReviewed: new Date().toISOString() });
  idx++;
  flipped = false;
  render();
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
