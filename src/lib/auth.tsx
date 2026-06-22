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
import {
  pushAllToCloud,
  pushUserProfileToCloud,
  stopRealtimeSync,
} from "./sync-client";
import {
  canAccessLibrary,
  canAccessSuperAdminFeatures,
  DEFAULT_LIBRARY_ROLE,
  normalizeRole,
  ROLES,
  type UserRole,
} from "./roles";
import {
  ensureUserProfile,
  fetchUserProfile,
  type FirestoreUserProfile,
} from "./user-profile";

const USER_KEY = "amanah-user";
const LIBNAMES_KEY = "amanah-libnames";
const DEBUG = import.meta.env.DEV;

export class AccountExistsError extends Error {
  constructor() {
    super("account-exists");
    this.name = "AccountExistsError";
  }
}

interface AuthContextValue {
  user: AppUser | null;
  /** True until Firebase auth + Firestore profile have been resolved. */
  loading: boolean;
  /** True once Firestore users/{uid} has been read (or offline fallback applied). */
  profileLoaded: boolean;
  /** True when Firestore role === superadmin (never from email). */
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

/** Normalize legacy or partial sessions restored from localStorage. */
function normalizeStoredUser(raw: Partial<AppUser> & { uid?: string }): AppUser | null {
  if (!raw.uid) return null;
  return {
    uid: raw.uid,
    email: raw.email ?? "",
    displayName: raw.displayName?.trim() || raw.email?.split("@")[0] || "Librarian",
    photoURL: raw.photoURL ?? null,
    role: normalizeRole(raw.role),
    disabled: !!raw.disabled,
    libraryId: raw.libraryId ?? libraryIdFor(raw.uid),
    libraryName: raw.libraryName ?? getStoredLibName(raw.uid) ?? "My Library",
    emailVerified: raw.emailVerified ?? true,
  };
}

async function getFirebaseAuth(configJson: string) {
  const config = JSON.parse(configJson);
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return getAuth(app);
}

function appUserFromProfile(
  fu: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
  },
  profile: Pick<FirestoreUserProfile, "libraryName" | "role" | "disabled">,
): AppUser {
  return {
    uid: fu.uid,
    email: fu.email ?? "",
    displayName: fu.displayName ?? fu.email ?? "Librarian",
    photoURL: fu.photoURL ?? null,
    role: profile.role,
    disabled: profile.disabled,
    libraryId: libraryIdFor(fu.uid),
    libraryName: profile.libraryName,
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

function logProfileDebug(uid: string, profile: FirestoreUserProfile | null) {
  if (!DEBUG) return;
  console.log("Firebase UID:", uid);
  console.log("Firestore User:", profile);
  console.log("Role:", profile?.role ?? "(none)");
  console.log("Disabled:", profile?.disabled ?? false);
}

/**
 * Read Firestore users/{uid} — never guess role from Firebase Auth.
 * Creates a profile only when the document does not exist yet.
 */
async function resolveProfile(
  uid: string,
  email: string,
  displayName: string | undefined,
  libraryName: string,
): Promise<{ libraryName: string; role: UserRole; disabled?: boolean }> {
  const { firebaseConfig } = getSettings();
  if (!firebaseConfig.trim()) {
    return { libraryName, role: DEFAULT_LIBRARY_ROLE, disabled: false };
  }

  try {
    const profile = await fetchUserProfile(uid);
    logProfileDebug(uid, profile);

    if (profile) {
      return {
        libraryName: profile.libraryName || libraryName,
        role: profile.role,
        disabled: profile.disabled,
      };
    }

    // If profile doesn't exist, we try to create it. 
    // This is where a new user gets their initial role.
    const newProfile = await ensureUserProfile({ uid, email, displayName, libraryName });
    logProfileDebug(uid, newProfile);
    return {
      libraryName: newProfile.libraryName,
      role: newProfile.role,
      disabled: newProfile.disabled,
    };
  } catch (e) {
    console.error("[Auth] resolveProfile failed:", e);
    // Fallback safely without throwing
    return { libraryName, role: DEFAULT_LIBRARY_ROLE, disabled: false };
  }
}

/** Hydrate AppUser from Firebase Auth + Firestore users/{uid}. */
async function hydrateFromFirebase(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}): Promise<AppUser | null> {
  const storedName = getStoredLibName(fbUser.uid);
  const libraryName =
    storedName ||
    (fbUser.displayName ? `${fbUser.displayName}'s Library` : "My Library");

  try {
    const profile = await resolveProfile(
      fbUser.uid,
      fbUser.email ?? "",
      fbUser.displayName ?? undefined,
      libraryName,
    );

    if (profile.disabled) return null;
    return appUserFromProfile(fbUser, profile);
  } catch (e) {
    // If resolveProfile fails (e.g. permission denied), we log and fallback to cached
    console.error("[Auth] hydrateFromFirebase failed:", e);
    // Try to get cached user first
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        const cached = normalizeStoredUser(JSON.parse(raw) as Partial<AppUser>);
        if (cached?.uid === fbUser.uid) {
          return cached;
        }
      }
    } catch { /* ignore */ }
    // Fallback safe
    return appUserFromProfile(fbUser, { 
      libraryName, 
      role: DEFAULT_LIBRARY_ROLE, 
      disabled: false 
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const applyUserUpdate = useCallback((next: AppUser | null) => {
    const normalized = next ? normalizeStoredUser(next) : null;
    setUser(normalized);
    persist(normalized);
  }, []);

  // Bootstrap: Firebase Auth → Firestore users/{uid} → global user state
  useEffect(() => {
    let cancelled = false;
    let unsubAuth: (() => void) | undefined;
    let timeoutId: number | undefined;

    const onAuthChanged = () => {
      try {
        const raw = localStorage.getItem(USER_KEY);
        if (raw) {
          const restored = normalizeStoredUser(JSON.parse(raw) as Partial<AppUser>);
          if (restored) setUser(restored);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("amanah-auth-changed", onAuthChanged);

    async function bootstrap() {
      const { firebaseConfig } = getSettings();

      // Offline / demo mode — no Firestore, use cached session only
      if (!firebaseConfig.trim()) {
        try {
          const raw = localStorage.getItem(USER_KEY);
          if (raw) {
            const restored = normalizeStoredUser(JSON.parse(raw) as Partial<AppUser>);
            if (restored && !cancelled) setUser(restored);
          }
        } catch { /* ignore */ }
        if (!cancelled) {
          setProfileLoaded(true);
          setLoading(false);
        }
        return;
      }

      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { onAuthStateChanged } = await import("firebase/auth");

        unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
          if (cancelled) return;

          if (!fbUser) {
            setUser(null);
            persist(null);
            setProfileLoaded(true);
            setLoading(false);
            return;
          }

          setLoading(true);
          setProfileLoaded(false);

          try {
            if (DEBUG) console.log("Firebase UID:", fbUser.uid);
            const next = await hydrateFromFirebase(fbUser);
            if (next) {
              applyUserUpdate(next);
            } else {
              setUser(null);
              persist(null);
            }
          } catch (e) {
            console.error("[Auth] Firestore profile load failed:", e);
            // If it's a permission error or similar, fallback to cached user
            try {
              const raw = localStorage.getItem(USER_KEY);
              if (raw) {
                const cached = normalizeStoredUser(JSON.parse(raw) as Partial<AppUser>);
                if (cached?.uid === fbUser.uid) {
                  setUser(cached);
                  if (DEBUG) console.log("[Auth] Fallback to cached user:", cached.uid);
                }
              }
            } catch { /* ignore */ }
          } finally {
            if (!cancelled) {
              setProfileLoaded(true);
              setLoading(false);
            }
          }
        });
      } catch (e) {
        console.error("[Auth] Firebase init failed:", e);
        try {
          const raw = localStorage.getItem(USER_KEY);
          if (raw) {
            const restored = normalizeStoredUser(JSON.parse(raw) as Partial<AppUser>);
            if (restored && !cancelled) setUser(restored);
          }
        } catch { /* ignore */ }
        if (!cancelled) {
          setProfileLoaded(true);
          setLoading(false);
        }
      }
    }

    // Add a timeout to prevent hanging indefinitely
    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("[Auth] Bootstrap timeout — stopping loading state");
        setLoading(false);
        setProfileLoaded(true);
      }
    }, 10000); // 10 second timeout

    void bootstrap();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unsubAuth?.();
      window.removeEventListener("amanah-auth-changed", onAuthChanged);
    };
  }, [applyUserUpdate]);

  const finish = useCallback(async (next: AppUser) => {
    if (next.disabled || !canAccessLibrary(next.role, next.disabled)) {
      throw new Error("account-disabled");
    }
    if (next.libraryName) {
      storeLibName(next.uid, next.libraryName);
      saveSettings({ libraryName: next.libraryName });
    }
    applyUserUpdate(next);
    setProfileLoaded(true);
    logAudit(next.uid, "login");

    if (next.uid && next.libraryName) {
      const s = getSettings();
      void pushUserProfileToCloud(next.uid, next.libraryName, {
        language: s.language,
        theme: s.theme,
        displayName: next.displayName,
      });
    }
    if (next.libraryId && next.uid) {
      void pushAllToCloud(next.libraryId, next.uid);
    }
  }, [applyUserUpdate]);

  const buildUser = useCallback(
    async (
      fu: {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        emailVerified: boolean;
      },
      libraryName: string,
    ): Promise<AppUser> => {
      // Show loading state while building user (for sign-in/up flows)
      setLoading(true);
      setProfileLoaded(false);
      try {
        const profile = await resolveProfile(
          fu.uid,
          fu.email ?? "",
          fu.displayName ?? undefined,
          libraryName,
        );
        return appUserFromProfile(fu, profile);
      } finally {
        setProfileLoaded(true);
        setLoading(false);
      }
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, libraryName: string) => {
      const name = libraryName.trim() || `${email.split("@")[0]}'s Library`;
      const { firebaseConfig } = getSettings();
      if (firebaseConfig.trim()) {
        try {
          const auth = await getFirebaseAuth(firebaseConfig);
          const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } =
            await import("firebase/auth");
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          try { await updateProfile(cred.user, { displayName: name }); } catch { /* ignore */ }
          try { await sendEmailVerification(cred.user); } catch { /* ignore */ }
          const next = await buildUser(cred.user, name);
          await finish(next);
          return;
        } catch (e) {
          const code = (e as { code?: string })?.code;
          if (code === "auth/email-already-in-use") throw new AccountExistsError();
          console.error("Firebase sign-up failed, using offline account", e);
        }
      }
      const uid = demoUid(email.toLowerCase());
      if (getStoredLibName(uid)) throw new AccountExistsError();
      await finish({
        uid,
        email,
        displayName: name,
        photoURL: null,
        role: DEFAULT_LIBRARY_ROLE,
        libraryId: libraryIdFor(uid),
        libraryName: name,
        emailVerified: true,
      });
    },
    [finish, buildUser],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { firebaseConfig } = getSettings();
      if (firebaseConfig.trim()) {
        try {
          const auth = await getFirebaseAuth(firebaseConfig);
          const { signInWithEmailAndPassword } = await import("firebase/auth");
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const name =
            getStoredLibName(cred.user.uid) ||
            cred.user.displayName ||
            `${email.split("@")[0]}'s Library`;
          const next = await buildUser(cred.user, name);
          if (next.disabled) throw new Error("account-disabled");
          saveSettings({ libraryName: next.libraryName ?? name });
          await finish(next);
          return;
        } catch (e) {
          if ((e as Error).message === "account-disabled") throw e;
          console.error("Firebase sign-in failed, using offline account", e);
        }
      }
      const uid = demoUid(email.toLowerCase());
      const name = getStoredLibName(uid) || `${email.split("@")[0]}'s Library`;
      await finish({
        uid,
        email,
        displayName: name,
        photoURL: null,
        role: DEFAULT_LIBRARY_ROLE,
        libraryId: libraryIdFor(uid),
        libraryName: name,
        emailVerified: true,
      });
    },
    [finish, buildUser],
  );

  const signInWithGoogle = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim()) {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { GoogleAuthProvider, signInWithPopup, signOut: fbSignOut } =
          await import("firebase/auth");
        try { await fbSignOut(auth); } catch { /* ignore */ }
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("email");
        provider.addScope("profile");
        const cred = await signInWithPopup(auth, provider);
        const name =
          getStoredLibName(cred.user.uid) ||
          (cred.user.displayName ? `${cred.user.displayName}'s Library` : "My Library");
        const next = await buildUser(cred.user, name);
        if (next.disabled) throw new Error("account-disabled");
        saveSettings({
          libraryName: next.libraryName ?? name,
          userDisplayName: next.displayName,
          userEmail: next.email,
          userPhotoURL: next.photoURL ?? "",
        });
        await finish(next);
        return;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
        if ((e as Error).message === "account-disabled") throw e;
        console.error("Firebase Google sign-in failed, using offline account", e);
      }
    }
    const uid = demoUid("google");
    const name = getStoredLibName(uid) || "My Library";
    await finish({
      uid,
      email: "librarian@amanah.demo",
      displayName: "Demo Librarian",
      photoURL: null,
      role: DEFAULT_LIBRARY_ROLE,
      libraryId: libraryIdFor(uid),
      libraryName: name,
      emailVerified: true,
    });
  }, [finish, buildUser]);

  const resendVerificationEmail = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim() && user) {
      try {
        const auth = await getFirebaseAuth(firebaseConfig);
        const { sendEmailVerification } = await import("firebase/auth");
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      } catch (e) {
        console.error("Failed to resend verification email", e);
      }
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    const { firebaseConfig } = getSettings();
    if (!firebaseConfig.trim() || !user) return;
    try {
      const auth = await getFirebaseAuth(firebaseConfig);
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      await currentUser.reload();
      const next = await hydrateFromFirebase(currentUser);
      if (next) applyUserUpdate(next);
    } catch (e) {
      console.error("Failed to refresh user", e);
    }
  }, [user, applyUserUpdate]);

  const updateAccount = useCallback(
    async (changes: { displayName?: string; libraryName?: string }) => {
      let updatedUser: AppUser | null = null;
      setUser((prev) => {
        if (!prev) return prev;
        const next: AppUser = {
          ...prev,
          displayName: changes.displayName?.trim() || prev.displayName,
          libraryName: changes.libraryName?.trim() || prev.libraryName,
        };
        updatedUser = next;
        persist(next);
        if (next.libraryName) storeLibName(next.uid, next.libraryName);
        saveSettings({ libraryName: next.libraryName ?? "", userDisplayName: next.displayName });
        return next;
      });

      if (updatedUser) {
        const s = getSettings();
        void pushUserProfileToCloud(
          (updatedUser as AppUser).uid,
          (updatedUser as AppUser).libraryName || "",
          {
            language: s.language,
            theme: s.theme,
            displayName: (updatedUser as AppUser).displayName,
          },
        );
      }

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
    void stopRealtimeSync();
    const { firebaseConfig } = getSettings();
    if (firebaseConfig.trim()) {
      try {
        const { getAuth, signOut: fbSignOut } = await import("firebase/auth");
        await fbSignOut(getAuth());
      } catch { /* ignore */ }
    }
    applyUserUpdate(null);
    setProfileLoaded(true);
    setLoading(false);
  }, [user, applyUserUpdate]);

  const isSuperAdmin = canAccessSuperAdminFeatures(user?.role, user?.disabled);

  const value = useMemo(
    () => ({
      user,
      loading,
      profileLoaded,
      isSuperAdmin,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      updateAccount,
      signOut,
      resendVerificationEmail,
      refreshUser,
    }),
    [
      user,
      loading,
      profileLoaded,
      isSuperAdmin,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      updateAccount,
      signOut,
      resendVerificationEmail,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** @deprecated Use useAuth().isSuperAdmin — role comes from Firestore, not email. */
export function isSuperAdmin(user: AppUser | null): boolean {
  return canAccessSuperAdminFeatures(user?.role, user?.disabled);
}

export { ROLES };
