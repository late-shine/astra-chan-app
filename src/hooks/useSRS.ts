import { useState, useCallback } from "react";
import { SRSCard, StudentStats } from "../types";

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "hirachan_master_stats_v1";

/** Review intervals in milliseconds, indexed by the card's NEW level after a correct answer. */
const INTERVALS_MS: Record<number, number> = {
  0: 8  * 60 * 60 * 1000,   // level 0 → 8 hours
  1: 1  * 24 * 60 * 60 * 1000,  // level 1 → 1 day
  2: 3  * 24 * 60 * 60 * 1000,  // level 2 → 3 days
  3: 7  * 24 * 60 * 60 * 1000,  // level 3 → 7 days
  4: 14 * 24 * 60 * 60 * 1000,  // level 4 → 14 days
  5: 30 * 24 * 60 * 60 * 1000,  // level 5 → 30 days
};

/** Penalty interval for a wrong answer regardless of level. */
const WRONG_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Read srsCards out of the shared stats blob.
 * Returns an empty object if nothing is saved yet or parsing fails.
 */
function loadCards(): Record<string, SRSCard> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StudentStats;
    return parsed.srsCards ?? {};
  } catch {
    return {};
  }
}

/**
 * Write an updated srsCards map back into the shared stats blob.
 * Only the srsCards field is touched — all other stats fields are preserved.
 * Silently swallows write errors (e.g. private-browsing storage quota).
 */
function persistCards(cards: Record<string, SRSCard>): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stats: StudentStats = raw
      ? (JSON.parse(raw) as StudentStats)
      : {
          xp: 0,
          streakCount: 0,
          lastActiveDate: null,
          correctCount: 0,
          totalAttempts: 0,
          masteredChars: [],
          characterProgress: {},
          vocabularyProgress: {},
          favoriteCategory: "basic",
          srsCards: {},
          studyDates: [],
          survivalBestScore: 0,
          srsReviewedTotal: 0,
        };
    stats.srsCards = cards;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSRS() {
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>(loadCards);

  // ── addCard ────────────────────────────────────────────────────────────────
  /**
   * Adds a new card at level 0, due in 8 hours.
   * If a card for itemKey already exists, this is a no-op (no duplicates).
   */
  const addCard = useCallback(
    (itemKey: string, type: SRSCard["type"]) => {
      setSrsCards((prev) => {
        if (prev[itemKey]) return prev; // already exists — bail out

        const card: SRSCard = {
          level: 0,
          nextReview: Date.now() + INTERVALS_MS[0],
          type,
          itemKey,
        };
        const next = { ...prev, [itemKey]: card };
        persistCards(next);
        return next;
      });
    },
    [] // no external deps — functional updater reads prev internally
  );

  // ── getDueCards ────────────────────────────────────────────────────────────
  /**
   * Returns all cards whose nextReview timestamp is in the past,
   * sorted oldest-due first.
   */
  const getDueCards = useCallback((): SRSCard[] => {
    const now = Date.now();
    return (Object.values(srsCards) as SRSCard[])
      .filter((card) => card.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview);
  }, [srsCards]);

  // ── getTotalCards ──────────────────────────────────────────────────────────
  /** Returns the total number of cards in the deck. */
  const getTotalCards = useCallback(
    (): number => Object.keys(srsCards).length,
    [srsCards]
  );

  // ── answerCard ─────────────────────────────────────────────────────────────
  /**
   * Records the user's answer for a card and schedules the next review.
   *   correct → level + 1 (capped at 5), next review = interval for new level
   *   wrong   → level - 1 (floored at 0), next review = 4 hours
   */
  const answerCard = useCallback(
    (itemKey: string, wasCorrect: boolean) => {
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card) return prev; // unknown card — bail out

        let newLevel: number;
        let newNextReview: number;

        if (wasCorrect) {
          newLevel = Math.min(5, card.level + 1);
          newNextReview = Date.now() + INTERVALS_MS[newLevel];
        } else {
          newLevel = Math.max(0, card.level - 1);
          newNextReview = Date.now() + WRONG_INTERVAL_MS;
        }

        const next = {
          ...prev,
          [itemKey]: { ...card, level: newLevel, nextReview: newNextReview },
        };
        persistCards(next);
        return next;
      });
    },
    [] // functional updater — no external deps needed
  );

  // ── removeCard ─────────────────────────────────────────────────────────────
  /** Permanently deletes a card from the deck. */
  const removeCard = useCallback((itemKey: string) => {
    setSrsCards((prev) => {
      if (!prev[itemKey]) return prev; // nothing to remove

      const next = { ...prev };
      delete next[itemKey];
      persistCards(next);
      return next;
    });
  }, []);

  // ── hasCard ────────────────────────────────────────────────────────────────
  /** Returns true if a card with the given itemKey already exists in the deck. */
  const hasCard = useCallback(
    (itemKey: string): boolean => itemKey in srsCards,
    [srsCards]
  );

  // ── Reactive counts ────────────────────────────────────────────────────────
  // Derived inline on every render so consumers always see the latest values
  // without needing to call getDueCards() / getTotalCards() themselves.
  const now = Date.now();
  const dueCount   = (Object.values(srsCards) as SRSCard[]).filter((c) => c.nextReview <= now).length;
  const totalCount = Object.keys(srsCards).length;

  return {
    addCard,
    hasCard,
    getDueCards,
    getTotalCards,
    answerCard,
    removeCard,
    dueCount,
    totalCount,
  };
}
