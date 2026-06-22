/**
 * Lazy sync entry point — keeps Firestore/IndexedDB out of the initial module graph
 * so auth and layout components don't trigger circular-import React hook failures.
 */
export { useSyncStatus, getLastSyncedAt } from "./sync-state";
export type { SyncState } from "./sync-state";

type SyncModule = typeof import("./sync");

let syncModule: SyncModule | null = null;

async function loadSync(): Promise<SyncModule> {
  if (!syncModule) syncModule = await import("./sync");
  return syncModule;
}

export async function startRealtimeSync(
  ...args: Parameters<SyncModule["startRealtimeSync"]>
) {
  return (await loadSync()).startRealtimeSync(...args);
}

export async function stopRealtimeSync() {
  return (await loadSync()).stopRealtimeSync();
}

export async function runBackgroundSync(
  ...args: Parameters<SyncModule["runBackgroundSync"]>
) {
  return (await loadSync()).runBackgroundSync(...args);
}

export async function pushUserProfileToCloud(
  ...args: Parameters<SyncModule["pushUserProfileToCloud"]>
) {
  return (await loadSync()).pushUserProfileToCloud(...args);
}

export async function pushAllToCloud(
  ...args: Parameters<SyncModule["pushAllToCloud"]>
) {
  return (await loadSync()).pushAllToCloud(...args);
}
