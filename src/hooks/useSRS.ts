import { useState, useCallback, useEffect, useMemo } from "react";
import { SRSCard, SrsSettings, StudentStats } from "../types";
import {
  ForecastDay,
  SessionSummary,
  SrsGrade,
  buildForecast,
  buildSessionPlan,
  createNewCard,
  deckKey,
  hasLegacyKanjiKeys,
  listTrickyCards,
  normalizeSrsCards,
  putBackLeech,
  rescheduleVeryOverdue,
  scheduleAnswer,
  scheduleGrade,
  scheduleRelearnAnswer,
  scheduleRelearnGrade,
  summarizeSession,
} from "../srsScheduler";

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "hirachan_master_stats_v1";

// The ladder, fuzz, and answer rules live in src/srsScheduler.ts (phase S1).

// ── localStorage helpers ─────────────────────────────────────────────────────

/**
 * Read srsCards out of the shared stats blob.
 * Returns an empty object if nothing is saved yet or parsing fails.
 * Cards are normalized (S1): invalid fields are repaired and unusable entries dropped,
 * while a valid legacy card keeps its level and nextReview exactly.
 * S5: kanji cards stored under their old bare key come back under `kanji:<char>`.
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

/** S5: does the stored deck still hold kanji cards under their old bare keys? (Read-only.) */
function storedDeckHasLegacyKanjiKeys(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return hasLegacyKanjiKeys((JSON.parse(raw) as StudentStats).srsCards);
  } catch {
    return false;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `settings` (phase S2) are the learner's daily limits, owned by App.tsx as `stats.srsSettings`.
 * Omit them and the defaults (50 reviews, 10 new) apply.
 */
export function useSRS(
  onCardsChanged?: (cards: Record<string, SRSCard>) => void,
  settings?: SrsSettings
) {
  const [srsCards, setSrsCards] = useState<Record<string, SRSCard>>(loadCards);

  const publishCards = useCallback(
    (cards: Record<string, SRSCard>) => {
      persistCards(cards);
      onCardsChanged?.(cards);
    },
    [onCardsChanged]
  );

  // S5: the deck in state is already migrated (loadCards normalizes), but the stored copy and the app's stats
  // mirror still hold the old bare kanji keys until something is written. Write the migrated deck once, right at
  // start-up, so nothing that reads the stored keys directly (the Reading Room) or syncs the blob to the cloud
  // sees the old ones. Idempotent: it runs only while the stored deck still has an old key.
  useEffect(() => {
    if (storedDeckHasLegacyKanjiKeys()) publishCards(srsCards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── addCard ────────────────────────────────────────────────────────────────
  /**
   * Adds a new card at level 0, due in 8 hours, with reps 0 / lapses 0 / addedAt set.
   * If the deck already has this card, this is a no-op (no duplicates). S5: a kanji card is stored under
   * `kanji:<itemKey>`, so the kanji 山 and the word 山 are two different cards.
   */
  const addCard = useCallback(
    (itemKey: string, type: SRSCard["type"]) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same card
      const key = deckKey(type, itemKey);
      setSrsCards((prev) => {
        if (prev[key]) return prev; // already exists — bail out

        const card = createNewCard(itemKey, type, now);
        const next = { ...prev, [key]: card };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
  );

  // ── getDueCards ────────────────────────────────────────────────────────────
  /**
   * Returns all cards whose nextReview timestamp is in the past,
   * sorted oldest-due first. Cards set aside as tricky (S4) are not "due": they stay out until put back.
   */
  const getDueCards = useCallback((): SRSCard[] => {
    const now = Date.now();
    return (Object.values(srsCards) as SRSCard[])
      .filter((card) => card.leech !== true && card.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview);
  }, [srsCards]);

  // ── getSessionQueue (S2) ───────────────────────────────────────────────────
  /**
   * Today's session: due reviews (most overdue first, trimmed to the daily budget) followed by
   * new cards (up to the daily new-card budget). Every Review Deck entry point uses this; none
   * may bypass the budget. getDueCards() above still returns every due card (except tricky ones).
   */
  const getSessionQueue = useCallback(
    (): SRSCard[] => buildSessionPlan(srsCards, settings, Date.now()).queue,
    [srsCards, settings]
  );

  // ── getTotalCards ──────────────────────────────────────────────────────────
  /** Returns the total number of cards in the deck. */
  const getTotalCards = useCallback(
    (): number => Object.keys(srsCards).length,
    [srsCards]
  );

  // ── answerCard ─────────────────────────────────────────────────────────────
  // NOTE (S5): every function below that takes `itemKey` (answerCard, gradeCard, answerRelearnCard,
  // gradeRelearnCard, removeCard, putBackCard) takes the card's DECK KEY, i.e. `cardDeckKey(card)` from
  // srsScheduler (`kanji:<char>` for a kanji, the bare word for the rest), NOT `card.itemKey`. An unknown key is a no-op.
  /**
   * Records the user's answer for a card and schedules the next review
   * (rules in scheduleAnswer, src/srsScheduler.ts). The two-button form: true is "Got it", false is "Forgot".
   *   correct → level + 1 (capped at 8), next review = that level's interval × ease, fuzzed ±12% from 3 days up
   *   wrong   → level = floor(level / 2), next review = 10 minutes (relearn step), lapses + 1
   * Both stamp lastReviewed and adjust the card's ease; a brand-new card also gets introducedAt.
   * gradeCard below is the three-button form (S3).
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

  // ── gradeCard (S3) ─────────────────────────────────────────────────────────
  /**
   * The three-button answer for a first showing: "forgot", "hard" or "gotIt" (rules in scheduleGrade).
   *   gotIt  → level + 1, ease + 0.05          hard   → same level, ease − 0.1, about 0.8 × the interval (min 1 day)
   *   forgot → level halved, ease − 0.15, due in 10 minutes, lapses + 1
   * answerCard(key, boolean) above is the same thing for true / false.
   */
  const gradeCard = useCallback(
    (itemKey: string, grade: SrsGrade) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same schedule
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card) return prev; // unknown card — bail out

        const next = {
          ...prev,
          [itemKey]: scheduleGrade(card, grade, now),
        };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
  );

  // ── answerRelearnCard (S2) ─────────────────────────────────────────────────
  /**
   * Records the answer to the in-session re-show of a card that was just forgotten
   * (rules in scheduleRelearnAnswer). Call answerCard for the first showing, this for the re-show.
   *   correct → keeps its halved level, due after that level's interval (at least 1 day)
   *   wrong   → no further penalty, due again in 10 minutes
   */
  const answerRelearnCard = useCallback(
    (itemKey: string, wasCorrect: boolean) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same schedule
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card) return prev; // unknown card — bail out

        const next = {
          ...prev,
          [itemKey]: scheduleRelearnAnswer(card, wasCorrect, now),
        };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
  );

  // ── gradeRelearnCard (S3) ──────────────────────────────────────────────────
  /**
   * The three-button answer for the in-session re-show of a forgotten card (rules in scheduleRelearnGrade).
   *   gotIt  → due after the halved level's interval, at least 1 day
   *   hard   → due after 0.8 × that interval, at least 1 day
   *   forgot → no further penalty, due again in 10 minutes
   * answerRelearnCard(key, boolean) above is the same thing for true / false.
   */
  const gradeRelearnCard = useCallback(
    (itemKey: string, grade: SrsGrade) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same schedule
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card) return prev; // unknown card — bail out

        const next = {
          ...prev,
          [itemKey]: scheduleRelearnGrade(card, grade, now),
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

  // ── putBackCard (S4) ───────────────────────────────────────────────────────
  /**
   * Puts a tricky card back into rotation: level 0, lapses 0, no ease, due now (see putBackLeech).
   * Does nothing for a missing card or one that is not set aside.
   */
  const putBackCard = useCallback(
    (itemKey: string) => {
      const now = Date.now(); // read once, so a repeated updater call yields the same card
      setSrsCards((prev) => {
        const card = prev[itemKey];
        if (!card || card.leech !== true) return prev;

        const next = { ...prev, [itemKey]: putBackLeech(card, now) };
        publishCards(next);
        return next;
      });
    },
    [publishCards]
  );

  // ── rescheduleOverdueCards (S4) ────────────────────────────────────────────
  /**
   * The backlog tool: moves every very overdue card back to level 1 and spreads them over the next days
   * (see rescheduleVeryOverdue). Returns how many cards moved, over how many days, and the rebuilt session
   * queue (so a screen that has not started its session can swap it in), or null when nothing needed moving.
   * The caller must have shown the count and asked for confirmation first.
   */
  const rescheduleOverdueCards = useCallback((): { count: number; days: number; queue: SRSCard[] } | null => {
    const at = Date.now();
    const result = rescheduleVeryOverdue(srsCards, settings, at);
    if (result.count === 0) return null;

    setSrsCards(result.cards);
    publishCards(result.cards);
    return { count: result.count, days: result.days, queue: buildSessionPlan(result.cards, settings, at).queue };
  }, [srsCards, settings, publishCards]);

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
  /**
   * Returns true if the deck already has this card. `type` defaults to "vocab" (so every vocabulary caller is
   * unchanged); the kanji screen passes "kanji" (S5), because a kanji card lives under `kanji:<char>`.
   */
  const hasCard = useCallback(
    (itemKey: string, type: SRSCard["type"] = "vocab"): boolean => deckKey(type, itemKey) in srsCards,
    [srsCards]
  );

  // ── Reactive counts ────────────────────────────────────────────────────────
  // Derived inline on every render so consumers always see the latest values
  // without needing to call getDueCards() / getTotalCards() themselves.
  const now = Date.now();
  const dueCount   = (Object.values(srsCards) as SRSCard[]).filter((c) => c.leech !== true && c.nextReview <= now).length;
  const totalCount = Object.keys(srsCards).length;

  // The cards set aside as tricky (S4), most forgotten first, for the "Tricky cards" list.
  const trickyCards: SRSCard[] = useMemo(() => listTrickyCards(srsCards), [srsCards]);

  // The summary (counts for the menu text) is recomputed when the deck or the limits change,
  // and once a minute so a card that falls due while the menu is open shows up.
  const minute = Math.floor(now / 60000);
  const sessionSummary: SessionSummary = useMemo(
    () => summarizeSession(buildSessionPlan(srsCards, settings, Date.now())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [srsCards, settings, minute]
  );

  // The 7-day forecast (S3): cards scheduled for each of the next 7 local days, starting tomorrow.
  // Recomputed when the deck changes and once a minute (so it rolls over at midnight).
  const forecast: ForecastDay[] = useMemo(
    () => buildForecast(srsCards, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [srsCards, minute]
  );

  return {
    addCard,
    hasCard,
    getDueCards,
    getTotalCards,
    answerCard,
    gradeCard,
    answerRelearnCard,
    gradeRelearnCard,
    removeCard,
    putBackCard,
    rescheduleOverdueCards,
    replaceCards,
    getSessionQueue,
    sessionSummary,
    forecast,
    trickyCards,
    dueCount,
    totalCount,
  };
}
