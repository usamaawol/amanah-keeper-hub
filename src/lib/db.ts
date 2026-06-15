import { openDB, type IDBPDatabase } from "idb";
import type { AppNotification, BorrowRecord, Reservation } from "./types";

const DB_NAME = "amanah-library";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("borrows")) {
          const s = db.createObjectStore("borrows", { keyPath: "id" });
          s.createIndex("libraryId", "libraryId");
        }
        if (!db.objectStoreNames.contains("reservations")) {
          const s = db.createObjectStore("reservations", { keyPath: "id" });
          s.createIndex("libraryId", "libraryId");
        }
        if (!db.objectStoreNames.contains("notifications")) {
          const s = db.createObjectStore("notifications", { keyPath: "id" });
          s.createIndex("libraryId", "libraryId");
        }
      },
    });
  }
  return dbPromise;
}

async function allByLibrary<T>(store: string, libraryId: string): Promise<T[]> {
  const db = await getDB();
  const idx = db.transaction(store).store.index("libraryId");
  return (await idx.getAll(libraryId)) as T[];
}

// Borrows
export async function getBorrows(libraryId: string) {
  return allByLibrary<BorrowRecord>("borrows", libraryId);
}
export async function putBorrow(rec: BorrowRecord) {
  const db = await getDB();
  await db.put("borrows", rec);
}

// Reservations
export async function getReservations(libraryId: string) {
  return allByLibrary<Reservation>("reservations", libraryId);
}
export async function putReservation(rec: Reservation) {
  const db = await getDB();
  await db.put("reservations", rec);
}
export async function deleteReservation(id: string) {
  const db = await getDB();
  await db.delete("reservations", id);
}

// Notifications
export async function getNotifications(libraryId: string) {
  return allByLibrary<AppNotification>("notifications", libraryId);
}
export async function putNotification(rec: AppNotification) {
  const db = await getDB();
  await db.put("notifications", rec);
}
export async function putNotifications(recs: AppNotification[]) {
  const db = await getDB();
  const tx = db.transaction("notifications", "readwrite");
  await Promise.all(recs.map((r) => tx.store.put(r)));
  await tx.done;
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
