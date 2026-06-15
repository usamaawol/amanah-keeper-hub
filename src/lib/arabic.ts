// Arabic text normalization and Juz/number normalization utilities.
// Used to make AI retrieval robust against spelling, tashkeel, and
// number-form variations (e.g. "الثاني" vs "٢" vs "2" vs "ج2").

const TASHKEEL = /[\u064B-\u065F\u0670\u0610-\u061A\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

// Map Eastern Arabic digits to Western digits.
const ARABIC_INDIC: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

export function toWesternDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_INDIC[d] ?? d);
}

// Normalize Arabic text for fuzzy matching.
export function normalizeArabic(input: string): string {
  if (!input) return "";
  let s = toWesternDigits(input);
  s = s.replace(TASHKEEL, "");
  s = s.replace(TATWEEL, "");
  // Unify alef forms.
  s = s.replace(/[أإآٱ]/g, "ا");
  // Ta marbuta -> ha.
  s = s.replace(/ة/g, "ه");
  // Alef maksura -> ya.
  s = s.replace(/ى/g, "ي");
  // Hamza variants on waw/ya.
  s = s.replace(/[ؤ]/g, "و").replace(/[ئ]/g, "ي").replace(/ء/g, "");
  // Lowercase latin and strip special chars (keep letters, digits, spaces).
  s = s.toLowerCase();
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Arabic ordinal/cardinal words -> number, for juz detection.
const WORD_NUMBERS: Record<string, number> = {
  "الاول": 1, "اول": 1, "الاولى": 1, "اولى": 1,
  "الثاني": 2, "ثاني": 2, "الثانيه": 2, "ثانيه": 2, "اثنان": 2, "اثنين": 2,
  "الثالث": 3, "ثالث": 3, "الثالثه": 3, "ثلاثه": 3,
  "الرابع": 4, "رابع": 4, "الرابعه": 4, "اربعه": 4,
  "الخامس": 5, "خامس": 5, "خمسه": 5,
  "السادس": 6, "سادس": 6, "سته": 6,
  "السابع": 7, "سابع": 7, "سبعه": 7,
  "الثامن": 8, "ثامن": 8, "ثمانيه": 8,
  "التاسع": 9, "تاسع": 9, "تسعه": 9,
  "العاشر": 10, "عاشر": 10, "عشره": 10,
  "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
  "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
};

// Extract any Juz numbers referenced in a (normalized) text.
// Handles "2", "٢", "ج2", "جزء 2", "الجزء الثاني", "juz 2", "part two".
export function extractJuzNumbers(rawText: string): number[] {
  const text = normalizeArabic(rawText);
  const nums = new Set<number>();

  // Direct digits (already western after normalize).
  for (const m of text.matchAll(/\b(\d{1,3})\b/g)) {
    nums.add(parseInt(m[1], 10));
  }
  // "ج2" style stuck to ج.
  for (const m of text.matchAll(/ج\s*(\d{1,3})/g)) {
    nums.add(parseInt(m[1], 10));
  }
  // Word numbers.
  for (const word in WORD_NUMBERS) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(text)) {
      nums.add(WORD_NUMBERS[word]);
    }
  }
  return [...nums];
}

// Parse the juzNumber field (which may be free text like "1, 2, 3") into numbers.
export function parseJuzField(juz: string | null): number[] {
  if (!juz) return [];
  const text = normalizeArabic(juz);
  const out = new Set<number>();
  for (const m of text.matchAll(/\d{1,3}/g)) out.add(parseInt(m[0], 10));
  for (const word in WORD_NUMBERS) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(text)) out.add(WORD_NUMBERS[word]);
  }
  return [...out];
}

// Token overlap score between a query and a record's searchable text.
export function similarityScore(queryNorm: string, fieldNorm: string): number {
  if (!queryNorm || !fieldNorm) return 0;
  const qTokens = queryNorm.split(" ").filter((t) => t.length > 1);
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const t of qTokens) {
    if (fieldNorm.includes(t)) hits++;
  }
  return hits / qTokens.length;
}
