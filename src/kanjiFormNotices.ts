/**
 * Optional one-line "notice this" annotations for the kanji specimen's Compare view
 * (Phase A3). Add an entry ONLY where the Digital (Noto Sans JP) and Written (Klee One)
 * forms differ in a way that matters to a learner (a hook, a join, a stroke ending,
 * proportions). Keep it to one short sentence.
 *
 * Each entry must be verified by eye in Compare mode before it is added. No entries
 * were shipped in A3 because the fonts could not be rendered where it was built.
 * Prefer moving this onto the kanji record itself when B1a defines the schema.
 *
 * Example shape:  "生": "Written form joins the top two strokes; the print form keeps them apart."
 * (illustrative wording only, not a verified claim)
 */
export const KANJI_FORM_NOTICES: Record<string, string> = {};
