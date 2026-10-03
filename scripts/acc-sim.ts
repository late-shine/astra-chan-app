/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ACC-1 check script — a standalone dev tool, NOT a UI feature. Exercises the
 * pure logic behind account-synced preferences and profile restore:
 *   src/preferences.ts   (validation, localStorage mapping, merge rule)
 *   src/profileSync.ts   (name/avatar reconcile rule)
 *
 * It never touches the app, Firebase, or any data file. localStorage is faked
 * in memory. Exits with code 1 if any check fails.
 *
 * Run with: npx tsx scripts/acc-sim.ts   (from the project root)
 */

import {
  DEFAULT_PREFERENCES,
  PREFERENCE_KEYS,
  PREFERENCE_STORAGE_KEYS,
  PREFERENCES_ENVELOPE_KEY,
  THEME_IDS,
  completePreferences,
  isDefaultPreferences,
  readComponentPreferences,
  readLocalPreferences,
  readPreferencesEnvelope,
  resolvePreferences,
  sanitizeEnvelope,
  sanitizePreferenceValues,
  serializePreferences,
  writeLocalPreferences,
  writePreferencesEnvelope,
  type SyncedPreferences,
  type UserPreferences,
} from "../src/preferences";
import {
  AVATAR_ACCEPT_MAX_CHARS,
  DEFAULT_PROFILE_NAME,
  PROFILE_NAME_MAX,
  reconcileProfile,
  safeAvatar,
  shouldStampProfile,
  type LocalProfile,
  type ProfileDecision,
} from "../src/profileSync";

// ─── tiny harness ────────────────────────────────────────────────────────────

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
  } else {
    failures.push(`${name}${detail ? `  (${detail})` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n── ${title}`);
}

/** Realtime Database rejects any undefined value, anywhere. */
function containsUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsUndefined);
  }
  return false;
}

/** RTDB key rule: no . $ # [ ] / in keys. */
function badKeys(value: unknown, path = ""): string[] {
  const bad: string[] = [];
  if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (/[.$#[\]/]/.test(key)) bad.push(`${path}/${key}`);
      bad.push(...badKeys(inner, `${path}/${key}`));
    }
  }
  return bad;
}

// In-memory localStorage.
function installFakeStorage(initial: Record<string, string> = {}): Map<string, string> {
  const data = new Map<string, string>(Object.entries(initial));
  (globalThis as any).localStorage = {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
  return data;
}

const T0 = 1_800_000_000_000;
const withValues = (patch: Partial<UserPreferences>): UserPreferences => ({ ...DEFAULT_PREFERENCES, ...patch });

// ─── 1. Schema and validation ────────────────────────────────────────────────

section("Preferences: schema and validation");

check("defaults are self-consistent (sanitize keeps every key)",
  PREFERENCE_KEYS.every((key) => key in sanitizePreferenceValues(DEFAULT_PREFERENCES)));
check("every preference has a storage key", PREFERENCE_KEYS.every((key) => !!PREFERENCE_STORAGE_KEYS[key]));
check("storage keys are unique", new Set(Object.values(PREFERENCE_STORAGE_KEYS)).size === PREFERENCE_KEYS.length);
check("six themes", THEME_IDS.length === 6);

const garbage = sanitizePreferenceValues({
  theme: "neon", fontStyle: 5, language: "fr", showRomaji: "yes", bgBlur: 99, bgOpacity: null,
  cloudVoiceId: "not-a-real-voice", unknownKey: "x", autoPronounce: true,
});
check("sanitize drops every invalid value", Object.keys(garbage).join() === "autoPronounce", Object.keys(garbage).join());
check("sanitize never emits undefined", !containsUndefined(garbage));
check("sanitize tolerates non-objects",
  [null, undefined, 5, "x", [], true].every((v) => Object.keys(sanitizePreferenceValues(v)).length === 0));
check("bgBlur bounds are inclusive", sanitizePreferenceValues({ bgBlur: 0 }).bgBlur === 0 && sanitizePreferenceValues({ bgBlur: 20 }).bgBlur === 20);
check("bgBlur rejects NaN/Infinity",
  !("bgBlur" in sanitizePreferenceValues({ bgBlur: NaN })) && !("bgBlur" in sanitizePreferenceValues({ bgBlur: Infinity })));
check("completePreferences fills gaps from defaults",
  completePreferences({ theme: "dark" }).language === "en" && completePreferences({ theme: "dark" }).theme === "dark");

check("envelope: rejects missing updatedAt", sanitizeEnvelope({ values: { theme: "dark" } }) === null);
check("envelope: rejects non-finite / non-positive updatedAt",
  sanitizeEnvelope({ values: { theme: "dark" }, updatedAt: NaN }) === null &&
  sanitizeEnvelope({ values: { theme: "dark" }, updatedAt: 0 }) === null &&
  sanitizeEnvelope({ values: { theme: "dark" }, updatedAt: "123" }) === null);
check("envelope: rejects all-invalid values", sanitizeEnvelope({ values: { theme: "nope" }, updatedAt: T0 }) === null);
check("envelope: accepts partial values", sanitizeEnvelope({ values: { theme: "dark" }, updatedAt: T0 })?.values.theme === "dark");

// ─── 2. localStorage mapping keeps the pre-ACC-1 formats ────────────────────

section("Preferences: localStorage mapping");

{
  installFakeStorage();
  check("empty storage reads as defaults", serializePreferences(readLocalPreferences()) === serializePreferences(DEFAULT_PREFERENCES));
  check("empty storage counts as default preferences", isDefaultPreferences(readLocalPreferences()));
}
{
  // Values exactly as the pre-ACC-1 app wrote them.
  installFakeStorage({
    hira_theme_mode: "dark-cosmic",
    astra_font_style: "written",
    hira_app_language: "ja",
    astra_show_romaji: "false",
    astra_kanji_form: "compare",
    astra_kanji_practice_grid: "on",
    astra_auto_pronounce: "true",
    astra_speech_voice_mode: "cloud",
    astra_cloud_voice_id: "ja-JP-Chirp3-HD-Achernar",
    hira_theme_bg_anim: "sakura",
    hira_theme_bg_intensity: "high",
    hira_theme_bg_blur_v2: "12.5",
    hira_theme_bg_opacity: "vivid",
    astra_auto_cycle_bg: "false",
  });
  const read = readLocalPreferences();
  check("legacy values parse correctly",
    read.theme === "dark-cosmic" && read.fontStyle === "written" && read.language === "ja" &&
    read.showRomaji === false && read.kanjiForm === "compare" && read.kanjiPracticeGrid === true &&
    read.autoPronounce === true && read.speechVoiceMode === "cloud" &&
    read.cloudVoiceId === "ja-JP-Chirp3-HD-Achernar" && read.bgAnimationType === "sakura" &&
    read.bgIntensity === "high" && read.bgBlur === 12.5 && read.bgOpacity === "vivid" && read.autoCycleBg === false,
    JSON.stringify(read));
}
{
  const data = installFakeStorage({ hira_theme_mode: "banana", hira_theme_bg_blur_v2: "abc", astra_cloud_voice_id: "retired-voice" });
  const read = readLocalPreferences();
  check("invalid stored values fall back to defaults",
    read.theme === "light" && read.bgBlur === 7 && read.cloudVoiceId === DEFAULT_PREFERENCES.cloudVoiceId);
  check("reading never writes to storage", data.size === 3);
}
{
  // Round trip: write → read gives the same set, and uses the legacy formats.
  const data = installFakeStorage();
  const target = withValues({
    theme: "dark-maple", fontStyle: "written", language: "ja", showRomaji: false, kanjiForm: "written",
    kanjiPracticeGrid: true, autoPronounce: true, speechVoiceMode: "cloud", bgAnimationType: "rain",
    bgIntensity: "low", bgBlur: 3, bgOpacity: "very-dim", autoCycleBg: false,
  });
  writeLocalPreferences(target);
  check("write → read round-trips", serializePreferences(readLocalPreferences()) === serializePreferences(target));
  check("grid is stored as on/off (legacy format)", data.get("astra_kanji_practice_grid") === "on");
  check("booleans stored as 'true'/'false' (legacy format)",
    data.get("astra_show_romaji") === "false" && data.get("astra_auto_cycle_bg") === "false" && data.get("astra_auto_pronounce") === "true");
  writeLocalPreferences({ kanjiForm: "auto" });
  check("kanjiForm 'auto' removes the key (follows the font preference)", !data.has("astra_kanji_form"));
  writeLocalPreferences({ theme: "bogus" as any });
  check("invalid values are never written", data.get("hira_theme_mode") === "dark-maple");
  writeLocalPreferences({ language: "en" });
  check("partial write only touches given keys", data.get("astra_font_style") === "written");
  check("browser-specific voice keys are never touched",
    !data.has("astra_japanese_voice_uri") && !data.has("astra_japanese_voice_name"));
}
{
  // The "component writes its default on mount" scenario must not look like a user change.
  installFakeStorage();
  const before = serializePreferences({ ...DEFAULT_PREFERENCES, ...readComponentPreferences() });
  writeLocalPreferences({ showRomaji: true });
  (globalThis as any).localStorage.setItem("astra_kanji_practice_grid", "off");
  const after = serializePreferences({ ...DEFAULT_PREFERENCES, ...readComponentPreferences() });
  check("a component writing its default on mount does not change the snapshot", before === after);
}
{
  const data = installFakeStorage();
  const envelope: SyncedPreferences = { values: withValues({ theme: "dark" }), updatedAt: T0 };
  writePreferencesEnvelope(envelope);
  check("envelope round-trips through its own key", readPreferencesEnvelope()?.updatedAt === T0 && readPreferencesEnvelope()?.values.theme === "dark");
  data.set(PREFERENCES_ENVELOPE_KEY, "{not json");
  check("a corrupt envelope reads as null, not an exception", readPreferencesEnvelope() === null);
}

// ─── 3. Merge rule ───────────────────────────────────────────────────────────

section("Preferences: merge rule (resolvePreferences)");

const defaults = DEFAULT_PREFERENCES;
const customised = withValues({ theme: "dark-cyber", language: "ja", showRomaji: false });
const cloudEnv = (updatedAt: number, patch: Partial<UserPreferences>): SyncedPreferences => ({ values: withValues(patch), updatedAt });

{
  const r = resolvePreferences({ local: null, cloud: null, snapshot: defaults, now: T0 });
  check("no cloud, no local, all defaults → nothing to sync", r.source === "none" && r.envelope === null && r.apply === null);
}
{
  const r = resolvePreferences({ local: null, cloud: null, snapshot: customised, now: T0 });
  check("no cloud, customised pre-ACC-1 device → seeded and stamped",
    r.source === "seeded" && r.envelope?.updatedAt === T0 && r.apply === null &&
    serializePreferences(completePreferences(r.envelope!.values)) === serializePreferences(customised));
}
{
  const local = cloudEnv(T0 - 5, { theme: "dark" });
  const r = resolvePreferences({ local, cloud: null, snapshot: withValues({ theme: "dark" }), now: T0 });
  check("no cloud, stamped local → local kept as-is", r.source === "local" && r.envelope === local && r.apply === null);
}
{
  const cloud = cloudEnv(T0, { theme: "dark-emerald", language: "ja" });
  const r = resolvePreferences({ local: null, cloud, snapshot: defaults, now: T0 + 1 });
  check("FRESH DEVICE: cloud has prefs, device is all defaults → cloud wins and is applied",
    r.source === "cloud" && r.apply?.theme === "dark-emerald" && r.apply?.language === "ja");
  check("fresh device keeps the cloud timestamp (does not restamp as 'now')", r.envelope?.updatedAt === T0);
}
{
  const cloud = cloudEnv(T0, { theme: "dark-emerald" });
  const r = resolvePreferences({ local: null, cloud, snapshot: customised, now: T0 + 1 });
  check("cloud stamped, local customised but never stamped → cloud wins", r.source === "cloud" && r.apply?.theme === "dark-emerald");
  check("…and un-synced local keys are kept in the stored copy", r.envelope?.values.theme === "dark-emerald");
}
{
  const local = cloudEnv(T0 + 10, { theme: "dark" });
  const cloud = cloudEnv(T0, { theme: "light", language: "ja" });
  const r = resolvePreferences({ local, cloud, snapshot: local.values as UserPreferences, now: T0 + 20 });
  check("both stamped, local newer → local wins, nothing applied", r.source === "local" && r.apply === null && r.envelope === local);
}
{
  const local = cloudEnv(T0, { theme: "dark" });
  const cloud = cloudEnv(T0 + 10, { theme: "light", language: "ja" });
  const r = resolvePreferences({ local, cloud, snapshot: local.values as UserPreferences, now: T0 + 20 });
  check("both stamped, cloud newer → cloud wins", r.source === "cloud" && r.apply?.language === "ja");
}
{
  const local = cloudEnv(T0, { theme: "dark" });
  const cloud = cloudEnv(T0, { theme: "light" });
  const r = resolvePreferences({ local, cloud, snapshot: local.values as UserPreferences, now: T0 + 20 });
  check("tie → local wins (no needless re-apply)", r.source === "local" && r.apply === null);
}
{
  // Idempotence: after the cloud copy wins and is stored, resolving the same pair again changes nothing.
  const cloud = cloudEnv(T0, { theme: "dark-maple", bgBlur: 11 });
  const first = resolvePreferences({ local: null, cloud, snapshot: defaults, now: T0 + 1 });
  const second = resolvePreferences({
    local: first.envelope, cloud, snapshot: completePreferences(first.envelope!.values), now: T0 + 2,
  });
  check("merge is idempotent (second pass applies nothing)", second.apply === null && second.source === "local");
  check("merge is idempotent (stored copy is stable)", second.envelope === first.envelope);
}
{
  // Partial cloud copy (older/newer client): missing keys keep this device's value.
  const cloud: SyncedPreferences = { values: { theme: "dark" }, updatedAt: T0 };
  const r = resolvePreferences({ local: null, cloud, snapshot: withValues({ language: "ja" }), now: T0 + 1 });
  check("partial cloud copy does not reset the other settings",
    r.envelope?.values.language === "ja" && r.envelope?.values.theme === "dark" && r.apply?.language === undefined);
}
{
  const bad = sanitizeEnvelope({ values: { theme: "nope" }, updatedAt: T0 });
  const r = resolvePreferences({ local: null, cloud: bad, snapshot: defaults, now: T0 });
  check("garbage cloud copy behaves like no cloud copy", r.source === "none");
}

// ─── 4. Cloud-safety of what we would store ──────────────────────────────────

section("Preferences: Realtime Database safety");

{
  const envelope: SyncedPreferences = { values: customised, updatedAt: T0 };
  const stats = { xp: 1, preferences: envelope };
  check("stored envelope has no undefined values", !containsUndefined(stats));
  check("stored envelope has no forbidden key characters", badKeys(stats).length === 0, badKeys(stats).join(","));
  check("stored envelope survives a JSON round trip unchanged", JSON.stringify(JSON.parse(JSON.stringify(stats))) === JSON.stringify(stats));
  const payload = JSON.stringify(stats).length;
  check("stored envelope is small (< 1 KB)", payload < 1024, `${payload} bytes`);
}

// ─── 5. Profile reconcile ────────────────────────────────────────────────────

section("Profile: reconcile rule");

const AV_LOCAL = "data:image/jpeg;base64,LOCAL";
const AV_CLOUD = "data:image/jpeg;base64,CLOUD";
const localOf = (patch: Partial<LocalProfile>): LocalProfile => ({ name: "", avatar: "", pending: {}, ...patch });
const STAMP = T0;

// The original bug, modelled: every start published local values no matter what the cloud held.
const oldStartup = (local: LocalProfile) => ({ name: local.name || DEFAULT_PROFILE_NAME, avatar: local.avatar, publish: true });

{
  const cloud = { name: "Shine", avatar: AV_CLOUD, profileSetAt: STAMP };
  const oldResult = oldStartup(localOf({}));
  check("(old behaviour) fresh device would overwrite the account profile with defaults",
    oldResult.publish && oldResult.name === DEFAULT_PROFILE_NAME && oldResult.avatar === "");
  const d = reconcileProfile(localOf({}), cloud);
  check("FRESH DEVICE, saved cloud profile → restores name and avatar, publishes nothing",
    d.name === "Shine" && d.avatar === AV_CLOUD && d.publish === false, JSON.stringify(d));
}
{
  const d = reconcileProfile(localOf({}), { name: "Shine", avatar: AV_CLOUD });
  check("fresh device, legacy cloud profile with real values → uses them", d.name === "Shine" && d.avatar === AV_CLOUD);
  check("…and publishes once so the profile gets stamped", d.publish === true);
}
{
  const cloud = { name: DEFAULT_PROFILE_NAME, avatar: "" };
  const d = reconcileProfile(localOf({ name: "Shine", avatar: AV_LOCAL }), cloud);
  check("HEAL: legacy cloud profile already clobbered to defaults + device still has real values → local wins",
    d.name === "Shine" && d.avatar === AV_LOCAL && d.publish === true, JSON.stringify(d));
}
{
  const d = reconcileProfile(localOf({ name: "Shine", avatar: AV_LOCAL }), { name: "Ayame", avatar: AV_CLOUD });
  check("legacy cloud profile with real values beats a different local one", d.name === "Ayame" && d.avatar === AV_CLOUD);
}
{
  const d = reconcileProfile(localOf({ name: "Shine", avatar: AV_LOCAL }), { name: "Ayame", avatar: "", profileSetAt: STAMP });
  check("explicitly-saved cloud profile is authoritative, including a removed avatar",
    d.name === "Ayame" && d.avatar === "" && d.publish === false, JSON.stringify(d));
}
{
  const d = reconcileProfile(localOf({ name: "Shine" }), { name: DEFAULT_PROFILE_NAME, avatar: "", profileSetAt: STAMP });
  check("explicitly-saved default name is respected (not overwritten by an older local name)",
    d.name === DEFAULT_PROFILE_NAME && d.publish === false);
}
{
  const d = reconcileProfile(localOf({ name: "Newname", pending: { name: true } }), { name: "Old", avatar: AV_CLOUD, profileSetAt: STAMP });
  check("pending name (e.g. restored from a backup) wins and is published",
    d.name === "Newname" && d.avatar === AV_CLOUD && d.publish === true, JSON.stringify(d));
}
{
  const d = reconcileProfile(localOf({ name: "Shine", avatar: "", pending: { avatar: true } }), { name: "Shine", avatar: AV_CLOUD, profileSetAt: STAMP });
  check("pending avatar removal (made offline) wins and is published",
    d.avatar === "" && d.name === "Shine" && d.publish === true);
}
{
  const d = reconcileProfile(localOf({ name: "Shine", avatar: AV_LOCAL }), null);
  check("no cloud profile → publish local", d.name === "Shine" && d.avatar === AV_LOCAL && d.publish === true);
  const e = reconcileProfile(localOf({}), null);
  check("no cloud profile, nothing local → default name", e.name === DEFAULT_PROFILE_NAME && e.avatar === "" && e.publish === true);
}
{
  // Idempotence: once published (now stamped), the same inputs publish nothing further.
  const first = reconcileProfile(localOf({ name: "Shine", avatar: AV_LOCAL }), null);
  const published = { name: first.name, avatar: first.avatar, profileSetAt: STAMP };
  const second = reconcileProfile(localOf({ name: first.name, avatar: first.avatar }), published);
  check("reconcile is idempotent (second start publishes nothing)", second.publish === false && second.name === "Shine");
}
{
  const d = reconcileProfile(localOf({}), { name: "x".repeat(60), avatar: "", profileSetAt: STAMP });
  check("over-long cloud name is clamped", d.name.length === PROFILE_NAME_MAX);
  const e = reconcileProfile(localOf({ name: "Shine" }), { name: "   ", avatar: "", profileSetAt: STAMP });
  check("blank cloud name falls back to the local name", e.name === "Shine");
  const f = reconcileProfile(localOf({}), { name: 42, avatar: 7, profileSetAt: "yes" } as any);
  check("non-string cloud fields are ignored, not thrown on", f.name === DEFAULT_PROFILE_NAME && f.avatar === "");
}
{
  check("avatar must be an image data URL", safeAvatar("https://evil.example/x.png") === "" && safeAvatar("data:text/html;base64,AAA") === "");
  check("oversized avatar string is rejected", safeAvatar("data:image/png;base64," + "A".repeat(AVATAR_ACCEPT_MAX_CHARS)) === "");
  check("normal avatar is accepted", safeAvatar(AV_LOCAL) === AV_LOCAL);
  const d = reconcileProfile(localOf({}), { name: "Shine", avatar: "javascript:alert(1)", profileSetAt: STAMP });
  check("a non-image avatar from the cloud is dropped", d.avatar === "");
}


// ─── 6. ACC-1b: placeholders must never become authoritative ────────────────

section("Profile: placeholders are never stamped (ACC-1b)");

// Model of the cloud node and of saveUserProfile(): update() merges, and only stamps when asked.
type CloudNode = { name: string; avatar: string; profileSetAt?: number } | null;
function publishToCloud(cloud: CloudNode, d: ProfileDecision, at: number): CloudNode {
  const next: NonNullable<CloudNode> = { ...(cloud ?? {}), name: d.name, avatar: d.avatar };
  if (d.stamp) next.profileSetAt = at;
  return next;
}
function startUp(local: LocalProfile, cloud: CloudNode, at: number): { decision: ProfileDecision; cloud: CloudNode } {
  const decision = reconcileProfile(local, cloud);
  return { decision, cloud: decision.publish ? publishToCloud(cloud, decision, at) : cloud };
}
const REAL_LOCAL = localOf({ name: "Shine", avatar: AV_LOCAL });

{
  // THE REPORTED BUG: cloud profile already overwritten by the old start-up code.
  const clobbered: CloudNode = { name: DEFAULT_PROFILE_NAME, avatar: "" };
  const fresh = startUp(localOf({}), clobbered, STAMP);
  check("fresh browser on a clobbered profile publishes nothing", fresh.decision.publish === false, JSON.stringify(fresh.decision));
  check("…and does not stamp the placeholders", fresh.cloud?.profileSetAt === undefined);
  const real = startUp(REAL_LOCAL, fresh.cloud, STAMP + 1);
  check("REAL DEVICE AFTER the fresh browser still heals (keeps its name and avatar)",
    real.decision.name === "Shine" && real.decision.avatar === AV_LOCAL && real.decision.publish === true, JSON.stringify(real.decision));
  check("…and the healed profile is now stamped", real.cloud?.profileSetAt === STAMP + 1 && real.cloud?.name === "Shine");
  const fresh2 = startUp(localOf({}), real.cloud, STAMP + 2);
  check("a fresh browser then restores the real name and avatar", fresh2.decision.name === "Shine" && fresh2.decision.avatar === AV_LOCAL && fresh2.decision.publish === false);
}
{
  // Same, with the order reversed (real device first) — must still heal.
  const clobbered: CloudNode = { name: DEFAULT_PROFILE_NAME, avatar: "" };
  const real = startUp(REAL_LOCAL, clobbered, STAMP);
  const fresh = startUp(localOf({}), real.cloud, STAMP + 1);
  check("real device first, then fresh browser: restored correctly", fresh.decision.name === "Shine" && fresh.decision.avatar === AV_LOCAL);
}
{
  // Brand-new account: no cloud profile. It must be created (friends/search need it) but not stamped.
  const first = startUp(localOf({}), null, STAMP);
  check("no cloud profile + nothing local → created, unstamped",
    first.decision.publish === true && first.decision.stamp === false && first.cloud?.profileSetAt === undefined);
  const real = startUp(REAL_LOCAL, first.cloud, STAMP + 1);
  check("a real device arriving after that still wins", real.decision.name === "Shine" && real.cloud?.profileSetAt === STAMP + 1);
}
{
  const d = reconcileProfile(REAL_LOCAL, null);
  check("no cloud profile + real local values → stamped", d.stamp === true && d.publish === true);
  const e = reconcileProfile(localOf({}), { name: "Shine", avatar: AV_CLOUD });
  check("legacy cloud with a real name → published once and stamped", e.publish === true && e.stamp === true);
}
{
  // Idempotence: a legacy placeholder profile is left alone on every later start.
  const clobbered: CloudNode = { name: DEFAULT_PROFILE_NAME, avatar: "" };
  const a = startUp(localOf({}), clobbered, STAMP);
  const b = startUp(localOf({ name: DEFAULT_PROFILE_NAME }), a.cloud, STAMP + 1);
  check("placeholder-only profiles are never republished (stable across starts)", a.decision.publish === false && b.decision.publish === false);
}
{
  // Explicit user choices keep working.
  const d = reconcileProfile(localOf({}), { name: "Ayame", avatar: "", profileSetAt: STAMP });
  check("an explicitly saved real profile is still authoritative and untouched", d.name === "Ayame" && d.publish === false);
  const e = reconcileProfile(localOf({ name: "Newname", pending: { name: true } }), { name: "Old", avatar: "", profileSetAt: STAMP });
  check("pending real name is still published and stamped", e.publish === true && e.stamp === true);
  check("shouldStampProfile: real name yes, default/blank no",
    shouldStampProfile("Shine") === true && shouldStampProfile(DEFAULT_PROFILE_NAME) === false && shouldStampProfile("   ") === false);
  check("decisions never contain undefined", !containsUndefined(d) && !containsUndefined(e));
}

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} checks passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("ACC-1 logic checks: all green.");
