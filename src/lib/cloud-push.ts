/**
 * Firestore write helpers — pushed after every local mutation.
 * Uses Last-Write-Wins transactions where needed; queues offline writes.
 */
import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { AppNotification, BorrowRecord, Reservation } from "./types";
import type { Conversation } from "./conversations-types";
import type { AuditEntry } from "./audit";
import type { WorkspaceMeta } from "./user-meta";
import { getFirebase } from "./firebase";
import { addPendingSync, getPendingSyncs, removePendingSync } from "./db";
import { incomingIsNewer, libraryIdToUserId, nowIso, stripServerFields } from "./sync-utils";
import { markSynced, setSyncState } from "./sync-state";

export type CloudCollection =
  | "borrows"
  | "reservations"
  | "notifications"
  | "conversations"
  | "settings"
  | "meta"
  | "audit";

type CloudRecord =
  | BorrowRecord
  | Reservation
  | AppNotification
  | Conversation
  | Record<string, unknown>
  | AuditEntry
  | WorkspaceMeta;

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

async function lwwSetDoc(
  path: string[],
  id: string,
  data: Record<string, unknown>,
  updatedAt?: string,
) {
  const { db } = getFirebase();
  if (!db) return false;

  const ref = doc(db, ...path, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const remoteAt = snap.exists() ? (snap.data().updatedAt as string | undefined) : undefined;
    if (snap.exists() && !incomingIsNewer(updatedAt ?? (data.updatedAt as string), remoteAt)) {
      return;
    }
    tx.set(ref, { ...data, syncedAt: serverTimestamp() }, { merge: true });
  });
  return true;
}

export async function pushToCloud(
  type: "borrows" | "reservations" | "notifications",
  record: BorrowRecord | Reservation | AppNotification,
) {
  if (typeof window === "undefined") return;

  const userId = libraryIdToUserId(record.libraryId);
  const updatedAt =
    "updatedAt" in record && record.updatedAt
      ? record.updatedAt
      : "createdAt" in record
        ? record.createdAt
        : nowIso();

  const { db } = getFirebase();
  if (!db || !isOnline()) {
    await addPendingSync(type, record);
    return;
  }

  setSyncState("syncing");
  try {
    await lwwSetDoc(["users", userId, type], record.id, record as unknown as Record<string, unknown>, updatedAt);
    markSynced();
    setSyncState("synced");
  } catch (e) {
    console.warn("[Sync] pushToCloud failed, queuing:", e);
    await addPendingSync(type, record);
    setSyncState("offline");
  }
}

export async function pushConversationToCloud(conv: Conversation) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db || !isOnline()) {
    await addPendingSync("conversations", conv as unknown as BorrowRecord);
    return;
  }

  setSyncState("syncing");
  try {
    await lwwSetDoc(
      ["aiConversations"],
      conv.id,
      { ...conv, userId: conv.userId },
      conv.updatedAt,
    );
    markSynced();
    setSyncState("synced");
  } catch (e) {
    console.warn("[Sync] conversation push failed:", e);
    await addPendingSync("conversations", conv as unknown as BorrowRecord);
    setSyncState("offline");
  }
}

export async function pushWorkspaceMeta(userId: string, meta: WorkspaceMeta) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db || !isOnline()) {
    await addPendingSync("meta", { ...meta, id: "workspace", libraryId: `lib_${userId}` } as unknown as BorrowRecord);
    return;
  }

  try {
    await lwwSetDoc(["users", userId, "meta"], "workspace", meta as unknown as Record<string, unknown>, meta.updatedAt);
    markSynced();
  } catch (e) {
    console.warn("[Sync] meta push failed:", e);
    await addPendingSync("meta", { ...meta, id: "workspace", libraryId: `lib_${userId}` } as unknown as BorrowRecord);
  }
}

export async function pushSettingsToCloud(
  userId: string,
  settings: {
    libraryName: string;
    language?: string;
    theme?: string;
    displayName?: string;
    updatedAt: string;
  },
) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db || !isOnline()) {
    await addPendingSync("settings", { ...settings, id: userId, libraryId: `lib_${userId}` } as unknown as BorrowRecord);
    return;
  }

  try {
    await lwwSetDoc(["users", userId], userId, {
      uid: userId,
      libraryName: settings.libraryName,
      language: settings.language,
      theme: settings.theme,
      displayName: settings.displayName,
      updatedAt: settings.updatedAt,
    }, settings.updatedAt);
    markSynced();
  } catch (e) {
    console.warn("[Sync] settings push failed:", e);
    await addPendingSync("settings", { ...settings, id: userId, libraryId: `lib_${userId}` } as unknown as BorrowRecord);
  }
}

export async function pushAuditEntry(userId: string, entry: AuditEntry) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db || !isOnline()) {
    await addPendingSync("audit", { ...entry, libraryId: `lib_${userId}` } as unknown as BorrowRecord);
    return;
  }

  try {
    await setDoc(doc(db, "users", userId, "auditLogs", entry.id), {
      ...entry,
      syncedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[Sync] audit push failed:", e);
    await addPendingSync("audit", { ...entry, libraryId: `lib_${userId}` } as unknown as BorrowRecord);
  }
}

export async function deleteFromCloud(
  type: "borrows" | "reservations" | "notifications",
  id: string,
) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db) return;
  try {
    const raw = localStorage.getItem("amanah-user");
    const userId = raw ? (JSON.parse(raw) as { uid: string }).uid : null;
    if (userId) {
      await deleteDoc(doc(db, "users", userId, type, id));
    }
  } catch (e) {
    console.error("[Sync] deleteFromCloud failed:", e);
  }
}

export async function deleteConversationFromCloud(convId: string) {
  if (typeof window === "undefined") return;
  const { db } = getFirebase();
  if (!db) return;
  try {
    await deleteDoc(doc(db, "aiConversations", convId));
  } catch (e) {
    console.warn("[Sync] delete conversation failed:", e);
  }
}

async function flushEntry(entry: Awaited<ReturnType<typeof getPendingSyncs>>[number]): Promise<boolean> {
  const { db: firestoreDb } = getFirebase();
  if (!firestoreDb || !entry.payload) return false;

  try {
    if (entry.type === "conversations") {
      const conv = entry.payload as unknown as Conversation;
      await lwwSetDoc(["aiConversations"], conv.id, { ...conv, userId: conv.userId }, conv.updatedAt);
      return true;
    }
    if (entry.type === "meta") {
      const meta = entry.payload as unknown as WorkspaceMeta & { libraryId?: string };
      const userId = libraryIdToUserId(meta.libraryId ?? "");
      await lwwSetDoc(["users", userId, "meta"], "workspace", meta as unknown as Record<string, unknown>, meta.updatedAt);
      return true;
    }
    if (entry.type === "settings") {
      const s = entry.payload as unknown as Record<string, unknown>;
      const userId = libraryIdToUserId((s.libraryId as string) ?? "");
      await lwwSetDoc(["users", userId], userId, s, s.updatedAt as string);
      return true;
    }
    if (entry.type === "audit") {
      const a = entry.payload as unknown as AuditEntry & { libraryId: string };
      const userId = libraryIdToUserId(a.libraryId);
      await setDoc(doc(firestoreDb, "users", userId, "auditLogs", a.id), {
        ...stripServerFields(a as unknown as Record<string, unknown>),
        syncedAt: serverTimestamp(),
      });
      return true;
    }
    if (entry.type === "delete" || entry.type === "borrows" || entry.type === "reservations" || entry.type === "notifications") {
      const record = entry.payload as BorrowRecord | Reservation | AppNotification;
      const userId = libraryIdToUserId(record.libraryId);
      const updatedAt = "updatedAt" in record ? record.updatedAt : nowIso();
      await lwwSetDoc(
        ["users", userId, entry.type === "delete" ? "borrows" : entry.type],
        record.id,
        record as unknown as Record<string, unknown>,
        updatedAt,
      );
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`[Sync] flush failed for ${entry.key}:`, e);
    return false;
  }
}

export async function flushPendingQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;

  const { db: firestoreDb } = getFirebase();
  if (!firestoreDb || !isOnline()) return 0;

  const pending = await getPendingSyncs();
  if (pending.length === 0) return 0;

  setSyncState("syncing");
  let synced = 0;

  // Process oldest first for predictable ordering
  const sorted = [...pending].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  for (const entry of sorted) {
    const ok = await flushEntry(entry);
    if (ok) {
      await removePendingSync(entry.key);
      synced++;
    }
  }

  markSynced();
  setSyncState(synced > 0 ? "synced" : "offline");
  return synced;
}

/** Push all local-only records that are newer than cloud (initial + background sync). */
export async function pushLocalChangesToCloud(libraryId: string, userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const { db } = getFirebase();
  if (!db || !isOnline()) return;

  setSyncState("syncing");
  try {
    const { getBorrows, getReservations, getNotifications } = await import("./db");
    const { loadConversations } = await import("./conversations");
    const { getWorkspaceMeta } = await import("./user-meta");
    const { getSettings } = await import("./settings");

    const [borrows, reservations, notifications] = await Promise.all([
      getBorrows(libraryId),
      getReservations(libraryId),
      getNotifications(libraryId),
    ]);
    const conversations = loadConversations(userId);

    for (const b of borrows) {
      await pushToCloud("borrows", b);
    }
    for (const r of reservations) {
      await pushToCloud("reservations", r);
    }
    for (const n of notifications) {
      await pushToCloud("notifications", n);
    }
    for (const c of conversations) {
      await pushConversationToCloud(c);
    }

    await pushWorkspaceMeta(userId, getWorkspaceMeta(userId));
    const settings = getSettings();
    await pushSettingsToCloud(userId, {
      libraryName: settings.libraryName || "",
      language: settings.language,
      theme: settings.theme,
      displayName: settings.userDisplayName,
      updatedAt: settings.updatedAt ?? nowIso(),
    });

    await flushPendingQueue();
    markSynced();
    setSyncState("synced");
  } catch (e) {
    console.error("[Sync] pushLocalChangesToCloud failed:", e);
    setSyncState("offline");
  }
}
