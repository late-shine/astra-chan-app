// src/profileSync.ts
// ─────────────────────────────────────────────────────────────────────────────
// ACC-1 — display name + avatar sync.
//
// The name and avatar live in a separate public node, `userProfiles/{uid}`
// (friends and multiplayer read it). Before ACC-1 nothing ever restored them
// from the cloud, and every app start PUBLISHED this device's local values, so
// opening Astra on a fresh browser overwrote the account's real profile with
// "Astra Scholar" and an empty avatar.
//
// New rule: on start and after sign-in, READ the cloud profile first and decide
// with reconcileProfile(). Presence (online / lastSeen) is updated separately
// and never touches name or avatar.
//
// The reconcile rule is pure (no DOM, no Firebase) so scripts/acc-sim.ts can
// test it. The avatar-compression helpers need a browser (canvas) and are only
// touched when called.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PROFILE_NAME = "Astra Scholar";
export const PROFILE_NAME_MAX = 24;

/** Existing localStorage keys. */
export const PROFILE_NAME_KEY = "astra_profile_name";
export const PROFILE_AVATAR_KEY = "astra_profile_avatar";
/** New key: which local profile fields have not reached the cloud yet. */
export const PROFILE_PENDING_KEY = "astra_profile_pending";

// Avatar sizing. Avatars are base64 strings stored in a node that friend search
// returns up to 10 at a time, so they must stay small.
export const AVATAR_EDGE_PX = 192;
export const AVATAR_JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.5, 0.4] as const;
/** Re-encode until the data URL is at most this many characters (~45 KB of image). */
export const AVATAR_TARGET_MAX_CHARS = 60_000;
/** A restored avatar above this is a legacy upload and gets compressed once. */
export const AVATAR_RECOMPRESS_ABOVE_CHARS = 120_000;
/** Never accept an avatar string longer than this from storage or the cloud. */
export const AVATAR_ACCEPT_MAX_CHARS = 1_500_000;
/** Source image files larger than this are refused before decoding. */
export const AVATAR_SOURCE_MAX_BYTES = 8 * 1024 * 1024;

export interface PendingProfileFields {
  name?: boolean;
  avatar?: boolean;
}

export interface LocalProfile {
  /** "" when the device has never stored a name. */
  name: string;
  /** "" when there is no avatar. */
  avatar: string;
  pending: PendingProfileFields;
}

/** The subset of the cloud profile node the rule needs. All fields untrusted. */
export interface CloudProfileLike {
  name?: unknown;
  avatar?: unknown;
  /** Set only when the user explicitly saved a name/avatar (ACC-1 and later). */
  profileSetAt?: unknown;
}

export interface ProfileDecision {
  name: string;
  avatar: string;
  /** True when the decided values must be written to the cloud profile. */
  publish: boolean;
  /**
   * True when publishing should mark the profile as explicitly saved (`profileSetAt`).
   * False while the profile holds only placeholders (default name): stamping those
   * would make them authoritative and a real device would then adopt them (ACC-1b).
   */
  stamp: boolean;
}

export function cleanProfileName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, PROFILE_NAME_MAX) : "";
}

export function isCustomProfileName(name: string): boolean {
  return name !== "" && name !== DEFAULT_PROFILE_NAME;
}

/**
 * Whether a publish should stamp the profile as explicitly saved. Only a real name
 * qualifies; placeholders must never become authoritative (ACC-1b).
 */
export function shouldStampProfile(name: string): boolean {
  return isCustomProfileName(cleanProfileName(name));
}

/** An avatar is a bounded image data URL, or it is treated as "no avatar". */
export function safeAvatar(value: unknown): string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length <= AVATAR_ACCEPT_MAX_CHARS
    ? value
    : "";
}

/**
 * Decide the profile this device should show, and whether to publish it.
 *
 *  1. No cloud profile yet                  → publish local (or the default name).
 *  2. Cloud profile was explicitly saved    → the cloud is authoritative, including a
 *     (`profileSetAt` present)                deliberately removed avatar or default name.
 *  3. Cloud profile predates ACC-1 (no      → fill from local only where the cloud holds a
 *     `profileSetAt`)                         placeholder: default name, empty avatar. This
 *                                             also heals profiles already overwritten by the
 *                                             old start-up bug on a device that still has the
 *                                             real values. Publishing stamps it.
 *  4. A local field is `pending` (changed   → local wins for that field and is published.
 *     while offline, or restored from a
 *     backup)
 *
 * Stamping (ACC-1b): a publish only stamps `profileSetAt` when the name is a real one.
 * A placeholder-only profile (default name) is published unstamped when it has to exist
 * (rule 1) and is not republished at all when the cloud already holds it, so a
 * fresh browser can never turn an already-overwritten profile into an "authoritative"
 * one that wipes the real name/avatar still sitting on another device.
 */
export function reconcileProfile(local: LocalProfile, cloud: CloudProfileLike | null): ProfileDecision {
  const localName = cleanProfileName(local.name);
  const localAvatar = safeAvatar(local.avatar);

  if (!cloud) {
    const name = localName || DEFAULT_PROFILE_NAME;
    return { name, avatar: localAvatar, publish: true, stamp: shouldStampProfile(name) };
  }

  const cloudName = cleanProfileName(cloud.name);
  const cloudAvatar = safeAvatar(cloud.avatar);
  const explicit = typeof cloud.profileSetAt === "number" && cloud.profileSetAt > 0;

  let name: string;
  let avatar: string;
  if (explicit) {
    name = cloudName || localName || DEFAULT_PROFILE_NAME;
    avatar = cloudAvatar;
  } else {
    name = isCustomProfileName(cloudName)
      ? cloudName
      : isCustomProfileName(localName)
        ? localName
        : cloudName || DEFAULT_PROFILE_NAME;
    avatar = cloudAvatar || localAvatar;
  }

  if (local.pending.name && localName) name = localName;
  if (local.pending.avatar) avatar = localAvatar;

  const differs = name !== cloudName || avatar !== cloudAvatar;
  const stamp = shouldStampProfile(name);
  // Explicit cloud profile: only write when something changed. Legacy: write when something
  // changed, or when there is something real worth stamping (nothing to gain otherwise).
  const publish = explicit ? differs : differs || stamp;
  return { name, avatar, publish, stamp };
}

// ─── Local storage helpers (guarded) ─────────────────────────────────────────

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function readPendingProfile(): PendingProfileFields {
  const store = storage();
  if (!store) return {};
  try {
    const parsed = JSON.parse(store.getItem(PROFILE_PENDING_KEY) || "{}");
    return { name: parsed?.name === true, avatar: parsed?.avatar === true };
  } catch {
    return {};
  }
}

export function markProfilePending(fields: PendingProfileFields): void {
  const store = storage();
  if (!store) return;
  try {
    const next = { ...readPendingProfile(), ...fields };
    store.setItem(PROFILE_PENDING_KEY, JSON.stringify(next));
  } catch { /* not fatal */ }
}

export function clearProfilePending(): void {
  const store = storage();
  if (!store) return;
  try { store.removeItem(PROFILE_PENDING_KEY); } catch { /* not fatal */ }
}

export function readLocalProfile(): LocalProfile {
  const store = storage();
  let name = "";
  let avatar = "";
  try {
    name = store?.getItem(PROFILE_NAME_KEY) || "";
    avatar = store?.getItem(PROFILE_AVATAR_KEY) || "";
  } catch { /* treated as empty */ }
  return { name, avatar, pending: readPendingProfile() };
}

export function writeLocalProfile(name: string, avatar: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PROFILE_NAME_KEY, name);
    if (avatar) store.setItem(PROFILE_AVATAR_KEY, avatar);
    else store.removeItem(PROFILE_AVATAR_KEY);
  } catch { /* not fatal: the in-memory value still shows */ }
}

// ─── Avatar compression (browser only) ───────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = src;
  });
}

/** Centre-crop to a square, scale to AVATAR_EDGE_PX, encode as JPEG until small enough. */
function renderAvatar(image: HTMLImageElement): string {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error("That image has no size.");

  const side = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - side) / 2;
  const sy = (sourceHeight - side) / 2;
  const edge = Math.min(AVATAR_EDGE_PX, side);

  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not available in this browser.");
  // JPEG has no transparency; paint a light backing so transparent PNGs do not turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, edge, edge);
  context.drawImage(image, sx, sy, side, side, 0, 0, edge, edge);

  let result = "";
  for (const quality of AVATAR_JPEG_QUALITIES) {
    result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= AVATAR_TARGET_MAX_CHARS) break;
  }
  return result;
}

/** Compress an uploaded image file into a small square avatar data URL. */
export async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > AVATAR_SOURCE_MAX_BYTES) throw new Error("That image is too large. Try one under 8 MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    return renderAvatar(await loadImage(objectUrl));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Compress an existing (legacy, oversized) avatar data URL. Returns the input if it cannot improve it. */
export async function compressAvatarDataUrl(dataUrl: string): Promise<string> {
  try {
    const compressed = renderAvatar(await loadImage(dataUrl));
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}
