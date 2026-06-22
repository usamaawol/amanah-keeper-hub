// Per-user AI conversation memory. Stored in localStorage (offline-first)
// and synced to Firestore aiConversations/{id} for multi-device access.

import type { Conversation, ConvMessage } from "./conversations-types";

export type { ConvMessage, Conversation } from "./conversations-types";

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

export function saveAllLocal(userId: string, list: Conversation[]) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(key(userId), JSON.stringify(list));
}

function scheduleCloudPush(conv: Conversation) {
  if (typeof window === "undefined") return;
  void import("./cloud-push")
    .then((m) => m.pushConversationToCloud(conv))
    .catch(() => {});
}

export function saveAll(userId: string, list: Conversation[], skipCloud = false) {
  saveAllLocal(userId, list);
  if (!skipCloud) {
    for (const conv of list) scheduleCloudPush(conv);
  }
}

export function getConversation(userId: string, id: string): Conversation | null {
  return loadConversations(userId).find((c) => c.id === id) ?? null;
}

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
  if (role === "user" && (conv.title === "New conversation" || !conv.title)) {
    conv.title = deriveTitle(content);
  }
  saveAll(userId, list);
  scheduleCloudPush(conv);
  return conv;
}

export function deleteConversation(userId: string, convId: string) {
  const list = loadConversations(userId).filter((c) => c.id !== convId);
  saveAllLocal(userId, list);
  void import("./cloud-push")
    .then((m) => m.deleteConversationFromCloud(convId))
    .catch(() => {});
}

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
