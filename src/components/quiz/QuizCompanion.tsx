import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ATELIER_PORTRAITS, type AtelierExpression } from "../../quiz/atelierAssets";
import type { QuizCompanionView } from "./viewTypes";

export interface QuizCompanionProps {
  view: QuizCompanionView;
  unavailable?: boolean;
  onInteract?: () => void;
}

const warmed = new Set<AtelierExpression>();

/** Decorative decoding never owns quiz state, focus, speech, or a timer. */
export function QuizCompanion({ view, unavailable = false, onInteract }: QuizCompanionProps) {
  const desired = useRef(view.expression);
  desired.current = view.expression;
  const [shown, setShown] = useState<{ current: AtelierExpression | null; previous: AtelierExpression | null }>({ current: null, previous: null });
  const [failed, setFailed] = useState<AtelierExpression | null>(null);

  useEffect(() => {
    if (unavailable) return;
    let idle: number | undefined;
    let timer: number | undefined;
    const preload = (ids: AtelierExpression[]) => {
      for (const id of ids) {
        if (warmed.has(id) || id === desired.current) continue;
        warmed.add(id);
        const image = new Image();
        const asset = ATELIER_PORTRAITS[id];
        if (window.matchMedia("(min-width: 1100px)").matches) {
          image.sizes = "420px";
          image.srcset = asset.webpSrcSet;
          image.src = asset.webp;
        } else image.src = asset.mobileWebp;
      }
    };
    const frame = requestAnimationFrame(() => {
      preload(["pleased", "encouraging"]);
      const remaining = () => preload(["focused", "welcome", "celebrate", "intro", "trying"]);
      const requestIdle = window.requestIdleCallback;
      if (typeof requestIdle === "function") idle = window.requestIdleCallback(remaining, { timeout: 2500 });
      else timer = window.setTimeout(remaining, 1500);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [unavailable]);

  const portrait = (expression: AtelierExpression, layer: "current" | "previous" | "pending") => {
    const asset = ATELIER_PORTRAITS[expression];
    return <picture key={`${expression}-${layer}`} className="quiz-companion__art" data-layer={layer}
      onAnimationEnd={() => { if (layer === "current") setShown(previous => previous.previous ? { ...previous, previous: null } : previous); }}>
      <source media="(max-width: 1099px)" type="image/webp" srcSet={asset.mobileWebp} />
      <source media="(max-width: 1099px)" type="image/png" srcSet={asset.mobileSrc} />
      <source type="image/webp" srcSet={asset.webpSrcSet} sizes="(min-width: 1100px) min(27vw, 420px), 120px" />
      <img src={asset.src} srcSet={asset.srcSet} sizes="(min-width: 1100px) min(27vw, 420px), 120px"
        width={asset.width} height={asset.height} alt="" decoding="async" draggable={false}
        style={{ "--quiz-portrait-scale": asset.anchor.scale, "--quiz-portrait-y": `${asset.anchor.offsetY}%`,
          objectPosition: `${asset.anchor.x}% ${asset.anchor.y}%` } as CSSProperties}
        onLoad={layer === "pending" ? event => {
          const image = event.currentTarget;
          void image.decode().then(() => {
            if (desired.current !== expression) return;
            setFailed(null);
            setShown(previous => previous.current === expression ? previous : { current: expression, previous: previous.current });
          }).catch(() => { if (desired.current === expression) setFailed(expression); });
        } : undefined}
        onError={() => setFailed(expression)} />
    </picture>;
  };

  const hasArt = !unavailable && shown.current !== null && shown.current !== failed;
  return <aside className="quiz-companion" aria-label="Astra, study companion" data-expression={view.expression}
    data-art={hasArt ? "ready" : "fallback"} onPointerDown={onInteract} onPointerEnter={onInteract} onFocusCapture={onInteract}>
    <div className="quiz-companion__speech">
      <p className="quiz-companion__name">Astra<span className="quiz-companion__role"> · Your study companion</span></p>
      {view.speech && <p className="quiz-companion__line">{view.speech}</p>}
      {view.speech && <p className="quiz-companion__compact">Here with you.</p>}
    </div>
    <div className="quiz-companion__portrait" aria-hidden="true">
      {!hasArt && <span className="quiz-companion__fallback">Astra{view.speech && <><br /><span>Right here with you.</span></>}</span>}
      {!unavailable && <>
        {shown.previous && portrait(shown.previous, "previous")}
        {hasArt && portrait(shown.current!, "current")}
        {shown.current !== view.expression && failed !== view.expression && portrait(view.expression, "pending")}
      </>}
    </div>
  </aside>;
}
