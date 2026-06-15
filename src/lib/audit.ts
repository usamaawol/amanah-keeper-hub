// Lightweight audit logging. Stored locally (offline-friendly) and namespaced
// so the super-admin can review aggregated activity. In a full Firebase
// deployment these entries would also be written to an `auditLogs` collection.

export type AuditAction =
  | "login"
  | "logout"
  | "borrow_create"
  | "record_update"
  | "record_return"
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

export function logAudit(userId: string, action: AuditAction) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const list = loadAudit();
    list.unshift({ id: uid(), userId, action, timestamp: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function loadAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}
