import type {DuelLearning} from '../../quiz/useDuelLearning';
export function DuelLearningStatus({learning:l}:{learning:DuelLearning}){
  if(l.error)return <div className="quiz-notice" role="status"><p>{l.error}</p><button className="quiz-btn quiz-btn--secondary" onClick={l.retry}>Retry learning save</button>{!l.volatile&&<button className="quiz-btn quiz-btn--quiet" onClick={l.continueWithoutRecovery}>Continue without recovery</button>}<p className="quiz-help">The match clock keeps running. Unsaved learning progress can be lost if this page closes.</p></div>;
  return <p className="quiz-help" role="status">{l.pending?'Saving your learning progress…':l.eligible?'Learning rewards enabled · confirmed answers save on this device.':'Learning rewards start when you join a new shared lobby. This match remains playable.'}</p>;
}
