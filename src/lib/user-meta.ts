/**
 * Per-user workspace metadata (history UI prefs, etc.) — synced across devices.
 * Stored locally in localStorage and mirrored to Firestore users/{uid}/meta/workspace.
 */
import { getFirebase } from "./firebase";
import { incomingIsNewer, nowIso } from "./sync-utils";

const LOCAL_KEY = "amanah-workspace-meta";

export interface WorkspaceMeta {
  historyHidden: string[];
  updatedAt: string;
}

const DEFAULT_META: WorkspaceMeta = {
  historyHidden: [],
  updatedAt: nowIso(),
};

function loadLocal(userId: string): WorkspaceMeta {
  if (typeof window === "undefined" || !userId) return { ...DEFAULT_META };
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}-${userId}`);
    if (!raw) {
      // Migrate legacy key
      const legacy = localStorage.getItem("amanah-history-hidden");
      if (legacy) {
        const historyHidden = JSON.parse(legacy) as string[];
        return { historyHidden, updatedAt: nowIso() };
      }
      return { ...DEFAULT_META };
    }
    return { ...DEFAULT_META, ...JSON.parse(raw) } as WorkspaceMeta;
  } catch {
    return { ...DEFAULT_META };
  }
}

function saveLocal(userId: string, meta: WorkspaceMeta) {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(`${LOCAL_KEY}-${userId}`, JSON.stringify(meta));
  // Keep legacy key in sync for older builds
  localStorage.setItem("amanah-history-hidden", JSON.stringify(meta.historyHidden));
  window.dispatchEvent(new CustomEvent("amanah-meta-changed", { detail: meta }));
}

export function getWorkspaceMeta(userId: string): WorkspaceMeta {
  return loadLocal(userId);
}

export function setHistoryHidden(userId: string, hidden: Set<string>) {
  const meta: WorkspaceMeta = {
    historyHidden: [...hidden],
    updatedAt: nowIso(),
  };
  saveLocal(userId, meta);
  scheduleMetaPush(userId, meta);
  return meta;
}

export function applyRemoteMeta(userId: string, remote: WorkspaceMeta): boolean {
  const local = loadLocal(userId);
  if (!incomingIsNewer(remote.updatedAt, local.updatedAt)) return false;
  saveLocal(userId, remote);
  return true;
}

function scheduleMetaPush(userId: string, meta: WorkspaceMeta) {
  if (typeof window === "undefined") return;
  void import("./cloud-push")
    .then((m) => m.pushWorkspaceMeta(userId, meta))
    .catch(() => {});
}
