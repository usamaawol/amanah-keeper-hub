import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getSettings } from "./settings";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

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

    return { app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  } catch (e) {
    console.error("Failed to initialize Firebase:", e);
    return { app: null, auth: null, db: null };
  }
}
