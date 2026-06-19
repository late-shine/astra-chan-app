import { ref, set, get, onValue, runTransaction, onDisconnect, push, remove, update } from "firebase/database";
import { db, currentUid } from "./firebase";

export type QuizMode = "choice" | "romaji";
export type OnlineDifficulty = "easy" | "medium" | "hard" | "superhard";

export interface RoomSettings {
  alphabet: "hiragana" | "katakana" | "kanji" | "mixed";
  difficulty: OnlineDifficulty;
  questionCount: number;
  quizMode: QuizMode;
  questionDuration: number; // milliseconds
  stages: string[]; // selected character stages (e.g. ["basic", "dakuon", "handakuon", "yoon"])
  multiplayerMode: "competitive" | "parallel"; // competitive = steal-the-point; parallel = solo race
  selectedChars?: string[]; // optional explicit character allow-list; undefined = use full alphabet pool
}

export interface RoomState {
  status: "waiting" | "playing" | "finished";
  hostId: string;
  guestId: string | null;
  hostName: string;
  guestName: string | null;
  hostAvatar?: string;
  guestAvatar?: string | null;
  seed: number;
  settings: RoomSettings;
  currentQuestion: number;
  questionStartedAt: number | null;
  parallelProgress?: {
    hostIndex: number;
    guestIndex: number;
    hostStartedAt: number | null;
    guestStartedAt: number | null;
    hostFinished: boolean;
    guestFinished: boolean;
  };
  scores: {
    host: number;
    guest: number;
  };
  answers: {
    [questionIndex: string]: {
      hostTime?: number;
      guestTime?: number;
      hostCorrect?: boolean;
      guestCorrect?: boolean;
      winnerName?: string;       // name of first correct player (competitive only)
      winnerRole?: "host" | "guest"; // role of first correct player (competitive only)
      questionLocked?: boolean;   // true once question is resolved
      questionStartedAt?: number; // captured from room.questionStartedAt for parallel speed calc
    };
  };
  invites?: { [inviteId: string]: { fromUid: string; fromName: string; roomCode: string; createdAt: number } };
}

/** Friend record stored in RTDB */
export interface FriendRecord {
  uid: string;
  name: string;
  addedAt: number;
}

/** Public profile stored so friends can find your UID/name */
export interface UserProfile {
  uid: string;
  name: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: number;
  updatedAt: number;
  createdAt?: number;
}

/** Room invite sent to a friend */
export interface RoomInvite {
  id: string;
  fromUid: string;
  fromName: string;
  roomCode: string;
  createdAt: number;
}

/** Difficulty → question duration (ms) */
export const DURATION_MS: Record<OnlineDifficulty, number> = {
  easy: 15000,      // 15s
  medium: 10000,    // 10s
  hard: 5000,       // 5s
  superhard: 3000,  // 3s
};

/**
 * Cryptographically secure room code generator using Web Crypto API
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(array[i] % chars.length);
  }
  return code;
}

/**
 * Create Room with transactional collision loop and automatic cleanup hooks
 */
export async function createRoom(
  hostName: string,
  settings: RoomSettings,
  hostAvatar = ""
): Promise<string> {
  const uid = currentUid();
  if (!uid) throw new Error("Your identity is unverified by the arcane gateway.");

  const initialRoom: RoomState = {
    status: "waiting",
    hostId: uid,
    guestId: null,
    hostName: hostName || "Witch Host",
    guestName: null,
    hostAvatar,
    guestAvatar: null,
    seed: Math.floor(Math.random() * 1000000),
    settings,
    currentQuestion: 0,
    questionStartedAt: null,
    parallelProgress: {
      hostIndex: 0,
      guestIndex: 0,
      hostStartedAt: null,
      guestStartedAt: null,
      hostFinished: false,
      guestFinished: false,
    },
    scores: { host: 0, guest: 0 },
    answers: {},
  };

  const maxAttempts = 5;
  let roomCode = "";
  let committed = false;

  for (let i = 0; i < maxAttempts; i++) {
    roomCode = generateRoomCode().toUpperCase();
    const roomRef = ref(db, `rooms/${roomCode}`);

    const result = await runTransaction(roomRef, (currentData) => {
      if (currentData) return;
      return initialRoom;
    });

    if (result.committed) {
      committed = true;
      break;
    }
  }

  if (!committed) {
    throw new Error("Failed to secure a unique room code. Please try again.");
  }

  const roomRef = ref(db, `rooms/${roomCode}`);
  onDisconnect(roomRef).remove();

  return roomCode;
}

/**
 * Join Room — fixed to avoid cache-miss race condition (Bug #2)
 * and sets up guest onDisconnect cleanup (Bug #3)
 * 
 * FIX: Errors are no longer thrown inside the transaction callback.
 * Instead, we return undefined to abort, then validate after.
 */
export async function joinRoom(roomCode: string, guestName: string, guestAvatar = ""): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("Your identity is unverified by the arcane gateway.");

  const normalizedCode = roomCode.toUpperCase();
  const roomRef = ref(db, `rooms/${normalizedCode}`);

  // FIX #2: Force server read first to populate cache before transaction
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    throw new Error("This grimoire room chamber does not exist.");
  }

  // Pre-validate room state before entering transaction
  const preData = snapshot.val() as RoomState;
  if (preData.status !== "waiting") {
    throw new Error("This match circle has already commenced!");
  }
  if (preData.hostId === uid) {
    throw new Error("You cannot challenge your own reflection, shadow caster!");
  }
  if (preData.guestId && preData.guestId !== uid) {
    throw new Error("This dueling circle is already fully occupied!");
  }

  const guestIdField = ref(db, `rooms/${normalizedCode}/guestId`);
  const result = await runTransaction(guestIdField, (currentGuestId: string | null) => {
    if (currentGuestId && currentGuestId !== uid) return undefined;
    // These checks are defensive — the pre-validation above should catch most issues
    return uid;
  });

  if (!result.committed) {
    throw new Error("Failed to secure safe passage into the room. The room may have just filled up.");
  }

  // FIX #3: Set up guest disconnect cleanup
  const guestNameField = ref(db, `rooms/${normalizedCode}/guestName`);
  const guestAvatarField = ref(db, `rooms/${normalizedCode}/guestAvatar`);
  await set(guestNameField, guestName || "Shadow Guest");
  await set(guestAvatarField, guestAvatar);
  onDisconnect(guestIdField).remove();
  onDisconnect(guestNameField).remove();
  onDisconnect(guestAvatarField).remove();
}

/**
 * Validates baseline room structure prior to emitting update streams
 */
export function listenToRoom(roomCode: string, callback: (room: RoomState | null) => void) {
  const roomRef = ref(db, `rooms/${roomCode.toUpperCase()}`);
  return onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data && typeof data === "object" && "status" in data && "scores" in data) {
        callback(data as RoomState);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Submits a player's answer.
 *
 * Competitive mode: first correct answer locks the question and awards the point.
 * Parallel mode:    answers are silently recorded; the question locks only once
 *                   BOTH players have answered (or the timer expires). No real-time
 *                   points are awarded — the results screen calculates everything.
 */
export async function submitOnlineAnswer(
  roomCode: string,
  role: "host" | "guest",
  questionIndex: number,
  isCorrect: boolean,
  playerName: string,
  startedAt?: number | null
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomCode.toUpperCase()}`);
  const clickTime = Date.now();

  await runTransaction(roomRef, (room: RoomState | null) => {
    if (!room) return room;
    if (!room.answers) room.answers = {};
    if (!room.answers[questionIndex]) {
      room.answers[questionIndex] = {};
    }

    const qAns = room.answers[questionIndex];

    // Prevent re-submission
    if (role === "host" && qAns.hostTime !== undefined) return room;
    if (role === "guest" && qAns.guestTime !== undefined) return room;

    // Record this player's answer
    if (role === "host") {
      qAns.hostTime = clickTime;
      qAns.hostCorrect = isCorrect;
    } else {
      qAns.guestTime = clickTime;
      qAns.guestCorrect = isCorrect;
    }

    // ── PARALLEL MODE ──────────────────────────────────────────────────────────
    // No real-time points. Each player advances independently.
    if (room.settings?.multiplayerMode === "parallel") {
      qAns.questionStartedAt =
        qAns.questionStartedAt ||
        startedAt ||
        (role === "host" ? room.parallelProgress?.hostStartedAt : room.parallelProgress?.guestStartedAt) ||
        room.questionStartedAt ||
        clickTime;

      if (qAns.hostTime !== undefined && qAns.guestTime !== undefined) {
        qAns.questionLocked = true;
      }

      const totalQuestions = Math.max(1, room.settings.questionCount || 10);
      const nextIndex = questionIndex + 1;
      if (!room.parallelProgress) {
        room.parallelProgress = {
          hostIndex: room.currentQuestion || 0,
          guestIndex: room.currentQuestion || 0,
          hostStartedAt: room.questionStartedAt,
          guestStartedAt: room.questionStartedAt,
          hostFinished: false,
          guestFinished: false,
        };
      }

      if (role === "host") {
        room.parallelProgress.hostIndex = Math.min(nextIndex, totalQuestions);
        room.parallelProgress.hostFinished = nextIndex >= totalQuestions;
        room.parallelProgress.hostStartedAt = nextIndex >= totalQuestions ? null : Date.now();
      } else {
        room.parallelProgress.guestIndex = Math.min(nextIndex, totalQuestions);
        room.parallelProgress.guestFinished = nextIndex >= totalQuestions;
        room.parallelProgress.guestStartedAt = nextIndex >= totalQuestions ? null : Date.now();
      }

      if (room.parallelProgress.hostFinished && room.parallelProgress.guestFinished) {
        room.status = "finished";
      }

      return room;
    }

    // ── COMPETITIVE MODE (original behaviour — untouched) ──────────────────────
    // If question is already locked, don't award any more points
    if (qAns.questionLocked) return room;

    // First correct answer wins!
    if (isCorrect) {
      qAns.questionLocked = true;
      qAns.winnerName = playerName;
      qAns.winnerRole = role;

      if (role === "host") {
        room.scores.host += 1;
      } else {
        room.scores.guest += 1;
      }
    }

    // If BOTH players have answered (neither got it right first try)
    // and the question isn't locked, check if both are wrong → lock with no winner
    if (
      !qAns.questionLocked &&
      qAns.hostTime !== undefined &&
      qAns.guestTime !== undefined
    ) {
      const bothWrong = qAns.hostCorrect === false && qAns.guestCorrect === false;
      if (bothWrong) {
        qAns.questionLocked = true; // nobody wins
      }
    }

    return room;
  });
}

/**
 * advanceOnlineQuestion — fixed to set status to "playing" on game start (Bug #1)
 */
export async function advanceOnlineQuestion(
  roomCode: string,
  nextIndex: number,
  totalQuestions: number
): Promise<void> {
  const uid = currentUid();
  const roomRef = ref(db, `rooms/${roomCode.toUpperCase()}`);

  await runTransaction(roomRef, (room: RoomState | null) => {
    if (!room) return room;

    if (room.hostId !== uid) {
      return undefined;
    }

    room.currentQuestion = nextIndex;
    room.questionStartedAt = Date.now();

    // FIX #1: Set status to "playing" when starting from lobby
    if (room.status === "waiting") {
      room.status = "playing";
      if (room.settings?.multiplayerMode === "parallel") {
        room.parallelProgress = {
          hostIndex: 0,
          guestIndex: 0,
          hostStartedAt: room.questionStartedAt,
          guestStartedAt: room.questionStartedAt,
          hostFinished: false,
          guestFinished: false,
        };
      }
    }

    if (nextIndex >= totalQuestions) {
      room.status = "finished";
    }

    return room;
  });
}

/**
 * Handles explicit exits, canceling onDisconnect cleanups before applying changes
 */
export async function leaveRoom(roomCode: string, role: "host" | "guest"): Promise<void> {
  const normalizedCode = roomCode.toUpperCase();
  const roomRef = ref(db, `rooms/${normalizedCode}`);

  if (role === "host") {
    await onDisconnect(roomRef).cancel();
    await set(roomRef, null);
  } else {
    const statusRef = ref(db, `rooms/${normalizedCode}/status`);
    const guestIdRef = ref(db, `rooms/${normalizedCode}/guestId`);
    const guestNameRef = ref(db, `rooms/${normalizedCode}/guestName`);

    await onDisconnect(statusRef).cancel();
    await onDisconnect(guestIdRef).cancel();
    await onDisconnect(guestNameRef).cancel();

    await runTransaction(roomRef, (room: RoomState | null) => {
      if (!room) return room;
      room.status = "finished";
      return room;
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FRIEND SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Add a friend by UID — writes to /friends/{myUid}/{friendUid} */
export async function addFriend(friendUid: string, friendName: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");
  const normalizedFriendUid = friendUid.trim();
  if (normalizedFriendUid === uid) throw new Error("You cannot add yourself as a friend.");
  if (!normalizedFriendUid) throw new Error("Please enter a valid UID.");

  // Verify the friend UID exists by checking their auth record via public profile
  const friendProfileRef = ref(db, `userProfiles/${normalizedFriendUid}`);
  const snap = await get(friendProfileRef);
  const profile = snap.val() as UserProfile | null;
  if (!snap.exists()) {
    // Allow adding anyway — the UID might not have a profile yet
    // but we should at least warn. We'll proceed.
  }

  const friendRef = ref(db, `friends/${uid}/${normalizedFriendUid}`);
  await set(friendRef, {
    uid: normalizedFriendUid,
    name: friendName || profile?.name || "Friend",
    addedAt: Date.now(),
  });
}

/** Remove a friend */
export async function removeFriend(friendUid: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to manage friends.");
  const friendRef = ref(db, `friends/${uid}/${friendUid}`);
  await remove(friendRef);
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

/** Send a room invite to a friend */
export async function sendRoomInvite(friendUid: string, roomCode: string, fromName: string): Promise<void> {
  const uid = currentUid();
  if (!uid) throw new Error("You must be signed in to send invites.");

  const inviteRef = push(ref(db, `invites/${friendUid}`));
  await set(inviteRef, {
    fromUid: uid,
    fromName: fromName || "Friend",
    roomCode: roomCode.toUpperCase(),
    createdAt: Date.now(),
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

/** Create or update the current user's public friend profile */
export async function saveUserProfile(name: string, avatar = ""): Promise<UserProfile> {
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
  };

  await update(profileRef, profile);
  onDisconnect(profileRef).update({ online: false, lastSeen: Date.now() });
  return profile;
}

/** Read another user's public profile by UID */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await get(ref(db, `userProfiles/${uid.trim()}`));
  return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
}
