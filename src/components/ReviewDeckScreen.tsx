import { useState } from "react";
import type React from "react";
import { motion } from "motion/react";
import { CheckCircle2, ChevronLeft, Flag, Minus, Settings2, X } from "lucide-react";
import { KANJI_DATA, VOCABULARY_DATA } from "../data";
import type { SRSCard, SrsSettings } from "../types";
import {
  LEECH_LAPSE_THRESHOLD,
  MAX_LEVEL,
  MAX_RELEARN_REQUEUES,
  NEW_CAP_OPTIONS,
  REVIEW_CAP_OPTIONS,
  UNLIMITED_REVIEWS,
  formatForecastLine,
  formatIntervalShort,
  localDayRange,
  previewIntervals,
  rescheduleSpreadDays,
  scheduleGrade,
  type ForecastDay,
  type SessionSummary,
  type SrsGrade,
} from "../srsScheduler";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";

interface ReviewDeckScreenProps {
  srsQueue: SRSCard[];
  /** S2: lets a forgotten card be re-appended to the session (relearn re-show). */
  setSrsQueue: React.Dispatch<React.SetStateAction<SRSCard[]>>;
  srsQueueIndex: number;
  setSrsQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  srsRevealed: boolean;
  setSrsRevealed: React.Dispatch<React.SetStateAction<boolean>>;
  /** S3: three-button grade for a first showing (Forgot / Hard / Got it). Replaces S2's `answerCard` prop. */
  gradeCard: (itemKey: string, grade: SrsGrade) => void;
  /** S3: grades the in-session re-show of a forgotten card (no XP, no second penalty). Replaces S2's `answerRelearnCard` prop. */
  gradeRelearnCard: (itemKey: string, grade: SrsGrade) => void;
  /** S2: used by the "Remove this card" action on an orphan card. */
  removeCard: (itemKey: string) => void;
  awardSRSXP: (xp: number) => void;
  playChime: (success: boolean) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  totalCount: number;
  /** S2: builds the next budgeted session ("Study N more" on the end screen). */
  getSessionQueue: () => SRSCard[];
  /** S2: live counts for the end screen (next due time, how many are waiting). */
  sessionSummary: SessionSummary;
  /** S2: the current daily limits (already normalized) and how to change them. */
  srsSettings: SrsSettings;
  onChangeSrsSettings: (next: { dailyReviewCap: number; dailyNewCap: number }) => void;
  /** S3: cards scheduled for each of the next 7 days (starting tomorrow), for the forecast strip. */
  forecast: ForecastDay[];
  /** S4: cards set aside as tricky (6 or more first-pass Forgot answers), most forgotten first. */
  trickyCards: SRSCard[];
  /** S4: "Put back": a tricky card returns at level 0, due in the next session. */
  putBackCard: (itemKey: string) => void;
  /** S4: the backlog tool. Moves very old overdue cards back to level 1 over the next days; null when nothing moved. */
  rescheduleOverdueCards: () => { count: number; days: number; queue: SRSCard[] } | null;
}

/** "in 25 min", "in 3 h", "tomorrow", "in 4 days" for the next-card-due line. */
function formatNextDue(at: number, now: number): string {
  const diff = at - now;
  if (diff <= 60 * 1000) return "now";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const [todayStart] = localDayRange(now);
  const [dueDayStart] = localDayRange(at);
  const days = Math.round((dueDayStart - todayStart) / (24 * 60 * 60 * 1000));
  if (days <= 0) return `in ${Math.round(diff / 3600000)} h`;
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** What to show for a card in the Tricky cards list: the word or kanji and a short meaning. Falls back to the key. */
function describeCard(card: SRSCard): { title: string; detail: string } {
  if (card.type === "vocab") {
    const vocab = VOCABULARY_DATA.find((v) => v.word === card.itemKey);
    if (vocab) return { title: vocab.word, detail: `${vocab.hiragana !== vocab.word ? `${vocab.hiragana} · ` : ""}${vocab.english}` };
  } else if (card.type === "kanji") {
    const kanji = KANJI_DATA.find((k) => k.kanji === card.itemKey);
    if (kanji) return { title: kanji.kanji, detail: kanji.meaning };
  }
  return { title: card.itemKey, detail: "Card not found" };
}

/** A quiet progress ring for a card's level (0 to 8). Colours come from the kz-* tokens, so every theme works. */
function LevelRing({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(MAX_LEVEL, Math.floor(level) || 0));
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const label = `Level ${clamped} of ${MAX_LEVEL}`;
  return (
    <div className="absolute top-3 right-3 w-8 h-8" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90" aria-hidden="true">
        <circle cx="16" cy="16" r={radius} fill="none" strokeWidth="2.5" style={{ stroke: "var(--kz-border-soft)" }} />
        {clamped > 0 && (
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / MAX_LEVEL)}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
            style={{ stroke: "var(--kz-accent)" }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold leading-none"
        style={{ color: "var(--kz-ink-muted)" }}
      >
        {clamped}
      </span>
    </div>
  );
}

/** Cards due on each of the next 7 days. One quiet line on phones, one small column per day from the sm breakpoint up. */
function ForecastStrip({ forecast }: { forecast: ForecastDay[] }) {
  const peak = Math.max(1, ...forecast.map((day) => day.count));
  const line = formatForecastLine(forecast);
  return (
    <div className="kz-inset px-3 py-2" role="group" aria-label={`Forecast: ${line}`}>
      <p className="sm:hidden text-center text-[11px] font-mono font-bold" style={{ color: "var(--kz-ink-muted)" }}>
        {line}
      </p>
      <div className="hidden sm:grid grid-cols-7 gap-1.5" aria-hidden="true">
        {forecast.map((day) => (
          <div key={day.dayStart} className="flex flex-col items-center gap-1">
            <div className="h-8 w-full flex items-end justify-center">
              <div
                className="w-3 rounded-sm"
                style={{
                  height: `${day.count === 0 ? 8 : Math.max(15, Math.round((day.count / peak) * 100))}%`,
                  background: day.count === 0 ? "var(--kz-border-soft)" : "var(--kz-accent)",
                }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold leading-none" style={{ color: "var(--kz-ink)" }}>
              {day.count}
            </span>
            <span className="kz-label leading-none">
              {new Date(day.dayStart).toLocaleDateString(undefined, { weekday: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewDeckScreen({
  srsQueue,
  setSrsQueue,
  srsQueueIndex,
  setSrsQueueIndex,
  srsRevealed,
  setSrsRevealed,
  gradeCard,
  gradeRelearnCard,
  removeCard,
  awardSRSXP,
  playChime,
  setCurrentScreen,
  totalCount,
  getSessionQueue,
  sessionSummary,
  srsSettings,
  onChangeSrsSettings,
  forecast,
  trickyCards,
  putBackCard,
  rescheduleOverdueCards,
}: ReviewDeckScreenProps) {
            const [showSettings, setShowSettings] = useState(false);
            // S4: the Tricky cards panel, the inline "Remove for good?" confirmation, and plain status lines.
            const [showTricky, setShowTricky] = useState(false);
            const [confirmRemoveKey, setConfirmRemoveKey] = useState<string | null>(null);
            const [trickyNotice, setTrickyNotice] = useState<string | null>(null);
            // Cards that this sitting's Forgot answers set aside (reported plainly; never hidden).
            const [setAsideThisSession, setSetAsideThisSession] = useState(0);
            // S4: backlog tool: asking for confirmation, and the result line.
            const [confirmingReschedule, setConfirmingReschedule] = useState(false);
            const [rescheduleNotice, setRescheduleNotice] = useState<string | null>(null);
            // First-pass answers given in this sitting: what the end screen reports and what XP was awarded for.
            const [answeredThisSession, setAnsweredThisSession] = useState(0);
            const isDone = srsQueue.length === 0 || srsQueueIndex >= srsQueue.length;
            const currentCard = isDone ? null : srsQueue[srsQueueIndex];
            const vocabData  = currentCard?.type === "vocab"  ? VOCABULARY_DATA.find(v => v.word  === currentCard.itemKey) ?? null : null;
            const kanjiData  = currentCard?.type === "kanji"  ? KANJI_DATA.find(k => k.kanji === currentCard.itemKey) ?? null : null;
            const remaining  = srsQueue.length - srsQueueIndex;
            const pct        = srsQueue.length > 0 ? (srsQueueIndex / srsQueue.length) * 100 : 100;

            // S2: a card forgotten earlier in this session is queued again at the end. An entry is that
            // re-show (a "relearn pass") when the same card also appears earlier in the queue.
            const sameCardCount = currentCard ? srsQueue.filter((c) => c.itemKey === currentCard.itemKey).length : 0;
            const isRelearnPass = currentCard ? srsQueue.findIndex((c) => c.itemKey === currentCard.itemKey) !== srsQueueIndex : false;
            const canRequeue   = sameCardCount - 1 < MAX_RELEARN_REQUEUES;
            const hasCardData  = !!(vocabData || kanjiData);
            const cardsReviewed = answeredThisSession; // first passes only: relearn re-shows earn no XP and are not counted

            // S3: what each button would schedule (un-fuzzed). Same functions as the grading itself, so the labels cannot drift.
            const preview = currentCard ? previewIntervals(currentCard, Date.now(), { relearn: isRelearnPass }) : null;

            /** Grade the current card. First showings earn XP for any grade (as before); relearn re-shows do not. */
            const gradeCurrent = (grade: SrsGrade) => {
              const card = currentCard!;
              if (isRelearnPass) {
                gradeRelearnCard(card.itemKey, grade);
              } else {
                gradeCard(card.itemKey, grade);
                awardSRSXP(5);
                setAnsweredThisSession((count) => count + 1);
              }
              setRescheduleNotice(null);
              if (grade === "forgot") {
                const afterForgot = isRelearnPass ? card : scheduleGrade(card, "forgot", Date.now());
                if (afterForgot.leech === true) {
                  // S4: this Forgot set the card aside as tricky, so it is not re-shown. It is counted and reported.
                  if (!isRelearnPass && card.leech !== true) setSetAsideThisSession((count) => count + 1);
                } else if (canRequeue && hasCardData) {
                  // A forgotten card comes back at the end of this session, at most twice. It is queued in its
                  // post-forgot state (halved level), so the re-show's ring and previews match what is stored.
                  setSrsQueue((prev) => [...prev, afterForgot]);
                }
              }
              setSrsQueueIndex((prev) => prev + 1);
              setSrsRevealed(false);
              playChime(grade !== "forgot");
            };

            /** Orphan card (its word or kanji no longer exists): delete it and move on. */
            const removeCurrent = () => {
              removeCard(currentCard!.itemKey);
              setSrsQueueIndex((prev) => prev + 1);
              setSrsRevealed(false);
            };

            const startAnotherSet = () => {
              setAnsweredThisSession(0);
              setSetAsideThisSession(0);
              setSrsQueue(getSessionQueue());
              setSrsQueueIndex(0);
              setSrsRevealed(false);
            };

            /** S4: open or close the Tricky cards panel (it shares the spot of the daily limits panel). */
            const toggleTricky = () => {
              setShowTricky((open) => !open);
              setShowSettings(false);
              setConfirmRemoveKey(null);
              setTrickyNotice(null);
            };
            const openTricky = () => {
              setShowTricky(true);
              setShowSettings(false);
              setConfirmRemoveKey(null);
              setTrickyNotice(null);
            };

            /** S4: the backlog banner is only offered before a session starts or after it ends, never in the middle of one. */
            const backlogBannerVisible = sessionSummary.backlogOffer && (srsQueueIndex === 0 || isDone);
            const rescheduleDays = rescheduleSpreadDays(sessionSummary.veryOverdueCount, srsSettings);

            /** S4: the learner confirmed. A session that has not started gets its queue rebuilt; a finished one is left alone. */
            const confirmReschedule = () => {
              const outcome = rescheduleOverdueCards();
              setConfirmingReschedule(false);
              if (!outcome) {
                setRescheduleNotice("Nothing needed rescheduling.");
                return;
              }
              if (!isDone) {
                setSrsQueue(outcome.queue);
                setSrsQueueIndex(0);
                setSrsRevealed(false);
              }
              setRescheduleNotice(`${plural(outcome.count, "card")} rescheduled over the next ${plural(outcome.days, "day")}.`);
            };


  return (<motion.div
                key="review-deck-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5 max-w-lg mx-auto w-full"
              >
                {/* ── Header ────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen("menu")}
                    className="px-3 py-1.5 bg-natural-bg/40 border border-natural-border text-natural-forest-light text-xs rounded-lg hover:border-natural-forest hover:text-natural-forest font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="text-center">
                    <h3 className="font-serif font-extrabold text-natural-forest tracking-wider">
                      📦 Review Deck
                    </h3>
                    {!isDone && (
                      <span className="text-[10px] font-mono text-natural-forest-light uppercase tracking-widest font-bold">
                        {remaining} remaining
                      </span>
                    )}
                  </div>
                  {/* Daily limits (S2); also keeps the header centred */}
                  <div className="min-w-16 flex justify-end items-center gap-1.5">
                    {(trickyCards.length > 0 || showTricky) && (
                      <button
                        type="button"
                        onClick={toggleTricky}
                        aria-label={`Tricky cards: ${trickyCards.length} set aside`}
                        aria-expanded={showTricky}
                        className={`p-2 border rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          showTricky
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                            : "bg-natural-bg/40 border-natural-border text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                        }`}
                      >
                        <Flag className="w-4 h-4" />
                        <span className="text-[10px] font-mono font-bold leading-none">{trickyCards.length}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings((open) => !open);
                        setShowTricky(false);
                      }}
                      aria-label="Daily limits"
                      aria-expanded={showSettings}
                      className={`p-2 border rounded-lg transition cursor-pointer ${
                        showSettings
                          ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                          : "bg-natural-bg/40 border-natural-border text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                      }`}
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── 7-day forecast (S3) ───────────────────────────────── */}
                {totalCount > 0 && <ForecastStrip forecast={forecast} />}

                {/* ── Backlog recovery (S4): quiet, only when far behind, only with a confirmation ───── */}
                {backlogBannerVisible && (
                  <div className="kz-inset px-3 py-3 flex flex-col gap-2" role="region" aria-label="Review backlog">
                    <p className="text-xs text-natural-forest-light font-medium leading-relaxed">
                      {plural(sessionSummary.overdueBacklog, "card")} are waiting for review, and {sessionSummary.veryOverdueCount}{" "}
                      of them {sessionSummary.veryOverdueCount === 1 ? "is" : "are"} more than 60 days late.
                    </p>
                    {confirmingReschedule ? (
                      <>
                        <p className="text-xs text-natural-forest font-semibold leading-relaxed">
                          This moves {plural(sessionSummary.veryOverdueCount, "card")} back to level 1 and spreads them over the next{" "}
                          {plural(rescheduleDays, "day")}. Your other cards are not touched.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={confirmReschedule}
                            className="py-2 px-2 bg-natural-forest text-natural-bg rounded-lg text-xs font-bold hover:bg-natural-forest/90 transition cursor-pointer"
                          >
                            Reschedule {sessionSummary.veryOverdueCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingReschedule(false)}
                            className="py-2 px-2 border border-natural-border text-natural-forest-light rounded-lg text-xs font-bold hover:border-natural-forest hover:text-natural-forest transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingReschedule(true)}
                        className="py-2 px-3 border border-natural-border text-natural-forest-light rounded-lg text-xs font-bold hover:border-natural-forest hover:text-natural-forest transition cursor-pointer"
                      >
                        Reschedule very old overdue cards ({sessionSummary.veryOverdueCount})
                      </button>
                    )}
                  </div>
                )}
                {rescheduleNotice && (
                  <p role="status" className="text-center text-[11px] font-mono font-bold text-natural-clay">
                    {rescheduleNotice}
                  </p>
                )}

                {/* ── Daily limits panel (S2) ───────────────────────────── */}
                {showSettings && (
                  <div className="bg-natural-card border border-natural-border/70 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
                    <div>
                      <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-forest-light mb-2">
                        Reviews per day
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {REVIEW_CAP_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={srsSettings.dailyReviewCap === option}
                            onClick={() => onChangeSrsSettings({ dailyReviewCap: option, dailyNewCap: srsSettings.dailyNewCap })}
                            className={`py-2 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                              srsSettings.dailyReviewCap === option
                                ? "bg-natural-forest text-natural-bg border-natural-forest"
                                : "bg-natural-bg/40 border-natural-border text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                            }`}
                          >
                            {option >= UNLIMITED_REVIEWS ? "No limit" : option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-forest-light mb-2">
                        New cards per day
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {NEW_CAP_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={srsSettings.dailyNewCap === option}
                            onClick={() => onChangeSrsSettings({ dailyReviewCap: srsSettings.dailyReviewCap, dailyNewCap: option })}
                            className={`py-2 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                              srsSettings.dailyNewCap === option
                                ? "bg-natural-forest text-natural-bg border-natural-forest"
                                : "bg-natural-bg/40 border-natural-border text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-natural-forest-light/80 font-medium leading-relaxed">
                      Cards over the limit stay due and wait for your next session. Nothing is lost.
                    </p>
                  </div>
                )}

                {/* ── Tricky cards panel (S4) ───────────────────────────── */}
                {showTricky && (
                  <div
                    className="bg-natural-card border border-natural-border/70 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
                    role="region"
                    aria-label="Tricky cards"
                  >
                    <div>
                      <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-forest-light mb-1">
                        Tricky cards
                      </p>
                      <p className="text-[11px] text-natural-forest-light/80 font-medium leading-relaxed">
                        A card you have forgotten {LEECH_LAPSE_THRESHOLD} times is set aside so it stops crowding your sessions. Put it back
                        to start it again at level 0, or remove it for good.
                      </p>
                    </div>
                    {trickyNotice && (
                      <p role="status" className="text-[11px] font-mono font-bold text-natural-clay">
                        {trickyNotice}
                      </p>
                    )}
                    {trickyCards.length === 0 ? (
                      <p className="text-xs text-natural-forest-light font-medium">No tricky cards right now.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {trickyCards.map((card) => {
                          const { title, detail } = describeCard(card);
                          return (
                            <li key={card.itemKey} className="kz-inset px-3 py-2.5 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="text-xl font-serif font-extrabold text-natural-forest break-words">{title}</span>
                                  <span className="block text-xs text-natural-forest-light font-medium break-words">{detail}</span>
                                </div>
                                <span className="shrink-0 text-[10px] font-mono font-bold text-natural-forest-light">
                                  forgotten {plural(card.lapses ?? 0, "time")}
                                </span>
                              </div>
                              {confirmRemoveKey === card.itemKey ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      removeCard(card.itemKey);
                                      setConfirmRemoveKey(null);
                                      setTrickyNotice(`${title} removed.`);
                                    }}
                                    className="py-2 px-2 border border-natural-terracotta/40 text-natural-terracotta rounded-lg text-xs font-bold hover:bg-natural-terracotta/10 transition cursor-pointer"
                                  >
                                    Remove for good
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemoveKey(null)}
                                    className="py-2 px-2 border border-natural-border text-natural-forest-light rounded-lg text-xs font-bold hover:border-natural-forest hover:text-natural-forest transition cursor-pointer"
                                  >
                                    Keep it
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      putBackCard(card.itemKey);
                                      setTrickyNotice(`${title} put back at level 0. It will come up in your next session.`);
                                    }}
                                    className="py-2 px-2 bg-natural-forest/10 border border-natural-forest/40 text-natural-forest rounded-lg text-xs font-bold hover:bg-natural-forest/20 transition cursor-pointer"
                                  >
                                    Put back
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemoveKey(card.itemKey)}
                                    className="py-2 px-2 border border-natural-terracotta/40 text-natural-terracotta rounded-lg text-xs font-bold hover:bg-natural-terracotta/10 transition cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* ── Progress bar ──────────────────────────────────────── */}
                <div className="w-full bg-natural-border/30 rounded-full h-1.5">
                  <div
                    className="bg-natural-forest h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {!isDone && setAsideThisSession > 0 && (
                  <p className="text-center text-[11px] font-mono font-bold text-natural-clay">
                    {plural(setAsideThisSession, "tricky card")} set aside this session · see the flag above
                  </p>
                )}

                {isDone ? (
                  /* ── Session end / nothing to do today ──────────────────── */
                  <div className="bg-natural-card border border-natural-border/70 rounded-3xl p-10 flex flex-col items-center gap-5 text-center shadow-sm">
                    <span className="text-6xl">🌸</span>
                    <div>
                      <h4 className="font-serif font-extrabold text-xl text-natural-forest mb-2">
                        {totalCount === 0 ? "Your deck is empty" : "Done for today!"}
                      </h4>
                      {totalCount > 0 && (
                        <p className="text-sm text-natural-forest-light font-medium leading-relaxed">
                          {cardsReviewed > 0
                            ? `You reviewed ${plural(cardsReviewed, "card")} this session.`
                            : "Nothing is waiting for you right now."}
                        </p>
                      )}
                      {totalCount > 0 && sessionSummary.nextDueAt !== null && (
                        <p className="mt-2 text-xs font-mono font-bold text-natural-forest-light">
                          Next card due {formatNextDue(sessionSummary.nextDueAt, Date.now())}
                        </p>
                      )}
                      {sessionSummary.waitingCount > 0 && (
                        <p className="mt-1 text-xs font-mono font-bold text-natural-forest-light/80">
                          +{sessionSummary.waitingCount} waiting for a later session
                        </p>
                      )}
                      {sessionSummary.newPaused && (
                        <p className="mt-2 text-[11px] text-natural-forest-light/80 font-medium">
                          New cards are paused until your reviews catch up.
                        </p>
                      )}
                      {totalCount > 0 && trickyCards.length > 0 && (
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <p className="text-xs font-mono font-bold text-natural-clay">
                            {plural(trickyCards.length, "tricky card")} set aside
                            {setAsideThisSession > 0 ? ` · ${setAsideThisSession} new this session` : ""}
                          </p>
                          <button
                            type="button"
                            onClick={openTricky}
                            className="text-[11px] font-mono font-bold underline underline-offset-2 text-natural-forest-light hover:text-natural-forest cursor-pointer"
                          >
                            View tricky cards
                          </button>
                        </div>
                      )}
                      {cardsReviewed > 0 && (
                        <p className="mt-3 text-xs font-mono font-bold text-natural-clay bg-natural-clay/10 px-3 py-1.5 rounded-lg inline-block">
                          +{cardsReviewed * 5} XP earned this session ✨
                        </p>
                      )}
                      {totalCount === 0 && (
                        <p className="mt-3 text-xs text-natural-forest-light/70 font-medium">
                          Head to the Learn tab and tap ➕ on any word or kanji to add cards!
                        </p>
                      )}
                    </div>
                    {sessionSummary.total > 0 && (
                      <button
                        type="button"
                        onClick={startAnotherSet}
                        className="px-6 py-2.5 bg-natural-forest text-natural-bg rounded-xl text-sm font-serif font-bold hover:bg-natural-forest/90 transition cursor-pointer shadow-sm"
                      >
                        Study {sessionSummary.total} more
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentScreen("menu")}
                      className={
                        sessionSummary.total > 0
                          ? "px-6 py-2.5 border border-natural-border text-natural-forest-light rounded-xl text-sm font-serif font-bold hover:border-natural-forest hover:text-natural-forest transition cursor-pointer"
                          : "px-6 py-2.5 bg-natural-forest text-natural-bg rounded-xl text-sm font-serif font-bold hover:bg-natural-forest/90 transition cursor-pointer shadow-sm"
                      }
                    >
                      Back to Menu
                    </button>
                  </div>
                ) : (
                  /* ── Active card review ───────────────────────────────── */
                  <>
                    {/* Card type badge */}
                    <div className="flex justify-center">
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-natural-clay bg-natural-clay/10 px-3 py-1 rounded-full">
                        {isRelearnPass ? "Relearning" : currentCard!.type === "vocab" ? "Vocabulary" : "Kanji"} — Recall the meaning
                      </span>
                    </div>

                    {/* ── Flash card ──────────────────────────────────── */}
                    <div className="kz-specimen relative shadow-sm px-6 pt-12 pb-6 sm:px-8 flex flex-col items-center gap-3 text-center min-h-[220px] justify-center break-words">
                      <LevelRing level={currentCard!.level} />
                      {currentCard!.type === "vocab" && vocabData ? (
                        <>
                          <span className="text-5xl font-serif font-extrabold text-natural-forest leading-tight">
                            {vocabData.word}
                          </span>
                          {vocabData.hiragana !== vocabData.word && (
                            <span className="text-xl font-serif text-natural-forest/70">
                              {vocabData.hiragana}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-natural-forest-light uppercase tracking-widest font-bold">
                            {vocabData.romaji}
                          </span>
                          {srsRevealed && (
                            <div className="mt-3 pt-4 border-t border-[color:var(--kz-border-strong)] w-full">
                              <span className="text-base font-serif italic text-natural-charcoal font-medium">
                                {vocabData.english}
                              </span>
                            </div>
                          )}
                        </>
                      ) : currentCard!.type === "kanji" && kanjiData ? (
                        <>
                          <span className="text-[80px] font-serif font-extrabold text-natural-forest my-1 tracking-normal leading-none">
                            {kanjiData.kanji}
                          </span>
                          <span className="text-xs font-mono text-natural-forest-light uppercase tracking-wide font-bold">
                            {kanjiData.strokeCount} strokes
                          </span>
                          {srsRevealed && (
                            <div className="mt-3 pt-4 border-t border-[color:var(--kz-border-strong)] w-full">
                              <span className="text-base font-serif font-bold text-natural-charcoal block">
                                {kanjiData.meaning}
                              </span>
                              <span className="text-xs font-mono text-natural-forest-light block mt-1">
                                {kanjiData.kunyomi && `kun: ${kanjiData.kunyomi}`}{kanjiData.kunyomi && kanjiData.onyomi ? " · " : ""}{kanjiData.onyomi && `on: ${kanjiData.onyomi}`}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-natural-forest-light font-mono italic">
                            Card not found: {currentCard!.itemKey}
                          </span>
                          <button
                            type="button"
                            onClick={removeCurrent}
                            className="mt-1 px-3 py-1.5 border border-natural-terracotta/40 text-natural-terracotta rounded-lg text-xs font-bold hover:bg-natural-terracotta/10 transition cursor-pointer"
                          >
                            Remove this card
                          </button>
                        </>
                      )}
                    </div>

                    {/* ── Action buttons ───────────────────────────────── */}
                    {!srsRevealed ? (
                      <button
                        type="button"
                        onClick={() => setSrsRevealed(true)}
                        className="w-full py-3.5 bg-natural-forest/10 border border-natural-forest/40 rounded-xl text-sm font-serif font-bold text-natural-forest hover:bg-natural-forest/20 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        👁 Reveal Answer
                      </button>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => gradeCurrent("forgot")}
                          aria-label={`Forgot. See it again in about ${formatIntervalShort(preview!.forgot)}`}
                          className="py-3 px-1 bg-natural-terracotta/10 border border-natural-terracotta/40 text-natural-terracotta rounded-xl text-sm font-bold hover:bg-natural-terracotta/20 transition cursor-pointer flex flex-col items-center gap-1"
                        >
                          <span className="flex items-center gap-1.5"><X className="w-4 h-4" /> Forgot</span>
                          <span className="text-[10px] font-mono font-bold">~{formatIntervalShort(preview!.forgot)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => gradeCurrent("hard")}
                          aria-label={`Hard. See it again in about ${formatIntervalShort(preview!.hard)}`}
                          className="py-3 px-1 bg-natural-clay/10 border border-natural-clay/40 text-natural-clay rounded-xl text-sm font-bold hover:bg-natural-clay/20 transition cursor-pointer flex flex-col items-center gap-1"
                        >
                          <span className="flex items-center gap-1.5"><Minus className="w-4 h-4" /> Hard</span>
                          <span className="text-[10px] font-mono font-bold">~{formatIntervalShort(preview!.hard)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => gradeCurrent("gotIt")}
                          aria-label={`Got it. See it again in about ${formatIntervalShort(preview!.gotIt)}`}
                          className="py-3 px-1 bg-natural-forest/10 border border-natural-forest/40 text-natural-forest rounded-xl text-sm font-bold hover:bg-natural-forest/20 transition cursor-pointer flex flex-col items-center gap-1"
                        >
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Got it</span>
                          <span className="text-[10px] font-mono font-bold">~{formatIntervalShort(preview!.gotIt)}</span>
                        </button>
                      </div>
                    )}

                    {/* Position in the session (the level is shown by the ring on the card) */}
                    <p className="text-center text-[10px] font-mono text-natural-forest-light/60 font-bold uppercase tracking-widest">
                      {isRelearnPass ? "Relearning · no XP · " : ""}{srsQueueIndex + 1} of {srsQueue.length}
                    </p>
                  </>
                )}
              </motion.div>
  );
}