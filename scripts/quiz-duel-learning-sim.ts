/** QZ11 domain/reward/recovery checks. No live Firebase or browser. */
import assert from 'node:assert/strict';
import {HIRAGANA_DATA,KATAKANA_DATA,KANJI_DATA,VOCABULARY_DATA} from '../src/data';
import {createDuelRoom,joinDuel,acknowledgeReady,buildDuelManifest,startMatch,openParallelQuestion,applyDuelAnswer,expireQuestion,finishMatch,decodeDuelRoom,advanceParallel} from '../src/quiz/duel';
import {duelQuestionModel,duelSubjectLabel,DUEL_KIND_OPTIONS,switchDuelSubject,publicDuelTargets} from '../src/quiz/duelSetup';
import {enrollDuelLearning,projectDuelLearning,duelLearningTotals,duelMisses,mappedDuelMisses,parseDuelLearning,duelJournalKey} from '../src/quiz/duelProgress';
import {applyQuizRecord,hydrateQuizProgress,parseProgressEntry,receiptThrough} from '../src/quiz/progress';
import {createQuizStorage,MASTER_STATS_KEY,readHydrationJournal} from '../src/quiz/browserStorage';
import {repairQuestions} from '../src/quiz/recommend';
import {questionView} from '../src/quiz/grade';
import {rewardFor} from '../src/quiz/reward';
import {DEFAULT_DUEL_SETTINGS} from '../src/quiz/useDuelSession';
import type {DuelResult} from '../src/quiz/duel';
import type {Catalogs,DuelRoom,DuelSettings,DuelScope,DuelKind} from '../src/quiz/types';
import type {StudentStats} from '../src/types';
let passed=0;const check=(name:string,value:unknown)=>{assert.ok(value,name);passed++;};
const T=1800000000000,date=()=> '2026-11-14',catalogs:Catalogs={hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,kanji:KANJI_DATA,vocabulary:VOCABULARY_DATA};
const baseline=():StudentStats=>({xp:40,totalAttempts:0,correctCount:0,studyDates:[],streakCount:0,lastActiveDate:null,masteredChars:['あ'],characterProgress:{日:{total:1,correct:1}},vocabularyProgress:{猫:true},favoriteCategory:'basic',srsCards:{},survivalBestScore:0,srsReviewedTotal:0});
function room(result:DuelResult){if(!result.ok||!result.room)throw Error(JSON.stringify(result));return result.room;}
const scope=(r:DuelRoom,uid='H',now=T):DuelScope=>({uid,now,matchId:r.v2.matchId,revision:r.v2.settingsRevision});
let serial=0;
function lobby(settings:DuelSettings){let r=room(createDuelRoom('H','Host',settings,`learn${serial++}`,T));r=room(joinDuel(r,scope(r,'G'),'Guest'));return r;}
function start(r:DuelRoom){r=room(acknowledgeReady(r,scope(r),2));r=room(acknowledgeReady(r,scope(r,'G'),2));return room(startMatch(r,scope(r),buildDuelManifest(catalogs,r.v2.settings,r.v2.matchId,5),T+1500));}
function answer(r:DuelRoom,uid='H',index=0,correct=true){const role=uid==='H'?'host':'guest';if(r.v2.settings.mode==='parallel')r=room(openParallelQuestion(r,scope(r,uid,T+1600+index*1000),index));
 const q=r.v2.manifest!.questions[index],at=r.v2.rounds![`r_${index}`].windows[role]!.startAt+100;
 return room(applyDuelAnswer(r,scope(r,uid,at+1),{index,receiptId:`answer_${uid}_${index}`,capturedAt:at,response:q.responseType==='typed'?{type:'typed',value:correct?q.acceptedTyped[0]:'incorrect'}:{type:'choice',choiceId:correct?q.correctChoiceId:q.choices.find(c=>c.id!==q.correctChoiceId)!.id}}));}
for(const subject of ['kana','vocab','kanji'] as const)for(const {id:kind} of DUEL_KIND_OPTIONS[subject])for(const mode of ['competitive','parallel'] as const)for(const difficulty of (subject==='kana'?['easy','medium','hard','superhard']:['easy','medium','hard']) as DuelSettings['difficulty'][]){
 const settings={...switchDuelSubject(DEFAULT_DUEL_SETTINGS,subject),kind,mode,difficulty,durationMs:subject==='kana'?{easy:15000,medium:10000,hard:5000,superhard:3000}[difficulty]:{easy:20000,medium:15000,hard:10000,superhard:0}[difficulty]};
 const waiting=lobby(settings),enrolled=enrollDuelLearning(waiting,'H');let r=answer(start(waiting));
 const projected=projectDuelLearning(decodeDuelRoom(JSON.parse(JSON.stringify(r))),enrolled,date),entry=projected.entries[0];
 const q=r.v2.manifest!.questions[0],model=duelQuestionModel(questionView(q),0,10,1000,settings.durationMs);
 check('frozen unanswered view preserves options without grading fields',model.prompt.text===q.face&&model.choices.map(c=>c.label).join('|')===(q.choices??[]).map(c=>c.label).join('|')&&!JSON.stringify(model).includes('correctChoiceId'));
 if(kind==='vocab-reading')check('Reading has no reading subtitle or audio action',model.prompt.reading===undefined&&model.prompt.ja&&model.choiceLayout==='short');
 if(kind==='vocab-reverse')check('Reverse is English prompt/Japanese options',!model.prompt.ja&&model.choices.every(c=>c.ja));
 if(kind.endsWith('meaning'))check('English meanings use long option layout',model.choiceLayout==='long'&&model.choices.every(c=>!c.ja));

 const expected=(kind==='kana-type'?25:15)+(difficulty==='hard'?5:difficulty==='superhard'?10:0);
 check(`${subject}/${kind}/${mode}/${difficulty} exact reward`,entry.record.xp===expected&&duelLearningTotals(projected).total===expected);
 const credited=applyQuizRecord(baseline(),entry);check('one confirmed own answer / no win bonus',credited.xp===40+expected&&credited.totalAttempts===1&&credited.correctCount===1);
 check('accepted replay pays once',applyQuizRecord(credited,entry)===credited);
 r=room(finishMatch(r,scope(r,'H',T+40000),'left'));const final=projectDuelLearning(r,projected,date);
 const all=final.entries.reduce((s,e)=>applyQuizRecord(s,e),baseline());
 check('ordered unattempted suffix is zero impact, no completion',all.totalAttempts===1&&all.xp===40+expected&&receiptThrough(all,final.sessionId)===10&&final.entries.every(e=>e.record.type==='answer'));
 check('kanji Study/manual garden/mastery untouched',JSON.stringify(all.masteredChars)===JSON.stringify(baseline().masteredChars)&&JSON.stringify(all.vocabularyProgress)===JSON.stringify(baseline().vocabularyProgress)&&all.characterProgress.日.total===1);
 check('no raw response in learning/outbox projection',!JSON.stringify(final).includes('typedValue')&&!JSON.stringify(final).includes('responseId'));
 if(subject!=='kana')check('word/kanji choice only and no 3s',r.v2.manifest!.questions.every(q=>q.responseType==='choice'&&q.subject===subject)&&settings.durationMs>=10000);
}
const kana=lobby(DEFAULT_DUEL_SETTINGS),enrolled=enrollDuelLearning(kana,'H');let claimed=answer(start(kana),'G');
const ownWrong=answer(answer(start(kana),'H',0,false),'G');
const wrongProjection=projectDuelLearning(ownWrong,enrolled,date),wrongStats=applyQuizRecord(baseline(),wrongProjection.entries[0]);
check('own wrong counts as one miss even when opponent claims the point',wrongStats.totalAttempts===1&&wrongStats.correctCount===0&&wrongStats.xp===40&&ownWrong.scores.host===0&&ownWrong.scores.guest===1);
check('duel completion never adds a bonus',rewardFor({type:'completion',origin:'duel',complete:true,uniqueFirstPassCount:20}).total===0);
for(const mode of ['parallel','competitive'] as const){
 const words=switchDuelSubject(DEFAULT_DUEL_SETTINGS,'vocab'),category=catalogs.vocabulary[0].category;
 const theme={...words,mode,pool:{filter:'theme' as const,label:'Public theme',category}};
 const themed=start(lobby(theme));check('word theme works in both modes without private fields',themed.v2.manifest!.questions.every(q=>q.subject==='vocab')&&!/learnedWords|studiedKanji|quizSkills/.test(JSON.stringify(themed)));
 const kanji=switchDuelSubject(DEFAULT_DUEL_SETTINGS,'kanji'),ids=publicDuelTargets(catalogs,kanji).slice(0,5).map(t=>t.id);
 const explicit=start(lobby({...kanji,mode,count:20,pool:{filter:'explicit',label:'Public kanji set',targetIds:ids}}));
 check('kanji explicit set shrinks honestly in both modes',explicit.v2.manifest!.questions.length===5&&explicit.v2.manifest!.questions.every(q=>ids.includes(q.itemId)));
}

const skipped=projectDuelLearning(claimed,enrolled,date),skipStats=applyQuizRecord(baseline(),skipped.entries[0]);
check('opponent claimed round is unattempted, no study day',skipped.entries[0].record.type==='answer'&&skipped.entries[0].record.outcome==='unattempted'&&skipStats.totalAttempts===0&&skipStats.xp===40&&skipStats.studyDates.length===0&&!skipStats.quizSkills);
let timed=start(kana);timed=room(expireQuestion(timed,scope(timed,'H',T+11500),0));timed=room(finishMatch(timed,scope(timed,'H',T+12000),'left'));
const timeJournal=projectDuelLearning(timed,enrolled,date),timeStats=timeJournal.entries.reduce((s,e)=>applyQuizRecord(s,e),baseline());
check('own timeout counts one attempt and captured local day',timeStats.totalAttempts===1&&timeStats.correctCount===0&&timeStats.xp===40&&timeStats.studyDates[0]==='2026-11-14');
check('only actual timeout enters misses',duelMisses(timed,'H').length===1&&duelMisses(claimed,'H').length===0);
const mapped=mappedDuelMisses(timed,'H',catalogs),repair=repairQuestions(mapped,'repair');
check('repair uses frozen missed kind and max5',repair.length===1&&repair[0].kind===timed.v2.manifest!.questions[0].kind);
check('missing local map disables only growth',mappedDuelMisses(timed,'H',{hiragana:[],katakana:[],kanji:[],vocabulary:[]}).length===0&&decodeDuelRoom(timed).v2.manifest!.questions.length===10);
assert.throws(()=>enrollDuelLearning(timed,'H'));passed++;
const invalid=JSON.parse(JSON.stringify(timeJournal.entries[0]));invalid.record.xp=999;check('forged duel XP rejected',parseProgressEntry(invalid)===null);
const illegal=JSON.parse(JSON.stringify(timeJournal.entries[0]));illegal.difficulty='superhard';illegal.record.target.subject='vocab';check('invalid reward target/tier rejected',parseProgressEntry(illegal)===null);
const memory=new Map<string,string>();let failKey='';
const storage=createQuizStorage(()=>({getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{if(k===failKey){failKey='';throw Error('Injected failure');}memory.set(k,v);},removeItem:(k:string)=>memory.delete(k)}));
const must=<T>(r:{ok:true;value:T}|{ok:false;message:string})=>{if(r.ok===false)throw Error(r.message);return r.value;};
must(storage.writeDuelLearning(timeJournal));must(storage.writeStats(baseline(),{owner:'H'}));
const pending=must(readHydrationJournal(storage,'H',baseline(),{epochMs:T,monoMs:0,localDate:date()}));
check('crash before outbox append reconstructs pending entries',pending.entries.length===10);
const replayed=hydrateQuizProgress(baseline(),baseline(),pending.entries,T).stats;
check('hydration pays own timeout once with zero-impact suffix',replayed.totalAttempts===1&&replayed.xp===40);
must(storage.writeStats(replayed,{owner:'H'}));must(storage.acknowledgeOutbox('H',replayed));must(storage.writeDuelLearning({...timeJournal,acknowledgedThrough:10}));
check('acknowledged journal never rebuilds historic rewards after receipt pruning',must(readHydrationJournal(storage,'H',baseline(),{epochMs:T,monoMs:0,localDate:date()})).entries.length===0);
check('other owner cannot read this journal',must(storage.readDuelLearning('G'))===null);
must(storage.writeDuelLearning(enrollDuelLearning(kana,'G')));
check('completed journal is not pinned as pending',!must(readHydrationJournal(storage,'H',baseline(),{epochMs:T,monoMs:0,localDate:date()})).activeSessions.has(timeJournal.sessionId));
assert.throws(()=>parseDuelLearning(JSON.stringify(timeJournal),'G'));passed++;
memory.set('astra_duel_resume_v2:H','qa-pointer');
const before=JSON.stringify([...memory]);failKey=MASTER_STATS_KEY;
check('backup failure rolls back duel and solo journals',!storage.replaceFromBackup(baseline(),{owner:'H'}).ok&&JSON.stringify([...memory].sort())===JSON.stringify(JSON.parse(before).sort()));
must(storage.replaceFromBackup(baseline(),{owner:'H'}));
check('successful import clears current duel journal/pointer',!memory.has(duelJournalKey('H'))&&!memory.has('astra_duel_resume_v2:H'));
check('import preserves another owner journal',must(storage.readDuelLearning('G'))?.owner==='G');
const supers=switchDuelSubject({...DEFAULT_DUEL_SETTINGS,difficulty:'superhard',durationMs:3000},'vocab');
check('subject switch resets invalid tier/kind/public scope/default mode',supers.kind==='vocab-meaning'&&supers.durationMs===15000&&supers.mode==='parallel'&&!supers.pool.script);
check('public word inventory is not silently capped at256',publicDuelTargets(catalogs,supers).length>256);
check('no private learned/studied set choices',!JSON.stringify(DUEL_KIND_OPTIONS).includes('learned')&&duelSubjectLabel('vocab')==='Words');
console.log(`${passed} QZ11 duel learning checks passed; 0 failed. Live/browser/device checks NOT RUN.`);
