import { openDB, type IDBPDatabase } from "idb";
import type { AppNotification, BorrowRecord, Reservation } from "./types";
import { pushToCloud, deleteFromCloud } from "./sync";

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
export async function putBorrow(rec: BorrowRecord, skipCloud = false) {
  const db = await getDB();
  await db.put("borrows", rec);
  if (!skipCloud) {
    pushToCloud("borrows", rec);
  }
}

// Reservations
export async function getReservations(libraryId: string) {
  return allByLibrary<Reservation>("reservations", libraryId);
}
export async function putReservation(rec: Reservation, skipCloud = false) {
  const db = await getDB();
  await db.put("reservations", rec);
  if (!skipCloud) {
    pushToCloud("reservations", rec);
  }
}
export async function deleteReservation(id: string, skipCloud = false) {
  const db = await getDB();
  await db.delete("reservations", id);
  if (!skipCloud) {
    deleteFromCloud("reservations", id);
  }
}

// Notifications
export async function getNotifications(libraryId: string) {
  return allByLibrary<AppNotification>("notifications", libraryId);
}
export async function putNotification(rec: AppNotification, skipCloud = false) {
  const db = await getDB();
  await db.put("notifications", rec);
  if (!skipCloud) {
    pushToCloud("notifications", rec);
  }
}
export async function putNotifications(recs: AppNotification[], skipCloud = false) {
  const db = await getDB();
  const tx = db.transaction("notifications", "readwrite");
  await Promise.all(recs.map(async (r) => {
    await tx.store.put(r);
    if (!skipCloud) {
      pushToCloud("notifications", r);
    }
  }));
  await tx.done;
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
