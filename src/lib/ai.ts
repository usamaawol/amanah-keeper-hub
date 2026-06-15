import type { BorrowRecord, Reservation } from "./types";
import { bookLabel, effectiveStatus } from "./store";
import {
  normalizeArabic,
  extractJuzNumbers,
  parseJuzField,
  similarityScore,
} from "./arabic";

interface ScoredRecord {
  record: BorrowRecord;
  score: number;
}

// Build a normalized searchable blob for a borrow record across all fields.
function searchableText(b: BorrowRecord): string {
  return normalizeArabic(
    [
      b.borrowerFullName,
      b.bookNameArabic,
      b.bookNameEnglish,
      b.sharhName || "",
      b.juzNumber ?? "",
      b.notes,
    ].join(" "),
  );
}

// Retrieve relevant borrow records for a question using normalized,
// number-aware, multi-field matching. Always returns something useful:
// exact/strong matches first, otherwise the closest similar records.
export function retrieveRecords(
  question: string,
  borrows: BorrowRecord[],
): { strong: BorrowRecord[]; similar: BorrowRecord[]; queryNorm: string } {
  const queryNorm = normalizeArabic(question);
  const queryJuz = extractJuzNumbers(question);

  const scored: ScoredRecord[] = borrows.map((b) => {
    const field = searchableText(b);
    let score = similarityScore(queryNorm, field);

    // Juz-aware boosting/penalty.
    if (queryJuz.length > 0) {
      const recJuz = parseJuzField(b.juzNumber);
      const juzMatch = queryJuz.some((q) => recJuz.includes(q));
      if (juzMatch) score += 0.5;
      else if (recJuz.length > 0) score -= 0.15; // different juz, slight penalty
    }
    return { record: b, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const strong = scored.filter((s) => s.score >= 0.5).map((s) => s.record);
  const similar = scored
    .filter((s) => s.score > 0 && s.score < 0.5)
    .slice(0, 5)
    .map((s) => s.record);

  return { strong, similar, queryNorm };
}

function recordLine(b: BorrowRecord): string {
  return [
    `Borrower: ${b.borrowerFullName}`,
    `Type: ${b.bookType === "single" ? "Single book" : "Multi-Juz/Sharh"}`,
    `Book(EN): ${b.bookNameEnglish}`,
    `Book(AR): ${b.bookNameArabic}`,
    b.sharhName ? `Sharh: ${b.sharhName}` : "",
    `Juz: ${b.juzNumber ?? "-"}`,
    `Borrowed: ${b.borrowDate}`,
    `ExpectedReturn: ${b.expectedReturnDate}`,
    `ActualReturn: ${b.actualReturnDate ?? "not returned"}`,
    `Status: ${effectiveStatus(b)}`,
    b.notes ? `Notes: ${b.notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildContext(
  strong: BorrowRecord[],
  similar: BorrowRecord[],
  all: BorrowRecord[],
  reservations: Reservation[],
): string {
  const lines: string[] = [];

  // If no matches at all from retrieval, fall back to ALL records so generic
  // queries like "who borrowed a book" or "list all borrowers" still work.
  const hasMatches = strong.length > 0 || similar.length > 0;

  lines.push("=== STRONG MATCHES (most relevant to the question) ===");
  if (strong.length === 0) lines.push("(none — no exact match was found)");
  for (const b of strong) lines.push(recordLine(b));

  lines.push("");
  lines.push("=== SIMILAR / FALLBACK MATCHES (use only if no strong match) ===");
  if (similar.length === 0) lines.push("(none)");
  for (const b of similar) lines.push(recordLine(b));

  if (!hasMatches && all.length > 0) {
    lines.push("");
    lines.push("=== ALL LIBRARY RECORDS (query was generic — full list provided) ===");
    for (const b of all) lines.push(recordLine(b));
  }

  lines.push("");
  lines.push("=== RESERVATION QUEUES ===");
  for (const r of reservations) {
    lines.push(
      `${bookLabel(r, "en")} -> queue: ${
        r.queue.map((q, i) => `${i + 1}. ${q.name}`).join(", ") || "empty"
      }`,
    );
  }
  return lines.join("\n");
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function askLibraryAI(opts: {
  question: string;
  apiKey: string;
  model: string;
  borrows: BorrowRecord[];
  reservations: Reservation[];
  history?: ChatTurn[];
}): Promise<string> {
  const { question, apiKey, model, borrows, reservations, history = [] } = opts;

  // ---- Retrieval first, AI second ----
  const { strong, similar, queryNorm } = retrieveRecords(question, borrows);

  // ---- Debug logs ----
  console.groupCollapsed("[AI] Library retrieval");
  console.log("User question:", question);
  console.log("Normalized question:", queryNorm);
  console.log("Detected Juz:", extractJuzNumbers(question));
  console.log(`Strong matches (${strong.length}):`, strong.map(recordLine));
  console.log(`Similar/fallback matches (${similar.length}):`, similar.map(recordLine));
  console.groupEnd();

  const context = buildContext(strong, similar, borrows, reservations);
  console.log("[AI] Records sent to AI:\n" + context);

  const today = new Date().toISOString().slice(0, 10);
  const system = `You are the smart assistant for "Amanah Library System". You answer ONLY using the library records provided below. The records were already retrieved for you from the database — do not claim you cannot search.

LANGUAGE RULES (CRITICAL):
- Detect the language of the user's question and ALWAYS reply in that SAME language.
  • English question → English answer.
  • Arabic question (contains Arabic script) → Arabic answer.
  • Afaan Oromo question (Latin script, words like "eenyutu", "kitaaba", "fudhate", "deebi'e", "akkam", "meeqa") → Afaan Oromo answer.
- Even if your Afaan Oromo is limited, always attempt a response in Afaan Oromo — NEVER refuse or switch to English unless the user explicitly asks you to.
- Book names may appear in Arabic or English in the records — match them regardless of question language.

CORE RULES:
- Today's date is ${today}. A record is "Overdue" when it is not returned and its ExpectedReturn date is before today.
- Use the conversation history to resolve follow-up references ("متى استعاره؟", "هل أعاده؟", "what about Juz 3?", "akkam ta'e?") — but ALWAYS base factual answers on the records below.
- NEVER say "لا توجد معلومات" / "There is no information" / "Odeeffannoon hin jiru" when there ARE records in the ALL LIBRARY RECORDS section. For generic queries ("who borrowed a book", "من استعار كتاباً", "Eenyutu kitaaba fudhate?", "list all borrowers"), list ALL records from that section.

USING THE RETRIEVED RECORDS:
- Prefer STRONG MATCHES first. If none, use SIMILAR/FALLBACK matches and offer them as suggestions.
- If the ALL LIBRARY RECORDS section has data, use it to answer any broad/generic question.
- Only say there is no information when ALL three sections are empty.

ANSWERING DIFFERENT QUESTION TYPES:
- "Who borrowed...?" / "من استعار...؟" / "Eenyutu...fudhate?" → name every matching borrower with book, status, and dates.
- "List all" / "اعرض الكل" / "hunda agarsiisi" → list everything from ALL LIBRARY RECORDS.
- "Which books are overdue / returned / borrowed?" → filter by status and list.
- "How many...?" → give a clear NUMBER then offer to list.
- Be concise, use short lists, never expose internal IDs.

LIBRARY RECORDS:
${context}`;

  const messages = [
    { role: "system" as const, content: system },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: question },
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.1 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content?.trim() ?? "No response.";
  console.log("[AI] Final AI response:", answer);
  return answer;
}
