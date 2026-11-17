import { useEffect, useRef, useState } from 'react';

/** A home dialogue event owns this component. Remounting cancels an old reveal. */
export function PracticeSpeech({ text, reducedMotion = false }: { text: string; reducedMotion?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced = reducedMotion || systemReduced;
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced) { setFinished(true); return; }
    if (finished) return;
    if (typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') {
      setFinished(true);
      return;
    }
    const element = host.current!;
    let intersects = false;
    const update = () => {
      const readable = intersects && !element.closest('[inert]');
      setVisible(readable);
      // Opening setup or scrolling away finishes speech, rather than replaying
      // the same welcome when returning. Hidden entrance content waits first.
      if (!readable && started.current) setFinished(true);
    };
    const intersection = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update(); });
    intersection.observe(element);
    const inertChanges = new MutationObserver(update);
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      inertChanges.observe(parent, { attributes: true, attributeFilter: ['inert'] });
    }
    return () => { intersection.disconnect(); inertChanges.disconnect(); };
  }, [reduced, finished]);

  useEffect(() => {
    if (!visible || reduced || finished) return;
    started.current = true;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(text.length, Math.ceil(text.length * (now - start) / 1050));
      setCount(next);
      if (next < text.length) frame = requestAnimationFrame(tick);
      else setFinished(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, visible, reduced, finished]);

  return <div ref={host} className="practice-speech">
    <div className="quiz-companion__line practice-speech__text" aria-hidden="true">
      <span className="practice-speech__measure">{text}</span>
      <span className="practice-speech__visible">{reduced || finished ? text : text.slice(0, count)}</span>
    </div>
    {!reduced && <button type="button" className="practice-speech__reveal" aria-disabled={finished || undefined}
      tabIndex={finished ? -1 : 0}
      onClick={() => setFinished(true)}>Show full text</button>}
  </div>;
}
