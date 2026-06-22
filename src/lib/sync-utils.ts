/** Shared sync helpers — no React, Firebase, or IndexedDB imports. */

export function stripServerFields<T extends Record<string, unknown>>(data: T): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncedAt, ...rest } = data as Record<string, unknown>;
  return rest as T;
}

/** Last-Write-Wins: true when `incoming` should replace `existing`. */
export function incomingIsNewer(
  incomingUpdatedAt: string | undefined,
  existingUpdatedAt: string | undefined,
): boolean {
  if (!existingUpdatedAt) return true;
  if (!incomingUpdatedAt) return false;
  return incomingUpdatedAt > existingUpdatedAt;
}

export function libraryIdToUserId(libraryId: string): string {
  return libraryId.startsWith("lib_") ? libraryId.replace("lib_", "") : libraryId;
}

export function nowIso(): string {
  return new Date().toISOString();
}
