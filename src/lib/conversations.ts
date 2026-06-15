// Per-user AI conversation memory. Stored in localStorage so it works
// offline and is fully isolated per authenticated user (keyed by uid).
// Database (library records) always remains the source of truth — this
// memory only provides conversational context for follow-up questions.

export interface ConvMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConvMessage[];
}

function key(userId: string) {
  return `amanah-conversations-${userId}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadConversations(userId: string): Conversation[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function saveAll(userId: string, list: Conversation[]) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(key(userId), JSON.stringify(list));
}

export function getConversation(userId: string, id: string): Conversation | null {
  return loadConversations(userId).find((c) => c.id === id) ?? null;
}

// Derive a short, human title from the first user message.
export function deriveTitle(firstMessage: string): string {
  const clean = firstMessage.trim().replace(/\s+/g, " ");
  if (clean.length <= 40) return clean;
  return clean.slice(0, 40).trimEnd() + "…";
}

export function createConversation(userId: string, title: string): Conversation {
  const now = new Date().toISOString();
  const conv: Conversation = {
    id: uid(),
    userId,
    title: title || "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  const list = loadConversations(userId);
  list.unshift(conv);
  saveAll(userId, list);
  return conv;
}

export function appendMessage(
  userId: string,
  convId: string,
  role: ConvMessage["role"],
  content: string,
): Conversation | null {
  const list = loadConversations(userId);
  const conv = list.find((c) => c.id === convId);
  if (!conv) return null;
  const msg: ConvMessage = {
    id: uid(),
    role,
    content,
    timestamp: new Date().toISOString(),
  };
  conv.messages.push(msg);
  conv.updatedAt = msg.timestamp;
  // Title from first user message if still default.
  if (role === "user" && (conv.title === "New conversation" || !conv.title)) {
    conv.title = deriveTitle(content);
  }
  saveAll(userId, list);
  return conv;
}

export function deleteConversation(userId: string, convId: string) {
  saveAll(
    userId,
    loadConversations(userId).filter((c) => c.id !== convId),
  );
}

// Group conversations into Today / Yesterday / Last Week / Older buckets.
export function groupByRecency(list: Conversation[]) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const buckets: { key: string; items: Conversation[] }[] = [
    { key: "today", items: [] },
    { key: "yesterday", items: [] },
    { key: "lastWeek", items: [] },
    { key: "older", items: [] },
  ];
  for (const c of list) {
    const t = new Date(c.updatedAt).getTime();
    if (t >= today) buckets[0].items.push(c);
    else if (t >= yesterday) buckets[1].items.push(c);
    else if (t >= weekAgo) buckets[2].items.push(c);
    else buckets[3].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}
