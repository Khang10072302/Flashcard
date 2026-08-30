import {
  db, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "./firebase-init.js";

function wordsRef(uid) {
  return collection(db, "users", uid, "words");
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
