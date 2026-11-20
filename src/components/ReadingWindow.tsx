import { useEffect, useState, type CSSProperties } from "react";
import { studyScene } from "../appearance";
import type { BgOpacity } from "../preferences";
import { windowScene, type ReadingAppearance } from "../reading/appearancePreferences";
import mist from "../assets/images/bg_misty_sakura.jpg";
import train from "../assets/images/bg_sakura_train.jpg";
import sparkler from "../assets/images/bg_night_sparkler.jpg";
import rain from "../assets/images/bg_rainy_window_anime.jpg";

const originals = { "misty-sakura": mist, "sakura-train": train, "night-sparkler": sparkler, "rainy-window": rain };
const fadeMs = 2300;
type Scene = ReturnType<typeof windowScene>;

export function ReadingWindow({ choice, activeScene, transition, blur, opacity }: {
  choice: ReadingAppearance["readingWindow"]; activeScene: number; transition: ReadingAppearance["readingTransition"];
  blur: number; opacity: BgOpacity;
}) {
  const desired = windowScene(choice, activeScene);
  const [base, setBase] = useState<Scene>(desired);
  const [fading, setFading] = useState<Scene | null>(null);
  const [failed, setFailed] = useState<Scene | null>(null);
  useEffect(() => setFailed(null), [desired]);
  const incoming = fading ?? (desired !== base && desired !== failed ? desired : null);

  // Finish the current dissolve before showing the latest request. Two pictures suffice even during rapid changes.
  useEffect(() => {
    if (!fading) return;
    const finish = () => { setBase(fading); setFading(null); };
    const id = window.setTimeout(finish, transition === "instant" ? 0 : fadeMs);
    return () => window.clearTimeout(id);
  }, [fading, transition]);

  const layers: Scene[] = incoming ? [base, incoming] : [base];
  return <div className="reading-window" aria-hidden="true">
    <div className="reading-window-panes" style={{
      opacity: { "very-dim": 0.32, low: 0.52, medium: 0.76, vivid: 1 }[opacity],
      filter: blur ? `blur(${blur}px)` : undefined, "--window-dissolve": `${fadeMs}ms`,
    } as CSSProperties}>
      {layers.map(id => {
        const landscape = id === "forgotten-railway" || id === "morning-lilies" || id === "quiet-afternoon" ? studyScene(id) : null;
        return <picture key={id} className={id === base ? "window-base" : id === fading ? "window-dissolve" : "window-loading"}>
          {landscape && <source media="(max-width: 700px)" srcSet={landscape.mobile.srcSet} sizes="100vw" />}
          <img alt="" src={landscape?.desktop.src ?? originals[id as keyof typeof originals]}
            srcSet={landscape?.desktop.srcSet} sizes={landscape ? "100vw" : undefined} onLoad={() => {
              if (id !== incoming || fading) return;
              if (transition === "instant" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBase(id);
              else setFading(id);
            }} onError={() => {
              setFailed(id);
              if (id === base && !fading) setBase("misty-sakura");
              if (id === fading) setFading(null);
            }} />
        </picture>;
      })}
    </div>
  </div>;
}
