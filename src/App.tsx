/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  Volume2,
  VolumeX,
  BookOpen,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  Sun,
  Moon,
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
} from "lucide-react";

import { HIRAGANA_DATA, KATAKANA_DATA, KANJI_DATA, VOCABULARY_DATA } from "./data";
import {
  createRoom,
  joinRoom,
  listenToRoom,
  submitOnlineAnswer,
  advanceOnlineQuestion,
  leaveRoom,
  DURATION_MS,
  addFriend,
  removeFriend,
  listenToFriends,
  sendRoomInvite,
  listenToInvites,
  clearInvite,
  saveUserProfile,
  type RoomState,
  type RoomSettings,
  type OnlineDifficulty,
  type QuizMode,
  type FriendRecord,
  type RoomInvite,
} from "./multiplayerOnline";
import { currentUid, ensureSignedIn } from "./firebase";
import { HiraganaItem, KatakanaItem, KanjiItem, VocabularyItem, StudentStats, SRSCard } from "./types";
import MascotCompanion from "./components/MascotCompanion";
import AtmosphereCanvas from "./components/AtmosphereCanvas";
import ReferenceCharts from "./components/ReferenceCharts";
import GrammarDojo from "./components/GrammarDojo";
import MenuScreen from "./components/MenuScreen";
import ResultsScreen from "./components/ResultsScreen";
import VocabQuizScreen from "./components/VocabQuizScreen";
import KanjiQuizScreen from "./components/KanjiQuizScreen";
import QuizScreen from "./components/QuizScreen";
import KanjiScrollScreen from "./components/KanjiScrollScreen";
import ProfileScreen from "./components/ProfileScreen";
import ReviewDeckScreen from "./components/ReviewDeckScreen";
import OnlineMultiplayerScreen from "./components/OnlineMultiplayerScreen";
import { useSRS } from "./hooks/useSRS";
import wonderingImg from "./assets/images/astra-wondering.jpeg";
import excitedImg from "./assets/images/astra-excited.png.jpeg";
import bgMistySakura from "./assets/images/bg_misty_sakura.jpg";
import bgSakuraTrain from "./assets/images/bg_sakura_train.jpg";
import bgNightSparkler from "./assets/images/bg_night_sparkler.jpg";
import bgRainyWindowAnime from "./assets/images/bg_rainy_window_anime.jpg";

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

export default function App() {
  // Screens navigation state
  const [currentScreen, setCurrentScreen] = useState<"menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo">("menu");
  const [quizMode, setQuizMode] = useState<"choice" | "romaji" | "survival">("choice");

  // ── SRS Review Deck (hook + session state) ─────────────────────────────────
  const { addCard, hasCard, getDueCards, answerCard, dueCount, totalCount } = useSRS();
  const [srsQueue, setSrsQueue]       = useState<SRSCard[]>([]);
  const [srsQueueIndex, setSrsQueueIndex] = useState(0);
  const [srsRevealed, setSrsRevealed]   = useState(false);

  /**
   * Awards XP for SRS reviews without clobbering the srsCards field that the
   * useSRS hook manages independently in localStorage.
   */
  const awardSRSXP = useCallback((xp: number) => {
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + xp,
      srsReviewedTotal: (prev.srsReviewedTotal || 0) + 1,
      studyDates: (() => {
        const _d = new Date();
        const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;
        const existing = prev.studyDates || [];
        return existing.includes(todayStr) ? existing : [...existing, todayStr];
      })(),
    }));
    try {
      const raw = localStorage.getItem("hirachan_master_stats_v1");
      const s = raw ? (JSON.parse(raw) as StudentStats) : {} as StudentStats;
      s.xp = (s.xp || 0) + xp;
      s.srsReviewedTotal = (s.srsReviewedTotal || 0) + 1;
      const _d2 = new Date();
      const todayStr = `${_d2.getFullYear()}-${String(_d2.getMonth() + 1).padStart(2, "0")}-${String(_d2.getDate()).padStart(2, "0")}`;
      s.studyDates = s.studyDates || [];
      if (!s.studyDates.includes(todayStr)) s.studyDates = [...s.studyDates, todayStr];
      localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(s));
    } catch { /* ignore storage errors */ }
  }, []);

  // Selection configurations
  const [selectedStages, setSelectedStages] = useState<string[]>(["basic"]);
  const [quizAlphabet, setQuizAlphabet] = useState<"hiragana" | "katakana" | "both">("hiragana");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"relax" | "medium" | "hard" | "legend">("medium");

  // Tab & Learning Desk Navigation states
  const [activeHubTab, setActiveHubTab] = useState<"learn" | "practice">("learn");
  const [showStudyRoom, setShowStudyRoom] = useState(true);
  const [subLearnTab, setSubLearnTab] = useState<"hiragana" | "katakana" | "kanji" | "vocabulary">("hiragana");
  const [selectedLearnChar, setSelectedLearnChar] = useState<HiraganaItem | KatakanaItem | null>(null);

  // Zen Soundscape synthesizer engine state
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(0.35);
  const [ambientSoundType, setAmbientSoundType] = useState<"zen" | "rain" | "bell">("zen");
  const [activeMediaSource, setActiveMediaSource] = useState<"synth" | "yt-temple" | "yt-kyoto">("synth");

  // Refs for Zen Ambient Loop Player
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const synthTimerRef = useRef<any>(null);
  const noiseNodeRef = useRef<any>(null);
  // Ref for real music tracks (HTML Audio)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Music track selection: "synth" = built-in synth, "ten_no_yowai" = Akie track, "one_voice" = Rokudenashi track
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<"ten_no_yowai" | "one_voice" | "amakigoe" | "sparkle" | "columbinas_lullaby">("ten_no_yowai");
  const [numChoices, setNumChoices] = useState<4 | 6>(4);

  // Background scene cycling (0=Rainy Window, 1=Astra's Garden, 2=Sakura Dawn, 3=Moonlit Study)
  const [activeBgScene, setActiveBgScene] = useState(0);

  // Vocabulary navigation & search
  const [vocabsCategory, setVocabsCategory] = useState<string>("all");
  const [vocabsSearch, setVocabsSearch] = useState("");

  // Quiz Pronunciation Voice settings
  const [autoPronounce, setAutoPronounce] = useState<boolean>(false);
  const [language, setLanguage] = useState<"en" | "ja">(() => {
    try {
      const stored = localStorage.getItem("hira_app_language");
      if (stored === "en" || stored === "ja") return stored;
    } catch (e) { }
    return "en";
  });
  const [availableJapaneseVoices, setAvailableJapaneseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedJapaneseVoiceURI, setSelectedJapaneseVoiceURI] = useState<string>(() => localStorage.getItem("astra_japanese_voice_uri") || "");
  const [isAtmosphereExpanded, setIsAtmosphereExpanded] = useState(false);
  const [isMusicExpanded, setIsMusicExpanded] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>(() => localStorage.getItem("astra_profile_avatar") || "");

  // Mascot dynamic overrides
  const [mascotSpeechOverride, setMascotSpeechOverride] = useState<string | null>(null);

  // Student Statistics State (with Local Storage Persistence)
  const [stats, setStats] = useState<StudentStats>({
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
  });

  // Mascot mood state
  const [mascotMood, setMascotMood] = useState<"welcome" | "streak" | "success" | "failure" | "kanji" | "idle" | "clicked" | "learn-flashcard" | "learn-vocabs" | "survival-danger" | "wondering" | "afk" | "excited">("welcome");

  // Kanji drawing evaluation states
  const [analysisResult, setAnalysisResult] = useState<{ score: number; feedbackTitle: string; advice: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Customizable background elements and dark/light settings
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("hira_theme_mode");
      if (stored === "dark" || stored === "light") return stored;
    } catch (e) { }
    return "light";
  });
  const [bgAnimationType, setBgAnimationType] = useState<"letters" | "rain" | "both" | "none">(() => {
    try {
      const stored = localStorage.getItem("hira_theme_bg_anim");
      if (stored === "letters" || stored === "rain" || stored === "both" || stored === "none") return stored;
    } catch (e) { }
    return "both";
  });
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
    return 7;
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

  // Auto-cycle background scenes every 50 seconds, smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBgScene((prev: number) => (prev + 1) % 4);
    }, 50000);
    return () => clearInterval(interval);
  }, []);

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

    if (isMusicPlaying) {
      audio.play().catch(e => console.warn("Audio play failed:", e));
    }

    return () => {
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
      musicAudioRef.current.play().catch(e => console.warn("Audio play failed:", e));
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

  // Active quiz variables
  const [quizPool, setQuizPool] = useState<(HiraganaItem | KatakanaItem)[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<HiraganaItem | KatakanaItem | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<"correct" | "incorrect" | null>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [typedInput, setTypedInput] = useState("");

  // Character Picker state (solo quiz pre-launch panel)
  const [showCharPicker, setShowCharPicker] = useState(false);
  const [pickerDeck, setPickerDeck] = useState<(HiraganaItem | KatakanaItem)[]>([]);
  const [pendingQuizMode, setPendingQuizMode] = useState<"choice" | "romaji" | "survival" | null>(null);
  const [pickerSelectedChars, setPickerSelectedChars] = useState<Set<string>>(new Set());
  const [quizLength, setQuizLength] = useState<10 | 20 | 30 | "all">(10);

  // Countdown timer variables
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerMax, setTimerMax] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // timerKey: incremented on each new question — gives each question a unique timer epoch
  const [timerKey, setTimerKey] = useState(0);

  // Survival Mode variables
  const [survivalTimeMax, setSurvivalTimeMax] = useState(45);
  const [survivalTimeLeft, setSurvivalTimeLeft] = useState(45);
  const [survivalScore, setSurvivalScore] = useState(0);

  // Profile screen collapsible section states + calendar month navigation
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [badgesOpen, setBadgesOpen] = useState(true);
  const [calViewDate, setCalViewDate] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month: 0-indexed
  });

  // Quiz session result tracking (for results screen)
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [sessionWrongChars, setSessionWrongChars] = useState<Array<{ kana: string; romaji: string }>>([]);

  // ── VOCAB QUIZ STATE ──────────────────────────────────────────────────────
  const [vocabQuizMode, setVocabQuizMode] = useState<"meaning" | "reading">("meaning");
  const [vocabQuizLength, setVocabQuizLength] = useState<10 | 20 | "all">(10);
  const [vocabQuizScope, setVocabQuizScope] = useState<"all" | "category" | "learned" | "custom">("all");
  const [vocabQuizCustomWords, setVocabQuizCustomWords] = useState<Set<string>>(new Set());
  const [vocabQuizPool, setVocabQuizPool] = useState<VocabularyItem[]>([]);
  const [vocabQuizIndex, setVocabQuizIndex] = useState(0);
  const [vocabQuizItem, setVocabQuizItem] = useState<VocabularyItem | null>(null);
  const [vocabQuizChoices, setVocabQuizChoices] = useState<string[]>([]);
  const [vocabQuizAnswerStatus, setVocabQuizAnswerStatus] = useState<"correct" | "incorrect" | null>(null);
  const [vocabQuizSelectedAnswer, setVocabQuizSelectedAnswer] = useState<string | null>(null);
  const [vocabQuizCorrect, setVocabQuizCorrect] = useState(0);
  const [vocabQuizXp, setVocabQuizXp] = useState(0);
  const [vocabQuizWrong, setVocabQuizWrong] = useState<VocabularyItem[]>([]);
  const [vocabQuizPhase, setVocabQuizPhase] = useState<"config" | "quiz" | "results">("config");

  // ── KANJI QUIZ STATE ──────────────────────────────────────────────────────
  const [kanjiQuizMode, setKanjiQuizMode] = useState<"meaning" | "reading">("meaning");
  const [kanjiQuizLength, setKanjiQuizLength] = useState<10 | 20 | "all">(10);
  const [kanjiQuizScope, setKanjiQuizScope] = useState<"all" | "studied" | "custom">("all");
  const [kanjiQuizCustomItems, setKanjiQuizCustomItems] = useState<Set<string>>(new Set());
  const [kanjiQuizPool, setKanjiQuizPool] = useState<KanjiItem[]>([]);
  const [kanjiQuizIndex, setKanjiQuizIndex] = useState(0);
  const [kanjiQuizItem, setKanjiQuizItem] = useState<KanjiItem | null>(null);
  const [kanjiQuizChoices, setKanjiQuizChoices] = useState<string[]>([]);
  const [kanjiQuizAnswerStatus, setKanjiQuizAnswerStatus] = useState<"correct" | "incorrect" | null>(null);
  const [kanjiQuizSelectedAnswer, setKanjiQuizSelectedAnswer] = useState<string | null>(null);
  const [kanjiQuizCorrect, setKanjiQuizCorrect] = useState(0);
  const [kanjiQuizXp, setKanjiQuizXp] = useState(0);
  const [kanjiQuizWrong, setKanjiQuizWrong] = useState<KanjiItem[]>([]);
  const [kanjiQuizPhase, setKanjiQuizPhase] = useState<"config" | "quiz" | "results">("config");
  // ── END VOCAB / KANJI QUIZ STATE ──────────────────────────────────────────

  // Profile script toggle (hiragana / katakana)
  const [profileCharSet, setProfileCharSet] = useState<"hiragana" | "katakana">("hiragana");

  // Ref holding current quizMode to avoid stale closures in callbacks
  const quizModeRef = useRef(quizMode);
  // FIX: Keep quizModeRef in sync with state
  useEffect(() => {
    quizModeRef.current = quizMode;
  }, [quizMode]);

  // Input refs for romaji typing inputs — used to restore focus after each question
  // advance so the virtual keyboard never dismisses on mobile.
  const onlineRomajiInputRef = useRef<HTMLInputElement>(null);

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

  // ── ONLINE MULTIPLAYER STATE ───────────────────────────────────────────────
  const [onlinePhase, setOnlinePhase] = useState<"menu" | "config" | "join" | "lobby" | "playing" | "finished">("menu");
  const [onlineRoomCode, setOnlineRoomCode] = useState("");
  const [onlineRoomState, setOnlineRoomState] = useState<RoomState | null>(null);
  const [onlineRole, setOnlineRole] = useState<"host" | "guest" | null>(null);
  const [onlineHostNameInput, setOnlineHostNameInput] = useState("");
  const [onlineJoinCode, setOnlineJoinCode] = useState("");
  const [onlineJoinName, setOnlineJoinName] = useState("");
  const [onlineAnswerLocked, setOnlineAnswerLocked] = useState(false);
  const [onlineQuestionChoices, setOnlineQuestionChoices] = useState<string[]>([]);
  const [onlineSelectedAnswer, setOnlineSelectedAnswer] = useState<string | null>(null);
  const [onlineAnswerStatus, setOnlineAnswerStatus] = useState<"correct" | "incorrect" | null>(null);
  const [onlineIsConnecting, setOnlineIsConnecting] = useState(false);
  const [onlineConnectionError, setOnlineConnectionError] = useState<string | null>(null);
  const [onlineScores, setOnlineScores] = useState<{ host: number; guest: number }>({ host: 0, guest: 0 });
  const [onlineDifficulty, setOnlineDifficulty] = useState<OnlineDifficulty>("medium");
  const [onlineQuizMode, setOnlineQuizMode] = useState<QuizMode>("choice");
  const [onlineTypedAnswer, setOnlineTypedAnswer] = useState("");
  const [onlineTimeLeft, setOnlineTimeLeft] = useState(0);
  const [onlineMultiplayerMode, setOnlineMultiplayerMode] = useState<"competitive" | "parallel">("competitive");
  const [onlineTimerMax, setOnlineTimerMax] = useState(10);
  const [onlineWinnerName, setOnlineWinnerName] = useState<string | null>(null);
  const [onlineShowResult, setOnlineShowResult] = useState(false);
  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const onlineQuestionPoolRef = useRef<(HiraganaItem | KatakanaItem)[]>([]);
  const onlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onlineAutoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartedAtRef = useRef<number | null>(null);
  // ── END ONLINE MULTIPLAYER STATE ───────────────────────────────────────────

  // ── ONLINE CHARACTER PICKER STATE ─────────────────────────────────────────
  // Separate from offline picker so the two configs don't interfere.
  const [onlineAlphabet, setOnlineAlphabet] = useState<"hiragana" | "katakana" | "mixed">("hiragana");
  const [onlinePickerDeck, setOnlinePickerDeck] = useState<(HiraganaItem | KatakanaItem)[]>(HIRAGANA_DATA);
  const [onlinePickerSelectedChars, setOnlinePickerSelectedChars] = useState<Set<string>>(
    () => new Set(HIRAGANA_DATA.map((c) => c.kana))
  );
  const [onlineQuestionCount, setOnlineQuestionCount] = useState(10);
  // ── END ONLINE CHARACTER PICKER STATE ──────────────────────────────────────

  // ── FRIEND SYSTEM STATE ────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendUidInput, setFriendUidInput] = useState("");
  const [friendNameInput, setFriendNameInput] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<RoomInvite[]>([]);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showFriendsSection, setShowFriendsSection] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Astra Scholar");
  const [profileNameInput, setProfileNameInput] = useState("Astra Scholar");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const progressUploadInputRef = useRef<HTMLInputElement>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeFriendsRef = useRef<(() => void) | null>(null);
  const unsubscribeInvitesRef = useRef<(() => void) | null>(null);
  // ── END FRIEND SYSTEM STATE ────────────────────────────────────────────────

  // 1. Initial State Load & Study Streak evaluation
  useEffect(() => {
    const saved = localStorage.getItem("hirachan_master_stats_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StudentStats;
        parsed.srsCards = parsed.srsCards ?? {};

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
          streakCount: currentStreak,
          vocabularyProgress: parsed.vocabularyProgress || {},
          studyDates: parsed.studyDates || [],
          survivalBestScore: parsed.survivalBestScore || 0,
          srsReviewedTotal: parsed.srsReviewedTotal || 0,
        });

        if (currentStreak > 0) {
          setMascotMood("streak");
        }
      } catch (err) {
        console.error("Failed to parse saved credentials", err);
      }
    }
  }, []);

  // Sync state with LocalStorage triggers
  const saveStats = (newStats: StudentStats) => {
    setStats(newStats);
    localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(newStats));
  };

  const normalizeImportedStats = (input: any): StudentStats | null => {
    const imported = input?.stats ?? input;
    if (!imported || typeof imported !== "object") return null;
    return {
      xp: Number(imported.xp) || 0,
      streakCount: Number(imported.streakCount) || 0,
      lastActiveDate: typeof imported.lastActiveDate === "string" ? imported.lastActiveDate : null,
      correctCount: Number(imported.correctCount) || 0,
      totalAttempts: Number(imported.totalAttempts) || 0,
      masteredChars: Array.isArray(imported.masteredChars) ? imported.masteredChars : [],
      characterProgress: imported.characterProgress && typeof imported.characterProgress === "object" ? imported.characterProgress : {},
      vocabularyProgress: imported.vocabularyProgress && typeof imported.vocabularyProgress === "object" ? imported.vocabularyProgress : {},
      favoriteCategory: typeof imported.favoriteCategory === "string" ? imported.favoriteCategory : "basic",
      srsCards: imported.srsCards && typeof imported.srsCards === "object" ? imported.srsCards : {},
      studyDates: Array.isArray(imported.studyDates) ? imported.studyDates : [],
      survivalBestScore: Number(imported.survivalBestScore) || 0,
      srsReviewedTotal: Number(imported.srsReviewedTotal) || 0,
    };
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
    try {
      const parsed = JSON.parse(await file.text());
      const importedStats = normalizeImportedStats(parsed);
      if (!importedStats) {
        showToast("That progress file could not be read.");
        return;
      }
      saveStats(importedStats);
      if (typeof parsed?.profileName === "string" && parsed.profileName.trim()) {
        localStorage.setItem("astra_profile_name", parsed.profileName.trim().slice(0, 24));
      }
      showToast("Progress restored. Reloading...");
      setTimeout(() => window.location.reload(), 700);
    } catch {
      showToast("Upload failed. Please choose a valid Astra progress JSON file.");
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
      if (selectedJapaneseVoiceURI && !voices.some((voice) => voice.voiceURI === selectedJapaneseVoiceURI)) {
        setSelectedJapaneseVoiceURI("");
        localStorage.removeItem("astra_japanese_voice_uri");
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [selectedJapaneseVoiceURI]);

  const handleSelectJapaneseVoice = (voiceURI: string) => {
    setSelectedJapaneseVoiceURI(voiceURI);
    if (voiceURI) {
      localStorage.setItem("astra_japanese_voice_uri", voiceURI);
      showToast("Japanese voice saved.");
    } else {
      localStorage.removeItem("astra_japanese_voice_uri");
      showToast("Using the default Japanese voice.");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file.");
      return;
    }
    if (file.size > 700 * 1024) {
      showToast("Avatar image is too large. Try one under 700 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) {
        showToast("Avatar upload failed.");
        return;
      }
      localStorage.setItem("astra_profile_avatar", value);
      setProfileAvatar(value);
      showToast("Avatar updated.");
    };
    reader.onerror = () => showToast("Avatar upload failed.");
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem("astra_profile_avatar");
    setProfileAvatar("");
    showToast("Avatar removed.");
  };

  const getFriendCode = () => {
    const uid = myUid || currentUid();
    return uid || "";
  };

  // Speaks actual letters vocally via Japanese Web Voice Engine
  const speakJapanese = (phrase: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = "ja-JP";
      utterance.rate = 0.8;
      const selectedVoice = availableJapaneseVoices.find((voice) => voice.voiceURI === selectedJapaneseVoiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
    } else {
      showToast("Sound synthesis is not supported on your server device.");
    }
  };

  // Calculates timer limits based on selected difficulty settings
  const getTimerSecondsLimit = () => {
    switch (selectedDifficulty) {
      case "relax":
        return 999; // Essentially unlimited
      case "hard":
        return 6;
      case "legend":
        return 3;
      case "medium":
      default:
        return 12;
    }
  };

  // Multi-choice generator with smart foils/distractors
  const generateChoices = (correctItem: HiraganaItem | KatakanaItem, generalDeck: (HiraganaItem | KatakanaItem)[], choiceCount: number = 4) => {
    const potentialFoils = generalDeck.filter((it) => it.romaji !== correctItem.romaji);

    // Score each foil by phonetic similarity (higher = more confusable)
    const scored = potentialFoils.map(f => {
      let score = 0;
      if (f.romaji.slice(-1) === correctItem.romaji.slice(-1)) score += 2; // same ending vowel
      if (f.romaji[0] === correctItem.romaji[0]) score += 2;               // same initial consonant
      score += Math.random() * 0.5;                                         // tiny random tiebreaker
      return { item: f, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // Pick the most-confusable foils to fill slots
    const choices = [correctItem.romaji];
    for (const { item } of scored) {
      if (choices.length >= choiceCount) break;
      if (!choices.includes(item.romaji)) choices.push(item.romaji);
    }

    // Fallback fillers if deck was too small
    const fallbacks = ["a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra", "wa", "ki", "mi", "ni", "ri", "shi"];
    for (const dummy of fallbacks) {
      if (choices.length >= choiceCount) break;
      if (!choices.includes(dummy)) choices.push(dummy);
    }

    // Fisher-Yates shuffle (stable, unbiased)
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return choices;
  };

  // Launch customized study state
  // ── CHARACTER PICKER — opens before any solo quiz mode ────────────────────
  const openCharPicker = (mode: "choice" | "romaji" | "survival") => {
    let alphabetPool: (HiraganaItem | KatakanaItem)[] = [];
    if (quizAlphabet === "hiragana") alphabetPool = HIRAGANA_DATA;
    else if (quizAlphabet === "katakana") alphabetPool = KATAKANA_DATA;
    else alphabetPool = [...HIRAGANA_DATA, ...KATAKANA_DATA];

    const matchedDeck = alphabetPool.filter((k) => selectedStages.includes(k.category));
    if (matchedDeck.length === 0) {
      showToast("Select at least one stage of characters from the menu settings!");
      return;
    }

    setPendingQuizMode(mode);
    setPickerDeck(matchedDeck);
    setPickerSelectedChars(new Set(matchedDeck.map((c) => c.kana)));
    setShowCharPicker(true);
  };

  const confirmStartQuiz = () => {
    if (!pendingQuizMode) return;
    if (pickerSelectedChars.size < 3) {
      showToast("Please select at least 3 characters!");
      return;
    }

    let alphabetPool: (HiraganaItem | KatakanaItem)[] = [];
    if (quizAlphabet === "hiragana") alphabetPool = HIRAGANA_DATA;
    else if (quizAlphabet === "katakana") alphabetPool = KATAKANA_DATA;
    else alphabetPool = [...HIRAGANA_DATA, ...KATAKANA_DATA];
    const rawDeck = alphabetPool.filter((k) => selectedStages.includes(k.category));
    const selectedArray = pickerDeck.filter((c) => pickerSelectedChars.has(c.kana));
    const targetLength = quizLength === "all" ? selectedArray.length : (quizLength as number);

    const pool: (HiraganaItem | KatakanaItem)[] = [];
    if (selectedArray.length === 0) { showToast("No characters match your selection!"); return; }
    while (pool.length < targetLength) {
      const shuffled = [...selectedArray].sort(() => Math.random() - 0.5);
      pool.push(...shuffled);
    }
    const finalPool = pool.slice(0, targetLength);

    setShowCharPicker(false);
    const mode = pendingQuizMode;
    setQuizMode(mode);
    quizModeRef.current = mode;
    setAnswerStatus(null);
    setSelectedAnswer(null);
    setTypedInput("");
    setSessionCorrect(0);
    setSessionXpEarned(0);
    setSessionWrongChars([]);

    if (mode === "survival") {
      setSurvivalScore(0);
      setSurvivalTimeLeft(45);
      setMascotMood("idle");
      const randomized = [...finalPool].sort(() => Math.random() - 0.5);
      setQuizPool(randomized);
      setQuizIndex(0);
      setupNewQuestion(randomized[0], rawDeck, 45);
      setCurrentScreen("quiz");
    } else {
      setQuizPool(finalPool);
      setQuizIndex(0);
      setupNewQuestion(finalPool[0], rawDeck);
      setCurrentScreen("quiz");
    }
  };
  // ── END CHARACTER PICKER FUNCTIONS ─────────────────────────────────────────

  // ── VOCAB QUIZ HELPERS ──────────────────────────────────────────────────────
  const generateVocabChoices = (item: VocabularyItem, pool: VocabularyItem[], mode: "meaning" | "reading"): string[] => {
    const correct = mode === "meaning" ? item.english : item.hiragana;
    const distractors: string[] = [];
    const shuffled = [...pool].filter(v => v.word !== item.word).sort(() => Math.random() - 0.5);
    for (const v of shuffled) {
      const val = mode === "meaning" ? v.english : v.hiragana;
      if (val !== correct && !distractors.includes(val)) distractors.push(val);
      if (distractors.length >= 3) break;
    }
    // Pad with VOCABULARY_DATA if pool was tiny
    if (distractors.length < 3) {
      for (const v of VOCABULARY_DATA.sort(() => Math.random() - 0.5)) {
        if (v.word === item.word) continue;
        const val = mode === "meaning" ? v.english : v.hiragana;
        if (val !== correct && !distractors.includes(val)) distractors.push(val);
        if (distractors.length >= 3) break;
      }
    }
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
  };

  const getVocabQuizKey = (item: VocabularyItem) => `${item.category}:${item.word}`;

  const getVocabQuizBasePool = () => {
    if (vocabQuizScope === "category") {
      return VOCABULARY_DATA.filter(v => v.category === vocabsCategory);
    }
    if (vocabQuizScope === "learned") {
      return VOCABULARY_DATA.filter(v => !!stats.vocabularyProgress[v.word]);
    }
    if (vocabQuizScope === "custom") {
      return VOCABULARY_DATA.filter(v => vocabQuizCustomWords.has(getVocabQuizKey(v)));
    }
    return [...VOCABULARY_DATA];
  };

  const getVocabQuizScopeLabel = () => {
    if (vocabQuizScope === "category") return vocabsCategory === "all" ? "All themes" : vocabsCategory;
    if (vocabQuizScope === "learned") return "Learned words";
    if (vocabQuizScope === "custom") return `${vocabQuizCustomWords.size} selected`;
    return "All words";
  };

  const toggleVocabQuizCustomWord = (item: VocabularyItem) => {
    const key = getVocabQuizKey(item);
    setVocabQuizCustomWords(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startVocabQuiz = () => {
    const base = getVocabQuizBasePool();
    if (base.length === 0) {
      const msg = vocabQuizScope === "learned"
        ? "No learned vocabulary yet. Mark words as learned first!"
        : vocabQuizScope === "custom"
          ? "Select at least one word for a custom quiz!"
          : "No vocabulary available for this pool!";
      showToast(msg);
      return;
    }
    const shuffled = base.sort(() => Math.random() - 0.5);
    const len = vocabQuizLength === "all" ? shuffled.length : Math.min(vocabQuizLength, shuffled.length);
    const pool = shuffled.slice(0, len);

    const first = pool[0];
    setVocabQuizPool(pool);
    setVocabQuizIndex(0);
    setVocabQuizCorrect(0);
    setVocabQuizXp(0);
    setVocabQuizWrong([]);
    setVocabQuizAnswerStatus(null);
    setVocabQuizSelectedAnswer(null);
    setVocabQuizItem(first);
    setVocabQuizChoices(generateVocabChoices(first, pool, vocabQuizMode));
    setVocabQuizPhase("quiz");
  };

  const handleVocabAnswer = (answer: string) => {
    if (!vocabQuizItem || vocabQuizAnswerStatus !== null) return;
    const correct = vocabQuizMode === "meaning" ? vocabQuizItem.english : vocabQuizItem.hiragana;
    const isCorrect = answer === correct;
    setVocabQuizSelectedAnswer(answer);
    setVocabQuizAnswerStatus(isCorrect ? "correct" : "incorrect");
    const xp = isCorrect ? 8 : 2;
    setVocabQuizXp(prev => prev + xp);
    if (isCorrect) { setVocabQuizCorrect(prev => prev + 1); playChime(true); }
    else { setVocabQuizWrong(prev => [...prev, vocabQuizItem!]); playChime(false); }
    setStats(prev => ({ ...prev, xp: prev.xp + xp }));
    setTimeout(() => {
      const nextIdx = vocabQuizIndex + 1;
      if (nextIdx >= vocabQuizPool.length) { setVocabQuizPhase("results"); return; }
      const next = vocabQuizPool[nextIdx];
      setVocabQuizItem(next);
      setVocabQuizChoices(generateVocabChoices(next, vocabQuizPool, vocabQuizMode));
      setVocabQuizAnswerStatus(null);
      setVocabQuizSelectedAnswer(null);
      setVocabQuizIndex(nextIdx);
    }, 1500);
  };
  // ── END VOCAB QUIZ HELPERS ──────────────────────────────────────────────────

  // ── KANJI QUIZ HELPERS ──────────────────────────────────────────────────────
  const generateKanjiChoices = (item: KanjiItem, mode: "meaning" | "reading"): string[] => {
    const correct = mode === "meaning" ? item.meaning : item.onyomi;
    const distractors: string[] = [];
    const shuffled = [...KANJI_DATA].filter(k => k.kanji !== item.kanji).sort(() => Math.random() - 0.5);
    for (const k of shuffled) {
      const val = mode === "meaning" ? k.meaning : k.onyomi;
      if (val !== correct && !distractors.includes(val)) distractors.push(val);
      if (distractors.length >= 3) break;
    }
    // Fallback: pad with random items from KANJI_DATA if we have too few unique distractors
    if (distractors.length < 3) {
      const fallbacks = [...KANJI_DATA].filter(k => k.kanji !== item.kanji).sort(() => Math.random() - 0.5);
      for (const k of fallbacks) {
        const val = mode === "meaning" ? k.meaning : k.onyomi;
        if (val !== correct && !distractors.includes(val)) distractors.push(val);
        if (distractors.length >= 3) break;
      }
    }
    return [correct, ...distractors].sort(() => Math.random() - 0.5);
  };

  const getKanjiQuizBasePool = () => {
    if (kanjiQuizScope === "studied") {
      return KANJI_DATA.filter(k => (stats.characterProgress[k.kanji]?.total || 0) > 0);
    }
    if (kanjiQuizScope === "custom") {
      return KANJI_DATA.filter(k => kanjiQuizCustomItems.has(k.kanji));
    }
    return [...KANJI_DATA];
  };

  const getKanjiQuizScopeLabel = () => {
    if (kanjiQuizScope === "studied") return "Studied kanji";
    if (kanjiQuizScope === "custom") return `${kanjiQuizCustomItems.size} selected`;
    return "All kanji";
  };

  const toggleKanjiQuizCustomItem = (item: KanjiItem) => {
    setKanjiQuizCustomItems(prev => {
      const next = new Set(prev);
      if (next.has(item.kanji)) next.delete(item.kanji);
      else next.add(item.kanji);
      return next;
    });
  };

  const startKanjiQuiz = () => {
    const base = getKanjiQuizBasePool();
    if (base.length === 0) {
      const msg = kanjiQuizScope === "studied"
        ? "No studied kanji yet. Study kanji first!"
        : kanjiQuizScope === "custom"
          ? "Select at least one kanji for a custom quiz!"
          : "No kanji data available!";
      showToast(msg);
      return;
    }
    const shuffled = base.sort(() => Math.random() - 0.5);
    const len = kanjiQuizLength === "all" ? shuffled.length : Math.min(kanjiQuizLength, shuffled.length);
    const pool = shuffled.slice(0, len);

    const first = pool[0];
    setKanjiQuizPool(pool);
    setKanjiQuizIndex(0);
    setKanjiQuizCorrect(0);
    setKanjiQuizXp(0);
    setKanjiQuizWrong([]);
    setKanjiQuizAnswerStatus(null);
    setKanjiQuizSelectedAnswer(null);
    setKanjiQuizItem(first);
    setKanjiQuizChoices(generateKanjiChoices(first, kanjiQuizMode));
    setKanjiQuizPhase("quiz");
  };

  const handleKanjiAnswer = (answer: string) => {
    if (!kanjiQuizItem || kanjiQuizAnswerStatus !== null) return;
    const correct = kanjiQuizMode === "meaning" ? kanjiQuizItem.meaning : kanjiQuizItem.onyomi;
    const isCorrect = answer === correct;
    setKanjiQuizSelectedAnswer(answer);
    setKanjiQuizAnswerStatus(isCorrect ? "correct" : "incorrect");
    const xp = isCorrect ? 10 : 0;
    setKanjiQuizXp(prev => prev + xp);
    if (isCorrect) { setKanjiQuizCorrect(prev => prev + 1); playChime(true); }
    else { setKanjiQuizWrong(prev => [...prev, kanjiQuizItem!]); playChime(false); }
    if (xp > 0) setStats(prev => ({ ...prev, xp: prev.xp + xp }));
    setTimeout(() => {
      const nextIdx = kanjiQuizIndex + 1;
      if (nextIdx >= kanjiQuizPool.length) { setKanjiQuizPhase("results"); return; }
      const next = kanjiQuizPool[nextIdx];
      setKanjiQuizItem(next);
      setKanjiQuizChoices(generateKanjiChoices(next, kanjiQuizMode));
      setKanjiQuizAnswerStatus(null);
      setKanjiQuizSelectedAnswer(null);
      setKanjiQuizIndex(nextIdx);
    }, 1800);
  };
  // ── END KANJI QUIZ HELPERS ──────────────────────────────────────────────────

  const startQuizSession = (mode: "choice" | "romaji" | "survival") => {
    // Collect selected stages & alphabet
    let alphabetPool: (HiraganaItem | KatakanaItem)[] = [];
    if (quizAlphabet === "hiragana") {
      alphabetPool = HIRAGANA_DATA;
    } else if (quizAlphabet === "katakana") {
      alphabetPool = KATAKANA_DATA;
    } else {
      alphabetPool = [...HIRAGANA_DATA, ...KATAKANA_DATA];
    }

    const matchedDeck = alphabetPool.filter((k) => selectedStages.includes(k.category));
    if (matchedDeck.length === 0) {
      showToast("Select at least one stage of characters from the menu settings!");
      return;
    }

    setQuizMode(mode);
    quizModeRef.current = mode;
    setAnswerStatus(null);
    setSelectedAnswer(null);
    setTypedInput("");

    // Reset session tracking
    setSessionCorrect(0);
    setSessionXpEarned(0);
    setSessionWrongChars([]);

    if (mode === "survival") {
      setSurvivalScore(0);
      setSurvivalTimeLeft(45);
      setMascotMood("idle");

      // Generate random pool for survival (pure random)
      const randomized = [...matchedDeck].sort(() => Math.random() - 0.5);
      setQuizPool(randomized);
      setQuizIndex(0);
      setupNewQuestion(randomized[0], matchedDeck, 45);
      setCurrentScreen("quiz");
    } else {
      // Adaptive weighting: characters with lower accuracy appear more often
      const weighted: (HiraganaItem | KatakanaItem)[] = [];
      for (const char of matchedDeck) {
        const prog = stats.characterProgress[char.kana];
        let weight = 2; // default: unseen chars appear twice
        if (prog && prog.total >= 2) {
          const accuracy = prog.correct / prog.total;
          // Perfect: weight 1, Struggling: weight up to 5
          weight = Math.max(1, Math.round((1 - accuracy) * 4) + 1);
        }
        for (let w = 0; w < weight; w++) weighted.push(char);
      }

      // Fisher-Yates shuffle the weighted pool, then pick 10 unique
      for (let i = weighted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
      }
      const seen = new Set<string>();
      const randomized: (HiraganaItem | KatakanaItem)[] = [];
      for (const char of weighted) {
        if (!seen.has(char.kana)) { seen.add(char.kana); randomized.push(char); }
        if (randomized.length >= 10) break;
      }
      // Fill up to 10 if deck was too small
      for (const char of matchedDeck) {
        if (randomized.length >= 10) break;
        if (!seen.has(char.kana)) { seen.add(char.kana); randomized.push(char); }
      }

      setQuizPool(randomized);
      setQuizIndex(0);
      setupNewQuestion(randomized[0], matchedDeck);
      setCurrentScreen("quiz");
    }
  };

  const setupNewQuestion = (question: HiraganaItem | KatakanaItem, sourceDeck: (HiraganaItem | KatakanaItem)[], overwriteTime?: number) => {
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setAnswerStatus(null);
    setTypedInput("");

    const options = generateChoices(question, sourceDeck, numChoices);
    setChoices(options);

    // Audio cue of Japanese character so user can listen on flash loads
    if (autoPronounce) {
      speakJapanese(question.kana);
    }

    // Reset countdowns — increment timerKey so the useEffect starts a fresh interval
    if (quizModeRef.current !== "survival") {
      const secondsNeeded = getTimerSecondsLimit();
      setTimerMax(secondsNeeded);
      setTimeLeft(secondsNeeded);
      setTimerKey(k => k + 1); // triggers the timer useEffect to restart cleanly
    }
  };

  // Controls study streak daily tick updates
  // FIX: All reads use functional prev to prevent stale-closure XP loss
  const awardXPAndIncrementAttempt = (wasCorrect: boolean, xpEarned: number) => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
    const characterName = currentQuestion?.kana || "unknown";

    setStats((prev) => {
      const existing = prev.studyDates || [];
      const updatedStudyDates = existing.includes(todayStr)
        ? existing
        : [...existing, todayStr];
      const studySet = new Set(updatedStudyDates);

      let currentStreak = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
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

      localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
      return updated;
    });
  };

  // 2. Countdown Timer Ticker Engine
  // timerKey increments every new question — each question gets its own clean interval epoch
  useEffect(() => {
    if (currentScreen !== "quiz") return;

    if (quizMode === "survival") {
      // Survival: 100ms ticks for smooth countdown bar
      timerRef.current = setInterval(() => {
        setSurvivalTimeLeft((prev) => {
          const next = Math.round((prev - 0.1) * 10) / 10;
          if (next <= 0) {
            clearInterval(timerRef.current!);
            handleSurvivalTimeExpired();
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      // Standard per-question timer (skip in relax mode)
      if (selectedDifficulty === "relax") return;

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimerExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // FIX: timerKey replaces currentQuestion — each new question bumps timerKey, giving a fresh interval
  }, [currentScreen, timerKey, quizMode, selectedDifficulty]);

  const handleTimerExpired = () => {
    playChime(false);
    setAnswerStatus("incorrect");
    setMascotMood("failure");
    awardXPAndIncrementAttempt(false, 0);

    setTimeout(() => {
      advanceQuizIndex();
    }, 2200);
  };

  const handleSurvivalTimeExpired = () => {
    playChime(false);
    showToast(`Time's up! Score: ${survivalScore}`);
    // FIX: Persist best survival score using functional update to avoid stale closure
    setStats((prev) => {
      if (survivalScore > (prev.survivalBestScore || 0)) {
        const updated = { ...prev, survivalBestScore: survivalScore };
        localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
    setCurrentScreen("menu");
  };

  // Submit multiple choice selection response
  const handleSelectChoice = (romaji: string) => {
    if (answerStatus !== null) return; // Prevent double taps during active timeouts
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(romaji);
    const correct = romaji === currentQuestion?.romaji;

    if (correct) {
      setAnswerStatus("correct");
      setMascotMood("success");
      playChime(true);

      if (quizMode === "survival") {
        setSurvivalScore((prev) => prev + 1);
        setSurvivalTimeLeft((prev) => Math.min(60, prev + 5));
        awardXPAndIncrementAttempt(true, 15);
        showToast("+5s added!");
      } else {
        const bonusMultiplier = selectedDifficulty === "legend" ? 25 : selectedDifficulty === "hard" ? 20 : 15;
        setSessionCorrect(prev => prev + 1);
        setSessionXpEarned(prev => prev + bonusMultiplier);
        awardXPAndIncrementAttempt(true, bonusMultiplier);
        showToast(`Correct! +${bonusMultiplier} XP`);
      }
    } else {
      setAnswerStatus("incorrect");
      setMascotMood("failure");
      playChime(false);

      if (quizMode === "survival") {
        setSurvivalTimeLeft((prev) => Math.max(0, prev - 8));
        awardXPAndIncrementAttempt(false, 0);
        showToast("Wrong! −8 seconds.");
      } else {
        if (currentQuestion) {
          setSessionWrongChars(prev => [...prev, { kana: currentQuestion.kana, romaji: currentQuestion.romaji }]);
        }
        awardXPAndIncrementAttempt(false, 0);
      }
    }

    // In survival mode auto-advance; in offline quiz show Next button
    if (quizMode === "survival") {
      setTimeout(() => { advanceQuizIndex(); }, 2200);
    } else {
      setWaitingForNext(true);
    }
  };

  // Check typed Romaji Spelling Answer
  const handleTypedSubmit = () => {
    if (answerStatus !== null) return;
    const cleanInput = typedInput.trim().toLowerCase();
    if (!cleanInput) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = cleanInput === currentQuestion?.romaji;
    if (isCorrect) {
      setAnswerStatus("correct");
      setMascotMood("success");
      playChime(true);
      const reward = selectedDifficulty === "legend" ? 35 : selectedDifficulty === "hard" ? 30 : 25;
      setSessionCorrect(prev => prev + 1);
      setSessionXpEarned(prev => prev + reward);
      awardXPAndIncrementAttempt(true, reward);
      showToast(`Marvelous! Typed Correctly. +${reward} XP`);
    } else {
      setAnswerStatus("incorrect");
      setMascotMood("failure");
      playChime(false);
      if (currentQuestion) {
        setSessionWrongChars(prev => [...prev, { kana: currentQuestion.kana, romaji: currentQuestion.romaji }]);
      }
      awardXPAndIncrementAttempt(false, 0);
    }

      // Show Next button instead of auto-advancing (offline only)
      setWaitingForNext(true);
  };

  const advanceQuizIndex = () => {
    setWaitingForNext(false);
    const nextIdx = quizIndex + 1;
    let alphabetPool: (HiraganaItem | KatakanaItem)[] = [];
    if (quizAlphabet === "hiragana") {
      alphabetPool = HIRAGANA_DATA;
    } else if (quizAlphabet === "katakana") {
      alphabetPool = KATAKANA_DATA;
    } else {
      alphabetPool = [...HIRAGANA_DATA, ...KATAKANA_DATA];
    }
    const rawDeck = alphabetPool.filter((k) => selectedStages.includes(k.category));

    if (quizMode === "survival") {
      // Continues infinitely inside survival mode by fetching randomized items
      setQuizIndex(nextIdx);
      const nextQ = rawDeck[Math.floor(Math.random() * rawDeck.length)];
      setupNewQuestion(nextQ, rawDeck);
    } else {
      if (nextIdx < quizPool.length) {
        setQuizIndex(nextIdx);
        setupNewQuestion(quizPool[nextIdx], rawDeck);
      } else {
        // Navigate to results screen with session summary
        playChime(true);
        setCurrentScreen("results");
        setMascotMood("success");
      }
    }
  };

  // Toggle stage selects from checklist
  const handleToggleStage = (stageCode: string) => {
    if (selectedStages.includes(stageCode)) {
      if (selectedStages.length > 1) {
        setSelectedStages((prev) => prev.filter((s) => s !== stageCode));
      } else {
        showToast("Enable at least one stage to practice!");
      }
    } else {
      setSelectedStages((prev) => [...prev, stageCode]);
    }
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
  };

  const handleContemplateKanji = () => {
  const activeKanji = KANJI_DATA[currentKanjiIndex].kanji;

  if (sessionStudiedKanji.has(activeKanji)) {
    showToast(`Already studied "${activeKanji}" this session!`);
    return;
  }
  sessionStudiedKanji.add(activeKanji);

  // FIX: Update both XP and characterProgress so Kanji Quiz "Studied" pool works
  setStats((prev) => {
    const prevProg = prev.characterProgress[activeKanji] || { correct: 0, total: 0 };
    const updated = {
      ...prev,
      xp: prev.xp + 40,
      characterProgress: {
        ...prev.characterProgress,
        [activeKanji]: {
          correct: prevProg.correct + 1,
          total: prevProg.total + 1,
        },
      },
    };
    localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze your strokes.");
      }

      setAnalysisResult(data);

      // Award XP increments depending on accuracy milestones
      let earnedXp = 10;
      if (data.score >= 85) {
        earnedXp = 40;
        setMascotMood("success");
        playChime(true);
        showToast(`Perfect! Astra-chan graded ${data.score}%: ${data.feedbackTitle}. +40 XP awarded!`);
      } else if (data.score >= 70) {
        earnedXp = 25;
        setMascotMood("success");
        playChime(true);
        showToast(`Great! Astra-chan graded ${data.score}%: ${data.feedbackTitle}. +25 XP awarded!`);
      } else if (data.score >= 50) {
        earnedXp = 15;
        setMascotMood("idle");
        showToast(`Good try! Astra-chan graded ${data.score}%: ${data.feedbackTitle}. +15 XP awarded!`);
      } else {
        earnedXp = 10;
        setMascotMood("failure");
        showToast(`Keep tracing! Astra-chan graded ${data.score}%: ${data.feedbackTitle}. +10 XP practice points!`);
      }

      // FIX: Use functional update to prevent stale-closure XP loss
      setStats((prev) => {
        const updated = { ...prev, xp: prev.xp + earnedXp };
        localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
        return updated;
      });

    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "Astra-chan couldn't reach her calligraphy scrolls. Check her secret energy talisman key!");
      setMascotMood("failure");
    } finally {
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
      localStorage.setItem("hirachan_master_stats_v1", JSON.stringify(updated));
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
    "Study tip: N5 covers about 100 Kanji and 300–500 everyday words. A little practice daily adds up fast!",
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
  const prevMoodRef        = useRef<"welcome" | "streak" | "success" | "failure" | "kanji" | "idle" | "clicked" | "learn-flashcard" | "learn-vocabs" | "survival-danger" | "wondering" | "afk" | "excited">("welcome");
  // Stable refs so the effect below never needs to re-run due to state changes
  const mascotMoodRef      = useRef(mascotMood);
  const currentScreenRef   = useRef(currentScreen);
  // Tracks the timestamp when the tab was hidden — setInterval is throttled in
  // background tabs, so visibilitychange is the reliable trigger instead
  const tabHiddenAtRef     = useRef<number | null>(null);

  useEffect(() => { mascotMoodRef.current = mascotMood; },    [mascotMood]);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  // Idle/AFK detection — runs once on mount, reads everything via refs
  useEffect(() => {
    const QUIZ_SCREENS = ["quiz", "kanji-quiz", "vocab-quiz", "review-deck"];

    // Helper: trigger "excited" return animation then restore prev mood
    const triggerExcitedReturn = () => {
      if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current);
      setMascotMood("excited");
      excitedTimeoutRef.current = setTimeout(() => {
        setMascotMood(prevMoodRef.current);
        excitedTimeoutRef.current = null;
      }, 4000);
    };

    // Helper: apply idle mood based on elapsed ms (shared by interval + visibilitychange)
    const applyIdleMood = (elapsed: number) => {
      if (QUIZ_SCREENS.includes(currentScreenRef.current)) return;
      const curMood = mascotMoodRef.current;

      if (elapsed >= 3 * 60 * 1000) {
        // 3 minutes → AFK
        if (curMood !== "afk" && curMood !== "excited") {
          if (curMood !== "wondering") prevMoodRef.current = curMood;
          setMascotMood("afk");
        }
      } else if (elapsed >= 15 * 1000) {
        // 15 seconds → wondering
        if (curMood !== "wondering" && curMood !== "afk" && curMood !== "excited") {
          prevMoodRef.current = curMood;
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

    window.addEventListener("click",      handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Interval still handles the case where the user is on the page but just not touching anything
    idleIntervalRef.current = setInterval(() => {
      applyIdleMood(Date.now() - lastInteractionRef.current);
    }, 15_000);

    return () => {
      window.removeEventListener("click",      handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleIntervalRef.current)   clearInterval(idleIntervalRef.current);
      if (excitedTimeoutRef.current) clearTimeout(excitedTimeoutRef.current);
    };
  }, []); // intentionally empty — all live values read through refs

  const handleMascotClick = () => {
    // Pick active random trivia and set speech override
    const randomIndex = Math.floor(Math.random() * MASCOT_TRIVIA.length);
    const selectedText = MASCOT_TRIVIA[randomIndex];
    setMascotSpeechOverride(selectedText);
    setMascotMood("clicked");
    playChime(true);
    showToast("Astra-chan responds to your call with native trivia!");

    // Clear override after 8.5 seconds — clear any previous timeout first
    if (mascotTimeoutRef.current) clearTimeout(mascotTimeoutRef.current);
    mascotTimeoutRef.current = setTimeout(() => {
      setMascotSpeechOverride(null);
      mascotTimeoutRef.current = null;
    }, 8500);
  };

  // ── ONLINE MULTIPLAYER FUNCTIONS ───────────────────────────────────────────

  /** Deterministic seeded PRNG for consistent cross-player question generation */
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  /** Build a deterministic question pool from the room seed and settings */
  const generateOnlineQuestionPool = (seed: number, alphabet: string, stages: string[], selectedChars?: string[], questionCount = 10): (HiraganaItem | KatakanaItem)[] => {
    let pool: (HiraganaItem | KatakanaItem)[] = [];
    if (alphabet === "hiragana") pool = HIRAGANA_DATA;
    else if (alphabet === "katakana") pool = KATAKANA_DATA;
    else pool = [...HIRAGANA_DATA, ...KATAKANA_DATA];

    // If selectedChars is provided and non-empty, use it directly (bypasses stages filter).
    // Otherwise fall back to the stages filter — preserves existing behaviour for old rooms.
    let matchedDeck: (HiraganaItem | KatakanaItem)[];
    if (selectedChars && selectedChars.length > 0) {
      const charSet = new Set(selectedChars);
      matchedDeck = pool.filter((k) => charSet.has(k.kana));
    } else {
      matchedDeck = pool.filter((k) => stages.includes(k.category));
    }
    if (matchedDeck.length === 0) return [];

    // Deterministic shuffle using seed
    const shuffled = [...matchedDeck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const rand = seededRandom(seed + i);
      const j = Math.floor(rand * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const targetCount = Math.min(questionCount, matchedDeck.length);

    // Pick the requested number of unique questions
    const seen = new Set<string>();
    const result: (HiraganaItem | KatakanaItem)[] = [];
    for (const char of shuffled) {
      if (!seen.has(char.kana)) { seen.add(char.kana); result.push(char); }
      if (result.length >= targetCount) break;
    }
    for (const char of matchedDeck) {
      if (result.length >= targetCount) break;
      if (!seen.has(char.kana)) { seen.add(char.kana); result.push(char); }
    }
    return result;
  };

  /** Clean up Firebase room listener */
  const cleanupOnlineRoom = () => {
    if (onlineTimerRef.current) {
      clearInterval(onlineTimerRef.current);
      onlineTimerRef.current = null;
    }
    if (onlineAutoAdvanceRef.current) {
      clearTimeout(onlineAutoAdvanceRef.current);
      onlineAutoAdvanceRef.current = null;
    }
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }
  };

  /** Navigate to the online multiplayer menu */
  const openOnlineMultiplayer = () => {
    setOnlinePhase("menu");
    setOnlineRoomCode("");
    setOnlineRoomState(null);
    setOnlineRole(null);
    setOnlineConnectionError(null);
    setOnlineAnswerLocked(false);
    setOnlineWinnerName(null);
    setOnlineShowResult(false);
    setCurrentScreen("online-multiplayer");
  };

  /** Host: create room with selected difficulty & quiz mode */
  const getOnlinePlayerQuestionIndex = (room: RoomState, role: "host" | "guest") => {
    if ((room.settings.multiplayerMode ?? "competitive") !== "parallel") return room.currentQuestion;
    return role === "host"
      ? room.parallelProgress?.hostIndex ?? 0
      : room.parallelProgress?.guestIndex ?? 0;
  };

  const getOnlinePlayerStartedAt = (room: RoomState, role: "host" | "guest") => {
    if ((room.settings.multiplayerMode ?? "competitive") !== "parallel") return room.questionStartedAt;
    return role === "host"
      ? room.parallelProgress?.hostStartedAt ?? room.questionStartedAt
      : room.parallelProgress?.guestStartedAt ?? room.questionStartedAt;
  };

  const getOnlinePlayerFinished = (room: RoomState, role: "host" | "guest") => {
    if ((room.settings.multiplayerMode ?? "competitive") !== "parallel") return false;
    return role === "host"
      ? !!room.parallelProgress?.hostFinished
      : !!room.parallelProgress?.guestFinished;
  };

  const handleCreateOnlineRoom = async () => {
    setOnlineIsConnecting(true);
    setOnlineConnectionError(null);
    try {
      await ensureSignedIn();
      const settings: RoomSettings = {
        alphabet: onlineAlphabet,
        difficulty: onlineDifficulty,
        questionCount: Math.min(onlineQuestionCount, onlinePickerSelectedChars.size),
        quizMode: onlineQuizMode,
        questionDuration: DURATION_MS[onlineDifficulty],
        stages: ["basic", "dakuon", "handakuon", "yoon"],
        multiplayerMode: onlineMultiplayerMode,
        selectedChars: onlinePickerSelectedChars.size > 0
          ? Array.from(onlinePickerSelectedChars)
          : undefined,
      };
      const name = onlineHostNameInput.trim() || profileName || "Witch Host";
      const code = await createRoom(name, settings, profileAvatar);
      setOnlineRoomCode(code);
      setOnlineRole("host");
      setOnlinePhase("lobby");

      cleanupOnlineRoom();
      const unsub = listenToRoom(code, (room) => {
        setOnlineRoomState(room);
      });
      unsubscribeRoomRef.current = unsub;
    } catch (err: any) {
      setOnlineConnectionError(err.message || "Failed to create room");
    } finally {
      setOnlineIsConnecting(false);
    }
  };

  /** Guest: join room via 6-char code */
  const handleJoinOnlineRoom = async () => {
    setOnlineIsConnecting(true);
    setOnlineConnectionError(null);
    try {
      await ensureSignedIn();
      const code = onlineJoinCode.trim().toUpperCase();
      if (code.length !== 6) {
        throw new Error("Enter a valid 6-character room code.");
      }
      const name = onlineJoinName.trim() || profileName || "Shadow Guest";
      await joinRoom(code, name, profileAvatar);
      setOnlineRoomCode(code);
      setOnlineRole("guest");
      setOnlinePhase("lobby");

      cleanupOnlineRoom();
      const unsub = listenToRoom(code, (room) => {
        setOnlineRoomState(room);
      });
      unsubscribeRoomRef.current = unsub;
    } catch (err: any) {
      setOnlineConnectionError(err.message || "Failed to join room");
    } finally {
      setOnlineIsConnecting(false);
    }
  };

  /** Host starts the duel */
  const handleStartOnlineGame = async () => {
    if (!onlineRoomCode || onlineRole !== "host") return;
    try {
      await advanceOnlineQuestion(onlineRoomCode, 0, onlineRoomState?.settings.questionCount || onlineQuestionCount);
    } catch (err: any) {
      setOnlineConnectionError(err.message || "Failed to start game");
    }
  };

  /** Submit answer — first correct wins the race */
  const handleOnlineSubmitAnswer = async (answer: string) => {
    if (!onlineRoomCode || !onlineRole || onlineAnswerLocked || !onlineRoomState) return;

    setOnlineAnswerLocked(true);

    const currentQIdx = getOnlinePlayerQuestionIndex(onlineRoomState, onlineRole);
    const question = onlineQuestionPoolRef.current[currentQIdx];
    if (!question) return;

    const isCorrect = answer.trim().toLowerCase() === question.romaji.toLowerCase();
    setOnlineAnswerStatus(isCorrect ? "correct" : "incorrect");
    playChime(isCorrect);

    const myName = onlineRole === "host"
      ? (onlineRoomState.hostName || "Host")
      : (onlineRoomState.guestName || "Guest");

    try {
      await submitOnlineAnswer(onlineRoomCode, onlineRole, currentQIdx, isCorrect, myName, questionStartedAtRef.current);
    } catch (err: any) {
      console.error("Submit answer failed:", err);
    }
  };

  /** Advance to next question — only host calls this */
  const goToNextOnlineQuestion = async () => {
    if (!onlineRoomCode || onlineRole !== "host" || !onlineRoomState) return;
    const nextIdx = onlineRoomState.currentQuestion + 1;
    try {
      await advanceOnlineQuestion(onlineRoomCode, nextIdx, onlineRoomState.settings.questionCount || 10);
    } catch (err: any) {
      console.error("Advance failed:", err);
    }
  };

  /** Leave room and cleanup */
  const handleLeaveOnlineRoom = async () => {
    if (onlineRoomCode && onlineRole) {
      try { await leaveRoom(onlineRoomCode, onlineRole); } catch (e) { /* silent */ }
    }
    cleanupOnlineRoom();
    setOnlinePhase("menu");
    setOnlineRoomCode("");
    setOnlineRoomState(null);
    setOnlineRole(null);
    setOnlineConnectionError(null);
    setOnlineAnswerLocked(false);
    setOnlineSelectedAnswer(null);
    setOnlineAnswerStatus(null);
    setOnlineWinnerName(null);
    setOnlineShowResult(false);
    setOnlineTypedAnswer("");
    setCurrentScreen("menu");
  };

  const returnToPracticeHub = () => {
    setActiveHubTab("practice");
    setCurrentScreen("menu");
  };

  /** Get source deck for choice generation based on alphabet */
  const getOnlineSourceDeck = (alphabet: string): (HiraganaItem | KatakanaItem)[] => {
    if (alphabet === "katakana") return KATAKANA_DATA;
    if (alphabet === "hiragana") return HIRAGANA_DATA;
    return [...HIRAGANA_DATA, ...KATAKANA_DATA];
  };

  /** Reset UI for a new question */
  const resetOnlineQuestionUI = (qIdx: number, pool: (HiraganaItem | KatakanaItem)[], settings: RoomState["settings"]) => {
    setOnlineAnswerLocked(false);
    setOnlineSelectedAnswer(null);
    setOnlineAnswerStatus(null);
    setOnlineWinnerName(null);
    setOnlineShowResult(false);
    setOnlineTypedAnswer("");

    if (pool.length > qIdx) {
      const sourceDeck = getOnlineSourceDeck(settings.alphabet);
      if (settings.quizMode === "choice") {
        setOnlineQuestionChoices(generateChoices(pool[qIdx], sourceDeck, numChoices));
      }
    }

    // Start local timer synced from Firebase
    const durationMs = settings.questionDuration || 10000;
    setOnlineTimerMax(Math.ceil(durationMs / 1000));
    setOnlineTimeLeft(Math.ceil(durationMs / 1000));
  };

  /** Auto-advance after a brief delay */
  const scheduleOnlineAutoAdvance = () => {
    if (onlineAutoAdvanceRef.current) clearTimeout(onlineAutoAdvanceRef.current);
    onlineAutoAdvanceRef.current = setTimeout(() => {
      goToNextOnlineQuestion();
    }, 2000);
  };

  // ── Rebuild the online character picker deck whenever the alphabet changes ──
  useEffect(() => {
    let deck: (HiraganaItem | KatakanaItem)[] = [];
    if (onlineAlphabet === "hiragana") deck = HIRAGANA_DATA;
    else if (onlineAlphabet === "katakana") deck = KATAKANA_DATA;
    else deck = [...HIRAGANA_DATA, ...KATAKANA_DATA];
    setOnlinePickerDeck(deck);
    setOnlinePickerSelectedChars(new Set(deck.map((c) => c.kana)));
  }, [onlineAlphabet]);

  // ── Online romaji input focus: mirrors the solo-quiz focus fix above but
  // keyed to the Firebase question index so both players stay in flow.
  useEffect(() => {
    if (onlinePhase !== "playing") return;
    const settings = onlineRoomState?.settings;
    if (!settings || settings.quizMode !== "romaji") return;
    const t = setTimeout(() => {
      onlineRomajiInputRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineRoomState?.currentQuestion, onlineRoomState?.parallelProgress?.hostIndex, onlineRoomState?.parallelProgress?.guestIndex, onlinePhase]);

  // ── Room state watcher: drives the entire game loop ──
  // FIX: Use a ref to track previous room state to avoid stale closures
  const prevRoomRef = useRef<RoomState | null>(null);

  useEffect(() => {
    if (!onlineRoomState || !onlineRoomCode) return;

    // Always sync scores
    setOnlineScores(onlineRoomState.scores);

    const prev = prevRoomRef.current;
    const wasWaiting = prev?.status === "waiting";
    const nowPlaying = onlineRoomState.status === "playing";
    const nowFinished = onlineRoomState.status === "finished";

    // waiting → playing: game started
    if (nowPlaying && onlinePhase !== "playing" && onlinePhase !== "finished") {
      const pool = generateOnlineQuestionPool(
        onlineRoomState.seed,
        onlineRoomState.settings.alphabet,
        onlineRoomState.settings.stages || ["basic", "dakuon", "handakuon", "yoon"],
        onlineRoomState.settings.selectedChars,
        onlineRoomState.settings.questionCount || 10
      );
      onlineQuestionPoolRef.current = pool;
      setOnlinePhase("playing");
      resetOnlineQuestionUI(0, pool, onlineRoomState.settings);
    }

    // playing → finished
    if (nowFinished && onlinePhase === "playing") {
      setOnlinePhase("finished");
      cleanupOnlineRoom();
    }

    // During play: handle question changes and answer results
    if (onlinePhase === "playing") {
      const isParallel = (onlineRoomState.settings.multiplayerMode ?? "competitive") === "parallel";
      if (isParallel) {
        prevRoomRef.current = onlineRoomState;
        return;
      }
      const qIdx = onlineRoomState.currentQuestion;
      const answers = onlineRoomState.answers?.[qIdx];
      const myRole = onlineRole;
      if (!myRole) return;

      const myTimeKey = myRole === "host" ? "hostTime" : "guestTime";
      const hasAnswered = answers?.[myTimeKey] !== undefined;

      // Handle winner display
      if (answers?.questionLocked && !onlineShowResult) {
        setOnlineShowResult(true);
        setOnlineWinnerName(answers.winnerName || null);

        // Lock my UI if I haven't answered yet
        if (!hasAnswered) {
          setOnlineAnswerLocked(true);
        }

        // Host schedules auto-advance
        if (onlineRole === "host") {
          scheduleOnlineAutoAdvance();
        }
      }

      // If question was locked with no winner (both wrong) and not yet showing result
      if (answers?.questionLocked && !answers.winnerName && !onlineShowResult) {
        setOnlineShowResult(true);
        setOnlineWinnerName(null); // signals "time up / both wrong"
        if (!hasAnswered) setOnlineAnswerLocked(true);
        if (onlineRole === "host") scheduleOnlineAutoAdvance();
      }
    }

    // Update prev ref
    prevRoomRef.current = onlineRoomState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineRoomState, onlinePhase, onlineRole, onlineRoomCode]);

  // ── Synchronized countdown timer ──
  useEffect(() => {
    if (!onlineRoomState || !onlineRole) {
      questionStartedAtRef.current = null;
      return;
    }
    questionStartedAtRef.current = getOnlinePlayerStartedAt(onlineRoomState, onlineRole) ?? null;
  }, [
    onlineRoomState?.questionStartedAt,
    onlineRoomState?.parallelProgress?.hostStartedAt,
    onlineRoomState?.parallelProgress?.guestStartedAt,
    onlineRole,
  ]);

  useEffect(() => {
    if (onlinePhase !== "playing" || !questionStartedAtRef.current) return;

    const durationMs = onlineRoomState?.settings?.questionDuration || 10000;

    // Clear old timer
    if (onlineTimerRef.current) {
      clearInterval(onlineTimerRef.current);
    }

    onlineTimerRef.current = setInterval(() => {
      // FIX #4: Read from ref to avoid stale closure
      const startedAt = questionStartedAtRef.current;
      if (!startedAt) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setOnlineTimeLeft(remaining);

      if (remaining <= 0) {
        // Time's up!
        if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);

        // If I haven't answered, lock me out
        const isParallel = (onlineRoomState?.settings.multiplayerMode ?? "competitive") === "parallel";
        const qIdx = onlineRoomState && onlineRole ? getOnlinePlayerQuestionIndex(onlineRoomState, onlineRole) : 0;
        const answers = onlineRoomState?.answers?.[qIdx];
        const myTimeKey = onlineRole === "host" ? "hostTime" : "guestTime";

        if (!answers || answers[myTimeKey] === undefined) {
          setOnlineAnswerLocked(true);
          // Submit a wrong answer to signal timeout
          const myName = onlineRole === "host"
            ? (onlineRoomState?.hostName || "Host")
            : (onlineRoomState?.guestName || "Guest");
          submitOnlineAnswer(onlineRoomCode, onlineRole!, qIdx, false, myName, questionStartedAtRef.current).catch(() => { });
        }

        // Competitive mode still uses host-driven shared auto-advance.
        if (!isParallel && onlineRole === "host") {
          scheduleOnlineAutoAdvance();
        }
      }
    }, 100);

    return () => {
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onlinePhase,
    onlineRoomState?.questionStartedAt,
    onlineRoomState?.currentQuestion,
    onlineRoomState?.parallelProgress?.hostIndex,
    onlineRoomState?.parallelProgress?.guestIndex,
    onlineRoomState?.parallelProgress?.hostStartedAt,
    onlineRoomState?.parallelProgress?.guestStartedAt,
  ]);

  // ── Watch for question index changes to reset UI ──
  useEffect(() => {
    if (onlinePhase !== "playing" || !onlineRoomState || !onlineRole) return;
    const qIdx = getOnlinePlayerQuestionIndex(onlineRoomState, onlineRole);
    const pool = onlineQuestionPoolRef.current;
    if (pool.length > qIdx) {
      resetOnlineQuestionUI(qIdx, pool, onlineRoomState.settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onlineRoomState?.currentQuestion,
    onlineRoomState?.parallelProgress?.hostIndex,
    onlineRoomState?.parallelProgress?.guestIndex,
    onlineRole,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupOnlineRoom();
    };
  }, []);

  // ── END ONLINE MULTIPLAYER FUNCTIONS ───────────────────────────────────────

  // ── FRIEND SYSTEM FUNCTIONS ────────────────────────────────────────────────

  /** Ensure Firebase identity exists and publish this player's profile */
  useEffect(() => {
    let cancelled = false;
    ensureSignedIn()
      .then(async (user) => {
        if (cancelled) return;
        const savedName = localStorage.getItem("astra_profile_name") || "Astra Scholar";
        setMyUid(user.uid);
        setProfileName(savedName);
        setProfileNameInput(savedName);
        setOnlineHostNameInput((current) => current || savedName);
        setOnlineJoinName((current) => current || savedName);
        try {
          await saveUserProfile(savedName, profileAvatar);
        } catch (err: any) {
          if (!cancelled) setProfileError(err.message || "Profile sync failed");
        }
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

    const unsubInvites = listenToInvites(setIncomingInvites);
    unsubscribeInvitesRef.current = unsubInvites;

    return () => {
      if (unsubscribeFriendsRef.current) unsubscribeFriendsRef.current();
      if (unsubscribeInvitesRef.current) unsubscribeInvitesRef.current();
    };
  }, [myUid]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await ensureSignedIn();
      const profile = await saveUserProfile(profileNameInput, profileAvatar);
      localStorage.setItem("astra_profile_name", profile.name);
      setProfileName(profile.name);
      setProfileNameInput(profile.name);
      setOnlineHostNameInput(profile.name);
      setOnlineJoinName(profile.name);
      setMyUid(profile.uid);
      showToast("Profile saved");
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddFriend = async () => {
    setIsAddingFriend(true);
    setAddFriendError(null);
    try {
      await ensureSignedIn();
      await addFriend(friendUidInput.trim(), friendNameInput.trim() || "Friend");
      showToast(`Friend added successfully!`);
      setFriendUidInput("");
      setFriendNameInput("");
    } catch (err: any) {
      setAddFriendError(err.message || "Failed to add friend");
    } finally {
      setIsAddingFriend(false);
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
    if (!onlineRoomCode) {
      showToast("Create a room first to invite friends!");
      return;
    }
    try {
      const myName = onlineRole === "host"
        ? (onlineRoomState?.hostName || "Host")
        : (onlineRoomState?.guestName || "Guest");
      await sendRoomInvite(friendUid, onlineRoomCode, myName);
      showToast("Invite sent!");
    } catch (err: any) {
      showToast(err.message || "Failed to send invite");
    }
  };

  const handleAcceptInvite = async (invite: RoomInvite) => {
    try {
      await ensureSignedIn();
      await clearInvite(invite.id);
      const name = profileName || profileNameInput || "Shadow Guest";
      await joinRoom(invite.roomCode, name, profileAvatar);
      cleanupOnlineRoom();
      const unsub = listenToRoom(invite.roomCode, (room) => {
        setOnlineRoomState(room);
      });
      unsubscribeRoomRef.current = unsub;
      setOnlineJoinCode(invite.roomCode);
      setOnlineJoinName(name);
      setOnlineRoomCode(invite.roomCode);
      setOnlineRole("guest");
      setCurrentScreen("online-multiplayer");
      setOnlinePhase("lobby");
      setOnlineConnectionError(null);
      showToast(`Joined room ${invite.roomCode}!`);
    } catch (err: any) {
      showToast(err.message || "Failed to accept invite");
    }
  };

  const handleDismissInvite = async (inviteId: string) => {
    try {
      await clearInvite(inviteId);
    } catch { /* silent */ }
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

  // Props for the extracted MenuScreen component (Phase 1 of the App.tsx split).
  const menuScreenProps = {
    setCurrentScreen,
    setCurrentKanjiIndex,
    setVocabQuizPhase,
    setKanjiQuizPhase,
    openOnlineMultiplayer,
    openCharPicker,
    showStudyRoom,
    setShowStudyRoom,
    activeHubTab,
    setActiveHubTab,
    mascotMood,
    setMascotMood,
    setIsMusicExpanded,
    setIsAtmosphereExpanded,
    dueCount,
    totalCount,
    getDueCards,
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
    stats,
    setStats,
    showToast,
    hasCard,
    addCard,
    quizAlphabet,
    setQuizAlphabet,
    selectedStages,
    handleToggleStage,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedJapaneseVoiceURI,
    handleSelectJapaneseVoice,
    availableJapaneseVoices,
    autoPronounce,
    setAutoPronounce,
    numChoices,
    setNumChoices,
  };

  // Props for the extracted ResultsScreen component (Phase 2 of the App.tsx split).
  const resultsScreenProps = {
    sessionCorrect,
    quizPool,
    sessionXpEarned,
    sessionWrongChars,
    quizMode,
    speakJapanese,
    openCharPicker,
    setCurrentScreen,
    setMascotMood,
    setArchiveFilter,
  };

  // Props for the extracted VocabQuizScreen component (Phase 3 of the App.tsx split).
  const vocabQuizScreenProps = {
    vocabQuizPhase,
    vocabQuizMode,
    vocabQuizScope,
    vocabQuizLength,
    vocabQuizCustomWords,
    vocabQuizPool,
    vocabQuizIndex,
    vocabQuizItem,
    vocabQuizChoices,
    vocabQuizSelectedAnswer,
    vocabQuizAnswerStatus,
    vocabQuizCorrect,
    vocabQuizWrong,
    vocabQuizXp,
    vocabularyData: VOCABULARY_DATA,
    vocabsCategory,
    stats,
    speakJapanese,
    setVocabQuizPhase,
    setVocabQuizMode,
    setVocabQuizScope,
    setVocabQuizLength,
    setVocabQuizCustomWords,
    getVocabQuizScopeLabel,
    getVocabQuizKey,
    toggleVocabQuizCustomWord,
    startVocabQuiz,
    returnToPracticeHub,
    handleVocabAnswer,
  };

  // Props for the extracted KanjiQuizScreen component (Phase 4 of the App.tsx split).
  const kanjiQuizScreenProps = {
    kanjiQuizPhase,
    kanjiQuizMode,
    kanjiQuizScope,
    kanjiQuizLength,
    kanjiQuizCustomItems,
    kanjiQuizPool,
    kanjiQuizIndex,
    kanjiQuizItem,
    kanjiQuizChoices,
    kanjiQuizSelectedAnswer,
    kanjiQuizAnswerStatus,
    kanjiQuizCorrect,
    kanjiQuizWrong,
    kanjiQuizXp,
    kanjiData: KANJI_DATA,
    stats,
    speakJapanese,
    setKanjiQuizPhase,
    setKanjiQuizMode,
    setKanjiQuizScope,
    setKanjiQuizLength,
    setKanjiQuizCustomItems,
    getKanjiQuizScopeLabel,
    toggleKanjiQuizCustomItem,
    startKanjiQuiz,
    returnToPracticeHub,
    handleKanjiAnswer,
  };

  // Props for the extracted QuizScreen component (Phase 5 of the App.tsx split).
  const quizScreenProps = {
    currentQuestion,
    quizMode,
    quizIndex,
    quizPool,
    survivalScore,
    survivalTimeLeft,
    selectedDifficulty,
    timeLeft,
    timerMax,
    answerStatus,
    typedInput,
    choices,
    selectedAnswer,
    waitingForNext,
    speakJapanese,
    setCurrentScreen,
    setTypedInput,
    handleTypedSubmit,
    handleSelectChoice,
    advanceQuizIndex,
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
    handleDownloadProgress,
    handleAddFriend,
    handleInviteFriend,
    handleRemoveFriend,
    language,
    setLanguage,
    theme,
    setTheme,
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
    activeBgScene,
    setActiveBgScene,
  };

  // Props for the extracted ReviewDeckScreen component (Phase 8 of the App.tsx split).
  const reviewDeckScreenProps = {
    srsQueue,
    srsQueueIndex,
    setSrsQueueIndex,
    srsRevealed,
    setSrsRevealed,
    answerCard,
    awardSRSXP,
    playChime,
    setCurrentScreen,
    totalCount,
  };

  // Props for the extracted OnlineMultiplayerScreen component (Phase 9 of the App.tsx split).
  const onlineMultiplayerScreenProps = {
    onlinePhase,
    setOnlinePhase,
    onlineRoomCode,
    onlineRoomState,
    onlineRole,
    onlineHostNameInput,
    setOnlineHostNameInput,
    onlineJoinCode,
    setOnlineJoinCode,
    onlineJoinName,
    setOnlineJoinName,
    onlineAnswerLocked,
    onlineQuestionChoices,
    onlineAnswerStatus,
    onlineIsConnecting,
    onlineConnectionError,
    setOnlineConnectionError,
    onlineDifficulty,
    setOnlineDifficulty,
    onlineQuizMode,
    setOnlineQuizMode,
    onlineTypedAnswer,
    setOnlineTypedAnswer,
    onlineTimeLeft,
    onlineMultiplayerMode,
    setOnlineMultiplayerMode,
    onlineTimerMax,
    onlineShowResult,
    onlineRomajiInputRef,
    onlineQuestionPoolRef,
    onlineAlphabet,
    setOnlineAlphabet,
    onlinePickerDeck,
    onlinePickerSelectedChars,
    setOnlinePickerSelectedChars,
    onlineQuestionCount,
    setOnlineQuestionCount,
    quizMode,
    friends,
    showToast,
    speakJapanese,
    setCurrentScreen,
    handleCreateOnlineRoom,
    handleJoinOnlineRoom,
    handleStartOnlineGame,
    handleOnlineSubmitAnswer,
    handleLeaveOnlineRoom,
    handleInviteFriend,
    getOnlinePlayerQuestionIndex,
    getOnlinePlayerFinished,
  };
  // ──── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-natural-charcoal font-sans overflow-x-hidden flex flex-col justify-between py-2 px-4 relative bg-natural-bg transition-colors duration-300">
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
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
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
      </div>

      {/* 2. Interactive animated magical witch rain & floating runes background atmosphere */}
      <AtmosphereCanvas
        animationType={bgAnimationType}
        intensity={bgIntensity}
        theme={theme}
      />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl border border-natural-clay/40 bg-natural-card text-natural-clay text-xs font-mono shadow-xl flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin text-natural-clay" />
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= CHARACTER PICKER MODAL ================= */}
      <AnimatePresence>
        {showCharPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCharPicker(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[88vh] bg-natural-card border border-natural-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Picker Header ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-natural-border shrink-0">
                <div>
                  <h3 className="font-serif text-lg font-bold text-natural-forest flex items-center gap-2">
                    {pendingQuizMode === "survival" ? "🕯️" : pendingQuizMode === "romaji" ? <PenTool className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    Choose Your Characters
                  </h3>
                  <p className="text-[11px] text-natural-sage font-mono mt-0.5 tracking-wide">
                    Pick which kana appear in your quiz
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCharPicker(false)}
                  className="p-2 rounded-xl border border-natural-border text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Scrollable character grid (grouped by kana row) ── */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 min-h-0">
                {(() => {
                  // Build ordered group map preserving original deck order
                  const groupOrder: string[] = [];
                  const groupMap: Record<string, (HiraganaItem | KatakanaItem)[]> = {};
                  for (const char of pickerDeck) {
                    if (!groupMap[char.group]) {
                      groupOrder.push(char.group);
                      groupMap[char.group] = [];
                    }
                    groupMap[char.group].push(char);
                  }

                  return groupOrder.map((group) => {
                    const chars = groupMap[group];
                    const allSelected = chars.every((c) => pickerSelectedChars.has(c.kana));

                    return (
                      <div key={group} className="flex flex-col gap-2">
                        {/* Row label + Select All / Clear All */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-natural-sage uppercase tracking-widest">
                            {group}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPickerSelectedChars((prev) => {
                                  const next = new Set(prev);
                                  chars.forEach((c) => next.add(c.kana));
                                  return next;
                                });
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${allSelected
                                ? "border-natural-forest bg-natural-forest/10 text-natural-forest"
                                : "border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                              }`}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPickerSelectedChars((prev) => {
                                  const next = new Set(prev);
                                  chars.forEach((c) => next.delete(c.kana));
                                  return next;
                                });
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-terracotta/70 hover:text-natural-terracotta transition cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* Character cells */}
                        <div className="flex flex-wrap gap-1.5">
                          {chars.map((char) => {
                            const isSelected = pickerSelectedChars.has(char.kana);
                            return (
                              <button
                                key={char.kana}
                                type="button"
                                title={char.romaji}
                                onClick={() => {
                                  setPickerSelectedChars((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(char.kana)) next.delete(char.kana);
                                    else next.add(char.kana);
                                    return next;
                                  });
                                }}
                                className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl border text-center transition-all duration-150 cursor-pointer select-none ${
                                  isSelected
                                    ? "bg-natural-forest border-natural-forest text-natural-bg shadow-sm scale-105"
                                    : "bg-natural-bg/50 border-natural-border text-natural-charcoal hover:border-natural-forest/50 hover:bg-natural-bg"
                                }`}
                              >
                                <span className="text-lg font-bold font-serif leading-none">{char.kana}</span>
                                <span className={`text-[8px] font-mono mt-0.5 tracking-wide ${isSelected ? "text-natural-bg/70" : "text-natural-sage"}`}>
                                  {char.romaji}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* ── Footer: quiz length + count + action buttons ── */}
              <div className="px-5 py-4 border-t border-natural-border flex flex-col gap-3 bg-natural-card/90 shrink-0">
                {/* Quiz length selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] font-semibold text-natural-forest-light font-mono uppercase tracking-wider shrink-0">
                    Questions
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {([10, 20, 30, "all"] as const).map((len) => (
                      <button
                        key={String(len)}
                        type="button"
                        onClick={() => setQuizLength(len)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          quizLength === len
                            ? "bg-natural-forest border-natural-forest text-natural-bg shadow-sm"
                            : "bg-natural-bg/50 border-natural-border text-natural-charcoal hover:border-natural-forest/50 hover:bg-natural-bg"
                        }`}
                      >
                        {len === "all" ? `All (${pickerSelectedChars.size})` : len}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count pill + cancel + start */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs font-mono text-natural-sage">
                    <span className={`font-bold ${pickerSelectedChars.size < 3 ? "text-natural-terracotta" : "text-natural-forest"}`}>
                      {pickerSelectedChars.size}
                    </span>
                    {" "}char{pickerSelectedChars.size !== 1 ? "s" : ""} selected
                    {quizLength !== "all" && pickerSelectedChars.size >= 3 && (
                      <span className="text-natural-sage"> · {quizLength} questions</span>
                    )}
                    {pickerSelectedChars.size < 3 && (
                      <span className="text-natural-terracotta"> · need at least 3</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCharPicker(false)}
                      className="px-4 py-2 rounded-xl border border-natural-border text-natural-forest-light text-xs font-bold hover:bg-natural-bg/40 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmStartQuiz}
                      disabled={pickerSelectedChars.size < 3}
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 ${
                        pickerSelectedChars.size >= 3
                          ? "bg-natural-forest text-natural-bg hover:bg-natural-forest-light"
                          : "bg-natural-border text-natural-sage cursor-not-allowed"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Quiz
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Invites Dropdown */}
      <AnimatePresence>
        {incomingInvites.length > 0 && (
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
      <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col z-10 relative">

        {/* APP HEADER */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-b border-natural-border/60 mb-4">
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
                      animate={{
                        scale: [1, 1.2, 0.95, 1.15, 1],
                        rotate: [-3, 3, -1, 2, -3],
                      }}
                      transition={{
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
                {incomingInvites.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-natural-terracotta text-natural-bg rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {incomingInvites.length}
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
                            <h4 className="font-serif font-extrabold text-natural-forest text-sm truncate">My Progress</h4>
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
                        Friends ({friends.length})
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
                              <input
                                type="text"
                                value={friendNameInput}
                                onChange={(e) => setFriendNameInput(e.target.value)}
                                placeholder="Name (opt)"
                                className="w-20 px-2 py-1.5 bg-natural-bg border border-natural-border rounded-lg text-[11px] font-mono text-natural-charcoal outline-none focus:border-natural-forest"
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
                                      {onlineRoomCode && (
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
        </header>


        {/* WITCH'S GRIMOIRE ATMOSPHERE SETUP CONTROLS */}
        <div id="witch-grimoire-controls" className="mb-3 bg-natural-card/50 border border-natural-border/60 p-3 rounded-2xl shadow-sm relative overflow-hidden backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsAtmosphereExpanded((value) => !value)}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <p className="text-xs font-semibold text-natural-forest-light">Atmosphere</p>
            </div>
            <span className="flex items-center gap-2 text-[10px] font-mono font-bold text-natural-forest-light">
              Scene {activeBgScene + 1} · {bgAnimationType === "none" ? "No FX" : `${bgAnimationType} FX`}
              {isAtmosphereExpanded ? <ChevronLeft className="w-3.5 h-3.5 rotate-90" /> : <ChevronRight className="w-3.5 h-3.5 rotate-90" />}
            </span>
          </button>

          {isAtmosphereExpanded && (
          <div className="mt-3 flex items-center flex-wrap gap-2.5">
            {/* 0. Background Scene Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">Scene</span>
              <div className="flex items-center bg-natural-card/85 p-1 rounded-xl border border-natural-border/75 gap-0.5">
                {[
                  { idx: 0, label: "🌫️", title: "Misty Sakura Path" },
                  { idx: 1, label: "🌸", title: "Sakura Train" },
                  { idx: 2, label: "✨", title: "Night Sparkler" },
                  { idx: 3, label: "🌧️", title: "Rainy Window Anime" },
                ].map((scene) => (
                  <button
                    key={scene.idx}
                    type="button"
                    title={scene.title}
                    onClick={() => {
                      setActiveBgScene(scene.idx);
                      showToast(`Scene: ${scene.title}`);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeBgScene === scene.idx
                      ? "bg-natural-forest text-natural-bg shadow-sm"
                      : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                      }`}
                  >
                    {scene.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 1. Theme Toggle Pill (Light / Dark) */}
            <div className="flex items-center bg-natural-card/85 p-1 rounded-xl border border-natural-border/75">
              <button
                type="button"
                id="toggle-theme-light"
                onClick={() => {
                  setTheme("light");
                  showToast("Light mode on!");
                }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${theme === "light"
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                  }`}
                title="Washi Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                type="button"
                id="toggle-theme-dark"
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${theme === "dark"
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-[#BCA3F0] hover:bg-natural-bg/40"
                  }`}
                onClick={() => {
                  setTheme("dark");
                  showToast("Dark mode on!");
                }}
                title="Witchy Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
            </div>

            {/* 1b. Font Style Toggle Pill (Digital / Written) */}
            <div className="flex items-center bg-natural-card/85 p-1 rounded-xl border border-natural-border/75">
              <button
                type="button"
                id="toggle-font-digital"
                onClick={() => {
                  setFontStyle("digital");
                  showToast("Digital font on!");
                }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition cursor-pointer ${fontStyle === "digital"
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                  }`}
                title="Noto Sans JP — Clean & Digital"
              >
                <span className="font-mono text-[10px]">Aa</span>
                Digital
              </button>
              <button
                type="button"
                id="toggle-font-written"
                onClick={() => {
                  setFontStyle("written");
                  showToast("Written font on!");
                }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition cursor-pointer ${fontStyle === "written"
                  ? "bg-natural-forest text-natural-bg shadow-sm"
                  : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                  }`}
                title="Klee One — Handwritten & Warm"
              >
                <span className="text-[11px]">書</span>
                Written
              </button>
            </div>

            {/* 2. Particle Type Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">FX</span>
              <select
                id="effect-type-selector"
                value={bgAnimationType}
                onChange={(e) => {
                  const val = e.target.value as "letters" | "rain" | "both" | "none";
                  setBgAnimationType(val);
                  showToast(`Effect: ${val}`);
                }}
                className="bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-natural-forest transition"
              >
                <option value="both">Runes &amp; Rain</option>
                <option value="letters">Floating Runes</option>
                <option value="rain">Gentle Rain</option>
                <option value="none">None</option>
              </select>
            </div>

            {/* 3. Intensity Level Selector Dropdown */}
            {bgAnimationType !== "none" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-natural-sage font-semibold">Intensity</span>
                <select
                  id="intensity-selector"
                  value={bgIntensity}
                  onChange={(e) => {
                    const val = e.target.value as "low" | "medium" | "high";
                    setBgIntensity(val);
                    showToast(`Intensity: ${val}`);
                  }}
                  className="bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-natural-forest transition"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}

            {/* 4. Backdrop Blur Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">Blur</span>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={bgBlur}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBgBlur(val);
                }}
                className="w-20 h-1 bg-natural-border rounded-lg appearance-none cursor-pointer accent-natural-forest hover:accent-natural-clay transition"
                title={`Background blur: ${bgBlur === 0 ? "None" : bgBlur.toFixed(1) + "px"}`}
              />
              <span className="text-[10px] font-mono text-natural-forest font-bold min-w-8">
                {bgBlur === 0 ? "Off" : `${bgBlur.toFixed(0)}px`}
              </span>
            </div>

            {/* 5. Backdrop Opacity Preset */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">Opacity</span>
              <select
                id="bg-opacity-selector"
                value={bgOpacity}
                onChange={(e) => {
                  const val = e.target.value as "very-dim" | "low" | "medium" | "vivid";
                  setBgOpacity(val);
                  showToast(`Opacity: ${val}`);
                }}
                className="bg-natural-card border border-natural-border/80 text-natural-forest text-[11px] font-bold font-serif px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none focus:border-natural-forest transition"
              >
                <option value="very-dim">Dim (10%)</option>
                <option value="low">Soft (25%)</option>
                <option value="medium">Balanced (45%)</option>
                <option value="vivid">Vivid (70%)</option>
              </select>
            </div>
          </div>
          )}
        </div>

        {/* ZEN COZY SOUNDSCAPE MUSIC STATION */}
        <div id="zen-soundscape-station" className="mb-3 bg-natural-card/50 border border-natural-border/60 p-3 rounded-2xl shadow-sm relative overflow-hidden backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsMusicExpanded((value) => !value)}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎵</span>
              <p className="text-xs font-semibold text-natural-forest-light">Music</p>
            </div>
            <span className="flex items-center gap-2 text-[10px] font-mono font-bold text-natural-forest-light">
              {isMusicPlaying ? "Playing" : "Paused"} · {Math.round(musicVolume * 100)}%
              {isMusicExpanded ? <ChevronLeft className="w-3.5 h-3.5 rotate-90" /> : <ChevronRight className="w-3.5 h-3.5 rotate-90" />}
            </span>
          </button>

          {isMusicExpanded && (
          <div className="mt-3 flex items-center flex-wrap gap-3 w-full md:justify-end">
            {/* Music source / track selection */}
            <div className="flex flex-col gap-1.5 w-full md:w-auto">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">Track</span>
              <div className="flex items-center gap-1 bg-natural-card/85 p-1 rounded-xl border border-natural-border/75 flex-wrap">
                {[
                  { id: "ten_no_yowai" as const, label: "🌸 天ノ弱", title: "Akie - 天ノ弱 Piano Cover" },
                  { id: "one_voice" as const, label: "🎤 One Voice", title: "Rokudenashi - One Voice" },
                  { id: "amakigoe" as const, label: "🌧️ 雨き声残響", title: "Akie - 雨き声残響 (Rain Voice Echo)" },
                  { id: "sparkle" as const, label: "✨ スパークル", title: "RADWIMPS - スパークル (Your Name)" },
                  { id: "columbinas_lullaby" as const, label: "🎭 Columbina's Lullaby", title: "Columbina's Lullaby — Shania Yan Cover" },
                ].map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    title={track.title}
                    onClick={() => {
                      playClickTick();
                      setSelectedMusicTrack(track.id);
                      if (!isMusicPlaying) {
                        setIsMusicPlaying(true);
                        showToast(`Now playing: ${track.label}!`);
                      } else {
                        showToast(`Switched to: ${track.label}!`);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition cursor-pointer whitespace-nowrap ${selectedMusicTrack === track.id
                      ? "bg-natural-forest text-natural-bg shadow-sm"
                      : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40 font-semibold"
                      }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Play / Pause */}
            <button
              type="button"
              onClick={() => {
                playClickTick();
                const newVal = !isMusicPlaying;
                setIsMusicPlaying(newVal);
                if (newVal) {
                  const trackName = selectedMusicTrack === "ten_no_yowai"
                    ? "天ノ弱 Piano Cover"
                      : selectedMusicTrack === "one_voice"
                        ? "One Voice"
                        : selectedMusicTrack === "amakigoe"
                          ? "雨き声残響 (Akie)"
                          : selectedMusicTrack === "columbinas_lullaby"
                            ? "Columbina's Lullaby"
                            : "スパークル — Your Name";
                  showToast(`Now playing: ${trackName}`);
                } else {
                  showToast("Music paused.");
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold tracking-wide transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${isMusicPlaying
                ? "bg-natural-clay text-natural-bg border-natural-clay animate-pulse"
                : "bg-natural-card border-natural-border text-natural-forest hover:border-natural-forest"
                }`}
            >
              {isMusicPlaying ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  Playing
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Paused
                </>
              )}
            </button>

            {/* Volume dial */}
            <div className="flex items-center gap-1.5 pl-1.5">
              <span className="text-[10px] font-mono text-natural-sage font-semibold">Vol</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMusicVolume(val);
                }}
                className="w-16 h-1 bg-natural-border rounded-lg appearance-none cursor-pointer accent-natural-forest hover:accent-natural-clay transition"
              />
              <span className="text-[10px] font-mono text-natural-forest font-bold min-w-8">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          </div>
          )}
        </div>

        {/* COMPANION STATUS BOARD */}
        <div id="companion-section-wrapper" className="mb-4">
          <MascotCompanion
            mood={mascotMood}
            streak={stats.streakCount}
            xp={stats.xp}
            selectedChar={currentScreen === "kanji-scroll" ? KANJI_DATA[currentKanjiIndex].kanji : undefined}
            speechOverride={mascotSpeechOverride}
            onClickCompanion={handleMascotClick}
          />
        </div>

        {/* MAIN ROUTER SWITCH CONTAINER */}
        <main className="flex-grow flex flex-col justify-center">

          {/* ================= SCREEN 1: MENU ================= */}
          {currentScreen === "menu" && <MenuScreen {...menuScreenProps} />}

          {/* ================= SCREEN 2: ACTIVE QUIZ WORKSPACE ================= */}
          {currentScreen === "quiz" && currentQuestion && <QuizScreen {...quizScreenProps} />}

          {/* ================= SCREEN 3: DYNAMIC DAILY KANJI MODULE ================= */}
          {currentScreen === "kanji-scroll" && <KanjiScrollScreen {...kanjiScrollScreenProps} />}

          {/* ================= SCREEN 4b: QUIZ RESULTS ================= */}
          {currentScreen === "results" && <ResultsScreen {...resultsScreenProps} />}

          {/* ================= SCREEN: VOCAB QUIZ ================= */}
          {currentScreen === "vocab-quiz" && <VocabQuizScreen {...vocabQuizScreenProps} />}

          {/* ================= SCREEN: KANJI QUIZ ================= */}
          {currentScreen === "kanji-quiz" && <KanjiQuizScreen {...kanjiQuizScreenProps} />}

          {/* ================= SCREEN 5: ONLINE SPEED DUEL ================= */}
          {currentScreen === "online-multiplayer" && <OnlineMultiplayerScreen {...onlineMultiplayerScreenProps} />}

          {/* ================= SCREEN 4: PROFILE ANALYTICS ARCHIVES ================= */}
          {currentScreen === "profile" && <ProfileScreen {...profileScreenProps} />}

          {/* ================= SCREEN: REFERENCE CHARTS ================= */}
          {currentScreen === "charts" && (
            <ReferenceCharts onBack={() => setCurrentScreen("menu")} />
          )}

          {/* ================= SCREEN: GRAMMAR DOJO ================= */}
          {currentScreen === "grammar-dojo" && (
            <GrammarDojo onBack={() => setCurrentScreen("menu")} onAwardXP={(xp) => awardXPAndIncrementAttempt(true, xp)} />
          )}

          {/* ================= SCREEN: SRS REVIEW DECK ================= */}
          {currentScreen === "review-deck" && <ReviewDeckScreen {...reviewDeckScreenProps} />}


        </main>

        {/* FOOTER METRICS AND CREDITS */}
        <footer className="text-center py-4 border-t border-natural-border mt-6 relative select-none">
          <p className="text-xs text-natural-forest-light font-serif italic mb-1">
            Keep studying — every character brings you closer to fluency. 🌸
          </p>
          <span className="text-[9px] text-[#7A8E7C] font-mono tracking-widest uppercase font-bold">
            Progress saved automatically
          </span>
        </footer>

      </div>
    </div>
  );
}
