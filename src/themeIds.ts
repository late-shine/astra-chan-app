/** Separate preference domains. Old combined values are accepted only during migration. */
export const THEME_IDS = ['light', 'dark', 'dark-cosmic', 'dark-emerald', 'dark-maple', 'dark-cyber'] as const;
export type ThemeId = typeof THEME_IDS[number];
export const STUDY_THEMES = ['rainy-atelier', 'forgotten-railway', 'morning-lilies', 'quiet-afternoon'] as const;
export type StudyTheme = typeof STUDY_THEMES[number];
export function isStudyTheme(value: unknown): value is StudyTheme {
  return typeof value === 'string' && (STUDY_THEMES as readonly string[]).includes(value);
}
export function legacyAppTheme(theme: StudyTheme): ThemeId {
  return theme === 'rainy-atelier' ? 'dark-cosmic' : theme === 'forgotten-railway' ? 'dark-emerald' : 'light';
}
export function splitThemePreferences(source: Record<string, unknown>): Record<string, unknown> {
  if (!isStudyTheme(source.theme)) return source;
  return {...source, theme: legacyAppTheme(source.theme), quizAppearance: isStudyTheme(source.quizAppearance) ? source.quizAppearance : source.theme};
}
