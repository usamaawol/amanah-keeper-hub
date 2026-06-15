import type { AppSettings } from "./types";

const KEY = "amanah-settings";

// Environment-based Firebase configuration (preferred, never hardcoded).
// Set these in your deployment environment (.env / hosting provider):
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
//   VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
// Firebase web config. The apiKey here is a *publishable* client identifier
// (safe to ship in the bundle), not a private secret. Env vars override it.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDB2tX2qzaEJtkjsyfIILBOzJC00FA4mEg",
  authDomain: "library-abuanas.firebaseapp.com",
  projectId: "library-abuanas",
  storageBucket: "library-abuanas.firebasestorage.app",
  messagingSenderId: "154477973295",
  appId: "1:154477973295:web:33445c047af6e46182dbda",
  measurementId: "G-07QHZTBB7R",
};

function firebaseConfigFromEnv(): string {
  const env = import.meta.env;
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  if (cfg.apiKey && cfg.projectId) return JSON.stringify(cfg);
  return JSON.stringify(DEFAULT_FIREBASE_CONFIG);
}

const DEFAULTS: AppSettings = {
  libraryName: "",
  // OpenRouter key: set VITE_OPENROUTER_API_KEY in your deployment environment.
  // Users can also enter their own key in the app Settings page.
  openRouterKey: (import.meta.env.VITE_OPENROUTER_API_KEY as string) || "",
  aiModel: "openai/gpt-4o-mini",
  firebaseConfig: firebaseConfigFromEnv(),
  userDisplayName: "",
  userEmail: "",
  userPhotoURL: "",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const stored = JSON.parse(raw) as Partial<AppSettings>;
    // Fall back to env-based config when the stored value is empty.
    return {
      ...DEFAULTS,
      ...stored,
      firebaseConfig: stored.firebaseConfig?.trim() || DEFAULTS.firebaseConfig,
      openRouterKey: stored.openRouterKey?.trim() || DEFAULTS.openRouterKey,
    };
  } catch {
    return { ...DEFAULTS };
  }
}


export function saveSettings(s: Partial<AppSettings>) {
  if (typeof window === "undefined") return;
  const next = { ...getSettings(), ...s };
  localStorage.setItem(KEY, JSON.stringify(next));
}
