import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AtelierRoom } from '../components/quiz/AtelierRoom';
import { useAppearance } from '../components/Appearance';
import { approach, documentJourney, mediaPlane, seekFrame, smooth, timeline, journeySettleTarget, journeyCrossing } from './timeline.js';
import { createInk } from './ink.js';
import './entrance.css';

/** One document scroll: app shell → sticky room → real, naturally scrolling Practice. */
export function RoomEntrance({ onBack, onCoverChange, children }: { onBack: () => void; onCoverChange: (covered: boolean) => void; children: ReactNode }) {
  const [portrait, setPortrait] = useState(() => innerWidth < 768);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [mediaState, setMediaState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [posterReady, setPosterReady] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const root = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null), destination = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const poster = useRef<HTMLImageElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const cue = useRef<HTMLButtonElement>(null), chrome = useRef<HTMLDivElement>(null);
  const advance = useRef<() => void>(() => {}), skip = useRef<() => void>(() => {});
  const launchScroll = useRef(window.scrollY), progress = useRef(0);
  const coverageCallback = useRef(onCoverChange);
  coverageCallback.current = onCoverChange;
  const variant = portrait ? 'mobile' : 'desktop';
  const { theme } = useAppearance();
  const washImage = useRef<HTMLImageElement | null>(null);
  const refreshInk = useRef<(() => void) | null>(null);
  const attachWashImage = useCallback((image: HTMLImageElement | null) => {
    washImage.current = image;
    refreshInk.current?.();
  }, []);
  const posterUrl = `/assets/entrance/room-${variant}.webp`;

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    const resize = () => setPortrait(innerWidth < 768);
    query.addEventListener('change', change); window.addEventListener('resize', resize);
    return () => { query.removeEventListener('change', change); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const el = root.current!, box = stage.current!, card = frame.current!;
    const app = el.closest<HTMLElement>('[data-entrance]');
    const tone = app?.querySelector<HTMLElement>('.astra-entrance-tone');
    // The wrapper survives the canvas being unmounted at full coverage.
    // Its opacity is already correct when particles remount on reversal.
    const particles = app?.querySelector<HTMLElement>('.astra-app-atmosphere');
    const v = video.current!, cv = canvas.current!, end = destination.current!;
    let live = true, raf = 0, previous = 0, p = progress.current, target = p;
    let loaded = false, failed = false, duration = 0, desiredTime = 0, lastRequested = -1;
    let settleTimer = 0, settleRaf = 0, snapping = false, touching = false;
    let lastScroll = window.scrollY, scrollDirection = 0, landingUntil = 0, landingPoint = 0;
    let watchdog = 0, seekPending = false, pendingFocus = false, stalls = 0, inkTimer = 0;
    let width = 0, height = innerHeight, top = 0, endScroll = 0, settleStart = 0, contentWidth = 0;
    let plane = mediaPlane(innerWidth, height, portrait), initialScale = plane.startScale, initialY = 0;
    let ink: ReturnType<typeof createInk> | null = null, available = false;
    let wasActive = false, wasCovered = false;
    let textureSource = '';
    setMediaState('loading'); setPosterFailed(false);
    setPosterReady(poster.current!.complete && poster.current!.naturalWidth > 0);
    v.style.opacity = '0';
    function wake() { if (live && !raf) { previous = 0; raf = requestAnimationFrame(tick); } }
    function measure() {
      const nextWidth = document.documentElement.clientWidth;
      const nextContentWidth = el.parentElement!.clientWidth;
      // Do not resize the artwork in response to a phone address bar changing height.
      if (width !== nextWidth || contentWidth !== nextContentWidth || (!portrait && height !== innerHeight)) {
        width = nextWidth; contentWidth = nextContentWidth; height = innerHeight;
        el.style.setProperty('--entrance-width', `${width}px`);
        el.style.setProperty('--entrance-height', `${height}px`);
        plane = mediaPlane(width, height, portrait);
        initialScale = Math.min(contentWidth / plane.width, height * .76 / plane.height, 1);
        initialY = 12 + plane.height * initialScale / 2 - height / 2;
        const bounds = { width: `${plane.width}px`, height: `${plane.height}px`, left: `${plane.left}px`, top: `${plane.top}px` };
        Object.assign(card.style, bounds);
        ink?.resize(width, height);
      }
      top = el.getBoundingClientRect().top + window.scrollY;
      const measuredJourney = documentJourney(window.scrollY, launchScroll.current, top, height, reduced);
      endScroll = measuredJourney.end;
      settleStart = measuredJourney.settleStart;
      const nextSpacer = `${Math.max(0, endScroll - top - height)}px`;
      if (spacer.current!.style.height !== nextSpacer) spacer.current!.style.height = nextSpacer;
      wake();
    }
    const modalOpen = () => !!document.querySelector('dialog[open], [aria-modal="true"]');
    function cancelSettle() {
      window.clearTimeout(settleTimer); cancelAnimationFrame(settleRaf);
      settleRaf = 0; snapping = false;
    }
    function glideTo(point: number) {
      cancelSettle(); landingUntil = 0;
      const from = window.scrollY;
      if (reduced || Math.abs(from - point) < 2) {
        window.scrollTo({top: point, behavior: 'instant'}); lastScroll = point; wake(); return;
      }
      snapping = true;
      const began = performance.now();
      const duration = 280;
      const step = (now: number) => {
        if (!live || modalOpen()) { cancelSettle(); return; }
        const fraction = Math.min(1, (now - began) / duration);
        window.scrollTo({top: from + (point - from) * smooth(0, 1, fraction), behavior: 'instant'});
        lastScroll = window.scrollY; wake();
        if (fraction < 1) settleRaf = requestAnimationFrame(step);
        else { snapping = false; settleRaf = 0; landingPoint = point; landingUntil = now + 180; }
      };
      settleRaf = requestAnimationFrame(step);
    }
    function queueSettle() {
      window.clearTimeout(settleTimer);
      if (snapping || touching || document.hidden || modalOpen()) return;
      settleTimer = window.setTimeout(() => {
        if (touching || document.hidden || modalOpen()) return;
        const point = journeySettleTarget(window.scrollY, settleStart, endScroll, scrollDirection);
        if (point !== null) glideTo(point);
      }, 180);
    }
    function onScroll() {
      let y = window.scrollY;
      if (!snapping && !modalOpen()) {
        // Catch one large gesture at the section boundary; leave content scroll alone.
        const crossing = journeyCrossing(y, lastScroll, launchScroll.current, endScroll);
        if (crossing !== null) { landingPoint = crossing; landingUntil = performance.now() + 180; }
        const pastLanding = landingPoint === endScroll ? y > landingPoint + 1 : y < landingPoint - 1;
        if (performance.now() < landingUntil && pastLanding) {
          y = landingPoint; window.scrollTo({top:y, behavior:'instant'});
        }
        if (Math.abs(y - lastScroll) > 1) scrollDirection = Math.sign(y - lastScroll);
      }
      lastScroll = y; wake(); queueSettle();
    }
    const interrupt = () => { cancelSettle(); queueSettle(); };
    const touchStart = () => { touching = true; cancelSettle(); };
    const touchEnd = () => { touching = false; queueSettle(); };
    const keyScroll = (event: KeyboardEvent) => {
      if (modalOpen() || (event.target instanceof Element && event.target.closest('input,textarea,select,button,a,[contenteditable]'))) return;
      if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) interrupt();
    };
    function fail() {
      if (!live || failed) return;
      failed = true; loaded = false; seekPending = false; v.style.opacity = '0';
      v.pause(); v.removeAttribute('src'); v.load();
      window.clearTimeout(watchdog); setMediaState('failed'); wake();
    }
    function recover() {
      if (!live || failed || !loaded) return;
      if (++stalls > 3) { fail(); return; }
      lastRequested = -1;
      try { v.currentTime = desiredTime; } catch { fail(); return; }
      watchdog = window.setTimeout(recover, 4000);
    }
    function seek() {
      if (!loaded || failed || reduced || v.seeking) return;
      const next = seekFrame(desiredTime, duration, v.currentTime, lastRequested);
      if (next !== null) {
        lastRequested = next; seekPending = true;
        window.clearTimeout(watchdog); watchdog = window.setTimeout(recover, 4000);
        try { v.currentTime = next; } catch { fail(); }
      }
    }
    function tick(now: number) {
      raf = 0; if (!live || document.hidden) return;
      const journey = documentJourney(window.scrollY, launchScroll.current, top, height, reduced);
      const covered = journey.takeover >= .999;
      if (covered !== wasCovered) {
        wasCovered = covered;
        if (app) {
          if (covered) app.dataset.roomCovered = 'true';
          else delete app.dataset.roomCovered;
        }
        coverageCallback.current(covered);
      }
      target = journey.story;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60;
      previous = now;
      p = reduced ? target : approach(p, target, dt, .095);
      // Finish finite settling, rather than issuing sub-frame seeks indefinitely.
      if (Math.abs(p - target) < .0005) p = target;
      progress.current = p;
      const t = timeline(p);
      if (t.ink > 0 && !available && !reduced && inkTimer) {
        window.clearTimeout(inkTimer); inkTimer = 0; syncInk();
      }
      desiredTime = t.video * Math.max(0, duration - 1 / 30); seek();
      // Layout expansion is tied directly to scroll, never to delayed video decoding.
      const expansion = reduced ? 0 : journey.takeover;
      const pinned = smooth(top, top + height * (reduced ? .15 : .55), window.scrollY);
      const scale = initialScale + (1 - initialScale) * expansion;
      // Keep the whole top edge visible beside the app. Introduce the centered
      // fullscreen crop only after the stage is pinned to the viewport top.
      const y = initialY * (1 - expansion) + Math.min(0, plane.top) * ((reduced ? 0 : pinned) - expansion);
      card.style.transform = `translate3d(0,${y}px,0) scale(${scale})`;
      // Keep per-frame custom properties on the stage so Practice descendants do not restyle every frame.
      box.style.setProperty('--entrance-radius', `${20 * (1 - expansion) / scale}px`);
      // The backdrop has a transparent upper edge while the shell is visible.
      // Seal that edge only after pinning, becoming solid before camera/ink.
      box.style.setProperty('--entrance-darkness', String(smooth(.12, .95, journey.takeover)));
      box.style.setProperty('--entrance-mat-seal', String(pinned));
      // Quiet, colored shadows replace repeated scenery. Wisps recede before
      // the camera begins, keeping the later ink wash a distinct moment.
      const shadows = smooth(.03, .58, journey.takeover) * (1 - smooth(.84, 1, journey.takeover));
      const mist = smooth(.12, .46, journey.takeover) * (1 - smooth(.62, .95, journey.takeover));
      box.style.setProperty('--entrance-shadows', String(shadows));
      box.style.setProperty('--entrance-mist', String(mist * (reduced ? .35 : 1)));
      box.style.setProperty('--entrance-mist-drift', `${reduced ? 0 : 18 * journey.takeover}px`);
      // This wash sits behind the existing shell, so its controls stay clear.
      if (tone) tone.style.opacity = String(.78 * smooth(.04, .82, journey.takeover) * (1 - smooth(.94, 1, journey.takeover)));
      if (particles) particles.style.opacity = String(1 - smooth(.12, .76, journey.takeover));
      box.style.setProperty('--entrance-copy', String(1 - smooth(.05, .75, journey.takeover)));
      box.style.setProperty('--entrance-room', t.ink > 0 ? '1' : '0');
      cv.style.opacity = available && !reduced && t.ink > 0 && t.ink < 1 ? '1' : '0';
      card.style.opacity = t.ink >= 1 ? '0' : available && !reduced ? '1' : String(1 - t.ink);
      if (available && !reduced && t.ink > 0 && t.ink < 1) ink!.render(t.ink);
      const reveal = smooth(.92, 1, p);
      // Destination is in the document, so upward scrolling retraces the room.
      const active = target >= .995 && p >= .995;
      // Fully opaque when interactive: do not trap existing fixed setup sheets
      // in an opacity stacking context below the app sound dock.
      end.style.opacity = active ? "1" : String(reveal);
      if (active !== wasActive) { end.inert = !active; wasActive = active; }
      const controlsHidden = target >= .99;
      chrome.current!.inert = controlsHidden;
      chrome.current!.style.opacity = controlsHidden ? '0' : '1';
      cue.current!.inert = journey.takeover >= .8;
      cue.current!.style.opacity = String(1 - smooth(.4, .8, journey.takeover));
      if (pendingFocus && active) {
        pendingFocus = false;
        const title = end.querySelector<HTMLElement>('h1');
        if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
      }
      if (import.meta.env.DEV) {
        Object.assign(el.dataset, { progress: p.toFixed(4), takeover: journey.takeover.toFixed(4), targetTime: desiredTime.toFixed(3), videoTime: v.currentTime.toFixed(3), ink: available ? 'webgl' : 'crossfade' });
      }
      // No idle animation loop. Scroll, resize, and decoder events wake us.
      if (p !== target) raf = requestAnimationFrame(tick);
    }
    const syncInk = () => {
      const image = washImage.current;
      const source = image?.complete && image.naturalWidth ? image.currentSrc : '';
      if (!live || reduced || (available && source === textureSource)) return;
      ink?.dispose();
      ink = null;
      available = false;
      cv.style.opacity = '0';
      textureSource = source;
      if (image && source) {
        try {
          ink = createInk(cv, image);
          ink.resize(width, height);
          available = true;
        } catch { /* The same picture supplies the crossfade without WebGL. */ }
      }
      wake();
    };
    const scheduleInk = () => {
      if (!live || reduced) return;
      window.clearTimeout(inkTimer);
      inkTimer = window.setTimeout(() => { inkTimer = 0; syncInk(); }, 400);
    };
    const onData = () => {
      if (failed || reduced) return;
      duration = v.duration;
      if (!Number.isFinite(duration) || duration <= 0) { fail(); return; }
      loaded = true; stalls = 0; window.clearTimeout(watchdog); setMediaState('ready');
      desiredTime = timeline(p).video * Math.max(0, duration - 1 / 30);
      if (desiredTime < 1 / 30) v.style.opacity = '1';
      seek(); wake();
    };
    const onSeeked = () => {
      seekPending = false; stalls = 0; window.clearTimeout(watchdog);
      if (!failed) v.style.opacity = '1';
      seek(); wake();
    };
    const visibility = () => {
      if (document.hidden) { window.clearTimeout(watchdog); cancelSettle(); }
      else {
        if (!reduced && !failed) {
          if (!loaded) watchdog = window.setTimeout(fail, 15000);
          else if (seekPending) watchdog = window.setTimeout(recover, 4000);
        }
        wake();
      }
    };
    const contextLost = (e: Event) => { e.preventDefault(); available = false; wake(); };
    end.inert = true;
    refreshInk.current = scheduleInk;
    cv.addEventListener('webglcontextlost', contextLost);
    v.addEventListener('loadeddata', onData); v.addEventListener('seeked', onSeeked); v.addEventListener('error', fail);
    if (!reduced) { v.src = `/assets/entrance/room-${variant}.mp4`; v.load(); watchdog = window.setTimeout(fail, 15000); }
    else { v.pause(); v.removeAttribute('src'); v.load(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', touchStart, { passive: true });
    window.addEventListener('touchend', touchEnd, { passive: true });
    window.addEventListener('touchcancel', touchEnd, { passive: true });
    window.addEventListener('keydown', keyScroll); window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', visibility);
    // Track layout above the room (e.g. the existing companion changing height).
    const observer = new ResizeObserver(measure);
    observer.observe(el.parentElement!);
    if (app) observer.observe(app);
    measure();
    scheduleInk();
    // The cue advances a little; only Skip explicitly jumps to the destination.
    advance.current = () => window.scrollTo({ top: Math.min(endScroll, window.scrollY + height * .65), behavior: reduced ? 'instant' : 'smooth' });
    skip.current = () => { cancelSettle(); landingUntil = 0; lastScroll = endScroll; pendingFocus = true; p = 1; window.scrollTo({ top: endScroll, behavior: 'instant' }); wake(); };
    return () => {
      live = false; cancelSettle(); cancelAnimationFrame(raf); window.clearTimeout(watchdog); window.clearTimeout(inkTimer); refreshInk.current = null; observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchcancel', touchEnd);
      window.removeEventListener('keydown', keyScroll); window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', visibility); cv.removeEventListener('webglcontextlost', contextLost);
      v.removeEventListener('loadeddata', onData); v.removeEventListener('seeked', onSeeked); v.removeEventListener('error', fail);
      ink?.dispose(); v.pause(); v.removeAttribute('src'); v.load();
      tone?.style.removeProperty('opacity');
      particles?.style.removeProperty('opacity');
      if (app) delete app.dataset.roomCovered;
      coverageCallback.current(false);
    };
  }, [portrait, reduced, variant]);

  return <section ref={root} className="astra-entrance" data-poster-ready={posterReady} aria-label="Astra’s room entrance">
    <div ref={stage} className="astra-entrance__stage">
      <div className="astra-entrance__mat" />
      <div className="astra-entrance__shadows" aria-hidden="true" />
      <div className="astra-entrance__room" aria-hidden="true">
        <AtelierRoom theme={theme} imageRef={attachWashImage} onImageLoad={() => refreshInk.current?.()} />
      </div>
      <div ref={frame} className="astra-entrance__frame">
        <img key={posterUrl} ref={poster} src={posterUrl} onLoad={() => setPosterReady(true)} onError={() => { setPosterReady(false); setPosterFailed(true); }} alt="Astra waits beside an open book in her softly lit room." />
        <video ref={video} muted playsInline preload="auto" aria-hidden="true" disablePictureInPicture />
        <div className="astra-entrance__shade" />
        <div className="astra-entrance__opening" aria-hidden="true"><span>THE ROOM BETWEEN CHAPTERS</span><h2>Some places<br />keep a little <em>magic.</em></h2><p>A quiet moment. Then, something new.</p></div>
      </div>
      <div className="astra-entrance__mist" aria-hidden="true">
        <div className="astra-entrance__mist-bank astra-entrance__mist-bank--left" />
        <div className="astra-entrance__mist-bank astra-entrance__mist-bank--right" />
      </div>
      <canvas ref={canvas} className="astra-entrance__ink" aria-hidden="true" />
      <div ref={chrome} className="astra-entrance__header">
        <button className="astra-entrance__back" onClick={onBack}>Back to Study Room</button>
        <button className="astra-entrance__skip" onClick={() => skip.current()}>Skip to Practice <span aria-hidden="true">↗</span></button>
      </div>
      <button ref={cue} className="astra-entrance__cue" onClick={() => advance.current()}><i aria-hidden="true" /><span>Scroll to step inside</span><small>Take your time.</small></button>
      <p className="astra-entrance__status" role="status">{posterFailed ? 'Room artwork unavailable · Practice is ready below' : !posterReady ? 'Preparing Astra’s room…' : reduced ? 'Still artwork · reduced motion' : mediaState === 'loading' ? 'Opening the room · still artwork while loading' : mediaState === 'failed' ? 'Still artwork · the room is ready to enter' : 'A moment with Astra'}</p>
    </div>
    <div ref={spacer} className="astra-entrance__travel" aria-hidden="true" />
    <div ref={destination} className="astra-entrance__destination" inert>{children}</div>
  </section>;
}
