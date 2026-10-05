import { useState, useCallback } from "react";
import { SRSCard, StudentStats } from "../types";
import { createNewCard, normalizeSrsCards, scheduleAnswer } from "../srsScheduler";

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "hirachan_master_stats_v1";

// The ladder, fuzz, and answer rules live in src/srsScheduler.ts (phase S1).

// ── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Read srsCards out of the shared stats blob.
 * Returns an empty object if nothing is saved yet or parsing fails.
 * Cards are normalized (S1): invalid fields are repaired and unusable entries dropped,
 * while a valid legacy card keeps its level and nextReview exactly.
 */
function loadCards(): Record<string, SRSCard> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StudentStats;
    return normalizeSrsCards(parsed.srsCards, Date.now());
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

export function useSRS(onCardsChanged?: (cards: Record<string, SRSCard>) => void) {
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>(loadCards);

  const publishCards = useCallback(
    (cards: Record<string, SRSCard>) => {
      persistCards(cards);
      onCardsChanged?.(cards);
    },
    [onCardsChanged]
  );

  // ── addCard ────────────────────────────────────────────────────────────────
  /**
   * Adds a new card at level 0, due in 8 hours, with reps 0 / lapses 0 / addedAt set.
   * If a card for itemKey already exists, this is a no-op (no duplicates).
   */
  const addCard = useCallback(
    (itemKey: string, type: SRSCard["type"]) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same card
      setSrsCards((prev) => {
        if (prev[itemKey]) return prev; // already exists — bail out

        const card = createNewCard(itemKey, type, now);
        const next = { ...prev, [itemKey]: card };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
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
   * Records the user's answer for a card and schedules the next review
   * (rules in scheduleAnswer, src/srsScheduler.ts):
   *   correct → level + 1 (capped at 8), next review = that level's interval, fuzzed ±12% from 3 days up
   *   wrong   → level = floor(level / 2), next review = 4 hours, lapses + 1
   * Both stamp lastReviewed.
   */
  const answerCard = useCallback(
    (itemKey: string, wasCorrect: boolean) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same schedule
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card) return prev; // unknown card — bail out

        const next = {
          ...prev,
          [itemKey]: scheduleAnswer(card, wasCorrect, now),
        };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
  );

  // ── removeCard ─────────────────────────────────────────────────────────────
  /** Permanently deletes a card from the deck. */
  const removeCard = useCallback((itemKey: string) => {
    setSrsCards((prev) => {
      if (!prev[itemKey]) return prev; // nothing to remove

      const next = { ...prev };
      delete next[itemKey];
      publishCards(next);
      return next;
    });
  }, [publishCards]);

  /**
   * Replace the local deck after cloud hydration (for example, when the user
   * signs in on a new browser or phone).
   */
  const replaceCards = useCallback(
    (cards: Record<string, SRSCard>) => {
      const next = normalizeSrsCards(cards, Date.now());
      setSrsCards(next);
      publishCards(next);
    },
    [publishCards]
  );

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
    replaceCards,
    dueCount,
    totalCount,
  };
}
