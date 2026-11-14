import {defaultDuelMode,duelDuration} from './duel';
import {listPoolTargets} from './pool';
import type {Catalogs,DuelKind,DuelSettings,Subject} from './types';
export const DUEL_KIND_OPTIONS:Record<Subject,readonly {id:DuelKind;label:string}[]>={
  kana:[{id:'kana-read',label:'Read the kana'},{id:'kana-type',label:'Type romaji'}],
  vocab:[{id:'vocab-meaning',label:'Meaning'},{id:'vocab-reading',label:'Reading'},{id:'vocab-reverse',label:'Reverse'}],
  kanji:[{id:'kanji-meaning',label:'Meaning'},{id:'kanji-on',label:'On’yomi'}],
};
export const duelSubjectLabel=(subject:Subject)=>subject==='vocab'?'Words':subject==='kanji'?'Kanji':'Kana';
export function switchDuelSubject(previous:DuelSettings,subject:Subject):DuelSettings {
  const difficulty=subject!=='kana'&&previous.difficulty==='superhard'?'medium':previous.difficulty;
  return {...previous,subject,kind:DUEL_KIND_OPTIONS[subject][0].id,difficulty,durationMs:duelDuration(subject,difficulty),mode:defaultDuelMode(subject),
    pool:subject==='kana'?{filter:'all',label:'Hiragana · Core',script:'hiragana',stages:['basic']}:{filter:'all',label:subject==='vocab'?'All words':'All kanji'}};
}
export function publicDuelTargets(catalogs:Catalogs,settings:DuelSettings,unfiltered=false){
  const p=settings.pool;
  return listPoolTargets(catalogs,{sessionId:'duel-public-preview',subject:settings.subject,kinds:[settings.kind],length:20,choiceCount:4,now:0,
    pool:{...(settings.subject==='kana'?{script:p.script,stages:p.stages}:{}),...(!unfiltered&&p.filter==='explicit'?{filter:'custom',itemIds:p.targetIds}:p.filter==='theme'?{category:p.category}:{})}});
}

export const duelKindLabel=(kind:string)=>Object.values(DUEL_KIND_OPTIONS).flat().find(option=>option.id===kind)?.label??'Practice';

/** Unanswered view from the frozen safe question, independent of guest catalogs. */
export function duelQuestionModel(q:import('./types').QuestionView,index:number,total:number,remainingMs:number,durationMs:number,countdownMs?:number):import('../components/quiz/viewTypes').QuizQuestionView {
  const meaning=q.kind==='vocab-meaning'||q.kind==='kanji-meaning',reverse=q.kind==='vocab-reverse';
  return {id:q.id,index,total,subjectLabel:`${duelSubjectLabel(q.subject)} duel`,kindLabel:duelKindLabel(q.kind),
    instruction:countdownMs===undefined?q.instruction:`Shared round starts in ${Math.max(0,Math.ceil(countdownMs/1000))}s`,
    prompt:{text:q.face,size:q.subject==='vocab'?'word':'glyph',ja:!reverse,...(q.kind==='vocab-meaning'&&q.faceSub&&q.faceSub!==q.face?{reading:q.faceSub}:{})},
    mode:q.responseType,choices:(q.choices??[]).map(choice=>({...choice,ja:q.subject!=='kana'&&!meaning})),choiceLayout:meaning?'long':'short',typedPlaceholder:'Type in romaji',
    timer:{kind:'question',label:countdownMs===undefined?`${Math.ceil(remainingMs/1000)} s`:'Get ready',fraction:Math.max(0,Math.min(1,remainingMs/durationMs))}};
}
