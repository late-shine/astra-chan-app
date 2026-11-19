import assert from 'node:assert/strict';
import {HIRAGANA_DATA,KATAKANA_DATA,KANJI_DATA,VOCABULARY_DATA} from '../src/data';
import {DEFAULT_DUEL_SETTINGS} from '../src/quiz/useDuelSession';
import {publicDuelTargets,switchDuelSubject,DUEL_KIND_OPTIONS} from '../src/quiz/duelSetup';
import {buildDuelManifest,createDuelRoom,joinDuel,acknowledgeReady,startMatch,openParallelQuestion,applyDuelAnswer,advanceParallel,advanceCompetitive,changeDuelSettings,summarizeDuel,decodeDuelRoom,rematch,ALL_DUEL_LIMITS,DUEL_LIMITS,type DuelResult} from '../src/quiz/duel';
import {enrollDuelLearning,projectDuelLearning,parseDuelLearning,mappedDuelMisses} from '../src/quiz/duelProgress';
import type {Catalogs,DuelSettings,DuelRoom} from '../src/quiz/types';
const catalogs:Catalogs={hiragana:HIRAGANA_DATA,katakana:KATAKANA_DATA,kanji:KANJI_DATA,vocabulary:VOCABULARY_DATA};
const initial=1800000000000;
const room=(r:DuelResult)=>{assert.ok(r.ok&&r.room,JSON.stringify(r));return (r as {room:DuelRoom}).room;};
const scope=(r:DuelRoom,uid='H',now=initial)=>({uid,now,matchId:r.v2.matchId,revision:r.v2.settingsRevision});
for(const subject of ['kana','vocab','kanji'] as const)for(const kind of DUEL_KIND_OPTIONS[subject]){
  const settings:DuelSettings={...switchDuelSubject(DEFAULT_DUEL_SETTINGS,subject),kind:kind.id,count:'all'};
  const expected=publicDuelTargets(catalogs,settings).length;
  const manifest=buildDuelManifest(catalogs,settings,'all_catalog_0',1);
  assert.equal(manifest.questions.length,expected);
  assert.equal(new Set(manifest.questions.map(q=>q.itemId)).size,expected);
  console.log(`${kind.id}: All includes ${expected} distinct targets`);
}
for(const mode of ['competitive','parallel'] as const){
  const settings:DuelSettings={...DEFAULT_DUEL_SETTINGS,count:'all',mode};
  let r=room(createDuelRoom('H','Host',settings,`all_${mode}`,initial));
  r=room(joinDuel(r,scope(r,'G'),'Guest'));
  let journal=enrollDuelLearning(r,'H');
  r=room(acknowledgeReady(r,scope(r),2));r=room(acknowledgeReady(r,scope(r,'G'),2));
  const manifest=buildDuelManifest(catalogs,settings,r.v2.matchId,1);
  r=room(startMatch(r,scope(r),manifest,initial+1500));
  assert.ok(manifest.questions.length>20);
  for(let index=0;index<manifest.questions.length;index++){
    const now=initial+2000+index*4000;
    for(const uid of ['H','G']){
      if(mode==='parallel')r=room(openParallelQuestion(r,scope(r,uid,now),index));
      const q=manifest.questions[index];assert.equal(q.responseType,'choice');
      if(q.responseType!=='choice')throw Error('Expected choices');
      r=room(applyDuelAnswer(r,scope(r,uid,now+100),{index,receiptId:`${uid}_${index}`,capturedAt:now+100,response:{type:'choice',choiceId:q.choices.find(c=>c.id!==q.correctChoiceId)!.id}}));
      if(mode==='parallel')r=room(advanceParallel(r,scope(r,uid,now+200),index,'manual'));
    }
    if(mode==='competitive')r=room(advanceCompetitive(r,scope(r,'H',now+1800),index,now+4000));
    journal=projectDuelLearning(r,journal,()=> '2026-11-19');
    assert.deepEqual(parseDuelLearning(JSON.stringify(journal),'H'),journal);
  }
  assert.equal(summarizeDuel(r).complete,true);
  assert.equal(journal.entries.length,manifest.questions.length);
  assert.equal(mappedDuelMisses(r,'H',catalogs).length,manifest.questions.length);
  assert.equal(decodeDuelRoom(r).v2.settings.count,'all');
  r=room(rematch(r,scope(r),`${r.v2.seriesId}_1`));
  assert.equal(r.v2.readiness,undefined);
  assert.equal(r.v2.expiresAt-r.v2.createdAt,ALL_DUEL_LIMITS.ttlMs);
  r=room(changeDuelSettings(r,scope(r),{...settings,count:10}));
  assert.equal(r.v2.expiresAt-r.v2.createdAt,DUEL_LIMITS.ttlMs);
  console.log(`${mode}: full All match, >20 answers, learning save reload, misses and rematch passed`);
}
