// Bóc tách văn bản copy-paste từ trang Cambridge Dictionary.
// Đây là phân tích "best effort" dựa trên định dạng văn bản thường thấy
// khi copy trang từ dictionary.cambridge.org — không đảm bảo đúng 100%,
// nên giao diện luôn cho phép sửa tay kết quả trước khi lưu.

const POS_WORDS = [
  "noun", "verb", "adjective", "adverb", "preposition", "conjunction",
  "pronoun", "determiner", "exclamation", "prefix", "suffix", "number",
  "phrasal verb", "idiom"
];

const JUNK_PATTERNS = [
  /cambridge (university press|dictionary)/i,
  /smart vocabulary/i,
  /^thesaurus/i,
  /^see also/i,
  /^related word/i,
  /\(translation of/i,
  /^©/,
  /^browse$/i,
];

const IPA_CHARS = /[ˈˌːæɑɒʌʊʃʒŋθðəɪʊeɔɜɡʔ]/;

function isJunk(line) {
  return JUNK_PATTERNS.some((re) => re.test(line));
}

function extractIPA(rawText) {
  const matches = [...rawText.matchAll(/\/([^\/\n]{1,40})\//g)]
    .map((m) => m[1].trim())
    .filter((m) => IPA_CHARS.test(m) && !/[.!?]$/.test(m));
  const uk = matches[0] || "";
  const us = matches[1] || matches[0] || "";
  return { ipaUK: uk, ipaUS: us };
}

function posLineInfo(line) {
  const lower = line.toLowerCase();
  for (const pos of POS_WORDS) {
    const re = new RegExp("^" + pos.replace(" ", "\\s+") + "\\b", "i");
    if (re.test(lower)) {
      const guideMatch = line.match(/\(([A-ZÀ-Ỹ][A-ZÀ-Ỹ\s'-]{1,30})\)/);
      return { pos, senseGuide: guideMatch ? guideMatch[1].trim() : "" };
    }
  }
  return null;
}

export function parseCambridgeText(rawText) {
  const text = (rawText || "").replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !isJunk(l));

  if (lines.length === 0) {
    return { word: "", ipaUK: "", ipaUS: "", senses: [] };
  }

  const word = lines[0].split(/[,;(]/)[0].trim();
  const { ipaUK, ipaUS } = extractIPA(text);

  const senses = [];
  let current = null;      // { pos, senseGuide, definitions: [] }
  let currentDef = null;   // { meaning, examples: [] }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // bỏ qua dòng chỉ chứa IPA / uk / us (kể cả khi dính liền, vd "/rʌn/ us")
    if (/^(uk|us)$/i.test(line)) continue;
    if (/\/[^/\n]{1,40}\//.test(line) && IPA_CHARS.test(line) && line.replace(/\/[^/\n]{1,40}\//g, "").replace(/\b(uk|us)\b/gi, "").trim().length < 3) continue;
    if (/^(present simple|past simple|past participle|plural)/i.test(line)) continue;

    const posInfo = posLineInfo(line);
    if (posInfo) {
      current = { pos: posInfo.pos, senseGuide: posInfo.senseGuide, definitions: [] };
      senses.push(current);
      currentDef = null;
      continue;
    }

    if (!current) {
      // chưa gặp dòng loại từ nào — tạo nhóm mặc định
      current = { pos: "", senseGuide: "", definitions: [] };
      senses.push(current);
    }

    if (/:$/.test(line)) {
      currentDef = { meaning: line.replace(/:$/, "").trim(), examples: [] };
      current.definitions.push(currentDef);
    } else if (currentDef) {
      currentDef.examples.push(line);
    } else {
      // dòng không có ":" và chưa có definition đang mở -> coi là nghĩa luôn
      currentDef = { meaning: line, examples: [] };
      current.definitions.push(currentDef);
    }
  }

  // dọn các nhóm rỗng
  const cleaned = senses.filter((s) => s.definitions.length > 0);

  return { word, ipaUK, ipaUS, senses: cleaned };
}
