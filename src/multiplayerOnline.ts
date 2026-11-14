import { ref, set, get, onValue, runTransaction, onDisconnect, push, remove, update, query, orderByChild, startAt, endAt, limitToFirst } from "firebase/database";
import { db, currentUid } from "./firebase";
import { createDuelTransport } from "./quiz/duelTransport";
export const duelNetwork = createDuelTransport(db,currentUid);

export type QuizMode = "choice" | "romaji";
export type OnlineDifficulty = "easy" | "medium" | "hard" | "superhard";

/** Friend record stored in RTDB */
export interface FriendRecord {
  uid: string;
  name: string;
  avatar?: string;
  addedAt: number;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  createdAt: number;
}

export interface FriendSearchResult {
  uid: string;
  name: string;
  avatar?: string;
  online?: boolean;
}

/** Public profile stored so friends can find your UID/name */
export interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: number;
  searchName?: string;
  updatedAt: number;
  createdAt?: number;
  /**
   * ACC-1: set only when the user explicitly saved their name/avatar. A profile
   * with this field is authoritative when restoring on another device; one
   * without it may have been overwritten by the old start-up behaviour.
   */
  profileSetAt?: number;
}

/** Room invite sent to a friend */
export interface RoomInvite {
  id: string;
  fromUid: string;
  fromName: string;
  roomCode: string;
  createdAt: number;
}

export interface InviteResponse {
  uid: string;
  status: "sent" | "accepted" | "declined";
  roomCode: string;
  updatedAt: number;
}

export interface MatchHistoryRecord {
  id: string;
  roomCode: string;
  opponentUid: string;
  opponentName: string;
  opponentAvatar?: string;
  myScore: number;
  opponentScore: number;
  result: "win" | "loss" | "tie" | "aborted";
  quizMode: QuizMode;
  difficulty: OnlineDifficulty;
  multiplayerMode: "competitive" | "parallel";
  questionCount: number;
  playedAt: number;
  protocolVersion?:2;
  subject?:"kana"|"vocab"|"kanji";
  kind?:string;
  endedReason?:"complete"|"left"|"connection"|"expired";
  myCorrect?:number;
  opponentCorrect?:number;
  myElapsedMs?:number;
  opponentElapsedMs?:number;
}

function normalizeSearchName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 24);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FRIEND SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Send a friend request by UID. The friendship is created when the target accepts. */
export async function addFriend(friendUid: string, fromName: string, fromAvatar = ""): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");
  const normalizedFriendUid = friendUid.trim();
  if (normalizedFriendUid === uid) throw new Error("You cannot add yourself as a friend.");
  if (!normalizedFriendUid) throw new Error("Please enter a valid UID.");

  const friendProfileRef = ref(db, `userProfiles/${normalizedFriendUid}`);
  const snap = await get(friendProfileRef);
  if (!snap.exists()) {
    throw new Error("No scholar found with that friend code.");
  }

  const existingFriendSnap = await get(ref(db, `friends/${uid}/${normalizedFriendUid}`));
  if (existingFriendSnap.exists()) throw new Error("You are already friends with this scholar.");

  const requestRef = ref(db, `friendRequests/${normalizedFriendUid}/${uid}`);
  await set(requestRef, {
    fromUid: uid,
    fromName: fromName.trim().slice(0, 24) || "Astra Scholar",
    fromAvatar,
    createdAt: Date.now(),
  });
}

/** Remove a friend */
export async function removeFriend(friendUid: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");
  await Promise.all([
    remove(ref(db, `friends/${uid}/${friendUid}`)),
    remove(ref(db, `friends/${friendUid}/${uid}`)),
  ]);
}

/** Listen to friends list changes */
export function listenToFriends(callback: (friends: FriendRecord[]) => void) {
  const uid = currentUid();
  if (!uid) {
    callback([]);
    return () => {};
  }
  const friendsRef = ref(db, `friends/${uid}`);
  return onValue(friendsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val() as Record<string, FriendRecord>;
    const list = Object.values(data).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    callback(list);
  });
}

export function listenToFriendRequests(callback: (requests: FriendRequest[]) => void) {
  const uid = currentUid();
  if (!uid) {
    callback([]);
    return () => {};
  }

  const requestsRef = ref(db, `friendRequests/${uid}`);
  return onValue(requestsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Omit<FriendRequest, "id">>;
    const list = Object.entries(data)
      .map(([id, request]) => ({ id, ...request }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
}

export async function acceptFriendRequest(request: FriendRequest, myName: string, myAvatar = ""): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");

  const now = Date.now();
  const myProfileSnap = await get(ref(db, `userProfiles/${uid}`));
  const myProfile = myProfileSnap.val() as UserProfile | null;

  await update(ref(db), {
    [`friends/${uid}/${request.fromUid}`]: {
      uid: request.fromUid,
      name: request.fromName || "Friend",
      avatar: request.fromAvatar || "",
      addedAt: now,
    },
    [`friends/${request.fromUid}/${uid}`]: {
      uid,
      name: myName || myProfile?.name || "Astra Scholar",
      avatar: myAvatar || myProfile?.avatar || "",
      addedAt: now,
    },
    [`friendRequests/${uid}/${request.id}`]: null,
  });
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");
  await remove(ref(db, `friendRequests/${uid}/${requestId}`));
}

/** Send a room invite to a friend */
export async function sendRoomInvite(friendUid: string, roomCode: string, fromName: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to send invites.");
  const normalizedRoomCode = roomCode.toUpperCase();

  const inviteRef = push(ref(db, `invites/${friendUid}`));
  await set(inviteRef, {
    fromUid: uid,
    fromName: fromName || "Friend",
    roomCode: normalizedRoomCode,
    createdAt: Date.now(),
  });

  await set(ref(db, `inviteResponses/${uid}/${friendUid}`), {
    status: "sent",
    roomCode: normalizedRoomCode,
    updatedAt: Date.now(),
  });
}

/** Listen to incoming invites for the current user */
export function listenToInvites(callback: (invites: RoomInvite[]) => void) {
  const uid = currentUid();
  if (!uid) {
    callback([]);
    return () => {};
  }
  const invitesRef = ref(db, `invites/${uid}`);
  return onValue(invitesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val() as Record<string, Omit<RoomInvite, "id">>;
    // Filter out invites older than 5 minutes
    const cutoff = Date.now() - 5 * 60 * 1000;
    const list: RoomInvite[] = Object.entries(data)
      .filter(([, v]) => (v.createdAt || 0) > cutoff)
      .map(([id, v]) => ({ id, ...v }));
    callback(list);
  });
}

/** Clear a processed invite */
export async function clearInvite(inviteId: string): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  await remove(ref(db, `invites/${uid}/${inviteId}`));
}

export async function respondToRoomInvite(invite: RoomInvite, status: "accepted" | "declined"): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to respond to invites.");

  await Promise.all([
    set(ref(db, `inviteResponses/${invite.fromUid}/${uid}`), {
      status,
      roomCode: invite.roomCode.toUpperCase(),
      updatedAt: Date.now(),
    }),
    remove(ref(db, `invites/${uid}/${invite.id}`)),
  ]);
}

export function listenToInviteResponses(callback: (responses: InviteResponse[]) => void) {
  const uid = currentUid();
  if (!uid) {
    callback([]);
    return () => {};
  }

  const responsesRef = ref(db, `inviteResponses/${uid}`);
  return onValue(responsesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Omit<InviteResponse, "uid">>;
    const cutoff = Date.now() - 5 * 60 * 1000;
    const list: InviteResponse[] = Object.entries(data)
      .filter(([, response]) => (response.updatedAt || 0) > cutoff)
      .map(([uid, response]) => ({ uid, ...response }));
    callback(list);
  });
}

export async function clearInviteResponse(friendUid: string): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  await remove(ref(db, `inviteResponses/${uid}/${friendUid}`));
}

export function listenToMatchHistory(callback: (history: MatchHistoryRecord[]) => void) {
  const uid = currentUid();
  if (!uid) {
    callback([]);
    return () => {};
  }

  const historyRef = ref(db, `matchHistory/${uid}`);
  return onValue(historyRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Omit<MatchHistoryRecord, "id">>;
    const list = Object.entries(data)
      .map(([id, record]) => ({ id, ...record }))
      .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0))
      .slice(0, 20);
    callback(list);
  });
}

/** Create or update the current user's public friend profile */
export async function saveUserProfile(
  name: string,
  avatar = "",
  options: { stamp?: boolean } = {}
): Promise<UserProfile> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to save your profile.");

  const cleanName = name.trim().slice(0, 24) || "Astra Scholar";
  const profileRef = ref(db, `userProfiles/${uid}`);
  const snapshot = await get(profileRef);
  const now = Date.now();
  const profile: UserProfile = {
    uid,
    name: cleanName,
    avatar,
    online: true,
    lastSeen: now,
    createdAt: snapshot.val()?.createdAt || now,
    updatedAt: now,
    // ACC-1b: callers publishing placeholder values pass { stamp: false } so the profile
    // does not become authoritative. The field is omitted (never undefined) in that case,
    // and update() leaves any existing value untouched.
    ...(options?.stamp === false ? {} : { profileSetAt: now }),
    searchName: normalizeSearchName(cleanName),
  };

  await update(profileRef, profile);
  onDisconnect(profileRef).update({ online: false, lastSeen: Date.now() });
  return profile;
}

/**
 * ACC-1: mark the current user online WITHOUT touching name or avatar.
 * App start-up used to call saveUserProfile() with whatever this device had
 * stored, which overwrote the account's real profile on a fresh device. Start-up
 * now reads the cloud profile first and only calls saveUserProfile() when the
 * reconcile rule says to publish; otherwise it calls this.
 */
export async function markProfileOnline(): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  const profileRef = ref(db, `userProfiles/${uid}`);
  const now = Date.now();
  await update(profileRef, { online: true, lastSeen: now, updatedAt: now });
  onDisconnect(profileRef).update({ online: false, lastSeen: Date.now() });
}

/** Read another user's public profile by UID */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await get(ref(db, `userProfiles/${uid.trim()}`));
  return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
}

export async function searchUserProfiles(searchTerm: string): Promise<FriendSearchResult[]> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to search scholars.");

  const cleanSearch = searchTerm.trim();
  if (!cleanSearch) return [];

  if (cleanSearch.length > 20) {
    const directProfile = await getUserProfile(cleanSearch);
    if (!directProfile || directProfile.uid === uid) return [];
    return [{
      uid: directProfile.uid,
      name: directProfile.name,
      avatar: directProfile.avatar,
      online: directProfile.online,
    }];
  }

  const normalized = normalizeSearchName(cleanSearch);
  const searchRef = query(
    ref(db, "userProfiles"),
    orderByChild("searchName"),
    startAt(normalized),
    endAt(`${normalized}\uf8ff`),
    limitToFirst(10)
  );

  const snapshot = await get(searchRef);
  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, UserProfile>;
  return Object.values(data)
    .filter((profile) => profile.uid !== uid)
    .map((profile) => ({
      uid: profile.uid,
      name: profile.name,
      avatar: profile.avatar,
      online: profile.online,
    }));
}
