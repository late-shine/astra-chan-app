/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Trash2, RotateCcw, Paintbrush, Square } from "lucide-react";

interface DrawingCanvasProps {
  referenceChar?: string;
}

export default function DrawingCanvas({ referenceChar }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#2E3A2F"); // Emerald Forest Ink
  const [brushWidth, setBrushWidth] = useState(6);
  const [strokes, setStrokes] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset layout
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    clearCanvas();
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (e.nativeEvent instanceof TouchEvent) {
      if (e.nativeEvent.touches.length > 0) {
        clientX = e.nativeEvent.touches[0].clientX;
        clientY = e.nativeEvent.touches[0].clientY;
      }
    } else if (e.nativeEvent instanceof MouseEvent) {
      clientX = e.nativeEvent.clientX;
      clientY = e.nativeEvent.clientY;
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
    <div className="flex flex-col items-center bg-natural-card border border-natural-border/70 rounded-3xl p-4 w-full max-w-sm mx-auto shadow-sm">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-xs text-natural-forest-light font-mono font-semibold tracking-wider flex items-center gap-1.5">
          <Paintbrush className="w-3.5 h-3.5 text-natural-forest" />
          STROKE WORKSPACE
        </span>
        <span className="text-xs text-natural-clay font-serif italic text-right font-medium">
          Trace reference inside grids
        </span>
      </div>

      {/* Grid Backplane & Resizable Canvas */}
      <div className="relative w-[280px] h-[280px] bg-natural-bg border-2 border-natural-border rounded-2xl overflow-hidden shadow-inner">
        {/* Calligraphy Guideline Cross */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-natural-border/40"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-natural-border/40"></div>
        </div>

        {/* Floating backdrop ghost helper character */}
        {referenceChar && (
          <div className="absolute inset-0 flex items-center justify-center text-natural-forest/8 font-bold select-none text-[150px] font-serif pointer-events-none">
            {referenceChar}
          </div>
        )}

        {/* Realtime Canvas */}
        <canvas
          id="practice-drawing-canvas"
          ref={canvasRef}
          width={280}
          height={280}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair z-10 touch-none"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col items-center gap-3 w-full mt-4">
        {/* Row 1: Brush Color Picks & Thickness selectors */}
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-1.5">
            {/* Elegant Nature Inspired Presets */}
            <button
              type="button"
              id="color-charcoal"
              onClick={() => setBrushColor("#22C55E")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                brushColor === "#22C55E"
                  ? "border-natural-forest scale-115 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: "#22C55E" }}
              title="Green Grass brush"
            />
            <button
              type="button"
              id="color-forest"
              onClick={() => setBrushColor("#2E3A2F")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                brushColor === "#2E3A2F"
                  ? "border-natural-forest scale-115 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: "#2E3A2F" }}
              title="Forest Moss Ink"
            />
            <button
              type="button"
              id="color-clay"
              onClick={() => setBrushColor("#C27D56")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                brushColor === "#C27D56"
                  ? "border-natural-forest scale-115 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: "#C27D56" }}
              title="Earthy Clay brush"
            />
            <button
              type="button"
              id="color-terracotta"
              onClick={() => setBrushColor("#CA5E4B")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                brushColor === "#CA5E4B"
                  ? "border-natural-forest scale-115 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: "#CA5E4B" }}
              title="Sienna Clay brush"
            />
          </div>

          {/* Thickness selectors */}
          <div className="flex items-center gap-1.5 bg-natural-bg px-2 py-1 rounded-xl border border-natural-border/60">
            <button
              type="button"
              id="brush-thin"
              onClick={() => setBrushWidth(3)}
              className={`p-1 rounded transition ${
                brushWidth === 3 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
              }`}
              title="Thin tip brush"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
            </button>
            <button
              type="button"
              id="brush-medium"
              onClick={() => setBrushWidth(6)}
              className={`p-1 rounded transition ${
                brushWidth === 6 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
              }`}
              title="Medium tip brush"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              id="brush-thick"
              onClick={() => setBrushWidth(10)}
              className={`p-1 rounded transition ${
                brushWidth === 10 ? "text-natural-forest bg-natural-card/50 font-bold" : "text-natural-forest-light/50 hover:text-natural-forest"
              }`}
              title="Thick tip brush"
            >
              <Square className="w-4.5 h-4.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Row 2: Action Tools (Undo & Clear) */}
        <div className="flex items-center justify-end gap-2 w-full pt-1">
          <button
            type="button"
            id="action-undo"
            onClick={undoLast}
            className="p-1.5 py-1 px-3 bg-natural-bg hover:bg-natural-card hover:text-natural-forest text-natural-forest-light border border-natural-border rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Undo stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            type="button"
            id="action-clear"
            onClick={clearCanvas}
            className="p-1.5 py-1 px-3 bg-natural-terracotta/10 hover:bg-natural-terracotta/20 text-natural-terracotta border border-natural-terracotta/20 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Clear canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
