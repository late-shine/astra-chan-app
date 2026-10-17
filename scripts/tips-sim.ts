/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase B1 check script: a standalone dev tool, NOT a UI feature. Exercises the pure logic
 * behind the guided-tour progress (`stats.tips`) in src/tips.ts: the grow-only union merge,
 * the sanitiser, and the `hasProgress` veteran test. It never touches the app, Firebase or
 * any data file. Exits with code 1 if any check fails.
 *
 * Run with: npx tsx scripts/tips-sim.ts   (from the project root)
 */

import { TIP_IDS, hasProgress, mergeTips, sanitizeTips } from "../src/tips";
import type { TipsState } from "../src/types";

// ─── tiny harness ────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else failures.push(`${name}${detail ? `  (${detail})` : ""}`);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** True when `undefined`, `false`, `null`, an empty object, or an empty `seen` appears anywhere. */
function notCloudSafe(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true;
  if (typeof value === "object") {
    const entries = Object.entries(value as object);
    if (entries.length === 0) return true;
    return entries.some(([, v]) => notCloudSafe(v));
  }
  return false;
}

const tips = (ids: string[], skipped = false): TipsState => {
  const seen: Record<string, true> = {};
  ids.forEach((id) => (seen[id] = true));
  return { ...(ids.length ? { seen } : {}), ...(skipped ? { skipped: true as const } : {}) };
};

// ─── merge: the named cases from the plan ────────────────────────────────────

check("local room, cloud missing → room", same(mergeTips(tips(["room"]), undefined), tips(["room"])));
check("cloud dock, local missing → dock", same(mergeTips(undefined, tips(["dock"])), tips(["dock"])));
check("different ids on each side → the union (tour order)",
  same(mergeTips(tips(["desk"]), tips(["room", "spell"])), tips(["room", "spell", "desk"])));
check("same ids on both sides → no duplicates", same(mergeTips(tips(["room", "dock"]), tips(["dock", "room"])), tips(["room", "dock"])));
check("skipped is OR (local only)", mergeTips(tips([], true), undefined)?.skipped === true);
check("skipped is OR (cloud only)", mergeTips(undefined, tips(["room"], true))?.skipped === true);
check("skipped OR with ids kept", same(mergeTips(tips(["room"]), tips([], true)), tips(["room"], true)));
check("neither skipped → no skipped field", !("skipped" in (mergeTips(tips(["room"]), tips(["dock"])) ?? {})));
check("a cloud copy can never turn seen back into unseen",
  mergeTips(tips(["room", "spell"]), tips([])) !== undefined && mergeTips(tips(["room", "spell"]), {})?.seen?.room === true);

// ─── merge: junk handling ────────────────────────────────────────────────────

const JUNK: unknown[] = [undefined, null, 0, 1, "", "room", true, false, [], ["room"], {}, { seen: null }, { seen: [] }, { seen: "room" },
  { seen: {} }, { seen: { room: false } }, { seen: { room: 1 } }, { seen: { room: "true" } }, { skipped: false }, { skipped: 1 }, { skipped: "true" },
  { seen: { bogus: true } }, { seen: { "a.b": true, "$x": true, "[y]": true, "a/b": true } }, () => 1, Symbol("x")];
JUNK.forEach((junk, i) => {
  check(`junk #${i} on both sides → undefined`, mergeTips(junk, junk) === undefined);
  check(`junk #${i} local + valid cloud → the valid side`, same(mergeTips(junk, tips(["spell"])), tips(["spell"])));
  check(`junk #${i} cloud + valid local → the valid side`, same(mergeTips(tips(["spell"], true), junk), tips(["spell"], true)));
  let threw = false;
  try { sanitizeTips(junk); mergeTips(junk, junk); } catch { threw = true; }
  check(`junk #${i} never throws`, !threw);
});
check("unknown ids are dropped, known ids kept", same(sanitizeTips({ seen: { room: true, bogus: true, dock: true }, skipped: true }), tips(["room", "dock"], true)));
check("an empty or false-valued seen with skipped keeps only skipped", same(sanitizeTips({ seen: { room: false }, skipped: true }), tips([], true)));
check("inherited properties are not read", sanitizeTips({ seen: Object.create({ room: true }) }) === undefined);
check("sanitize is idempotent on valid input", same(sanitizeTips(sanitizeTips(tips(["bookshelf", "room"], true))), tips(["room", "bookshelf"], true)));

// ─── merge: algebraic laws over every combination ────────────────────────────

const subsets: TipsState[] = [];
for (let mask = 0; mask < 1 << TIP_IDS.length; mask++) {
  const ids = TIP_IDS.filter((_, i) => mask & (1 << i));
  subsets.push(tips([...ids]), tips([...ids], true));
}
let lawsOk = { commutative: true, idempotent: true, associative: true, identity: true, safe: true, grows: true };
const missing: (TipsState | undefined)[] = [undefined];
for (const a of [...subsets, ...missing]) {
  if (!same(mergeTips(a, undefined), sanitizeTips(a))) lawsOk.identity = false;
  if (!same(mergeTips(a, a), sanitizeTips(a))) lawsOk.idempotent = false;
  for (const b of [...subsets, ...missing]) {
    const ab = mergeTips(a, b);
    if (!same(ab, mergeTips(b, a))) lawsOk.commutative = false;
    if (ab !== undefined && notCloudSafe(ab)) lawsOk.safe = false;
    for (const id of TIP_IDS) {
      if ((a?.seen?.[id] || b?.seen?.[id]) && ab?.seen?.[id] !== true) lawsOk.grows = false;
    }
    if (((a?.skipped || b?.skipped) ?? false) !== (ab?.skipped === true)) lawsOk.grows = false;
    for (const c of [...subsets, ...missing]) {
      if (!same(mergeTips(mergeTips(a, b), c), mergeTips(a, mergeTips(b, c)))) lawsOk.associative = false;
    }
  }
}
check("union is commutative (all pairs)", lawsOk.commutative);
check("union is idempotent (all inputs)", lawsOk.idempotent);
check("union is associative (all triples)", lawsOk.associative);
check("undefined is the identity", lawsOk.identity);
check("a merged result never loses a seen id or skipped", lawsOk.grows);
check("merge output never holds undefined, false, null or an empty object", lawsOk.safe);
check("nothing merged with nothing → undefined, not {}", mergeTips(undefined, undefined) === undefined && mergeTips({}, { seen: {} }) === undefined);

// ─── round-trips: JSON (blob, cloud, backup) and the App's composition ───────

const jsonRound = (value: unknown) => JSON.parse(JSON.stringify(value));
for (const t of subsets) {
  check(`JSON round-trip keeps ${JSON.stringify(t)}`, same(mergeTips(jsonRound(t), undefined), sanitizeTips(t)));
}

/** The same expression App.tsx uses on cloud hydrate. */
function hydrate(local: { tips?: unknown }, cloud: { tips?: unknown } | null): { tips?: TipsState } {
  const hydrated: { tips?: TipsState } = cloud ? { ...cloud } as { tips?: TipsState } : { ...local } as { tips?: TipsState };
  const merged = mergeTips(local.tips, cloud ? cloud.tips : undefined);
  if (merged) hydrated.tips = merged;
  else delete hydrated.tips;
  return hydrated;
}
check("hydrate: old cloud blob without tips keeps the local ids", same(hydrate({ tips: tips(["room"]) }, {}).tips, tips(["room"])));
check("hydrate: cloud ids reach a device with none", same(hydrate({}, { tips: tips(["dock"]) }).tips, tips(["dock"])));
check("hydrate: neither side has tips → the field is absent", !("tips" in hydrate({}, {})));
check("hydrate: corrupt cloud tips are dropped, local kept", same(hydrate({ tips: tips(["room"]) }, { tips: "garbage" }).tips, tips(["room"])));
check("hydrate: no cloud copy yet (seed) keeps the local tips", same(hydrate({ tips: tips(["room", "spell"]) }, null).tips, tips(["room", "spell"])));
check("hydrate: seed with corrupt local tips drops them", !("tips" in hydrate({ tips: { seen: 5 } }, null)));
check("hydrate: anonymous finished, then sign-in to an unfinished account stays finished",
  same(hydrate({ tips: tips([...TIP_IDS]) }, { tips: tips(["room"]) }).tips, tips([...TIP_IDS])));

/** The same expression App.tsx uses on backup import: union with the device's current tips. */
const importTips = (device: unknown, file: { tips?: unknown }) => mergeTips(device, file.tips);
check("import: a pre-tips backup keeps the device's tips", same(importTips(tips(["room", "desk"]), {}), tips(["room", "desk"])));
check("import: a backup with tips unions with the device's", same(importTips(tips(["room"]), { tips: tips(["dock"]) }), tips(["room", "dock"])));
check("import: an old backup can never un-see a tip", importTips(tips([...TIP_IDS]), { tips: tips([]) })?.seen?.dock === true);
check("import: a junk tips field in the file is ignored", same(importTips(tips(["room"]), { tips: [1, 2] }), tips(["room"])));
check("import: no tips on either side → the field is absent", importTips(undefined, {}) === undefined);

// ─── hasProgress ─────────────────────────────────────────────────────────────

check("hasProgress: srsCards {} + 0 XP + no study dates → false", hasProgress({ xp: 0, studyDates: [], srsCards: {} }) === false);
check("hasProgress: a bare new-account blob → false", hasProgress({ xp: 0, streakCount: 0, srsCards: {}, studyDates: [], characterProgress: {}, vocabularyProgress: {} }) === false);
check("hasProgress: XP above 0 → true", hasProgress({ xp: 1, studyDates: [], srsCards: {} }) === true);
check("hasProgress: any study date → true", hasProgress({ xp: 0, studyDates: ["2026-10-01"], srsCards: {} }) === true);
check("hasProgress: one real SRS card → true", hasProgress({ xp: 0, studyDates: [], srsCards: { あ: { level: 0 } } }) === true);
check("hasProgress: a missing srsCards or studyDates does not throw or count", hasProgress({ xp: 0 }) === false);
check("hasProgress: negative, NaN or infinite XP does not count except a finite positive", hasProgress({ xp: -5 }) === false && hasProgress({ xp: NaN }) === false && hasProgress({ xp: Infinity }) === false);
check("hasProgress: XP as a string does not count", hasProgress({ xp: "50" }) === false);
check("hasProgress: blank or non-string study dates do not count", hasProgress({ studyDates: ["", 5, null] }) === false);
check("hasProgress: srsCards as an array or string does not count", hasProgress({ srsCards: [1] }) === false && hasProgress({ srsCards: "x" }) === false);
[undefined, null, 0, "", "xp", [], [1], true].forEach((junk, i) => {
  let result: boolean | "threw" = false;
  try { result = hasProgress(junk); } catch { result = "threw"; }
  check(`hasProgress: junk #${i} → false and never throws`, result === false);
});

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("B1 tips logic checks: all green.");
