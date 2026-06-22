/**
 * IndexedDB layer — Offline-First Foundation
 *
 * Stores:
 *   borrows        — BorrowRecord[]       (indexed by libraryId)
 *   reservations   — Reservation[]        (indexed by libraryId)
 *   notifications  — AppNotification[]    (indexed by libraryId)
 *   pendingSyncs   — PendingSync[]        (writes queued while offline)
 *
 * All mutations write here first, then attempt to push to Firestore.
 * If Firestore is unreachable, the record goes into pendingSyncs so it
 * can be retried automatically when connectivity returns.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { AppNotification, BorrowRecord, Reservation } from "./types";

const DB_NAME = "amanah-library";
// Bump version to 2 to add the pendingSyncs store.
// idb will call upgrade() for clients on version 1.
const DB_VERSION = 2;

// ── Pending sync entry ────────────────────────────────────────────────────────

export type PendingSyncType =
  | "borrows"
  | "reservations"
  | "notifications"
  | "conversations"
  | "settings"
  | "meta"
  | "audit"
  | "delete";

export interface PendingSync {
  /** Unique key: "{type}/{recordId}" */
  key: string;
  type: PendingSyncType;
  recordId: string;
  /** Full record payload (null for deletes) */
  payload: BorrowRecord | Reservation | AppNotification | null;
  /** ISO timestamp of when the sync was queued */
  queuedAt: string;
  /** How many times we've attempted to sync this entry */
  attempts: number;
}

// ── DB singleton ──────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function isClient() {
  return typeof indexedDB !== "undefined";
}

/** Fire-and-forget cloud push — dynamic import breaks db ↔ sync circular dependency. */
function scheduleCloudPush(
  type: "borrows" | "reservations" | "notifications",
  record: BorrowRecord | Reservation | AppNotification,
) {
  if (!isClient()) return;
  void import("./cloud-push")
    .then((m) => m.pushToCloud(type, record))
    .catch(() => {});
}

function scheduleCloudDelete(type: "borrows" | "reservations" | "notifications", id: string) {
  if (!isClient()) return;
  void import("./cloud-push")
    .then((m) => m.deleteFromCloud(type, id))
    .catch(() => {});
}

function getDB() {
  if (!isClient()) {
    throw new Error("IndexedDB unavailable");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1 stores (create if upgrading from scratch or v1)
        if (oldVersion < 1) {
          const borrows = db.createObjectStore("borrows", { keyPath: "id" });
          borrows.createIndex("libraryId", "libraryId");

          const reservations = db.createObjectStore("reservations", { keyPath: "id" });
          reservations.createIndex("libraryId", "libraryId");

          const notifications = db.createObjectStore("notifications", { keyPath: "id" });
          notifications.createIndex("libraryId", "libraryId");
        }

        // Version 2 — offline queue store
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("pendingSyncs")) {
            db.createObjectStore("pendingSyncs", { keyPath: "key" });
          }
        }
      },
    });
  }
  return dbPromise;
}

// ── Generic helpers ───────────────────────────────────────────────────────────

async function allByLibrary<T>(store: string, libraryId: string): Promise<T[]> {
  const db = await getDB();
  const idx = db.transaction(store).store.index("libraryId");
  return (await idx.getAll(libraryId)) as T[];
}

// ── Borrows ───────────────────────────────────────────────────────────────────

export async function getBorrows(libraryId: string) {
  if (!isClient()) return [];
  return allByLibrary<BorrowRecord>("borrows", libraryId);
}

export async function putBorrow(rec: BorrowRecord, skipCloud = false) {
  if (!isClient()) return;
  const db = await getDB();
  await db.put("borrows", rec);
  if (!skipCloud) scheduleCloudPush("borrows", rec);
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function getReservations(libraryId: string) {
  if (!isClient()) return [];
  return allByLibrary<Reservation>("reservations", libraryId);
}

export async function putReservation(rec: Reservation, skipCloud = false) {
  if (!isClient()) return;
  const db = await getDB();
  await db.put("reservations", rec);
  if (!skipCloud) scheduleCloudPush("reservations", rec);
}

export async function deleteReservation(id: string, skipCloud = false) {
  if (!isClient()) return;
  const db = await getDB();
  await db.delete("reservations", id);
  if (!skipCloud) scheduleCloudDelete("reservations", id);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(libraryId: string) {
  if (!isClient()) return [];
  return allByLibrary<AppNotification>("notifications", libraryId);
}

export async function putNotification(rec: AppNotification, skipCloud = false) {
  if (!isClient()) return;
  const db = await getDB();
  await db.put("notifications", rec);
  if (!skipCloud) scheduleCloudPush("notifications", rec);
}

export async function putNotifications(recs: AppNotification[], skipCloud = false) {
  if (!isClient()) return;
  const db = await getDB();
  const tx = db.transaction("notifications", "readwrite");
  await Promise.all(recs.map((r) => tx.store.put(r)));
  await tx.done;
  if (!skipCloud) {
    for (const r of recs) scheduleCloudPush("notifications", r);
  }
}

// ── Pending sync queue ────────────────────────────────────────────────────────

/** Add or update a pending sync entry. Idempotent — keyed by type/id. */
export async function addPendingSync(
  type: PendingSyncType,
  record: BorrowRecord | Reservation | AppNotification | Record<string, unknown>,
) {
  try {
    const db = await getDB();
    const recordId =
      "id" in record && typeof record.id === "string"
        ? record.id
        : type === "meta"
          ? "workspace"
          : uid();
    const key = `${type}/${recordId}`;
    const existing = (await db.get("pendingSyncs", key)) as PendingSync | undefined;
    const entry: PendingSync = {
      key,
      type,
      recordId,
      payload: record as BorrowRecord | Reservation | AppNotification | null,
      queuedAt: existing?.queuedAt ?? new Date().toISOString(),
      attempts: (existing?.attempts ?? 0) + 1,
    };
    await db.put("pendingSyncs", entry);
  } catch {
    // Never let queue failures break the user's flow
  }
}

/** Remove a successfully synced entry from the queue. */
export async function removePendingSync(key: string) {
  try {
    const db = await getDB();
    await db.delete("pendingSyncs", key);
  } catch { /* ignore */ }
}

/** Get all pending sync entries. */
export async function getPendingSyncs(): Promise<PendingSync[]> {
  try {
    const db = await getDB();
    return (await db.getAll("pendingSyncs")) as PendingSync[];
  } catch {
    return [];
  }
}

/** Count of pending sync entries (for the UI badge). */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count("pendingSyncs");
  } catch {
    return 0;
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Generate a simple unique ID. */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
