import { requireAuth, wireLogout } from "./auth-guard.js";
import { auth } from "./firebase-init.js";
import { listenWords, addWord, updateWord, deleteWord, listenUserProfile, updateUserProfile, recordFlashcardResult, recordWritingResult, listenActivity, logQuizCompleted } from "./db.js";
import { STAMP_FILES } from "./stamps.js";

const TAGS = ["Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom"];
const TAG_LABEL = { Noun: "Danh từ", Verb: "Động từ", Adjective: "Tính từ", Adverb: "Trạng từ", Phrase: "Cụm từ", Idiom: "Thành ngữ" };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Idiom", "Sentence"];
const LEVEL_LABEL = { A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2", Idiom: "Idiom", Sentence: "Sentence" };
const GEMS = Object.fromEntries(LEVELS.map((lv) => [lv, `assets/gems/${lv}.svg`]));

const ICONS = {
  dashboard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="8.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="8.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/></svg>`,
  inbox: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h7a1 1 0 011 1v9a1 1 0 01-1 1H3V2z" stroke="currentColor" stroke-width="1.3"/><path d="M10 2h1a1 1 0 011 1v9a1 1 0 01-1 1h-1" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h4M5 7.5h4M5 10h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  flashcard: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="4.5" y="5.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.5"/></svg>`,
  writing: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  quiz: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 6.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>`,
  progress: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l3.5-4L9 10l5-6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 14h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  more: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="13" cy="8" r="1.3" fill="currentColor"/></svg>`
};

let uid = null;
let allWords = [];
let userProfile = null;
let activityMap = {};
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
  wireMobileNav();
  wireBrandIconFallback();
  listenWords(uid, onWordsChange);
  listenUserProfile(uid, onProfileChange);
  listenActivity(uid, onActivityChange);
}

function onActivityChange(map) {
  activityMap = map;
  if (section === "dashboard" || section === "progress") render();
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

function wireMobileNav() {
  const pill = document.getElementById("mNavPill");
  const homeBtn = document.getElementById("mNavHome");
  const flashBtn = document.getElementById("mNavFlashcard");
  const inboxBtn = document.getElementById("mNavInbox");
  const moreBtn = document.getElementById("mNavMore");
  const addBtn = document.getElementById("mNavAdd");
  const scrim = document.getElementById("mNavScrim");
  const sheet = document.getElementById("mNavSheet");
  if (!pill) return;

  homeBtn.querySelector(".ico").innerHTML = ICONS.dashboard;
  flashBtn.querySelector(".ico").innerHTML = ICONS.flashcard;
  inboxBtn.querySelector(".ico").innerHTML = ICONS.inbox;
  moreBtn.querySelector(".ico").innerHTML = ICONS.more;
  sheet.querySelector('[data-section="writing"] .ico').innerHTML = ICONS.writing;
  sheet.querySelector('[data-section="quiz"] .ico').innerHTML = ICONS.quiz;
  sheet.querySelector('[data-section="progress"] .ico').innerHTML = ICONS.progress;

  let pillOpen = false;
  function setPillOpen(isOpen) {
    pillOpen = isOpen;
    pill.classList.toggle("open", isOpen);
    addBtn.classList.toggle("hidden", isOpen);
  }
  function closeSheet() {
    sheet.classList.remove("open");
    scrim.classList.remove("open");
  }

  homeBtn.addEventListener("click", () => {
    if (!pillOpen) { setPillOpen(true); return; }
    goto("dashboard");
    setPillOpen(false);
  });
  flashBtn.addEventListener("click", () => { goto("flashcard"); setPillOpen(false); });
  inboxBtn.addEventListener("click", () => { goto("inbox"); setPillOpen(false); });
  moreBtn.addEventListener("click", () => { sheet.classList.add("open"); scrim.classList.add("open"); });
  addBtn.addEventListener("click", () => { editingId = null; goto("add"); });

  scrim.addEventListener("click", closeSheet);
  sheet.querySelectorAll("[data-section]").forEach((b) => {
    b.addEventListener("click", () => { goto(b.dataset.section); closeSheet(); });
  });
  document.getElementById("mNavProfile").addEventListener("click", () => { goto("profile"); closeSheet(); });
  document.getElementById("mNavLogout").addEventListener("click", () => {
    closeSheet();
    document.getElementById("logoutMenuBtn").click();
  });

  window.__closeMobileNav = () => { setPillOpen(false); closeSheet(); };
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

/* ============================================================
   "Chuỗi ngày học" — biểu đồ hoạt động thật, dựa trên activityMap
   (lấy từ Firestore users/{uid}/activity/{YYYY-MM-DD}).
   Dùng chung cho Dashboard và trang Tiến độ, mỗi nơi tự mount riêng
   qua mountHeatmap() vì cần dropdown + tooltip tương tác.
   ============================================================ */
let heatmapViewMode = "12m"; // "12m" hoặc năm dạng chuỗi, vd "2026"

function dateKeyUTC(d) {
  return d.toISOString().slice(0, 10);
}

function activityTotal(stat) {
  if (!stat) return 0;
  return (stat.flashcard || 0) + (stat.writing || 0) + (stat.quiz || 0);
}

function activityLevel(stat) {
  const total = activityTotal(stat);
  if (total <= 0) return 0;
  if (total <= 2) return 1;
  if (total <= 5) return 2;
  if (total <= 10) return 3;
  return 4;
}

// Dựng lưới các cột-tuần (mỗi cột 7 ô Chủ nhật->Thứ 7) cho khoảng thời gian cần hiển thị.
function buildHeatmapWeeks(mode) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let rangeStart, rangeEnd, showMonths;
  if (mode === "12m") {
    rangeEnd = todayUTC;
    rangeStart = new Date(todayUTC);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 364);
    showMonths = false;
  } else {
    const year = parseInt(mode, 10);
    rangeStart = new Date(Date.UTC(year, 0, 1));
    rangeEnd = new Date(Date.UTC(year, 11, 31));
    showMonths = true;
  }

  const gridStart = new Date(rangeStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());
  const gridEnd = new Date(rangeEnd);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()));

  const weeks = [];
  const monthTicks = [];
  let lastMonth = -1;
  let col = 0;
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (cursor < rangeStart || cursor > rangeEnd) {
        week.push(null);
      } else {
        if (showMonths) {
          const m = cursor.getUTCMonth();
          if (m !== lastMonth && cursor.getUTCDate() <= 7) {
            monthTicks.push({ col, month: m });
            lastMonth = m;
          }
        }
        week.push({ key: dateKeyUTC(cursor) });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    col++;
  }

  return { weeks, monthTicks, showMonths };
}

function heatTooltipHtml(key, stat) {
  const d = new Date(`${key}T00:00:00Z`);
  const dateStr = d.toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const lines = [];
  if (stat?.flashcard) lines.push(`Flashcard: ${stat.flashcard} lần`);
  if (stat?.mastered) lines.push(`Từ mới thuộc: ${stat.mastered}`);
  if (stat?.quiz) lines.push(`Quiz: ${stat.quiz} lần`);
  if (stat?.writing) lines.push(`Luyện viết: ${stat.writing} lần`);
  return `
    <div class="heat-tip-date">${escapeHtml(dateStr)}</div>
    ${lines.length ? lines.map((l) => `<div class="heat-tip-line">${escapeHtml(l)}</div>`).join("") : `<div class="heat-tip-line muted">Không có hoạt động</div>`}
  `;
}

// Gắn 1 bảng "Chuỗi ngày học" đầy đủ (dropdown + lưới + tooltip) vào host.
function mountHeatmap(host) {
  const currentYear = new Date().getUTCFullYear();
  const years = new Set([currentYear]);
  Object.keys(activityMap).forEach((k) => years.add(parseInt(k.slice(0, 4), 10)));
  const yearList = [...years].sort((a, b) => b - a);
  if (heatmapViewMode !== "12m" && !yearList.includes(parseInt(heatmapViewMode, 10))) heatmapViewMode = "12m";

  function paint() {
    const { weeks, monthTicks, showMonths } = buildHeatmapWeeks(heatmapViewMode);
    const totalCount = weeks.flat().filter(Boolean).reduce((sum, c) => sum + activityTotal(activityMap[c.key]), 0);
    const cellStep = 16; // 13px ô + 3px khoảng cách, dùng để canh label tháng

    host.innerHTML = `
      <div class="heat-panel">
        <div class="heat-controls">
          <select class="heat-select" id="heatSelect">
            <option value="12m">12 tháng gần nhất</option>
            ${yearList.map((y) => `<option value="${y}">${y}</option>`).join("")}
          </select>
          <div class="heat-total">${totalCount} lượt học</div>
          <div class="heat-legend">
            <span>Ít</span>
            ${HEAT_COLORS.map((c) => `<div class="heat-swatch" style="background:${c};"></div>`).join("")}
            <span>Nhiều</span>
          </div>
        </div>

        <div class="heat-grid-wrap">
          ${showMonths ? `
            <div class="heat-month-row">
              <div class="heat-daylabels-spacer"></div>
              <div class="heat-months-track" style="width:${weeks.length * cellStep}px;">
                ${monthTicks.map((t) => `<span style="left:${t.col * cellStep}px;">${MONTH_LABELS_VI[t.month]}</span>`).join("")}
              </div>
            </div>
          ` : ""}
          <div class="heat-body-row">
            <div class="heat-daylabels">
              ${["", "T2", "", "T4", "", "T6", ""].map((l) => `<span>${l}</span>`).join("")}
            </div>
            <div class="heat-weeks">
              ${weeks.map((week) => `
                <div class="heat-col">
                  ${week.map((cell) => {
                    if (!cell) return `<div class="heat-cell heat-cell-empty"></div>`;
                    const level = activityLevel(activityMap[cell.key]);
                    return `<div class="heat-cell" data-key="${cell.key}" style="background:${HEAT_COLORS[level]};"></div>`;
                  }).join("")}
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="heat-note">Dữ liệu hoạt động dùng giờ UTC.</div>
      </div>
    `;

    host.querySelector("#heatSelect").value = heatmapViewMode;
    host.querySelector("#heatSelect").addEventListener("change", (e) => {
      heatmapViewMode = e.target.value;
      paint();
    });

    let tooltip = document.getElementById("heatTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "heatTooltip";
      tooltip.className = "heat-tooltip";
      document.body.appendChild(tooltip);
    }
    host.querySelectorAll(".heat-cell[data-key]").forEach((cellEl) => {
      cellEl.addEventListener("mouseenter", () => {
        const key = cellEl.dataset.key;
        tooltip.innerHTML = heatTooltipHtml(key, activityMap[key]);
        tooltip.style.display = "block";
        const rect = cellEl.getBoundingClientRect();
        const tw = tooltip.offsetWidth;
        let left = rect.left + rect.width / 2 - tw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
      });
      cellEl.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
    });
  }

  paint();
}

const MONTH_LABELS_VI = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

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

        <div class="dash-vocab-group">
          <button class="dash-card" data-goto="inbox">
            <div class="dash-card-inner">
              <div class="dash-card-head">
                <div class="dash-card-icon" style="background:#0071E31A;color:#0071E3;">📖</div>
              </div>
              <div class="dash-card-label">Tổng số từ</div>
              <div class="dash-card-num" style="color:#0071E3;">${allWords.length}</div>
            </div>
          </button>
          <button class="dash-card" data-goto="inbox">
            <div class="dash-card-inner">
              <div class="dash-card-head">
                <div class="dash-card-icon" style="background:#30D1581A;color:#30D158;">✓</div>
              </div>
              <div class="dash-card-label">Đã thuộc</div>
              <div class="dash-card-num" style="color:#30D158;">${mastered}</div>
            </div>
          </button>
          <button class="dash-card" data-goto="inbox">
            <div class="dash-card-inner">
              <div class="dash-card-head">
                <div class="dash-card-icon" style="background:#FF9F0A1A;color:#FF9F0A;">⏳</div>
              </div>
              <div class="dash-card-label">Chưa thuộc</div>
              <div class="dash-card-num" style="color:#FF9F0A;">${allWords.length - mastered}</div>
            </div>
          </button>
          <button class="dash-card" data-goto="inbox">
            <div class="dash-card-inner">
              <div class="dash-card-head">
                <div class="dash-card-icon" style="background:#7B5CE61A;color:#7B5CE6;">🔥</div>
              </div>
              <div class="dash-card-label">Streak cao nhất</div>
              <div class="dash-card-num" style="color:#7B5CE6;">${topWord ? (topWord.streak || 0) : 0}</div>
            </div>
          </button>
        </div>

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

      <div id="heatmapHost"></div>
    `;

    mountHeatmap(el.querySelector("#heatmapHost"));

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
      const avatarBtn = card.querySelector(".speak-avatar");
      if (avatarBtn) {
        avatarBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          speak(avatarBtn.dataset.speakWord);
        });
      }
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
        <div class="word-avatar ${w.mastered ? "mastered" : ""} speak-avatar" data-speak-word="${escapeAttr(w.word)}">
          <span class="word-avatar-letter">${escapeHtml((w.word || "?")[0] || "?").toUpperCase()}</span>
          <span class="word-avatar-speak">🔊</span>
        </div>
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
  let selectedLevel = word.level || "A1";

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
        <div class="f-field">
          <label>Cấp độ</label>
          <div class="tag-picker" id="editLevelPicker">
            ${LEVELS.map((lv) => `<button type="button" class="tag-choice ${lv === selectedLevel ? "active" : ""}" data-lv="${lv}">${LEVEL_LABEL[lv]}</button>`).join("")}
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

  document.getElementById("editTagPicker").querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTag = btn.dataset.t;
      document.getElementById("editTagPicker").querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  document.getElementById("editLevelPicker").querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedLevel = btn.dataset.lv;
      document.getElementById("editLevelPicker").querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
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
      tag: selectedTag,
      level: selectedLevel
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
  let deckNumber = 1;
  let deck = buildDeck(allWords, getFlashcardTier);
  let index = 0;
  let flipped = false;
  let reviewedIds = [];
  let deckCorrect = 0;
  let deckWrong = 0;
  let sessionCorrect = 0;
  let sessionWrong = 0;
  let sessionTotal = 0;
  let deckDone = false;
  let busy = false;

  const el = document.createElement("div");
  el.className = "section w-mid";
  root.appendChild(el);

  function paint() {
    if (allWords.length === 0) {
      el.innerHTML = `<div class="empty-state">Chưa có từ nào. Thêm từ ở "Sổ từ vựng" trước nhé.</div>`;
      return;
    }

    if (deckDone) {
      el.innerHTML = `
        <div class="done-state">
          <div class="emoji">🎉</div>
          <h1>Hoàn thành Bộ ${deckNumber}!</h1>
          <p>Bạn vừa ôn ${deck.length} thẻ.</p>
          <div class="done-stats">
            <div>Bạn đã nhớ <b style="color:var(--green);">${deckCorrect}</b> thẻ</div>
            <div>Bạn chưa nhớ <b style="color:var(--red);">${deckWrong}</b> thẻ</div>
          </div>
          <button class="pbtn" id="nextDeckBtn" style="margin-top:24px;">Học bộ tiếp theo →</button>
        </div>
      `;
      fireConfetti();
      el.querySelector("#nextDeckBtn").addEventListener("click", () => {
        deckNumber++;
        deck = buildDeck(allWords, getFlashcardTier);
        reviewedIds = [];
        index = 0;
        flipped = false;
        deckCorrect = 0;
        deckWrong = 0;
        deckDone = false;
        paint();
      });
      return;
    }

    const remaining = deck.filter((w) => !reviewedIds.includes(w.id));
    if (remaining.length === 0) {
      deckDone = true;
      paint();
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
        <p class="lede" style="margin-top:6px;">Bộ ${deckNumber}${sessionTotal > 0 ? ` · Đã ôn ${sessionTotal} thẻ trong phiên này · Nhớ ${sessionCorrect} · Quên ${sessionWrong}` : ""}</p>
      </div>

      <div class="deck-wrap">
        <div class="stack-card l2"></div>
        <div class="stack-card l1"></div>
        <div class="flip-card ${flipped ? "revealed" : ""}" id="flipCard">
          <div class="glass-frame">
            <div class="meaning-layer">
              <div class="meaning">${escapeHtml(current.meaning || "")}</div>
              <div class="divider"></div>
              <div class="example">${current.example ? `"${escapeHtml(current.example)}"` : ""}</div>
            </div>
            <div class="glass"></div>
            <div class="word-layer">
              <span class="tag-pill tag-${current.tag || "Noun"}" style="margin-bottom:16px;">${TAG_LABEL[current.tag] || current.tag || ""}</span>
              <div class="w speak-trigger">${escapeHtml(current.word)}</div>
              <div class="ph speak-trigger">${escapeHtml(current.phonetic || "")}</div>
              <div class="tip">CHẠM ĐỂ XEM NGHĨA</div>
            </div>
          </div>
          <div class="level-badge">
            <img src="${GEMS[current.level] || GEMS.A1}" alt="${LEVEL_LABEL[current.level] || ""}">
            <span>${LEVEL_LABEL[current.level] || "A1"}</span>
          </div>
          <div class="swipe-glow" id="swipeGlow"></div>
          <div class="stamp" id="cardStamp"></div>
        </div>
      </div>

      <div class="rate-row">
        <button class="sbtn again">Chưa nhớ</button>
        <button class="got-it">Nhớ rồi ✓</button>
      </div>
    `;

    const flipCardEl = el.querySelector("#flipCard");
    flipCardEl.addEventListener("click", () => {
      flipped = !flipped;
      flipCardEl.classList.toggle("revealed", flipped);
    });
    el.querySelectorAll(".speak-trigger").forEach((elx) => {
      elx.addEventListener("click", (e) => {
        e.stopPropagation();
        speak(current.word);
      });
    });

    const againBtn = el.querySelector(".again");
    const gotItBtn = el.querySelector(".got-it");
    if (againBtn) againBtn.addEventListener("click", (e) => { e.stopPropagation(); rate(current, false); });
    if (gotItBtn) gotItBtn.addEventListener("click", (e) => { e.stopPropagation(); rate(current, true); });
  }

  function rate(word, knew) {
    if (busy) return;
    busy = true;

    const cardEl = el.querySelector("#flipCard");
    const glowEl = el.querySelector("#swipeGlow");
    const stampEl = el.querySelector("#cardStamp");
    const l1 = el.querySelector(".stack-card.l1");
    const l2 = el.querySelector(".stack-card.l2");

    flipped = false;
    if (cardEl) cardEl.classList.remove("revealed");
    if (stampEl) {
      stampEl.textContent = knew ? "✓" : "✗";
      stampEl.className = "stamp go " + (knew ? "correct" : "wrong");
    }
    if (glowEl) glowEl.className = "swipe-glow " + (knew ? "flash-green" : "flash-red");

    setTimeout(() => {
      if (cardEl) cardEl.classList.add(knew ? "swipe-out-right" : "swipe-out-left");
      if (l1) l1.classList.add("advance");
      if (l2) l2.classList.add("advance");
    }, 150);

    setTimeout(() => {
      next(word, knew);
      const newCardEl = el.querySelector("#flipCard");
      if (newCardEl) {
        newCardEl.classList.add("card-enter");
        void newCardEl.offsetWidth;
        newCardEl.classList.remove("card-enter");
        newCardEl.classList.add("card-enter-active");
        setTimeout(() => { newCardEl.classList.remove("card-enter-active"); busy = false; }, 440);
      } else {
        busy = false;
      }
    }, 630);
  }

  function next(word, knew) {
    reviewedIds.push(word.id);
    sessionTotal++;
    if (knew) { sessionCorrect++; deckCorrect++; } else { sessionWrong++; deckWrong++; }
    recordFlashcardResult(uid, word.id, knew, word.streak || 0);
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
  let deck = buildDeck(allWords, getWritingTier);
  let deckIndex = 0;
  let checked = false;
  let correct = false;
  let letterText = "";

  const el = document.createElement("div");
  el.className = "section w-writing";
  root.appendChild(el);

  function paint() {
    if (deckIndex >= deck.length) {
      // Hết 1 bộ — tự động trộn bộ mới và học tiếp luôn, không dừng lại.
      deck = buildDeck(allWords, getWritingTier);
      deckIndex = 0;
    }
    const current = deck[deckIndex];

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
        deckIndex++; checked = false; paint();
      });

      function doCheck() {
        const val = (input.value || "").trim().toLowerCase();
        correct = val === current.word.trim().toLowerCase();
        checked = true;
        recordWritingResult(uid, current.id, correct, current.writingStreak || 0);
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
      if (qIndex + 1 >= questions.length) {
        done = true;
        logQuizCompleted(uid);
      } else { qIndex++; selected = null; }
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

    <div id="heatmapHost"></div>
  `;

  mountHeatmap(el.querySelector("#heatmapHost"));
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
      <div class="f-field">
        <label>Cấp độ</label>
        <div class="tag-picker" id="levelPicker">
          ${LEVELS.map((lv) => `<button type="button" class="tag-choice ${((editing?.level || "A1") === lv) ? "active" : ""}" data-lv="${lv}">${LEVEL_LABEL[lv]}</button>`).join("")}
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
  el.querySelector("#tagPicker").querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTag = btn.dataset.t;
      el.querySelector("#tagPicker").querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  let selectedLevel = editing?.level || "A1";
  el.querySelector("#levelPicker").querySelectorAll(".tag-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedLevel = btn.dataset.lv;
      el.querySelector("#levelPicker").querySelectorAll(".tag-choice").forEach((b) => b.classList.toggle("active", b === btn));
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
      tag: selectedTag,
      level: selectedLevel
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
   THUẬT TOÁN ÔN TẬP — xếp hạng ẩn (chưa thuộc / có thể quên / đã thuộc)
   dựa trên streak (số lần đúng liên tiếp), rồi trộn bộ 20 thẻ theo
   tỉ lệ 14/4/2 để ưu tiên ôn từ yếu, thỉnh thoảng nhắc lại từ đã vững.

   NOTE: các con số dưới đây (ngưỡng streak, số lần tối thiểu, tỉ lệ
   14/4/2) đều có thể chỉnh lại dễ dàng ở đúng chỗ này nếu muốn.
   ============================================================ */
const DECK_SIZE = 20;
const DECK_QUOTA = { new: 14, atrisk: 4, mastered: 2 };
const MIN_ATTEMPTS_TO_RANK = 3; // ôn dưới 3 lần thì luôn coi là "chưa thuộc"
const STREAK_MASTERED = 10;     // streak >= 10 -> đã thuộc
const STREAK_ATRISK = 4;        // streak 4-9 -> có thể quên

function tierFromStreak(seen, streak) {
  if ((seen || 0) < MIN_ATTEMPTS_TO_RANK) return "new";
  if ((streak || 0) >= STREAK_MASTERED) return "mastered";
  if ((streak || 0) >= STREAK_ATRISK) return "atrisk";
  return "new";
}

function getFlashcardTier(w) { return tierFromStreak(w.flashcardSeen, w.streak); }
function getWritingTier(w) { return tierFromStreak(w.writingSeen, w.writingStreak); }

// Trộn 1 bộ tối đa DECK_SIZE thẻ theo tỉ lệ DECK_QUOTA, dựa trên hàm
// xếp hạng truyền vào (getFlashcardTier hoặc getWritingTier).
function buildDeck(words, tierFn) {
  if (words.length === 0) return [];
  if (words.length <= DECK_SIZE) return shuffle([...words]);

  const bucket = { new: [], atrisk: [], mastered: [] };
  words.forEach((w) => bucket[tierFn(w)].push(w));

  const used = new Set();
  const deck = [];
  let shortfall = 0;

  function takeFrom(tierName, n) {
    const pool = shuffle([...bucket[tierName]]);
    const take = pool.slice(0, n);
    take.forEach((w) => used.add(w.id));
    deck.push(...take);
    shortfall += n - take.length;
  }

  takeFrom("new", DECK_QUOTA.new);
  takeFrom("atrisk", DECK_QUOTA.atrisk);
  takeFrom("mastered", DECK_QUOTA.mastered);

  if (shortfall > 0) {
    const remaining = words.filter((w) => !used.has(w.id));
    deck.push(...shuffle(remaining).slice(0, shortfall));
  }

  return shuffle(deck);
}

/* ============================================================
   TIỆN ÍCH DÙNG CHUNG
   ============================================================ */

// Hiệu ứng pháo giấy nổ ra từ giữa màn hình — dùng thuần CSS/JS, không cần thư viện.
// Đọc to 1 từ bằng giọng đọc có sẵn của trình duyệt (Web Speech API).
// lang mặc định "en-US" (giọng Anh-Mỹ).
// Tự nhận diện tiếng Nhật qua ký tự Hiragana/Katakana/Kanji trong từ — không cần chọn tay.
function detectSpeechLang(text) {
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(text || "") ? "ja-JP" : "en-US";
}

function speak(text, lang) {
  if (!text || !("speechSynthesis" in window)) return;
  const finalLang = lang || detectSpeechLang(text);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = finalLang;
  const voices = speechSynthesis.getVoices();
  const exact = voices.find((v) => v.lang === finalLang);
  const family = voices.find((v) => v.lang.startsWith(finalLang.split("-")[0]));
  if (exact || family) u.voice = exact || family;
  speechSynthesis.speak(u);
}

// Hiệu ứng pháo giấy nổ ra — nhiều "quả" nổ rải rác quanh 1/3 màn hình từ trên xuống.
function fireConfetti() {
  const bursts = [
    { x: 50, y: 32, count: 70, delay: 0 },    // quả chính, ở giữa, cao hơn trước
    { x: 24, y: 40, count: 35, delay: 120 },  // quả phụ bên trái
    { x: 76, y: 40, count: 35, delay: 120 },  // quả phụ bên phải
    { x: 38, y: 22, count: 25, delay: 220 },  // quả nhỏ phía trên-trái
    { x: 62, y: 22, count: 25, delay: 220 }   // quả nhỏ phía trên-phải
  ];
  bursts.forEach((b) => {
    setTimeout(() => confettiBurstAt(b.x, b.y, b.count), b.delay);
  });
}

function confettiBurstAt(xPercent, yPercent, count) {
  const colors = ["#0071E3", "#34AADC", "#30D158", "#FF9F0A", "#FF3B30", "#5E5CE6"];
  const container = document.createElement("div");
  container.className = "confetti-burst";
  container.style.left = `${xPercent}%`;
  container.style.top = `${yPercent}%`;
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 170;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    piece.style.setProperty("--tx", `${tx}px`);
    piece.style.setProperty("--ty", `${ty}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    if (Math.random() < 0.4) piece.style.borderRadius = "50%";
    if (Math.random() < 0.5) { piece.style.width = "6px"; piece.style.height = "11px"; }
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 1500);
}

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
