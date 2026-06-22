/**
 * Firestore user profile — roles, library metadata, account status.
 * Authorization is enforced server-side in firestore.rules; this module
 * is the client-side read/write layer.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import {
  ASSIGNABLE_ROLES,
  DEFAULT_LIBRARY_ROLE,
  normalizeRole,
  type UserRole,
} from "./roles";
import { nowIso } from "./sync-utils";

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  libraryName: string;
  role: UserRole;
  disabled?: boolean;
  language?: string;
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  const { db } = getFirebase();
  if (!db || !uid) return null;
  try {
    if (import.meta.env.DEV) {
      console.log(`[UserProfile] Reading users/${uid}`);
    }
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      if (import.meta.env.DEV) {
        console.log(`[UserProfile] No document at users/${uid}`);
      }
      return null;
    }
    const data = snap.data();
    const profile: FirestoreUserProfile = {
      uid,
      email: (data.email as string) ?? "",
      displayName: data.displayName as string | undefined,
      libraryName: (data.libraryName as string) ?? "My Library",
      role: normalizeRole(data.role),
      disabled: !!data.disabled,
      language: data.language as string | undefined,
      theme: data.theme as string | undefined,
      createdAt: (data.createdAt as string) ?? nowIso(),
      updatedAt: (data.updatedAt as string) ?? nowIso(),
    };
    if (import.meta.env.DEV) {
      console.log("[UserProfile] Firestore User:", profile);
      console.log("[UserProfile] Role:", profile.role);
      console.log("[UserProfile] Disabled:", profile.disabled);
    }
    return profile;
  } catch (e) {
    console.error("[UserProfile] fetch failed:", e);
    const code = (e as { code?: string })?.code;
    if (code === "permission-denied") {
      console.error("[UserProfile] Missing or insufficient permissions — check Firestore rules and auth.uid match");
    }
    return null;
  }
}

/**
 * Ensure a Firestore profile exists. Never overwrites an existing role —
 * only superadmins may change roles (via updateUserRole).
 */
export async function ensureUserProfile(input: {
  uid: string;
  email: string;
  displayName?: string;
  libraryName: string;
}): Promise<FirestoreUserProfile> {
  const { db } = getFirebase();
  const now = nowIso();

  if (!db) {
    return {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName,
      libraryName: input.libraryName,
      role: DEFAULT_LIBRARY_ROLE,
      createdAt: now,
      updatedAt: now,
    };
  }

  const ref = doc(db, "users", input.uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const data = snap.data();
      const profile: FirestoreUserProfile = {
        uid: input.uid,
        email: input.email || (data.email as string) || "",
        displayName: input.displayName || (data.displayName as string),
        libraryName: input.libraryName || (data.libraryName as string) || "My Library",
        role: normalizeRole(data.role),
        disabled: !!data.disabled,
        language: data.language as string | undefined,
        theme: data.theme as string | undefined,
        createdAt: (data.createdAt as string) ?? now,
        updatedAt: now,
      };
      tx.set(
        ref,
        {
          email: profile.email,
          displayName: profile.displayName ?? null,
          libraryName: profile.libraryName,
          updatedAt: now,
        },
        { merge: true },
      );
      return profile;
    }

    const profile: FirestoreUserProfile = {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName,
      libraryName: input.libraryName,
      role: DEFAULT_LIBRARY_ROLE,
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };
    tx.set(ref, {
      ...profile,
      syncedAt: serverTimestamp(),
    });
    return profile;
  });
}

/** List all registered users — requires superadmin Firestore rules. */
export async function listAllUsers(): Promise<FirestoreUserProfile[]> {
  const { db } = getFirebase();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        email: (data.email as string) ?? "",
        displayName: data.displayName as string | undefined,
        libraryName: (data.libraryName as string) ?? "—",
        role: normalizeRole(data.role),
        disabled: !!data.disabled,
        createdAt: (data.createdAt as string) ?? "",
        updatedAt: (data.updatedAt as string) ?? "",
      };
    });
  } catch (e) {
    console.error("[UserProfile] listAllUsers failed:", e);
    return [];
  }
}

/** Superadmin only — enforced by Firestore rules. */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase unavailable");
  await setDoc(
    doc(db, "users", uid),
    { role, updatedAt: nowIso(), syncedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Superadmin only — disable/enable accounts without deleting data. */
export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  const { db } = getFirebase();
  if (!db) throw new Error("Firebase unavailable");
  await setDoc(
    doc(db, "users", uid),
    { disabled, updatedAt: nowIso(), syncedAt: serverTimestamp() },
    { merge: true },
  );
}
