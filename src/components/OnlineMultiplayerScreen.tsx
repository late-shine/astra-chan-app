import type {FriendRecord,InviteResponse} from '../multiplayerOnline';
import type {DuelLearning} from '../quiz/useDuelLearning';
import {DuelLearningStatus} from './quiz/DuelLearningStatus';
import type {Catalogs} from '../quiz/types';
import type {DuelSessionController} from '../quiz/useDuelSession';
import {useDuelCompanion} from '../quiz/useDuelCompanion';
import {DuelLobby} from './quiz/DuelLobby';
import {DuelPlayer,DuelScoreboard} from './quiz/DuelPlayer';
import {DuelResults} from './quiz/DuelResults';
import {DuelInvitations} from './quiz/DuelInvitations';
import {StudioHeader,StudioMark,StudioShell,type StudioPresentation} from './quiz/StudioShell';
interface Props {
  learning:DuelLearning;onRepair:()=>void;repairCount:number;repairUnavailable?:string;
  controller:DuelSessionController;catalogs:Catalogs;profileName:string;friends:FriendRecord[];inviteResponses:InviteResponse[];
  pendingInviteUids:Set<string>;onInvite:(uid:string)=>Promise<string|null>;onClearInvite:(uid:string)=>Promise<string|null>;onFriendRequest:(uid:string,name?:string)=>void;
  onBack:()=>void;autoNext:boolean;onAutoNext:(value:boolean)=>void;speechEnabled:boolean;onSpeechChange:(value:boolean)=>void;
}
export default function OnlineMultiplayerScreen({controller:c,learning,onRepair,repairCount,repairUnavailable,catalogs,profileName,friends,inviteResponses,pendingInviteUids,onInvite,onClearInvite,onFriendRequest,onBack,autoNext,onAutoNext,speechEnabled,onSpeechChange}:Props) {
  const companion=useDuelCompanion({controller:c,learning,speechEnabled});
  const shell:StudioPresentation={speechEnabled,onSpeechChange,companion};
  const back=async()=>{if(c.room&&c.room.status!=='finished'){const waiting=c.room.status==='waiting';if(!await c.leave())return;if(!waiting)return;}if(learning.pending&&!learning.volatile)return;c.forget();onBack();};
  if(c.room?.status==='finished')return <DuelResults controller={c} learning={learning} onRepair={onRepair} repairCount={repairCount} repairUnavailable={repairUnavailable} shell={shell} onBack={()=>void back()}/>;
  if(c.room?.status==='playing'){
    if(c.view&&c.view.phase!=='waiting-opponent'&&c.view.phase!=='opening')return <DuelPlayer controller={c} learning={learning} shell={shell} autoNext={autoNext} onAutoNext={onAutoNext}/>;
    return <StudioShell {...shell} presentation="duel-match" label="Duel connection" width="player" header={<StudioHeader backLabel="Leave duel" onBack={()=>void back()}><p className="quiz-header__progress">Friendly duel</p></StudioHeader>}>
      <section className="quiz-card quiz-stack duel-connection">
        <DuelScoreboard room={c.room} uid={c.uid}/>
        <StudioMark className="duel-connection__mark"/><h1 className="quiz-title">{c.view?.phase==='waiting-opponent'?'Your set is finished':'Opening your question'}</h1>
        <p className="quiz-body">{c.view?.phase==='waiting-opponent'?'Your friend is finishing their set. Your confirmed answers are kept.':'The room is confirming your question and its deadline.'}</p>
        {!c.connected&&<p className="quiz-notice" role="status">Your connection was lost. Reconnecting…</p>}
        {c.view?.opponentDisconnected&&<p className="quiz-notice" role="status">Your friend lost connection. Reconnecting…</p>}
        {c.view?.canEndForConnection&&<button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.endConnection()}>End this interrupted match</button>}
        {c.error&&<p className="quiz-notice" role="alert">{c.error}</p>}
        <DuelLearningStatus learning={learning}/><button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.retry()}>Retry connection</button>
        <button className="quiz-btn quiz-btn--quiet" onClick={()=>void back()}>Leave and keep partial results</button>
      </section>
    </StudioShell>;
  }
  return <DuelLobby learning={learning} controller={c} catalogs={catalogs} name={profileName} shell={shell} onBack={()=>void back()} friends={<div key={`${c.uid}:${c.code}`}><DuelInvitations controller={c} friends={friends} responses={inviteResponses} pendingInviteUids={pendingInviteUids} onInvite={onInvite} onClear={onClearInvite} onFriendRequest={onFriendRequest}/></div>}/>;
}
