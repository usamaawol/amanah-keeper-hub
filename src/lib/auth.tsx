import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "./types";
import { getSettings, saveSettings } from "./settings";
import { logAudit } from "./audit";

const USER_KEY = "amanah-user";
const LIBNAMES_KEY = "amanah-libnames";

export const SUPER_ADMIN_EMAIL =
  (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined)?.toLowerCase() ||
  "usamaawol0@gmail.com";

export function isSuperAdmin(user: AppUser | null): boolean {
  return !!user && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

export class AccountExistsError extends Error {
  constructor() {
    super("account-exists");
    this.name = "AccountExistsError";
  }
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signUpWithEmail: (email: string, password: string, libraryName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateAccount: (changes: { displayName?: string; libraryName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(user: AppUser | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function libraryIdFor(uid: string) {
  return `lib_${uid}`;
}

function readLibNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LIBNAMES_KEY) || "{}");
  } catch {
    return {};
  }
}
function storeLibName(uid: string, name: string) {
  if (typeof window === "undefined" || !name) return;
  const map = readLibNames();
  map[uid] = name;
  localStorage.setItem(LIBNAMES_KEY, JSON.stringify(map));
}
function getStoredLibName(uid: string): string | null {
  return readLibNames()[uid] ?? null;
}

async function getFirebaseAuth(configJson: string) {
  const config = JSON.parse(configJson);
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return getAuth(app);
}

function userFromFirebase(
  fu: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; emailVerified: boolean },
  libraryName: string,
): AppUser {
  return {
    uid: fu.uid,
    email: fu.email ?? "",
    displayName: fu.displayName ?? fu.email ?? "Librarian",
    photoURL: fu.photoURL ?? null,
    role: "admin",
    libraryId: libraryIdFor(fu.uid),
    libraryName,
    emailVerified: fu.emailVerified,
  };
}

function demoUid(seed: string) {
  let uid = localStorage.getItem("amanah-demo-uid-" + seed);
  if (!uid) {
    uid = "demo_" + seed + "_" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("amanah-demo-uid-" + seed, uid);
  }
  return uid;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Step 1: Restore session from localStorage immediately ───────────────
    // This works fully offline. The user stays logged in until they click
    // Sign Out — page reloads, browser restarts, and offline use all keep
    // the session alive.
    let restored: AppUser | null = null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        restored = JSON.parse(raw) as AppUser;
        setUser(restored);
      }
    } catch { /* ignore */ }

    // Always unblock the UI after reading localStorage — no need to wait for Firebase.
    setLoading(false);

    // ── Step 2: Optional Firebase auth state listener ───────────────────────
    // Used ONLY to refresh display name / photo when online.
    // Firebase is NEVER allowed to sign the user out automatically.
    // If Firebase reports no user, we ignore it — localStorage wins.
    const { firebaseConfig } = getSettings();
    if (!firebaseConfig.trim()) return;

    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { onAuthStateChanged } = await import("firebase/auth");
        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          if (!fbUser) return; // Never auto-logout — localStorage session wins
          const storedName = getStoredLibName(fbUser.uid);
          const libraryName =
            storedName ||
            (fbUser.displayName ? `${fbUser.displayName}'s Library` : "My Library");
          const refreshed = userFromFirebase(fbUser, libraryName);
          setUser(refreshed);
          persist(refreshed);
        });
      } catch {
        // Firebase unavailable (offline / misconfigured) — localStorage session still works
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback((next: AppUser) => {
    if (next.libraryName) {
      storeLibName(next.uid, next.libraryName);
      saveSettings({ libraryName: next.libraryName });
    }
    setUser(next);
    persist(next);
    logAudit(next.uid, "login");
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, libraryName: string) => {
      const name = libraryName.trim() || `${email.split("@")[0]}'s Library`;
      const { firebaseConfig } = getSettings();
      if (firebaseConfig.trim()) {
        try {
          const auth = await getFirebaseAuth(firebaseConfig);
          const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import("firebase/auth");
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          try { await updateProfile(cred.user, { displayName: name }); } catch { /* ignore */ }
          try { await sendEmailVerification(cred.user); } catch { /* ignore */ }
          finish(userFromFirebase(cred.user, name));
          return;
        } catch (e) {
          const code = (e as { code?: string })?.code;
          if (code === "auth/email-already-in-use") throw new AccountExistsError();
          console.error("Firebase sign-up failed, using offline account", e);
        }
      }
      const uid = demoUid(email.toLowerCase());
      if (getStoredLibName(uid)) throw new AccountExistsError();
      finish({ uid, email, displayName: name, photoURL: null, role: "admin", libraryId: libraryIdFor(uid), libraryName: name, emailVerified: true });
    },
    [finish],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { firebaseConfig } = getSettings();
      if (firebaseConfig.trim()) {
        try {
          const auth = await getFirebaseAuth(firebaseConfig);
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const name = getStoredLibName(cred.user.uid) || cred.user.displayName || `${email.split("@")[0]}'s Library`;
          finish(userFromFirebase(cred.user, name));
          return;
        } catch (e) {
          console.error("Firebase sign-in failed, using offline account", e);
        }
      }
      const uid = demoUid(email.toLowerCase());
      const name = getStoredLibName(uid) || `${email.split("@")[0]}'s Library`;
      finish({ uid, email, displayName: name, photoURL: null, role: "admin", libraryId: libraryIdFor(uid), libraryName: name, emailVerified: true });
    },
    [finish],
  );

  const signInWithGoogle = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim()) {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { GoogleAuthProvider, signInWithPopup, signOut: fbSignOut } = await import("firebase/auth");

        // Clear any cached Firebase session so Google always shows the account picker
        try { await fbSignOut(auth); } catch { /* ignore */ }

        const provider = new GoogleAuthProvider();
        // Always show the account chooser — even when one account is already signed in
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("email");
        provider.addScope("profile");

        const cred = await signInWithPopup(auth, provider);
        const name =
          getStoredLibName(cred.user.uid) ||
          (cred.user.displayName ? `${cred.user.displayName}'s Library` : "My Library");
        const next = userFromFirebase(cred.user, name);
        saveSettings({ userDisplayName: next.displayName, userEmail: next.email, userPhotoURL: next.photoURL ?? "" });
        finish(next);
        return;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        // User dismissed the picker — not an error
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
        console.error("Firebase Google sign-in failed, using offline account", e);
      }
    }
    // Offline / demo fallback
    const uid = demoUid("google");
    const name = getStoredLibName(uid) || "My Library";
    finish({ uid, email: "librarian@amanah.demo", displayName: "Demo Librarian", photoURL: null, role: "admin", libraryId: libraryIdFor(uid), libraryName: name, emailVerified: true });
  }, [finish]);

  const resendVerificationEmail = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim() && user) {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { sendEmailVerification } = await import("firebase/auth");
        const currentUser = auth.currentUser;
        if (currentUser) {
          await sendEmailVerification(currentUser);
        }
      } catch (e) {
        console.error("Failed to resend verification email", e);
      }
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim() && user) {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          const name = getStoredLibName(currentUser.uid) || currentUser.displayName || `${currentUser.email?.split("@")[0]}'s Library`;
          const refreshed = userFromFirebase(currentUser, name);
          setUser(refreshed);
          persist(refreshed);
        }
      } catch (e) {
        console.error("Failed to refresh user", e);
      }
    }
  }, [user]);

  const updateAccount = useCallback(
    async (changes: { displayName?: string; libraryName?: string }) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next: AppUser = {
          ...prev,
          displayName: changes.displayName?.trim() || prev.displayName,
          libraryName: changes.libraryName?.trim() || prev.libraryName,
        };
        persist(next);
        if (next.libraryName) storeLibName(next.uid, next.libraryName);
        saveSettings({ libraryName: next.libraryName ?? "", userDisplayName: next.displayName });
        return next;
      });
      const { firebaseConfig } = getSettings();
      if (changes.displayName?.trim() && firebaseConfig.trim()) {
        try {
          const { getAuth, updateProfile } = await import("firebase/auth");
          const current = getAuth().currentUser;
          if (current) await updateProfile(current, { displayName: changes.displayName.trim() });
        } catch (e) {
          console.error("Failed to update Firebase display name", e);
        }
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (user?.uid) logAudit(user.uid, "logout");
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim()) {
      try {
        const { getAuth, signOut: fbSignOut } = await import("firebase/auth");
        await fbSignOut(getAuth());
      } catch { /* ignore */ }
    }
    setUser(null);
    persist(null);
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, isSuperAdmin: isSuperAdmin(user), signUpWithEmail, signInWithEmail, signInWithGoogle, updateAccount, signOut, resendVerificationEmail, refreshUser }),
    [user, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, updateAccount, signOut, resendVerificationEmail, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
