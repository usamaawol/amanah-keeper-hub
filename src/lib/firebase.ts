import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore";
import { getSettings } from "./settings";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let persistenceEnabled = false;

export function getFirebase() {
  const { firebaseConfig } = getSettings();
  if (!firebaseConfig || !firebaseConfig.trim()) {
    return { app: null, auth: null, db: null };
  }

  try {
    if (firebaseApp && getApps().length > 0) {
      return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
    }

    const config = JSON.parse(firebaseConfig);
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);

    // Enable Firestore offline persistence once per session.
    // This lets the Firestore SDK itself cache and queue writes when offline,
    // complementing our own IndexedDB pending-sync queue.
    if (!persistenceEnabled && typeof window !== "undefined") {
      persistenceEnabled = true;
      enableIndexedDbPersistence(firestoreDb).catch((err: { code?: string }) => {
        if (err.code === "failed-precondition") {
          // Multiple tabs open — persistence only works in one tab at a time.
          // Acceptable trade-off; our own pendingSyncs queue still works.
          console.warn("[Firebase] Offline persistence unavailable (multiple tabs).");
        } else if (err.code === "unimplemented") {
          // Browser doesn't support IndexedDB persistence (very rare).
          console.warn("[Firebase] Offline persistence not supported in this browser.");
        }
      });
    }

    return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  } catch (e) {
    console.error("Failed to initialize Firebase:", e);
    return { app: null, auth: null, db: null };
  }
}
