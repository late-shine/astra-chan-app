import { useState } from "react";
import { studyScene, studyTheme } from "../../appearance";

/** The entrance wash and the studio use identical responsive sources and fallback behavior. */
export function AtelierRoom({ unavailable = false, theme, imageRef, onImageLoad }: {
  unavailable?: boolean;
  theme: string;
  imageRef?: (image: HTMLImageElement | null) => void;
  onImageLoad?: () => void;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const requested = studyTheme(theme);
  const selected = failed.includes(requested) ? 'rainy-atelier' : requested;
  const { desktop, mobile } = studyScene(selected);
  if (unavailable || failed.includes(selected)) return null;
  return <picture key={selected} className="quiz-room" aria-hidden="true">
    {mobile.webpSrcSet && <source media="(max-width: 767px)" type="image/webp" srcSet={mobile.webpSrcSet} sizes="100vw" />}
    <source media="(max-width: 767px)" srcSet={mobile.srcSet} sizes="100vw" />
    {desktop.webpSrcSet && <source type="image/webp" srcSet={desktop.webpSrcSet} sizes="100vw" />}
    <img ref={imageRef} onLoad={onImageLoad} src={desktop.src} srcSet={desktop.srcSet} sizes="100vw" width={desktop.width} height={desktop.height}
      alt="" fetchPriority="high" decoding="async" draggable={false} onError={() => setFailed(prior => [...prior, selected])} />
  </picture>;
}
