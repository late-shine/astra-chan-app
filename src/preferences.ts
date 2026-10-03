// src/preferences.ts
// ─────────────────────────────────────────────────────────────────────────────
// ACC-1 — synced user preferences.
//
// Preferences (theme, font, language, voice, atmosphere…) used to live only in
// separate localStorage keys, so a new browser or device always started from
// defaults. This module defines ONE small object that travels inside the
// existing `stats` blob (`stats.preferences`), and the rules for validating it,
// mapping it to the existing localStorage keys, and merging two copies.
//
// Design rules:
//   • The existing localStorage keys stay the local source of truth and keep
//     their exact formats, so nothing already saved is lost or migrated.
//   • Merging is "most recently changed wins" for the whole object, using an
//     `updatedAt` that is stamped ONLY when the user actually changes a setting
//     (never on app start, never when a synced value is applied).
//   • Everything is validated on the way in; unknown or invalid values are
//     dropped, never thrown on.
//   • No `undefined` values are ever produced inside the synced object
//     (Firebase Realtime Database `set()` throws on them).
//
// Deliberately NOT synced:
//   • The browser-specific Japanese voice (`astra_japanese_voice_uri/name`):
//     voice identifiers differ between browsers and operating systems.
//   • Music track, volume, ambient sound, current background scene and quiz
//     choice count: none of these are persisted locally today.
//
// This file has no React and no Firebase imports, so scripts/acc-sim.ts can run
// it under plain Node. localStorage access is guarded and optional.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_CLOUD_JAPANESE_VOICE, getCloudJapaneseVoice } from "./voiceCatalog";

/** The six themes. `App.tsx` imports this list so the two can never drift. */
export const THEME_IDS = ["light", "dark", "dark-cosmic", "dark-emerald", "dark-maple", "dark-cyber"] as const;
export type ThemeId = typeof THEME_IDS[number];

export const BG_ANIMATION_TYPES = ["auto", "snow", "sakura", "sparkles", "rain", "letters", "both", "none"] as const;
export type BgAnimationType = typeof BG_ANIMATION_TYPES[number];

export const BG_INTENSITIES = ["low", "medium", "high"] as const;
export type BgIntensity = typeof BG_INTENSITIES[number];

export const BG_OPACITIES = ["very-dim", "low", "medium", "vivid"] as const;
export type BgOpacity = typeof BG_OPACITIES[number];

export const KANJI_FORMS = ["auto", "digital", "written", "compare"] as const;
export type KanjiFormPreference = typeof KANJI_FORMS[number];

export interface UserPreferences {
  theme: ThemeId;
  fontStyle: "digital" | "written";
  language: "en" | "ja";
  /** Romaji shown in Reference Charts and Grammar Dojo. */
  showRomaji: boolean;
  /** Kanji specimen form. "auto" = follow the app-wide font preference (key absent). */
  kanjiForm: KanjiFormPreference;
  kanjiPracticeGrid: boolean;
  autoPronounce: boolean;
  speechVoiceMode: "browser" | "cloud";
  cloudVoiceId: string;
  bgAnimationType: BgAnimationType;
  bgIntensity: BgIntensity;
  /** 0–20 (px). */
  bgBlur: number;
  bgOpacity: BgOpacity;
  autoCycleBg: boolean;
}

/** What is stored in `stats.preferences`, locally and in the cloud. */
export interface SyncedPreferences {
  /** Always written in full by this version; may be partial when read from an older/newer client. */
  values: Partial<UserPreferences>;
  /** ms epoch of the last time the USER changed a preference (or restored a backup). */
  updatedAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "light",
  fontStyle: "digital",
  language: "en",
  showRomaji: true,
  kanjiForm: "auto",
  kanjiPracticeGrid: false,
  autoPronounce: false,
  speechVoiceMode: "browser",
  cloudVoiceId: DEFAULT_CLOUD_JAPANESE_VOICE,
  bgAnimationType: "auto",
  bgIntensity: "medium",
  bgBlur: 7,
  bgOpacity: "medium",
  autoCycleBg: true,
};

/** Fixed key order: makes serializePreferences() a stable comparison key. */
export const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES) as (keyof UserPreferences)[];

/**
 * Preferences that are written to localStorage by child components, not by
 * App.tsx state. App listens for PREFERENCE_CHANGED_EVENT to notice them.
 */
export const COMPONENT_OWNED_KEYS = ["showRomaji", "kanjiForm", "kanjiPracticeGrid"] as const;
export type ComponentPreferenceKey = typeof COMPONENT_OWNED_KEYS[number];
export type ComponentPreferences = Pick<UserPreferences, ComponentPreferenceKey>;

/** Existing localStorage keys. Do not rename: they hold what users already saved. */
export const PREFERENCE_STORAGE_KEYS: Record<keyof UserPreferences, string> = {
  theme: "hira_theme_mode",
  fontStyle: "astra_font_style",
  language: "hira_app_language",
  showRomaji: "astra_show_romaji",
  kanjiForm: "astra_kanji_form",
  kanjiPracticeGrid: "astra_kanji_practice_grid",
  autoPronounce: "astra_auto_pronounce",
  speechVoiceMode: "astra_speech_voice_mode",
  cloudVoiceId: "astra_cloud_voice_id",
  bgAnimationType: "hira_theme_bg_anim",
  bgIntensity: "hira_theme_bg_intensity",
  bgBlur: "hira_theme_bg_blur_v2",
  bgOpacity: "hira_theme_bg_opacity",
  autoCycleBg: "astra_auto_cycle_bg",
};

/** New key: the local copy of the synced envelope (values + updatedAt). */
export const PREFERENCES_ENVELOPE_KEY = "astra_preferences_v1";

export const PREFERENCE_CHANGED_EVENT = "astra:preference-changed";

// ─── Validation ──────────────────────────────────────────────────────────────

function oneOf<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Returns the validated value for one key, or undefined if it is invalid. */
function validateValue<K extends keyof UserPreferences>(key: K, value: unknown): UserPreferences[K] | undefined {
  let result: unknown;
  switch (key) {
    case "theme": result = oneOf(THEME_IDS, value); break;
    case "fontStyle": result = oneOf(["digital", "written"] as const, value); break;
    case "language": result = oneOf(["en", "ja"] as const, value); break;
    case "showRomaji":
    case "kanjiPracticeGrid":
    case "autoPronounce":
    case "autoCycleBg":
      result = typeof value === "boolean" ? value : undefined; break;
    case "kanjiForm": result = oneOf(KANJI_FORMS, value); break;
    case "speechVoiceMode": result = oneOf(["browser", "cloud"] as const, value); break;
    case "cloudVoiceId":
      // Only ids that still exist in the voice catalog; a retired id would silently break speech.
      result = typeof value === "string" && getCloudJapaneseVoice(value) ? value : undefined; break;
    case "bgAnimationType": result = oneOf(BG_ANIMATION_TYPES, value); break;
    case "bgIntensity": result = oneOf(BG_INTENSITIES, value); break;
    case "bgOpacity": result = oneOf(BG_OPACITIES, value); break;
    case "bgBlur":
      result = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 20 ? value : undefined; break;
    default: result = undefined;
  }
  return result as UserPreferences[K] | undefined;
}

/** Keep only known keys with valid values. Never throws; never returns undefined members. */
export function sanitizePreferenceValues(raw: unknown): Partial<UserPreferences> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out as Partial<UserPreferences>;
  const source = raw as Record<string, unknown>;
  for (const key of PREFERENCE_KEYS) {
    const valid = validateValue(key, source[key]);
    if (valid !== undefined) out[key] = valid;
  }
  return out as Partial<UserPreferences>;
}

/** Fill every missing or invalid key from `base` (defaults unless told otherwise). */
export function completePreferences(
  partial: Partial<UserPreferences>,
  base: UserPreferences = DEFAULT_PREFERENCES
): UserPreferences {
  return { ...base, ...sanitizePreferenceValues(partial) };
}

/** Validate an envelope from the cloud, a backup file or localStorage. Null if unusable. */
export function sanitizeEnvelope(raw: unknown): SyncedPreferences | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = raw as { values?: unknown; updatedAt?: unknown };
  if (typeof candidate.updatedAt !== "number" || !Number.isFinite(candidate.updatedAt) || candidate.updatedAt <= 0) return null;
  const values = sanitizePreferenceValues(candidate.values);
  if (Object.keys(values).length === 0) return null;
  return { values, updatedAt: candidate.updatedAt };
}

/** Stable string form, used to detect "did anything actually change". */
export function serializePreferences(prefs: UserPreferences): string {
  return JSON.stringify(PREFERENCE_KEYS.map((key) => prefs[key]));
}

export function isDefaultPreferences(prefs: UserPreferences): boolean {
  return serializePreferences(prefs) === serializePreferences(DEFAULT_PREFERENCES);
}

// ─── Merge rule ──────────────────────────────────────────────────────────────

export interface PreferenceResolution {
  /** What this device should store locally AND send to the cloud. Null = nothing to sync. */
  envelope: SyncedPreferences | null;
  /** Values this device must adopt because the cloud copy won. Null = keep what is here. */
  apply: Partial<UserPreferences> | null;
  source: "cloud" | "local" | "seeded" | "none";
}

/**
 * Decide which preferences win when this device meets an account's cloud copy.
 *
 *  • Cloud has none, this device has a stamped copy       → keep local.
 *  • Cloud has none, this device was customised but never stamped (it predates
 *    ACC-1)                                                → seed from local, stamped now.
 *  • Cloud has none, this device is all defaults           → nothing to sync.
 *  • Both have a stamp                                     → later `updatedAt` wins (tie: local).
 *  • Cloud has a stamp, this device does not               → cloud wins ("the account's
 *    settings follow you"); this device's un-stamped choices are older, unknown-age data.
 *
 * `snapshot` is this device's current full preference set.
 */
export function resolvePreferences(input: {
  local: SyncedPreferences | null;
  cloud: SyncedPreferences | null;
  snapshot: UserPreferences;
  now: number;
}): PreferenceResolution {
  const { local, cloud, snapshot, now } = input;

  if (!cloud) {
    if (local) return { envelope: local, apply: null, source: "local" };
    if (!isDefaultPreferences(snapshot)) {
      return { envelope: { values: { ...snapshot }, updatedAt: now }, apply: null, source: "seeded" };
    }
    return { envelope: null, apply: null, source: "none" };
  }

  if (local && local.updatedAt >= cloud.updatedAt) {
    return { envelope: local, apply: null, source: "local" };
  }

  const merged = completePreferences(cloud.values, snapshot);
  return {
    envelope: { values: merged, updatedAt: cloud.updatedAt },
    apply: cloud.values,
    source: "cloud",
  };
}

// ─── localStorage mapping (guarded; safe to import where there is no DOM) ───

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Parse one stored string exactly the way the pre-ACC-1 code did. */
function parseStored<K extends keyof UserPreferences>(key: K, raw: string | null): UserPreferences[K] {
  const fallback = DEFAULT_PREFERENCES[key];
  if (raw === null) return fallback;
  let candidate: unknown;
  switch (key) {
    case "showRomaji": candidate = raw === "true" ? true : raw === "false" ? false : undefined; break;
    case "kanjiPracticeGrid": candidate = raw === "on"; break;
    case "autoPronounce": candidate = raw === "true"; break;
    case "autoCycleBg": candidate = raw === "false" ? false : true; break;
    case "bgBlur": candidate = parseFloat(raw); break;
    default: candidate = raw;
  }
  const valid = validateValue(key, candidate);
  return (valid === undefined ? fallback : valid) as UserPreferences[K];
}

/** Value to store for a key, or null to remove the key. */
function toStored(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]): string | null {
  switch (key) {
    case "kanjiForm": return value === "auto" ? null : String(value);
    case "kanjiPracticeGrid": return value ? "on" : "off";
    default: return String(value);
  }
}

/** Full preference set as currently stored on this device (defaults for absent keys). */
export function readLocalPreferences(): UserPreferences {
  const store = storage();
  const out: Record<string, unknown> = {};
  for (const key of PREFERENCE_KEYS) {
    let raw: string | null = null;
    try { raw = store ? store.getItem(PREFERENCE_STORAGE_KEYS[key]) : null; } catch { raw = null; }
    out[key] = parseStored(key, raw);
  }
  return out as unknown as UserPreferences;
}

/** Only the preferences that child components own. */
export function readComponentPreferences(): ComponentPreferences {
  const all = readLocalPreferences();
  return { showRomaji: all.showRomaji, kanjiForm: all.kanjiForm, kanjiPracticeGrid: all.kanjiPracticeGrid };
}

/** Write validated values into the existing localStorage keys. Invalid values are skipped. */
export function writeLocalPreferences(values: Partial<UserPreferences>): void {
  const store = storage();
  if (!store) return;
  const clean = sanitizePreferenceValues(values);
  for (const key of PREFERENCE_KEYS) {
    if (!(key in clean)) continue;
    try {
      const stored = toStored(key, clean[key] as UserPreferences[keyof UserPreferences]);
      if (stored === null) store.removeItem(PREFERENCE_STORAGE_KEYS[key]);
      else store.setItem(PREFERENCE_STORAGE_KEYS[key], stored);
    } catch { /* storage full or blocked: the in-memory value still applies */ }
  }
}

export function readPreferencesEnvelope(): SyncedPreferences | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFERENCES_ENVELOPE_KEY);
    return raw ? sanitizeEnvelope(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writePreferencesEnvelope(envelope: SyncedPreferences): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFERENCES_ENVELOPE_KEY, JSON.stringify(envelope));
  } catch { /* not fatal: it is re-seeded on the next load */ }
}

/**
 * Child components call this right after they write one of their own
 * preference keys. Dispatch is deferred one tick so it is safe even when the
 * caller is inside a React state updater or render.
 */
export function notifyPreferenceChanged(): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    try { window.dispatchEvent(new Event(PREFERENCE_CHANGED_EVENT)); } catch { /* ignore */ }
  }, 0);
}
