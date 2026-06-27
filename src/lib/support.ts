import { getSettings } from "./settings";

export type SupportCategory = "report" | "idea" | "question" | "other";

export interface SupportMessage {
  id: string;
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
  fromUid: string | null;
  libraryName: string | null;
  status: "open" | "resolved";
  createdAt: string; // ISO datetime
  syncedAt: string | null; // null if not synced yet
}

const LOCAL_KEY = "amanah-support-messages";

function localList(): SupportMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function localSave(list: SupportMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function getFirestore(configJson: string) {
  const config = JSON.parse(configJson);
  const { initializeApp, getApps } = await import("firebase/app");
  const { getFirestore } = await import("firebase/firestore");
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return getFirestore(app);
}

/** 
 * Send a support message. 
 * High priority: deliver to Firestore support_messages collection.
 * Superadmins watch this collection in their Support Inbox.
 */
export async function sendSupportMessage(
  input: Omit<SupportMessage, "id" | "createdAt" | "status" | "syncedAt">,
): Promise<void> {
  const msg: SupportMessage = {
    ...input,
    id: newId(),
    status: "open",
    createdAt: new Date().toISOString(),
    syncedAt: null, // Mark as not synced initially
  };

  // Local backup for offline/fallback - first priority!
  const list = localList();
  list.unshift(msg);
  localSave(list);

  // Try to sync immediately in the background (don't await!)
  syncPendingSupportMessages().catch((e) => {
    // Don't let sync errors break the user experience!
    console.warn("[Support] Background sync failed, will try again later", e);
  });
}

/**
 * Sync all pending (unsynced) support messages to Firestore.
 * Called automatically when online, or manually if needed.
 */
export async function syncPendingSupportMessages(): Promise<void> {
  const { firebaseConfig } = getSettings();
  if (!firebaseConfig.trim()) return;

  const list = localList();
  const pending = list.filter((m) => !m.syncedAt);
  if (pending.length === 0) return;

  try {
    const db = await getFirestore(firebaseConfig);
    const { collection, doc, setDoc, serverTimestamp } = await import("firebase/firestore");

    // Sync each pending message
    for (const msg of pending) {
      await setDoc(doc(collection(db, "support_messages"), msg.id), {
        ...msg,
        syncedAt: serverTimestamp(),
      });

      // Mark as synced locally
      const updatedList = localList().map((m) =>
        m.id === msg.id ? { ...m, syncedAt: new Date().toISOString() } : m
      );
      localSave(updatedList);
    }

    console.log(`[Support] Synced ${pending.length} pending messages to Firestore`);
  } catch (e) {
    console.error("[Support] Failed to sync pending messages to Firestore", e);
  }
}

/** Read all support messages (super-admin only). Merges cloud + local. */
export async function getSupportMessages(): Promise<SupportMessage[]> {
  const local = localList();
  const { firebaseConfig } = getSettings();
  if (firebaseConfig.trim()) {
    try {
      const db = await getFirestore(firebaseConfig);
      const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
      const snap = await getDocs(query(collection(db, "support_messages"), orderBy("createdAt", "desc")));
      const cloud = snap.docs.map((d) => d.data() as SupportMessage);
      const byId = new Map<string, SupportMessage>();
      for (const m of [...cloud, ...local]) byId.set(m.id, m);
      return Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch (e) {
      console.error("Failed to load cloud support messages", e);
    }
  }
  return local;
}

export async function setSupportStatus(id: string, status: SupportMessage["status"]): Promise<void> {
  const list = localList().map((m) => (m.id === id ? { ...m, status } : m));
  localSave(list);

  const { firebaseConfig } = getSettings();
  if (firebaseConfig.trim()) {
    try {
      const db = await getFirestore(firebaseConfig);
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "support_messages", id), { status });
    } catch (e) {
      console.error("Failed to update support message status", e);
    }
  }
}
