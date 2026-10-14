/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Polish A1: floating Music + Atmosphere dock, available on every screen.
//
// Presentational only. `App.tsx` owns all state, the audio element and every
// storage write; this file renders controls and reports changes through props.
//
// Placement: App renders it inside the layout wrapper, right after <main>.
// That keeps it outside the screen-flip node (a `fixed` child of a transformed
// ancestor would be positioned against that ancestor) while leaving it in the
// same stacking context as the Charts drawer, the word-family modal and the
// profile menu, so those (z-50) cover it (z-30). The character picker (z-40),
// toast and duel invites (z-50) live at the root and cover it as well.

import { useEffect, useRef } from "react";
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
  /** Quiz-type screens: only a small faded music button, no panel. */
  quiet: boolean;

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
const LABEL = "text-[10px] font-mono text-natural-sage font-semibold";
const GROUP = "flex items-center bg-natural-card/85 p-1 rounded-xl border border-natural-border/75";
const SELECT =
  "bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-natural-forest transition";
const PILL_ON = "bg-natural-forest text-natural-bg shadow-sm";
const PILL_OFF = "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40";

export default function SoundAtmosphereDock(props: SoundAtmosphereDockProps) {
  const {
    openPanel,
    onOpenPanelChange,
    quiet,
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

  // Quiet mode never shows a panel, whatever the open state says.
  const activePanel: DockPanelId | null = quiet ? null : openPanel;

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

  const toggle = (panel: DockPanelId) => onOpenPanelChange(activePanel === panel ? null : panel);

  const playingDot = isMusicPlaying ? (
    <span
      aria-hidden="true"
      className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-natural-clay border border-natural-card"
    />
  ) : null;

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
            id={PANEL_ID}
            role="region"
            aria-label={activePanel === "music" ? "Music controls" : "Atmosphere controls"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: "easeOut" }}
            className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-80 max-h-[70dvh] overflow-y-auto overscroll-contain rounded-2xl border border-natural-border/70 bg-natural-card/95 backdrop-blur-md shadow-xl p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {activePanel === "music" ? (
                  <Music className="w-4 h-4 text-natural-forest" aria-hidden="true" />
                ) : (
                  <Palette className="w-4 h-4 text-natural-forest" aria-hidden="true" />
                )}
                <p className="text-xs font-semibold text-natural-forest">
                  {activePanel === "music" ? "Music" : "Atmosphere"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => {
                  onOpenPanelChange(null);
                  (activePanel === "music" ? musicButtonRef : atmosphereButtonRef).current?.focus();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40 transition cursor-pointer ${FOCUS_RING}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePanel === "music" && (
              <div id="zen-soundscape-station" className="flex flex-col gap-3">
                {/* Track selection */}
                <div className="flex flex-col gap-1.5">
                  <span className={LABEL}>Track</span>
                  <div className={`${GROUP} flex-col items-stretch gap-1`}>
                    {MUSIC_TRACKS.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        title={track.title}
                        aria-pressed={selectedMusicTrack === track.id}
                        onClick={() => onSelectTrack(track.id, track.label)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-serif font-bold text-left transition cursor-pointer ${FOCUS_RING} ${
                          selectedMusicTrack === track.id ? PILL_ON : `${PILL_OFF} font-semibold`
                        }`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Play / pause */}
                <button
                  type="button"
                  aria-pressed={isMusicPlaying}
                  onClick={onTogglePlay}
                  className={`px-3 py-2 rounded-xl text-xs font-serif font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 border shadow-sm ${FOCUS_RING} ${
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
                  <span className={LABEL}>Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    aria-label="Music volume"
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-natural-border rounded-lg appearance-none cursor-pointer accent-natural-forest hover:accent-natural-clay transition"
                  />
                  <span className="text-[10px] font-mono text-natural-forest font-bold min-w-8 text-right">
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              </div>
            )}

            {activePanel === "atmosphere" && (
              <div id="witch-grimoire-controls" className="flex flex-col gap-3">
                {/* Background scene + auto-cycle */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className={LABEL}>Scene</span>
                  <div className={`${GROUP} gap-0.5`}>
                    {SCENES.map((scene) => (
                      <button
                        key={scene.idx}
                        type="button"
                        title={scene.title}
                        aria-label={scene.title}
                        aria-pressed={activeBgScene === scene.idx}
                        onClick={() => onSelectScene(scene.idx, scene.title)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
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
                    className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${FOCUS_RING} ${
                      autoCycleBg
                        ? "bg-natural-forest/15 border-natural-forest/35 text-natural-forest shadow-xs"
                        : "bg-natural-card/85 border-natural-border/75 text-natural-forest-light hover:text-natural-forest"
                    }`}
                    title={autoCycleBg ? "Auto-Cycle Scenes: Active (Changes every 1m)" : "Auto-Cycle Scenes: Paused"}
                  >
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Theme: Light / Dark */}
                <div className={`${GROUP} self-start`}>
                  <button
                    type="button"
                    id="toggle-theme-light"
                    onClick={() => onSetTheme("light")}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
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
                    onClick={() => onSetTheme("dark-cosmic")}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                      theme === "dark" || theme === "dark-cosmic" ? PILL_ON : PILL_OFF
                    }`}
                    title="Witchy Dark Mode"
                  >
                    <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    Dark
                  </button>
                </div>

                {/* Font: Digital / Written */}
                <div className={`${GROUP} self-start`}>
                  <button
                    type="button"
                    id="toggle-font-digital"
                    onClick={() => onSetFont("digital")}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
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
                    onClick={() => onSetFont("written")}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition cursor-pointer ${FOCUS_RING} ${
                      fontStyle === "written" ? PILL_ON : PILL_OFF
                    }`}
                    title="Klee One — Handwritten & Warm"
                  >
                    <span className="text-[11px]">書</span>
                    Written
                  </button>
                </div>

                {/* Particle type */}
                <div className="flex items-center justify-between gap-2">
                  <span className={LABEL}>FX</span>
                  <select
                    id="effect-type-selector"
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

                {/* Intensity */}
                {bgAnimationType !== "none" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className={LABEL}>Intensity</span>
                    <select
                      id="intensity-selector"
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

                {/* Backdrop blur */}
                <div className="flex items-center gap-2">
                  <span className={LABEL}>Blur</span>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={bgBlur}
                    aria-label="Background blur"
                    onChange={(e) => onSetBlur(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-natural-border rounded-lg appearance-none cursor-pointer accent-natural-forest hover:accent-natural-clay transition"
                    title={`Background blur: ${bgBlur === 0 ? "None" : bgBlur.toFixed(1) + "px"}`}
                  />
                  <span className="text-[10px] font-mono text-natural-forest font-bold min-w-8 text-right">
                    {bgBlur === 0 ? "Off" : `${bgBlur.toFixed(0)}px`}
                  </span>
                </div>

                {/* Backdrop opacity */}
                <div className="flex items-center justify-between gap-2">
                  <span className={LABEL}>Opacity</span>
                  <select
                    id="bg-opacity-selector"
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {quiet ? (
        // Quiet mode (quiz-type screens): one small faded button that plays or pauses.
        // It opens nothing, so it can never cover an answer. Phase A2 refines this.
        <button
          type="button"
          aria-label={isMusicPlaying ? "Pause music" : "Play music"}
          aria-pressed={isMusicPlaying}
          onClick={onTogglePlay}
          className={`pointer-events-auto relative w-9 h-9 rounded-full flex items-center justify-center border border-natural-border/60 bg-natural-card/70 backdrop-blur-md text-natural-forest-light shadow-md opacity-60 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer ${FOCUS_RING}`}
        >
          <Music className="w-4 h-4" aria-hidden="true" />
          {playingDot}
        </button>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            ref={musicButtonRef}
            type="button"
            aria-label="Music controls"
            aria-expanded={activePanel === "music"}
            aria-controls={PANEL_ID}
            onClick={() => toggle("music")}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition cursor-pointer ${FOCUS_RING} ${
              activePanel === "music"
                ? "bg-natural-forest text-natural-bg border-natural-forest"
                : "bg-natural-card/85 text-natural-forest border-natural-border/70 hover:border-natural-forest"
            }`}
          >
            <Music className="w-5 h-5" aria-hidden="true" />
            {playingDot}
          </button>
          <button
            ref={atmosphereButtonRef}
            type="button"
            aria-label="Atmosphere controls"
            aria-expanded={activePanel === "atmosphere"}
            aria-controls={PANEL_ID}
            onClick={() => toggle("atmosphere")}
            className={`w-11 h-11 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md transition cursor-pointer ${FOCUS_RING} ${
              activePanel === "atmosphere"
                ? "bg-natural-forest text-natural-bg border-natural-forest"
                : "bg-natural-card/85 text-natural-forest border-natural-border/70 hover:border-natural-forest"
            }`}
          >
            <Palette className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
