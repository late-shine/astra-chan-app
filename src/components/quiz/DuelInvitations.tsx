import {useRef,useState} from 'react';
import type {FriendRecord,InviteResponse} from '../../multiplayerOnline';
import type {DuelSessionController} from '../../quiz/useDuelSession';

interface Props {
  controller:DuelSessionController;
  friends:FriendRecord[];
  responses:InviteResponse[];
  pendingInviteUids:Set<string>;
  onInvite:(uid:string)=>Promise<string|null>;
  onClear:(uid:string)=>Promise<string|null>;
  onFriendRequest:(uid:string,name?:string)=>void;
}

/** Only the existing invitation callbacks write to the network. */
export function DuelInvitations({controller:c,friends,responses,pendingInviteUids,onInvite,onClear,onFriendRequest}:Props) {
  const [sending,setSending]=useState<Set<string>>(()=>new Set());
  const [sent,setSent]=useState<Set<string>>(()=>new Set());
  const [error,setError]=useState<string|null>(null);
  const inflight=useRef(new Set<string>());
  const currentResponses=responses.filter(response=>response.roomCode===c.code);
  const send=async(uid:string)=>{
    if(c.busy||!c.connected||c.room?.guestId||inflight.current.has(uid)||pendingInviteUids.has(uid))return;
    inflight.current.add(uid);
    setSending(new Set(inflight.current));setError(null);
    try {
      const failure=await onInvite(uid);
      if(failure)setError(failure);
      else setSent(previous=>new Set(previous).add(uid));
    } catch (reason) { setError(reason instanceof Error?reason.message:'The invitation could not be sent. Try again.'); }
    finally { inflight.current.delete(uid);setSending(new Set(inflight.current)); }
  };
  const other=c.room?.hostId===c.uid?{uid:c.room.guestId,name:c.room.guestName}:{uid:c.room?.hostId,name:c.room?.hostName};
  return <section className="quiz-stack" aria-label="Invite a friend">
    <p className="quiz-body">Invite a friend to this room, or share the room code.</p>
    {!friends.length&&<p className="quiz-help">Add friends from Profile to invite them here.</p>}
    {error&&<p className="quiz-notice" role="alert">{error}</p>}
    {!c.connected&&<p className="quiz-notice" role="status">Reconnect before sending an invitation.</p>}
    {friends.map(friend=>{
      const response=currentResponses.find(item=>item.uid===friend.uid);
      const pending=response?.status==='sent'||sent.has(friend.uid)&&!response;
      const inFlight=sending.has(friend.uid)||pendingInviteUids.has(friend.uid)&&!response;
      const disabled=c.busy||!c.connected||!!c.room?.guestId||inFlight||pending;
      return <div key={friend.uid} className="duel-invite-row">
        <span>{friend.name}</span>
        <button type="button" className="quiz-btn quiz-btn--secondary" disabled={disabled} onClick={()=>void send(friend.uid)}>
          {inFlight?'Sending…':pending?'Invite sent':'Invite'}
        </button>
      </div>;
    })}
    {currentResponses.map(response=><div className="duel-invite-row" key={response.uid}>
      <p className="quiz-help" role="status">{friends.find(friend=>friend.uid===response.uid)?.name??'Friend'} · {response.status==='sent'?'Invitation sent':response.status==='accepted'?'Invitation accepted':'Invitation declined'}</p>
      <button type="button" className="quiz-btn quiz-btn--quiet" onClick={()=>void onClear(response.uid).then(failure=>{
        if(failure)setError(failure);else setSent(previous=>{const next=new Set(previous);next.delete(response.uid);return next;});
      })}>Dismiss</button>
    </div>)}
    {other.uid&&other.uid!==c.uid&&!friends.some(friend=>friend.uid===other.uid)&&<button type="button" className="quiz-btn quiz-btn--quiet" onClick={()=>onFriendRequest(other.uid!,other.name??'Guest')}>Add this player as a friend</button>}
  </section>;
}
