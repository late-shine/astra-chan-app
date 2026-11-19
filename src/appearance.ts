import type { ThemeId } from './preferences';
import { ATELIER_SCENES } from './quiz/atelierAssets';

import { STUDY_THEMES, type StudyTheme, isStudyTheme, legacyAppTheme } from './themeIds';
export { STUDY_THEMES, type StudyTheme } from './themeIds';
type Palette = { header: string; panel: string; muted: string; ink: string; secondary: string; primary: string; hover: string; selected: string; border: string; accent: string; focus: string; frame: string; match: string; results: string; light: boolean };
export const STUDY_PALETTES: Record<StudyTheme, Palette> = {
  'rainy-atelier': { header:'#302938', panel:'#211D29', muted:'#302938', ink:'#F1E8DD', secondary:'#CFC4D6', primary:'#705A8A', hover:'#654E7C', selected:'#45374F', border:'#9A8AA6', accent:'#D8BD91', focus:'#E6C594', frame:'#292332', match:'#1B1C2A', results:'#2C232C', light:false },
  'forgotten-railway': { header:'#304940', panel:'#172B26', muted:'#293F36', ink:'#F1F0E5', secondary:'#CDD7C9', primary:'#577364', hover:'#486454', selected:'#345649', border:'#8F9D83', accent:'#DFCA9C', focus:'#E1C483', frame:'#31483C', match:'#182D2D', results:'#30372A', light:false },
  'morning-lilies': { header:'#D8E3DC', panel:'#FFFDF6', muted:'#EEF2EB', ink:'#263B35', secondary:'#4D6158', primary:'#48665C', hover:'#38554B', selected:'#DDE9E1', border:'#788C81', accent:'#644B72', focus:'#694B78', frame:'#DEE8D5', match:'#F3F8F7', results:'#FFF8EA', light:true },
  'quiet-afternoon': { header:'#B6BBA6', panel:'#D4D5C5', muted:'#C7CCB9', ink:'#293226', secondary:'#414B39', primary:'#4E5D40', hover:'#3F4F32', selected:'#BDC7AB', border:'#626E54', accent:'#5C4635', focus:'#694632', frame:'#AAB69A', match:'#CBD2C3', results:'#DAD3BF', light:true },
};
export const STUDY_LABELS: Record<StudyTheme, {title:string; description:string; base:ThemeId}> = {
  'rainy-atelier': {title:'Rainy Atelier', description:'Plum, lamplight and a rainy evening.', base:'dark-cosmic'},
  'forgotten-railway': {title:'Forgotten Railway', description:'Forest greens and a sunlit aisle.', base:'dark-emerald'},
  'morning-lilies': {title:'Morning Lilies', description:'Open daylight, ivory and pale sage.', base:'light'},
  'quiet-afternoon': {title:'Quiet Afternoon', description:'Soft window light, olive and linen.', base:'light'},
};
export function studyTheme(theme: string | undefined): StudyTheme {
  return STUDY_THEMES.includes(theme as StudyTheme) ? theme as StudyTheme : 'rainy-atelier';
}
/** Compatibility mapping for the retired combined setting, never used to apply a quiz theme. */
export function baseTheme(theme: ThemeId | StudyTheme): ThemeId {
  return isStudyTheme(theme) ? legacyAppTheme(theme) : theme;
}
export function appearanceLabel(theme: string): string {
  return STUDY_LABELS[theme as StudyTheme]?.title ?? LEGACY_THEMES.find(p => p.id === theme)?.title ?? 'Rainy Atelier';
}
export const LEGACY_THEMES: {id:ThemeId; title:string}[] = [
  {id:'light',title:'Washi Parchment'}, {id:'dark-cosmic',title:'Cosmic Witch'},
  {id:'dark-emerald',title:'Emerald Jade'}, {id:'dark-maple',title:'Autumn Maple'},
  {id:'dark-cyber',title:'Cyber Tokyo'}, {id:'dark',title:'Classic Dark'},
];
export function studyTokens(theme: string | undefined, phase?: string): Record<string,string> {
  const p = STUDY_PALETTES[studyTheme(theme)];
  const panel = phase === 'match' ? p.match : phase === 'results' ? p.results : p.panel;
  return {
    colorScheme:p.light ? 'light' : 'dark', '--quiz-bg':p.panel,
    '--quiz-surface':panel, '--quiz-surface-solid':panel, '--quiz-surface-muted':p.muted,
    '--quiz-companion-surface':panel, '--quiz-header-surface':p.header,
    '--quiz-ink':p.ink, '--quiz-ink-muted':p.secondary, '--quiz-border':p.border,
    '--quiz-control-border':p.border, '--quiz-primary':p.primary, '--quiz-primary-hover':p.hover,
    '--quiz-on-primary':'#FFFFFF', '--quiz-selected-fill':p.selected,
    '--quiz-playful':p.accent, '--quiz-on-playful':p.light ? '#FFFFFF' : p.panel,
    '--quiz-focus':p.focus, '--quiz-frame':p.frame,
    '--quiz-success':p.light ? '#205D43' : '#BAE5CE', '--quiz-success-soft':p.light ? '#E4F1E8' : '#294739',
    '--quiz-error':p.light ? '#8B3346' : '#F2C4C6', '--quiz-error-soft':p.light ? '#F9E5E9' : '#513538',
    '--quiz-on-success-soft':p.ink, '--quiz-on-error-soft':p.ink,
    '--quiz-scrim':p.light ? 'rgb(25 35 29 / .4)' : 'rgb(10 9 15 / .72)',
  };
}
export interface SceneSize {src:string; srcSet:string; width:number; height:number; webpSrcSet?:string}
export interface StudyScene {desktop:SceneSize; mobile:SceneSize}
function sceneSize(id:StudyTheme, format:'desktop'|'mobile'): SceneSize {
  const widths = format === 'desktop' ? [1280,2048] : [480,780];
  const src = (w:number) => `/assets/quiz/aesthetics/${id}-${format}-${w}.jpg`;
  const width = widths[1];
  return {src:src(width),srcSet:widths.map(w=>`${src(w)} ${w}w`).join(', '),width,height:Math.round(width * (format === 'desktop' ? (id === 'quiet-afternoon' ? 1696/2540 : id === 'morning-lilies' ? 1648/2944 : 9/16) : 16/9))};
}
export function studyScene(id:StudyTheme): StudyScene {
  return id === 'rainy-atelier' ? ATELIER_SCENES : {desktop:sceneSize(id,'desktop'),mobile:sceneSize(id,'mobile')};
}
export function themeThumbnail(id:StudyTheme) {
  return id === 'rainy-atelier' ? ATELIER_SCENES.desktop.src : `/assets/quiz/aesthetics/${id}-thumb.jpg`;
}
