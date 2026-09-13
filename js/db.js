import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, orderBy, serverTimestamp, increment
} from "./firebase-init.js";

function wordsRef(uid) {
  return collection(db, "users", uid, "words");
}

function profileRef(uid) {
  return doc(db, "users", uid);
}

function activityCollectionRef(uid) {
  return collection(db, "users", uid, "activity");
}

function activityRef(uid, dateKey) {
  return doc(db, "users", uid, "activity", dateKey);
}

// Khóa ngày dùng giờ UTC (khớp với chú thích "All activity data is using UTC time").
function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

function logActivity(uid, patch) {
  return setDoc(activityRef(uid, todayKeyUTC()), patch, { merge: true });
}

// Lắng nghe toàn bộ lịch sử hoạt động — trả về map { "YYYY-MM-DD": {flashcard,mastered,writing,quiz} }
export function listenActivity(uid, onChange) {
  return onSnapshot(activityCollectionRef(uid), (snap) => {
    const map = {};
    snap.forEach((d) => { map[d.id] = d.data(); });
    onChange(map);
  });
}

export function logQuizCompleted(uid) {
  return logActivity(uid, { quiz: increment(1) });
}

export function listenWords(uid, onChange) {
  const q = query(wordsRef(uid), orderBy("addedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const words = [];
    snap.forEach((d) => words.push({ id: d.id, ...d.data() }));
    onChange(words);
  });
}

export function addWord(uid, data) {
  return addDoc(wordsRef(uid), {
    word: data.word,
    phonetic: data.phonetic || "",
    meaning: data.meaning || "",
    example: data.example || "",
    tag: data.tag || "Noun",
    level: data.level || "A1",
    mastered: false,
    streak: 0,
    writingStreak: 0,
    flashcardSeen: 0,
    flashcardCorrect: 0,
    flashcardWrong: 0,
    writingSeen: 0,
    writingCorrect: 0,
    writingWrong: 0,
    addedAt: serverTimestamp()
  });
}

export function updateWord(uid, wordId, patch) {
  return updateDoc(doc(db, "users", uid, "words", wordId), patch);
}

export function deleteWord(uid, wordId) {
  return deleteDoc(doc(db, "users", uid, "words", wordId));
}

// Ghi lại 1 lần ôn Flashcard: +1 "đã học", +1 "thuộc"/"quên", và cập nhật streak
// (streak reset về 0 nếu sai — dùng để xếp hạng "chưa thuộc/có thể quên/đã thuộc").
// Đồng thời ghi vào log hoạt động theo ngày (cho biểu đồ "Chuỗi ngày học").
export function recordFlashcardResult(uid, wordId, knew, currentStreak) {
  const newStreak = knew ? (currentStreak || 0) + 1 : 0;
  const justMastered = newStreak >= 10 && (currentStreak || 0) < 10;
  logActivity(uid, { flashcard: increment(1), mastered: increment(justMastered ? 1 : 0) });
  return updateDoc(doc(db, "users", uid, "words", wordId), {
    flashcardSeen: increment(1),
    flashcardCorrect: increment(knew ? 1 : 0),
    flashcardWrong: increment(knew ? 0 : 1),
    streak: newStreak,
    mastered: newStreak >= 10
  });
}

// Ghi lại 1 lần kiểm tra ở chế độ "Điền từ" của Luyện viết — có streak riêng
// (thuộc nghĩa và viết đúng chính tả là 2 kỹ năng khác nhau, không dùng chung streak).
export function recordWritingResult(uid, wordId, correct, currentWritingStreak) {
  const newStreak = correct ? (currentWritingStreak || 0) + 1 : 0;
  logActivity(uid, { writing: increment(1) });
  return updateDoc(doc(db, "users", uid, "words", wordId), {
    writingSeen: increment(1),
    writingCorrect: increment(correct ? 1 : 0),
    writingWrong: increment(correct ? 0 : 1),
    writingStreak: newStreak
  });
}

/* ---------- hồ sơ người dùng (Profile) ---------- */

// Gọi 1 lần lúc đăng ký tài khoản mới — tạo hồ sơ với avatar ngẫu nhiên.
export function createUserProfile(uid, data) {
  return setDoc(profileRef(uid), {
    displayName: data.displayName || "",
    avatar: data.avatar || "",
    createdAt: serverTimestamp()
  });
}

export function listenUserProfile(uid, onChange) {
  return onSnapshot(profileRef(uid), (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  });
}

// Dùng merge:true — an toàn cả với tài khoản cũ chưa từng có hồ sơ (tự tạo mới luôn).
export function updateUserProfile(uid, patch) {
  return setDoc(profileRef(uid), patch, { merge: true });
}
