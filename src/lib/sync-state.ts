/**
 * Lightweight sync status observable — no Firebase/IndexedDB imports.
 * Kept separate to avoid circular module dependencies.
 */
import { useEffect, useState } from "react";

export type SyncState = "offline" | "syncing" | "synced";

let _syncState: SyncState = "offline";
let _lastSyncedAt: string | null = null;
const _stateListeners = new Set<(s: SyncState) => void>();

export function setSyncState(s: SyncState) {
  if (_syncState === s) return;
  _syncState = s;
  _stateListeners.forEach((fn) => fn(s));
}

export function markSynced() {
  _lastSyncedAt = new Date().toISOString();
}

export function getLastSyncedAt(): string | null {
  return _lastSyncedAt;
}

export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(_syncState);
  useEffect(() => {
    setState(_syncState);
    _stateListeners.add(setState);
    return () => {
      _stateListeners.delete(setState);
    };
  }, []);
  return state;
}
