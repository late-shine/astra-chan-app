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
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

// ── ⬇⬇  PASTE YOUR FIREBASE CONFIG HERE  ⬇⬇ ────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
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