import type { BorrowRecord, Reservation, AppNotification, AppSettings } from "./types";
import { getFirebase } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getBorrows, putBorrow as putBorrowDB, getReservations, putReservation as putReservationDB, deleteReservation as deleteReservationDB, getNotifications, putNotification as putNotificationDB, putNotifications as putNotificationsDB } from "./db";
import { loadConversations, saveAllLocal as saveAllConversations } from "./conversations";

// Sync a single borrow record to Firestore
export async function pushToCloud(
  type: "borrows" | "reservations" | "notifications",
  record: BorrowRecord | Reservation | AppNotification
) {
  const { db } = getFirebase();
  if (!db) return;

  try {
    const userId = record.libraryId.startsWith("lib_") 
      ? record.libraryId.replace("lib_", "") 
      : record.libraryId;
    const docRef = doc(db, "users", userId, type, record.id);
    await setDoc(docRef, {
      ...record,
      syncedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to push to cloud", e);
  }
}

// Delete a record from Firestore
export async function deleteFromCloud(
  type: "borrows" | "reservations" | "notifications",
  id: string
) {
  const { db } = getFirebase();
  if (!db) return;

  try {
    // Note: To delete from nested path, we need libraryId/userId.
    // Since we don't have it here, we might need to pass it or change how delete works.
    // For now, let's look for the record in local DB to get libraryId.
    const userId = localStorage.getItem("amanah-user") 
      ? JSON.parse(localStorage.getItem("amanah-user")!).uid 
      : null;
    
    if (userId) {
      await deleteDoc(doc(db, "users", userId, type, id));
    } else {
      // Fallback to top-level if userId unknown (unlikely in authenticated state)
      await deleteDoc(doc(db, type, id));
    }
  } catch (e) {
    console.error("Failed to delete from cloud", e);
  }
}

// Sync all local data to Firestore
export async function pushAllToCloud(libraryId: string, userId: string) {
  const { db } = getFirebase();
  if (!db) return;

  try {
    const [borrows, reservations, notifications] = await Promise.all([
      getBorrows(libraryId),
      getReservations(libraryId),
      getNotifications(libraryId),
    ]);

    const conversations = loadConversations(userId);
    const batch = writeBatch(db);

    for (const b of borrows) {
      const ref = doc(db, "users", userId, "borrows", b.id);
      batch.set(ref, { ...b, syncedAt: serverTimestamp() });
    }

    for (const r of reservations) {
      const ref = doc(db, "users", userId, "reservations", r.id);
      batch.set(ref, { ...r, syncedAt: serverTimestamp() });
    }

    for (const n of notifications) {
      const ref = doc(db, "users", userId, "notifications", n.id);
      batch.set(ref, { ...n, syncedAt: serverTimestamp() });
    }

    for (const c of conversations) {
      const ref = doc(db, "aiConversations", c.id);
      batch.set(ref, { ...c, syncedAt: serverTimestamp() });
    }

    await batch.commit();
  } catch (e) {
    console.error("Failed to push all to cloud", e);
  }
}

// Pull data from Firestore and merge into local DB
export async function syncFromCloud(libraryId: string, userId: string) {
  const { db } = getFirebase();
  if (!db) return;

  try {
    // Pull borrows
    const borrowsQuery = query(collection(db, "users", userId, "borrows"));
    const borrowsSnapshot = await getDocs(borrowsQuery);
    for (const docSnap of borrowsSnapshot.docs) {
      const data = docSnap.data() as BorrowRecord;
      await putBorrowDB(data, true); // skipCloud to avoid loop
    }

    // Pull reservations
    const resQuery = query(collection(db, "users", userId, "reservations"));
    const resSnapshot = await getDocs(resQuery);
    for (const docSnap of resSnapshot.docs) {
      const data = docSnap.data() as Reservation;
      await putReservationDB(data, true);
    }

    // Pull notifications
    const notifQuery = query(collection(db, "users", userId, "notifications"));
    const notifSnapshot = await getDocs(notifQuery);
    const notifsFromCloud: AppNotification[] = [];
    for (const docSnap of notifSnapshot.docs) {
      const data = docSnap.data() as AppNotification;
      notifsFromCloud.push(data);
    }
    await putNotificationsDB(notifsFromCloud, true);

    // Pull conversations
    const convQuery = query(
      collection(db, "aiConversations"),
      where("userId", "==", userId)
    );
    const convSnapshot = await getDocs(convQuery);
    const convsFromCloud = convSnapshot.docs.map((d) => d.data() as any);
    if (convsFromCloud.length > 0) {
      saveAllConversations(userId, convsFromCloud);
    }
  } catch (e) {
    console.error("Failed to pull from cloud", e);
  }
}

// Push user profile to Firestore
export async function pushUserProfileToCloud(uid: string, libraryName: string, settings?: Partial<AppSettings>) {
  const { db } = getFirebase();
  if (!db) return;

  try {
    const docRef = doc(db, "users", uid);
    await setDoc(
      docRef,
      { 
        uid, 
        libraryName, 
        updatedAt: serverTimestamp(),
        ...(settings ? {
          openRouterKey: settings.openRouterKey,
          aiModel: settings.aiModel,
        } : {})
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Failed to push user profile", e);
  }
}

// Pull user profile from Firestore
export async function fetchUserProfileFromCloud(uid: string) {
  const { db } = getFirebase();
  if (!db) return null;

  try {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as { 
        uid: string; 
        libraryName: string; 
        openRouterKey?: string; 
        aiModel?: string; 
      };
    }
  } catch (e) {
    console.error("Failed to fetch user profile", e);
  }
  return null;
}
