/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, type ReactNode } from "react";
import { Trash2, RotateCcw, Eye, PenTool, Pencil, ClipboardCheck, RefreshCw, ChevronDown } from "lucide-react";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";

/**
 * DrawingCanvas — Phase A5 "practice station".
 *
 * Demonstration, tracing, free writing, and AI evaluation live together as one
 * station with four explicit modes:
 *   Watch  — stroke demonstration (UI shell only: no reference stroke data exists
 *            yet, that is Phase B2's job — see the overlay note below).
 *   Trace  — draw over the faint ghost character inside the grid.
 *   Write  — draw from memory; no ghost shown.
 *   Review — submit the drawing to Astra-chan's AI checker and read feedback.
 *
 * The physical <canvas id="practice-drawing-canvas"> stays mounted across every
 * mode (never conditionally unmounted) so App.tsx's handleEvaluateKanjiDrawing
 * (which reads it by that id) keeps working unchanged from any mode, and so the
 * learner's ink is never silently lost when switching modes. Only pointer
 * events and the ghost overlay are gated by mode. Undo/reset act on the same
 * shared stroke history regardless of which mode was active while drawing.
 *
 * MODE-STATE CONTRACT (for B2/B3)
 * --------------------------------
 * - `mode` is local state, one of "watch" | "trace" | "write" | "review". Not
 *   persisted across sessions. It IS reset to "trace" whenever `referenceChar`
 *   changes (kanji navigation) — same effect that clears the canvas's ink, see
 *   below. Without this, a learner sitting in "review" who navigates to a new
 *   kanji would land on a blank, drawing-locked Review pane and have to notice
 *   and manually switch back. `analysisResult`/`analysisError` are reset on the
 *   same navigation too, but that reset lives in App.tsx's handleKanjiNav, not
 *   here — this component only owns `mode` and the canvas's own ink/undo state.
 * - B2 (canonical stroke demonstration) should replace the "watch" mode's
 *   placeholder panel below with real SVG/animated playback. Nothing else in
 *   this component needs to change: swap the panel's contents, keep the mode id.
 * - B3 (vector stroke capture) should replace the pixel-canvas drawing/undo
 *   logic (getCoordinates/startDrawing/draw/stopDrawing/undoLast/clearCanvas)
 *   with real stroke-path capture, but can keep the four-mode shell, the
 *   pointer-gating pattern (`drawingEnabled`), and the "review" mode's
 *   feedback contract untouched.
 *
 * UI-1 (control simplification): the grid toggle now lives in the caption row above the canvas
 * (Watch / Trace / Write only), Trace/Write tools share one row, every control is at least 32px,
 * and captions are one short line so the canvas never moves between modes. UI-1b: the mode tabs are a
 * non-linear rail with arrow-key navigation, the default ink is Earthy Clay, and ink/thickness live behind
 * a "More" control that always shows the current brush. Element ids
 * (practice-drawing-canvas, color-*, brush-*, action-*) and all props are unchanged.
 */

type PracticeMode = "watch" | "trace" | "write" | "review";
type AnalysisResult = { score: number; feedbackTitle: string; advice: string; validDrawing?: boolean } | null;

interface DrawingCanvasProps {
  referenceChar?: string;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult;
  analysisError: string | null;
  onEvaluate: () => void;
  /**
   * Phase B2: real stroke demonstration for Watch mode. `watchStage` fills the canvas stage
   * (square); `watchControls` goes in the footer. Both are optional: without them Watch shows
   * the old "coming soon" placeholder. The canvas itself is untouched.
   */
  watchStage?: ReactNode;
  watchControls?: ReactNode;
  showGrid: boolean;
  onToggleGrid: () => void;
}

// Ink palette. These are *pixel* colors written into the canvas and exported to the
// AI checker as a PNG, so they are deliberately concrete hex values rather than theme
// variables (a canvas cannot read CSS variables at draw time, and changing them would
// change the pixels the evaluator sees). Do not "theme" these without checking
// api/analyze-kanji.ts.
//
// Phase A5: trimmed from four inks to two. The AI evaluator grades shape/structure,
// not ink color (confirmed against api/analyze-kanji.ts's prompt), so color choice is
// personalization, not a learning aid — "Green Grass" (bright, low contrast on light
// themes) and "Sienna Clay" (a near-duplicate of "Earthy Clay") are dropped, keeping
// one high-contrast default and one warm alternative.
//
// UI-1b: the default is now Earthy Clay (orange). It reads on every theme's canvas (3.1:1 on the
// light natural theme, 5.2–5.8:1 on the five dark ones — Forest Moss was 1.5:1 on the dark ones),
// and it also survives being flattened onto black, which matters because the export below is a
// transparent PNG. Forest Moss stays available as the second ink.
const INK_PALETTE = [
  { id: "color-clay", value: "#C27D56", title: "Earthy Clay brush" },
  { id: "color-forest", value: "#2E3A2F", title: "Forest Moss Ink" },
] as const;
const DEFAULT_INK = INK_PALETTE[0].value;

const BRUSHES = [
  { id: "brush-thin", width: 3, title: "Thin tip brush", short: "thin", dot: "h-1.5 w-1.5" },
  { id: "brush-medium", width: 6, title: "Medium tip brush", short: "medium", dot: "h-2.5 w-2.5" },
  { id: "brush-thick", width: 10, title: "Thick tip brush", short: "thick", dot: "h-3.5 w-3.5" },
] as const;

const MODES: Array<{ id: PracticeMode; label: string; icon: typeof Eye; hint: string; caption: string }> = [
  {
    id: "watch",
    label: "Watch",
    icon: Eye,
    hint: "Preview the stroke demonstration",
    caption: "Watch the strokes in order.",
  },
  {
    id: "trace",
    label: "Trace",
    icon: PenTool,
    hint: "Trace over the guide",
    caption: "Trace the faint guide.",
  },
  {
    id: "write",
    label: "Write",
    icon: Pencil,
    hint: "Write from memory",
    caption: "Write it from memory.",
  },
  {
    id: "review",
    label: "Review",
    icon: ClipboardCheck,
    hint: "Check your attempt",
    caption: "Check your attempt.",
  },
];

/** Tiny inline grid glyph (no icon-library dependency for one shape). */
function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M6 2v12M10 2v12M2 6h12M2 10h12" />
    </svg>
  );
}

export default function DrawingCanvas({ referenceChar, isAnalyzing, analysisResult, analysisError, onEvaluate, watchStage, watchControls, showGrid, onToggleGrid }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<PracticeMode>("trace");
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>(DEFAULT_INK);
  const [brushWidth, setBrushWidth] = useState(6);
  const [brushOpen, setBrushOpen] = useState(false);
  const [strokes, setStrokes] = useState<ImageData[]>([]);

  const drawingEnabled = mode === "trace" || mode === "write";
  const activeMeta = MODES.find((m) => m.id === mode)!;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset layout
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    clearCanvas();
    // Verifier-found bug fix: this previously ran once on mount only ([] deps), so
    // navigating to a different kanji left the previous kanji's ink on the canvas.
    // Keying on `referenceChar` clears on every kanji change while leaving `mode`
    // out of the *dependency list* on purpose — Trace/Write/Review must keep sharing
    // the same ink, only a new kanji should wipe it.
    //
    // Second verifier-found bug fix: `mode` itself still needs to be *reset* to
    // "trace" here (just not watched for triggering this effect — see above). Without
    // this, a learner sitting in Review who clicks Next lands on a new kanji with a
    // blank, drawing-locked Review canvas and has to notice and manually switch back
    // to Trace/Write. Resetting to "trace" mirrors the component's own initial state.
    setMode("trace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceChar]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    // Guard: "TouchEvent" constructor does not exist on some browsers (e.g. Firefox desktop).
    // Use feature-detection on the nativeEvent object instead of "instanceof".
    if ("touches" in e.nativeEvent && (e.nativeEvent as TouchEvent).touches.length > 0) {
      clientX = (e.nativeEvent as TouchEvent).touches[0].clientX;
      clientY = (e.nativeEvent as TouchEvent).touches[0].clientY;
    } else if ("clientX" in e.nativeEvent) {
      clientX = (e.nativeEvent as MouseEvent).clientX;
      clientY = (e.nativeEvent as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save previous state for undo (capped at 20 to prevent memory leak)
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setStrokes((prev) => [...prev.slice(-20), state]);
    } catch (err) {
      console.error(err);
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
  };

  const undoLast = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (strokes.length > 0) {
      const nextStrokes = [...strokes];
      const previousState = nextStrokes.pop();
      setStrokes(nextStrokes);

      if (previousState) {
        ctx.putImageData(previousState, 0, 0);
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Modes are not steps: any tab is available at any time. Arrow keys / Home / End move between them.
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = MODES.findIndex((m) => m.id === mode);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? MODES.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + MODES.length) % MODES.length;
    setMode(MODES[next].id);
    document.getElementById(`kz-mode-tab-${MODES[next].id}`)?.focus();
  };

  const activeInk = INK_PALETTE.find((ink) => ink.value === brushColor) ?? INK_PALETTE[0];
  const activeBrush = BRUSHES.find((brush) => brush.width === brushWidth) ?? BRUSHES[1];

  return (
    <div className="flex flex-col items-center gap-3 bg-natural-card border border-natural-border/70 rounded-3xl p-4 w-full max-w-sm mx-auto shadow-sm">
      {/* Mode rail: four equal segments, the current one lit. A track rather than numbered steps, so it
          reads as "where you are", never as "what comes next". Any tab can be chosen at any time. */}
      <div role="tablist" aria-label="Practice mode" onKeyDown={onTabKeyDown} className="flex w-full items-stretch gap-1">
        {MODES.map((m) => {
          const active = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`kz-mode-tab-${m.id}`}
              aria-selected={active}
              aria-controls="kz-mode-panel"
              tabIndex={active ? 0 : -1}
              title={m.hint}
              onClick={() => setMode(m.id)}
              className={`flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] px-1 text-[11px] font-mono font-extrabold uppercase transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40 sm:tracking-wide ${
                active
                  ? "border-natural-clay text-natural-charcoal"
                  : "border-natural-border/60 text-natural-forest-light hover:border-natural-forest-light hover:text-natural-forest"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-natural-clay" : ""}`} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* One short instruction for the active mode, with the grid toggle beside it. Fixed row
          height: the canvas below never moves when the mode changes. */}
      <div className="flex min-h-9 w-full items-center justify-between gap-2 px-1">
        <p className="min-w-0 flex-1 font-serif text-xs italic leading-snug text-natural-forest-light">{activeMeta.caption}</p>
        {mode !== "review" && (
          <button
            type="button"
            onClick={onToggleGrid}
            aria-pressed={showGrid}
            aria-label="Practice grid"
            title={showGrid ? "Hide practice grid" : "Show practice grid"}
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 font-mono text-[11px] font-extrabold uppercase tracking-wider transition motion-reduce:transition-none ${
              showGrid
                ? "border-natural-clay/40 bg-natural-clay/10 text-natural-clay"
                : "border-natural-border bg-natural-bg/60 text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
            }`}
          >
            <GridIcon className="h-3.5 w-3.5" />
            Grid
          </button>
        )}
      </div>

      {/* Grid Backplane & fixed-size Canvas — stays the same size in every mode */}
      <div className="relative w-[280px] h-[280px] bg-natural-bg border-2 border-natural-border rounded-2xl overflow-hidden shadow-inner">
        {/* Calligraphy Guideline Cross */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-natural-border/30"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-natural-border/30"></div>
          </div>
        )}

        {/* Floating backdrop ghost helper character — Trace mode only */}
        {mode === "trace" && referenceChar && (
          <div className="absolute inset-0 flex items-center justify-center text-natural-forest/8 font-bold select-none text-[150px] font-serif pointer-events-none">
            {referenceChar}
          </div>
        )}

        {/* Realtime Canvas — always mounted so the AI checker can always find it by id */}
        <canvas
          id="practice-drawing-canvas"
          ref={canvasRef}
          width={280}
          height={280}
          onMouseDown={drawingEnabled ? startDrawing : undefined}
          onMouseMove={drawingEnabled ? draw : undefined}
          onMouseUp={drawingEnabled ? stopDrawing : undefined}
          onMouseLeave={drawingEnabled ? stopDrawing : undefined}
          onTouchStart={drawingEnabled ? startDrawing : undefined}
          onTouchMove={drawingEnabled ? draw : undefined}
          onTouchEnd={drawingEnabled ? stopDrawing : undefined}
          className={`absolute inset-0 z-10 touch-none ${drawingEnabled ? "cursor-crosshair" : "pointer-events-none cursor-default"}`}
        />

        {/* Watch mode: honest placeholder, not a fake animation standing in for real stroke order */}
        {mode === "watch" &&
          (watchStage ? (
            <div className="absolute inset-0 z-20 bg-natural-card">{watchStage}</div>
          ) : (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-natural-card/95 px-6 text-center">
              <Eye className="h-6 w-6 text-natural-clay" />
              <p className="kz-label text-natural-clay">Coming soon</p>
              <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
                Astra-chan will draw each stroke here once reference stroke data is added.
              </p>
            </div>
          ))}
      </div>

      {/* Mode-dependent footer, id'd as the tabs' shared panel */}
      <div role="tabpanel" id="kz-mode-panel" aria-labelledby={`kz-mode-tab-${mode}`} className="flex w-full flex-col gap-3">
        {mode === "watch" && watchControls}

        {(mode === "trace" || mode === "write") && (
          <div className="flex w-full flex-col gap-2">
            {/* One row: the current brush (ink + thickness, always visible) with a More control, and the
                two actions you reach for constantly. Everything else is one tap away. */}
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setBrushOpen((open) => !open)}
                aria-expanded={brushOpen}
                aria-controls="kz-brush-options"
                aria-label={`More brush options. Current: ${activeInk.title}, ${activeBrush.short}.`}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-natural-border/70 bg-natural-bg/60 px-3 text-xs font-bold text-natural-forest-light transition motion-reduce:transition-none hover:border-natural-forest hover:text-natural-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-forest/40"
              >
                <span className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="block h-4 w-4 rounded-full border border-natural-border" style={{ backgroundColor: brushColor }} />
                  <span className="flex h-4 w-4 items-center justify-center">
                    <span className={`block rounded-full bg-natural-charcoal ${activeBrush.dot}`} />
                  </span>
                </span>
                More
                <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${brushOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {/* Undo & Clear — icon controls with tooltips, per A5 */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="action-undo"
                  onClick={undoLast}
                  title="Undo last stroke"
                  aria-label="Undo last stroke"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-natural-border bg-natural-bg text-natural-forest-light transition motion-reduce:transition-none hover:border-natural-forest hover:text-natural-forest"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  id="action-clear"
                  onClick={clearCanvas}
                  title="Clear canvas"
                  aria-label="Clear canvas"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-natural-terracotta/20 bg-natural-terracotta/10 text-natural-terracotta transition motion-reduce:transition-none hover:bg-natural-terracotta/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Brush options. Kept in the DOM (display:none when closed) so the control ids stay stable. */}
            <div id="kz-brush-options" className={`${brushOpen ? "flex" : "hidden"} w-full flex-wrap items-center justify-between gap-2 border-t border-natural-border/50 pt-2`}>
              <div className="flex items-center" role="group" aria-label="Ink colour">
                {INK_PALETTE.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    id={ink.id}
                    onClick={() => setBrushColor(ink.value)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl"
                    title={ink.title}
                    aria-label={ink.title}
                    aria-pressed={brushColor === ink.value}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full border-2 transition motion-reduce:transition-none ${
                        brushColor === ink.value ? "border-natural-forest shadow-sm" : "border-natural-border/60"
                      }`}
                      style={{ backgroundColor: ink.value }}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center rounded-xl border border-natural-border/60 bg-natural-bg p-0.5" role="group" aria-label="Brush thickness">
                {BRUSHES.map((brush) => (
                  <button
                    key={brush.id}
                    type="button"
                    id={brush.id}
                    onClick={() => setBrushWidth(brush.width)}
                    className={`flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg transition motion-reduce:transition-none ${
                      brushWidth === brush.width ? "bg-natural-card text-natural-forest" : "text-natural-forest-light/60 hover:text-natural-forest"
                    }`}
                    title={brush.title}
                    aria-label={brush.title}
                    aria-pressed={brushWidth === brush.width}
                  >
                    <span className={`block rounded-full bg-current ${brush.dot}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "review" && (
          <div className="flex flex-col gap-3">
            {/* Submit Button or Loading State */}
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center p-6 bg-natural-bg/50 border border-dashed border-natural-border/80 rounded-2xl text-center gap-3">
                <RefreshCw className="w-8 h-8 text-natural-clay animate-spin motion-reduce:animate-none" />
                <div>
                  <p className="text-xs font-serif font-bold text-natural-charcoal">Astra-chan is scanning your strokes...</p>
                  <p className="text-[10.5px] text-natural-forest-light mt-1 font-medium italic">"Checking brush weights, alignment, and spiritual canvas balance!"</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onEvaluate}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-transparent bg-natural-forest px-3 py-3 font-serif text-sm font-extrabold text-natural-bg transition motion-reduce:transition-none hover:bg-natural-forest/90 hover:shadow-md"
              >
                ✨ Check my drawing
              </button>
            )}

            {/* Rendering Assessment Errors — prominent fallback with offline hint */}
            {analysisError && (
              <div className="p-4 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-2xl text-left flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-xs font-serif font-extrabold text-natural-terracotta">AI Checker Unavailable</span>
                </div>
                <p className="text-xs text-natural-charcoal leading-relaxed font-sans">{analysisError}</p>
                <div className="mt-1 border-t border-natural-terracotta/20 pt-2.5">
                  <p className="kz-label mb-1">✏️ Offline self-check tips</p>
                  <ul className="text-xs text-natural-charcoal/80 leading-relaxed space-y-0.5 font-sans">
                    <li>• Does your stroke count match the reference ghost character?</li>
                    <li>• Are strokes flowing top-to-bottom and left-to-right?</li>
                    <li>• Does it fit neatly inside the grid square?</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={onEvaluate}
                  className="mt-1 py-2 bg-natural-forest/10 hover:bg-natural-forest/20 text-natural-forest border border-natural-forest/20 rounded-xl text-xs font-serif font-bold tracking-wider transition motion-reduce:transition-none cursor-pointer"
                >
                  ↻ Retry with AI
                </button>
              </div>
            )}

            {/* Rendering Astra-chan's Success / Critique Report Card — score/validity, then headline, then detail */}
            {analysisResult && (
              <div className="flex flex-col gap-3">
                {/* Score Badge Header */}
                <div className="flex items-center gap-3 p-3 bg-natural-bg rounded-2xl border border-natural-border/50">
                  <div className="w-12 h-12 rounded-full border-2 border-natural-clay flex items-center justify-center bg-natural-card font-mono text-base font-extrabold text-natural-charcoal shadow-inner shrink-0 relative">
                    {Number(analysisResult.score) || "?"}%
                  </div>
                  <div>
                    <span className="kz-label text-natural-clay">Drawing check</span>
                    <h5 className="font-serif font-extrabold text-xs text-natural-forest leading-tight mt-0.5">
                      {analysisResult.feedbackTitle}
                    </h5>
                    {!analysisResult.validDrawing && (
                      <span className="block text-[9px] text-natural-forest-light mt-1 font-medium">
                        0% means Astra did not detect a gradeable ink attempt — try again inside the grid.
                      </span>
                    )}
                  </div>
                </div>

                {/* Mascot Speech Bubble containing actual tips */}
                <div className="relative bg-natural-bg/60 border border-natural-border p-3.5 rounded-2xl text-left shadow-sm">
                  {/* Little triangle for bubble pointing upwards */}
                  <div className="absolute top-[-6px] left-8 w-3 h-3 bg-natural-card border-t border-l border-natural-border rotate-45"></div>

                  <div className="flex gap-2.5 items-start relative z-10">
                    <div className="w-8 h-8 rounded-full border border-natural-forest/20 bg-natural-bg overflow-hidden shrink-0 shadow-sm relative">
                      <img
                        src={companionImg}
                        alt="Astra-chan"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover scale-105"
                      />
                    </div>
                    <div className="text-xs text-natural-charcoal/90 leading-relaxed font-sans font-medium whitespace-pre-wrap flex-grow">
                      <span className="font-serif font-extrabold text-natural-forest block mb-1">Astra-chan says:</span>
                      {analysisResult.advice}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
