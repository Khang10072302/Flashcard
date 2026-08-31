import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, orderBy, serverTimestamp
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
    addedAt: serverTimestamp()
  });
}

export function updateWord(uid, wordId, patch) {
  return updateDoc(doc(db, "users", uid, "words", wordId), patch);
}

export function deleteWord(uid, wordId) {
  return deleteDoc(doc(db, "users", uid, "words", wordId));
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
