// src/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firebase initialisation — Realtime Database + Anonymous Auth
//
// SETUP (one-time):
//   1. Open your Firebase console → Project Settings → General → Your apps
//   2. Copy the config object shown there and paste the values below.
//   3. The databaseURL MUST be set — e.g.
//      "https://your-project-default-rtdb.firebaseio.com"
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps } from "firebase/app";
import { get, getDatabase, ref, set } from "firebase/database";
import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    getAuth,
    linkWithCredential,
    onAuthStateChanged,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import type { StudentStats } from "./types";

// ── ⬇⬇  PASTE YOUR FIREBASE CONFIG HERE  ⬇⬇ ────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
// ── ⬆⬆  END OF CONFIG  ⬆⬆ ───────────────────────────────────────────────────

// Guard against double-initialisation (Vite HMR re-runs this module)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);

// ─── Anonymous sign-in ───────────────────────────────────────────────────────
// Returns a stable UID for this browser session. Firebase persists the
// anonymous credential in localStorage, so the same user keeps the same UID
// across page reloads until they clear site storage.

export async function ensureSignedIn(): Promise<User> {
    return new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(
            auth,
            async (user) => {
                unsub();
                try {
                    if (user) {
                        resolve(user);
                    } else {
                        const cred = await signInAnonymously(auth);
                        resolve(cred.user);
                    }
                } catch (err) {
                    reject(err);
                }
            },
            reject
        );
    });
}

// ─── Convenience: current user's UID (null if not yet signed in) ─────────────
export function currentUid(): string | null {
    return auth.currentUser?.uid ?? null;
}

export function isAnonymousUser(): boolean {
    return auth.currentUser?.isAnonymous ?? true;
}

export async function createOrLinkEmailAccount(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const currentUser = auth.currentUser;
    if (currentUser?.isAnonymous) {
        const credential = EmailAuthProvider.credential(cleanEmail, password);
        const linked = await linkWithCredential(currentUser, credential);
        return linked.user;
    }
    const created = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    return created.user;
}

export async function signInEmailAccount(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return result.user;
}

export async function signOutAccount(): Promise<void> {
    await signOut(auth);
    await ensureSignedIn();
}

export async function loadCloudStats(uid = currentUid()): Promise<StudentStats | null> {
    if (!uid) return null;
    const snapshot = await get(ref(db, `userProgress/${uid}/stats`));
    return snapshot.exists() ? snapshot.val() as StudentStats : null;
}

export async function saveCloudStats(stats: StudentStats, uid = currentUid()): Promise<void> {
    if (!uid || isAnonymousUser()) return;
    await set(ref(db, `userProgress/${uid}`), {
        stats,
        updatedAt: Date.now(),
    });
}
