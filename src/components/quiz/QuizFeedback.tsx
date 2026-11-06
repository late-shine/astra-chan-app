// Quiz Remake QZ1: the compact feedback block under the answers. Presentational.
//
// Short by default: verdict (icon + words, never colour alone), the correct answer, one useful
// sentence. "Why?" expands a mnemonic / example or a curated confusion comparison. "Listen" lives
// here, never before grading. Review Deck actions are deliberately NOT here (they belong on results).
//
// Auto-next rule (S1.3): any pointer interaction with this block, focusing one of its actions,
// opening Why or playing audio cancels auto-next for THIS question. This component only reports
// that interaction through `onInteract`; the owner of the timer decides (and never restarts it).

import { useId } from "react";
import { Check, Clock, Lightbulb, Pause, Volume2, X } from "lucide-react";
import type { AutoNextView, QuizFeedbackView } from "./viewTypes";

export interface QuizFeedbackProps {
  view: QuizFeedbackView;
  whyOpen: boolean;
  onToggleWhy: () => void;
  onListen?: () => void;
  /** Pointer over/down on the block, or focus entering one of its actions. */
  onInteract?: () => void;
  /** Correct answers only, and only while auto-next is on. The owner runs the 1,600 ms deadline. */
  autoNext?: AutoNextView;
  /** Pause cancels auto-next for this question. */
  onPauseAutoNext?: () => void;
}

export function QuizFeedback({ view, whyOpen, onToggleWhy, onListen, onInteract, autoNext, onPauseAutoNext }: QuizFeedbackProps) {
  const whyId = useId();
  const Icon = view.outcome === "correct" ? Check : view.outcome === "wrong" ? X : Clock;

  return (
    <section
      className="quiz-feedback"
      data-outcome={view.outcome}
      aria-label="Feedback"
      onPointerDown={onInteract}
      onPointerEnter={onInteract}
      onFocusCapture={onInteract}
    >
      <div className="quiz-feedback__head">
        <span className="quiz-feedback__icon" aria-hidden="true">
          <Icon />
        </span>
        <div className="quiz-feedback__text">
          <p className="quiz-feedback__verdict">{view.verdict}</p>
          <p className="quiz-feedback__answer">Answer: {view.correctAnswer}</p>
          {view.yourAnswer && <p className="quiz-feedback__yours">You chose: {view.yourAnswer}</p>}
        </div>
      </div>

      <p className="quiz-feedback__sentence">{view.sentence}</p>

      {autoNext && autoNext.phase !== "cancelled" && (
        <div className="quiz-autonext" data-phase={autoNext.phase} data-frozen={autoNext.frozen ? "true" : undefined}>
          <span className="quiz-autonext__label">{autoNext.label}</span>
          {autoNext.phase === "counting" && (
            <button type="button" className="quiz-btn quiz-btn--quiet" onClick={onPauseAutoNext}>
              <Pause aria-hidden="true" />
              Pause
            </button>
          )}
          {autoNext.phase === "counting" && <span className="quiz-autonext__bar" aria-hidden="true" />}
        </div>
      )}

      {(view.why || view.canListen) && (
        <div className="quiz-feedback__actions">
          {view.why && (
            <button type="button" className="quiz-btn quiz-btn--quiet" aria-expanded={whyOpen} aria-controls={whyId} onClick={onToggleWhy}>
              <Lightbulb aria-hidden="true" />
              Why?
            </button>
          )}
          {view.canListen && (
            <button type="button" className="quiz-btn quiz-btn--quiet" onClick={onListen}>
              <Volume2 aria-hidden="true" />
              Listen
            </button>
          )}
        </div>
      )}

      {view.why && (
        <div id={whyId} className="quiz-why" hidden={!whyOpen}>
          {view.why.mnemonic && (
            <div className="quiz-why__block">
              <p className="quiz-why__label">Memory hook</p>
              <p className="quiz-why__body">{view.why.mnemonic}</p>
            </div>
          )}
          {view.why.example && (
            <div className="quiz-why__block">
              <p className="quiz-why__label">Example</p>
              <p className="quiz-why__body">
                <span className="quiz-jp quiz-why__ja">{view.why.example.ja}</span>
                {view.why.example.reading && <span className="quiz-why__reading"> ({view.why.example.reading})</span>}
                <span> — {view.why.example.en}</span>
              </p>
            </div>
          )}
          {view.why.comparison && (
            <div className="quiz-why__block">
              <p className="quiz-why__label">Easy to mix up</p>
              <div className="quiz-compare">
                <div className="quiz-compare__cell">
                  <span className="quiz-jp quiz-compare__glyph">{view.why.comparison.left.glyph}</span>
                  <span className="quiz-help">{view.why.comparison.left.label}</span>
                </div>
                <div className="quiz-compare__cell">
                  <span className="quiz-jp quiz-compare__glyph">{view.why.comparison.right.glyph}</span>
                  <span className="quiz-help">{view.why.comparison.right.label}</span>
                </div>
              </div>
              <p className="quiz-why__body">{view.why.comparison.note}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
