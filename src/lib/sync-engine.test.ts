/**
 * Sync engine unit tests — run with: node --experimental-strip-types src/lib/sync-engine.test.ts
 * (or npx tsx src/lib/sync-engine.test.ts)
 */
import { incomingIsNewer, libraryIdToUserId } from "./sync-utils.ts";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("FAIL:", msg);
  }
}

// LWW: newer timestamp wins
assert(incomingIsNewer("2026-06-20T12:00:00Z", "2026-06-19T12:00:00Z"), "cloud newer should win");
assert(!incomingIsNewer("2026-06-19T12:00:00Z", "2026-06-20T12:00:00Z"), "stale cloud should lose");
assert(incomingIsNewer("2026-06-20T12:00:00Z", undefined), "new record should win over missing local");
assert(!incomingIsNewer(undefined, "2026-06-20T12:00:00Z"), "missing cloud timestamp should not overwrite");

// libraryId mapping
assert(libraryIdToUserId("lib_abc123") === "abc123", "lib_ prefix stripped");
assert(libraryIdToUserId("abc123") === "abc123", "plain uid unchanged");

console.log(`\nSync tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
