import { normalizeLabel, normalizeTyped } from './ids';
import { freeze, type GradeResult, type Question, type QuestionView, type Response } from './types';

/** Checks the mutually exclusive response contract at the creation boundary. */
export function assertQuestion(question: Question): void {
  if (question.responseType === 'typed') {
    if (question.kind !== 'kana-type' || 'choices' in question || 'correctChoiceId' in question
      || !question.acceptedTyped.length || !question.acceptedTyped.every(value => Boolean(normalizeTyped(value)))) {
      throw new Error('Invalid typed question');
    }
  } else {
    if ('acceptedTyped' in question || question.kind === 'kana-type'
      || ![4, 6].includes(question.choices.length)
      || (question.choices.length === 6 && question.subject !== 'kana')
      || new Set(question.choices.map(choice => choice.id)).size !== question.choices.length
      || new Set(question.choices.map(choice => normalizeLabel(choice.label))).size !== question.choices.length
      || question.choices.some(choice => !normalizeLabel(choice.label))
      || question.choices.filter(choice => choice.id === question.correctChoiceId).length !== 1) {
      throw new Error('Invalid choice question');
    }
  }
}

export function grade(question: Question, response: Response): GradeResult {
  if (question.responseType !== response.type) return freeze({ valid: false, outcome: 'wrong', reason: 'response-type' });
  if (question.responseType === 'choice' && response.type === 'choice') {
    if (!question.choices.some(choice => choice.id === response.choiceId)) return freeze({ valid: false, outcome: 'wrong', reason: 'unknown-choice' });
    return freeze({ valid: true, outcome: response.choiceId === question.correctChoiceId ? 'correct' : 'wrong' });
  }
  if (question.responseType === 'typed' && response.type === 'typed') {
    const value = normalizeTyped(response.value);
    if (!value) return freeze({ valid: false, outcome: 'wrong', reason: 'empty-answer' });
    return freeze({ valid: true, outcome: question.acceptedTyped.some(alias => normalizeTyped(alias) === value) ? 'correct' : 'wrong' });
  }
  return freeze({ valid: false, outcome: 'wrong', reason: 'response-type' });
}

/** Pass only this projection to unanswered UI. Encoded item IDs contain answers too. */
export function questionView(question: Question): QuestionView {
  return freeze({ id: question.id, subject: question.subject, kind: question.kind,
    responseType: question.responseType, instruction: question.instruction, face: question.face,
    ...(question.faceSub !== undefined ? { faceSub: question.faceSub } : {}),
    ...(question.highlights ? { highlights: question.highlights.map(range => ({ ...range })) } : {}),
    ...(question.responseType === 'choice' ? { choices: question.choices.map(choice => ({ ...choice })) } : {}),
  });
}
