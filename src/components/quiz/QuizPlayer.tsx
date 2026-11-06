// Quiz Remake QZ1: the question screen. Presentational.
//
// Header: Exit, progress "4 / 10", a small subject/kind label, More menu (the persistent auto-next
// switch). Timed modes add a timer row; untimed practice has NO empty timer track. Below: instruction,
// the large prompt, then answer buttons (or a typed field), then the compact feedback block the owner
// passes in. The Next action sits in a sticky footer INSIDE the scrolling region, so a long
// explanation can never push it under the dock.
//
// Contract notes for later phases:
//  - Answers are real <button>s. Once answered they are LOCKED with aria-disabled + a guard (not
//    `disabled`), so keyboard focus is not thrown away. They are actions, not toggles.
//  - Correct / wrong is shown with text + icon on the buttons, never colour alone.
//  - One polite live region announces the outcome (`announcement`); it never announces a countdown.
//  - `promptRef` / `inputRef` let the owner move focus after a manual Next.
//  - LeavePracticeSheet is the S1.4 exit sheet. It is exported from here and uses StudioSheet.

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Check, Ellipsis, X } from "lucide-react";
import { StudioHeader, StudioShell, StudioSheet, StudioSwitch, type StudioShellProps } from "./StudioShell";
import type { QuizAnswerState, QuizChoiceView, QuizPlayerActions, QuizQuestionView } from "./viewTypes";

type ChoiceState = "idle" | "correct" | "wrong" | "locked";

function choiceState(choice: QuizChoiceView, answer: QuizAnswerState): ChoiceState {
  if (answer.status !== "answered") return "idle";
  if (choice.id === answer.correctId) return "correct";
  if (choice.id === answer.selectedId) return "wrong";
  return "locked";
}

/* ───────────────────────────── More menu ───────────────────────────── */

function QuizMoreMenu({ autoNext, onAutoNextChange }: { autoNext: boolean; onAutoNextChange: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="quiz-more"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="quiz-icon-btn"
        aria-label="More options"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="quiz-popover" role="group" aria-label="More options">
          <StudioSwitch
            checked={autoNext}
            onChange={onAutoNextChange}
            label="Auto-next after correct answers"
            description="Wrong answers always wait for Next."
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Leave sheet (S1.4) ───────────────────────────── */

export interface LeavePracticeSheetProps {
  /** Zero answers: nothing to save, so the sheet offers a direct discard instead. */
  answeredCount: number;
  onKeepPracticing: () => void;
  onSaveAndLeave: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function LeavePracticeSheet({ answeredCount, onKeepPracticing, onSaveAndLeave, onFinish, onDiscard, returnFocusRef }: LeavePracticeSheetProps) {
  const hasAnswers = answeredCount > 0;
  return (
    <StudioSheet title="Leave this practice?" closeLabel="Keep practicing" onClose={onKeepPracticing} size="compact" returnFocusRef={returnFocusRef}>
      <div className="quiz-form">
        <p className="quiz-body">{hasAnswers ? "Your saved answers will stay." : "You have not answered anything yet, so nothing needs saving."}</p>
        <div className="quiz-stack">
          <button type="button" className="quiz-btn quiz-btn--primary quiz-btn--block" onClick={onKeepPracticing}>
            Keep practicing
          </button>
          {hasAnswers ? (
            <>
              <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block" onClick={onSaveAndLeave}>
                Save and leave
              </button>
              <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block" onClick={onFinish}>
                Finish and see results
              </button>
            </>
          ) : (
            <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block" onClick={onDiscard}>
              Discard and leave
            </button>
          )}
        </div>
      </div>
    </StudioSheet>
  );
}

/* ───────────────────────────── Player ───────────────────────────── */

export interface QuizPlayerProps {
  question: QuizQuestionView;
  answer: QuizAnswerState;
  /** The typed field's current text (typed mode). */
  typedValue: string;
  /** Persistent auto-next setting, shown in the More menu. */
  autoNextEnabled: boolean;
  /** The compact feedback block (a <QuizFeedback/>). Rendered only after the question is answered. */
  feedback?: ReactNode;
  /** Plain text for the single polite live region. Empty before the answer. */
  announcement: string;
  actions: QuizPlayerActions;
  /** Focus target after a manual Next (choice mode). */
  promptRef?: RefObject<HTMLDivElement | null>;
  /** Focus target after a manual Next (typed mode). */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Pass-through for the studio frame: theme override, reduced motion, keyboard-open, modal-open and the sheet overlay. */
  shell?: Pick<StudioShellProps, "themeId" | "reducedMotion" | "keyboardOpen" | "modalOpen" | "overlay">;
}

export function QuizPlayer({ question, answer, typedValue, autoNextEnabled, feedback, announcement, actions, promptRef, inputRef, shell }: QuizPlayerProps) {
  const inputId = useId();
  const answered = answer.status === "answered";
  const isLast = question.index >= question.total - 1;
  const typed = question.mode === "typed";
  const canCheck = typedValue.trim().length > 0;
  const outcome = answer.status === "answered" ? answer.outcome : undefined;

  const header = (
    <StudioHeader
      backLabel="Exit practice"
      backIcon="close"
      onBack={actions.onExit}
      progress={(question.index + (answered ? 1 : 0)) / Math.max(1, question.total)}
      trailing={<QuizMoreMenu autoNext={autoNextEnabled} onAutoNextChange={actions.onAutoNextChange} />}
    >
      <p className="quiz-header__progress">
        {question.index + 1} / {question.total}
      </p>
      <p className="quiz-header__label">
        {question.subjectLabel} · {question.kindLabel}
      </p>
    </StudioHeader>
  );

  // Footer: ONE primary action with constant geometry, so feedback appearing never makes it jump.
  let footerAction: ReactNode;
  if (typed && !answered) {
    footerAction = (
      <button
        type="button"
        className="quiz-btn quiz-btn--primary quiz-btn--block"
        aria-disabled={canCheck ? undefined : true}
        onClick={(event) => {
          if (canCheck) actions.onSubmitTyped(event);
        }}
      >
        Check answer
      </button>
    );
  } else {
    footerAction = (
      <button
        type="button"
        className="quiz-btn quiz-btn--primary quiz-btn--block"
        aria-disabled={answered ? undefined : true}
        onClick={() => {
          if (answered) actions.onNext();
        }}
      >
        {isLast ? "See results" : "Next"}
      </button>
    );
  }

  const footer = (
    <div className="quiz-footer">
      <div className="quiz-footer__inner">{footerAction}</div>
    </div>
  );

  return (
    <StudioShell label="Practice question" header={header} footer={footer} width="player" {...shell}>
      <div className="quiz-player" key={question.id}>
        {question.timer && (
          <div className="quiz-timer" data-kind={question.timer.kind}>
            <span className="quiz-timer__label">{question.timer.label}</span>
            <span className="quiz-timer__track" aria-hidden="true">
              <span className="quiz-timer__fill" style={{ width: `${Math.round(Math.min(1, Math.max(0, question.timer.fraction)) * 100)}%` }} />
            </span>
          </div>
        )}

        <div className="quiz-stage" data-mode={question.mode} data-size={question.prompt.size}>
          <p className="quiz-instruction">{question.instruction}</p>
          <div ref={promptRef} className="quiz-prompt" tabIndex={-1}>
            <span className="quiz-jp quiz-prompt__text" lang="ja">
              {question.prompt.text}
            </span>
            {question.prompt.reading && (
              <span className="quiz-jp quiz-prompt__reading" lang="ja">
                {question.prompt.reading}
              </span>
            )}
            {question.prompt.helper && <span className="quiz-help quiz-prompt__helper">{question.prompt.helper}</span>}
          </div>
        </div>

        {typed ? (
          <div className="quiz-typed">
            <label className="quiz-field__label" htmlFor={inputId}>
              Your answer
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className="quiz-input"
              data-state={outcome === "correct" ? "correct" : outcome ? "wrong" : "idle"}
              type="text"
              inputMode="text"
              lang="en"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder={question.typedPlaceholder}
              value={typedValue}
              readOnly={answered}
              onChange={(event) => {
                if (!answered) actions.onTypedChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !answered && canCheck) {
                  event.preventDefault();
                  actions.onSubmitTyped(event);
                }
              }}
            />
          </div>
        ) : (
          <div className="quiz-choices" data-layout={question.choiceLayout} role="group" aria-label="Answer choices">
            {question.choices.map((choice, i) => {
              const state = choiceState(choice, answer);
              const locked = answered;
              return (
                <button
                  key={choice.id}
                  type="button"
                  className="quiz-choice"
                  data-state={state}
                  data-quiz-choice=""
                  aria-disabled={locked ? true : undefined}
                  onClick={() => {
                    if (!locked) actions.onChoose(choice.id);
                  }}
                >
                  <span className="quiz-choice__key" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={choice.ja ? "quiz-choice__label quiz-jp" : "quiz-choice__label"} lang={choice.ja ? "ja" : undefined}>
                    {choice.label}
                  </span>
                  {state === "correct" && (
                    <span className="quiz-choice__tag">
                      <Check aria-hidden="true" />
                      Correct answer
                    </span>
                  )}
                  {state === "wrong" && (
                    <span className="quiz-choice__tag">
                      <X aria-hidden="true" />
                      Your answer
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {answered && feedback}
      </div>

      <div className="quiz-sr" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </StudioShell>
  );
}
