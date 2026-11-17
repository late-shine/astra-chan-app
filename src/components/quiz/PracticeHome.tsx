// The Practice arrival and subject setup share one surface. Session decisions stay in the flow.
import { useEffect, useRef, type RefObject } from "react";
import { BookOpen, ChevronRight, Flame, Languages, Layers, SlidersHorizontal, Timer, Users } from "lucide-react";
import { StudioSegmented } from "./StudioShell";
import type { ChallengeId, PracticeHomeActions, PracticeHomeView, QuizSubject } from "./viewTypes";
import "./practice-home.css";

const SUBJECT_COPY: Record<QuizSubject, { description: string; invitation: string; icon: typeof BookOpen }> = {
  kana: { description: "Characters and sounds", invitation: "A little rhythm, one character at a time.", icon: Languages },
  words: { description: "Everyday vocabulary", invitation: "Familiar words, new connections.", icon: BookOpen },
  kanji: { description: "Meanings and readings", invitation: "Meanings, readings, and a little discovery.", icon: Layers },
};
const CHALLENGE_ICONS: Record<ChallengeId, typeof Timer> = { timed: Timer, survival: Flame, friend: Users };

export interface PracticeHomeProps {
  view: PracticeHomeView;
  actions: PracticeHomeActions;
  /** Stable launcher for the setup sheet's return focus. */
  customizeRef?: RefObject<HTMLButtonElement | null>;
}

export function PracticeHome({ view, actions, customizeRef }: PracticeHomeProps) {
  const { resume, recommendation, subjects, subject, challenges, reviewDeck, focus } = view;
  const entered = view.entered ?? true;
  const optionsRef = useRef<HTMLDivElement>(null);
  const previousArrivalRef = useRef(view.arrivalId);
  const selectedSubject = subjects.find((option) => option.id === subject);
  const selectedCopy = SUBJECT_COPY[subject];
  const startBlocked = Boolean(resume || recommendation.blocked);
  const friend = challenges.find((challenge) => challenge.id === "friend");
  const soloChallenges = challenges.filter((challenge) => challenge.id !== "friend");

  // Animate the existing surface: remounting it would lose keyboard or modal-return focus.
  useEffect(() => {
    const changed = previousArrivalRef.current !== view.arrivalId;
    previousArrivalRef.current = view.arrivalId;
    const element = optionsRef.current;
    if (!changed || !element || !element.animate ||
      element.closest('[data-motion="reduced"]') ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = element.animate(
      [{ opacity: 0.45, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 200, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [view.arrivalId]);

  return (
    <div className="quiz-home practice-home" data-entered={entered}>
      {resume && (
        <section className="quiz-card quiz-resume" aria-label="Resume practice">
          <div className="quiz-resume__text">
            <p className="quiz-resume__title">Pick up where you left off</p>
            <p className="quiz-body">{resume.subjectLabel} · {resume.positionLabel}</p>
          </div>
          <div className="quiz-resume__actions">
            <button type="button" className="quiz-btn quiz-btn--primary" onClick={actions.onResume}>
              {resume.actionLabel ?? "Resume"}
            </button>
            <button type="button" className="quiz-btn quiz-btn--secondary" onClick={actions.onDiscardResume}>Discard</button>
          </div>
        </section>
      )}

      <div className="practice-home__heading">
        <h1 className="quiz-title practice-home__title">
          {entered ? `${selectedSubject?.label ?? subject} practice` : "Choose your practice"}
        </h1>
        <p className="quiz-body practice-home__invitation">
          {entered ? selectedCopy.invitation : "A little time, a little progress."}
        </p>
      </div>

      <div className="practice-subjects" role="group" aria-label="Subject">
        {subjects.map((option) => {
          const copy = SUBJECT_COPY[option.id];
          const Icon = copy.icon;
          return (
            <button key={option.id} type="button" className="practice-subject"
              aria-pressed={option.id === subject} aria-disabled={Boolean(resume) || undefined}
              onClick={() => actions.onSelectSubject(option.id)}>
              <Icon className="practice-subject__icon" aria-hidden="true" />
              <span className="practice-subject__text">
                <span className="practice-subject__name">{option.label}</span>
                <span className="practice-subject__description">{copy.description}</span>
              </span>
              <ChevronRight className="practice-subject__arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="practice-subject-detail" hidden={entered}>{selectedCopy.description}</p>

      <div ref={optionsRef} className="practice-home__options">
        {entered && focus && (
          <fieldset className="practice-focus" disabled={Boolean(resume)}>
            <legend className="practice-home__label">Focus</legend>
            <StudioSegmented label="Question type" options={focus.options} value={focus.value}
              onChange={(kind) => actions.onFocusChange?.(kind)} columns={2} />
          </fieldset>
        )}

        <section className="practice-session" aria-label="Session summary">
          <p className="practice-home__label">
            {!entered && view.hasPracticed ? "Your usual practice" : entered ? "Your session" : "Ready when you are"}
          </p>
          <p className="practice-session__summary">{recommendation.summary}</p>
          {recommendation.details && <p className="quiz-help practice-session__material">{recommendation.details}</p>}
          <p className="quiz-help practice-session__note">{resume ? 'Resume or discard your saved round before starting another.' : recommendation.note}</p>
          <div className="practice-session__actions">
            <button type="button" aria-disabled={startBlocked || undefined}
              className="quiz-btn quiz-btn--primary" onClick={() => { if (!startBlocked) actions.onStart(); }}>
              {!entered && view.hasPracticed && recommendation.cta === "Start practice" ? "Start usual practice" : recommendation.cta}
            </button>
            <button ref={customizeRef} type="button" className="quiz-btn quiz-btn--secondary"
              aria-disabled={Boolean(resume) || undefined} onClick={() => { if (!resume) actions.onCustomize(); }}>
              <SlidersHorizontal aria-hidden="true" />Adjust session
            </button>
          </div>
        </section>

        {entered && soloChallenges.length > 0 && (
          <div className="practice-modes" role="group" aria-label="Other practice modes">
            {soloChallenges.map((challenge) => {
              const Icon = CHALLENGE_ICONS[challenge.id];
              return (
                <button key={challenge.id} type="button" className="practice-mode"
                  aria-disabled={Boolean(resume) || undefined}
                  onClick={() => { if (!resume) actions.onChallenge(challenge.id); }}>
                  <Icon aria-hidden="true" />
                  <span><span className="practice-mode__title">{challenge.title}</span>
                    <span className="quiz-help">{challenge.description}</span></span>
                  <ChevronRight className="practice-mode__arrow" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="practice-home__links">
        <button type="button" className="practice-home__link" onClick={actions.onOpenReviewDeck}
          title={reviewDeck.detail}>
          <Layers aria-hidden="true" /><span>{reviewDeck.title}</span>
          <span className="practice-home__badge">{reviewDeck.badge}</span>
        </button>
        {friend && (
          <button type="button" className="practice-home__link" aria-disabled={Boolean(resume) || undefined}
            onClick={() => { if (!resume) actions.onChallenge("friend"); }}>
            <Users aria-hidden="true" /><span>{friend.title}</span><ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
