/**
 * Enterprise multi-device sync — Google Drive-style behaviour.
 *
 *   IndexedDB (offline-first source of truth)
 *     ↕ Firestore onSnapshot listeners (incremental, docChanges only)
 *     ↕ pending-sync queue (offline writes)
 *     ↕ background push every 45 s + on reconnect + on tab focus
 *
 * Conflict resolution: Last-Write-Wins on `updatedAt` ISO timestamps.
 */

import type { BorrowRecord, Reservation, AppNotification } from "./types";
import type { Conversation } from "./conversations-types";
import type { AuditEntry } from "./audit";
import { getFirebase } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getBorrows,
  putBorrow as putBorrowDB,
  getReservations,
  putReservation as putReservationDB,
  getNotifications,
  putNotification as putNotificationDB,
  putNotifications as putNotificationsDB,
} from "./db";
import { loadConversations, saveAllLocal as saveAllConversations } from "./conversations";
import { loadAudit, mergeAuditEntries } from "./audit";
import { applyRemoteMeta } from "./user-meta";
import { normalizeRole } from "./roles";
import { incomingIsNewer, stripServerFields } from "./sync-utils";
import { markSynced, setSyncState, useSyncStatus, getLastSyncedAt } from "./sync-state";
import {
  flushPendingQueue,
  pushLocalChangesToCloud,
  pushSettingsToCloud,
} from "./cloud-push";

export { useSyncStatus, getLastSyncedAt, flushPendingQueue };
export { pushToCloud, deleteFromCloud, pushConversationToCloud } from "./cloud-push";
export type { SyncState } from "./sync-state";

// ── Listener + background-sync registry ───────────────────────────────────────

const _unsubscribers: Unsubscribe[] = [];
let _bgTimer: ReturnType<typeof setInterval> | null = null;
let _activeLibraryId: string | null = null;
let _activeUserId: string | null = null;
let _invalidate: ((queryKey: unknown[]) => void) | null = null;

function clearListeners() {
  _unsubscribers.forEach((u) => { try { u(); } catch { /* ignore */ } });
  _unsubscribers.length = 0;
}

function stopBackgroundSync() {
  if (_bgTimer) {
    clearInterval(_bgTimer);
    _bgTimer = null;
  }
}

function onSnapshotSettled(metadata: { hasPendingWrites: boolean }) {
  if (!metadata.hasPendingWrites) {
    markSynced();
    setSyncState("synced");
  } else {
    setSyncState("syncing");
  }
}

/** Merge a single remote record into IndexedDB if cloud wins LWW. */
async function mergeBorrow(libraryId: string, remote: BorrowRecord, local?: BorrowRecord): Promise<boolean> {
  if (!incomingIsNewer(remote.updatedAt, local?.updatedAt)) return false;
  await putBorrowDB(remote, true);
  return true;
}

async function mergeReservation(libraryId: string, remote: Reservation, local?: Reservation): Promise<boolean> {
  if (!incomingIsNewer(remote.updatedAt, local?.updatedAt)) return false;
  await putReservationDB(remote, true);
  return true;
}

async function mergeNotification(remote: AppNotification, local?: AppNotification): Promise<boolean> {
  const remoteAt = remote.createdAt;
  const localAt = local?.createdAt;
  if (local && !incomingIsNewer(remoteAt, localAt)) return false;
  await putNotificationDB(remote, true);
  return true;
}

// ── Real-time listeners (incremental docChanges, in-memory caches) ────────────

export function startRealtimeSync(
  libraryId: string,
  userId: string,
  invalidate: (queryKey: unknown[]) => void,
) {
  if (typeof window === "undefined") return;

  const { db } = getFirebase();
  if (!db) {
    setSyncState("offline");
    return;
  }

  _activeLibraryId = libraryId;
  _activeUserId = userId;
  _invalidate = invalidate;

  clearListeners();
  stopBackgroundSync();
  setSyncState("syncing");

  // Pre-load caches once (avoids N×getAll per snapshot)
  let borrowCache = new Map<string, BorrowRecord>();
  let resCache = new Map<string, Reservation>();
  let notifCache = new Map<string, AppNotification>();

  void Promise.all([getBorrows(libraryId), getReservations(libraryId), getNotifications(libraryId)]).then(
    ([borrows, reservations, notifications]) => {
      borrowCache = new Map(borrows.map((b) => [b.id, b]));
      resCache = new Map(reservations.map((r) => [r.id, r]));
      notifCache = new Map(notifications.map((n) => [n.id, n]));
    },
  );

  // ── Borrows ──────────────────────────────────────────────────────────────
  _unsubscribers.push(
    onSnapshot(
      collection(db, "users", userId, "borrows"),
      async (snapshot) => {
        let changed = false;
        for (const change of snapshot.docChanges()) {
          const remote = stripServerFields(change.doc.data()) as BorrowRecord;
          if (change.type === "removed") {
            borrowCache.delete(remote.id);
            continue;
          }
          const local = borrowCache.get(remote.id);
          if (await mergeBorrow(libraryId, remote, local)) {
            borrowCache.set(remote.id, remote);
            changed = true;
          }
        }
        if (changed) invalidate(["borrows", libraryId]);
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => {
        console.warn("[Sync] borrows listener:", err.message);
        setSyncState("offline");
      },
    ),
  );

  // ── Reservations ───────────────────────────────────────────────────────
  _unsubscribers.push(
    onSnapshot(
      collection(db, "users", userId, "reservations"),
      async (snapshot) => {
        let changed = false;
        for (const change of snapshot.docChanges()) {
          const remote = stripServerFields(change.doc.data()) as Reservation;
          if (change.type === "removed") {
            resCache.delete(remote.id);
            continue;
          }
          const local = resCache.get(remote.id);
          if (await mergeReservation(libraryId, remote, local)) {
            resCache.set(remote.id, remote);
            changed = true;
          }
        }
        if (changed) invalidate(["reservations", libraryId]);
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => {
        console.warn("[Sync] reservations listener:", err.message);
        setSyncState("offline");
      },
    ),
  );

  // ── Notifications (per-doc LWW on createdAt) ───────────────────────────
  _unsubscribers.push(
    onSnapshot(
      collection(db, "users", userId, "notifications"),
      async (snapshot) => {
        let changed = false;
        for (const change of snapshot.docChanges()) {
          const remote = stripServerFields(change.doc.data()) as AppNotification;
          if (change.type === "removed") {
            notifCache.delete(remote.id);
            continue;
          }
          const local = notifCache.get(remote.id);
          if (await mergeNotification(remote, local)) {
            notifCache.set(remote.id, remote);
            changed = true;
          }
        }
        if (changed) invalidate(["notifications", libraryId]);
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => {
        console.warn("[Sync] notifications listener:", err.message);
        setSyncState("offline");
      },
    ),
  );

  // ── AI Conversations ─────────────────────────────────────────────────────
  _unsubscribers.push(
    onSnapshot(
      query(collection(db, "aiConversations"), where("userId", "==", userId)),
      (snapshot) => {
        let changed = false;
        const local = loadConversations(userId);
        const localMap = new Map(local.map((c) => [c.id, c]));

        for (const change of snapshot.docChanges()) {
          const remote = stripServerFields(change.doc.data()) as Conversation;
          if (change.type === "removed") {
            localMap.delete(remote.id);
            changed = true;
            continue;
          }
          const loc = localMap.get(remote.id);
          if (!loc || incomingIsNewer(remote.updatedAt, loc.updatedAt)) {
            localMap.set(remote.id, remote);
            changed = true;
          }
        }

        if (changed) {
          const merged = Array.from(localMap.values()).sort((a, b) =>
            a.updatedAt < b.updatedAt ? 1 : -1,
          );
          saveAllConversations(userId, merged);
          window.dispatchEvent(new Event("amanah-conversations-changed"));
        }
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => console.warn("[Sync] conversations listener:", err.message),
    ),
  );

  // ── Settings / user profile ────────────────────────────────────────────
  _unsubscribers.push(
    onSnapshot(
      doc(db, "users", userId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const current = localStorage.getItem("amanah-settings");
        const settings = current ? JSON.parse(current) : {};

        if (incomingIsNewer(data.updatedAt as string, settings.updatedAt)) {
          const next = {
            ...settings,
            libraryName: data.libraryName || settings.libraryName,
            userDisplayName: data.displayName || settings.userDisplayName,
            language: data.language || settings.language,
            theme: data.theme || settings.theme,
            updatedAt: data.updatedAt,
          };
          localStorage.setItem("amanah-settings", JSON.stringify(next));
          window.dispatchEvent(new Event("amanah-settings-changed"));
        }

        // Propagate role / disabled changes to cached session (multi-device)
        try {
          const raw = localStorage.getItem("amanah-user");
          if (raw) {
            const cached = JSON.parse(raw) as { uid: string; role?: string; disabled?: boolean; libraryName?: string };
            if (cached.uid === userId) {
              const remoteRole = normalizeRole(data.role);
              const remoteDisabled = !!data.disabled;
              if (
                cached.role !== remoteRole ||
                cached.disabled !== remoteDisabled ||
                (data.libraryName && cached.libraryName !== data.libraryName)
              ) {
                cached.role = remoteRole;
                cached.disabled = remoteDisabled;
                if (data.libraryName) cached.libraryName = data.libraryName as string;
                localStorage.setItem("amanah-user", JSON.stringify(cached));
                window.dispatchEvent(new Event("amanah-auth-changed"));
              }
            }
          }
        } catch { /* ignore */ }

        onSnapshotSettled(snapshot.metadata);
      },
      (err) => console.warn("[Sync] profile listener:", err.message),
    ),
  );

  // ── History prefs (workspace meta) ─────────────────────────────────────
  _unsubscribers.push(
    onSnapshot(
      doc(db, "users", userId, "meta", "workspace"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const remote = stripServerFields(snapshot.data()) as { historyHidden: string[]; updatedAt: string };
        if (applyRemoteMeta(userId, remote)) {
          window.dispatchEvent(new Event("amanah-meta-changed"));
        }
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => console.warn("[Sync] meta listener:", err.message),
    ),
  );

  // ── Audit log (last 200 entries, append-only merge) ────────────────────
  _unsubscribers.push(
    onSnapshot(
      query(
        collection(db, "users", userId, "auditLogs"),
        orderBy("timestamp", "desc"),
        limit(200),
      ),
      (snapshot) => {
        const remote = snapshot.docs.map((d) => stripServerFields(d.data()) as AuditEntry);
        if (remote.length > 0) {
          mergeAuditEntries(remote);
        }
        onSnapshotSettled(snapshot.metadata);
      },
      (err) => console.warn("[Sync] audit listener:", err.message),
    ),
  );

  // ── Background sync (flush offline queue every 45 s while online) ────────
  _bgTimer = setInterval(() => {
    if (navigator.onLine && _activeLibraryId && _activeUserId) {
      void flushPendingQueue().then((n) => {
        if (n > 0 && _invalidate && _activeLibraryId) {
          _invalidate(["borrows", _activeLibraryId]);
          _invalidate(["reservations", _activeLibraryId]);
          _invalidate(["notifications", _activeLibraryId]);
        }
      });
    }
  }, 45_000);

  // Full bidirectional sync on startup
  void runBackgroundSync(libraryId, userId, true);
}

export function stopRealtimeSync() {
  clearListeners();
  stopBackgroundSync();
  _activeLibraryId = null;
  _activeUserId = null;
  _invalidate = null;
  setSyncState("offline");
}

/** Background sync: flush offline queue; optionally push all local changes (login/reconnect). */
export async function runBackgroundSync(
  libraryId: string,
  userId: string,
  fullPush = false,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;

  setSyncState("syncing");
  const flushed = await flushPendingQueue();

  if (fullPush) {
    await pushLocalChangesToCloud(libraryId, userId);
  }

  if (flushed > 0 && _invalidate) {
    _invalidate(["borrows", libraryId]);
    _invalidate(["reservations", libraryId]);
    _invalidate(["notifications", libraryId]);
  }
}

/** @deprecated Use pushLocalChangesToCloud */
export async function pushAllToCloud(libraryId: string, userId: string) {
  return pushLocalChangesToCloud(libraryId, userId);
}

export async function pushUserProfileToCloud(
  uid: string,
  libraryName: string,
  extras: { language?: string; theme?: string; displayName?: string } = {},
) {
  return pushSettingsToCloud(uid, {
    libraryName,
    language: extras.language,
    theme: extras.theme,
    displayName: extras.displayName,
    updatedAt: new Date().toISOString(),
  });
}

export async function fetchUserProfileFromCloud(uid: string) {
  const { fetchUserProfile } = await import("./user-profile");
  return fetchUserProfile(uid);
}

export async function syncFromCloud(_libraryId: string, _userId: string) {
  // superseded by real-time listeners
}
