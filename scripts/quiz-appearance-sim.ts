// Preference compatibility and readability contract; no browser or network needed.
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STUDY_THEMES, STUDY_PALETTES, baseTheme, studyScene, studyTheme, studyTokens} from '../src/appearance';
import {THEME_IDS, DEFAULT_PREFERENCES, sanitizePreferenceValues, readLocalPreferences, writeLocalPreferences, writePreferencesEnvelope, readPreferencesEnvelope, resolvePreferences} from '../src/preferences';

const storage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,String(v)),removeItem:(k:string)=>storage.delete(k)},configurable:true});
let checks=0;
function check(value:unknown,message:string){assert.ok(value,message);checks++;}
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function ratio(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const theme of THEME_IDS){
  writeLocalPreferences({theme});
  check(readLocalPreferences().theme===theme,`${theme} reload`);
  writePreferencesEnvelope({values:{theme},updatedAt:100});
  check(readPreferencesEnvelope()?.values.theme===theme,`${theme} backup envelope`);
  check(sanitizePreferenceValues({theme}).theme===theme,`${theme} valid`);
  const resolved=resolvePreferences({local:{values:{theme:'dark'},updatedAt:1},cloud:{values:{theme},updatedAt:2},snapshot:DEFAULT_PREFERENCES,now:3});
  check(resolved.apply?.theme===theme,`${theme} account sync`);
}
check(sanitizePreferenceValues({theme:'unknown'}).theme===undefined,'unknown theme rejected');
check(studyTheme('unknown')==='rainy-atelier','unknown room fallback');
check(studyTheme('dark-maple')==='rainy-atelier','legacy room fallback');
for(const theme of STUDY_THEMES){
  storage.clear();
  writeLocalPreferences({theme:'dark-cyber',quizAppearance:theme});
  check(readLocalPreferences().quizAppearance===theme,`${theme} quiz reload`);
  check(readLocalPreferences().theme==='dark-cyber',`${theme} leaves app palette unchanged`);
  writeLocalPreferences({theme:'dark-maple'});
  check(readLocalPreferences().quizAppearance===theme,`${theme} survives app palette change`);
  writePreferencesEnvelope({values:{theme:'dark-cyber',quizAppearance:theme},updatedAt:100});
  check(readPreferencesEnvelope()?.values.quizAppearance===theme,`${theme} separate account envelope`);
  storage.clear(); storage.set('hira_theme_mode',theme);
  check(readLocalPreferences().quizAppearance===theme,`${theme} old combined scalar migrates`);
  check(readLocalPreferences().theme===baseTheme(theme),`${theme} old scalar resolves app fallback`);
  const migrated=sanitizePreferenceValues({theme});
  check(migrated.quizAppearance===theme && migrated.theme===baseTheme(theme),`${theme} old cloud/backup migration`);
  const explicit=sanitizePreferenceValues({theme,quizAppearance:'rainy-atelier'});
  check(explicit.quizAppearance==='rainy-atelier',`${theme} never overrides explicit quiz preference`);
  const palette=STUDY_PALETTES[theme];
  check(THEME_IDS.includes(baseTheme(theme)),`${theme} existing app palette`);
  for(const phase of ['lobby','match','results']){
    const t=studyTokens(theme,phase),panel=t['--quiz-surface-solid'];
    for(const [fg,bg,min] of [
      [palette.ink,panel,4.5],[palette.secondary,panel,4.5],[palette.ink,palette.header,4.5],
      [palette.secondary,palette.header,4.5],[palette.ink,palette.selected,4.5],['#FFFFFF',palette.primary,4.5],
      ['#FFFFFF',palette.hover,4.5],[palette.focus,panel,3],[palette.border,panel,3],
      [t['--quiz-success'],t['--quiz-success-soft'],4.5],[t['--quiz-error'],t['--quiz-error-soft'],4.5],
      [palette.ink,t['--quiz-success-soft'],4.5],[palette.ink,t['--quiz-error-soft'],4.5],
    ] as const) check(ratio(fg,bg)>=min,`${theme}/${phase}: ${fg} on ${bg} = ${ratio(fg,bg).toFixed(2)} < ${min}`);
  }
  for(const size of Object.values(studyScene(theme))){
    for(const set of [size.srcSet,size.webpSrcSet].filter(Boolean) as string[]){
      for(const entry of set.split(','))check(existsSync(`public${entry.trim().split(' ')[0]}`),`${theme} responsive source exists`);
    }
  }
}
const manifest=JSON.parse(readFileSync('public/assets/quiz/aesthetics/manifest.json','utf8').replace(/^\uFEFF/,''));
for(const row of manifest){
  check(createHash('sha256').update(readFileSync(`Quiz assets/${row.source}`)).digest('hex').toUpperCase()===row.sha256,`${row.source} original intact`);
  for(const file of row.files) check(readFileSync(`public/assets/quiz/aesthetics/${file.file}`).byteLength===file.bytes,`${file.file} manifest bytes`);
}
console.log(`${checks} appearance checks passed: legacy/new preferences, sync, contrast, responsive assets and originals.`);
