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
    mastered: false,
    streak: 0,
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

// Ghi lại 1 lần ôn Flashcard: luôn +1 "đã học", cộng thêm +1 "thuộc" hoặc "quên".
export function recordFlashcardResult(uid, wordId, knew) {
  return updateDoc(doc(db, "users", uid, "words", wordId), {
    flashcardSeen: increment(1),
    flashcardCorrect: increment(knew ? 1 : 0),
    flashcardWrong: increment(knew ? 0 : 1)
  });
}

// Ghi lại 1 lần kiểm tra ở chế độ "Điền từ" của Luyện viết.
export function recordWritingResult(uid, wordId, correct) {
  return updateDoc(doc(db, "users", uid, "words", wordId), {
    writingSeen: increment(1),
    writingCorrect: increment(correct ? 1 : 0),
    writingWrong: increment(correct ? 0 : 1)
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
