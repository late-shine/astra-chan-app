/** Pure QZ2 contracts. Catalogs are structural inputs, never imported at runtime. */
export type Subject = 'kana' | 'vocab' | 'kanji';
export const QUESTION_KINDS = Object.freeze([
  'kana-read', 'kana-pick', 'kana-type', 'vocab-meaning', 'vocab-reading',
  'vocab-reverse', 'kanji-meaning', 'kanji-on', 'kanji-kun', 'kanji-word',
] as const);
export type QuestionKind = typeof QUESTION_KINDS[number];
export type KanaScript = 'hiragana' | 'katakana';
export type KanaStage = 'basic' | 'dakuon' | 'handakuon' | 'yoon';
export type Outcome = 'correct' | 'wrong' | 'timeout' | 'unattempted';
export type RandomInt = (exclusiveMax: number) => number;

export interface KanaSource {
  readonly kana: string; readonly romaji: string;
  readonly category: KanaStage; readonly group: string;
}
export interface VocabularySource {
  readonly word: string; readonly hiragana: string; readonly english: string;
  readonly category: string;
}
export interface ReadingSource {
  readonly kana: string; readonly romaji: string; readonly type: 'onyomi' | 'kunyomi';
  readonly source: string; readonly proofreadingStatus: 'reviewed' | 'needs-review' | 'unverified';
  readonly priority: number;
}
export interface KanjiSource {
  readonly kanji: string; readonly meaning: string; readonly strokeCount: number;
  readonly onyomi: string; readonly onyomiRomaji: string;
  readonly kunyomi: string; readonly kunyomiRomaji: string;
  readonly onyomiRecords?: readonly ReadingSource[];
  readonly kunyomiRecords?: readonly ReadingSource[];
}
export interface WordSource {
  readonly id: string; readonly word: string; readonly reading: string; readonly meaning: string;
  readonly source: string; readonly proofreadingStatus: 'reviewed' | 'needs-review' | 'unverified';
  readonly commonness: 'common' | 'moderate' | 'rare'; readonly note?: string;
}
export interface Catalogs {
  readonly hiragana: readonly KanaSource[]; readonly katakana: readonly KanaSource[];
  readonly vocabulary: readonly VocabularySource[]; readonly kanji: readonly KanjiSource[];
  readonly readingRecords?: Readonly<Record<string, {
    readonly onyomi: readonly ReadingSource[]; readonly kunyomi: readonly ReadingSource[];
  }>>;
  readonly wordFamilies?: Readonly<Record<string, readonly WordSource[]>>;
}
export interface Reveal {
  readonly answer: string; readonly reading?: string; readonly meaning?: string;
  readonly note?: string; readonly example?: string; readonly confusion?: string;
}
export interface DeckTarget {
  readonly itemKey: string; readonly type: KanaScript | 'vocab' | 'kanji';
}
export interface TextRange { readonly start: number; readonly end: number }
export interface QuestionBase {
  readonly id: string; readonly itemId: string; readonly skillKey: string;
  readonly subject: Subject; readonly kind: QuestionKind;
  readonly instruction: string; readonly face: string; readonly faceSub?: string;
  /** UTF-16 text offsets, end exclusive; rendering must use text, never HTML. */
  readonly highlights?: readonly TextRange[];
  readonly reveal: Reveal; readonly speechText?: string; readonly deck?: DeckTarget;
}
export interface Choice { readonly id: string; readonly label: string }
export type Question = QuestionBase & (
  | { readonly responseType: 'choice'; readonly choices: readonly Choice[];
      readonly correctChoiceId: string; readonly acceptedTyped?: never }
  | { readonly responseType: 'typed'; readonly acceptedTyped: readonly string[];
      readonly choices?: never; readonly correctChoiceId?: never }
);
/** Intentionally omits reversible source IDs, speech, reveal and grading fields. */
export interface QuestionView {
  readonly id: string; readonly subject: Subject; readonly kind: QuestionKind;
  readonly responseType: 'choice' | 'typed'; readonly instruction: string;
  readonly face: string; readonly faceSub?: string;
  readonly highlights?: readonly TextRange[];
  readonly choices?: readonly Choice[];
}
export type Response = { readonly type: 'choice'; readonly choiceId: string }
  | { readonly type: 'typed'; readonly value: string };
export interface GradeResult {
  readonly valid: boolean; readonly outcome: 'correct' | 'wrong';
  readonly reason?: 'response-type' | 'unknown-choice' | 'empty-answer';
}

export type ExclusionReason = 'invalid-content' | 'id-too-long' | 'ambiguous-prompt'
  | 'unsupported-reading' | 'unreviewed' | 'rare-word' | 'missing-target'
  | 'conflicting-word' | 'insufficient-choices';
export interface Exclusion {
  readonly source: string; readonly kind: QuestionKind; readonly reason: ExclusionReason;
  readonly detail: string;
}
export interface Foil { readonly label: string; readonly score: number }
/** Adapter output is internal content, not a before-answer UI view. */
export interface Candidate {
  readonly itemId: string; readonly skillKey: string; readonly targetKey: string;
  readonly subject: Subject; readonly kind: QuestionKind; readonly instruction: string;
  readonly face: string; readonly faceSub?: string; readonly highlights?: QuestionBase['highlights'];
  readonly answers: readonly string[]; readonly typed?: readonly string[];
  readonly foils: readonly Foil[]; readonly reveal: Reveal; readonly speechText?: string;
  readonly deck: DeckTarget; readonly script?: KanaScript; readonly stage?: KanaStage;
  readonly category?: string; readonly roots?: readonly string[];
}
export interface FactoryResult {
  readonly sourceCount: number; readonly duplicateIdentities: readonly string[];
  readonly candidates: readonly Candidate[]; readonly exclusions: readonly Exclusion[];
}
export interface SkillHistory {
  readonly firstAttempts: number; readonly firstCorrect: number;
  readonly lastFirstMissAt?: number; readonly lastCorrectAt?: number;
}
export interface QuizHistory {
  readonly skills?: Readonly<Record<string, SkillHistory>>;
  readonly characterProgress?: Readonly<Record<string, { readonly total: number; readonly correct: number }>>;
}
export interface PoolFilter {
  readonly script?: KanaScript | 'both'; readonly stages?: readonly KanaStage[];
  readonly category?: string;
  readonly filter?: 'all' | 'learned' | 'studied' | 'custom';
  /** Custom filters use stable item IDs, not indices/categories or SRS deck keys. */
  readonly itemIds?: readonly string[];
  readonly learnedWords?: readonly string[]; readonly studiedKanji?: readonly string[];
}
export interface BuildConfig {
  readonly sessionId: string; readonly subject: Subject; readonly kinds?: readonly QuestionKind[];
  readonly length: number; readonly now: number; readonly pool?: PoolFilter;
  readonly choiceCount?: 4 | 6;
  /** Caller displays getEligibility().notices before permitting Start. */
  readonly acceptFourChoiceFallback?: boolean;
}
export interface EligibilityReport {
  readonly sourceCounts: Readonly<Record<Subject | 'context', number>>;
  readonly duplicateIdentities: readonly string[]; readonly exclusions: readonly Exclusion[];
  readonly eligibleByKind: Readonly<Record<QuestionKind, number>>;
  readonly eligibleTargets: number; readonly effectiveChoiceCount: 4 | 6;
  readonly requiresFourChoiceAcknowledgement: boolean; readonly notices: readonly string[];
  readonly curatedWordCount: number; readonly curatedSetLabel: string;
}
export interface BuildResult {
  readonly questions: readonly Question[]; readonly eligibility: EligibilityReport;
}

/** Freeze only newly allocated output; never use this on caller-owned catalogs. */
export function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// QZ3 machine/record contracts. QZ2 Question and factory contracts remain unchanged.
export type SoloOrigin = 'practice' | 'timed' | 'survival' | 'repair';
export type RecordOrigin = SoloOrigin | 'duel';
export type ChallengeTier = 'steady' | 'quick' | 'lightning';
export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'superhard';
export interface ClockStamp {
  readonly monoMs: number; readonly epochMs: number; readonly localDate: string;
}
export interface SessionConfig {
  readonly sessionId: string; readonly subject: Subject; readonly origin: SoloOrigin;
  readonly challenge: ChallengeTier; readonly autoNext: boolean;
  readonly previousSurvivalBest: number; readonly rewardVersion: 1;
  readonly repairOf?: string;
}
export interface AnswerRecord {
  readonly type: 'answer'; readonly sessionId: string; readonly seq: number;
  readonly questionId: string; readonly skillKey: string;
  readonly target: { readonly subject: Subject; readonly itemId: string;
    readonly kind: QuestionKind; readonly kanaGlyph?: string };
  readonly outcome: Outcome; readonly responseId?: string; readonly typedValue?: string;
  readonly elapsedMs: number; readonly answeredAt: number; readonly localDate: string;
  readonly origin: RecordOrigin; readonly rewardVersion: 1; readonly xp: number;
}
export interface CompletionRecord {
  readonly type: 'completion'; readonly sessionId: string; readonly seq: number;
  readonly origin: 'practice' | 'timed'; readonly uniqueFirstPassCount: number;
  readonly answeredAt: number; readonly localDate: string; readonly rewardVersion: 1; readonly xp: 20;
}
export type QuizProgressRecord = AnswerRecord | CompletionRecord;
export type RewardContext = {
  readonly type: 'answer'; readonly subject: Subject; readonly kind: QuestionKind;
  readonly outcome: Outcome; readonly origin: RecordOrigin;
  readonly challenge?: ChallengeTier; readonly difficulty?: DuelDifficulty;
} | {
  readonly type: 'completion'; readonly origin: RecordOrigin;
  readonly complete: boolean; readonly uniqueFirstPassCount: number;
};
export interface RewardBreakdown {
  readonly base: number; readonly challenge: number; readonly completion: number; readonly total: number;
}
export const SESSION_LIMITS = freeze({
  questions: 256, records: 2048, draft: 256, snapshotBytes: 512 * 1024,
  snapshotTtlMs: 24 * 60 * 60 * 1000, survivalStartMs: 45_000, survivalCapMs: 60_000,
  autoNextMs: 1600, survivalFeedbackMs: 900,
});
export type CommitFailure = 'snapshot' | 'outbox' | 'stats' | 'unavailable';
export interface PendingCommit {
  readonly record: QuizProgressRecord; readonly attempt: number;
  readonly status: 'pending' | 'failed'; readonly failure?: CommitFailure;
}
export type FinishReason = 'completed' | 'partial' | 'survival-zero' | 'safety-limit';
export interface RuntimeClock {
  readonly lastMonoMs: number; readonly anchorMonoMs: number | null;
  readonly deadlineMonoMs: number | null; readonly autoNextDeadlineMonoMs: number | null;
}
export interface ActiveSession {
  readonly phase: 'asking' | 'committing' | 'feedback' | 'paused' | 'results';
  readonly config: SessionConfig; readonly questions: readonly Question[]; readonly current: Question;
  /** Absolute occurrence index; Survival may cycle the immutable question bank. */
  readonly index: number; readonly records: readonly QuizProgressRecord[];
  readonly pending: PendingCommit | null; readonly acknowledgedSeq: number;
  readonly commitTargetSeq: number; readonly draft: string;
  readonly remainingMs: number | null; readonly survivalRemainingMs: number | null;
  readonly questionElapsedMs: number; readonly autoNextRemainingMs: number | null;
  readonly autoNextToken: number | null; readonly autoNextCanceled: boolean;
  readonly pauseRequested: boolean; readonly resumeState: 'asking' | 'feedback' | null;
  readonly finishReason: FinishReason | null; readonly volatile: boolean;
  readonly revision: number; readonly lastInputId: string | null;
  /** Page-local monotonic fields: never serialized. */
  readonly runtime: RuntimeClock;
}
export interface IdleSession { readonly phase: 'idle' }
export type SessionState = IdleSession | ActiveSession;
export interface SessionScope { readonly sessionId: string; readonly questionId: string; readonly clock: ClockStamp }
export interface CommitScope { readonly sessionId: string; readonly seq: number; readonly attempt: number; readonly clock: ClockStamp }
export type SessionEvent =
  | { readonly type: 'START'; readonly config: SessionConfig; readonly questions: readonly Question[]; readonly clock: ClockStamp }
  | (SessionScope & { readonly type: 'ANSWER'; readonly response: Response; readonly inputId: string; readonly repeat?: boolean })
  | (SessionScope & { readonly type: 'NEXT'; readonly inputId: string; readonly repeat?: boolean })
  | (SessionScope & { readonly type: 'AUTO_NEXT'; readonly token: number })
  | (SessionScope & { readonly type: 'TICK' | 'PAUSE' | 'RESUME' | 'FINISH' })
  | (SessionScope & { readonly type: 'DRAFT'; readonly value: string })
  | (SessionScope & { readonly type: 'CANCEL_AUTO_NEXT'; readonly reason: 'expand' | 'listen' | 'pointer' | 'focus' | 'sheet' | 'manual' })
  | (CommitScope & { readonly type: 'COMMIT_OK' | 'RETRY_COMMIT' | 'CONTINUE_VOLATILE' })
  | (CommitScope & { readonly type: 'COMMIT_FAILED'; readonly failure: CommitFailure });
export type PersistedSession = Omit<ActiveSession, 'runtime'>;
export interface SessionSnapshot {
  readonly schemaVersion: 1; readonly ownerKey: string; readonly savedAtEpoch: number;
  readonly cleanPause: boolean; readonly state: PersistedSession;
}
export type SnapshotValidation = { readonly ok: true; readonly state: ActiveSession }
  | { readonly ok: false; readonly reason: 'malformed' | 'version' | 'owner' | 'expired' | 'size' | 'future-clock'; readonly message: string };
