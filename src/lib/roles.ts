/**
 * Role-based access control — single source of truth is Firestore users/{uid}.role.
 * Never derive permissions from email addresses.
 */

/** All supported roles. Add new roles here only — app logic uses helpers below. */
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  LIBRARIAN: "librarian",
  ASSISTANT: "assistant",
  USER: "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/** Default role assigned on first sign-up when no Firestore profile exists. */
export const DEFAULT_LIBRARY_ROLE: UserRole = ROLES.ADMIN;

/** Roles that may use the library app (dashboard, borrow, etc.). */
export const LIBRARY_ACCESS_ROLES: readonly UserRole[] = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.LIBRARIAN,
  ROLES.ASSISTANT,
  ROLES.USER,
];

/** Roles assignable by a user on their own profile (never includes superadmin). */
export const SELF_ASSIGNABLE_ROLES: readonly UserRole[] = [
  ROLES.ADMIN,
  ROLES.LIBRARIAN,
  ROLES.ASSISTANT,
  ROLES.USER,
];

/** Roles a superadmin may assign to any user. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.LIBRARIAN,
  ROLES.ASSISTANT,
  ROLES.USER,
];

export function normalizeRole(value: unknown): UserRole {
  if (typeof value === "string" && ASSIGNABLE_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return DEFAULT_LIBRARY_ROLE;
}

export function isSuperAdminRole(role: UserRole | undefined | null): boolean {
  return role === ROLES.SUPERADMIN;
}

export function canAccessLibrary(role: UserRole | undefined | null, disabled?: boolean): boolean {
  if (disabled) return false;
  return !!role && LIBRARY_ACCESS_ROLES.includes(role);
}

export function canAccessSuperAdminFeatures(role: UserRole | undefined | null, disabled?: boolean): boolean {
  return !disabled && isSuperAdminRole(role);
}
