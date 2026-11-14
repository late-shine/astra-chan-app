/** Local computation only. No Firebase, storage, rewards or catalog mutation. */
import {recommend} from './recommend';
import type {BuildConfig,Catalogs,QuizHistory} from './types';
export interface HomeRecommendationRequest {id:number;catalogs:Catalogs;config:BuildConfig;history:QuizHistory}
export type HomeRecommendation=Pick<ReturnType<typeof recommend>,'count'|'summary'|'note'|'needsSetup'>;
export interface HomeRecommendationReply {id:number;value?:HomeRecommendation;error?:string}
self.onmessage=(event:MessageEvent<HomeRecommendationRequest>)=>{
  const {id,catalogs,config,history}=event.data;
  try{const {count,summary,note,needsSetup}=recommend(catalogs,config,history);self.postMessage({id,value:{count,summary,note,needsSetup}} satisfies HomeRecommendationReply);}
  catch{self.postMessage({id,error:'The recommendation could not be prepared. Customize practice to choose your set.'} satisfies HomeRecommendationReply);}
};
