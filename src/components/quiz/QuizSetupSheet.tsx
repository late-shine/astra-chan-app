// Quiz Remake QZ1: the Customize sheet. Presentational.
//
// Bottom sheet below 768 px, centred dialog from 768 px (the geometry lives in StudioSheet + CSS).
// Primary controls: subject, pool, question kind, length; Kana adds script and four independent
// stage toggles. Advanced (closed by default): custom selection, kana 4/6 choices, auto-next.
// Small pools shrink visibly ("Only 6 items match. Start 6 questions."); empty pools explain why and
// offer one relevant alternative. There is no random padding and no silent pool widening.
// Timers are NOT here: they are configured through Timed practice, never inside a normal Start.

import { useId, useState, type RefObject } from "react";
import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { StudioSegmented, StudioSheet, StudioSwitch } from "./StudioShell";
import type { QuizSetupActions, QuizSetupView } from "./viewTypes";

export interface QuizSetupSheetProps {
  view: QuizSetupView;
  actions: QuizSetupActions;
  /** The Customize button. Focus returns here when the sheet closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function QuizSetupSheet({ view, actions, returnFocusRef }: QuizSetupSheetProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const poolId = useId();
  const noticeId = useId();
  const advancedPanelId = useId();

  const { matchCount, length } = view;
  const isEmpty = matchCount <= 0;
  const startCount = Math.min(length, Math.max(0, matchCount));
  const shrinks = !isEmpty && matchCount < length;

  const startLabel = isEmpty ? "Start practice" : `Start ${startCount} ${plural(startCount, "question", "questions")}`;

  const handleStart = () => {
    // aria-disabled keeps the button focusable (so its reason can be read), so the guard lives here.
    if (isEmpty) return;
    actions.onStart();
  };

  const footer = (
    <>
      <button
        type="button"
        className="quiz-btn quiz-btn--primary quiz-btn--block"
        aria-disabled={isEmpty ? true : undefined}
        aria-describedby={isEmpty || shrinks ? noticeId : undefined}
        onClick={handleStart}
      >
        {startLabel}
      </button>
    </>
  );

  return (
    <StudioSheet title="Customize practice" closeLabel="Close customize" onClose={actions.onClose} footer={footer} size="setup" returnFocusRef={returnFocusRef}>
      <div className="quiz-form">
        <div className="quiz-field">
          <span className="quiz-field__label">Subject</span>
          <StudioSegmented label="Subject" options={view.subjects} value={view.subject} onChange={actions.onSubjectChange} columns={3} />
        </div>

        {view.kana && (
          <>
            <div className="quiz-field">
              <span className="quiz-field__label">Script</span>
              <StudioSegmented
                label="Script"
                options={view.kana.scripts}
                value={view.kana.script}
                onChange={(id) => actions.onScriptChange?.(id)}
                columns={3}
              />
            </div>
            <div className="quiz-field">
              <span className="quiz-field__label">Kana groups</span>
              <div className="quiz-chips" role="group" aria-label="Kana groups">
                {view.kana.stages.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    className="quiz-chip-toggle"
                    aria-pressed={stage.on}
                    onClick={() => actions.onToggleStage?.(stage.id)}
                  >
                    <span className="quiz-chip-toggle__check" aria-hidden="true">
                      <Check />
                    </span>
                    <span className="quiz-chip-toggle__text">
                      <span className="quiz-chip-toggle__label">{stage.label}</span>
                      <span className="quiz-help">{stage.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="quiz-field">
          <label className="quiz-field__label" htmlFor={poolId}>
            Practice pool
          </label>
          <select id={poolId} className="quiz-select" value={view.poolId} onChange={(event) => actions.onPoolChange(event.target.value)}>
            {view.pools.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.label} ({pool.count})
              </option>
            ))}
          </select>
        </div>

        <div className="quiz-field">
          <span className="quiz-field__label">Question type</span>
          <StudioSegmented label="Question type" options={view.kinds} value={view.kindId} onChange={actions.onKindChange} columns={2} />
        </div>

        <div className="quiz-field">
          <span className="quiz-field__label">Length</span>
          <StudioSegmented
            label="Length"
            options={view.lengths.map((n) => ({ id: n, label: String(n) }))}
            value={view.length}
            onChange={actions.onLengthChange}
            columns={4}
          />
        </div>

        <div id={noticeId} className="quiz-notice-slot" aria-live="polite">
          {shrinks && (
            <p className="quiz-notice">
              <CircleAlert aria-hidden="true" />
              <span>
                Only {matchCount} {plural(matchCount, "item matches", "items match")}. Start {matchCount} {plural(matchCount, "question", "questions")}.
              </span>
            </p>
          )}
          {isEmpty && (
            <div className="quiz-notice quiz-notice--empty">
              <CircleAlert aria-hidden="true" />
              <div>
                <p className="quiz-notice__title">No items match these choices.</p>
                {view.emptyAlternative && (
                  <>
                    <p className="quiz-help">{view.emptyAlternative.reason}</p>
                    <button
                      type="button"
                      className="quiz-btn quiz-btn--secondary"
                      onClick={() => actions.onUseAlternative?.(view.emptyAlternative!.id)}
                    >
                      {view.emptyAlternative.label}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="quiz-help">Answer choices may include other items.</p>

        <div className="quiz-advanced">
          <button
            type="button"
            className="quiz-disclosure"
            aria-expanded={advancedOpen}
            aria-controls={advancedPanelId}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <span>Advanced</span>
            <ChevronDown aria-hidden="true" data-open={advancedOpen ? "true" : "false"} />
          </button>
          <div id={advancedPanelId} hidden={!advancedOpen} className="quiz-advanced__panel">
            <div className="quiz-field">
              <span className="quiz-field__label">Custom selection</span>
              <button type="button" className="quiz-btn quiz-btn--secondary quiz-btn--block">
                Choose specific items
              </button>
              <p className="quiz-help">Not wired in this prototype.</p>
            </div>
            {view.kana && (
              <div className="quiz-field">
                <span className="quiz-field__label">Answer choices</span>
                <StudioSegmented
                  label="Answer choices"
                  options={[
                    { id: 4, label: "4 choices" },
                    { id: 6, label: "6 choices" },
                  ]}
                  value={view.kana.choices}
                  onChange={(id) => actions.onChoicesChange?.(id === 6 ? 6 : 4)}
                  columns={2}
                />
              </div>
            )}
            <StudioSwitch
              checked={view.autoNext}
              onChange={actions.onAutoNextChange}
              label="Auto-next after correct answers"
              description="Wrong answers always wait for Next."
            />
          </div>
        </div>
      </div>
    </StudioSheet>
  );
}
