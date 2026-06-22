/**
 * Role permission tests — run: npx tsx src/lib/roles.test.ts
 */
import {
  ROLES,
  canAccessLibrary,
  canAccessSuperAdminFeatures,
  isSuperAdminRole,
  normalizeRole,
} from "./roles.ts";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error("FAIL:", msg);
  }
}

assert(isSuperAdminRole(ROLES.SUPERADMIN), "superadmin role recognized");
assert(!isSuperAdminRole(ROLES.ADMIN), "admin is not superadmin");
assert(canAccessSuperAdminFeatures(ROLES.SUPERADMIN), "superadmin has admin features");
assert(!canAccessSuperAdminFeatures(ROLES.ADMIN), "admin lacks superadmin features");
assert(canAccessLibrary(ROLES.ADMIN), "admin can access library");
assert(!canAccessLibrary(ROLES.ADMIN, true), "disabled admin blocked");
assert(normalizeRole("superadmin") === ROLES.SUPERADMIN, "normalize superadmin");
assert(normalizeRole("invalid") === ROLES.ADMIN, "invalid role defaults to admin");

console.log(`\nRole tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
