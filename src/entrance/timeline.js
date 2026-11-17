export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export function smooth(a, b, v) { const x=clamp((v-a)/(b-a)); return x*x*(3-2*x); }
export function approach(current,target,dt,tau) { return current+(target-current)*(1-Math.exp(-dt/tau)); }
export function timeline(p) { return {expand:smooth(0,.43,p),video:smooth(0,.54,p),ink:p>=1?1:clamp((p-.56)/.44)}; }
// The media plane never changes aspect ratio or layout dimensions while scrolling.
// Uniform composited scaling avoids repeated object-fit crop/layout recalculation.
export function mediaPlane(width,height,portrait) {
  const ratio=portrait?9/16:16/9;
  const planeWidth=Math.max(width,height*ratio),planeHeight=planeWidth/ratio;
  const maxWidth=portrait?width-24:width-2*Math.min(width*.115,164);
  const maxHeight=Math.max(160,height-(portrait?186:176));
  return {width:planeWidth,height:planeHeight,left:(width-planeWidth)/2,top:(height-planeHeight)/2,startScale:Math.min(1,maxWidth/planeWidth,maxHeight/planeHeight)};
}
export function seekFrame(desired,duration,current,lastRequested,fps=30) {
  if(!Number.isFinite(duration)||duration<=0)return null;
  const bounded=clamp(desired,0,Math.max(0,duration-1/fps));
  // Hysteresis around the last requested frame prevents adjacent-frame chatter
  // from subpixel scroll noise. Decoder timestamps are not our scroll target.
  if(lastRequested>=0 && Math.abs(bounded-lastRequested)<.75/fps)return null;
  const next=Math.min(Math.round(bounded*fps),Math.max(0,Math.floor((duration-1/fps)*fps)))/fps;
  return Math.abs(current-next)>1/(fps*2)&&Math.abs(lastRequested-next)>1/(fps*2)?next:null;
}

// Separate shell takeover from the camera, so the image doesn't keep scaling
// after the wheel/finger stops while the decoder is still settling its frame.
export function documentJourney(scroll, start, top, height, reduced=false) {
  const takeoverEnd=top+height*(reduced ? .15 : .55);
  const travel=Math.round(height*(reduced ? .8 : 3));
  const end=takeoverEnd+travel;
  return {
    takeover: smooth(Math.min(start,top),takeoverEnd,scroll),
    story: scroll>=end-1 ? 1 : clamp((scroll-takeoverEnd)/travel),
    end,
  };
}
