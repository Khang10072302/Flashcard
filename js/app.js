import { requireAuth, wireLogout } from "./auth-guard.js";
import { listenWords, addWord, updateWord, deleteWord } from "./db.js";
import { parseCambridgeText } from "./cambridge-parser.js";

const POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun", "phrasal verb", "idiom"];
const POS_LABEL_VI = {
  "": "(không rõ)", noun: "danh từ", verb: "động từ", adjective: "tính từ",
  adverb: "trạng từ", preposition: "giới từ", conjunction: "liên từ",
  pronoun: "đại từ", "phrasal verb": "cụm động từ", idiom: "thành ngữ"
};

let uid = null;

init();

async function init() {
  uid = await requireAuth();
  wireLogout();
  setDateStamp();
  wireForm();
  listenWords(uid, renderList);
}

function setDateStamp() {
  const el = document.getElementById("dateStamp");
  const d = new Date();
  el.textContent = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ---------------- dynamic sense-group form ---------------- */

function senseGroupTemplate(sense = { pos: "", senseGuide: "", definitions: [{ meaning: "", examples: [] }] }) {
  const wrap = document.createElement("div");
  wrap.className = "def-entry";
  wrap.innerHTML = `
    <div class="row">
      <div class="field">
        <label>Loại từ</label>
        <select class="f-pos">
          ${POS_OPTIONS.map((p) => `<option value="${p}">${POS_LABEL_VI[p]}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Ghi chú nghĩa (vd. MOVE)</label>
        <input type="text" class="f-guide" value="${escapeAttr(sense.senseGuide || "")}">
      </div>
    </div>
    <div class="defs"></div>
    <button type="button" class="btn add-def-btn" style="margin-top:4px;">+ Thêm nghĩa cho loại từ này</button>
    <button type="button" class="btn btn-red remove-sense-btn" style="margin-top:4px;margin-left:8px;">Xóa nhóm này</button>
  `;
  wrap.querySelector(".f-pos").value = sense.pos || "";
  const defsHost = wrap.querySelector(".defs");
  (sense.definitions && sense.definitions.length ? sense.definitions : [{ meaning: "", examples: [] }])
    .forEach((d) => defsHost.appendChild(defTemplate(d)));

  wrap.querySelector(".add-def-btn").addEventListener("click", () => {
    defsHost.appendChild(defTemplate({ meaning: "", examples: [] }));
  });
  wrap.querySelector(".remove-sense-btn").addEventListener("click", () => wrap.remove());

  return wrap;
}

function defTemplate(def) {
  const row = document.createElement("div");
  row.style.marginTop = "8px";
  row.innerHTML = `
    <label>Nghĩa / định nghĩa</label>
    <textarea class="f-meaning" rows="1">${escapeHtml(def.meaning || "")}</textarea>
    <label style="margin-top:6px;">Ví dụ (mỗi dòng một câu)</label>
    <textarea class="f-examples" rows="2">${escapeHtml((def.examples || []).join("\n"))}</textarea>
    <button type="button" class="btn btn-red remove-def-btn" style="margin-top:4px;">Xóa nghĩa này</button>
  `;
  row.querySelector(".remove-def-btn").addEventListener("click", () => row.remove());
  return row;
}

function readSensesFromForm() {
  const groups = [...document.querySelectorAll("#sensesContainer .def-entry")];
  return groups.map((g) => ({
    pos: g.querySelector(".f-pos").value,
    senseGuide: g.querySelector(".f-guide").value.trim(),
    definitions: [...g.querySelectorAll(".defs > div")].map((d) => ({
      meaning: d.querySelector(".f-meaning").value.trim(),
      examples: d.querySelector(".f-examples").value.split("\n").map((x) => x.trim()).filter(Boolean)
    })).filter((d) => d.meaning)
  })).filter((g) => g.definitions.length > 0);
}

function fillFormFromParsed(parsed) {
  document.getElementById("fWord").value = parsed.word || "";
  document.getElementById("fIpaUK").value = parsed.ipaUK ? `/${parsed.ipaUK}/` : "";
  document.getElementById("fIpaUS").value = parsed.ipaUS ? `/${parsed.ipaUS}/` : "";
  const container = document.getElementById("sensesContainer");
  container.innerHTML = "";
  const senses = parsed.senses && parsed.senses.length ? parsed.senses : [{ pos: "", senseGuide: "", definitions: [{ meaning: "", examples: [] }] }];
  senses.forEach((s) => container.appendChild(senseGroupTemplate(s)));
}

/* ---------------- wiring ---------------- */

function wireForm() {
  fillFormFromParsed({ word: "", ipaUK: "", ipaUS: "", senses: [] });

  document.getElementById("addSenseBtn").addEventListener("click", () => {
    document.getElementById("sensesContainer").appendChild(senseGroupTemplate());
  });

  document.getElementById("parseBtn").addEventListener("click", () => {
    const raw = document.getElementById("pasteBox").value;
    if (!raw.trim()) return;
    const parsed = parseCambridgeText(raw);
    fillFormFromParsed(parsed);
    showToast("Đã bóc tách xong — kiểm tra lại rồi lưu nhé.");
  });

  document.getElementById("clearFormBtn").addEventListener("click", () => {
    document.getElementById("pasteBox").value = "";
    fillFormFromParsed({ word: "", ipaUK: "", ipaUS: "", senses: [] });
  });

  document.getElementById("wordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const word = document.getElementById("fWord").value.trim();
    if (!word) return;
    const data = {
      word,
      ipaUK: document.getElementById("fIpaUK").value.trim(),
      ipaUS: document.getElementById("fIpaUS").value.trim(),
      senses: readSensesFromForm()
    };
    const editId = document.getElementById("wordForm").dataset.editId;
    if (editId) {
      await updateWord(uid, editId, data);
      delete document.getElementById("wordForm").dataset.editId;
      showToast(`Đã cập nhật "${word}".`);
    } else {
      await addWord(uid, data);
      showToast(`Đã thêm "${word}" vào sổ.`);
    }
    document.getElementById("pasteBox").value = "";
    fillFormFromParsed({ word: "", ipaUK: "", ipaUS: "", senses: [] });
  });
}

/* ---------------- list rendering ---------------- */

function renderList(words) {
  document.getElementById("countLabel").textContent = `${words.length} từ trong sổ`;
  const host = document.getElementById("wordList");
  host.innerHTML = "";

  if (words.length === 0) {
    host.innerHTML = `<div class="empty"><h3>Sổ còn trống</h3><p>Thêm từ đầu tiên của bạn ở form phía trên.</p></div>`;
    return;
  }

  words.forEach((w) => host.appendChild(wordCard(w)));
}

function wordCard(w) {
  const el = document.createElement("div");
  el.className = "postcard";
  const posTags = (w.senses || []).map((s) => `<span class="pos-tag">${POS_LABEL_VI[s.pos] || s.pos || "?"}</span>`).join("");
  const firstDef = w.senses?.[0]?.definitions?.[0]?.meaning || "";
  el.innerHTML = `
    <div class="word-main">
      <div class="word">${escapeHtml(w.word)}</div>
      <div class="ipa">${w.ipaUK ? "UK " + escapeHtml(w.ipaUK) : ""} ${w.ipaUS && w.ipaUS !== w.ipaUK ? " · US " + escapeHtml(w.ipaUS) : ""}</div>
      <div>${posTags}</div>
      ${firstDef ? `<div class="def">${escapeHtml(firstDef)}</div>` : ""}
    </div>
    <div class="actions">
      <button class="icon-btn speak-icon" title="Phát âm">🔊</button>
      <button class="icon-btn edit-icon" title="Sửa">✎</button>
      <button class="icon-btn delete-icon" title="Xóa">✕</button>
    </div>
  `;
  el.querySelector(".speak-icon").addEventListener("click", () => speak(w.word));
  el.querySelector(".edit-icon").addEventListener("click", () => {
    fillFormFromParsed({ word: w.word, ipaUK: (w.ipaUK || "").replace(/\//g, ""), ipaUS: (w.ipaUS || "").replace(/\//g, ""), senses: w.senses || [] });
    document.getElementById("wordForm").dataset.editId = w.id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  el.querySelector(".delete-icon").addEventListener("click", async () => {
    if (confirm(`Xóa "${w.word}" khỏi sổ từ?`)) await deleteWord(uid, w.id);
  });
  return el;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function showToast(msg) {
  const host = document.getElementById("toastHost");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
