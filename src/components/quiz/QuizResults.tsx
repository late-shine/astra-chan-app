// Quiz Remake QZ1: the results screen. Presentational.
//
// "7 of 10 correct first try" leads; the percentage is secondary text. XP breakdown, an optional
// streak line, ONE recommended action ("Practice your misses", or "Try another round" when nothing was
// missed), a separate "Add up to 5 to Review Deck", the missed-item list, then "Another round" and
// "Back to Practice". No judgement labels. A repair round never rewrites first-try accuracy: the
// repair line is a separate sentence. One small star flourish plays once (reduced motion: none).
// Summary and the missed list sit in two columns from 960 px.

import type { ReactNode } from "react";
import { StudioHeader, StudioMark, StudioShell, type StudioPresentation } from "./StudioShell";
import type { QuizResultsActions, QuizResultsView } from "./viewTypes";

export interface QuizResultsProps {
  view: QuizResultsView;
  actions: QuizResultsActions;
  shell?: StudioPresentation;
  status?: ReactNode;
}

export function QuizResults({ view, actions, shell, status }: QuizResultsProps) {
  const header = (
    <StudioHeader backLabel="Back to Practice" onBack={actions.onBackToPractice}>
      <p className="quiz-header__progress">Results</p>
      <p className="quiz-header__label">{view.contextLabel}</p>
    </StudioHeader>
  );

  return (
    <StudioShell label="Practice results" header={header} width="results" companion={view.companion ?? {
      expression: "intro", speech: "A little practice is time well spent.",
    }} {...shell}>
      <div className="quiz-results">
        <section className="quiz-card quiz-summary" aria-labelledby="quiz-results-headline">
          <span className="quiz-reco__mark quiz-results__star" aria-hidden="true">
            <StudioMark />
          </span>
          <h1 id="quiz-results-headline" className="quiz-results__headline">
            {view.headline}
          </h1>
          <p className="quiz-results__percent">{view.percentLabel}</p>
          {view.detail && <p className="quiz-body">{view.detail}</p>}
          {view.repairLine && <p className="quiz-body">{view.repairLine}</p>}
          {view.encouragement && <p className="quiz-body">{view.encouragement}</p>}

          <dl className="quiz-xp">
            {view.xpLines.map((line) => (
              <div className="quiz-xp__row" key={line.label}>
                <dt>{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
            <div className="quiz-xp__row quiz-xp__row--total">
              <dt>Total</dt>
              <dd>{view.xpTotal}</dd>
            </div>
          </dl>
          {view.streakLine && <p className="quiz-streak">{view.streakLine}</p>}
          {view.saveLabel && <p className="quiz-help">{view.saveLabel}</p>}
          {status}

          <div className="quiz-stack">
            <button type="button" className="quiz-btn quiz-btn--primary quiz-btn--block" onClick={actions.onPrimary}>
              {view.primaryLabel}
            </button>
            {view.reviewDeckLabel && (
              <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block" onClick={actions.onAddToReviewDeck}>
                {view.reviewDeckLabel}
              </button>
            )}
          </div>
        </section>

        <section className="quiz-card quiz-missed" aria-labelledby="quiz-missed-title">
          <h2 id="quiz-missed-title" className="quiz-section-title">
            Missed items
          </h2>
          {view.missed.length === 0 ? (
            <p className="quiz-body">Nothing missed this round.</p>
          ) : (
            <ul className="quiz-missed__list">
              {view.missed.map((item) => (
                <li className="quiz-missed__item" key={item.id}>
                  <span className="quiz-jp quiz-missed__prompt" data-size={item.promptSize} lang="ja">
                    {item.prompt}
                  </span>
                  <span className="quiz-missed__text">
                    <span className="quiz-missed__answer">Answer: {item.correctAnswer}</span>
                    <span className="quiz-help">You chose: {item.yourAnswer}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="quiz-results__more">
          {actions.onAnotherRound && <button type="button" className="quiz-btn quiz-btn--secondary" onClick={actions.onAnotherRound}>
            Another round
          </button>}
          <button type="button" className="quiz-btn quiz-btn--secondary" onClick={actions.onBackToPractice}>
            Back to Practice
          </button>
        </div>
      </div>
    </StudioShell>
  );
}
