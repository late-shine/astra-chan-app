// Quiz Remake QZ1: the Practice home. Presentational.
//
// Order (S1.2): resume banner if present, heading "Practice", ONE recommended session card, the
// Kana | Words | Kanji selector, a secondary Customize button, a compact Challenge section and the
// Review Deck link. One press on "Start practice" is the whole path to question one.
// Nothing here picks a recommendation or reads history; the caller hands in the finished view.

import type { RefObject } from "react";
import { ChevronRight, Flame, Layers, SlidersHorizontal, Timer, Users } from "lucide-react";
import { StudioMark, StudioSegmented } from "./StudioShell";
import type { ChallengeId, PracticeHomeActions, PracticeHomeView } from "./viewTypes";

const CHALLENGE_ICONS: Record<ChallengeId, typeof Timer> = {
  timed: Timer,
  survival: Flame,
  friend: Users,
};

export interface PracticeHomeProps {
  view: PracticeHomeView;
  actions: PracticeHomeActions;
  /** The Customize button, so the setup sheet can return focus to it. */
  customizeRef?: RefObject<HTMLButtonElement | null>;
}

export function PracticeHome({ view, actions, customizeRef }: PracticeHomeProps) {
  const { resume, recommendation, subjects, subject, challenges, reviewDeck } = view;

  return (
    <div className="quiz-home">
      {resume && (
        <section className="quiz-card quiz-resume" aria-label="Resume practice">
          <div className="quiz-resume__text">
            <p className="quiz-resume__title">Pick up where you left off</p>
            <p className="quiz-body">
              {resume.subjectLabel} · {resume.positionLabel}
            </p>
          </div>
          <div className="quiz-resume__actions">
            <button type="button" className="quiz-btn quiz-btn--primary" onClick={actions.onResume}>
              Resume
            </button>
            <button type="button" className="quiz-btn quiz-btn--secondary" onClick={actions.onDiscardResume}>
              Discard
            </button>
          </div>
        </section>
      )}

      <h1 className="quiz-title quiz-home__title">Practice</h1>

      <section className="quiz-card quiz-reco" aria-labelledby="quiz-reco-summary">
        <span className="quiz-reco__mark" aria-hidden="true">
          <StudioMark />
        </span>
        <p className="quiz-eyebrow">{recommendation.eyebrow}</p>
        <h2 id="quiz-reco-summary" className="quiz-reco__summary">
          {recommendation.summary}
        </h2>
        <p className="quiz-body">{recommendation.note}</p>
        <button type="button" className="quiz-btn quiz-btn--primary quiz-btn--block quiz-reco__cta" onClick={actions.onStart}>
          {recommendation.cta}
        </button>
      </section>

      <div className="quiz-home__side">
        <div className="quiz-home__group">
          <StudioSegmented label="Subject" options={subjects} value={subject} onChange={actions.onSelectSubject} columns={3} />
          <button ref={customizeRef} type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block" onClick={actions.onCustomize}>
            <SlidersHorizontal aria-hidden="true" />
            Customize
          </button>
        </div>

        <section className="quiz-home__group" aria-labelledby="quiz-challenge-title">
          <h2 id="quiz-challenge-title" className="quiz-section-title">
            Challenge
          </h2>
          <ul className="quiz-list">
            {challenges.map((challenge) => {
              const Icon = CHALLENGE_ICONS[challenge.id];
              return (
                <li key={challenge.id}>
                  <button type="button" className="quiz-row" onClick={() => actions.onChallenge(challenge.id)}>
                    <span className="quiz-row__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="quiz-row__text">
                      <span className="quiz-row__title">{challenge.title}</span>
                      <span className="quiz-help">{challenge.description}</span>
                    </span>
                    <ChevronRight className="quiz-row__chevron" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <button type="button" className="quiz-row quiz-row--muted" onClick={actions.onOpenReviewDeck}>
          <span className="quiz-row__icon" aria-hidden="true">
            <Layers />
          </span>
          <span className="quiz-row__text">
            <span className="quiz-row__title">{reviewDeck.title}</span>
            <span className="quiz-help">{reviewDeck.detail}</span>
          </span>
          <span className="quiz-chip">{reviewDeck.badge}</span>
          <ChevronRight className="quiz-row__chevron" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
