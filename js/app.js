import { requireAuth, wireLogout } from "./auth-guard.js";
import { auth } from "./firebase-init.js";
import { listenWords, addWord, updateWord, deleteWord, listenUserProfile, updateUserProfile, recordFlashcardResult, recordWritingResult } from "./db.js";
import { STAMP_FILES } from "./stamps.js";

const TAGS = ["Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom"];
const TAG_LABEL = { Noun: "Danh từ", Verb: "Động từ", Adjective: "Tính từ", Adverb: "Trạng từ", Phrase: "Cụm từ", Idiom: "Thành ngữ" };

const ICONS = {
  dashboard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="8.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="8.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/></svg>`,
  inbox: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h7a1 1 0 011 1v9a1 1 0 01-1 1H3V2z" stroke="currentColor" stroke-width="1.3"/><path d="M10 2h1a1 1 0 011 1v9a1 1 0 01-1 1h-1" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h4M5 7.5h4M5 10h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  flashcard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="4.5" y="5.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.5"/></svg>`,
  writing: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  quiz: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 6.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>`,
  progress: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l3.5-4L9 10l5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 14h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
};

let uid = null;
let allWords = [];
let userProfile = null;
let section = "dashboard";
let editingId = null;

const content = document.getElementById("content");

init();

async function init() {
  uid = await requireAuth();
  wireLogout("#logoutMenuBtn");
  wireNav();
  wireUserMenu();
  wireSidebarToggle();
  wireMobileMenu();
  wireBrandIconFallback();
  listenWords(uid, onWordsChange);
  listenUserProfile(uid, onProfileChange);
}

function onProfileChange(profile) {
  userProfile = profile;
  paintSidebarAvatar();
  if (section === "profile") render();
}

function paintSidebarAvatar() {
  const img = document.getElementById("sidebarAvatarImg");
  const fallback = document.getElementById("sidebarAvatarFallback");
  const nameEl = document.getElementById("sidebarUserName");
  const email = auth.currentUser?.email || "";
  const displayName = userProfile?.displayName?.trim();
  nameEl.textContent = displayName || email || "Tài khoản";

  if (userProfile?.avatar) {
    img.src = userProfile.avatar;
    img.style.display = "block";
    fallback.style.display = "none";
  } else {
    img.style.display = "none";
    fallback.style.display = "flex";
    fallback.textContent = (displayName || email || "?")[0].toUpperCase();
  }
}

function wireUserMenu() {
  const btn = document.getElementById("avatarBtn");
  const dropdown = document.getElementById("userDropdown");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
    btn.classList.toggle("open", dropdown.classList.contains("open"));
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove("open");
      btn.classList.remove("open");
    }
  });
  document.getElementById("profileMenuBtn").addEventListener("click", () => {
    dropdown.classList.remove("open");
    btn.classList.remove("open");
    goto("profile");
  });
}

function wireSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const collapseBtn = document.getElementById("sidebarToggleBtn");
  const brandBtn = document.getElementById("brandIconBtn");

  if (localStorage.getItem("sidebarCollapsed") === "1") {
    sidebar.classList.add("collapsed");
  }

  collapseBtn.addEventListener("click", () => {
    sidebar.classList.add("collapsed");
    localStorage.setItem("sidebarCollapsed", "1");
  });
  brandBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("collapsed")) {
      sidebar.classList.remove("collapsed");
      localStorage.setItem("sidebarCollapsed", "0");
    }
  });
}

function wireMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("mobileMenuBtn");

  function setOpen(isOpen) {
    sidebar.classList.toggle("mobile-open", isOpen);
    btn.textContent = isOpen ? "✕" : "☰";
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
  btn.addEventListener("click", () => setOpen(!sidebar.classList.contains("mobile-open")));
  window.__closeMobileNav = () => setOpen(false);
}

function wireBrandIconFallback() {
  const img = document.getElementById("brandIconImg");
  const fallback = document.getElementById("brandIconFallback");
  img.addEventListener("error", () => {
    img.style.display = "none";
    fallback.style.display = "flex";
  });
}

function onWordsChange(words) {
  allWords = words;
  if (section === "inbox" || section === "progress" || section === "dashboard") render();
}

function wireNav() {
  document.querySelectorAll(".nav-item[data-section]").forEach((btn) => {
    btn.querySelector(".ico").innerHTML = ICONS[btn.dataset.section] || "";
    btn.addEventListener("click", () => goto(btn.dataset.section));
  });
  document.getElementById("newWordBtn").addEventListener("click", () => { editingId = null; goto("add"); });
}

function goto(next) {
  section = next;
  document.querySelectorAll(".nav-item[data-section]").forEach((b) => {
    b.classList.toggle("active", b.dataset.section === next);
  });
  if (window.__closeMobileNav) window.__closeMobileNav();
  render();
}

function render() {
  content.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "fade-up";
  content.appendChild(wrap);
  const renderers = {
    dashboard: renderDashboard, inbox: renderInbox, flashcard: renderFlashcard, writing: renderWriting,
    quiz: renderQuiz, progress: renderProgress, add: renderAdd, profile: renderProfile
  };
  (renderers[section] || renderInbox)(wrap);
}

/* ============================================================
   DASHBOARD — tổng quan: Today's Quest, xem nhanh các mục, lịch học
   ============================================================ */
const HEAT_COLORS = ["#EAEDF0", "#BAD5F5", "#5BA4F5", "#1A73E8", "#0071E3"];
// NOTE: dữ liệu lịch học minh họa (ngẫu nhiên) — chưa gắn với lịch sử học thật theo từng ngày.
const HEATMAP_DATA = Array.from({ length: 16 * 7 }, () => {
  const v = Math.random();
  return v > 0.75 ? 4 : v > 0.55 ? 3 : v > 0.35 ? 2 : v > 0.18 ? 1 : 0;
});

let dashQuests = [
  { id: "fc", label: "Ôn Flashcard", target: 2, done: 0, icon: "🃏", color: "#5E5CE6", section: "flashcard" },
  { id: "wr", label: "Luyện viết", target: 2, done: 0, icon: "✒️", color: "#30D158", section: "writing" },
  { id: "qz", label: "Hoàn thành Quiz", target: 3, done: 0, icon: "📮", color: "#FF9F0A", section: "quiz" },
  { id: "vb", label: "Thêm từ mới", target: 1, done: 0, icon: "📖", color: "#0071E3", section: "add" },
  { id: "mk", label: "Đánh dấu đã thuộc", target: 2, done: 0, icon: "⭐", color: "#FF3B30", section: "inbox" }
];

function greetingText() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function monthLabels() {
  const now = new Date();
  const labels = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("vi-VN", { month: "short" }));
  }
  return labels;
}

// Dùng chung cho Dashboard ("Chuỗi ngày học") và trang Tiến độ — cùng 1 dữ liệu,
// cùng 1 giao diện, để 2 nơi luôn khớp nhau (Dashboard chỉ là bản xem nhanh của Tiến độ).
function heatmapPanelHtml() {
  return `
    <div class="heat-panel">
      <div class="heat-head">
        <div>
          <div class="heat-title">Chuỗi ngày học</div>
          <div class="heat-sub">${HEATMAP_DATA.filter((v) => v > 0).length} ngày hoạt động trong 16 tuần qua</div>
        </div>
        <div class="heat-legend">
          <span>Ít</span>
          ${HEAT_COLORS.map((c) => `<div class="heat-swatch" style="background:${c};"></div>`).join("")}
          <span>Nhiều</span>
        </div>
      </div>
      <div class="heat-months">${monthLabels().map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>
      <div class="heat-body">
        <div class="heat-days">${["CN", "", "T3", "", "T5", "", "T7"].map((d) => `<span>${d}</span>`).join("")}</div>
        ${Array.from({ length: 16 }, (_, w) => `
          <div class="heat-col">
            ${Array.from({ length: 7 }, (_, d) => {
              const val = HEATMAP_DATA[w * 7 + d] ?? 0;
              return `<div class="heat-cell" style="background:${HEAT_COLORS[val]};" title="${val} lần học"></div>`;
            }).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDashboard(root) {
  const el = document.createElement("div");
  el.className = "section w-dashboard";
  root.appendChild(el);

  const mastered = allWords.filter((w) => w.mastered).length;
  const pct = allWords.length ? Math.round((mastered / allWords.length) * 100) : 0;
  const totalStreak = allWords.reduce((a, w) => a + (w.streak || 0), 0);
  const topWord = [...allWords].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];

  function paint() {
    const totalQ = dashQuests.length;
    const doneQ = dashQuests.filter((q) => q.done >= q.target).length;
    const questPct = Math.round((doneQ / totalQ) * 100);
    const ringLen = 2 * Math.PI * 22;

    el.innerHTML = `
      <div class="section-head">
        <h1>${greetingText()} 👋</h1>
        <p class="lede">${topWord && topWord.streak ? `Streak cao nhất: "${escapeHtml(topWord.word)}" — ${topWord.streak}🔥` : "Bắt đầu học từ đầu tiên của bạn hôm nay."}</p>
      </div>

      <div class="dash-grid">
        <div class="dash-quest">
          <div class="dash-quest-head">
            <div>
              <div class="dash-quest-title"><span class="emoji">⚡</span><span class="txt">Today's Quest</span></div>
              <div class="dash-quest-sub">${doneQ} / ${totalQ} hoàn thành · ${new Date().toLocaleDateString("vi-VN", { weekday: "long", month: "short", day: "numeric" })}</div>
            </div>
            <div class="dash-quest-ring">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" stroke-width="4"/>
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--blue)" stroke-width="4"
                  stroke-dasharray="${ringLen}" stroke-dashoffset="${ringLen * (1 - questPct / 100)}"
                  stroke-linecap="round" transform="rotate(-90 26 26)" style="transition:stroke-dashoffset .5s ease;"/>
              </svg>
              <div class="pct">${questPct}%</div>
            </div>
          </div>
          <div class="quest-list">
            ${dashQuests.map((q) => {
              const completed = q.done >= q.target;
              return `
                <div class="quest-row">
                  <button class="quest-check ${completed ? "done" : ""}" data-q="${q.id}" style="${completed ? `background:${q.color};` : ""}">${completed ? "✓" : ""}</button>
                  <span class="quest-icon">${q.icon}</span>
                  <span class="quest-label ${completed ? "done" : ""}">${escapeHtml(q.label)}</span>
                  <div class="quest-dots">
                    ${Array.from({ length: q.target }, (_, i) => `<div class="quest-dot" style="${i < q.done ? `background:${q.color};` : ""}"></div>`).join("")}
                  </div>
                  ${!completed ? `<button class="quest-go" data-goto="${q.section}" style="background:${q.color}22;color:${q.color};">Đi →</button>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <button class="dash-card dash-vocab" data-goto="inbox">
          <div class="vocab-stat-row">
            <div class="vocab-stat-icon" style="background:#0071E31A;color:#0071E3;">📖</div>
            <div class="vocab-stat-body">
              <div class="vocab-stat-label">Tổng số từ</div>
              <div class="vocab-stat-num" style="color:#0071E3;">${allWords.length}</div>
            </div>
          </div>
          <div class="vocab-stat-row">
            <div class="vocab-stat-icon" style="background:#30D1581A;color:#30D158;">✓</div>
            <div class="vocab-stat-body">
              <div class="vocab-stat-label">Đã thuộc</div>
              <div class="vocab-stat-num" style="color:#30D158;">${mastered}</div>
            </div>
          </div>
          <div class="vocab-stat-row">
            <div class="vocab-stat-icon" style="background:#FF9F0A1A;color:#FF9F0A;">⏳</div>
            <div class="vocab-stat-body">
              <div class="vocab-stat-label">Chưa thuộc</div>
              <div class="vocab-stat-num" style="color:#FF9F0A;">${allWords.length - mastered}</div>
            </div>
          </div>
        </button>

        <button class="dash-card dash-flashcard" data-goto="flashcard">
          <div class="dash-card-inner">
            <div class="dash-card-head">
              <div class="dash-card-icon" style="background:#5E5CE61A;color:#5E5CE6;">${ICONS.flashcard}</div>
            </div>
            <div class="dash-card-label">Flashcard</div>
            <div class="dash-card-desc">${allWords.length - mastered} cần ôn</div>
          </div>
        </button>

        <button class="dash-card dash-writing" data-goto="writing">
          <div class="dash-card-inner">
            <div class="dash-card-head">
              <div class="dash-card-icon" style="background:#30D1581A;color:#30D158;">${ICONS.writing}</div>
            </div>
            <div class="dash-card-label">Luyện viết</div>
            <div class="dash-card-desc">Gợi nhớ chủ động</div>
          </div>
        </button>

        <button class="dash-card dash-quiz" data-goto="quiz">
          <div class="dash-card-inner">
            <div class="dash-card-head">
              <div class="dash-card-icon" style="background:#FF9F0A1A;color:#FF9F0A;">${ICONS.quiz}</div>
            </div>
            <div class="dash-card-label">Quiz</div>
            <div class="dash-card-desc">Tự kiểm tra</div>
          </div>
        </button>

        <button class="dash-card dash-progress" data-goto="progress">
          <div class="dash-card-inner">
            <div class="dash-card-head">
              <div class="dash-card-icon" style="background:#FF3B301A;color:#FF3B30;">${ICONS.progress}</div>
            </div>
            <div class="dash-card-label">Tiến độ</div>
            <div class="dash-card-desc">${pct}% đã thuộc</div>
          </div>
        </button>
      </div>

      ${heatmapPanelHtml()}
    `;

    el.querySelectorAll(".quest-check").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = dashQuests.find((x) => x.id === btn.dataset.q);
        if (q && q.done < q.target) q.done++;
        paint();
      });
    });
    el.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => goto(btn.dataset.goto));
    });
  }

  paint();
}

/* ============================================================
   INBOX — danh sách từ, tìm kiếm, lọc, mở rộng xem chi tiết
   ============================================================ */
let inboxSearch = "";
let inboxFilter = "all";
let expandedId = null;

function renderInbox(root) {
  const el = document.createElement("div");
  el.className = "section w-inbox";
  const mastered = allWords.filter((w) => w.mastered).length;
  el.innerHTML = `
    <div class="section-head">
      <h1>Sổ từ vựng</h1>
      <p class="lede">${allWords.length} từ · ${mastered} đã thuộc</p>
    </div>
    <div class="toolbar">
      <div class="search-wrap">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#86868B" stroke-width="1.5"/><path d="M10 10l3 3" stroke="#86868B" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input type="text" id="searchInput" placeholder="Tìm từ...">
      </div>
      <button class="filter-btn ${inboxFilter === "all" ? "active" : ""}" data-f="all">Tất cả</button>
      <button class="filter-btn ${inboxFilter === "mastered" ? "active" : ""}" data-f="mastered">Đã thuộc</button>
      <button class="filter-btn ${inboxFilter === "learning" ? "active" : ""}" data-f="learning">Đang học</button>
    </div>
    <div class="word-list" id="wordListHost"></div>
  `;
  root.appendChild(el);

  const searchInput = el.querySelector("#searchInput");
  searchInput.value = inboxSearch;
  searchInput.addEventListener("input", (e) => { inboxSearch = e.target.value; paintList(); });

  el.querySelectorAll(".filter-btn").forEach((b) => {
    b.addEventListener("click", () => {
      inboxFilter = b.dataset.f;
      el.querySelectorAll(".filter-btn").forEach((x) => x.classList.toggle("active", x === b));
      paintList();
    });
  });

  function paintList() {
    const host = el.querySelector("#wordListHost");
    const q = inboxSearch.toLowerCase();
    const filtered = allWords.filter((w) => {
      const matchesQuery = w.word.toLowerCase().includes(q) || (w.meaning || "").toLowerCase().includes(q);
      const matchesFilter = inboxFilter === "all" || (inboxFilter === "mastered" ? w.mastered : !w.mastered);
      return matchesQuery && matchesFilter;
    });

    if (filtered.length === 0) {
      host.innerHTML = `<div class="empty-state">Không tìm thấy từ nào</div>`;
      return;
    }

    host.innerHTML = filtered.map((w) => wordCardHtml(w)).join("");

    host.querySelectorAll(".word-card").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".word-card-head").addEventListener("click", () => {
        expandedId = expandedId === id ? null : id;
        paintList();
      });
      const toggleBtn = card.querySelector(".mastered-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const w = allWords.find((x) => x.id === id);
          updateWord(uid, id, { mastered: !w.mastered });
        });
      }
      const editBtn = card.querySelector(".edit-word-btn");
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const w = allWords.find((x) => x.id === id);
          openEditWordModal(w);
        });
      }
    });
  }

  paintList();
}

function wordCardHtml(w) {
  const isExpanded = expandedId === w.id;
  const fcTotal = (w.flashcardCorrect || 0) + (w.flashcardWrong || 0);
  const fcOkPct = fcTotal ? Math.round(((w.flashcardCorrect || 0) / fcTotal) * 100) : 0;
  const fcNoPct = fcTotal ? 100 - fcOkPct : 0;
  const wrTotal = (w.writingCorrect || 0) + (w.writingWrong || 0);
  const wrOkPct = wrTotal ? Math.round(((w.writingCorrect || 0) / wrTotal) * 100) : 0;
  const wrNoPct = wrTotal ? 100 - wrOkPct : 0;
  return `
    <div class="word-card" data-id="${w.id}" data-word="${escapeAttr(w.word)}">
      <button class="word-card-head" type="button">
        <div class="word-avatar ${w.mastered ? "mastered" : ""}">${escapeHtml((w.word || "?")[0] || "?").toUpperCase()}</div>
        <div class="word-card-main">
          <div class="word-card-title">
            <span class="w">${escapeHtml(w.word)}</span>
            <span class="ph">${escapeHtml(w.phonetic || "")}</span>
            <span class="tag-pill tag-${w.tag || "Noun"}">${TAG_LABEL[w.tag] || w.tag || ""}</span>
            ${w.mastered ? `<span class="mastered-tag">✓ Đã thuộc</span>` : ""}
          </div>
          <div class="word-card-meaning">${escapeHtml(w.meaning || "")}</div>
        </div>
        <div class="word-card-right">
          ${w.streak ? `<span class="streak-badge">🔥${w.streak}</span>` : ""}
          <svg class="chev ${isExpanded ? "rot" : ""}" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="#C7C7CC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </button>
      ${isExpanded ? `
        <div class="word-card-body scale-in">
          <div class="detail-row">
            <div class="detail-block">
              <div class="detail-label">Nghĩa</div>
              <div class="detail-value">${escapeHtml(w.meaning || "")}</div>
            </div>
            ${w.example ? `
            <div class="detail-block">
              <div class="detail-label">Ví dụ</div>
              <div class="detail-value italic">"${escapeHtml(w.example)}"</div>
            </div>` : ""}
          </div>

          <div class="stats-heading">Thống kê</div>
          <div class="practice-stats">
            <div class="practice-stat-card">
              <div class="practice-stat-icon" style="background:#5E5CE61A;color:#5E5CE6;">🃏</div>
              <div class="practice-stat-body">
                <div class="practice-stat-title">Flashcard</div>
                <div class="ps-bar">
                  <div class="ps-bar-ok" style="width:${fcOkPct}%;"></div>
                  <div class="ps-bar-no" style="width:${fcNoPct}%;"></div>
                </div>
                <div class="practice-stat-numbers">
                  <span class="ps-num">Đã học<b>${w.flashcardSeen || 0}</b></span>
                  <span class="ps-num ok">Thuộc<b>${w.flashcardCorrect || 0}</b></span>
                  <span class="ps-num no">Quên<b>${w.flashcardWrong || 0}</b></span>
                </div>
              </div>
            </div>
            <div class="practice-stat-card">
              <div class="practice-stat-icon" style="background:#30D1581A;color:#30D158;">✒️</div>
              <div class="practice-stat-body">
                <div class="practice-stat-title">Luyện viết</div>
                <div class="ps-bar">
                  <div class="ps-bar-ok" style="width:${wrOkPct}%;"></div>
                  <div class="ps-bar-no" style="width:${wrNoPct}%;"></div>
                </div>
                <div class="practice-stat-numbers">
                  <span class="ps-num">Đã làm<b>${w.writingSeen || 0}</b></span>
                  <span class="ps-num ok">Đúng<b>${w.writingCorrect || 0}</b></span>
                  <span class="ps-num no">Sai<b>${w.writingWrong || 0}</b></span>
                </div>
              </div>
            </div>
          </div>
              </div>
            </div>
          </div>

          <div class="word-card-foot">
            <span class="added">Thêm ${formatDate(w.addedAt)}</span>
            <div class="word-card-foot-actions">
              <button class="edit-word-btn" type="button">Sửa</button>
              <button class="mastered-toggle ${w.mastered ? "is-mastered" : ""}" type="button">${w.mastered ? "Bỏ đánh dấu" : "Đánh dấu đã thuộc"}</button>
            </div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

/* ============================================================
   MODAL SỬA TỪ — giống thiết kế mẫu (không đổi ngày "Thêm",
   nút Xóa nằm trong modal này thay vì ở thẻ ngoài)
   ============================================================ */
function openEditWordModal(word) {
  const root = document.getElementById("modalRoot");
  let selectedTag = word.tag || "Noun";

  root.innerHTML = `
    <div class="modal-backdrop" id="editBackdrop">
      <div class="modal-card">
        <div class="modal-head">
          <h2>Sửa từ</h2>
          <button class="modal-close" id="modalCloseBtn" type="button">✕</button>
        </div>
        <div class="f-field">
          <label>Từ *</label>
          <input type="text" id="editWordInput" class="large" value="${escapeAttr(word.word)}">
        </div>
        <div class="f-field">
          <label>Phiên âm</label>
          <input type="text" id="editPhoneticInput" value="${escapeAttr(word.phonetic || "")}">
        </div>
        <div class="f-field">
          <label>Nghĩa *</label>
          <input type="text" id="editMeaningInput" value="${escapeAttr(word.meaning || "")}">
        </div>
        <div class="f-field">
          <label>Câu ví dụ</label>
          <input type="text" id="editExampleInput" value="${escapeAttr(word.example || "")}">
        </div>
        <div class="f-field">
          <label>Loại từ</label>
          <div class="tag-picker" id="editTagPicker">
            ${TAGS.map((t) => `<button type="button" class="tag-choice ${t === selectedTag ? "active" : ""}" data-t="${t}">${TAG_LABEL[t]}</button>`).join("")}
          </div>
        </div>
        <div class="modal-meta">Thêm ${formatDate(word.addedAt)} · ngày sẽ không thay đổi</div>
        <div class="form-actions">
          <button class="save" id="editSaveBtn" type="button">Lưu thay đổi</button>
          <button class="cancel" id="editCancelBtn" type="button">Hủy</button>
        </div>
        <button class="modal-delete-link" id="editDeleteBtn" type="button">Xóa từ này</button>
      </div>
    </div>
  `;

  const backdrop = document.getElementById("editBackdrop");
  requestAnimationFrame(() => backdrop.classList.add("open"));

  function close() {
    backdrop.classList.remove("open");
    setTimeout(() => { root.innerHTML = ""; }, 180);
  }

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.getElementById("modalCloseBtn").addEventListener("click", close);
  document.getElementById("editCancelBtn").addEventListener("click", close);

  root.querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTag = btn.dataset.t;
      root.querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  document.getElementById("editSaveBtn").addEventListener("click", async () => {
    const newWord = document.getElementById("editWordInput").value.trim();
    const newMeaning = document.getElementById("editMeaningInput").value.trim();
    if (!newWord || !newMeaning) return;
    await updateWord(uid, word.id, {
      word: newWord,
      phonetic: document.getElementById("editPhoneticInput").value.trim(),
      meaning: newMeaning,
      example: document.getElementById("editExampleInput").value.trim(),
      tag: selectedTag
    });
    close();
  });

  document.getElementById("editDeleteBtn").addEventListener("click", async () => {
    if (confirm(`Xóa "${word.word}" khỏi sổ từ?`)) {
      await deleteWord(uid, word.id);
      close();
    }
  });
}

/* ============================================================
   FLASHCARD
   ============================================================ */
function renderFlashcard(root) {
  root.innerHTML = "";
  const deck = shuffle([...allWords]);
  let index = 0;
  let flipped = false;
  const reviewedIds = [];
  let correctCount = 0;
  let wrongCount = 0;

  const el = document.createElement("div");
  el.className = "section w-mid";
  root.appendChild(el);

  function paint() {
    const remaining = deck.filter((w) => !reviewedIds.includes(w.id));

    if (allWords.length === 0) {
      el.innerHTML = `<div class="empty-state">Chưa có từ nào. Thêm từ ở "Sổ từ vựng" trước nhé.</div>`;
      return;
    }
    if (remaining.length === 0) {
      el.innerHTML = `
        <div class="done-state">
          <div class="emoji">🎉</div>
          <h1>Xong hết rồi!</h1>
          <p>Bạn vừa ôn ${deck.length} thẻ.</p>
          <div class="done-stats">
            <div>Bạn đã nhớ <b style="color:var(--green);">${correctCount}</b> thẻ</div>
            <div>Bạn chưa nhớ <b style="color:var(--red);">${wrongCount}</b> thẻ</div>
          </div>
          <button class="pbtn" id="reviewAgainBtn" style="margin-top:24px;">Ôn lại</button>
        </div>
      `;
      el.querySelector("#reviewAgainBtn").addEventListener("click", () => renderFlashcard(root));
      return;
    }

    const current = remaining[index % remaining.length];
    const pct = Math.round((reviewedIds.length / deck.length) * 100);

    el.innerHTML = `
      <div class="section-head">
        <h1>Flashcard</h1>
        <div class="progress-row">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
          <span class="progress-count">${reviewedIds.length} / ${deck.length}</span>
        </div>
      </div>

      <div class="flip-card ${flipped ? "flipped" : ""}" id="flipCard">
        <div class="flip-card-inner">
          <div class="flip-face flip-front">
            <span class="tag-pill tag-${current.tag || "Noun"}" style="margin-bottom:24px;">${TAG_LABEL[current.tag] || current.tag || ""}</span>
            <div class="w">${escapeHtml(current.word)}</div>
            <div class="ph">${escapeHtml(current.phonetic || "")}</div>
            <div class="tip">CHẠM ĐỂ XEM NGHĨA</div>
          </div>
          <div class="flip-face flip-back">
            <div class="meaning">${escapeHtml(current.meaning || "")}</div>
            <div class="divider"></div>
            <div class="example">${current.example ? `"${escapeHtml(current.example)}"` : ""}</div>
          </div>
        </div>
      </div>

      <div class="rate-row">
        <button class="sbtn again">Chưa nhớ</button>
        <button class="got-it">Nhớ rồi ✓</button>
      </div>
    `;

    el.querySelector("#flipCard").addEventListener("click", () => { flipped = !flipped; paint(); });

    const againBtn = el.querySelector(".again");
    const gotItBtn = el.querySelector(".got-it");
    if (againBtn) againBtn.addEventListener("click", (e) => { e.stopPropagation(); next(current, false); });
    if (gotItBtn) gotItBtn.addEventListener("click", (e) => { e.stopPropagation(); next(current, true); });
  }

  function next(word, knew) {
    reviewedIds.push(word.id);
    recordFlashcardResult(uid, word.id, knew);
    if (knew) {
      correctCount++;
      updateWord(uid, word.id, { streak: (word.streak || 0) + 1, mastered: (word.streak || 0) + 1 >= 3 });
    } else {
      wrongCount++;
      updateWord(uid, word.id, { streak: 0 });
    }
    flipped = false;
    index++;
    paint();
  }

  paint();
}

/* ============================================================
   WRITING
   ============================================================ */
function renderWriting(root) {
  if (allWords.length === 0) {
    const el = document.createElement("div");
    el.className = "section w-writing";
    el.innerHTML = `<div class="empty-state">Chưa có từ nào. Thêm từ ở "Sổ từ vựng" trước nhé.</div>`;
    root.appendChild(el);
    return;
  }

  let mode = "fill";
  let wordIndex = 0;
  let checked = false;
  let correct = false;
  let letterText = "";

  const el = document.createElement("div");
  el.className = "section w-writing";
  root.appendChild(el);

  function paint() {
    const current = allWords[wordIndex % allWords.length];

    el.innerHTML = `
      <div class="section-head">
        <h1>Luyện viết</h1>
        <p class="lede">Củng cố trí nhớ bằng cách gợi nhớ chủ động</p>
      </div>

      <div class="mode-switch">
        <button data-m="fill" class="${mode === "fill" ? "active" : ""}">Điền từ</button>
        <button data-m="letter" class="${mode === "letter" ? "active" : ""}">Viết tự do</button>
      </div>

      <div id="modeHost"></div>
    `;

    el.querySelectorAll(".mode-switch button").forEach((b) => {
      b.addEventListener("click", () => { mode = b.dataset.m; paint(); });
    });

    const host = el.querySelector("#modeHost");

    if (mode === "fill") {
      const blanked = current.example
        ? current.example.replace(new RegExp(escapeRegex(current.word), "ig"), "___________")
        : "";
      host.innerHTML = `
        <div class="hint-card">
          <div class="lbl">NGHĨA</div>
          <div class="meaning">${escapeHtml(current.meaning || "")}</div>
          ${blanked ? `<div class="example">"${escapeHtml(blanked)}"</div>` : ""}
          <div class="hint-row">
            <div class="hint-item"><div class="lbl">PHÁT ÂM</div><div class="val">${escapeHtml(current.phonetic || "—")}</div></div>
            <div class="hint-item"><div class="lbl">SỐ CHỮ CÁI</div><div class="val">${current.word.length} chữ</div></div>
            <div class="hint-item"><div class="lbl">LOẠI TỪ</div><div class="val">${TAG_LABEL[current.tag] || current.tag || ""}</div></div>
          </div>
        </div>
        <div class="answer-card ${checked ? (correct ? "ok" : "no") : ""}">
          <input type="text" id="answerInput" placeholder="Gõ từ tiếng Anh..." autocomplete="off" autocapitalize="off" spellcheck="false" ${checked ? "disabled" : ""}>
          ${checked ? `<div class="answer-feedback ${correct ? "ok" : "no"}">${correct ? "✓ Chính xác!" : `✗ Đáp án là: ${escapeHtml(current.word)}`}</div>` : ""}
        </div>
        <div class="writing-actions">
          ${!checked
            ? `<button class="pbtn" id="checkBtn">Kiểm tra</button>`
            : `<button class="pbtn" id="nextBtn">Từ tiếp theo →</button>`}
        </div>
      `;

      const input = host.querySelector("#answerInput");
      if (input) {
        input.focus();
        input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !checked) doCheck(); });
      }
      const checkBtn = host.querySelector("#checkBtn");
      if (checkBtn) checkBtn.addEventListener("click", doCheck);
      const nextBtn = host.querySelector("#nextBtn");
      if (nextBtn) nextBtn.addEventListener("click", () => {
        wordIndex++; checked = false; paint();
      });

      function doCheck() {
        const val = (input.value || "").trim().toLowerCase();
        correct = val === current.word.trim().toLowerCase();
        checked = true;
        recordWritingResult(uid, current.id, correct);
        if (correct) updateWord(uid, current.id, { streak: (current.streak || 0) + 1 });
        paint();
      }
    } else {
      const wordCount = letterText.split(/\s+/).filter(Boolean).length;
      host.innerHTML = `
        <div class="letter-card">
          <div class="words-hint">DÙNG NHỮNG TỪ NÀY: ${allWords.map((w) => escapeHtml(w.word)).join(" · ")}</div>
          <textarea id="letterArea" placeholder="Viết một đoạn văn dùng các từ vựng ở trên...">${escapeHtml(letterText)}</textarea>
        </div>
        <div class="letter-count">${wordCount} từ đã viết</div>
      `;
      const area = host.querySelector("#letterArea");
      area.addEventListener("input", (e) => {
        letterText = e.target.value;
        host.querySelector(".letter-count").textContent = `${letterText.split(/\s+/).filter(Boolean).length} từ đã viết`;
      });
    }
  }

  paint();
}

/* ============================================================
   QUIZ
   ============================================================ */
function renderQuiz(root) {
  const el = document.createElement("div");
  el.className = "section w-quiz";
  root.appendChild(el);

  if (allWords.length < 2) {
    el.innerHTML = `<div class="empty-state">Cần ít nhất 2 từ có nghĩa để làm quiz.</div>`;
    return;
  }

  const questions = allWords.map((w) => {
    const others = shuffle(allWords.filter((x) => x.id !== w.id)).slice(0, 3);
    const choices = shuffle([w.meaning, ...others.map((o) => o.meaning)]);
    return { word: w, choices, answer: w.meaning };
  });

  let qIndex = 0;
  let selected = null;
  let score = 0;
  let done = false;

  function paint() {
    if (done) {
      el.className = "section w-quiz-done";
      const pct = Math.round((score / questions.length) * 100);
      const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--orange)" : "var(--red)";
      const msg = pct === 100 ? "Điểm tuyệt đối! 🎉" : pct >= 80 ? "Làm tốt lắm! 👏" : pct >= 50 ? "Khá ổn, luyện thêm nhé." : "Đừng nản — ôn lại rồi thử lại!";
      el.innerHTML = `
        <div class="quiz-score" style="color:${color};">${pct}%</div>
        <div class="quiz-score-label">${score} / ${questions.length} câu đúng</div>
        <div class="quiz-score-msg">${msg}</div>
        <button class="pbtn" id="retryBtn" style="margin-top:32px;">Làm lại</button>
      `;
      el.querySelector("#retryBtn").addEventListener("click", () => renderQuiz(root));
      return;
    }

    el.className = "section w-quiz";
    const current = questions[qIndex];
    el.innerHTML = `
      <div class="section-head">
        <h1>Quiz</h1>
        <div class="progress-row">
          <div class="progress-track"><div class="progress-fill" style="width:${((qIndex + 1) / questions.length) * 100}%;"></div></div>
          <span class="progress-count">${qIndex + 1}/${questions.length}</span>
        </div>
      </div>

      <div class="quiz-card">
        <div class="lbl">TỪ NÀY NGHĨA LÀ GÌ?</div>
        <div class="w">${escapeHtml(current.word.word)}</div>
        <div class="ph">${escapeHtml(current.word.phonetic || "")}</div>
      </div>

      <div class="quiz-choices">
        ${current.choices.map((c, i) => {
          let cls = "";
          if (selected) {
            if (c === current.answer) cls = "correct";
            else if (c === selected) cls = "wrong";
          }
          return `<button class="quiz-choice ${cls}" data-c="${escapeAttr(c)}"><span class="letter">${String.fromCharCode(65 + i)}.</span>${escapeHtml(c)}</button>`;
        }).join("")}
      </div>

      ${selected ? `<button class="pbtn block" id="nextQBtn" style="margin-top:16px;">${qIndex + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo →"}</button>` : ""}
    `;

    el.querySelectorAll(".quiz-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (selected) return;
        selected = btn.dataset.c;
        if (selected === current.answer) score++;
        paint();
      });
    });
    const nextBtn = el.querySelector("#nextQBtn");
    if (nextBtn) nextBtn.addEventListener("click", () => {
      if (qIndex + 1 >= questions.length) { done = true; }
      else { qIndex++; selected = null; }
      paint();
    });
  }

  paint();
}

/* ============================================================
   PROGRESS
   ============================================================ */
function renderProgress(root) {
  const el = document.createElement("div");
  el.className = "section w-progress";
  root.appendChild(el);

  const mastered = allWords.filter((w) => w.mastered).length;
  const pct = allWords.length ? Math.round((mastered / allWords.length) * 100) : 0;
  const totalStreak = allWords.reduce((a, w) => a + (w.streak || 0), 0);

  const topStreak = [...allWords].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 5);

  el.innerHTML = `
    <div class="section-head">
      <h1>Tiến độ</h1>
      <p class="lede">Hành trình học từ vựng của bạn</p>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="num" style="color:var(--blue);">${allWords.length}</div><div class="lbl">Tổng số từ</div></div>
      <div class="stat-card"><div class="num" style="color:var(--green);">${mastered}</div><div class="lbl">Đã thuộc</div></div>
      <div class="stat-card"><div class="num" style="color:var(--orange);">${totalStreak}🔥</div><div class="lbl">Điểm streak</div></div>
    </div>

    <div class="panel">
      <div class="mastery-head">
        <div class="panel-title" style="margin-bottom:0;">Tiến độ ghi nhớ</div>
        <div class="mastery-pct">${pct}%</div>
      </div>
      <div class="mastery-track"><div class="mastery-fill" style="width:${pct}%;"></div></div>
      <div class="mastery-legend">
        <span class="learning">Đang học: ${allWords.length - mastered}</span>
        <span class="mastered">Đã thuộc: ${mastered}</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Từ có streak cao nhất</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${topStreak.length === 0 ? `<div class="empty-state" style="padding:20px 0;">Chưa có dữ liệu</div>` : topStreak.map((w, i) => `
          <div class="streak-row">
            <div class="rank">${i + 1}</div>
            <div class="word">${escapeHtml(w.word)}</div>
            <div class="track"><div class="fill" style="width:${Math.min(100, (w.streak || 0) * 14)}%;"></div></div>
            <div class="val">🔥${w.streak || 0}</div>
          </div>
        `).join("")}
      </div>
    </div>

    ${heatmapPanelHtml()}
  `;
}

/* ============================================================
   ADD / EDIT WORD
   ============================================================ */
function renderAdd(root) {
  const editing = editingId ? allWords.find((w) => w.id === editingId) : null;

  const el = document.createElement("div");
  el.className = "section w-add";
  el.innerHTML = `
    <div class="section-head">
      <h1>${editing ? "Sửa từ" : "Từ mới"}</h1>
      <p class="lede">${editing ? "Cập nhật thông tin từ này" : "Thêm một từ vào bộ sưu tập của bạn"}</p>
    </div>

    <div class="form-panel">
      <div class="f-field">
        <label>Từ *</label>
        <input type="text" id="fWord" class="large" placeholder="vd. Ephemeral" value="${escapeAttr(editing?.word || "")}">
      </div>
      <div class="f-field">
        <label>Phiên âm</label>
        <input type="text" id="fPhonetic" placeholder="vd. /ɪˈfem.ər.əl/" value="${escapeAttr(editing?.phonetic || "")}">
      </div>
      <div class="f-field">
        <label>Nghĩa *</label>
        <input type="text" id="fMeaning" placeholder="Nghĩa tiếng Việt" value="${escapeAttr(editing?.meaning || "")}">
      </div>
      <div class="f-field">
        <label>Câu ví dụ</label>
        <input type="text" id="fExample" placeholder="Một câu ví dụ dùng từ này" value="${escapeAttr(editing?.example || "")}">
      </div>
      <div class="f-field">
        <label>Loại từ</label>
        <div class="tag-picker" id="tagPicker">
          ${TAGS.map((t) => `<button type="button" class="tag-choice ${((editing?.tag || "Noun") === t) ? "active" : ""}" data-t="${t}">${TAG_LABEL[t]}</button>`).join("")}
        </div>
      </div>
      <div class="form-actions">
        <button class="save" id="saveBtn">${editing ? "Lưu thay đổi" : "Thêm từ"}</button>
        <button class="cancel" id="cancelBtn" type="button">Hủy</button>
      </div>
    </div>
  `;
  root.appendChild(el);

  let selectedTag = editing?.tag || "Noun";
  el.querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTag = btn.dataset.t;
      el.querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  el.querySelector("#cancelBtn").addEventListener("click", () => { editingId = null; goto("inbox"); });

  el.querySelector("#saveBtn").addEventListener("click", async () => {
    const word = el.querySelector("#fWord").value.trim();
    const meaning = el.querySelector("#fMeaning").value.trim();
    if (!word || !meaning) return;
    const data = {
      word,
      phonetic: el.querySelector("#fPhonetic").value.trim(),
      meaning,
      example: el.querySelector("#fExample").value.trim(),
      tag: selectedTag
    };
    const saveBtn = el.querySelector("#saveBtn");
    if (editing) {
      await updateWord(uid, editing.id, data);
    } else {
      await addWord(uid, data);
    }
    saveBtn.textContent = "✓ Đã lưu!";
    saveBtn.classList.add("saved");
    setTimeout(() => { editingId = null; goto("inbox"); }, 700);
  });
}

/* ============================================================
   PROFILE — đổi avatar (chọn từ các ảnh tem có sẵn) + tên
   ============================================================ */
function renderProfile(root) {
  const el = document.createElement("div");
  el.className = "section w-profile";
  root.appendChild(el);

  const email = auth.currentUser?.email || "";
  let selectedAvatar = userProfile?.avatar || "";
  let pickerOpen = false;

  function paint() {
    const displayName = userProfile?.displayName || "";
    const initial = (displayName || email || "?")[0].toUpperCase();

    el.innerHTML = `
      <div class="section-head">
        <h1>Profile</h1>
        <p class="lede">Chỉnh sửa ảnh đại diện và tên hiển thị của bạn</p>
      </div>

      <div class="profile-avatar-row">
        ${selectedAvatar
          ? `<img class="profile-avatar-big" src="${escapeAttr(selectedAvatar)}" alt="Avatar">`
          : `<div class="profile-avatar-big-fallback">${escapeHtml(initial)}</div>`}
        <button type="button" class="profile-change-avatar-btn" id="changeAvatarBtn">Đổi ảnh đại diện</button>
      </div>

      ${pickerOpen ? `
        <div class="avatar-picker scale-in" id="avatarPicker">
          ${STAMP_FILES.map((src) => `
            <button type="button" class="avatar-choice ${selectedAvatar === src ? "selected" : ""}" data-src="${escapeAttr(src)}">
              <img src="${escapeAttr(src)}" alt="">
            </button>
          `).join("")}
        </div>
      ` : ""}

      <div class="profile-name-panel">
        <div class="f-field" style="margin-bottom:0;">
          <label>Tên hiển thị</label>
          <input type="text" id="fDisplayName" placeholder="Tên của bạn" value="${escapeAttr(displayName)}">
        </div>
      </div>

      <div class="form-actions">
        <button class="save" id="saveProfileBtn">Lưu thay đổi</button>
      </div>
      <div id="savedNote"></div>
    `;

    el.querySelector("#changeAvatarBtn").addEventListener("click", () => {
      pickerOpen = !pickerOpen;
      paint();
    });

    el.querySelectorAll(".avatar-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAvatar = btn.dataset.src;
        paint();
      });
    });

    el.querySelector("#saveProfileBtn").addEventListener("click", async () => {
      const saveBtn = el.querySelector("#saveProfileBtn");
      const name = el.querySelector("#fDisplayName").value.trim();
      saveBtn.disabled = true;
      await updateUserProfile(uid, { displayName: name, avatar: selectedAvatar });
      saveBtn.disabled = false;
      saveBtn.textContent = "✓ Đã lưu!";
      saveBtn.classList.add("saved");
      el.querySelector("#savedNote").innerHTML = `<div class="toast-inline">Hồ sơ của bạn đã được cập nhật.</div>`;
      setTimeout(() => { saveBtn.textContent = "Lưu thay đổi"; saveBtn.classList.remove("saved"); }, 1800);
    });
  }

  paint();
}

/* ============================================================
   TIỆN ÍCH DÙNG CHUNG
   ============================================================ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatDate(ts) {
  if (!ts || !ts.toDate) return "vừa xong";
  return ts.toDate().toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

function escapeRegex(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s) {
  return (s || "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
