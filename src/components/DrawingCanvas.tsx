/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Trash2, RotateCcw, Square, Eye, PenTool, Pencil, ClipboardCheck, Sparkles, RefreshCw } from "lucide-react";
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
 */

type PracticeMode = "watch" | "trace" | "write" | "review";
type AnalysisResult = { score: number; feedbackTitle: string; advice: string; validDrawing?: boolean } | null;

interface DrawingCanvasProps {
  referenceChar?: string;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult;
  analysisError: string | null;
  onEvaluate: () => void;
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
const INK_PALETTE = [
  { id: "color-forest", value: "#2E3A2F", title: "Forest Moss Ink" },
  { id: "color-clay", value: "#C27D56", title: "Earthy Clay brush" },
] as const;
const DEFAULT_INK = "#2E3A2F"; // Emerald Forest Ink

const MODES: Array<{ id: PracticeMode; label: string; icon: typeof Eye; hint: string; caption: string }> = [
  {
    id: "watch",
    label: "Watch",
    icon: Eye,
    hint: "Preview the stroke demonstration",
    caption: "Stroke demonstration — coming with real reference data.",
  },
  {
    id: "trace",
    label: "Trace",
    icon: PenTool,
    hint: "Trace over the guide",
    caption: "Trace the faint guide inside the grid.",
  },
  {
    id: "write",
    label: "Write",
    icon: Pencil,
    hint: "Write from memory",
    caption: "Write it from memory — no guide shown.",
  },
  {
    id: "review",
    label: "Review",
    icon: ClipboardCheck,
    hint: "Check your attempt",
    caption: "Check your attempt and see Astra-chan's feedback.",
  },
];

export default function DrawingCanvas({ referenceChar, isAnalyzing, analysisResult, analysisError, onEvaluate }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<PracticeMode>("trace");
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>(DEFAULT_INK);
  const [brushWidth, setBrushWidth] = useState(6);
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

  return (
    <div className="flex flex-col items-center gap-3 bg-natural-card border border-natural-border/70 rounded-3xl p-4 w-full max-w-sm mx-auto shadow-sm">
      {/* Mode tabs */}
      <div
        role="tablist"
        aria-label="Practice mode"
        className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-natural-border/60 bg-natural-bg p-1"
      >
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
              title={m.hint}
              onClick={() => setMode(m.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[10.5px] font-mono font-extrabold uppercase tracking-wide transition motion-reduce:transition-none ${
                active
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-natural-forest"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Instruction for the active mode, right where it's needed */}
      <p className="min-h-[1.1rem] px-1 text-center font-serif text-[11px] italic leading-snug text-natural-forest-light">
        {activeMeta.caption}
      </p>

      {/* Grid Backplane & fixed-size Canvas — stays the same size in every mode */}
      <div className="relative w-[280px] h-[280px] bg-natural-bg border-2 border-natural-border rounded-2xl overflow-hidden shadow-inner">
        {/* Calligraphy Guideline Cross */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-natural-border/40"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-natural-border/40"></div>
        </div>

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
        {mode === "watch" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-natural-card/95 px-6 text-center">
            <Eye className="h-6 w-6 text-natural-clay" />
            <p className="kz-label text-natural-clay">Coming soon</p>
            <p className="font-serif text-xs italic leading-snug text-natural-forest-light">
              Astra-chan will draw each stroke here once reference stroke data is added.
            </p>
          </div>
        )}
      </div>

      {/* Mode-dependent footer, id'd as the tabs' shared panel */}
      <div role="tabpanel" id="kz-mode-panel" aria-labelledby={`kz-mode-tab-${mode}`} className="flex w-full flex-col gap-3">
        {(mode === "trace" || mode === "write") && (
          <>
            {/* Row 1: Brush Color Picks & Thickness selectors */}
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-1.5">
                {INK_PALETTE.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    id={ink.id}
                    onClick={() => setBrushColor(ink.value)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition motion-reduce:transition-none ${
                      brushColor === ink.value
                        ? "border-natural-forest scale-115 shadow-sm"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: ink.value }}
                    title={ink.title}
                    aria-label={ink.title}
                  />
                ))}
              </div>

              {/* Thickness selectors */}
              <div className="flex items-center gap-1.5 bg-natural-bg px-2 py-1 rounded-xl border border-natural-border/60">
                <button
                  type="button"
                  id="brush-thin"
                  onClick={() => setBrushWidth(3)}
                  className={`p-1 rounded transition motion-reduce:transition-none ${
                    brushWidth === 3 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
                  }`}
                  title="Thin tip brush"
                  aria-label="Thin tip brush"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                </button>
                <button
                  type="button"
                  id="brush-medium"
                  onClick={() => setBrushWidth(6)}
                  className={`p-1 rounded transition motion-reduce:transition-none ${
                    brushWidth === 6 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
                  }`}
                  title="Medium tip brush"
                  aria-label="Medium tip brush"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  type="button"
                  id="brush-thick"
                  onClick={() => setBrushWidth(10)}
                  className={`p-1 rounded transition motion-reduce:transition-none ${
                    brushWidth === 10 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
                  }`}
                  title="Thick tip brush"
                  aria-label="Thick tip brush"
                >
                  <Square className="w-4.5 h-4.5 fill-current" />
                </button>
              </div>
            </div>

            {/* Row 2: Action Tools (Undo & Clear) — icon controls with tooltips, per A5 */}
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                id="action-undo"
                onClick={undoLast}
                title="Undo last stroke"
                aria-label="Undo last stroke"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-natural-border bg-natural-bg text-natural-forest-light transition motion-reduce:transition-none hover:border-natural-forest hover:text-natural-forest cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="action-clear"
                onClick={clearCanvas}
                title="Clear canvas"
                aria-label="Clear canvas"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-natural-terracotta/20 bg-natural-terracotta/10 text-natural-terracotta transition motion-reduce:transition-none hover:bg-natural-terracotta/20 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {mode === "review" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono font-extrabold uppercase tracking-widest text-natural-clay">
              <Sparkles className="h-3 w-3" />
              AI Accuracy Engine
            </div>

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
                className="w-full py-3 bg-natural-forest text-natural-bg hover:bg-natural-forest/90 border border-transparent rounded-2xl text-xs font-serif font-extrabold tracking-wider transition motion-reduce:transition-none hover:shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase motion-safe:animate-pulse"
              >
                ✨ Check Stroke Accuracy with Astra-chan
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
                <div className="mt-1 p-2.5 bg-natural-bg/70 rounded-xl border border-natural-border/50">
                  <p className="text-[10px] font-mono text-natural-forest-light font-semibold uppercase tracking-wider mb-1">✏️ Offline Self-Check Tips</p>
                  <ul className="text-[11px] text-natural-charcoal/80 leading-relaxed space-y-0.5 font-sans">
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
                    <span className="text-[9px] font-mono text-natural-clay uppercase tracking-wider font-extrabold">VERDICT ACCURACY</span>
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
