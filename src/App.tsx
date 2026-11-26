import { AppearanceProvider } from './components/Appearance';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { isSoloCustomId, mergeSoloCustomDraft, soloSubjectLabel } from "./quiz/soloSetup";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { motion, AnimatePresence, useTransform, useReducedMotion } from "motion/react";
import {
  Flame,
  BookOpen,
  Award,
  Sparkles,
  ChevronRight,
  ArrowBigRight,
  BookMarked,
  Info,
  Calendar,
  PenTool,
  MapPin,
  Play,
  Search,
  CheckCircle2,
  HelpCircle,
  Activity,
  BookOpenCheck,
  Trophy,
  Globe,
  Copy,
  Loader2,
  Wifi,
  LogOut,
  UserPlus,
  UserMinus,
  Mail,
  X,
  User,
  Bell,
  Download,
  Upload,
  Table2,
  GraduationCap,
  Cloud,
  LogIn,
} from "lucide-react";

import { HIRAGANA_DATA, KATAKANA_DATA, KANJI_DATA, VOCABULARY_DATA } from "./data";
import { KANJI_READING_RECORDS_V2, KANJI_WORD_FAMILIES_V2 } from "./kanjiWordFamiliesV2";
import {
  duelNetwork,
  addFriend,
  removeFriend,
  listenToFriends,
  listenToFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  sendRoomInvite,
  listenToInvites,
  clearInvite,
  respondToRoomInvite,
  listenToInviteResponses,
  clearInviteResponse,
  listenToMatchHistory,
  saveUserProfile,
  getUserProfile,
  markProfileOnline,
  searchUserProfiles,
  type FriendRecord,
  type FriendRequest,
  type FriendSearchResult,
  type InviteResponse,
  type RoomInvite,
  type MatchHistoryRecord,
} from "./multiplayerOnline";
import {
  auth,
  createOrLinkEmailAccount,
  createOrLinkGoogleAccount,
  currentUid,
  ensureSignedIn,
  isAnonymousUser,
  loadCloudStats,
  saveCloudStats,
  sendPasswordReset,
  signInEmailAccount,
  signOutAccount,
} from "./firebase";
import { HiraganaItem, KatakanaItem, KanjiItem, StudentStats, SRSCard, SrsSettings, TipsState } from "./types";
import type { ReadingToken } from "./reading/readingData";
import MascotCompanion from "./components/MascotCompanion";
import AtmosphereCanvas from "./components/AtmosphereCanvas";
import SoundAtmosphereDock, { MUSIC_TRACKS, type DockPanelId, type MusicTrackId } from "./components/SoundAtmosphereDock";
import GuideTour from "./components/GuideTour";
import { useMouseParallax } from "./hooks/useMouseParallax";
import ReferenceCharts, { type ChartsTabId } from "./components/ReferenceCharts";
import InteractiveWorkbench, { type SandboxMode } from "./components/InteractiveWorkbench";
import GrammarDojo from "./components/GrammarDojo";
import ReadingRoomScreen from "./components/ReadingRoomScreen";
import { ReadingWindow } from "./components/ReadingWindow";
import type { ReadingAppearance } from "./reading/appearancePreferences";
import { DEFAULT_CLOUD_JAPANESE_VOICE, getCloudJapaneseVoice } from "./voiceCatalog";
import {
  PREFERENCE_CHANGED_EVENT,
  completePreferences,
  readComponentPreferences,
  readLocalPreferences,
  readPreferencesEnvelope,
  resolvePreferences,
  sanitizeEnvelope,
  serializePreferences,
  writeLocalPreferences,
  writePreferencesEnvelope,
  type ThemeId,
  type ComponentPreferences,
  type SyncedPreferences,
  type UserPreferences,
} from "./preferences";
import { pickQuizPreferences, type QuizPreferences } from "./quiz/preferences";
import { createCloudSaveQueue, quizBrowserStorage, readHydrationJournal, type StatsBinding } from "./quiz/browserStorage";
import { canUseDeviceStats, hydrateQuizProgress, quizHistoryFromStats, readQuizProgress, sanitizeQuizProgress, withQuizMaps } from "./quiz/progress";
import { useQuizProgressBridge, type QuizProgressBridge } from "./quiz/useQuizProgressBridge";
import { quizClock, quizDeviceId, useQuizSession } from "./quiz/useQuizSession";
import {
  AVATAR_RECOMPRESS_ABOVE_CHARS,
  DEFAULT_PROFILE_NAME,
  clearProfilePending,
  compressAvatarDataUrl,
  compressAvatarFile,
  markProfilePending,
  readLocalProfile,
  reconcileProfile,
  shouldStampProfile,
  writeLocalProfile,
} from "./profileSync";
import MenuScreen from "./components/MenuScreen";
import { RoomEntrance } from "./entrance/RoomEntrance";
import { useDuelSession } from "./quiz/useDuelSession";
import {useDuelLearning} from "./quiz/useDuelLearning";
import {duelLearningId,duelMisses,mappedDuelMisses} from "./quiz/duelProgress";
import { QuizFlow,startQuizRepair, type KanaLaunch } from "./components/quiz/QuizFlow";
import type { Catalogs } from "./quiz/types";
import KanjiScrollScreen from "./components/KanjiScrollScreen";
import ProfileScreen from "./components/ProfileScreen";
import ReviewDeckScreen from "./components/ReviewDeckScreen";
import OnlineMultiplayerScreen from "./components/OnlineMultiplayerScreen";
import { useSRS } from "./hooks/useSRS";
import { formatSessionLine, formatWaitingLine, mergeSrsCards, mergeSrsSettings, normalizeSrsCards, normalizeSrsSettings } from "./srsScheduler";
import { hasProgress, mergeTips, sanitizeTips, TIP_IDS, type TipId } from "./tips";
import { SCREEN_SETTLE_MS, SCREEN_VARIANTS, SCREEN_VARIANTS_REDUCED } from "./screenMotion";
import wonderingImg from "./assets/images/astra-wondering.jpeg";
import deepAfkImg from "./assets/images/astra-deep-afk.png";
import excitedImg from "./assets/images/astra-excited.png.jpeg";
import bgMistySakura from "./assets/images/bg_misty_sakura.jpg";
import bgSakuraTrain from "./assets/images/bg_sakura_train.jpg";
import bgNightSparkler from "./assets/images/bg_night_sparkler.jpg";
import bgRainyWindowAnime from "./assets/images/bg_rainy_window_anime.jpg";
import astraReadingImg from "./assets/images/Astra-reading.png";

// Native Audio Synthesizer for UI/UX feedback
function playChime(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (success) {
      // Gentle, faint satisfying digital tick (like a soft organic water bubble or mechanical keyboard stroke)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.03); // Extremely fast organic pitch slide

      // Micro envelope to prevent popping while remaining a faint, rapid tactile tick
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.012, now + 0.003); // Super faint peak (reduced from 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035); // Rapid 35ms decay to absolute silence

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } else {
      // Gentle soft warm low mechanical 'tuck'
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.015, now + 0.004); // Faint feedback
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (err) {
    console.warn("Audio Context block or unsupported browser", err);
  }
}

// Gentle soft organic mechanical keyboard tick for interactions
function playClickTick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.01);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.008, now + 0.002); // Absolute whisper-quiet faint tick
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.012); // Fades completely over 12 milliseconds

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.015);
  } catch (err) { }
}

function accountErrorMessage(error: any, fallback: string): string {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Use Sign in, or choose Continue with Google to enter the existing account.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email or password is not correct.";
    case "auth/weak-password":
      return "Choose a stronger password with at least six characters.";
    case "auth/popup-closed-by-user":
      return "The Google sign-in window was closed before it finished.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups and try again.";
    case "auth/account-exists-with-different-credential":
      return "An Astra account already exists with another sign-in method. Use that method first.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a little and try again.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    default:
      return error?.message || fallback;
  }
}

// Phase S1: mergeSrsCards (lastReviewed-based cloud merge) now lives in src/srsScheduler.ts.

/* ===== POLISH C3 / C3b: CALM SCREEN TRANSITIONS ===== */
// The App router below is the ONLY owner of page motion: screens do not animate their own outer
// root. The motion itself (variants, timings, rise) lives in ./screenMotion so the menu's
// Study Room swap uses exactly the same one.
// Short screen names: the accessible name of the router wrapper that receives focus after a
// navigation (see handleScreenSettled).
const SCREEN_TITLES: Record<string, string> = {
  "menu": "Main menu",
  "quiz": "Quiz",
  "kanji-scroll": "Kanji study",
  "profile": "Profile",
  "results": "Quiz results",
  "online-multiplayer": "Online speed duel",
  "review-deck": "Review Deck",
  "vocab-quiz": "Vocabulary quiz",
  "kanji-quiz": "Kanji quiz",
  "charts": "Reference charts",
  "sandbox": "Mastery Sandbox",
  "grammar-dojo": "Grammar Dojo",
  "reading-room": "Reading Room",
};

// Polish A1: the music track, volume and a hand-picked background scene are remembered on
// this device only (never synced, never auto-playing). Every read is validated and falls
// back to the old default.
function readSavedMusicTrack(): MusicTrackId {
  try {
    const stored = localStorage.getItem("astra_music_track");
    const match = MUSIC_TRACKS.find((track) => track.id === stored);
    if (match) return match.id;
  } catch (e) { }
  return "ten_no_yowai";
}

function readSavedMusicVolume(): number {
  try {
    const stored = localStorage.getItem("astra_music_volume");
    if (stored !== null && stored.trim() !== "") {
      const value = Number(stored);
      if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
    }
  } catch (e) { }
  return 0.35;
}

// The saved scene applies only while auto-cycle is off: with it on (the default) the cycle
// owns the scene, and an auto-picked scene is never saved.
function readSavedBgScene(): number {
  try {
    if (localStorage.getItem("astra_auto_cycle_bg") !== "false") return 0;
    const stored = localStorage.getItem("astra_bg_scene");
    if (stored !== null && /^[0-3]$/.test(stored)) return Number(stored);
  } catch (e) { }
  return 0;
}

const SOLO_CATALOGS: Catalogs = { hiragana: HIRAGANA_DATA, katakana: KATAKANA_DATA, vocabulary: VOCABULARY_DATA, kanji: KANJI_DATA, readingRecords: KANJI_READING_RECORDS_V2, wordFamilies: KANJI_WORD_FAMILIES_V2 };

export default function App() {
  const { x: parallaxX, y: parallaxY } = useMouseParallax();
  const bgParallaxX = useTransform(parallaxX, (v) => v * -16);
  const bgParallaxY = useTransform(parallaxY, (v) => v * -10);
  // Screens navigation state
  const [currentScreen, setCurrentScreen] = useState<"menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "sandbox" | "grammar-dojo" | "reading-room">(() =>
    window.history.state?.astraReadingOpen === true ? "reading-room" : "menu"
  );
  useEffect(() => {
    const open = currentScreen === "reading-room";
    if (open === (window.history.state?.astraReadingOpen === true)) return;
    try {
      window.history.replaceState({ ...window.history.state, astraReadingOpen: open }, "");
    } catch { /* The local bookmark also works when returning through the Study Room. */ }
  }, [currentScreen]);
  const [quizCompanionSpeech, setQuizCompanionSpeech] = useState(true);
  const [kanaLaunch, setKanaLaunch] = useState<KanaLaunch>("practice");
  const readingRoomOpen = currentScreen === "reading-room";
  const studioQuiz = currentScreen === "quiz" || currentScreen === "results" || currentScreen === "vocab-quiz" || currentScreen === "kanji-quiz";

  /* ===== POLISH C4: REFERENCE CHARTS TOPIC AND SANDBOX ENTRY MODE (memory only) ===== */
  // The Charts topic lives here so Back from the Sandbox page returns to the SAME topic. It resets to
  // Counters whenever the learner is on neither Charts nor the Sandbox (any exit, not only Back to the
  // menu), so opening Reference Charts from the Study Room behaves as it always did. The exiting screen
  // keeps its frozen props, so the reset never repaints Charts while it fades out.
  const [chartsTab, setChartsTab] = useState<ChartsTabId>("counters");
  // The Sandbox workspace the entry button asked for (read once, when the Sandbox page mounts).
  const [sandboxEntryMode, setSandboxEntryMode] = useState<SandboxMode>("counters");
  useEffect(() => {
    if (currentScreen !== "charts" && currentScreen !== "sandbox") setChartsTab("counters");
  }, [currentScreen]);

  /* ===== POLISH C3: SCREEN TRANSITION STATE ===== */
  const prefersReducedMotion = useReducedMotion();
  // isTransitioning is true from a screen change until the new screen has finished entering.
  // The guided tour reads it: it hides its ring and does not measure while this is true.
  const [isTransitioning, setIsTransitioning] = useState(false);
  const screenMountedRef = useRef(false);
  // The newest screen, assigned during render (like statsRef). Handlers that belong to an
  // OUTGOING screen are frozen with their old closure, so they compare against this at event time.
  const latestScreenRef = useRef(currentScreen);
  latestScreenRef.current = currentScreen;
  // True from a real navigation until focus has been considered once for the new screen.
  const screenFocusPendingRef = useRef(false);
  const routerNodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Skip the very first mount: AnimatePresence has initial={false}, so nothing
    // animates in and onAnimationComplete would never arrive to clear the flag.
    if (!screenMountedRef.current) {
      screenMountedRef.current = true;
      return;
    }
    setIsTransitioning(true);
    screenFocusPendingRef.current = true;
    // Failsafe so the flag can never stay on if a completion callback is missed
    // (a full swap is about 0.8 s; the value lives in ./screenMotion).
    const failsafe = window.setTimeout(() => setIsTransitioning(false), SCREEN_SETTLE_MS);
    return () => window.clearTimeout(failsafe);
  }, [currentScreen]);

  // Called when a screen's enter animation completes. Only the NEWEST screen may clear the flag
  // or take focus: with rapid taps an older screen can finish late and must stay silent.
  // Focus moves to the screen wrapper only when it has nowhere better to be (body, or the element
  // that was just removed). A focused field (the Quiz romaji input), the dock, the guided tour or
  // an open modal keeps focus.
  const handleScreenSettled = (settledScreen: string) => {
    if (settledScreen !== latestScreenRef.current) return;
    setIsTransitioning(false);
    if (!screenFocusPendingRef.current) return;
    screenFocusPendingRef.current = false;
    const node = routerNodeRef.current;
    if (!node) return;
    const active = document.activeElement;
    const focusIsLost = !active || active === document.body || active === document.documentElement || !document.body.contains(active);
    if (!focusIsLost) return;
    if (document.querySelector('[aria-modal="true"]')) return;
    node.focus({ preventScroll: true });
  };

  // Student Statistics State (with Local Storage Persistence)
  const defaultStats: StudentStats = {
    xp: 0,
    streakCount: 0,
    lastActiveDate: null,
    correctCount: 0,
    totalAttempts: 0,
    masteredChars: [],
    characterProgress: {},
    vocabularyProgress: {},
    favoriteCategory: "basic",
    srsCards: {},
    studyDates: [],
    survivalBestScore: 0,
    srsReviewedTotal: 0,
    readingMisses: [],
  };
  const [stats, setStats] = useState<StudentStats>(defaultStats);

  // B2: the latest stats, for a writer that must start from a whole blob when none is stored yet (patchTips).
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // ── SRS Review Deck (hook + session state) ─────────────────────────────────
  const handleSrsCardsChanged = useCallback((cards: Record<string, SRSCard>) => {
    setStats((previous) => ({ ...previous, srsCards: cards }));
  }, []);
  const {
    addCard,
    hasCard,
    getSessionQueue,
    sessionSummary,
    forecast,
    gradeCard,
    gradeRelearnCard,
    removeCard,
    putBackCard,
    rescheduleOverdueCards,
    trickyCards,
    replaceCards,
    totalCount,
  } = useSRS(handleSrsCardsChanged, stats.srsSettings);
  const [srsQueue, setSrsQueue]       = useState<SRSCard[]>([]);
  const [srsQueueIndex, setSrsQueueIndex] = useState(0);
  const [srsRevealed, setSrsRevealed]   = useState(false);

  // S2: the shared post-render writer persists daily limits with the latest stats.
  const updateSrsSettings = useCallback((next: { dailyReviewCap: number; dailyNewCap: number }) => {
    const settings: SrsSettings = { ...normalizeSrsSettings(next), updatedAt: Date.now() };
    setStats((previous) => ({ ...previous, srsSettings: settings }));
  }, []);

  /** Awards XP for an SRS review while preserving the synchronized card map. */
  const awardSRSXP = useCallback((xp: number) => {
    const today = quizClock().localDate;
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + xp,
      srsReviewedTotal: (prev.srsReviewedTotal || 0) + 1,
      studyDates: prev.studyDates?.includes(today) ? prev.studyDates : [...(prev.studyDates || []), today],
    }));
  }, []);

  // Tab & Learning Desk Navigation states
  const [activeHubTab, setActiveHubTab] = useState<"learn" | "practice">("learn");
  const [showStudyRoom, setShowStudyRoom] = useState(true);
  const [entrancePhase, setEntrancePhase] = useState<"idle" | "loading" | "leaving" | "connected">("idle");
  const roomCoversViewportRef = useRef(false);
  const handleRoomCoverChange = useCallback((covered: boolean) => {
    if (roomCoversViewportRef.current === covered) return;
    roomCoversViewportRef.current = covered;
    window.dispatchEvent(new CustomEvent("astra:atmosphere-visibility"));
  }, []);
  const preloadedPosterRef = useRef<{ src: string; ready: Promise<void> } | null>(null);
  const warmupEntrancePoster = useCallback((src: string) => {
    if (preloadedPosterRef.current?.src === src) return preloadedPosterRef.current.ready;
    const pic = new Image();
    pic.src = src;
    const ready = pic.decode().catch(() => {});
    preloadedPosterRef.current = { src, ready };
    return ready;
  }, []);
  useEffect(() => {
    if (currentScreen !== "menu" || activeHubTab === "practice") return;
    const posterSrc = `/assets/entrance/room-${innerWidth < 768 ? "mobile" : "desktop"}.webp`;
    const timer = window.setTimeout(() => { void warmupEntrancePoster(posterSrc); }, 600);
    return () => window.clearTimeout(timer);
  }, [currentScreen, activeHubTab, warmupEntrancePoster]);
  const entranceRequest = useRef(0);
  useEffect(() => {
    if (currentScreen !== "menu") { entranceRequest.current++; setEntrancePhase("idle"); }
    return () => { entranceRequest.current++; };
  }, [currentScreen]);
  const openPracticeEntrance = async (tab: "learn" | "practice") => {
    const request = ++entranceRequest.current;
    if (tab !== "practice") { setEntrancePhase("idle"); setActiveHubTab(tab); return; }
    if (entrancePhase === "connected" && !showStudyRoom) return;
    setEntrancePhase("loading");
    const posterSrc = `/assets/entrance/room-${innerWidth < 768 ? "mobile" : "desktop"}.webp`;
    // The existing app stays visible while the first image is decoded (warmed on menu idle).
    await new Promise<void>(resolve => {
      // A stalled poster must not trap navigation; the inline fallback keeps Skip available.
      const timeout = window.setTimeout(resolve, 8000);
      void warmupEntrancePoster(posterSrc).finally(() => { window.clearTimeout(timeout); resolve(); });
    });
    if (request !== entranceRequest.current) return;
    setEntrancePhase("leaving");
    await new Promise(resolve => setTimeout(resolve, prefersReducedMotion ? 0 : 160));
    if (request !== entranceRequest.current) return;
    // Writing Desk opens the hub, like Bookshelf. Only this navigation returns
    // to the shell's top; switching Learn → Practice keeps the current position.
    if (showStudyRoom) window.scrollTo({ top: 0, behavior: "instant" });
    setShowStudyRoom(false);
    setActiveHubTab("practice"); setEntrancePhase("connected");
  };
  const cancelEntrance = () => {
    entranceRequest.current++; setEntrancePhase("idle"); setActiveHubTab("learn"); setShowStudyRoom(true);
  };
  const entranceConnected = entrancePhase === "connected" && currentScreen === "menu" && activeHubTab === "practice";
  const atelierHome = currentScreen === "menu" && activeHubTab === "practice" && (!showStudyRoom || entranceConnected);
  const atelierScreen = studioQuiz || (atelierHome && !entranceConnected) || currentScreen === "online-multiplayer";
  const [subLearnTab, setSubLearnTab] = useState<"hiragana" | "katakana" | "kanji" | "vocabulary">("hiragana");
  const [selectedLearnChar, setSelectedLearnChar] = useState<HiraganaItem | KatakanaItem | null>(null);

  // Zen Soundscape synthesizer engine state
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(readSavedMusicVolume);
  const [ambientSoundType, setAmbientSoundType] = useState<"zen" | "rain" | "bell">("zen");
  const [activeMediaSource, setActiveMediaSource] = useState<"synth" | "yt-temple" | "yt-kyoto">("synth");

  // Refs for Zen Ambient Loop Player
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const synthTimerRef = useRef<any>(null);
  const noiseNodeRef = useRef<any>(null);
  // Ref for real music tracks (HTML Audio)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  // Mirrors isMusicPlaying for audio callbacks that outlive a render (Polish A2).
  const musicPlayingRef = useRef(false);
  musicPlayingRef.current = isMusicPlaying;

  // Music track selection: "synth" = built-in synth, "ten_no_yowai" = Akie track, "one_voice" = Rokudenashi track
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<MusicTrackId>(readSavedMusicTrack);

  // Background scene cycling (0=Rainy Window, 1=Astra's Garden, 2=Sakura Dawn, 3=Moonlit Study)
  const [activeBgScene, setActiveBgScene] = useState<number>(readSavedBgScene);

  // Vocabulary navigation & search
  const [vocabsCategory, setVocabsCategory] = useState<string>("all");
  const [vocabsSearch, setVocabsSearch] = useState("");

  // Kanji catalog search (Polish C2). Lives here, like vocabsSearch and subLearnTab, so the query
  // survives a trip into Kanji Scroll and back. Memory only: never stored, never synced.
  const [kanjiSearch, setKanjiSearch] = useState("");

  // Quiz Pronunciation Voice settings
  const [autoPronounce, setAutoPronounce] = useState<boolean>(() => {
    try {
      return localStorage.getItem("astra_auto_pronounce") === "true";
    } catch (e) {
      return false;
    }
  });
  const [language, setLanguage] = useState<"en" | "ja">(() => {
    try {
      const stored = localStorage.getItem("hira_app_language");
      if (stored === "en" || stored === "ja") return stored;
    } catch (e) { }
    return "en";
  });
  const [availableJapaneseVoices, setAvailableJapaneseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedJapaneseVoiceURI, setSelectedJapaneseVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem("astra_japanese_voice_uri") || "";
    } catch (e) {
      return "";
    }
  });
  const [speechVoiceMode, setSpeechVoiceMode] = useState<"browser" | "cloud">(() => {
    try {
      return localStorage.getItem("astra_speech_voice_mode") === "cloud" ? "cloud" : "browser";
    } catch (e) {
      return "browser";
    }
  });
  const [selectedCloudVoiceId, setSelectedCloudVoiceId] = useState(() => {
    try {
      return localStorage.getItem("astra_cloud_voice_id") || DEFAULT_CLOUD_JAPANESE_VOICE;
    } catch (e) {
      return DEFAULT_CLOUD_JAPANESE_VOICE;
    }
  });
  const cloudAudioCacheRef = useRef<Map<string, string>>(new Map());
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const cloudSpeechRequestRef = useRef(0);
  const cloudFallbackNoticeRef = useRef(false);
  const [dockPanel, setDockPanel] = useState<DockPanelId | null>(null);
  const [dockPanelHeight, setDockPanelHeight] = useState(0);
  const [profileAvatar, setProfileAvatar] = useState<string>(() => localStorage.getItem("astra_profile_avatar") || "");

  // Mascot dynamic overrides
  const [mascotSpeechOverride, setMascotSpeechOverride] = useState<string | null>(null);

  // Mascot mood state
  const [mascotMood, setMascotMood] = useState<"welcome" | "streak" | "success" | "failure" | "kanji" | "idle" | "clicked" | "learn-flashcard" | "learn-vocabs" | "survival-danger" | "wondering" | "afk" | "excited" | "reading">("welcome");

  // Kanji drawing evaluation states
  const [analysisResult, setAnalysisResult] = useState<{ score: number; feedbackTitle: string; advice: string; validDrawing?: boolean } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Customizable background elements and dark/light settings
  const [initialPreferences] = useState(readLocalPreferences);
  const [theme, setTheme] = useState<ThemeId>(initialPreferences.theme);
  const [bgAnimationType, setBgAnimationType] = useState<"auto" | "snow" | "sakura" | "sparkles" | "rain" | "letters" | "both" | "none">(() => {
    try {
      const stored = localStorage.getItem("hira_theme_bg_anim");
      if (
        stored === "auto" ||
        stored === "snow" ||
        stored === "sakura" ||
        stored === "sparkles" ||
        stored === "rain" ||
        stored === "letters" ||
        stored === "both" ||
        stored === "none"
      ) {
        return stored;
      }
    } catch (e) { }
    return "auto";
  });

  const [autoCycleBg, setAutoCycleBg] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("astra_auto_cycle_bg");
      return stored === "false" ? false : true;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("astra_auto_cycle_bg", String(autoCycleBg));
    } catch (e) {}
  }, [autoCycleBg]);

  useEffect(() => {
    if (!autoCycleBg) return;

    const timer = setInterval(() => {
      setActiveBgScene((prev) => (prev + 1) % 4);
    }, 60000); // cycle every 1 min

    return () => clearInterval(timer);
  }, [autoCycleBg, activeBgScene]);
  const [bgIntensity, setBgIntensity] = useState<"low" | "medium" | "high">(() => {
    try {
      const stored = localStorage.getItem("hira_theme_bg_intensity");
      if (stored === "low" || stored === "medium" || stored === "high") return stored;
    } catch (e) { }
    return "medium";
  });
  const [bgBlur, setBgBlur] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("hira_theme_bg_blur_v2");
      if (stored !== null) {
        const n = parseFloat(stored);
        if (!isNaN(n) && n >= 0 && n <= 20) return n;
      }
    } catch (e) { }
    return 0;
  });
  const [bgOpacity, setBgOpacity] = useState<"very-dim" | "low" | "medium" | "vivid">(() => {
    try {
      const stored = localStorage.getItem("hira_theme_bg_opacity");
      if (stored === "very-dim" || stored === "low" || stored === "medium" || stored === "vivid") return stored;
    } catch (e) { }
    return "medium";
  });

  // Font style: "digital" = Noto Sans JP (clean/modern), "written" = Klee One (semi-handwritten/warm)
  const [fontStyle, setFontStyle] = useState<"digital" | "written">(() => {
    try {
      const stored = localStorage.getItem("astra_font_style");
      if (stored === "digital" || stored === "written") return stored;
    } catch (e) { }
    return "digital";
  });

  // Keep theme attribute in sync on mounting & changes
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("hira_theme_mode", theme);
    } catch (e) { }
  }, [theme]);

  // Polish A1: remember the music track and volume on this device only. Never synced,
  // never auto-plays (playback state is not stored). The scene is saved only when it is
  // picked by hand (handleDockSelectScene), never by the auto-cycle timer.
  useEffect(() => {
    try {
      localStorage.setItem("astra_music_track", selectedMusicTrack);
    } catch (e) { }
  }, [selectedMusicTrack]);

  useEffect(() => {
    try {
      localStorage.setItem("astra_music_volume", String(musicVolume));
    } catch (e) { }
  }, [musicVolume]);

  useEffect(() => {
    try {
      localStorage.setItem("hira_theme_bg_anim", bgAnimationType);
    } catch (e) { }
  }, [bgAnimationType]);

  useEffect(() => {
    try {
      localStorage.setItem("hira_theme_bg_intensity", bgIntensity);
    } catch (e) { }
  }, [bgIntensity]);

  useEffect(() => {
    try {
      localStorage.setItem("hira_theme_bg_blur_v2", String(bgBlur));
    } catch (e) { }
  }, [bgBlur]);

  useEffect(() => {
    try {
      localStorage.setItem("hira_theme_bg_opacity", bgOpacity);
    } catch (e) { }
  }, [bgOpacity]);

  // Apply font class to <html> element and persist preference
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("font-written", fontStyle === "written");
      localStorage.setItem("astra_font_style", fontStyle);
    } catch (e) { }
  }, [fontStyle]);

  // Persist language preference
  useEffect(() => {
    try {
      localStorage.setItem("hira_app_language", language);
    } catch (e) { }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem("astra_auto_pronounce", String(autoPronounce));
    } catch (e) { }
  }, [autoPronounce]);

  // ── ACC-1: ACCOUNT-SYNCED PREFERENCES ──────────────────────────────────────
  // Model and rules live in src/preferences.ts. In short: stats.preferences
  // carries a validated copy of the settings plus an `updatedAt` that is stamped
  // ONLY when the user changes a setting (never on start-up, never when a synced
  // value is applied). App-owned settings are read from the state above; the
  // three owned by child components (romaji, kanji form, practice grid) are
  // re-read from localStorage whenever a component announces a change.
  const refreshComponentPrefs = () => {
    setComponentPrefs((previous) => {
      const next = readComponentPreferences();
      return next.showRomaji === previous.showRomaji
        && next.kanjiForm === previous.kanjiForm
        && next.kanjiPracticeGrid === previous.kanjiPracticeGrid
        ? previous
        : next;
    });
  };
  const [componentPrefs, setComponentPrefs] = useState<ComponentPreferences>(readComponentPreferences);
  const [quizPreferences, setQuizPreferences] = useState(() => pickQuizPreferences(initialPreferences));
  const [readingAppearance, setReadingAppearance] = useState<ReadingAppearance>(() => ({
    readingWindow: initialPreferences.readingWindow, readingPalette: initialPreferences.readingPalette,
    readingTransition: initialPreferences.readingTransition,
  }));
  useEffect(() => {
    window.addEventListener(PREFERENCE_CHANGED_EVENT, refreshComponentPrefs);
    return () => window.removeEventListener(PREFERENCE_CHANGED_EVENT, refreshComponentPrefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { writeLocalPreferences({quizAppearance: initialPreferences.quizAppearance}); }, [initialPreferences]);

  const preferenceSnapshot: UserPreferences = completePreferences({
    theme,
    fontStyle,
    language,
    autoPronounce,
    speechVoiceMode,
    cloudVoiceId: selectedCloudVoiceId,
    bgAnimationType,
    bgIntensity,
    bgBlur,
    bgOpacity,
    autoCycleBg,
    ...componentPrefs,
    ...quizPreferences,
    ...readingAppearance,
  });
  const preferenceKey = serializePreferences(preferenceSnapshot);
  const preferenceSnapshotRef = useRef<UserPreferences>(preferenceSnapshot);
  preferenceSnapshotRef.current = preferenceSnapshot;
  // Baseline = whatever is on screen at first render, so start-up never counts as a change.
  const lastSyncedPreferenceKeyRef = useRef<string | null>(null);
  if (lastSyncedPreferenceKeyRef.current === null) lastSyncedPreferenceKeyRef.current = preferenceKey;

  // A genuine user change: stamp it, keep a durable local copy, and mirror it into
  // stats so the existing debounced cloud sync carries it.
  useEffect(() => {
    if (preferenceKey === lastSyncedPreferenceKeyRef.current ||
      preferenceKey !== serializePreferences(preferenceSnapshotRef.current)) return;
    lastSyncedPreferenceKeyRef.current = preferenceKey;
    const envelope: SyncedPreferences = { values: { ...preferenceSnapshotRef.current }, updatedAt: Date.now() };
    writeLocalPreferences({ ...pickQuizPreferences(preferenceSnapshotRef.current), ...readingAppearance });
    writePreferencesEnvelope(envelope);
    setStats((previous) => ({ ...previous, preferences: envelope }));
  }, [preferenceKey]);

  /** Adopt synced values on this device (state + the existing localStorage keys). */
  const applyPreferenceValues = (values: Partial<UserPreferences>) => {
    writeLocalPreferences(values);
    setReadingAppearance(previous => ({
      readingWindow: values.readingWindow ?? previous.readingWindow,
      readingPalette: values.readingPalette ?? previous.readingPalette,
      readingTransition: values.readingTransition ?? previous.readingTransition,
    }));
    setQuizPreferences(pickQuizPreferences(completePreferences(values, preferenceSnapshotRef.current)));
    if (values.theme !== undefined) setTheme(values.theme);
    if (values.fontStyle !== undefined) setFontStyle(values.fontStyle);
    if (values.language !== undefined) setLanguage(values.language);
    if (values.autoPronounce !== undefined) setAutoPronounce(values.autoPronounce);
    if (values.speechVoiceMode !== undefined) setSpeechVoiceMode(values.speechVoiceMode);
    if (values.cloudVoiceId !== undefined) setSelectedCloudVoiceId(values.cloudVoiceId);
    if (values.bgAnimationType !== undefined) setBgAnimationType(values.bgAnimationType);
    if (values.bgIntensity !== undefined) setBgIntensity(values.bgIntensity);
    if (values.bgBlur !== undefined) setBgBlur(values.bgBlur);
    if (values.bgOpacity !== undefined) setBgOpacity(values.bgOpacity);
    if (values.autoCycleBg !== undefined) setAutoCycleBg(values.autoCycleBg);
    refreshComponentPrefs();
  };

  /**
   * The ONE place cloud stats meet local stats (sign-in and page-load hydrate).
   * QZ4 reconciles quiz progress before this call. This function merges SRS,
   * tips and preferences and keeps the other fields from that cloud baseline.
   * Pass null when the account
   * has no cloud stats yet: the result is the local stats, with this device's
   * customised preferences stamped so they reach the new cloud copy.
   */
  const hydrateStatsFromCloud = (localStats: StudentStats, cloudStats: StudentStats | null): StudentStats => {
    const resolution = resolvePreferences({
      local: readPreferencesEnvelope() ?? sanitizeEnvelope(localStats.preferences),
      cloud: cloudStats ? sanitizeEnvelope(cloudStats.preferences) : null,
      snapshot: preferenceSnapshotRef.current,
      now: Date.now(),
    });

    let hydrated: StudentStats;
    if (cloudStats) {
      const { preferences: _cloudPreferences, ...cloudRest } = cloudStats;
      hydrated = {
        ...cloudRest,
        srsCards: mergeSrsCards(localStats.srsCards || {}, cloudStats.srsCards || {}),
      };
      // S2: daily limits resolve by their own updatedAt (a device's offline change is not lost);
      // omitted entirely when neither side has any.
      const mergedSrsSettings = mergeSrsSettings(localStats.srsSettings, cloudStats.srsSettings);
      if (mergedSrsSettings) hydrated.srsSettings = mergedSrsSettings;
      else delete hydrated.srsSettings;
      // B1: guided-tour progress is a grow-only set, so it merges by union (never cloud-wins);
      // omitted entirely when neither side has any.
      const mergedTips = mergeTips(localStats.tips, cloudStats.tips);
      if (mergedTips) hydrated.tips = mergedTips;
      else delete hydrated.tips;
    } else {
      const { preferences: _localPreferences, ...localRest } = localStats;
      hydrated = localRest;
      // B1: the seed keeps this device's tour progress (so it reaches the new cloud copy).
      const seededTips = mergeTips(localStats.tips, undefined);
      if (seededTips) hydrated.tips = seededTips;
      else delete hydrated.tips;
    }

    if (resolution.envelope) {
      hydrated.preferences = resolution.envelope;
      writePreferencesEnvelope(resolution.envelope);
    }
    if (resolution.apply && resolution.envelope) {
      // Mark the incoming values as already-synced BEFORE the setters fire, so
      // applying them is not mistaken for a user change and re-stamped.
      const incoming = completePreferences(resolution.envelope.values);
      preferenceSnapshotRef.current = incoming;
      lastSyncedPreferenceKeyRef.current = serializePreferences(incoming);
      applyPreferenceValues(resolution.apply);
    }
    return hydrated;
  };

  // Zen Soundscape synthesizer start/stop and volume logic
  const startAmbientMusic = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Create a master volume controller
      const masterGain = gainNodeRef.current || ctx.createGain();
      masterGain.gain.setValueAtTime(musicVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Stop any existing synth looping sequence
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
        synthTimerRef.current = null;
      }

      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) { }
        noiseNodeRef.current = null;
      }

      // Create Rain / Waterfall or Wind brown noise if desired
      if (ambientSoundType === "rain" || ambientSoundType === "zen") {
        // Create 2 seconds of brown/white noise buffer for rain Simulation
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 4.5; // Gain boost
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = ambientSoundType === "zen" ? 800 : 1200;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = ambientSoundType === "zen" ? 0.04 : 0.09;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(0);
        noiseNodeRef.current = noise;
      }

      // Pentatonic bell generator
      if (ambientSoundType === "bell" || ambientSoundType === "zen") {
        // Sakura-Akebono scale
        const scale = [220, 246, 261, 329, 349, 440, 493, 523, 659, 698, 880];

        const playPentatonicNote = () => {
          if (!audioContextRef.current || audioContextRef.current.state !== "running") return;
          const now = ctx.currentTime;

          const playSingle = (freq: number, delayMs: number) => {
            setTimeout(() => {
              if (!audioContextRef.current || audioContextRef.current.state !== "running") return;

              const osc = ctx.createOscillator();
              const noteGain = ctx.createGain();

              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, ctx.currentTime);

              const lfo = ctx.createOscillator();
              const lfoGain = ctx.createGain();
              lfo.frequency.value = 4.2;
              lfoGain.gain.value = 4;
              lfo.connect(lfoGain);
              lfoGain.connect(osc.frequency);
              lfo.start();

              noteGain.gain.setValueAtTime(0, ctx.currentTime);
              noteGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.12);
              noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.8);

              osc.connect(noteGain);
              noteGain.connect(masterGain);

              osc.start();
              osc.stop(ctx.currentTime + 3.0);

              setTimeout(() => {
                try { lfo.stop(); } catch (e) { }
              }, 3300);
            }, delayMs);
          };

          const randFreq1 = scale[Math.floor(Math.random() * scale.length)];
          playSingle(randFreq1, 0);

          if (Math.random() < 0.35) {
            const randIndex = Math.floor(Math.random() * scale.length);
            const randFreq2 = scale[randIndex];
            playSingle(randFreq2, 100);
          }
        };

        playPentatonicNote();

        const scheduleNextNote = () => {
          const nextDelay = 2500 + Math.random() * 4500;
          synthTimerRef.current = setTimeout(() => {
            playPentatonicNote();
            scheduleNextNote();
          }, nextDelay);
        };
        scheduleNextNote();
      }

    } catch (err) {
      console.warn("Ambient music init error:", err);
    }
  };

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.setValueAtTime(musicVolume, audioContextRef.current.currentTime);
      } catch (e) { }
    }
    // Also sync HTML audio volume
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
    }
  }, [musicVolume]);

  // Polish A2: a track that cannot play (blocked by the browser, or a missing / unsupported file)
  // must not stay on "Playing". Acts only when the learner asked for music, and only once per
  // attempt (the play() rejection and the audio error event can both fire).
  const handleMusicFailure = (reason: "blocked" | "unavailable") => {
    if (!musicPlayingRef.current) return;
    musicPlayingRef.current = false;
    setIsMusicPlaying(false);
    const trackName = MUSIC_TRACKS.find((track) => track.id === selectedMusicTrack)?.toastName ?? "that track";
    showToast(
      reason === "blocked"
        ? "Your browser blocked the music. Tap Play to try again."
        : `Couldn't play ${trackName}. The file may be missing.`
    );
  };

  const handleMusicPlayRejection = (audio: HTMLAudioElement, error: unknown) => {
    console.warn("Audio play failed:", error);
    if (musicAudioRef.current !== audio) return; // a newer track replaced this one
    const errorName = (error as { name?: string } | null)?.name ?? "";
    if (errorName === "AbortError") return; // interrupted by pause() or a track change, not a failure
    handleMusicFailure(errorName === "NotAllowedError" ? "blocked" : "unavailable");
  };

  // HTML Audio track: create/swap audio element when track changes
  useEffect(() => {
    // Stop & clean up previous HTML audio
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.src = "";
      musicAudioRef.current = null;
    }

    const trackSrc =
      selectedMusicTrack === "ten_no_yowai"
        ? "/music/ten_no_yowai.mp3"
        : selectedMusicTrack === "one_voice"
          ? "/music/one_voice.m4a"
          : selectedMusicTrack === "amakigoe"
            ? "/music/amakigoe.mp3"
            : selectedMusicTrack === "columbinas_lullaby"
              ? "/music/columbinas_lullaby.mp3"
              : "/music/sparkle.mp3";

    const audio = new Audio(trackSrc);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, musicVolume));
    musicAudioRef.current = audio;

    // A missing or unreadable file fires "error". Ignored unless the learner asked for music
    // (the file preloads and may fail while paused), and ignored for a replaced element.
    const handleAudioError = () => {
      if (musicAudioRef.current !== audio) return;
      handleMusicFailure("unavailable");
    };
    audio.addEventListener("error", handleAudioError);

    if (isMusicPlaying) {
      audio.play().catch(e => handleMusicPlayRejection(audio, e));
    }

    return () => {
      audio.removeEventListener("error", handleAudioError);
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMusicTrack]);

  // HTML Audio track: play/pause when isMusicPlaying changes
  useEffect(() => {
    if (!musicAudioRef.current) return;
    if (isMusicPlaying) {
      musicAudioRef.current.volume = Math.max(0, Math.min(1, musicVolume));
      const currentAudio = musicAudioRef.current;
      currentAudio.play().catch(e => handleMusicPlayRejection(currentAudio, e));
    } else {
      musicAudioRef.current.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMusicPlaying]);

  useEffect(() => {
    if (false) {
      startAmbientMusic();
    } else {
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) { }
        noiseNodeRef.current = null;
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.suspend(); } catch (e) { }
      }
    }

    return () => {
      if (synthTimerRef.current) {
        clearTimeout(synthTimerRef.current);
      }
    };
  }, [isMusicPlaying, ambientSoundType, activeMediaSource, selectedMusicTrack]);

  // Profile screen collapsible section states + calendar month navigation
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [badgesOpen, setBadgesOpen] = useState(true);
  const [calViewDate, setCalViewDate] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month: 0-indexed
  });

  // Profile script toggle (hiragana / katakana)
  const [profileCharSet, setProfileCharSet] = useState<"hiragana" | "katakana">("hiragana");

  // Input refs for romaji typing inputs — used to restore focus after each question
  // advance so the virtual keyboard never dismisses on mobile.

  // Kanji board index variables
  const [currentKanjiIndex, setCurrentKanjiIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clear drawing analysis results when switching Kanji
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }, [currentKanjiIndex]);

  // Filter selection inside archives
  const [archiveFilter, setArchiveFilter] = useState<string>("all");

  // ── FRIEND SYSTEM STATE ────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendUidInput, setFriendUidInput] = useState("");
  const [friendNameInput, setFriendNameInput] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendSearchInput, setFriendSearchInput] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSearchResult[]>([]);
  const [friendSearchError, setFriendSearchError] = useState<string | null>(null);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [pendingFriendRequestUids, setPendingFriendRequestUids] = useState<Set<string>>(() => new Set());
  const [incomingInvites, setIncomingInvites] = useState<RoomInvite[]>([]);
  const [inviteResponses, setInviteResponses] = useState<InviteResponse[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([]);
  const [pendingInviteUids, setPendingInviteUids] = useState<Set<string>>(() => new Set());
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showFriendsSection, setShowFriendsSection] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Astra Scholar");
  const [profileNameInput, setProfileNameInput] = useState("Astra Scholar");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isAccountUser, setIsAccountUser] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [statsHydrated, setStatsHydrated] = useState(false);
  const [cloudStatsHydrated, setCloudStatsHydrated] = useState(false);
  const [progressOwner, setProgressOwner] = useState<string | null>(null);
  const [statsBinding, setStatsBinding] = useState<StatsBinding>();
  const [progressChanging, setProgressChanging] = useState(false);
  const [cloudSyncReady, setCloudSyncReady] = useState(false);
  const [localProgressReadable, setLocalProgressReadable] = useState(true);
  const [quizCloudPending, setQuizCloudPending] = useState(false);
  const localReadableRef = useRef(true);
  const bindingRef = useRef<StatsBinding | 'transition' | null>(null);
  const offlineOwnerRef = useRef<string | null>(null);
  const progressIdentity = useRef<{ uid: string | null; owner: string | null; account: boolean }>({ uid: null, owner: null, account: false });
  const progressBusy = useRef(false);
  const progressEpoch = useRef(0);
  const deferredAuth = useRef<FirebaseUser | null | undefined>(undefined);
  const initialAuth = useRef<Promise<FirebaseUser> | null>(null);
  const syncEnabledRef = useRef(false);
  syncEnabledRef.current = cloudSyncReady;
  const adoptBinding = (binding: StatsBinding) => {
    bindingRef.current = binding;
    setStatsBinding(binding);
  };
  const isCurrentQuizOwner = (owner: string) => !progressBusy.current && localReadableRef.current &&
    progressIdentity.current.owner === owner && (currentUid() ?? offlineOwnerRef.current) === owner &&
    bindingRef.current !== 'transition' && bindingRef.current?.owner === owner;
  const quizBridge: QuizProgressBridge = useQuizProgressBridge({
    stats, setStats, binding: statsBinding, storage: quizBrowserStorage,
    writeEnabled: statsHydrated && cloudStatsHydrated && !progressChanging && localProgressReadable,
    canWrite: () => {
      const binding = bindingRef.current;
      if (progressBusy.current || binding === 'transition' || !localReadableRef.current) return false;
      if (!binding) return true;
      const lease = quizSession.canReplace(binding.owner);
      return lease.ok === true || lease.reason !== 'conflict';
    },
    isCurrentOwner: isCurrentQuizOwner,
  });
  const quizReady = statsHydrated && cloudStatsHydrated && !progressChanging && localProgressReadable &&
    !!progressOwner && statsBinding?.owner === progressOwner;
  const quizSession = useQuizSession({
    owner: progressOwner, ready: quizReady,
    cloud: isAccountUser, storage: quizBrowserStorage, bridge: quizBridge, isCurrentOwner: isCurrentQuizOwner,
  });
  const quizHistory = useMemo(() => quizHistoryFromStats(stats), [stats.quizSkills, stats.characterProgress]);
  const enterQuiz = (subject: "kana" | "vocab" | "kanji") => {
    setKanaLaunch("resume"); setShowProfilePanel(false);
    setCurrentScreen(subject === "vocab" ? "vocab-quiz" : subject === "kanji" ? "kanji-quiz" : "quiz");
  };
  const soloRequestedSubject = currentScreen === "vocab-quiz" ? "vocab" : currentScreen === "kanji-quiz" ? "kanji" : "kana";
  const soloDraftSubject = quizSession.state.phase !== "idle" ? quizSession.state.config.subject : atelierHome ? quizPreferences.quizSubject : soloRequestedSubject;
  const openQuizResume = () => { setKanaLaunch("resume"); setShowProfilePanel(false); setCurrentScreen(quizSession.state.phase !== "idle" && quizSession.state.config.subject === "vocab" ? "vocab-quiz" : quizSession.state.phase !== "idle" && quizSession.state.config.subject === "kanji" ? "kanji-quiz" : "quiz"); };
  const studiedQuizKanji = useMemo(() => KANJI_DATA.filter(item => (stats.characterProgress[item.kanji]?.total ?? 0) > 0).map(item => item.kanji), [stats.characterProgress]);
  const learnedQuizWords = useMemo(() => Object.keys(stats.vocabularyProgress).filter(word => stats.vocabularyProgress[word]), [stats.vocabularyProgress]);
  const leaveKanaPractice = () => {
    setShowStudyRoom(false);
    setActiveHubTab("practice");
    setCurrentScreen("menu");
  };
  useEffect(() => { if (!studioQuiz) quizSession.suspend(); }, [studioQuiz]);

  const cloudSaves = useRef<ReturnType<typeof createCloudSaveQueue> | null>(null);
  if (!cloudSaves.current) {
    cloudSaves.current = createCloudSaveQueue(async request => {
      if (!isCurrentQuizOwner(request.binding.owner) || !progressIdentity.current.account || !syncEnabledRef.current) {
        throw new Error("Cloud progress owner changed.");
      }
      await saveCloudStats(request.stats, request.binding.owner);
    }, request => {
      if (!isCurrentQuizOwner(request.binding.owner)) return;
      const result = quizBrowserStorage.acknowledgeOutbox(request.binding.owner, request.stats);
      if (result.ok === false) throw new Error(result.message);
      if (request.stats === statsRef.current) setQuizCloudPending(false);
      if (request.binding.backupUpload) {
        const acknowledged = quizBrowserStorage.acknowledgeBackupUpload(request.binding);
        if (acknowledged.ok === true && acknowledged.value) adoptBinding({ owner: request.binding.owner });
        else if (acknowledged.ok === false) throw new Error(acknowledged.message);
      }
    }, error => setAccountError(error instanceof Error ? error.message : "Cloud progress sync failed"));
  }
  const cloudQueue = cloudSaves.current;
  function progressTimeout<T>(work: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Cloud progress is unavailable. Device progress is still available.")), 8000);
      work.then(value => { window.clearTimeout(timer); resolve(value); },
        error => { window.clearTimeout(timer); reject(error); });
    });
  }
  function beginProgressChange() {
    quizSession.suspend(true);
    progressBusy.current = true;
    setProgressChanging(true);
    quizBridge.cancel();
    cloudQueue.cancel();
    return ++progressEpoch.current;
  }
  function finishProgressChange(epoch: number) {
    if (progressEpoch.current !== epoch) return;
    progressBusy.current = false;
    setProgressChanging(false);
    setCloudStatsHydrated(true);
    const waiting = deferredAuth.current;
    deferredAuth.current = undefined;
    if (waiting !== undefined && (waiting?.uid ?? null) === currentUid()) queueMicrotask(() => syncObservedIdentity(waiting));
  }
  function usableLocalStats(owner: string, local: StudentStats) {
    return canUseDeviceStats(local, bindingRef.current, owner);
  }
  function claimLocalProgress(owner: string, local: StudentStats) {
    if (!localReadableRef.current || !usableLocalStats(owner, local)) return;
    const bound = bindingRef.current;
    if (!bound || bound.owner !== owner) adoptBinding({ owner });
    const now = quizClock();
    const snapshot = quizBrowserStorage.readSnapshot(owner, now);
    const outbox = quizBrowserStorage.readOutbox(owner);
    if (outbox.ok === false || (snapshot.ok === false && snapshot.reason !== 'invalid')) return;
    const pinned = new Set<string>(outbox.value.map(entry => entry.record.sessionId));
    if (snapshot.ok === true && snapshot.value) pinned.add(snapshot.value.config.sessionId);
    const cleaned = sanitizeQuizProgress(local, now.epochMs, pinned);
    if (cleaned.prunedReceipts || cleaned.prunedSkills) {
      setStats(previous => withQuizMaps(previous, sanitizeQuizProgress(previous, now.epochMs, pinned).maps));
      if (cleaned.prunedSkills) showToast(`Kept the newest quiz skills. ${cleaned.prunedSkills} older rows were removed.`);
    }
  }
  async function activateProgressIdentity(user: FirebaseUser | null, epoch: number, loaded?: { stats: StudentStats | null }) {
    const uid = user?.uid ?? null;
    if (epoch !== progressEpoch.current || currentUid() !== uid) return false;
    const owner = uid ?? offlineOwnerRef.current;
    const oldOwner = progressIdentity.current.owner;
    let local = statsRef.current;
    if (oldOwner && oldOwner !== owner) {
      if (quizSession.canReplace(oldOwner).ok === true) {
        const removed = quizBrowserStorage.removeSnapshot(oldOwner);
        if (removed.ok === false) setAccountError(removed.message);
      }
      quizSession.detach(oldOwner);
      if (quizBridge.hasVolatile()) {
        const durable = quizBrowserStorage.readStats();
        if (durable.ok === true && durable.value) {
          local = withQuizMaps(durable.value, readQuizProgress(durable.value).maps);
          setStats(local);
          quizBridge.cancel(true);
        }
      }
    }
    const account = !!user && !user.isAnonymous;
    progressIdentity.current = { uid, owner, account };
    setMyUid(uid);
    setAccountEmail(user?.email ?? null);
    setIsAccountUser(account);
    setProgressOwner(owner);
    setCloudSyncReady(false);
    if (!owner) return false;
    if (!account) {
      claimLocalProgress(owner, local);
      return true;
    }
    try {
      await progressTimeout(cloudQueue.drained());
      const binding = bindingRef.current;
      const backupUpload = binding && binding !== 'transition' && binding.owner === owner ? binding.backupUpload : undefined;
      const cloud = backupUpload ? null : loaded ? loaded.stats : await progressTimeout(loadCloudStats(owner));
      if (epoch !== progressEpoch.current || currentUid() !== owner) return false;
      if (!cloud && bindingRef.current === 'transition') {
        throw new Error("Device progress ownership could not be confirmed. The existing save was retained.");
      }
      if (quizBridge.hasVolatile() && oldOwner === owner) throw new Error("Save pending practice before refreshing cloud progress.");
      const now = quizClock();
      const lease = quizSession.canReplace(owner);
      if (lease.ok === false) throw new Error(lease.message);
      local = statsRef.current;
      const ownerLocal = usableLocalStats(owner, local) ? local : defaultStats;
      const journal = readHydrationJournal(quizBrowserStorage, owner, cloud ?? ownerLocal, now);
      if (journal.ok === false) throw new Error(journal.message);
      const reconciled = hydrateQuizProgress(ownerLocal, cloud, journal.value.entries, now.epochMs, journal.value.activeSessions);
      const hydrated = cloud ? hydrateStatsFromCloud(ownerLocal, reconciled.stats) : hydrateStatsFromCloud(reconciled.stats, null);
      const nextBinding = { owner, ...(backupUpload ? { backupUpload } : {}) };
      // replaceCards also patches the shared blob. Give it the correct owner's complete base first.
      const saved = quizBrowserStorage.writeStats(hydrated, nextBinding, local);
      if (saved.ok === false) throw new Error(saved.message);
      quizBridge.cancel(true);
      quizBridge.observeDeviceStats(hydrated);
      adoptBinding(nextBinding);
      localReadableRef.current = true;
      setLocalProgressReadable(true);
      setStats(hydrated);
      replaceCards(hydrated.srsCards ?? {});
      if (reconciled.prunedSkills) showToast(`Kept the newest quiz skills. ${reconciled.prunedSkills} older rows were removed.`);
      setCloudSyncReady(true);
      return true;
    } catch (error) {
      if (epoch === progressEpoch.current && currentUid() === uid) {
        claimLocalProgress(owner, statsRef.current);
        setAccountError(error instanceof Error ? error.message : "Cloud progress sync failed.");
      }
      return false;
    }
  }
  function syncObservedIdentity(user: FirebaseUser | null) {
    const uid = user?.uid ?? null;
    if (uid !== currentUid()) return;
    if (progressBusy.current) { deferredAuth.current = user; return; }
    if (progressIdentity.current.uid === uid && progressIdentity.current.account === (!!user && !user.isAnonymous)) return;
    const epoch = beginProgressChange();
    void activateProgressIdentity(user, epoch).finally(() => finishProgressChange(epoch));
  }
  const progressUploadInputRef = useRef<HTMLInputElement>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeFriendsRef = useRef<(() => void) | null>(null);
  const unsubscribeFriendRequestsRef = useRef<(() => void) | null>(null);
  const unsubscribeInvitesRef = useRef<(() => void) | null>(null);
  const unsubscribeInviteResponsesRef = useRef<(() => void) | null>(null);
  const unsubscribeMatchHistoryRef = useRef<(() => void) | null>(null);
  const seenFriendRequestIdsRef = useRef<Set<string>>(new Set());
  const friendRequestsLoadedRef = useRef(false);
  // ── END FRIEND SYSTEM STATE ────────────────────────────────────────────────
  const duelLearningGate=useRef(false);
  const duel = useDuelSession({uid:myUid,network:duelNetwork,catalogs:SOLO_CATALOGS,autoNext:quizPreferences.quizAutoNext,canAdvance:()=>duelLearningGate.current,
    onRestore:()=>{setShowProfilePanel(false);setCurrentScreen("online-multiplayer");}});
  const duelLearning=useDuelLearning({uid:myUid,ready:quizReady&&myUid===progressOwner,cloud:isAccountUser,room:duel.room,stats,storage:quizBrowserStorage,bridge:quizBridge,reserve:quizSession.reserveProgress});
  duelLearningGate.current=!duelLearning.pending||duelLearning.volatile;
  const duelRepair=useMemo(()=>{if(!duel.room||!myUid||duel.room.status!=='finished')return {questions:[],count:0};
    const count=duelMisses(duel.room,myUid).length;try{const questions=mappedDuelMisses(duel.room,myUid,SOLO_CATALOGS);return {questions,count,...(count&&!questions.length?{unavailable:"Practice is unavailable because this set cannot be mapped to the current local catalog."}:{})};}catch{return {questions:[],count,unavailable:"Practice is unavailable for this catalog version."};}},[duel.room,myUid]);
  const practiceDuelMisses=()=>{
    if(!quizReady||!myUid||myUid!==progressOwner||!duel.room||duelLearning.pending||duelLearning.error)return;
    if(quizSession.state.phase!=="idle"){showToast("Resume or discard your saved solo practice before starting a repair.");return;}
    if(!duelRepair.questions.length)return;
    const subject=duel.room.v2.settings.subject;
    if(startQuizRepair(quizSession,duelRepair.questions,subject,duelLearningId(duel.room.v2.matchId,myUid),quizPreferences.quizAutoNext)){duel.forget();enterQuiz(subject);}else showToast("This repair could not start. Your confirmed match results are kept.");
  };



  // 1. Initial State Load & Study Streak evaluation
  useEffect(() => {
    const owner = quizBrowserStorage.localOwner(offlineOwnerRef.current?.slice(6) ?? quizDeviceId());
    offlineOwnerRef.current = owner.ok === true ? owner.value : offlineOwnerRef.current ?? `local:${quizDeviceId()}`;
    const binding = quizBrowserStorage.readBinding();
    bindingRef.current = binding.ok === true ? binding.value : 'transition';
    if (binding.ok === true && binding.value && binding.value !== 'transition') adoptBinding(binding.value);
    const saved = quizBrowserStorage.readStats();
    if (saved.ok === true) quizBridge.observeDeviceStats(saved.value);
    if (saved.ok === false) {
      localReadableRef.current = false;
      setLocalProgressReadable(false);
      setAccountError(saved.message);
    }
    if (saved.ok === true && saved.value) {
      try {
        const clean = readQuizProgress(saved.value);
        const parsed = withQuizMaps(saved.value, clean.maps);
        if (clean.prunedSkills) showToast(`Kept the newest quiz skills. ${clean.prunedSkills} older rows were removed.`);
        parsed.srsCards = parsed.srsCards ?? {};
        // ACC-1: the preferences' durable local copy is its own key; the blob copy is only a mirror.
        const loadedPreferences = readPreferencesEnvelope() ?? sanitizeEnvelope(parsed.preferences);
        delete parsed.preferences;
        // B1: the blob is spread unsanitized below, so tour progress is checked here (corrupt data is dropped).
        const loadedTips = sanitizeTips(parsed.tips);
        delete parsed.tips;

        // Dynamic streak verification — recompute from studyDates in local time
        let currentStreak = 0;
        const studySet = new Set<string>(parsed.studyDates || []);
        if (studySet.size > 0) {
          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);
          const todayStr = cursor.toLocaleDateString("en-CA");
          const yesterday = new Date(cursor);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString("en-CA");

          // Streak is alive only if the user studied today OR yesterday
          if (studySet.has(todayStr) || studySet.has(yesterdayStr)) {
            // Start cursor at today, or yesterday if today not yet studied
            if (!studySet.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
            while (studySet.has(cursor.toLocaleDateString("en-CA"))) {
              currentStreak++;
              cursor.setDate(cursor.getDate() - 1);
            }
          }
          // else: gap of 2+ days → streak stays 0
        }

        setStats({
          ...parsed,
          ...(loadedPreferences ? { preferences: loadedPreferences } : {}),
          ...(loadedTips ? { tips: loadedTips } : {}),
          streakCount: currentStreak,
          vocabularyProgress: parsed.vocabularyProgress || {},
          studyDates: parsed.studyDates || [],
          survivalBestScore: parsed.survivalBestScore || 0,
          srsReviewedTotal: parsed.srsReviewedTotal || 0,
          readingMisses: Array.isArray(parsed.readingMisses) ? parsed.readingMisses : [],
        });

        if (currentStreak > 0) {
          setMascotMood("streak");
        }
      } catch (err) {
        console.error("Failed to parse saved credentials", err);
      }
    }
    if (saved.ok === false || !saved.value) {
      const loadedPreferences = readPreferencesEnvelope();
      if (loadedPreferences) setStats((previous) => ({ ...previous, preferences: loadedPreferences }));
    }
    setStatsHydrated(true);
  }, []);

  // Sign in anonymously first so existing multiplayer features keep working.
  // When the user creates an account, Firebase links that anonymous identity to
  // email/password, preserving the existing UID, friend code, and profile.
  useEffect(() => {
    if (!statsHydrated) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const epoch = beginProgressChange();
    initialAuth.current ??= ensureSignedIn();
    void progressTimeout<FirebaseUser>(initialAuth.current)
      .then(user => { if (!cancelled) return activateProgressIdentity(user, epoch); })
      .catch(async error => {
        if (cancelled) return;
        setAccountError(error instanceof Error ? error.message : "Firebase sign-in failed.");
        await activateProgressIdentity(auth.currentUser, epoch);
      }).finally(() => {
        if (cancelled) return;
        finishProgressChange(epoch);
        unsubscribe = onAuthStateChanged(auth, syncObservedIdentity);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
      cloudQueue.cancel();
      progressEpoch.current++;
    };
    // The initial local stats must be loaded before cloud hydration begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsHydrated]);

  useEffect(() => {
    const pruned = quizBridge.skillPrune;
    if (pruned) showToast(`Kept the newest quiz skills. ${pruned.count} older rows were removed.`);
  }, [quizBridge.skillPrune]);

  // Upload only after the latest whole local blob is durable.
  useEffect(() => {
    if (!cloudSyncReady || !cloudStatsHydrated || !isAccountUser || !statsBinding ||
      !isCurrentQuizOwner(statsBinding.owner) || !quizBridge.isDurable(stats)) return;
    setQuizCloudPending(true);
    cloudQueue.enqueue({ binding: statsBinding, stats });
  }, [cloudSyncReady, cloudStatsHydrated, isAccountUser, progressChanging, statsBinding, stats, quizBridge.storageError]);

  useEffect(() => {
    if (!cloudStatsHydrated || !isAccountUser || cloudSyncReady || !progressOwner) return;
    let cancelled = false;
    let loading = false;
    const retry = async () => {
      const user = auth.currentUser;
      if (loading || cancelled || progressBusy.current || !navigator.onLine || quizBridge.hasVolatile() ||
        !user || user.uid !== progressOwner || user.isAnonymous) return;
      loading = true;
      const seen = progressEpoch.current;
      try {
        const remote = await progressTimeout(loadCloudStats(user.uid));
        if (cancelled || progressBusy.current || seen !== progressEpoch.current || currentUid() !== user.uid || quizBridge.hasVolatile()) return;
        const epoch = beginProgressChange();
        try { await activateProgressIdentity(user, epoch, { stats: remote }); }
        finally { finishProgressChange(epoch); }
      } catch { /* Keep device progress and try again when the connection recovers. */ }
      finally { loading = false; }
    };
    const online = () => { void retry(); };
    const timer = window.setInterval(online, 15_000);
    window.addEventListener("online", online);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("online", online); };
  }, [cloudStatsHydrated, isAccountUser, cloudSyncReady, progressOwner]);

  // ── Polish B2: guided tour (Study Room tips) ────────────────────────────────
  // GuideTour.tsx is presentational. This block owns every stored write. `patchTips` is the one writer of
  // `stats.tips` (grow-only, merged by union in src/tips.ts): anonymous users keep it in the local blob, signed-in
  // users sync it with the rest of `stats`.
  const patchTips = useCallback((patch: TipsState) => {
    setStats((previous) => {
      const next = mergeTips(previous.tips, patch);
      if (JSON.stringify(next ?? null) === JSON.stringify(previous.tips ?? null)) return previous;
      const { tips: _previousTips, ...rest } = previous;
      return next ? { ...rest, tips: next } : rest;
    });
  }, []);

  /** Next on a real run: this one tip has been shown and acknowledged. */
  const markTipSeen = useCallback((id: TipId) => {
    patchTips({ seen: { [id]: true } });
  }, [patchTips]);

  /** Skip all and Escape on a real run: every tip seen, and `skipped`. */
  const skipAllTips = useCallback(() => {
    const everything: Record<string, true> = {};
    for (const id of TIP_IDS) everything[id] = true;
    patchTips({ seen: everything, skipped: true });
  }, [patchTips]);

  // D9: someone who already has progress and no tour record never gets the beginner tour (a silent `skipped` stamp).
  const stampVeteranTips = (merged: StudentStats) => {
    if (!merged.tips && hasProgress(merged)) patchTips({ skipped: true });
  };

  // Decided ONCE per app load, after both hydration flags are true (so after mergeTips has run in the cloud hydrate)
  // and before the card can first paint. Never again on later menu visits: a new user who taps a tile at step 1 and
  // earns XP must still resume. (An interactive sign-in repeats it once, with the account's merged stats.)
  const tourDecidedRef = useRef(false);
  const [tourDecided, setTourDecided] = useState(false);
  useEffect(() => {
    if (!statsHydrated || !cloudStatsHydrated || tourDecidedRef.current) return;
    tourDecidedRef.current = true;
    stampVeteranTips(stats);
    setTourDecided(true);
    // The check is deliberately keyed on the two hydration flags only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsHydrated, cloudStatsHydrated]);

  // Replay (header profile menu): a session-only run of all five steps. It never writes.
  const [tourReplay, setTourReplay] = useState(false);
  const [tourRunId, setTourRunId] = useState(0);
  const replayGuidedTour = () => {
    setShowProfilePanel(false);
    setDockPanel(null);
    setShowStudyRoom(true);
    setCurrentScreen("menu");
    setTourRunId((count) => count + 1);
    setTourReplay(true);
  };
  // A replay ends when the learner leaves the Study Room.
  useEffect(() => {
    if (tourReplay && (currentScreen !== "menu" || !showStudyRoom)) setTourReplay(false);
  }, [tourReplay, currentScreen, showStudyRoom]);

  const tourPending = !stats.tips?.skipped && TIP_IDS.some((id) => !stats.tips?.seen?.[id]);
  // Study Room only, hydrated, and never over a modal or an open dock panel. Anything else hides it without marking anything.
  const tourVisible =
    statsHydrated &&
    cloudStatsHydrated &&
    currentScreen === "menu" &&
    showStudyRoom &&
    dockPanel === null &&
    !showProfilePanel &&
    (tourReplay || (tourDecided && tourPending));

  const normalizeImportedStats = (input: any): StudentStats | null => {
    const imported = input?.stats ?? input;
    if (!imported || typeof imported !== "object" || Array.isArray(imported)) return null;
    // B1: a backup's tour progress is unioned with this device's; a pre-tips backup keeps the device's.
    const importedTips = mergeTips(statsRef.current.tips, imported.tips);
    const now = Date.now();
    const quizProgress = sanitizeQuizProgress(imported, now);
    if (quizProgress.prunedSkills) showToast(`Kept the newest quiz skills. ${quizProgress.prunedSkills} older rows were removed.`);
    return {
      ...quizProgress.maps,
      xp: Number(imported.xp) || 0,
      streakCount: Number(imported.streakCount) || 0,
      lastActiveDate: typeof imported.lastActiveDate === "string" ? imported.lastActiveDate : null,
      correctCount: Number(imported.correctCount) || 0,
      totalAttempts: Number(imported.totalAttempts) || 0,
      masteredChars: Array.isArray(imported.masteredChars) ? imported.masteredChars : [],
      characterProgress: imported.characterProgress && typeof imported.characterProgress === "object" ? imported.characterProgress : {},
      vocabularyProgress: imported.vocabularyProgress && typeof imported.vocabularyProgress === "object" ? imported.vocabularyProgress : {},
      favoriteCategory: typeof imported.favoriteCategory === "string" ? imported.favoriteCategory : "basic",
      // S1: tolerate cards with missing or invalid fields (normalize, never throw); valid cards keep level and nextReview.
      srsCards: normalizeSrsCards(imported.srsCards, now),
      // S2: a backup's daily limits come back with it; a backup without them leaves this device's as they are.
      ...(imported.srsSettings && typeof imported.srsSettings === "object"
        ? { srsSettings: { ...normalizeSrsSettings(imported.srsSettings), updatedAt: now } }
        : statsRef.current.srsSettings ? { srsSettings: statsRef.current.srsSettings } : {}),
      ...(importedTips ? { tips: importedTips } : {}),
      studyDates: Array.isArray(imported.studyDates) ? imported.studyDates : [],
      survivalBestScore: Number(imported.survivalBestScore) || 0,
      srsReviewedTotal: Number(imported.srsReviewedTotal) || 0,
      readingMisses: Array.isArray(imported.readingMisses) ? imported.readingMisses.filter((item: any) => item && typeof item.dictKey === "string") : [],
    };
  };

  const handleRecordReadingMiss = (token: ReadingToken, origin: { storyId: string; tokenIndex: number }) => {
    if (!token.dictKey || !token.reading || !token.meaning) return;
    const now = Date.now();
    setStats((previous) => {
      const current = previous.readingMisses || [];
      const existing = current.find((item) => item.dictKey === token.dictKey);
      const nextMisses = existing
        ? current.map((item) => item.dictKey === token.dictKey ? { ...item, origin, lastSeen: now, count: item.count + 1 } : item)
        : [...current, { dictKey: token.dictKey, surface: token.surface, reading: token.reading!, meaning: token.meaning!, firstSeen: now, lastSeen: now, count: 1, origin }];
      const updated = { ...previous, readingMisses: nextMisses };
      return updated;
    });
  };

  const handleDownloadProgress = () => {
    const payload = {
      app: "Astra",
      version: 1,
      exportedAt: new Date().toISOString(),
      profileName,
      stats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `astra-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Progress downloaded.");
  };

  const handleProgressUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("File too large. Please use a valid Astra backup."); return; }
    const owner = progressIdentity.current.owner;
    const observedEpoch = progressEpoch.current;
    if (!owner || progressBusy.current) { showToast("Wait for device progress to load before restoring a backup."); return; }
    let replacementEpoch: number | undefined;
    try {
      const parsed = JSON.parse(await file.text());
      if (progressBusy.current || observedEpoch !== progressEpoch.current || owner !== (currentUid() ?? offlineOwnerRef.current)) {
        showToast("Account changed while reading the backup. Select the file again.");
        return;
      }
      const importedStats = normalizeImportedStats(parsed);
      if (!importedStats) {
        showToast("That progress file could not be read.");
        return;
      }
      const available = quizSession.canReplace(owner);
      if (available.ok === false) { showToast(available.message); return; }
      replacementEpoch = beginProgressChange();
      await progressTimeout(cloudQueue.drained());
      if (replacementEpoch !== progressEpoch.current || owner !== (currentUid() ?? offlineOwnerRef.current)) {
        showToast("Account changed before the backup could be restored.");
        return;
      }
      const stillAvailable = quizSession.canReplace(owner);
      if (stillAvailable.ok === false) { showToast(stillAvailable.message); return; }
      // ACC-1: a backup's settings are restored with its progress, stamped now so they
      // win over the cloud copy. A backup without settings keeps this device's current ones.
      const backupPreferences = sanitizeEnvelope((parsed?.stats ?? parsed)?.preferences);
      if (backupPreferences) {
        const restoredPreferences: SyncedPreferences = {
          values: completePreferences(backupPreferences.values, preferenceSnapshotRef.current),
          updatedAt: Date.now(),
        };
        importedStats.preferences = restoredPreferences;
      } else if (statsRef.current.preferences) {
        importedStats.preferences = statsRef.current.preferences;
      }
      const account = progressIdentity.current.account;
      const binding: StatsBinding = { owner, ...(account ? { backupUpload: quizDeviceId() } : {}) };
      const saved = quizBrowserStorage.replaceFromBackup(importedStats, binding);
      if (saved.ok === false) { showToast(saved.message); return; }
      duel.forget();
      quizSession.detach(owner, true);
      quizBridge.cancel(true);
      quizBridge.observeDeviceStats(importedStats);
      adoptBinding(binding);
      localReadableRef.current = true;
      setLocalProgressReadable(true);
      setStats(importedStats);
      replaceCards(importedStats.srsCards);
      if (backupPreferences && importedStats.preferences) {
        const restored = importedStats.preferences;
        const incoming = completePreferences(restored.values, preferenceSnapshotRef.current);
        preferenceSnapshotRef.current = incoming;
        lastSyncedPreferenceKeyRef.current = serializePreferences(incoming);
        writePreferencesEnvelope(restored);
        applyPreferenceValues(restored.values);
      }
      setCloudSyncReady(account);
      if (typeof parsed?.profileName === "string" && parsed.profileName.trim()) {
        localStorage.setItem("astra_profile_name", parsed.profileName.trim().slice(0, 24));
        // ACC-1: without this, the saved cloud profile would win after the reload and the restored name would be lost.
        markProfilePending({ name: true });
      }
      showToast("Progress restored. Reloading...");
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      showToast(replacementEpoch !== undefined && error instanceof Error
        ? error.message : "Upload failed. Please choose a valid Astra progress JSON file.");
    } finally {
      if (replacementEpoch !== undefined) finishProgressChange(replacementEpoch);
    }
  };

  // Toast dynamic popups — clear previous timeout before setting new one to prevent races
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
      toastTimeoutRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
      setAvailableJapaneseVoices(voices);
      // Voice lists are browser/OS-provided and often load asynchronously. Keep
      // the saved preference until a populated list is available, then restore by
      // URI first and by name as a fallback when a browser changes the URI.
      if (voices.length > 0) {
        const savedURI = localStorage.getItem("astra_japanese_voice_uri") || "";
        const savedName = localStorage.getItem("astra_japanese_voice_name") || "";
        const matchingVoice = voices.find((voice) => voice.voiceURI === savedURI)
          ?? voices.find((voice) => voice.name === savedName);
        if (matchingVoice) {
          setSelectedJapaneseVoiceURI(matchingVoice.voiceURI);
          localStorage.setItem("astra_japanese_voice_uri", matchingVoice.voiceURI);
          localStorage.setItem("astra_japanese_voice_name", matchingVoice.name);
        } else if (savedURI) {
          // The saved voice is unavailable in this browser. Use its default
          // without deleting the preference, so a later voiceschanged event can
          // restore it if the voice becomes available.
          setSelectedJapaneseVoiceURI("");
        }
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const handleSelectJapaneseVoice = (voiceURI: string) => {
    setSelectedJapaneseVoiceURI(voiceURI);
    if (voiceURI) {
      localStorage.setItem("astra_japanese_voice_uri", voiceURI);
      const selectedVoice = availableJapaneseVoices.find((voice) => voice.voiceURI === voiceURI);
      if (selectedVoice) localStorage.setItem("astra_japanese_voice_name", selectedVoice.name);
      showToast("Japanese voice saved.");
    } else {
      localStorage.removeItem("astra_japanese_voice_uri");
      localStorage.removeItem("astra_japanese_voice_name");
      showToast("Using the default Japanese voice.");
    }
  };

  const handleSelectSpeechVoiceMode = (mode: "browser" | "cloud") => {
    setSpeechVoiceMode(mode);
    localStorage.setItem("astra_speech_voice_mode", mode);
    cloudFallbackNoticeRef.current = false;
    showToast(mode === "cloud" ? "Gemini Japanese voices selected." : "Browser voices selected.");
  };

  const handleSelectCloudVoice = (voiceId: string) => {
    const voice = getCloudJapaneseVoice(voiceId);
    if (!voice) return;
    setSelectedCloudVoiceId(voice.id);
    localStorage.setItem("astra_cloud_voice_id", voice.id);
    showToast(`${voice.label} Gemini voice saved.`);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // ACC-1: the image is cropped to a small square and re-encoded, so any normal
    // photo works and what reaches the cloud is a few KB instead of up to ~1 MB.
    let value = "";
    try {
      value = await compressAvatarFile(file);
    } catch (err: any) {
      showToast(err?.message || "Avatar upload failed.");
      return;
    }
    if (!value) {
      showToast("Avatar upload failed.");
      return;
    }
    try {
      localStorage.setItem("astra_profile_avatar", value);
    } catch { /* storage full: the avatar still shows this session */ }
    setProfileAvatar(value);
    const synced = await publishAvatarChange(value);
    showToast(synced ? "Avatar updated." : "Avatar saved on this device. It will sync when you are back online.");
  };

  const handleRemoveAvatar = async () => {
    localStorage.removeItem("astra_profile_avatar");
    setProfileAvatar("");
    const synced = await publishAvatarChange("");
    showToast(synced ? "Avatar removed." : "Avatar removed on this device. It will sync when you are back online.");
  };

  const getFriendCode = () => {
    const uid = myUid || currentUid();
    return uid || "";
  };

  const speakWithBrowserVoice = (phrase: string, onEnd?: () => void) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      if (onEnd) { utterance.onend = onEnd; utterance.onerror = onEnd; }
      utterance.lang = "ja-JP";
      utterance.rate = 0.8;
      const selectedVoice = availableJapaneseVoices.find((voice) => voice.voiceURI === selectedJapaneseVoiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
    } else {
      onEnd?.();
      showToast("Sound synthesis is not supported on this device.");
    }
  };

  const speakWithCloudVoice = async (phrase: string, onEnd?: () => void) => {
    const requestId = ++cloudSpeechRequestRef.current;
    window.speechSynthesis?.cancel();
    cloudAudioRef.current?.pause();

    const cacheKey = `${selectedCloudVoiceId}|${phrase}|0.8`;
    try {
      let audioUrl = cloudAudioCacheRef.current.get(cacheKey);
      if (!audioUrl) {
        const response = await fetch("/api/synthesize-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: phrase,
            voiceId: selectedCloudVoiceId,
            speakingRate: 0.8,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.audioContent) {
          throw new Error(payload.error || "Gemini voice request failed.");
        }
        audioUrl = `data:${payload.mimeType || "audio/wav"};base64,${payload.audioContent}`;
        cloudAudioCacheRef.current.set(cacheKey, audioUrl);
      }

      if (requestId !== cloudSpeechRequestRef.current) return;
      const audio = new Audio(audioUrl);
      if (onEnd) { audio.onended = onEnd; audio.onerror = onEnd; }
      cloudAudioRef.current = audio;
      await audio.play();
    } catch (error) {
      if (requestId !== cloudSpeechRequestRef.current) return;
      console.warn("Gemini Japanese voice unavailable; using browser fallback.", error);
      if (!cloudFallbackNoticeRef.current) {
        cloudFallbackNoticeRef.current = true;
        showToast("Gemini voice unavailable. Using your browser voice instead.");
      }
      speakWithBrowserVoice(phrase, onEnd);
    }
  };

  // Uses the selected Gemini voice when requested, with the browser voice
  // engine as a free/offline fallback.
  const speakJapanese = (phrase: string, onEnd?: () => void) => {
    if (speechVoiceMode === "cloud") {
      void speakWithCloudVoice(phrase, onEnd);
    } else {
      cloudSpeechRequestRef.current += 1;
      cloudAudioRef.current?.pause();
      speakWithBrowserVoice(phrase, onEnd);
    }
  };

  // Controls study streak daily tick updates
  // FIX: All reads use functional prev to prevent stale-closure XP loss
  const awardXPAndIncrementAttempt = (wasCorrect: boolean, xpEarned: number) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const todayStr = day.toLocaleDateString("en-CA");
    const characterName = "unknown"; // Grammar uses the existing generic attempt bucket.

    setStats((prev) => {
      const existing = prev.studyDates || [];
      const updatedStudyDates = existing.includes(todayStr)
        ? existing
        : [...existing, todayStr];
      const studySet = new Set(updatedStudyDates);

      let currentStreak = 0;
      const cursor = new Date(day);
      while (studySet.has(cursor.toLocaleDateString("en-CA"))) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      const currentProg = prev.characterProgress[characterName] || { correct: 0, total: 0 };
      const updatedProg = {
        correct: currentProg.correct + (wasCorrect ? 1 : 0),
        total: currentProg.total + 1,
      };

      const updated: StudentStats = {
        ...prev,
        xp: prev.xp + (wasCorrect ? xpEarned : 0),
        streakCount: currentStreak,
        lastActiveDate: todayStr,
        correctCount: prev.correctCount + (wasCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
        characterProgress: {
          ...prev.characterProgress,
          [characterName]: updatedProg,
        },
        studyDates: updatedStudyDates,
      };

      return updated;
    });
  };

  // Navigations between Daily Kanji scripture scrolls
  const handleKanjiNav = (dir: "prev" | "next") => {
    let target = currentKanjiIndex;
    if (dir === "prev") {
      target = currentKanjiIndex - 1 < 0 ? KANJI_DATA.length - 1 : currentKanjiIndex - 1;
    } else {
      target = currentKanjiIndex + 1 >= KANJI_DATA.length ? 0 : currentKanjiIndex + 1;
    }
    setCurrentKanjiIndex(target);
    setMascotMood("kanji");
    speakJapanese(KANJI_DATA[target].kanji);
    // Phase A5 verifier fix: DrawingCanvas now clears its ink whenever the kanji changes;
    // clear the matching AI-feedback state here too, or Review mode would show a blank
    // canvas next to the *previous* kanji's score and advice. Doesn't touch isAnalyzing —
    // an in-flight request settling after navigation is a separate, pre-existing edge case.
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const handleContemplateKanji = () => {
  const activeKanji = KANJI_DATA[currentKanjiIndex].kanji;

  // C1: +40 XP once per kanji, ever. The durable record is characterProgress[kanji].total: > 0 is already the app's
  // "studied" marker (it builds the Kanji Quiz "Studied" pool). Read from statsRef so the toast and chime match the
  // outcome. A re-tap changes nothing: no XP, progress, study date, streak or blob write.
  const alreadyStudied = (statsRef.current.characterProgress?.[activeKanji]?.total || 0) > 0;
  if (alreadyStudied) {
    showToast(`You've already studied "${activeKanji}". Practise it in the Kanji Quiz or add it to your Review Deck.`);
    return;
  }
  // Same-tick double tap only (the first tap's state is still being applied). It is released straight after, so a
  // kanji whose progress is later replaced by a cloud hydrate can be earned again instead of staying blocked.
  if (sessionStudiedKanji.has(activeKanji)) return;
  sessionStudiedKanji.add(activeKanji);
  window.setTimeout(() => sessionStudiedKanji.delete(activeKanji), 0);

  // FIX: Update both XP and characterProgress so Kanji Quiz "Studied" pool works
  const studyDay = new Date();
  studyDay.setHours(0, 0, 0, 0);
  setStats((prev) => {
    const prevProg = prev.characterProgress[activeKanji] || { correct: 0, total: 0 };
    // C1: re-check against the state this updater really sees, so a hydrate race or a double invocation never pays twice.
    if (prevProg.total > 0) return prev;

    // Record today's study date and recompute the streak the same way the kana
    // quiz XP path does — without this, kanji study earns XP but silently
    // doesn't count toward the streak until the next full page reload.
    const todayStr = studyDay.toLocaleDateString("en-CA");
    const existingDates = prev.studyDates || [];
    const updatedStudyDates = existingDates.includes(todayStr)
      ? existingDates
      : [...existingDates, todayStr];
    const studySet = new Set(updatedStudyDates);
    let currentStreak = 0;
    const cursor = new Date(studyDay);
    while (studySet.has(cursor.toLocaleDateString("en-CA"))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const updated = {
      ...prev,
      xp: prev.xp + 40,
      streakCount: currentStreak,
      lastActiveDate: todayStr,
      studyDates: updatedStudyDates,
      characterProgress: {
        ...prev.characterProgress,
        [activeKanji]: {
          correct: prevProg.correct + 1,
          total: prevProg.total + 1,
        },
      },
    };
    return updated;
  });
  playChime(true);
  showToast(`+40 XP for studying "${activeKanji}"!`);
  };

  // Submit Canvas drawing to Astra-chan for Kanji accuracy assessment
  const handleEvaluateKanjiDrawing = async () => {
    const canvas = document.getElementById("practice-drawing-canvas") as HTMLCanvasElement;
    if (!canvas) {
      showToast("Could not find active drawing canvas workspace.");
      return;
    }

    // Convert Canvas to Base64 image
    const dataUrl = canvas.toDataURL("image/png");

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const targetKanjiObj = KANJI_DATA[currentKanjiIndex];

    // Never wait forever: the server stops trying after ~34 s (maxDuration is 40 s),
    // so 45 s here only matters if the connection itself hangs.
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), 45_000);
    const slowMessage = "Astra's AI checker took too long to answer. Please try again in a moment.";

    try {
      const response = await fetch("/api/analyze-kanji", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kanji: targetKanjiObj.kanji,
          meaning: targetKanjiObj.meaning,
          imageData: dataUrl,
        }),
        signal: controller.signal,
      });

      // If Vercel stops the function it answers with plain text, not JSON, so
      // read the body as text first instead of calling response.json() blindly.
      const rawBody = await response.text();
      let data: any = null;
      try {
        data = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        data = null;
      }

      if (!data) {
        throw new Error(slowMessage);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze your strokes.");
      }

      const score = Number.isFinite(Number(data.score))
        ? Math.max(0, Math.min(100, Math.round(Number(data.score))))
        : 0;
      const validDrawing = data.validDrawing === true;
      const normalizedResult = { ...data, score: validDrawing ? score : 0, validDrawing };
      setAnalysisResult(normalizedResult);

      if (!validDrawing) {
        setMascotMood("idle");
        showToast(`0% — ${normalizedResult.feedbackTitle || "Astra needs real ink strokes"}. No practice XP this time.`);
        return;
      }

      // Award XP increments depending on accuracy milestones
      let earnedXp = 10;
      if (score >= 85) {
        earnedXp = 40;
        setMascotMood("success");
        playChime(true);
        showToast(`Perfect! Astra-chan graded ${score}%: ${normalizedResult.feedbackTitle}. +40 XP awarded!`);
      } else if (score >= 70) {
        earnedXp = 25;
        setMascotMood("success");
        playChime(true);
        showToast(`Great! Astra-chan graded ${score}%: ${normalizedResult.feedbackTitle}. +25 XP awarded!`);
      } else if (score >= 50) {
        earnedXp = 15;
        setMascotMood("idle");
        showToast(`Good try! Astra-chan graded ${score}%: ${normalizedResult.feedbackTitle}. +15 XP awarded!`);
      } else {
        earnedXp = 10;
        setMascotMood("failure");
        showToast(`Keep tracing! Astra-chan graded ${score}%: ${normalizedResult.feedbackTitle}. +10 XP practice points!`);
      }

      // FIX: Use functional update to prevent stale-closure XP loss
      setStats((prev) => {
        const updated = { ...prev, xp: prev.xp + earnedXp };
        return updated;
      });

    } catch (err: any) {
      console.error(err);
      setAnalysisError(
        err?.name === "AbortError"
          ? slowMessage
          : err.message || "Astra-chan couldn't reach her calligraphy scrolls. Check her secret energy talisman key!"
      );
      setMascotMood("failure");
    } finally {
      window.clearTimeout(abortTimer);
      setIsAnalyzing(false);
    }
  };

  // Toggle vocabulary word completion states +5 XP garden boost
  const handleToggleVocabularyLearned = (word: string) => {
    // FIX: Use functional state update to avoid stale-closure XP loss
    setStats((prev) => {
      const isLearned = !!prev.vocabularyProgress[word];
      const newProgress = { ...prev.vocabularyProgress };
      let xpGain = 0;

      if (!isLearned) {
        newProgress[word] = true;
        xpGain = 5;
      } else {
        delete newProgress[word];
      }

      const updated = {
        ...prev,
        xp: prev.xp + xpGain,
        vocabularyProgress: newProgress,
      };
      return updated;
    });

    // Show toast outside the functional update so it reflects the action
    const wasLearned = !!stats.vocabularyProgress[word];
    if (!wasLearned) {
      showToast(`Mastered word "${word}". +5 XP Garden Reward!`);
      playChime(true);
    } else {
      showToast(`Returned "${word}" to the study lists.`);
    }
  };

  // Pool of interactive wisdom and cultural advice that Astra-chan speaks on clicks
  const MASCOT_TRIVIA = [
    "Did you know? Hiragana characters evolved from 'Man'yogana' - ancient Chinese Kanji simplified down into quick calligraphy brush pen letters by imperial court women!",
    "Practice tip: Tracing characters using a dynamic grid aligns your visual logic with proper Japanese aesthetic grids. Think of every symbol sitting inside a round stone!",
    "Kana fact: 'Hiragana' actually means 'smooth' or 'ordinary' kana. It is paired with 'Katakana' which translates to 'fragmented' or 'partial' kana!",
    "Linguistic secret: The character 'ん' (n) is the only native Japanese consonant that doesn't hook directly with a vowel sound. It is a solo dancer in poetry!",
    "Study tip: N5 covers about 145 Kanji and 300–500 everyday words. A little practice daily adds up fast!",
    "Cultural whisper: When studying, try sipping green tea (お茶 - o-cha). The dynamic L-Theanine sparks high alpha-waves inside the brain, boosting focus and memory retention!",
    "Drawing tip: Drawing stroke directions always travel from Top-to-Bottom and Left-to-Right. Try it out on the trace board!"
  ];

  // FIX: Track mascot timeout to prevent rapid-click stacking
  const mascotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStudiedKanji = useRef<Set<string>>(new Set()).current;

  // ── Idle / AFK detection refs ──────────────────────────────────────────────
  const lastInteractionRef = useRef<number>(Date.now());
  const idleIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const excitedTimeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  // Stores the mood that was active before going idle, so we can restore it on return
  const prevMoodRef        = useRef<typeof mascotMood>("welcome");
  // Stable refs so the effect below never needs to re-run due to state changes
  const mascotMoodRef      = useRef(mascotMood);
  const currentScreenRef   = useRef(currentScreen);
  // Tracks the timestamp when the tab was hidden — setInterval is throttled in
  // background tabs, so visibilitychange is the reliable trigger instead
  const tabHiddenAtRef     = useRef<number | null>(null);

  useEffect(() => { mascotMoodRef.current = mascotMood; },    [mascotMood]);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  // Warm the deep-idle artwork during the 20-second wondering stage.
  useEffect(() => {
    if (mascotMood !== "wondering") return;
    const image = new Image();
    image.src = deepAfkImg;
  }, [mascotMood]);

  // Idle/AFK detection — runs once on mount, reads everything via refs
  useEffect(() => {
    const QUIZ_SCREENS = ["quiz", "kanji-quiz", "vocab-quiz", "review-deck"];

    // Helper: trigger "excited" return animation then restore prev mood
    const triggerExcitedReturn = () => {
      if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current);
      mascotMoodRef.current = "excited";
      setMascotMood("excited");
      excitedTimeoutRef.current = setTimeout(() => {
        // Do not overwrite a newer screen-specific reaction.
        if (mascotMoodRef.current === "excited") {
          mascotMoodRef.current = prevMoodRef.current;
          setMascotMood(prevMoodRef.current);
        }
        excitedTimeoutRef.current = null;
      }, 4000);
    };

    // Helper: apply idle mood based on elapsed ms (shared by interval + visibilitychange)
    const applyIdleMood = (elapsed: number) => {
      if (QUIZ_SCREENS.includes(currentScreenRef.current)) return;
      const curMood = mascotMoodRef.current;

      if (elapsed >= 35 * 1000) {
        // 35 seconds total → deep AFK (20 seconds after wondering)
        if (curMood !== "afk" && curMood !== "excited") {
          if (curMood !== "wondering") prevMoodRef.current = curMood;
          mascotMoodRef.current = "afk";
          setMascotMood("afk");
        }
      } else if (elapsed >= 15 * 1000) {
        // 15 seconds → wondering
        if (curMood !== "wondering" && curMood !== "afk" && curMood !== "excited") {
          prevMoodRef.current = curMood;
          mascotMoodRef.current = "wondering";
          setMascotMood("wondering");
        }
      }
    };

    const handleInteraction = () => {
      lastInteractionRef.current = Date.now();
      const curMood = mascotMoodRef.current;
      // Only react if user was actually in an idle state
      if (curMood === "wondering" || curMood === "afk") {
        triggerExcitedReturn();
      }
    };

    // visibilitychange is the only reliable trigger for background tabs —
    // browsers throttle or freeze setInterval when the tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab going to background: record the moment
        tabHiddenAtRef.current = Date.now();
      } else {
        // Tab coming back into focus
        const hiddenAt = tabHiddenAtRef.current;
        tabHiddenAtRef.current = null;

        if (hiddenAt !== null) {
          const elapsed = Date.now() - hiddenAt;
          const curMood = mascotMoodRef.current;

          if (curMood === "wondering" || curMood === "afk") {
            // Already idle before they switched away — greet them back
            triggerExcitedReturn();
          } else {
            // Apply whichever idle tier matches how long they were gone
            applyIdleMood(elapsed);
          }
        }

        // Reset so the interval doesn't immediately fire again after return
        lastInteractionRef.current = Date.now();
      }
    };

    window.addEventListener("keydown",    handleInteraction);
    window.addEventListener("click",      handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Interval still handles the case where the user is on the page but just not touching anything
    idleIntervalRef.current = setInterval(() => {
      applyIdleMood(Date.now() - lastInteractionRef.current);
    }, 1_000); // check often enough to reach the 15s and 35s thresholds

    return () => {
      window.removeEventListener("keydown",    handleInteraction);
      window.removeEventListener("click",      handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleIntervalRef.current)   clearInterval(idleIntervalRef.current);
      if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current);
    };
  }, []); // intentionally empty — all live values read through refs

  const handleMascotClick = () => {
    const isReadingRoom = currentScreenRef.current === "reading-room";
    const readingLines = [
      "Ah, I was almost zoning out. Did you need me?",
      "Oh, you caught me looking at the same sentence again. Shall we read it together?",
      "Hmm? I am here. Was there a word that looked mysterious?",
      "I was quietly following along. What part shall we explore next?",
      "Ah, a little study companion check-in. You are doing wonderfully.",
      "Did you find a tricky expression? We can keep it safe for your review deck.",
      "I was just wondering what this sentence means too. Let us investigate it together.",
      "You called? I have my place in the book. Shall we continue from here?",
    ];
    const lines = isReadingRoom ? readingLines : MASCOT_TRIVIA;
    const randomIndex = Math.floor(Math.random() * lines.length);
    const selectedText = lines[randomIndex];
    setMascotSpeechOverride(selectedText);
    setMascotMood("clicked");
    playChime(true);
    showToast(isReadingRoom ? "Astra-chan looks up from her book." : "Astra-chan responds to your call with native trivia!");

    // Reading reactions last longer, then return Astra to her book.
    if (mascotTimeoutRef.current) clearTimeout(mascotTimeoutRef.current);
    mascotTimeoutRef.current = setTimeout(() => {
      setMascotSpeechOverride(null);
      if (isReadingRoom && currentScreenRef.current === "reading-room") {
        setMascotMood("reading");
      }
      mascotTimeoutRef.current = null;
    }, isReadingRoom ? 15000 : 8500);
  };

  const openOnlineMultiplayer = () => {setShowProfilePanel(false);setCurrentScreen("online-multiplayer");};
  const returnToPracticeHub = () => {setShowStudyRoom(false);setActiveHubTab("practice");setCurrentScreen("menu");};

  // ── FRIEND SYSTEM FUNCTIONS ────────────────────────────────────────────────

  /**
   * ACC-1: bring this device's name/avatar in line with the account's cloud profile.
   *
   * This used to be the opposite: every start-up published whatever this device had
   * stored (default name, empty avatar on a fresh browser), overwriting the real
   * profile. Now the cloud profile is read FIRST and reconcileProfile() decides
   * (src/profileSync.ts); presence is updated separately and never touches
   * name or avatar.
   */
  const syncOwnProfile = async (uid: string, isCancelled: () => boolean = () => false) => {
    const local = readLocalProfile();
    const cloud = await getUserProfile(uid);
    if (isCancelled()) return;

    const decision = reconcileProfile(local, cloud);
    let avatar = decision.avatar;
    let publish = decision.publish;
    // Avatars uploaded before ACC-1 can be ~1 MB. Shrink them once and re-publish.
    if (avatar.length > AVATAR_RECOMPRESS_ABOVE_CHARS) {
      const smaller = await compressAvatarDataUrl(avatar);
      if (isCancelled()) return;
      if (smaller !== avatar) {
        avatar = smaller;
        publish = true;
      }
    }

    writeLocalProfile(decision.name, avatar);
    setProfileName(decision.name);
    setProfileNameInput(decision.name);
    setProfileAvatar(avatar);

    if (publish) {
      // ACC-1b: a placeholder-only profile is published unstamped (see reconcileProfile).
      await saveUserProfile(decision.name, avatar, { stamp: decision.stamp });
    } else {
      await markProfileOnline();
    }
    clearProfilePending();
  };

  /** syncOwnProfile that reports a failure instead of throwing, so a profile hiccup never breaks sign-in. */
  const syncOwnProfileSafe = async (uid: string, isCancelled?: () => boolean) => {
    try {
      await syncOwnProfile(uid, isCancelled);
    } catch (err: any) {
      if (!isCancelled?.()) setProfileError(err?.message || "Profile sync failed");
    }
  };

  /**
   * Publish an avatar change right away (it used to wait for the Save button, which
   * also carried the name). If it cannot reach the cloud, the change stays marked
   * pending and wins over the cloud copy on the next start. Returns true when synced.
   */
  const publishAvatarChange = async (nextAvatar: string): Promise<boolean> => {
    markProfilePending({ avatar: true });
    try {
      await ensureSignedIn();
      const savedName = readLocalProfile().name || profileName || DEFAULT_PROFILE_NAME;
      // ACC-1b: do not stamp the default name as authoritative just because the avatar changed.
      await saveUserProfile(savedName, nextAvatar, { stamp: shouldStampProfile(savedName) });
      clearProfilePending();
      return true;
    } catch {
      return false;
    }
  };

  /** Ensure Firebase identity exists and reconcile this player's profile with the cloud */
  useEffect(() => {
    let cancelled = false;
    ensureSignedIn()
      .then(async (user) => {
        if (cancelled) return;
        const savedName = localStorage.getItem("astra_profile_name") || "Astra Scholar";
        setMyUid(user.uid);
        setProfileName(savedName);
        setProfileNameInput(savedName);
        // ACC-1: read the account's cloud profile first; do not blindly publish local defaults.
        await syncOwnProfileSafe(user.uid, () => cancelled);
      })
      .catch((err: any) => {
        if (!cancelled) setProfileError(err.message || "Firebase sign-in failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Subscribe to friends and invites after auth is ready */
  useEffect(() => {
    if (!myUid) return;

    const unsubFriends = listenToFriends(setFriends);
    unsubscribeFriendsRef.current = unsubFriends;

    const unsubFriendRequests = listenToFriendRequests(setFriendRequests);
    unsubscribeFriendRequestsRef.current = unsubFriendRequests;

    const unsubInvites = listenToInvites(setIncomingInvites);
    unsubscribeInvitesRef.current = unsubInvites;

    const unsubInviteResponses = listenToInviteResponses(setInviteResponses);
    unsubscribeInviteResponsesRef.current = unsubInviteResponses;

    const unsubMatchHistory = listenToMatchHistory(setMatchHistory);
    unsubscribeMatchHistoryRef.current = unsubMatchHistory;

    return () => {
      if (unsubscribeFriendsRef.current) unsubscribeFriendsRef.current();
      if (unsubscribeFriendRequestsRef.current) unsubscribeFriendRequestsRef.current();
      if (unsubscribeInvitesRef.current) unsubscribeInvitesRef.current();
      if (unsubscribeInviteResponsesRef.current) unsubscribeInviteResponsesRef.current();
      if (unsubscribeMatchHistoryRef.current) unsubscribeMatchHistoryRef.current();
    };
  }, [myUid]);

  useEffect(() => {
    const previousIds = seenFriendRequestIdsRef.current;
    const currentIds = new Set(friendRequests.map((request) => request.id));
    const freshRequest = friendRequests.find((request) => !previousIds.has(request.id));

    if (friendRequestsLoadedRef.current && freshRequest) {
      showToast(`${freshRequest.fromName || "Astra Scholar"} sent you a friend request.`);
    }

    seenFriendRequestIdsRef.current = currentIds;
    friendRequestsLoadedRef.current = true;
  }, [friendRequests]);

  useEffect(() => {
    if (friends.length === 0 && friendRequests.length === 0) return;
    setPendingFriendRequestUids((current) => {
      if (current.size === 0) return current;
      const friendUidSet = new Set(friends.map((friend) => friend.uid));
      const requestUidSet = new Set(friendRequests.map((request) => request.fromUid));
      const next = new Set(Array.from(current).filter((uid) => !friendUidSet.has(uid) && !requestUidSet.has(uid)));
      return next.size === current.size ? current : next;
    });
  }, [friends, friendRequests]);

  useEffect(() => {
    if (inviteResponses.length === 0) return;
    setPendingInviteUids((current) => {
      if (current.size === 0) return current;
      const respondedUidSet = new Set(inviteResponses.map((response) => response.uid));
      const next = new Set(Array.from(current).filter((uid) => !respondedUidSet.has(uid)));
      return next.size === current.size ? current : next;
    });
  }, [inviteResponses]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await ensureSignedIn();
      const profile = await saveUserProfile(profileNameInput, profileAvatar);
      localStorage.setItem("astra_profile_name", profile.name);
      clearProfilePending();
      setProfileName(profile.name);
      setProfileNameInput(profile.name);
      setMyUid(profile.uid);
      showToast("Profile saved");
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const connectProgressAccount = async (connect: () => Promise<FirebaseUser>, success: string, failure: string) => {
    if (progressBusy.current) return;
    const epoch = beginProgressChange();
    setAccountBusy(true);
    setAccountError(null);
    try {
      const user = await connect();
      const loaded = await activateProgressIdentity(user, epoch);
      finishProgressChange(epoch);
      if (currentUid() === user.uid) {
        await syncOwnProfileSafe(user.uid);
        showToast(loaded ? success : "Signed in. Cloud progress is pending.");
      }
    } catch (err: any) {
      setAccountError(accountErrorMessage(err, failure));
    } finally {
      finishProgressChange(epoch);
      setAccountBusy(false);
    }
  };

  const handleCreateAccount = (email: string, password: string) =>
    connectProgressAccount(() => createOrLinkEmailAccount(email, password),
      "Astra account created. Progress sync is now active.", "Account creation failed");

  const handleSignInAccount = (email: string, password: string) =>
    connectProgressAccount(() => signInEmailAccount(email, password), "Signed in. Cloud progress loaded.", "Sign-in failed");

  const handleGoogleAccount = () =>
    connectProgressAccount(createOrLinkGoogleAccount,
      "Google account connected. Cloud progress sync is active.", "Google sign-in failed");

  const handleResetPassword = async (email: string) => {
    setAccountBusy(true);
    setAccountError(null);
    try {
      await sendPasswordReset(email);
      showToast("Password reset link sent. Check your email.");
    } catch (err: any) {
      setAccountError(accountErrorMessage(err, "Could not send the password reset email"));
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSignOutAccount = async () => {
    if (progressBusy.current) return;
    const epoch = beginProgressChange();
    setAccountBusy(true);
    setAccountError(null);
    try {
      await signOutAccount();
      await activateProgressIdentity(auth.currentUser, epoch);
      showToast("Signed out. This browser remains available offline.");
    } catch (err: any) {
      setAccountError(err.message || "Sign-out failed");
    } finally {
      finishProgressChange(epoch);
      setAccountBusy(false);
    }
  };

  const handleAddFriend = async () => {
    setIsAddingFriend(true);
    setAddFriendError(null);
    const targetUid = friendUidInput.trim();
    if (targetUid) {
      setPendingFriendRequestUids((current) => new Set(current).add(targetUid));
    }
    try {
      await ensureSignedIn();
      await addFriend(targetUid, profileName || profileNameInput || "Astra Scholar", profileAvatar);
      showToast(`Friend request sent!`);
      setFriendUidInput("");
      setFriendNameInput("");
    } catch (err: any) {
      if (targetUid) {
        setPendingFriendRequestUids((current) => {
          const next = new Set(current);
          next.delete(targetUid);
          return next;
        });
      }
      setAddFriendError(err.message || "Failed to add friend");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleSearchFriends = async () => {
    const term = friendSearchInput.trim();
    if (!term) {
      setFriendSearchResults([]);
      setFriendSearchError(null);
      return;
    }

    setIsSearchingFriends(true);
    setFriendSearchError(null);
    try {
      await ensureSignedIn();
      const results = await searchUserProfiles(term);
      setFriendSearchResults(results);
      if (results.length === 0) {
        setFriendSearchError("No scholars found.");
      }
    } catch (err: any) {
      setFriendSearchError(err.message || "Failed to search scholars");
    } finally {
      setIsSearchingFriends(false);
    }
  };

  const handleSendFriendRequestToSearchResult = async (profile: FriendSearchResult) => {
    setFriendSearchError(null);
    setPendingFriendRequestUids((current) => new Set(current).add(profile.uid));
    try {
      await ensureSignedIn();
      await addFriend(profile.uid, profileName || profileNameInput || "Astra Scholar", profileAvatar);
      showToast(`Friend request sent to ${profile.name || "scholar"}!`);
    } catch (err: any) {
      setPendingFriendRequestUids((current) => {
        const next = new Set(current);
        next.delete(profile.uid);
        return next;
      });
      setFriendSearchError(err.message || "Failed to send friend request");
    }
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request, profileName || profileNameInput || "Astra Scholar", profileAvatar);
      showToast(`${request.fromName || "Friend"} added!`);
    } catch (err: any) {
      showToast(err.message || "Failed to accept friend request");
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      showToast("Friend request dismissed");
    } catch (err: any) {
      showToast(err.message || "Failed to dismiss friend request");
    }
  };

  const handleSendFriendRequestToPlayer = async (playerUid: string | null | undefined, playerName?: string | null) => {
    if (!playerUid) return;
    setPendingFriendRequestUids((current) => new Set(current).add(playerUid));
    try {
      await ensureSignedIn();
      await addFriend(playerUid, profileName || profileNameInput || "Astra Scholar", profileAvatar);
      showToast(`Friend request sent to ${playerName || "player"}!`);
    } catch (err: any) {
      setPendingFriendRequestUids((current) => {
        const next = new Set(current);
        next.delete(playerUid);
        return next;
      });
      showToast(err.message || "Failed to send friend request");
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    try {
      await removeFriend(friendUid);
      showToast("Friend removed");
    } catch (err: any) {
      showToast(err.message || "Failed to remove friend");
    }
  };

  const handleInviteFriend = async (friendUid: string) => {
    if (!duel.code || duel.room?.guestId) {
      showToast("Create a room first to invite friends!");
      return "Open a room with an empty seat before inviting a friend.";
    }
    try {
      const myName = profileName || "Astra Scholar";
      setPendingInviteUids((current) => new Set(current).add(friendUid));
      await sendRoomInvite(friendUid, duel.code, myName);
      showToast("Invite sent!");
      return null;
    } catch (err: any) {
      setPendingInviteUids((current) => {
        const next = new Set(current);
        next.delete(friendUid);
        return next;
      });
      showToast(err.message || "Failed to send invite");
      return String(err.message || "Failed to send invite");
    }
  };

  const handleAcceptInvite = async (invite: RoomInvite) => {
    try {
      await ensureSignedIn();
      if(duel.room&&duel.room.status!=="finished"){showToast("Leave your current duel before accepting another invite.");return;}
      const name = profileName || profileNameInput || "Guest";
      setCurrentScreen("online-multiplayer");
      if(!await duel.join(invite.roomCode,name)){showToast("Could not join. Open Friendly duels for the connection details.");return;}
      await respondToRoomInvite(invite, "accepted");
      await clearInvite(invite.id);
      showToast(`Joined room ${invite.roomCode}!`);
    } catch (err: any) {
      showToast(err.message || "Failed to accept invite");
    }
  };

  const handleDismissInvite = async (inviteId: string) => {
    try {
      const invite = incomingInvites.find((item) => item.id === inviteId);
      if (invite) {
        await respondToRoomInvite(invite, "declined");
      } else {
        await clearInvite(inviteId);
      }
    } catch { /* silent */ }
  };

  const handleClearInviteResponse = async (friendUid: string) => {
    try {
      await clearInviteResponse(friendUid);
      return null;
    } catch (err) { return err instanceof Error ? err.message : "Could not dismiss the invitation response."; }
  };

  // ── END FRIEND SYSTEM FUNCTIONS ────────────────────────────────────────────

  // Level computation logic
  const getScholarRankTitle = (xp: number) => {
    if (xp >= 1500) return "Grand Archivist";
    if (xp >= 800) return "Shadow Decipherer";
    if (xp >= 300) return "Calligraphy Apprentice";
    if (xp >= 100) return "Hiragana Initiate";
    return "Silent Scribbler";
  };

  // ── Polish A1: floating sound + atmosphere dock ────────────────────────────
  // The dock (src/components/SoundAtmosphereDock.tsx) is presentational. State, the
  // audio element and every storage write stay in this component. One panel at a
  // time; it closes on a screen change.
  useEffect(() => {
    setDockPanel(null);
  }, [currentScreen]);

  // Quiz-type screens: Atmosphere is hidden and the Music launcher is small and faded (a tap still opens the Music panel).
  const dockQuiet =
    atelierScreen ||
    currentScreen === "vocab-quiz" ||
    currentScreen === "kanji-quiz" ||
    currentScreen === "online-multiplayer" ||
    currentScreen === "review-deck";

  const handleDockSelectTrack = (track: MusicTrackId, label: string) => {
    playClickTick();
    setSelectedMusicTrack(track);
    if (!isMusicPlaying) {
      setIsMusicPlaying(true);
      showToast(`Now playing: ${label}!`);
    } else {
      showToast(`Switched to: ${label}!`);
    }
  };

  const handleDockTogglePlay = () => {
    playClickTick();
    const next = !isMusicPlaying;
    setIsMusicPlaying(next);
    if (next) {
      const trackName = MUSIC_TRACKS.find((track) => track.id === selectedMusicTrack)?.toastName ?? "";
      showToast(`Now playing: ${trackName}`);
    } else {
      showToast("Music paused.");
    }
  };

  const handleDockSelectScene = (index: number, title: string) => {
    setActiveBgScene(index);
    // Remembered only for a scene picked by hand; the auto-cycle timer never writes this key.
    try {
      localStorage.setItem("astra_bg_scene", String(index));
    } catch (e) { }
    showToast(`Scene: ${title}`);
  };

  const handleDockToggleAutoCycle = () => {
    setAutoCycleBg(!autoCycleBg);
    showToast(autoCycleBg ? "Auto-cycle OFF" : "Auto-cycle ON (every 1m)");
  };

  const handleDockSetFont = (next: "digital" | "written") => {
    setFontStyle(next);
    showToast(next === "digital" ? "Digital font on!" : "Written font on!");
  };

  // The Record Player tile (MenuScreen) opens the dock's Music panel through this.
  const openDock = (panel: DockPanelId) => setDockPanel(panel);

  // Props for the extracted MenuScreen component (Phase 1 of the App.tsx split).
  const menuScreenProps = {
    setCurrentScreen,
    setCurrentKanjiIndex,
    openOnlineMultiplayer,
    showStudyRoom,
    setShowStudyRoom: (value: React.SetStateAction<boolean>) => {
      entranceRequest.current++; setEntrancePhase("idle"); setShowStudyRoom(value);
    },
    activeHubTab,
    setActiveHubTab: openPracticeEntrance,
    mascotMood,
    setMascotMood,
    openDock,
    sessionSummary,
    totalCount,
    getSessionQueue,
    setSrsQueue,
    setSrsQueueIndex,
    setSrsRevealed,
    subLearnTab,
    setSubLearnTab,
    archiveFilter,
    setArchiveFilter,
    selectedLearnChar,
    setSelectedLearnChar,
    speakJapanese,
    vocabsSearch,
    setVocabsSearch,
    vocabsCategory,
    setVocabsCategory,
    kanjiSearch,
    setKanjiSearch,
    stats,
    setStats,
    showToast,
    hasCard,
    addCard,
    selectedJapaneseVoiceURI,
    handleSelectJapaneseVoice,
    availableJapaneseVoices,
    autoPronounce,
    setAutoPronounce,
  };

  // Props for the extracted KanjiScrollScreen component (Phase 6 of the App.tsx split).
  const kanjiScrollScreenProps = {
    currentKanjiIndex,
    kanjiData: KANJI_DATA,
    isAnalyzing,
    analysisResult,
    analysisError,
    speakJapanese,
    setCurrentScreen,
    hasCard,
    addCard,
    showToast,
    handleKanjiNav,
    handleContemplateKanji,
    // C1: lets the Study button read "Studied ✓" for a kanji that has already paid its one-time XP.
    alreadyStudied: (stats.characterProgress?.[KANJI_DATA[currentKanjiIndex]?.kanji ?? ""]?.total || 0) > 0,
    handleEvaluateKanjiDrawing,
  };


  // Props for the extracted ProfileScreen component (Phase 7 of the App.tsx split).
  const profileScreenProps = {
    profileAvatarInputRef,
    progressUploadInputRef,
    profileAvatar,
    profileNameInput,
    setProfileNameInput,
    profileCharSet,
    setProfileCharSet,
    profileError,
    isSavingProfile,
    friendUidInput,
    setFriendUidInput,
    friendNameInput,
    setFriendNameInput,
    addFriendError,
    isAddingFriend,
    friends,
    friendRequests,
    matchHistory,
    friendSearchInput,
    setFriendSearchInput,
    friendSearchResults,
    friendSearchError,
    isSearchingFriends,
    pendingFriendRequestUids,
    myUid,
    calendarOpen,
    setCalendarOpen,
    badgesOpen,
    setBadgesOpen,
    calViewDate,
    setCalViewDate,
    archiveFilter,
    setArchiveFilter,
    stats,
    HIRAGANA_DATA,
    KATAKANA_DATA,
    KANJI_DATA,
    VOCABULARY_DATA,
    currentUid,
    getFriendCode,
    getScholarRankTitle,
    setCurrentScreen,
    showToast,
    speakJapanese,
    handleRemoveAvatar,
    handleSaveProfile,
    accountEmail,
    isAccountUser,
    accountBusy,
    accountError,
    clearAccountError: () => setAccountError(null),
    handleCreateAccount,
    handleSignInAccount,
    handleGoogleAccount,
    handleResetPassword,
    handleSignOutAccount,
    handleDownloadProgress,
    handleAddFriend,
    handleSearchFriends,
    handleSendFriendRequestToSearchResult,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    handleInviteFriend,
    handleRemoveFriend,
    language,
    setLanguage,
    theme,
    setTheme,
    quizAppearance: quizPreferences.quizAppearance,
    onQuizAppearanceChange: (id: QuizPreferences["quizAppearance"]) => setQuizPreferences(previous => ({...previous, quizAppearance:id})),
    bgAnimationType,
    setBgAnimationType,
    bgIntensity,
    setBgIntensity,
    bgBlur,
    setBgBlur,
    bgOpacity,
    setBgOpacity,
    fontStyle,
    setFontStyle,
    autoPronounce,
    setAutoPronounce,
    availableJapaneseVoices,
    selectedJapaneseVoiceURI,
    setSelectedJapaneseVoiceURI,
    speechVoiceMode,
    handleSelectSpeechVoiceMode,
    selectedCloudVoiceId,
    handleSelectCloudVoice,
    activeBgScene,
    setActiveBgScene,
  };

  // Props for the extracted ReviewDeckScreen component (Phase 8 of the App.tsx split).
  const reviewDeckScreenProps = {
    srsQueue,
    setSrsQueue,
    srsQueueIndex,
    setSrsQueueIndex,
    srsRevealed,
    setSrsRevealed,
    gradeCard,
    gradeRelearnCard,
    removeCard,
    putBackCard,
    rescheduleOverdueCards,
    trickyCards,
    awardSRSXP,
    playChime,
    setCurrentScreen,
    totalCount,
    getSessionQueue,
    sessionSummary,
    srsSettings: normalizeSrsSettings(stats.srsSettings),
    onChangeSrsSettings: updateSrsSettings,
    forecast,
  };

  const onlineMultiplayerScreenProps = {
    controller:duel,learning:duelLearning,onRepair:practiceDuelMisses,repairCount:duelRepair.count,repairUnavailable:duelRepair.unavailable??(quizSession.state.phase!=="idle"?"Resume or discard your saved solo practice before starting repair.":duelLearning.error?"Save your learning progress before starting repair.":undefined),catalogs:SOLO_CATALOGS,profileName,friends,inviteResponses,pendingInviteUids,
    onInvite:handleInviteFriend,onClearInvite:handleClearInviteResponse,onFriendRequest:handleSendFriendRequestToPlayer,
    onBack:returnToPracticeHub,autoNext:quizPreferences.quizAutoNext,
    onAutoNext:(quizAutoNext:boolean)=>setQuizPreferences(previous=>({...previous,quizAutoNext})),
    speechEnabled:quizCompanionSpeech,onSpeechChange:setQuizCompanionSpeech,
  };
  const practiceFlow = <QuizFlow home={atelierHome} onEnterSession={enterQuiz} onResume={openQuizResume}
            onStudyRoom={() => {cancelEntrance();setCurrentScreen("menu");}}
            onFriend={openOnlineMultiplayer}
            reviewDeck={{title:"Review Deck",detail:totalCount === 0 ? "No cards yet — add missed items after practice." : [formatSessionLine(sessionSummary) ?? "Done for today",formatWaitingLine(sessionSummary)].filter(Boolean).join(" · "),badge:sessionSummary.total ? `${sessionSummary.total} today` : totalCount ? "Done" : "0"}}
            reviewDue={sessionSummary.total} dailyNewCap={normalizeSrsSettings(stats.srsSettings).dailyNewCap}
            hasReviewCard={hasCard} onAddReviewCard={(key,type) => {
              if (!progressOwner || !isCurrentQuizOwner(progressOwner) || !quizReady || hasCard(key,type)) return false;
              addCard(key,type); return true;
            }}
            onOpenReviewDeck={() => {setSrsQueue(getSessionQueue());setSrsQueueIndex(0);setSrsRevealed(false);setCurrentScreen("review-deck");}}
            subject={atelierHome ? quizPreferences.quizSubject : soloRequestedSubject} learnedWords={learnedQuizWords} studiedKanji={studiedQuizKanji} speechEnabled={quizCompanionSpeech} onSpeechChange={setQuizCompanionSpeech} owner={progressOwner} controller={quizSession} ready={quizReady}
            unavailable={statsHydrated && cloudStatsHydrated && !progressChanging && !quizReady}
            launch={currentScreen === "results" ? "resume" : kanaLaunch} catalogs={SOLO_CATALOGS} history={quizHistory}
            preferences={quizPreferences} onPreferenceChange={patch => setQuizPreferences(previous => ({ ...previous, ...patch }))}
            onReadCustom={() => {
              if (!progressOwner || !isCurrentQuizOwner(progressOwner)) return [];
              const draft = quizBrowserStorage.readCustom(progressOwner);
              if (draft.ok === true) return draft.value.filter(id => isSoloCustomId(id, soloDraftSubject));
              showToast(draft.message);
              return [];
            }} onSaveCustom={ids => {
              if (!progressOwner || !isCurrentQuizOwner(progressOwner)) return;
              const prior = quizBrowserStorage.readCustom(progressOwner);
              if (prior.ok === false) { showToast(prior.message); return []; }
              const isCurrent = (id: string) => isSoloCustomId(id, soloDraftSubject);
              const draftSubject = soloDraftSubject;
              const merged = mergeSoloCustomDraft(prior.value, ids, draftSubject);
              const saved = quizBrowserStorage.writeCustom(progressOwner, merged.ids);
              if (saved.ok === false) { showToast(saved.message); return prior.value.filter(isCurrent); }
              if (merged.truncated) showToast("The shared custom draft holds 256 items. Your other subject's selection has been kept.");
              return merged.selected;
            }}
            previousBest={stats.survivalBestScore ?? 0} streak={stats.streakCount}
            cloudPending={isAccountUser && (quizCloudPending || !cloudSyncReady)}
            exampleFor={glyph => {
              const example = HIRAGANA_DATA.find(item => item.kana === glyph)?.examples?.[0]
                ?? KATAKANA_DATA.find(item => item.kana === glyph)?.examples?.[0];
              return example && { ja: example.japanese, reading: example.romaji, en: example.english };
            }}
            autoPronounce={autoPronounce} speak={speakJapanese} chime={playChime}
            onBack={leaveKanaPractice} onProfile={() => setCurrentScreen("profile")} />;

  // ──── RENDER ───────────────────────────────────────────────────────────────
  return (
    <AppearanceProvider theme={quizPreferences.quizAppearance} onChange={id => setQuizPreferences(previous => ({...previous, quizAppearance:id}))}>
    <div data-reading-room={readingRoomOpen || undefined} data-entrance={entrancePhase} className={atelierScreen ? "relative w-full bg-natural-bg" : `min-h-screen text-natural-charcoal font-sans flex flex-col justify-between py-2 px-4 relative bg-natural-bg transition-colors duration-300 ${entranceConnected ? "astra-app--journey" : "overflow-x-hidden"}`}>
      <input
        ref={progressUploadInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleProgressUpload}
        className="hidden"
      />
      <input
        ref={profileAvatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />
      {/* ===== FIXED MULTI-SCENE BACKGROUNDS (position:fixed prevents twitching on clicks) ===== */}
      {readingRoomOpen && <ReadingWindow activeScene={activeBgScene} choice={readingAppearance.readingWindow}
        transition={readingAppearance.readingTransition} blur={bgBlur} opacity={bgOpacity} />}
      {!atelierScreen && !readingRoomOpen && <>
      <motion.div className="astra-app-backdrop fixed inset-0 pointer-events-none select-none z-0 overflow-hidden" style={{ x: bgParallaxX, y: bgParallaxY, scale: 1.05 }}>
        {/* Scene 0 — Misty Sakura Path */}
        <div
          className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
          style={{
            opacity: activeBgScene === 0
              ? (bgOpacity === "very-dim" ? 0.08 : bgOpacity === "low" ? 0.22 : bgOpacity === "medium" ? 0.42 : 0.65)
              : 0,
            backgroundImage: `url(${bgMistySakura})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : "none",
          }}
        />
        {/* Scene 1 — Sakura Train */}
        <div
          className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
          style={{
            opacity: activeBgScene === 1
              ? (bgOpacity === "very-dim" ? 0.08 : bgOpacity === "low" ? 0.22 : bgOpacity === "medium" ? 0.42 : 0.65)
              : 0,
            backgroundImage: `url(${bgSakuraTrain})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : "none",
          }}
        />
        {/* Scene 2 — Night Sparkler */}
        <div
          className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
          style={{
            opacity: activeBgScene === 2
              ? (bgOpacity === "very-dim" ? 0.12 : bgOpacity === "low" ? 0.30 : bgOpacity === "medium" ? 0.55 : 0.80)
              : 0,
            backgroundImage: `url(${bgNightSparkler})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : "none",
          }}
        />
        {/* Scene 3 — Rainy Window Anime */}
        <div
          className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
          style={{
            opacity: activeBgScene === 3
              ? (bgOpacity === "very-dim" ? 0.10 : bgOpacity === "low" ? 0.25 : bgOpacity === "medium" ? 0.48 : 0.72)
              : 0,
            backgroundImage: `url(${bgRainyWindowAnime})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : "none",
          }}
        />
        {/* Constant base overlay (color toning) */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 35%, rgba(46,32,69,0.25) 0%, rgba(18,14,27,0.75) 100%)",
            opacity: 0.45,
          }}
        />
      </motion.div>

      </>}

      {/* Keep the fade host stable while the covered canvas stops its animation. */}
      {!atelierScreen && !readingRoomOpen && <div className="astra-app-atmosphere" aria-hidden="true">
        <AtmosphereCanvas
          animationType={bgAnimationType}
          intensity={bgIntensity}
          theme={theme}
          activeBgScene={activeBgScene}
          pausedRef={roomCoversViewportRef}
        />
      </div>}

      {entranceConnected && <div className="astra-entrance-tone" aria-hidden="true" />}

      {/* GUIDED TOUR (Polish B2). Root level, outside <main> and outside the layout wrapper's stacking context, so the
          ring and card sit above the dock (z-30 inside the wrapper) and below the character picker (z-40), the toast
          and the duel invites (z-50). The page stays tappable: only the card takes taps. */}
      <React.Fragment key={tourReplay ? `replay-${tourRunId}` : "live"}>
        <GuideTour
          enabled={tourVisible && entrancePhase === "idle"}
          replay={tourReplay}
          seen={stats.tips?.seen}
          isTransitioning={isTransitioning}
          onMarkSeen={markTipSeen}
          onSkipAll={skipAllTips}
          onReplayDone={() => setTourReplay(false)}
        />
      </React.Fragment>

      {/* Global Toast Notification (Polish C3: the container is a persistent polite live region,
          so a toast that appears inside it is announced; the toast itself is unchanged) */}
      <div role="status" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed inset-x-0 mx-auto w-fit pointer-events-none bottom-[min(calc(5rem+env(safe-area-inset-bottom,0px)+var(--toast-lift,0px)),calc(100dvh-4rem))] sm:bottom-6 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm leading-snug px-5 py-2.5 rounded-2xl border border-natural-clay/40 bg-natural-card text-natural-clay text-xs font-mono shadow-xl flex items-center gap-2"
              style={{ "--toast-lift": `${dockPanelHeight}px` }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 motion-safe:animate-spin text-natural-clay" />
              <span className="font-semibold">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Incoming Invites Dropdown */}
      <AnimatePresence>
        {!atelierScreen && incomingInvites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50 flex flex-col gap-2"
          >
            {incomingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-natural-card border border-natural-clay/40 p-3 rounded-2xl shadow-lg backdrop-blur flex items-center gap-3 max-w-xs"
              >
                <div className="p-2 bg-natural-clay/10 rounded-xl shrink-0">
                  <Mail className="w-4 h-4 text-natural-clay" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-serif font-bold text-natural-forest truncate">
                    {invite.fromName} invited you!
                  </p>
                  <p className="text-[10px] text-natural-forest-light font-mono truncate">
                    Room: {invite.roomCode}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptInvite(invite)}
                    className="p-1.5 bg-natural-forest text-natural-bg rounded-lg hover:bg-natural-forest/90 transition cursor-pointer"
                    title="Join Room"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissInvite(invite.id)}
                    className="p-1.5 bg-natural-bg border border-natural-border text-natural-forest-light rounded-lg hover:bg-natural-terracotta/10 hover:text-natural-terracotta transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>


      {/* MAIN LAYOUT WRAPPER */}
      <div className={atelierScreen ? "relative z-10 w-full" : `w-full ${(currentScreen === "charts" || currentScreen === "sandbox" || currentScreen === "grammar-dojo" || currentScreen === "reading-room") ? "max-w-5xl px-2 sm:px-4" : "max-w-4xl"} mx-auto flex-grow flex flex-col z-10 relative`} style={atelierScreen ? undefined : { paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}>

        {/* APP HEADER */}
        {!atelierScreen && !readingRoomOpen && <header className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-b border-natural-border/60 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-natural-border rounded-xl bg-natural-card shadow-sm">
              <span className="text-xl font-bold font-serif text-natural-forest tracking-wider">あ</span>
            </div>
            <div>
              <p className="text-xl font-serif tracking-widest text-natural-forest font-extrabold flex items-center gap-1.5 leading-none">
                Astra-chan

              </p>
              <span className="text-[10px] text-natural-forest-light font-mono tracking-widest uppercase font-semibold">
                Learn Japanese · Hiragana &amp; Kanji
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive dynamic Candle streak indicator */}
            <div className="flex items-center gap-3 text-sm font-mono">

              {/* Candle flame container */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-natural-card border border-natural-border rounded-full shadow-sm"
                title={stats.streakCount > 0 ? `${stats.streakCount} days active!` : "No streak started"}
              >
                <div className="relative w-4 h-6">
                  {/* Candle Wax stem */}
                  <div className={`absolute bottom-0 left-1.5 w-1 h-3 rounded-t ${stats.streakCount > 0 ? "bg-natural-clay" : "bg-natural-border"}`} />
                  {/* Lit flame with glowing animation or cold state */}
                  {stats.streakCount > 0 ? (
                    <motion.div
                      animate={prefersReducedMotion ? { scale: 1, rotate: 0 } : {
                        scale: [1, 1.2, 0.95, 1.15, 1],
                        rotate: [-3, 3, -1, 2, -3],
                      }}
                      transition={prefersReducedMotion ? { duration: 0 } : {
                        repeat: Infinity,
                        duration: 1.8,
                        ease: "easeInOut",
                      }}
                      className="absolute -top-1 left-0.5 w-3 h-4 rounded-full bg-gradient-to-t from-natural-terracotta via-natural-clay to-amber-150 shadow-[0_0_10px_rgba(202,94,75,0.5)]"
                    />
                  ) : (
                    <div className="absolute top-1 left-1.5 w-1 h-1.5 bg-natural-forest-light/30 rounded-full" title="No flame lit yet" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-natural-clay">
                  {stats.streakCount} day streak
                </span>
              </div>

              <div className="px-3 py-1.5 bg-natural-card border border-natural-border rounded-full shadow-sm">
                <span className="text-[11px] font-semibold text-natural-forest-light">
                  {stats.xp} XP
                </span>
              </div>
            </div>

            {/* Account shortcut — visible outside the Profile panel */}
            <button
              type="button"
              onClick={() => {
                setCurrentScreen("profile");
                setShowProfilePanel(false);
                playClickTick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition cursor-pointer ${isAccountUser
                ? "bg-natural-forest/10 border-natural-forest/35 text-natural-forest"
                : "bg-natural-clay/10 border-natural-clay/45 text-natural-clay hover:bg-natural-clay/20"
                }`}
              title={isAccountUser ? "Account sync is active" : "Sign in or create an Astra account"}
            >
              {isAccountUser ? <Cloud className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-bold font-mono hidden sm:inline">{isAccountUser ? "Synced" : "Sign in"}</span>
            </button>

            {/* Profile & Friends Corner Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfilePanel(!showProfilePanel);
                  playClickTick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition cursor-pointer ${showProfilePanel
                  ? "bg-natural-forest text-natural-bg border-natural-forest"
                  : "bg-natural-card border-natural-border hover:border-natural-forest text-natural-forest"
                  }`}
                title="Profile & Friends"
              >
                {profileAvatar ? (
                  <img src={profileAvatar} alt="" className="w-4 h-4 rounded-full object-cover border border-natural-bg/60" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px] font-bold font-mono hidden sm:inline">Profile</span>
                {(incomingInvites.length + friendRequests.length) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-natural-terracotta text-natural-bg rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {incomingInvites.length + friendRequests.length}
                  </span>
                )}
              </button>

              {/* Profile Dropdown Panel */}
              <AnimatePresence>
                {showProfilePanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-natural-card border border-natural-border/70 rounded-2xl shadow-xl backdrop-blur z-50 overflow-hidden"
                  >
                    {/* Profile Header */}
                    <div className="p-4 border-b border-natural-border/50 bg-natural-forest/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => profileAvatarInputRef.current?.click()}
                            className="w-11 h-11 rounded-full bg-natural-bg border border-natural-border overflow-hidden flex items-center justify-center text-natural-forest hover:border-natural-forest transition cursor-pointer shrink-0"
                            title="Upload avatar"
                          >
                            {profileAvatar ? (
                              <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <h4 className="font-serif font-extrabold text-natural-forest text-sm truncate">{profileNameInput || "My Progress"}</h4>
                            <p className="text-[10px] text-natural-forest-light font-mono truncate">{getScholarRankTitle(stats.xp)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowProfilePanel(false)}
                          className="p-1 rounded-lg hover:bg-natural-bg transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5 text-natural-forest-light" />
                        </button>
                      </div>
                      <div className="mt-3 p-2.5 bg-natural-bg border border-natural-border/70 rounded-xl space-y-2">
                        <label className="text-[9px] font-mono text-natural-forest-light uppercase tracking-wider font-bold block">
                          Display Name
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={profileNameInput}
                            onChange={(e) => setProfileNameInput(e.target.value)}
                            maxLength={24}
                            className="flex-1 px-2.5 py-1.5 bg-natural-card border border-natural-border rounded-lg text-[11px] font-mono text-natural-charcoal outline-none focus:border-natural-forest"
                          />
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile || !profileNameInput.trim()}
                            className="px-2.5 py-1.5 bg-natural-forest text-natural-bg rounded-lg text-[11px] font-bold transition hover:bg-natural-forest/90 disabled:opacity-40 cursor-pointer"
                          >
                            {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 text-[9px] text-natural-forest-light font-mono truncate">
                            Friend code: {getFriendCode() || "Signing in..."}
                          </p>
                          {(myUid || currentUid()) && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(getFriendCode()).catch(() => showToast("Copy failed!"));
                                showToast("Friend code copied");
                              }}
                              className="p-1 rounded-lg hover:bg-natural-forest/10 text-natural-forest transition cursor-pointer"
                              title="Copy friend code"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {profileAvatar && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="text-[10px] font-bold text-natural-forest-light hover:text-natural-terracotta transition cursor-pointer"
                          >
                            Remove avatar
                          </button>
                        )}
                        {profileError && <p className="text-[10px] text-natural-terracotta font-medium">{profileError}</p>}
                      </div>
                      {/* Mini XP Progress Bar */}
                      <div className="mt-2 w-full bg-natural-bg h-2 rounded-full overflow-hidden border border-natural-border/50">
                        <div
                          className="h-full bg-gradient-to-r from-natural-forest to-natural-clay transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (stats.xp / 1500) * 100)}%`
                          }}
                        />
                      </div>
                      <p className="text-[9px] text-natural-forest-light font-mono mt-1">{stats.xp} / 1500 XP</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadProgress}
                          className="px-2.5 py-1.5 bg-natural-card border border-natural-border rounded-lg text-[11px] font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => progressUploadInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-natural-card border border-natural-border rounded-lg text-[11px] font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={replayGuidedTour}
                        className="mt-2 w-full px-2.5 py-1.5 bg-natural-card border border-natural-border rounded-lg text-[11px] font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        Replay guided tour
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 border-b border-natural-border/50">
                      <div className="text-center p-2 bg-natural-bg rounded-xl">
                        <span className="block text-natural-forest font-mono font-extrabold text-lg">{stats.xp}</span>
                        <span className="text-[9px] text-natural-forest-light font-mono uppercase font-bold">XP</span>
                      </div>
                      <div className="text-center p-2 bg-natural-bg rounded-xl">
                        <span className="block text-natural-terracotta font-mono font-extrabold text-lg flex items-center justify-center gap-0.5">
                          <Flame className="w-3.5 h-3.5 fill-current" />
                          {stats.streakCount}
                        </span>
                        <span className="text-[9px] text-natural-forest-light font-mono uppercase font-bold">Streak</span>
                      </div>
                      <div className="text-center p-2 bg-natural-bg rounded-xl">
                        <span className="block text-natural-clay font-mono font-extrabold text-lg">
                          {stats.totalAttempts > 0 ? `${Math.round((stats.correctCount / stats.totalAttempts) * 100)}%` : "—"}
                        </span>
                        <span className="text-[9px] text-natural-forest-light font-mono uppercase font-bold">Accuracy</span>
                      </div>
                    </div>

                    {/* Full Profile Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentScreen("profile");
                        setShowProfilePanel(false);
                      }}
                      className="w-full p-2.5 text-xs font-serif font-bold text-natural-forest hover:bg-natural-forest/5 transition text-center border-b border-natural-border/50 cursor-pointer"
                    >
                      View Full Profile →
                    </button>

                    {/* Friends Section Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowFriendsSection(!showFriendsSection)}
                      className="w-full p-3 flex items-center justify-between text-xs font-serif font-bold text-natural-forest hover:bg-natural-forest/5 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5" />
                        Friends ({friends.length}{friendRequests.length > 0 ? ` · ${friendRequests.length} request${friendRequests.length === 1 ? "" : "s"}` : ""})
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showFriendsSection ? "rotate-90" : ""}`} />
                    </button>

                    {/* Friends List & Add */}
                    <AnimatePresence>
                      {showFriendsSection && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {friendRequests.length > 0 && (
                            <div className="px-3 pb-2 space-y-1.5">
                              <p className="text-[9px] font-mono font-bold text-natural-clay uppercase tracking-wider">Friend Requests</p>
                              {friendRequests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between gap-2 p-2 bg-natural-clay/5 border border-natural-clay/20 rounded-xl">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-natural-clay/10 border border-natural-clay/30 overflow-hidden flex items-center justify-center shrink-0">
                                      {request.fromAvatar ? (
                                        <img src={request.fromAvatar} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <UserPlus className="w-3.5 h-3.5 text-natural-clay" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold font-serif text-natural-clay truncate">{request.fromName || "Astra Scholar"}</p>
                                      <p className="text-[9px] font-mono text-natural-forest-light truncate">{request.fromUid.slice(0, 12)}...</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptFriendRequest(request)}
                                      className="p-1.5 rounded-lg bg-natural-forest/10 text-natural-forest hover:bg-natural-forest/20 transition cursor-pointer"
                                      title="Accept request"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeclineFriendRequest(request.id)}
                                      className="p-1.5 rounded-lg bg-natural-terracotta/10 text-natural-terracotta hover:bg-natural-terracotta/20 transition cursor-pointer"
                                      title="Decline request"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Friend Form */}
                          <div className="px-3 pb-2 space-y-1.5">
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={friendUidInput}
                                onChange={(e) => setFriendUidInput(e.target.value)}
                                placeholder="Friend code"
                                className="flex-1 px-2.5 py-1.5 bg-natural-bg border border-natural-border rounded-lg text-[11px] font-mono text-natural-charcoal outline-none focus:border-natural-forest"
                              />
                              <button
                                type="button"
                                onClick={handleAddFriend}
                                disabled={!friendUidInput.trim() || isAddingFriend}
                                className="px-2.5 py-1.5 bg-natural-forest text-natural-bg rounded-lg text-[11px] font-bold transition hover:bg-natural-forest/90 disabled:opacity-40 cursor-pointer"
                              >
                                {isAddingFriend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {addFriendError && (
                              <p className="text-[10px] text-natural-terracotta font-medium">{addFriendError}</p>
                            )}
                            <p className="text-[9px] text-natural-forest-light font-mono">Sends a request. They will appear here after accepting.</p>
                          </div>

                          {/* Friends List */}
                          <div className="px-3 pb-3 max-h-40 overflow-y-auto">
                            {friends.length === 0 ? (
                              <p className="text-[10px] text-natural-forest-light text-center py-2 font-mono">
                                No friends yet. Add one by friend code!
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {friends.map((friend) => (
                                  <div
                                    key={friend.uid}
                                    className="flex items-center justify-between p-2 bg-natural-bg rounded-xl group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full bg-natural-forest/10 flex items-center justify-center shrink-0">
                                        <User className="w-3 h-3 text-natural-forest" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold font-serif text-natural-forest truncate">{friend.name}</p>
                                        <p className="text-[9px] font-mono text-natural-forest-light truncate">{friend.uid?.slice(0, 12) ?? "unknown"}...</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      {duel.code && (
                                        <button
                                          type="button"
                                          onClick={() => handleInviteFriend(friend.uid)}
                                          className="p-1.5 rounded-lg hover:bg-natural-clay/10 text-natural-clay transition cursor-pointer"
                                          title="Invite to Room"
                                        >
                                          <Mail className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFriend(friend.uid)}
                                        className="p-1.5 rounded-lg hover:bg-natural-terracotta/10 text-natural-terracotta transition cursor-pointer"
                                        title="Remove Friend"
                                      >
                                        <UserMinus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>}


        {/* COMPANION STATUS BOARD */}
        {!atelierScreen && (currentScreen === "menu" || currentScreen === "kanji-scroll") && (
        <div id="companion-section-wrapper" className="mb-4">
          <MascotCompanion
            mood={mascotMood}
            streak={stats.streakCount}
            xp={stats.xp}
            selectedChar={currentScreen === "kanji-scroll" ? KANJI_DATA[currentKanjiIndex].kanji : undefined}
            speechOverride={mascotSpeechOverride}
            readingImage={astraReadingImg}
            onClickCompanion={handleMascotClick}
          />
        </div>
        )}

        {/* MAIN ROUTER SWITCH CONTAINER (Polish C3: the only owner of page motion; no perspective) */}
        <main className="flex-grow flex flex-col justify-center">
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: "instant" })}
        >
        <motion.div
          key={currentScreen}
          ref={routerNodeRef}
          role="region"
          aria-label={SCREEN_TITLES[currentScreen] ?? "Screen"}
          tabIndex={-1}
          className="flex-grow flex flex-col justify-center outline-none"
          variants={prefersReducedMotion || atelierScreen ? SCREEN_VARIANTS_REDUCED : SCREEN_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          onClickCapture={(event) => {
            // This element is the OUTGOING screen when a newer screen is already current
            // (its props are frozen while it exits). A tap on it during the short exit is
            // swallowed so it cannot route somewhere the learner no longer means.
            if (currentScreen !== latestScreenRef.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onAnimationComplete={(definition) => {
            if (definition === "center") handleScreenSettled(currentScreen);
          }}
        >

          {/* ================= SCREEN 1: MENU ================= */}
          {currentScreen === "menu" && (!atelierHome || entranceConnected) && <MenuScreen {...menuScreenProps}
            entrancePreparing={entrancePhase === "loading"} entranceLeaving={entrancePhase === "leaving"}
            practiceEntrance={entranceConnected ? <RoomEntrance onBack={cancelEntrance} onCoverChange={handleRoomCoverChange}>{practiceFlow}</RoomEntrance> : undefined} /> }

          {/* ================= SCREEN 2: ACTIVE QUIZ WORKSPACE ================= */}
          {(studioQuiz || (atelierHome && !entranceConnected)) && practiceFlow}

          {/* ================= SCREEN 3: DYNAMIC DAILY KANJI MODULE ================= */}
          {currentScreen === "kanji-scroll" && <KanjiScrollScreen {...kanjiScrollScreenProps} />}

          {/* ================= SCREEN: VOCAB QUIZ ================= */}

          {/* ================= SCREEN: KANJI QUIZ ================= */}

          {/* ================= SCREEN 5: ONLINE SPEED DUEL ================= */}
          {currentScreen === "online-multiplayer" && <OnlineMultiplayerScreen {...onlineMultiplayerScreenProps} />}

          {/* ================= SCREEN 4: PROFILE ANALYTICS ARCHIVES ================= */}
          {currentScreen === "profile" && <ProfileScreen {...profileScreenProps} />}

          {/* ================= SCREEN: REFERENCE CHARTS ================= */}
          {currentScreen === "charts" && (
            <ReferenceCharts
              onBack={() => setCurrentScreen("menu")}
              speakJapanese={speakJapanese}
              activeTab={chartsTab}
              onTabChange={setChartsTab}
              onOpenSandbox={(mode) => {
                setSandboxEntryMode(mode);
                setCurrentScreen("sandbox");
              }}
            />
          )}

          {/* ================= SCREEN: MASTERY SANDBOX (Polish C4: a page, not a drawer) ================= */}
          {currentScreen === "sandbox" && (
            <InteractiveWorkbench
              initialMode={sandboxEntryMode}
              onBack={() => setCurrentScreen("charts")}
              speakJapanese={speakJapanese}
            />
          )}

          {/* ================= SCREEN: GRAMMAR DOJO ================= */}
          {currentScreen === "grammar-dojo" && (
            <GrammarDojo onBack={() => setCurrentScreen("menu")} onAwardXP={(xp) => awardXPAndIncrementAttempt(true, xp)} speakJapanese={speakJapanese} />
          )}

          {/* ================= SCREEN: READING ROOM ================= */}
          {currentScreen === "reading-room" && (
            <React.Fragment key={progressOwner ?? "unbound"}>
              <ReadingRoomScreen
                appearance={readingAppearance}
                onAppearanceChange={patch => setReadingAppearance(previous => ({ ...previous, ...patch }))}
                owner={progressOwner}
                language={language}
                speakJapanese={speakJapanese}
                stopSpeech={() => {
                  cloudSpeechRequestRef.current += 1;
                  cloudAudioRef.current?.pause();
                  window.speechSynthesis?.cancel();
                }}
                hasWord={key => quizReady && hasCard(key, "vocab")}
                readingNotes={quizReady ? stats.readingMisses : undefined}
                onSaveWord={(token, origin) => {
                  if (!progressOwner || !quizReady || !isCurrentQuizOwner(progressOwner)) {
                    showToast(language === "ja" ? "学習データの準備中です。" : "Your Review Deck is still loading.");
                    return false;
                  }
                  if (!token.addToSrs || !token.dictKey || hasCard(token.dictKey, "vocab")) return false;
                  addCard(token.dictKey, "vocab");
                  handleRecordReadingMiss(token, origin);
                  return true;
                }}
                onBack={() => {
                  setCurrentScreen("menu");
                  setMascotMood("idle");
                  setMascotSpeechOverride(null);
                }}
                onReviewDeck={() => {
                  setSrsQueue(getSessionQueue());
                  setSrsQueueIndex(0);
                  setSrsRevealed(false);
                  setCurrentScreen("review-deck");
                }}
              />
            </React.Fragment>
          )}

          {/* ================= SCREEN: SRS REVIEW DECK ================= */}
          {currentScreen === "review-deck" && <ReviewDeckScreen {...reviewDeckScreenProps} />}


        </motion.div>
        </AnimatePresence>
        </main>

        {/* FLOATING SOUND + ATMOSPHERE DOCK (Polish A1). Outside <main> (never inside the flip node),
            inside the layout wrapper so the Charts drawer, word-family modal and profile menu
            (all z-50 in this stacking context) cover it. */}
        <SoundAtmosphereDock
          openPanel={dockPanel}
          onOpenPanelChange={setDockPanel}
          onPanelHeightChange={setDockPanelHeight}
          quiet={dockQuiet || readingRoomOpen}
          isMusicPlaying={isMusicPlaying}
          musicVolume={musicVolume}
          selectedMusicTrack={selectedMusicTrack}
          onSelectTrack={handleDockSelectTrack}
          onTogglePlay={handleDockTogglePlay}
          onVolumeChange={setMusicVolume}
          activeBgScene={activeBgScene}
          autoCycleBg={autoCycleBg}
          theme={theme}
          fontStyle={fontStyle}
          bgAnimationType={bgAnimationType}
          bgIntensity={bgIntensity}
          bgBlur={bgBlur}
          bgOpacity={bgOpacity}
          onSelectScene={handleDockSelectScene}
          onToggleAutoCycle={handleDockToggleAutoCycle}
          studyRoom={atelierScreen || entranceConnected}
          onSetAppTheme={setTheme}
          onSetFont={handleDockSetFont}
          onSetAnimation={setBgAnimationType}
          onSetIntensity={setBgIntensity}
          onSetBlur={setBgBlur}
          onSetOpacity={setBgOpacity}
          showToast={showToast}
        />

        {/* FOOTER METRICS AND CREDITS */}
        {!atelierScreen && <footer className="text-center py-4 border-t border-natural-border mt-6 relative select-none">
          <p className="text-xs text-natural-forest-light font-serif italic mb-1">
            Keep studying — every character brings you closer to fluency. 🌸
          </p>
          <span className="text-[9px] text-natural-sage font-mono tracking-widest uppercase font-bold">
            Progress saved automatically
          </span>
        </footer>}

      </div>
    </div>
    </AppearanceProvider>
  );
}
