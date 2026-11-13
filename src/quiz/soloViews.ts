import { questionView } from "./grade";
import { timedLimitMs } from "./session";
import { SESSION_LIMITS, type ActiveSession, type AnswerRecord } from "./types";
import type { QuizQuestionView, QuizFeedbackView, QuizWhyView } from "../components/quiz/viewTypes";
const KIND_LABELS = { "kana-read": "Read the kana", "kana-pick": "Pick the kana", "kana-type": "Type romaji", "vocab-meaning":"Meaning", "vocab-reading":"Reading", "vocab-reverse":"Reverse" } as const;

export function soloQuestionModel(state: ActiveSession): QuizQuestionView {
  const question = questionView(state.current);
  const survival = state.survivalRemainingMs;
  const limit = timedLimitMs(state.config);
  const remain = state.remainingMs;
  const timer = survival !== null ? { kind: "budget" as const, label: `${Math.ceil(survival / 1000)}s / 60s`, fraction: survival / SESSION_LIMITS.survivalCapMs }
    : remain !== null && limit ? { kind: "question" as const, label: `${Math.ceil(remain / 1000)} s`, fraction: remain / limit } : undefined;
  const pick = question.kind === "kana-pick";
  const words = question.subject === "vocab";
  const reverse = question.kind === "vocab-reverse";
  const meaning = question.kind === "vocab-meaning";
  return { id: question.id, index: state.index, total: state.questions.length, subjectLabel: words ? "Words" : "Kana",
    kindLabel: KIND_LABELS[question.kind as keyof typeof KIND_LABELS] ?? "Practice",
    instruction: pick ? "Choose the character for this reading." : question.instruction,
    prompt: { text: question.face, size: words || pick ? "word" : "glyph", ja: !pick && !reverse, ...(meaning && question.faceSub && question.faceSub !== question.face ? {reading:question.faceSub} : {}) }, mode: question.responseType,
    choices: (question.choices ?? []).map(choice => ({ ...choice, ja: pick || words && !meaning })), choiceLayout: meaning ? "long" : "short",
    typedPlaceholder: "Type in romaji", timer,
    ...(survival !== null ? { positionLabel: `Question ${state.index + 1}`, finalQuestion: false } : {}) };
}

export function soloFeedbackModel(state: ActiveSession, record: AnswerRecord, question: QuizQuestionView, exampleFor: (glyph: string) => QuizWhyView["example"]): QuizFeedbackView | undefined {
  const { outcome } = record;
  if (outcome === "unattempted") return;
  const { reveal, speechText } = state.current;
  const verdict = outcome === "correct" ? "Correct" : outcome === "timeout" ? "Time is up" : "Not quite";
  const reading = reveal.reading ?? reveal.answer;
  const glyph = record.target.kanaGlyph ?? question.prompt.text;
  const words = state.config.subject === "vocab";
  const example = words ? undefined : exampleFor(glyph);
  const alias = state.current.responseType === "typed" && state.current.acceptedTyped.length > 1
    ? `Also accepted: ${state.current.acceptedTyped.filter(value => value !== reading).join(", ")}.` : undefined;
  return { outcome, verdict, correctAnswer: reveal.answer, canListen: !!speechText,
    sentence: words ? `${state.current.kind === "vocab-reverse" ? reveal.answer : glyph} (${reading}) means “${reveal.meaning}”.` : `${glyph} is read “${reading}”.`, announcement: `${verdict}. Answer: ${reveal.answer}.`,
    ...(outcome === "wrong" ? { yourAnswer: record.typedValue ?? question.choices.find(choice => choice.id === record.responseId)?.label } : {}),
    why: { example, mnemonic: reveal.note ?? alias ?? (words ? `Link the written form “${state.current.kind === "vocab-reverse" ? reveal.answer : glyph}” with its reading “${reading}” and meaning “${reveal.meaning}”.` : example ? undefined : `Say “${reading}” as you trace ${glyph} in the air.`) } };
}

