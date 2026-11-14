import {useEffect,useRef,useState} from 'react';
import type {BuildConfig,Catalogs,QuizHistory} from './types';
import type {HomeRecommendation,HomeRecommendationReply,HomeRecommendationRequest} from './homeRecommendation.worker';
/** Only the small home summary crosses back. Session creation/grading remains in the existing controller. */
export function useHomeRecommendation(request:{catalogs:Catalogs;config:BuildConfig;history:QuizHistory}|null){
  const sequence=useRef(0),worker=useRef<Worker|null>(null);
  const [result,setResult]=useState<{request:typeof request;value?:HomeRecommendation;error?:string}>();
  useEffect(()=>{
    if(!request)return;
    const id=++sequence.current;
    try{
      worker.current??=new Worker(new URL('./homeRecommendation.worker.ts',import.meta.url),{type:'module'});
      const current=worker.current;
      current.onmessage=(event:MessageEvent<HomeRecommendationReply>)=>{if(event.data.id===id&&sequence.current===id)setResult({request,value:event.data.value,error:event.data.error});};
      current.onerror=()=>{if(sequence.current===id)setResult({request,error:'The recommendation could not be prepared. Customize practice to choose your set.'});current.terminate();if(worker.current===current)worker.current=null;};
      current.postMessage({...request,id} satisfies HomeRecommendationRequest);
    }catch{setResult({request,error:'The recommendation could not be prepared. Customize practice to choose your set.'});}
    return()=>{sequence.current++;};
  },[request]);
  useEffect(()=>()=>{worker.current?.terminate();worker.current=null;},[]);
  return result?.request===request?{value:result.value,error:result.error,loading:false}:{loading:!!request,value:undefined,error:undefined};
}
