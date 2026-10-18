/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Floating Music + Atmosphere dock, available on every screen (Polish A1, refined in A2).
//
// Presentational only. `App.tsx` owns all state, the audio element and every
// storage write; this file renders controls and reports changes through props.
//
// Placement: App renders it inside the layout wrapper, right after <main>.
// That keeps it outside the screen-flip node (a `fixed` child of a transformed
// ancestor would be positioned against that ancestor) while leaving it in the
// same stacking context as the profile menu and the word-family modal, so those
// (z-50) cover it (z-30). The character picker (z-40), toast and duel invites
// (z-50) live at the root and cover it as well.
//
// Quiet mode (quiz-type screens): the Atmosphere launcher collapses away and the
// Music launcher shrinks and fades, but it is the same element and still opens the
// Music panel on a tap. The panel only appears when the learner opens it, and it
// closes on Escape, an outside press and every screen change (App closes it).

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Clock, Moon, Music, Palette, Sun, Volume2, VolumeX, X } from "lucide-react";

export type DockPanelId = "music" | "atmosphere";

export type MusicTrackId = "ten_no_yowai" | "one_voice" | "amakigoe" | "sparkle" | "columbinas_lullaby";

export interface MusicTrackInfo {
  id: MusicTrackId;
  label: string;
  title: string;
  /** Wording used in the "Now playing" toast. */
  toastName: string;
}

/** The five tracks, in display order. App also uses this list to validate the saved track. */
export const MUSIC_TRACKS: readonly MusicTrackInfo[] = [
  { id: "ten_no_yowai", label: "🌸 天ノ弱", title: "Akie - 天ノ弱 Piano Cover", toastName: "天ノ弱 Piano Cover" },
  { id: "one_voice", label: "🎤 One Voice", title: "Rokudenashi - One Voice", toastName: "One Voice" },
  { id: "amakigoe", label: "🌧️ 雨き声残響", title: "Akie - 雨き声残響 (Rain Voice Echo)", toastName: "雨き声残響 (Akie)" },
  { id: "sparkle", label: "✨ スパークル", title: "RADWIMPS - スパークル (Your Name)", toastName: "スパークル — Your Name" },
  { id: "columbinas_lullaby", label: "🎭 Columbina's Lullaby", title: "Columbina's Lullaby — Shania Yan Cover", toastName: "Columbina's Lullaby" },
];

const SCENES = [
  { idx: 0, label: "🌫️", title: "Misty Sakura Path" },
  { idx: 1, label: "🌸", title: "Sakura Train" },
  { idx: 2, label: "✨", title: "Night Sparkler" },
  { idx: 3, label: "🌧️", title: "Rainy Window Anime" },
] as const;

type BgAnimationType = "auto" | "snow" | "sakura" | "sparkles" | "rain" | "letters" | "both" | "none";
type BgIntensity = "low" | "medium" | "high";
type BgOpacity = "very-dim" | "low" | "medium" | "vivid";

export interface SoundAtmosphereDockProps {
  /** Which panel is open (never two at once). */
  openPanel: DockPanelId | null;
  onOpenPanelChange: (panel: DockPanelId | null) => void;
  /** Quiz-type screens: Atmosphere is hidden and the Music launcher is small and faded. */
  quiet: boolean;
  /** Reports the open panel's height in px (0 when closed) so the toast can sit above it. */
  onPanelHeightChange?: (height: number) => void;

  // Music
  isMusicPlaying: boolean;
  musicVolume: number;
  selectedMusicTrack: MusicTrackId;
  onSelectTrack: (track: MusicTrackId, label: string) => void;
  onTogglePlay: () => void;
  onVolumeChange: (value: number) => void;

  // Atmosphere
  activeBgScene: number;
  autoCycleBg: boolean;
  theme: string;
  fontStyle: "digital" | "written";
  bgAnimationType: BgAnimationType;
  bgIntensity: BgIntensity;
  bgBlur: number;
  bgOpacity: BgOpacity;
  onSelectScene: (index: number, title: string) => void;
  onToggleAutoCycle: () => void;
  onSetTheme: (theme: "light" | "dark-cosmic") => void;
  onSetFont: (font: "digital" | "written") => void;
  onSetAnimation: (value: BgAnimationType) => void;
  onSetIntensity: (value: BgIntensity) => void;
  onSetBlur: (value: number) => void;
  onSetOpacity: (value: BgOpacity) => void;

  showToast: (message: string) => void;
}

const PANEL_ID = "astra-dock-panel";
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-natural-forest";
const GROUP_LABEL = "text-[10px] font-mono text-natural-sage font-semibold uppercase tracking-widest";
const ROW_LABEL = "text-[10px] font-mono text-natural-sage font-semibold shrink-0";
const SEGMENT = "flex items-center bg-natural-card/85 p-1 rounded-xl border border-natural-border/75";
const SELECT = `min-h-11 flex-1 min-w-0 bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-3 rounded-xl cursor-pointer focus:border-natural-forest transition ${FOCUS_RING}`;
// A 44 px tall hit area with a 4 px visible track: the padding is transparent, the background is clipped to the content box.
const SLIDER = `flex-1 min-w-0 h-11 py-5 bg-clip-content bg-natural-border appearance-none cursor-pointer accent-natural-forest hover:accent-natural-clay transition ${FOCUS_RING}`;
const PILL_ON = "bg-natural-forest text-natural-bg shadow-sm";
const PILL_OFF = "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40";
const LAUNCHER_ON = "bg-natural-forest text-natural-bg border-natural-forest";
const LAUNCHER_OFF = "bg-natural-card/85 text-natural-forest border-natural-border/70";

export default function SoundAtmosphereDock(props: SoundAtmosphereDockProps) {
  const {
    openPanel,
    onOpenPanelChange,
    quiet,
    onPanelHeightChange,
    isMusicPlaying,
    musicVolume,
    selectedMusicTrack,
    onSelectTrack,
    onTogglePlay,
    onVolumeChange,
    activeBgScene,
    autoCycleBg,
    theme,
    fontStyle,
    bgAnimationType,
    bgIntensity,
    bgBlur,
    bgOpacity,
    onSelectScene,
    onToggleAutoCycle,
    onSetTheme,
    onSetFont,
    onSetAnimation,
    onSetIntensity,
    onSetBlur,
    onSetOpacity,
    showToast,
  } = props;

  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const musicButtonRef = useRef<HTMLButtonElement>(null);
  const atmosphereButtonRef = useRef<HTMLButtonElement>(null);
  // A state-backed ref: it follows the panel element as AnimatePresence swaps panels.
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);

  // Quiet mode can show the Music panel only; Atmosphere is never reachable there.
  const activePanel: DockPanelId | null = quiet && openPanel !== "music" ? null : openPanel;
  const musicOpen = activePanel === "music";
  const atmosphereOpen = activePanel === "atmosphere";
  const quietClosed = quiet && !musicOpen;

  // Non-modal panel: Escape closes it (and returns focus to its launcher);
  // a press anywhere outside the dock closes it without moving focus.
  useEffect(() => {
    if (!activePanel) return;
    const launcher = activePanel === "music" ? musicButtonRef : atmosphereButtonRef;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenPanelChange(null);
      launcher.current?.focus();
    };
    const handlePointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      onOpenPanelChange(null);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer, true);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer, true);
    };
  }, [activePanel, onOpenPanelChange]);

  // Tell App how tall the open panel is so the toast can sit just above it.
  useEffect(() => {
    if (!onPanelHeightChange) return;
    if (!panelEl) {
      onPanelHeightChange(0);
      return;
    }
    const report = () => onPanelHeightChange(Math.round(panelEl.getBoundingClientRect().height));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(panelEl);
    return () => {
      observer.disconnect();
      onPanelHeightChange(0);
    };
  }, [panelEl, onPanelHeightChange]);

  const toggle = (panel: DockPanelId) => onOpenPanelChange(activePanel === panel ? null : panel);
  const closePanel = () => {
    const launcher = activePanel === "atmosphere" ? atmosphereButtonRef : musicButtonRef;
    onOpenPanelChange(null);
    launcher.current?.focus();
  };

  const fade = reduceMotion ? "0.12s" : "0.2s";

  return (
    <div
      ref={rootRef}
      className="fixed z-30 flex flex-col items-end gap-2 pointer-events-none"
      style={{
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
        bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        {activePanel && (
          <motion.div
            key={activePanel}
            ref={setPanelEl}
            id={PANEL_ID}
            role="region"
            aria-label={activePanel === "music" ? "Music panel" : "Atmosphere panel"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: "easeOut" }}
            className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-80 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-2xl border border-natural-border/70 bg-natural-card/95 backdrop-blur-md shadow-xl p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {activePanel === "music" ? (
                  <Music className="w-4 h-4 text-natural-forest shrink-0" aria-hidden="true" />
                ) : (
                  <Palette className="w-4 h-4 text-natural-forest shrink-0" aria-hidden="true" />
                )}
                <p className="text-xs font-semibold text-natural-forest truncate">
                  {activePanel === "music" ? "Music" : "Atmosphere"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close panel"
                onClick={closePanel}
                className={`w-11 h-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40 transition cursor-pointer ${FOCUS_RING}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePanel === "music" && (
              <div id="zen-soundscape-station" className="flex flex-col gap-3">
                {/* Track selection */}
                <div className="flex flex-col gap-1.5">
                  <h3 className={GROUP_LABEL}>Track</h3>
                  <div role="group" aria-label="Music track" className={`${SEGMENT} flex-col items-stretch gap-1`}>
                    {MUSIC_TRACKS.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        title={track.title}
                        aria-pressed={selectedMusicTrack === track.id}
                        onClick={() => onSelectTrack(track.id, track.label)}
                        className={`min-h-11 w-full px-3 rounded-lg text-xs font-serif font-bold text-left flex items-center transition cursor-pointer ${FOCUS_RING} ${
                          selectedMusicTrack === track.id ? PILL_ON : `${PILL_OFF} font-semibold`
                        }`}
                      >
                        <span className="truncate min-w-0">{track.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Play / pause */}
                <button
                  type="button"
                  aria-pressed={isMusicPlaying}
                  onClick={onTogglePlay}
                  className={`min-h-11 px-3 rounded-xl text-xs font-serif font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 border shadow-sm ${FOCUS_RING} ${
                    isMusicPlaying
                      ? "bg-natural-clay text-natural-bg border-natural-clay"
                      : "bg-natural-card border-natural-border text-natural-forest hover:border-natural-forest"
                  }`}
                >
                  {isMusicPlaying ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Playing
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                      Paused
                    </>
                  )}
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <span className={ROW_LABEL}>Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    aria-label="Music volume"
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className={SLIDER}
                  />
                  <span className="text-[10px] font-mono text-natural-forest font-bold w-9 text-right shrink-0">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              </div>
            )}

            {activePanel === "atmosphere" && (
              <div id="witch-grimoire-controls" className="flex flex-col gap-4">
                {/* Scene: backdrop + auto-cycle */}
                <div className="flex flex-col gap-1.5">
                  <h3 className={GROUP_LABEL}>Scene</h3>
                  <div className="flex items-center gap-1.5">
                    <div role="group" aria-label="Background scene" className={`${SEGMENT} gap-0.5`}>
                      {SCENES.map((scene) => (
                        <button
                          key={scene.idx}
                          type="button"
                          title={scene.title}
                          aria-label={scene.title}
                          aria-pressed={activeBgScene === scene.idx}
                          onClick={() => onSelectScene(scene.idx, scene.title)}
                          className={`min-w-11 min-h-11 px-2 rounded-lg text-sm font-bold flex items-center justify-center transition cursor-pointer ${FOCUS_RING} ${
                            activeBgScene === scene.idx ? PILL_ON : PILL_OFF
                          }`}
                        >
                          {scene.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      aria-pressed={autoCycleBg}
                      aria-label="Auto-cycle scenes"
                      onClick={onToggleAutoCycle}
                      className={`w-11 h-11 shrink-0 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${FOCUS_RING} ${
                        autoCycleBg
                          ? "bg-natural-forest/15 border-natural-forest/35 text-natural-forest shadow-xs"
                          : "bg-natural-card/85 border-natural-border/75 text-natural-forest-light hover:text-natural-forest"
                      }`}
                      title={autoCycleBg ? "Auto-Cycle Scenes: Active (Changes every 1m)" : "Auto-Cycle Scenes: Paused"}
                    >
                      <Clock className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Look: theme + font */}
                <div className="flex flex-col gap-1.5">
                  <h3 className={GROUP_LABEL}>Look</h3>
                  <div role="group" aria-label="Theme" className={SEGMENT}>
                    <button
                      type="button"
                      id="toggle-theme-light"
                      aria-pressed={theme === "light"}
                      onClick={() => onSetTheme("light")}
                      className={`flex-1 min-h-11 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                        theme === "light" ? PILL_ON : PILL_OFF
                      }`}
                      title="Washi Light Mode"
                    >
                      <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                      Light
                    </button>
                    <button
                      type="button"
                      id="toggle-theme-dark"
                      aria-pressed={theme === "dark" || theme === "dark-cosmic"}
                      onClick={() => onSetTheme("dark-cosmic")}
                      className={`flex-1 min-h-11 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                        theme === "dark" || theme === "dark-cosmic" ? PILL_ON : PILL_OFF
                      }`}
                      title="Witchy Dark Mode"
                    >
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                      Dark
                    </button>
                  </div>
                  <div role="group" aria-label="Font" className={SEGMENT}>
                    <button
                      type="button"
                      id="toggle-font-digital"
                      aria-pressed={fontStyle === "digital"}
                      onClick={() => onSetFont("digital")}
                      className={`flex-1 min-h-11 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                        fontStyle === "digital" ? PILL_ON : PILL_OFF
                      }`}
                      title="Noto Sans JP — Clean & Digital"
                    >
                      <span className="font-mono text-[10px]">Aa</span>
                      Digital
                    </button>
                    <button
                      type="button"
                      id="toggle-font-written"
                      aria-pressed={fontStyle === "written"}
                      onClick={() => onSetFont("written")}
                      className={`flex-1 min-h-11 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                        fontStyle === "written" ? PILL_ON : PILL_OFF
                      }`}
                      title="Klee One — Handwritten & Warm"
                    >
                      <span className="text-[11px]">書</span>
                      Written
                    </button>
                  </div>
                </div>

                {/* Particles: effect type + intensity */}
                <div className="flex flex-col gap-1.5">
                  <h3 className={GROUP_LABEL}>Particles</h3>
                  <div className="flex items-center gap-2">
                    <span className={`${ROW_LABEL} w-14`}>Effect</span>
                    <select
                      id="effect-type-selector"
                      aria-label="Particle effect"
                      value={bgAnimationType}
                      onChange={(e) => {
                        const val = e.target.value as BgAnimationType;
                        onSetAnimation(val);
                        showToast(`Effect: ${val === "auto" ? "Theme-Based" : val}`);
                      }}
                      className={SELECT}
                    >
                      <option value="auto">🌟 Theme Particles (Auto)</option>
                      <option value="snow">❄️ Cozy Snow</option>
                      <option value="sakura">🌸 Cherry Blossoms</option>
                      <option value="sparkles">✨ Magic Sparkles</option>
                      <option value="rain">🌧️ Gentle Rain</option>
                      <option value="letters">🔮 Magic Runes</option>
                      <option value="both">💫 Runes &amp; Theme-FX</option>
                      <option value="none">❌ None</option>
                    </select>
                  </div>
                  {bgAnimationType !== "none" && (
                    <div className="flex items-center gap-2">
                      <span className={`${ROW_LABEL} w-14`}>Intensity</span>
                      <select
                        id="intensity-selector"
                        aria-label="Particle intensity"
                        value={bgIntensity}
                        onChange={(e) => {
                          const val = e.target.value as BgIntensity;
                          onSetIntensity(val);
                          showToast(`Intensity: ${val}`);
                        }}
                        className={SELECT}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Background: blur + opacity */}
                <div className="flex flex-col gap-1.5">
                  <h3 className={GROUP_LABEL}>Background</h3>
                  <div className="flex items-center gap-2">
                    <span className={`${ROW_LABEL} w-14`}>Blur</span>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={bgBlur}
                      aria-label="Background blur"
                      onChange={(e) => onSetBlur(parseFloat(e.target.value))}
                      className={SLIDER}
                      title={`Background blur: ${bgBlur === 0 ? "None" : bgBlur.toFixed(1) + "px"}`}
                    />
                    <span className="text-[10px] font-mono text-natural-forest font-bold w-9 text-right shrink-0">
                      {bgBlur === 0 ? "Off" : `${bgBlur.toFixed(0)}px`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${ROW_LABEL} w-14`}>Opacity</span>
                    <select
                      id="bg-opacity-selector"
                      aria-label="Background opacity"
                      value={bgOpacity}
                      onChange={(e) => {
                        const val = e.target.value as BgOpacity;
                        onSetOpacity(val);
                        showToast(`Opacity: ${val}`);
                      }}
                      className={SELECT}
                    >
                      <option value="very-dim">Dim (10%)</option>
                      <option value="low">Soft (25%)</option>
                      <option value="medium">Balanced (45%)</option>
                      <option value="vivid">Vivid (70%)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launchers. The Music launcher is one element in every mode, so a screen change never remounts it. */}
      <div data-guide="dock" className="pointer-events-auto flex items-center">
        <button
          ref={musicButtonRef}
          type="button"
          aria-label="Music controls"
          aria-expanded={musicOpen}
          aria-controls={musicOpen ? PANEL_ID : undefined}
          onClick={() => toggle("music")}
          className={`group relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer ${FOCUS_RING}`}
        >
          <span
            className={`relative w-11 h-11 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition-[opacity,transform,background-color,border-color,color] duration-200 motion-reduce:transition-[opacity] ${
              quietClosed
                ? "scale-[0.82] opacity-60 group-hover:opacity-100 group-focus-visible:opacity-100"
                : "scale-100 opacity-100"
            } ${musicOpen ? LAUNCHER_ON : `${LAUNCHER_OFF} group-hover:border-natural-forest`}`}
          >
            <Music className="w-5 h-5" aria-hidden="true" />
            {isMusicPlaying && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-natural-clay border border-natural-card"
              />
            )}
          </span>
        </button>
        <div
          aria-hidden={quiet ? true : undefined}
          inert={quiet ? true : undefined}
          style={{
            maxWidth: quiet ? 0 : 44,
            marginLeft: quiet ? 0 : 8,
            opacity: quiet ? 0 : 1,
            visibility: quiet ? "hidden" : "visible",
            overflow: quiet ? "hidden" : "visible",
            transition: reduceMotion
              ? `opacity ${fade} linear, visibility 0s linear ${quiet ? fade : "0s"}`
              : `max-width ${fade} ease, margin-left ${fade} ease, opacity ${fade} ease, visibility 0s linear ${quiet ? fade : "0s"}`,
          }}
        >
          <button
            ref={atmosphereButtonRef}
            type="button"
            aria-label="Atmosphere controls"
            aria-expanded={atmosphereOpen}
            aria-controls={atmosphereOpen ? PANEL_ID : undefined}
            tabIndex={quiet ? -1 : undefined}
            onClick={() => toggle("atmosphere")}
            className={`w-11 h-11 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition cursor-pointer ${FOCUS_RING} ${
              atmosphereOpen ? LAUNCHER_ON : `${LAUNCHER_OFF} hover:border-natural-forest`
            }`}
          >
            <Palette className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
