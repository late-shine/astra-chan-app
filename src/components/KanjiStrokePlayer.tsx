import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Hash, Repeat, Crosshair, ChevronDown } from "lucide-react";
import { useKanjiStrokes, type StrokeGuideHandle } from "../kanjiStrokes/strokeStore";
import { KANJIVG_RELEASE } from "../kanjiStrokes/manifest";
import type { KanjiStroke, KanjiStrokeData } from "../kanjiStrokes/types";

/**
 * KanjiStrokePlayer — Phase B2 stroke demonstration.
 *
 * Draws the REAL KanjiVG stroke paths one at a time (SVG stroke-dashoffset on the actual
 * path), never a font glyph with a reveal effect. If no stroke data exists for a card the
 * stage says so; nothing is ever synthesised.
 *
 * Structure (three exports sharing one state through context):
 *   <KanjiStrokePlayerProvider kanji>  owns state, timing and data loading
 *   <KanjiStrokeStage />               the square SVG picture       (goes in DrawingCanvas's Watch stage)
 *   <KanjiStrokeControls />            transport + toggles + credit  (goes in DrawingCanvas's Watch footer)
 *
 * PLAYER API (for B3)
 *   useKanjiStrokePlayer() → {
 *     kanji, guide: {status, data, retry}, total,
 *     current   // 0-based index of the stroke in focus
 *     t         // 0..1 draw progress of `current`; strokes before it are complete
 *     playing, speed (0.5|1|2), showNumbers, focus, loop, reducedMotion,
 *     actions: { play, pause, toggle, prev, next, restart, setSpeed, toggleNumbers, toggleFocus, toggleLoop }
 *   }
 *   Coordinates are KanjiVG's 109×109 space, y down.
 */

// ───────────────────────── state ─────────────────────────

const HOLD_MS = 350; // pause at the end of each stroke while playing
export const SPEEDS = [0.5, 1, 2] as const;
export type PlayerSpeed = (typeof SPEEDS)[number];

interface Pos {
  kanji: string;
  current: number;
  t: number;
  playing: boolean;
  /** ms left to linger on a just-finished stroke before moving on */
  hold: number;
}

type Act =
  | { type: "reset"; kanji: string }
  | { type: "play"; total: number; loop: boolean }
  | { type: "pause" }
  | { type: "next"; total: number }
  | { type: "prev" }
  | { type: "restart"; play: boolean }
  | { type: "tick"; dt: number; speed: number; strokes: KanjiStroke[]; loop: boolean };

const initialPos = (kanji: string): Pos => ({ kanji, current: 0, t: 0, playing: false, hold: 0 });

/** Longer strokes take longer, within sensible bounds (ms at 1×). */
function strokeDuration(s: KanjiStroke): number {
  return Math.min(1300, Math.max(400, 350 + s.len * 10));
}

function reduce(s: Pos, a: Act): Pos {
  switch (a.type) {
    case "reset":
      return initialPos(a.kanji);
    case "pause":
      return s.playing ? { ...s, playing: false, hold: 0 } : s;
    case "play": {
      if (a.total === 0) return s;
      const last = a.total - 1;
      if (s.t >= 1) {
        if (a.loop) return { ...s, t: 0, playing: true, hold: 0 };
        if (s.current >= last) return { ...s, current: 0, t: 0, playing: true, hold: 0 }; // replay from the top
        return { ...s, current: s.current + 1, t: 0, playing: true, hold: 0 };
      }
      return { ...s, playing: true, hold: 0 };
    }
    case "next": {
      if (a.total === 0) return s;
      const base = { ...s, playing: false, hold: 0 };
      if (s.t < 1) return { ...base, t: 1 }; // finish the stroke in focus first
      return s.current < a.total - 1 ? { ...base, current: s.current + 1, t: 1 } : base;
    }
    case "prev": {
      const base = { ...s, playing: false, hold: 0 };
      if (s.current === 0) return { ...base, t: 0 };
      return { ...base, current: s.current - 1, t: 1 };
    }
    case "restart":
      return { ...s, current: 0, t: 0, playing: a.play, hold: 0 };
    case "tick": {
      if (!s.playing || a.strokes.length === 0) return s;
      const last = a.strokes.length - 1;
      if (s.hold > 0) {
        const hold = s.hold - a.dt;
        if (hold > 0) return { ...s, hold };
        if (a.loop) return { ...s, t: 0, hold: 0 };
        if (s.current < last) return { ...s, current: s.current + 1, t: 0, hold: 0 };
        return { ...s, playing: false, hold: 0 }; // finished the last stroke
      }
      const t = s.t + a.dt / (strokeDuration(a.strokes[s.current]) / a.speed);
      return t >= 1 ? { ...s, t: 1, hold: HOLD_MS / a.speed } : { ...s, t };
    }
    default:
      return s;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ───────────────────────── context ─────────────────────────

interface PlayerActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  prev: () => void;
  next: () => void;
  restart: () => void;
  setSpeed: (s: PlayerSpeed) => void;
  toggleNumbers: () => void;
  toggleFocus: () => void;
  toggleLoop: () => void;
}

export interface KanjiStrokePlayerApi {
  kanji: string;
  guide: StrokeGuideHandle;
  total: number;
  current: number;
  t: number;
  playing: boolean;
  speed: PlayerSpeed;
  showNumbers: boolean;
  focus: boolean;
  loop: boolean;
  reducedMotion: boolean;
  actions: PlayerActions;
}

const PlayerContext = createContext<KanjiStrokePlayerApi | null>(null);

export function useKanjiStrokePlayer(): KanjiStrokePlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("useKanjiStrokePlayer must be used inside <KanjiStrokePlayerProvider>");
  return ctx;
}

export function KanjiStrokePlayerProvider({ kanji, children }: { kanji: string; children: ReactNode }) {
  const guide = useKanjiStrokes(kanji);
  const reducedMotion = usePrefersReducedMotion();
  const [raw, dispatch] = useReducer(reduce, kanji, initialPos);
  const [speed, setSpeedState] = useState<PlayerSpeed>(1);
  const [showNumbers, setShowNumbers] = useState(true);
  const [focus, setFocus] = useState(false);
  const [loop, setLoop] = useState(false);

  // State from a previous kanji is never shown for the new one (covers the render before the reset lands).
  const pos = raw.kanji === kanji ? raw : initialPos(kanji);
  useEffect(() => {
    if (raw.kanji !== kanji) dispatch({ type: "reset", kanji });
  }, [raw.kanji, kanji]);

  const strokes = guide.data?.strokes ?? [];
  const total = strokes.length;

  // Animation clock: runs only while playing, and never under reduced motion.
  useEffect(() => {
    if (!pos.playing || reducedMotion || total === 0) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 100); // a backgrounded tab must not fast-forward the demo
      last = now;
      dispatch({ type: "tick", dt, speed, strokes, loop });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [pos.playing, reducedMotion, total, speed, loop, strokes]);

  // If the OS reduced-motion setting flips on mid-playback, stop the animation.
  useEffect(() => {
    if (reducedMotion && raw.playing) dispatch({ type: "pause" });
  }, [reducedMotion, raw.playing]);

  const play = useCallback(() => {
    if (!reducedMotion) dispatch({ type: "play", total, loop });
  }, [reducedMotion, total, loop]);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(() => {
    if (pos.playing) dispatch({ type: "pause" });
    else play();
  }, [pos.playing, play]);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const next = useCallback(() => dispatch({ type: "next", total }), [total]);
  const restart = useCallback(() => dispatch({ type: "restart", play: !reducedMotion && total > 0 }), [reducedMotion, total]);

  const actions = useMemo<PlayerActions>(
    () => ({
      play,
      pause,
      toggle,
      prev,
      next,
      restart,
      setSpeed: setSpeedState,
      toggleNumbers: () => setShowNumbers((v: boolean) => !v),
      toggleFocus: () => setFocus((v: boolean) => !v),
      toggleLoop: () => setLoop((v: boolean) => !v),
    }),
    [play, pause, toggle, prev, next, restart],
  );

  const api: KanjiStrokePlayerApi = {
    kanji,
    guide,
    total,
    current: Math.min(pos.current, Math.max(total - 1, 0)),
    t: pos.t,
    playing: pos.playing && !reducedMotion,
    speed,
    showNumbers,
    focus,
    loop,
    reducedMotion,
    actions,
  };
  return <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>;
}

// ───────────────────────── stage ─────────────────────────

const INK = "var(--kz-ink, #2B2D2B)";
const ACCENT = "var(--kz-accent, #C27D56)";

/** Same centre-cross-and-diagonals grid as KanjiSpecimen, so the two feel like one system. */
function Grid({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <g stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" fill="none" opacity="0.7" className="text-natural-border">
      <line x1="54.5" y1="2" x2="54.5" y2="107" />
      <line x1="2" y1="54.5" x2="107" y2="54.5" />
      <line x1="2" y1="2" x2="107" y2="107" />
      <line x1="107" y1="2" x2="2" y2="107" />
    </g>
  );
}

function StageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center" role="status">
      {children}
    </div>
  );
}

export function KanjiStrokeStage({ showGrid = true }: { showGrid?: boolean }) {
  const p = useKanjiStrokePlayer();
  const { guide, actions } = p;

  // Leaving Watch (this component unmounts) must never leave an invisible animation running.
  const pause = actions.pause;
  useEffect(() => () => pause(), [pause]);

  if (guide.status === "loading") {
    return (
      <StageMessage>
        <p className="kz-label text-natural-clay">Loading stroke guide…</p>
      </StageMessage>
    );
  }
  if (guide.status === "error") {
    return (
      <StageMessage>
        <p className="kz-label text-natural-clay">Couldn’t load the stroke guide</p>
        <p className="font-serif text-xs italic leading-snug text-natural-forest-light">Check your connection and try again.</p>
        <button
          type="button"
          onClick={guide.retry}
          className="cursor-pointer rounded-lg border border-natural-border px-3 py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-natural-forest hover:bg-natural-forest/10"
        >
          Retry
        </button>
      </StageMessage>
    );
  }
  if (guide.status === "unavailable" || !guide.data) {
    return (
      <StageMessage>
        <p className="kz-label text-natural-clay">Stroke guide unavailable</p>
        <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
          There is no verified stroke data for {p.kanji} yet, so Astra-chan won’t guess. You can still trace and write it.
        </p>
      </StageMessage>
    );
  }

  const data: KanjiStrokeData = guide.data;
  const { current, t, showNumbers, focus } = p;
  const cur = data.strokes[current];
  const complete = t >= 1;

  return (
    <svg
      viewBox="0 0 109 109"
      className="h-full w-full"
      role="img"
      aria-label={`Stroke order for ${p.kanji}: stroke ${current + 1} of ${p.total}`}
    >
      <Grid visible={showGrid} />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Faint ghost of the whole character: shows proportion and what is still to come */}
        {data.strokes.map((s) => (
          <path key={`ghost-${s.n}`} d={s.d} stroke={INK} strokeWidth={3.6} opacity={0.1} />
        ))}
        {/* Strokes already finished */}
        {data.strokes.slice(0, current).map((s) => (
          <path key={`done-${s.n}`} d={s.d} stroke={INK} strokeWidth={3.6} opacity={focus ? 0.3 : 0.92} />
        ))}
        {/* The stroke in focus, drawn along its real path via a normalised dash */}
        {t > 0 && (
          <path
            key={`cur-${cur.n}`}
            d={cur.d}
            pathLength={1}
            stroke={ACCENT}
            strokeWidth={4.2}
            strokeDasharray="1 1"
            strokeDashoffset={complete ? 0 : 1 - t}
          />
        )}
      </g>

      {/* Direction cues: a dot where the pen lands, an arrowhead where it lifts */}
      <circle cx={cur.start[0]} cy={cur.start[1]} r={3.4} fill={ACCENT} stroke="var(--kz-surface-specimen, #FAF9F6)" strokeWidth={1} />
      {complete && (
        <polygon
          points="-4.2,-3.8 3.6,0 -4.2,3.8"
          fill={ACCENT}
          transform={`translate(${cur.end[0]} ${cur.end[1]}) rotate(${cur.endDir})`}
        />
      )}

      {showNumbers &&
        data.strokes.map((s, i) => {
          if (!s.num) return null;
          const isCur = i === current;
          const done = i < current || (isCur && complete);
          return (
            <text
              key={`num-${s.n}`}
              x={s.num[0]}
              y={s.num[1]}
              fontSize={isCur ? 8.5 : 7.5}
              fontWeight={isCur ? 800 : 600}
              fill={isCur ? ACCENT : INK}
              opacity={isCur ? 1 : done ? (focus ? 0.4 : 0.8) : 0.3}
              className="select-none"
            >
              {s.n}
            </text>
          );
        })}
    </svg>
  );
}

// ───────────────────────── controls ─────────────────────────

const BTN =
  "inline-flex h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--kz-border-strong)] bg-[var(--kz-surface-card)] px-2.5 text-[var(--kz-ink)] transition hover:bg-[var(--kz-surface-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kz-accent)] disabled:cursor-not-allowed disabled:opacity-40";
const BTN_ON =
  "border-[var(--kz-border-accent)] bg-[var(--kz-surface-accent)] text-[var(--kz-accent)]";
const CHIP =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--kz-border-strong)] px-2.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-[var(--kz-ink-muted)] transition hover:bg-[var(--kz-surface-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kz-accent)] disabled:cursor-not-allowed disabled:opacity-40";

export function KanjiStrokeControls() {
  const p = useKanjiStrokePlayer();
  const a = p.actions;
  // UI-1: Focus / Loop / Speed are advanced, so they sit behind one "More" control. The local state
  // resets each time Watch is entered (this component unmounts when the mode changes).
  const [moreOpen, setMoreOpen] = useState(false);
  const ready = p.guide.status === "ready" && p.total > 0;
  const atStart = p.current === 0 && p.t === 0;
  const atEnd = p.current >= p.total - 1 && p.t >= 1;
  const advancedOn = p.focus || p.loop || p.speed !== 1;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Stroke playback">
          <button type="button" className={BTN} onClick={a.prev} disabled={!ready || atStart} aria-label="Previous stroke" title="Previous stroke">
            <SkipBack className="h-4 w-4" />
          </button>
          {!p.reducedMotion && (
            <button
              type="button"
              className={`${BTN} ${p.playing ? BTN_ON : ""}`}
              onClick={a.toggle}
              disabled={!ready}
              aria-label={p.playing ? "Pause" : atEnd ? "Replay" : "Play"}
              title={p.playing ? "Pause" : atEnd ? "Replay" : "Play"}
            >
              {p.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}
          <button type="button" className={BTN} onClick={a.next} disabled={!ready || atEnd} aria-label="Next stroke" title="Next stroke">
            <SkipForward className="h-4 w-4" />
          </button>
          <button type="button" className={BTN} onClick={a.restart} disabled={!ready} aria-label="Restart from the first stroke" title="Restart">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <p className="kz-label text-[var(--kz-ink-muted)]" role="status" aria-live="polite">
          {ready ? (p.t <= 0 ? `Ready · ${p.total} strokes` : `Stroke ${p.current + 1} / ${p.total}`) : "—"}
        </p>
      </div>

      {/* Numbers stays in view (it is what a beginner reaches for first); the rest is one tap away. */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={`${CHIP} ${p.showNumbers ? BTN_ON : ""}`} onClick={a.toggleNumbers} aria-pressed={p.showNumbers} disabled={!ready}>
          <Hash className="h-3.5 w-3.5" /> Numbers
        </button>
        <button
          type="button"
          className={CHIP}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="kz-stroke-more"
        >
          More
          {advancedOn && !moreOpen && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--kz-accent)]" role="img" aria-label="some options are on" />
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {moreOpen && (
        <div id="kz-stroke-more" className="flex flex-col gap-3 border-t border-[var(--kz-border-hairline)] pt-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Display options">
            <button
              type="button"
              className={`${CHIP} ${p.focus ? BTN_ON : ""}`}
              onClick={a.toggleFocus}
              aria-pressed={p.focus}
              disabled={!ready}
              title="Dim finished strokes so the current one stands out"
            >
              <Crosshair className="h-3.5 w-3.5" /> Focus
            </button>
            {!p.reducedMotion && (
              <button
                type="button"
                className={`${CHIP} ${p.loop ? BTN_ON : ""}`}
                onClick={a.toggleLoop}
                aria-pressed={p.loop}
                disabled={!ready}
                title="Keep replaying the stroke in focus"
              >
                <Repeat className="h-3.5 w-3.5" /> Loop stroke
              </button>
            )}
          </div>

          {!p.reducedMotion ? (
            <div className="flex items-center gap-2">
              <span className="kz-label text-[var(--kz-ink-muted)]" id="kz-stroke-speed-label">
                Speed
              </span>
              <div role="radiogroup" aria-labelledby="kz-stroke-speed-label" className="inline-flex rounded-xl border border-[var(--kz-border-strong)] p-0.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={p.speed === s}
                    disabled={!ready}
                    onClick={() => a.setSpeed(s)}
                    className={`h-8 min-w-11 cursor-pointer rounded-[0.6rem] px-2 font-mono text-[11px] font-extrabold tracking-wider transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kz-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                      p.speed === s ? "bg-natural-forest text-natural-bg shadow-sm" : "text-natural-forest-light hover:text-natural-forest"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
              Reduced motion is on, so nothing animates. Step through the strokes with Previous and Next.
            </p>
          )}
        </div>
      )}

      {/* Reduced motion is stated here when the options are closed too, so the missing Play button is never a mystery. */}
      {p.reducedMotion && !moreOpen && (
        <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
          Reduced motion is on, so nothing animates. Step through the strokes with Previous and Next.
        </p>
      )}

      <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
        Dot = where the pen lands, arrow = where it lifts. Fonts may look a little different from this standard path.
      </p>
      <p className="text-[10px] leading-snug text-[var(--kz-ink-quiet)]">
        Stroke data:{" "}
        <a className="underline" href="https://kanjivg.tagaini.net/" target="_blank" rel="noopener noreferrer">
          KanjiVG
        </a>{" "}
        © Ulrich Apel and contributors, release {KANJIVG_RELEASE},{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">
          CC BY-SA 3.0
        </a>
        . Adapted for Astra’s stroke display and animation.{" "}
        <a className="underline" href="https://github.com/KanjiVG/kanjivg" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </p>
    </div>
  );
}
