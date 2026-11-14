import type {FriendRecord,InviteResponse} from '../multiplayerOnline';
import type {Catalogs} from '../quiz/types';
import type {DuelSessionController} from '../quiz/useDuelSession';
import {summarizeDuel} from '../quiz/duel';
import {COMPANION_COPY} from '../quiz/companionCopy';
import {DuelLobby} from './quiz/DuelLobby';
import {DuelPlayer} from './quiz/DuelPlayer';
import {DuelResults} from './quiz/DuelResults';
import {StudioHeader,StudioShell,type StudioPresentation} from './quiz/StudioShell';
interface Props {
  controller:DuelSessionController;catalogs:Catalogs;profileName:string;friends:FriendRecord[];inviteResponses:InviteResponse[];
  pendingInviteUids:Set<string>;onInvite:(uid:string)=>void;onClearInvite:(uid:string)=>void;onFriendRequest:(uid:string,name?:string)=>void;
  onBack:()=>void;autoNext:boolean;onAutoNext:(value:boolean)=>void;speechEnabled:boolean;onSpeechChange:(value:boolean)=>void;
}
export default function OnlineMultiplayerScreen({controller:c,catalogs,profileName,friends,inviteResponses,pendingInviteUids,onInvite,onClearInvite,onFriendRequest,onBack,autoNext,onAutoNext,speechEnabled,onSpeechChange}:Props) {
  const result=c.room?.status==='finished'?summarizeDuel(c.room):null;
  const shell:StudioPresentation={speechEnabled,onSpeechChange,companion:result?{expression:result.partial?'intro':'encouraging',speech:COMPANION_COPY[result.partial?'result-partial':'result-mixed'][0].text}:{expression:c.room?.status==='playing'?'focused':'welcome',speech:COMPANION_COPY.greeting[0].text}};
  const back=async()=>{if(c.room&&c.room.status!=='finished'&&!await c.leave())return;c.forget();onBack();};
  if(c.room?.status==='finished')return <DuelResults controller={c} shell={shell} onBack={()=>void back()}/>;
  if(c.room?.status==='playing'){
    if(c.view&&c.view.phase!=='waiting-opponent'&&c.view.phase!=='opening')return <DuelPlayer controller={c} shell={shell} autoNext={autoNext} onAutoNext={onAutoNext}/>;
    return <StudioShell {...shell} label="Duel connection" width="player" header={<StudioHeader backLabel="Leave duel" onBack={()=>void back()}><p className="quiz-header__progress">Friendly duel</p></StudioHeader>}>
      <section className="quiz-card quiz-stack"><h1 className="quiz-title">{c.view?.phase==='waiting-opponent'?'Your set is finished':'Opening your question'}</h1>
        <p className="quiz-body">{c.view?.phase==='waiting-opponent'?'Your friend is finishing their set. Your confirmed answers are kept.':'The room is confirming your question and its deadline.'}</p>
        {!c.connected&&<p className="quiz-notice" role="status">Your connection was lost. Reconnecting…</p>}
        {c.view?.opponentDisconnected&&<p className="quiz-notice" role="status">Your friend lost connection. Reconnecting…</p>}
        {c.view?.canEndForConnection&&<button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.endConnection()}>End this interrupted match</button>}
        {c.error&&<p className="quiz-notice" role="alert">{c.error}</p>}
        <button className="quiz-btn quiz-btn--secondary" onClick={()=>void c.retry()}>Retry connection</button>
        <button className="quiz-btn quiz-btn--quiet" onClick={()=>void back()}>Leave and keep partial results</button>
      </section>
    </StudioShell>;
  }
  return <DuelLobby controller={c} catalogs={catalogs} name={profileName} shell={shell} onBack={()=>void back()} friends={<section className="quiz-stack" aria-label="Invite a friend">
    <h2 className="quiz-section-title">Friends</h2>
    {!friends.length&&<p className="quiz-help">Use your room code, or add friends from Profile.</p>}
    {friends.map(friend=><div key={friend.uid} className="quiz-row"><span>{friend.name}</span><button className="quiz-btn quiz-btn--secondary" aria-disabled={!!c.room?.guestId||pendingInviteUids.has(friend.uid)} onClick={()=>{if(!c.room?.guestId&&!pendingInviteUids.has(friend.uid))onInvite(friend.uid);}}>{pendingInviteUids.has(friend.uid)?'Invited':'Invite'}</button></div>)}
    {inviteResponses.map(response=><p key={response.uid} className="quiz-help">{response.status}<button className="quiz-btn quiz-btn--quiet" onClick={()=>onClearInvite(response.uid)}>Dismiss</button></p>)}
    {c.room?.guestId&&c.room.guestId!==c.uid&&!friends.some(f=>f.uid===c.room!.guestId)&&<button className="quiz-btn quiz-btn--quiet" onClick={()=>onFriendRequest(c.room!.guestId!,c.room!.guestName??'Guest')}>Add this player as a friend</button>}
    {c.room?.hostId!==c.uid&&c.room&&!friends.some(f=>f.uid===c.room!.hostId)&&<button className="quiz-btn quiz-btn--quiet" onClick={()=>onFriendRequest(c.room!.hostId,c.room!.hostName)}>Add this player as a friend</button>}
  </section>}/>;
}
