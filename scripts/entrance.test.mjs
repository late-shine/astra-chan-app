import test from 'node:test';
import assert from 'node:assert/strict';
import {timeline,approach,mediaPlane,seekFrame,documentJourney,journeySettleTarget,journeyCrossing} from '../src/entrance/timeline.js';
test('camera and expansion finish before ink; reversing retraces the same timeline',()=>{
  assert.equal(timeline(.56).video,1);assert.equal(timeline(.56).expand,1);assert.equal(timeline(.56).ink,0);
  const forward=Array.from({length:101},(_,i)=>timeline(i/100));
  const reverse=Array.from({length:101},(_,i)=>timeline(1-i/100)).reverse();
  for(let i=0;i<101;i++) for(const k of ['expand','video','ink']) assert.ok(Math.abs(forward[i][k]-reverse[i][k])<1e-12);
  assert.equal(timeline(1).ink,1);
});
test('smoothing settles without overshoot and responds immediately to reversal',()=>{
  let p=0;for(let i=0;i<18;i++)p=approach(p,1,1/60,.095);
  assert.ok(p>.95&&p<1);const reversed=approach(p,0,1/60,.095);assert.ok(reversed<p&&reversed>0);
});
test('media plane preserves aspect ratio, fits opening, and covers final viewport',()=>{
  for(const [w,h,phone] of [[1440,900,false],[882,745,false],[390,844,true],[320,568,true]]){
    const p=mediaPlane(w,h,phone);assert.ok(Math.abs(p.width/p.height-(phone?9/16:16/9))<1e-10);
    assert.ok(p.width>=w&&p.height>=h);assert.ok(p.width*p.startScale<=w);assert.ok(p.height*p.startScale<=h);
  }
});
test('seek does not repeat a frame after the decoder rounds its presentation time',()=>{
  const next=seekFrame(4.027,9.667,0,-1);assert.equal(next,121/30);
  assert.equal(seekFrame(4.027,9.667,3.966,next),null);
  assert.equal(seekFrame(3,9.667,4,next),3);
  assert.ok(seekFrame(30,9.667,0,-1)<9.667);assert.equal(seekFrame(1,NaN,0,-1),null);
});

test('shell and room overlap before camera begins, and document travel reverses from Practice',()=>{
  const start=120, top=800, height=844;
  assert.equal(documentJourney(start,start,top,height).takeover,0);
  const overlap=documentJourney(500,start,top,height);
  assert.ok(overlap.takeover>0 && overlap.takeover<1);
  assert.equal(overlap.story,0);
  const end=documentJourney(top,start,top,height).end;
  assert.equal(documentJourney(Math.floor(end),start,top,height).story,1);
  assert.equal(documentJourney(end+600,start,top,height).story,1);
  assert.ok(documentJourney(end-300,start,top,height).story<1);
  assert.equal(documentJourney(start,start,top,height).takeover,0);
  const halfway=documentJourney((top+height*.55+end)/2,start,top,height);
  assert.equal(halfway.takeover,1);
  assert.ok(Math.abs(halfway.story-.5)<1e-9);
});

test('frame hysteresis rejects tiny rest noise but allows purposeful forward and reverse seeks',()=>{
  for (const desired of [4.001,3.999,4.018,3.982]) assert.equal(seekFrame(desired,9.667,4,4),null);
  assert.equal(seekFrame(4.04,9.667,4,4),121/30);
  assert.equal(seekFrame(3.96,9.667,4,4),119/30);
  assert.equal(seekFrame(.01,.02,0,-1),null);
});

test('entrance can pause anywhere before the final handoff in either direction',()=>{
  for(const reduced of [false,true]) for(const height of [568,844,1080]){
    const start=120,{end,settleStart}=documentJourney(start,start,800,height,reduced);
    assert.ok(end-settleStart<=160);
    assert.ok(end-settleStart<=height*.2+1e-9);
    for(let y=start;y<settleStart;y+=7){
      for(const direction of [-1,0,1]) assert.equal(journeySettleTarget(y,settleStart,end,direction),null);
    }
    // Including camera/ink halfway points; no start-to-end or reverse autoplay.
    const middle=(start+settleStart)/2;
    assert.equal(journeySettleTarget(middle,settleStart,end,1),null);
    assert.equal(journeySettleTarget(middle,settleStart,end,-1),null);
  }
});

test('only forward motion in the final reveal settles; reversal and Practice scrolling stay free',()=>{
  const {end,settleStart}=documentJourney(120,120,800,844);
  assert.equal(journeySettleTarget(settleStart-.1,settleStart,end,1),null);
  for(let y=settleStart;y<end-1;y+=3){
    assert.equal(journeySettleTarget(y,settleStart,end,1),end);
    assert.equal(journeySettleTarget(y,settleStart,end,-1),null);
    assert.equal(journeySettleTarget(y,settleStart,end,0),null);
  }
  for(const y of [end,end+50,end+500]) assert.equal(journeySettleTarget(y,settleStart,end,1),null);
});

test('large forward crossing lands at Practice; reverse crossing never snaps to the start',()=>{
  const start=120,end=3800;
  assert.equal(journeyCrossing(6000,500,start,end),end);
  assert.equal(journeyCrossing(0,3700,start,end),null);
  assert.equal(journeyCrossing(4500,4000,start,end),null);
  assert.equal(journeyCrossing(4000,4500,start,end),null);
  assert.equal(journeyCrossing(3500,4000,start,end),null);
  assert.equal(journeyCrossing(4200,end,start,end),null);
});
