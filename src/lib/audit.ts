// Audit logging — local-first with multi-device cloud sync.
// Stored in localStorage offline; mirrored to users/{uid}/auditLogs/{id}.

export type AuditAction =
  | "login"
  | "logout"
  | "borrow_create"
  | "record_update"
  | "record_return"
  | "record_undo_return"
  | "reservation_create"
  | "ai_usage"
  | "record_delete";

export interface AuditEntry {
  id: string;
  userId: string;
  action: AuditAction;
  timestamp: string; // ISO
}

const KEY = "amanah-audit-log";
const MAX = 1000;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

function saveAudit(list: AuditEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

/** Merge remote audit entries (LWW by id — append-only, dedupe by id). */
export function mergeAuditEntries(remote: AuditEntry[]) {
  if (typeof window === "undefined" || remote.length === 0) return;
  const local = loadAudit();
  const map = new Map(local.map((e) => [e.id, e]));
  for (const r of remote) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  const merged = Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  saveAudit(merged);
}

export function logAudit(userId: string, action: AuditAction) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const entry: AuditEntry = { id: uid(), userId, action, timestamp: new Date().toISOString() };
    const list = loadAudit();
    list.unshift(entry);
    saveAudit(list);
    void import("./cloud-push")
      .then((m) => m.pushAuditEntry(userId, entry))
      .catch(() => {});
  } catch {
    /* ignore */
  }
}
