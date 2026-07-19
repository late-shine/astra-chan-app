import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Download, 
  Flame, 
  Loader2, 
  Mail, 
  Upload, 
  User, 
  UserMinus, 
  UserPlus, 
  Sparkles, 
  Shield, 
  Volume2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import type { HiraganaItem, KatakanaItem, KanjiItem, StudentStats, VocabularyItem } from "../types";
import type { FriendRecord } from "../multiplayerOnline";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type ProfileCharSet = "hiragana" | "katakana";
type ArchiveFilter = string;
type CalViewDate = { year: number; month: number };

// Complete English/Japanese translation mapping for absolute visual polish
const TRANSLATIONS = {
  en: {
    backBtn: "Back to Sanctuary",
    title: "Learning Record",
    subtitle: "Character Mastery & Achievements",
    identity: "My Identity",
    identityDesc: "Share your unique code to invite companions",
    copyCode: "Copy Friend Code",
    displayName: "Display Name",
    placeholderName: "Choose calligrapher name",
    saveBtn: "Save",
    assignedCode: "Assigned Friend Code",
    exportBtn: "Export Progress Archive",
    importBtn: "Import Progress Archive",
    xpProgress: "Scholar XP Progression",
    grandArchivist: "XP to Grand Archivist",
    accumulatedXP: "Total XP Accumulated",
    totalXP: "Total XP",
    archivalPoints: "Archival points",
    currentStreak: "Current Streak",
    continuousDays: "Continuous Days",
    accuracyRate: "Accuracy Rate",
    archivalRank: "Archival Rank",
    levelN5: "N5 Calligraphy level",
    calendarTitle: "Study Calendar",
    activeDays: "Active Days",
    dayStreak: "Day Streak",
    totalDaysStudied: "Total Days Studied",
    studiedLegend: "Studied",
    todayLegend: "Today",
    masteryBadges: "Mastery Badges",
    unlocked: "Unlocked",
    locked: "Locked",
    companions: "Companions & Friends",
    noCompanions: "No active companions. Share codes to unlock multiplayer sparring duels!",
    addCompanionBtn: "Add Companion",
    companionPlaceholder: "Companion Friend Code",
    nicknamePlaceholder: "Nickname",
    masteryLedger: "Mastery Ledger Book",
    allSyllabary: "All Syllabary",
    coreSyllabary: "Core (Goijūon)",
    voicedSyllabary: "Voiced (Dakuon)",
    semiVoicedSyllabary: "Semi-voiced",
    combosSyllabary: "Combos (Yōon)",
    settingsTitle: "Grimoire Workshop & Settings",
    settingsSubtitle: "Customize color aesthetics, voice synthesizer, and background magic",
    colorAesthetic: "Color Aesthetic Presets",
    colorAestheticDesc: "Choose a visual energy that suits your learning flow",
    languageTitle: "Interface Language",
    languageDesc: "Translate the grimoire interface text",
    voiceTitle: "Text-to-Speech Synth Voice",
    voiceDesc: "Configure the voice pronunciation check assistant",
    bgAnimTitle: "Background Magic FX",
    bgIntensityTitle: "Magic Particle Intensity",
    bgBlurTitle: "Glassmorphism Blur",
    bgOpacityTitle: "Card Backing Density",
    fontTitle: "Typography / Font Face",
    autoPronounceTitle: "Auto-pronounce on Quiz",
    autoPronounceDesc: "Speak words automatically when drawing or answering quizzes",
    previewTitle: "Live Color Palette Preview",
    previewDesc: "Real-time look of chosen color aesthetic"
  },
  ja: {
    backBtn: "聖域に戻る",
    title: "学習記録",
    subtitle: "文字の習得度と実績の確認",
    identity: "私のアイデンティティ",
    identityDesc: "固有コードを共有して、共に学習する仲間を招待しましょう",
    copyCode: "フレンドコードをコピー",
    displayName: "表示名",
    placeholderName: "書道家の名前を入力",
    saveBtn: "保存する",
    assignedCode: "割り当てられたフレンドコード",
    exportBtn: "進捗アーカイブのエクスポート",
    importBtn: "進捗アーカイブのインポート",
    xpProgress: "学者XPの進捗状況",
    grandArchivist: "グランドアーカイブまでのXP",
    accumulatedXP: "累積獲得XP",
    totalXP: "合計獲得XP",
    archivalPoints: "アーカイブ評価点数",
    currentStreak: "現在の継続日数",
    continuousDays: "継続学習日数",
    accuracyRate: "クイズ正解率",
    archivalRank: "アーカイブでの称号",
    levelN5: "N5書道家レベル",
    calendarTitle: "学習カレンダー",
    activeDays: "アクティブ日数",
    dayStreak: "学習継続日数",
    totalDaysStudied: "通算学習日数",
    studiedLegend: "学習した日",
    todayLegend: "本日",
    masteryBadges: "マスタリー記章",
    unlocked: "アンロック済み",
    locked: "未解除",
    companions: "仲間とフレンド一覧",
    noCompanions: "アクティブな仲間がいません。コードを共有して、対戦デュアルを解放しましょう！",
    addCompanionBtn: "仲間を追加",
    companionPlaceholder: "仲間のフレンドコード",
    nicknamePlaceholder: "ニックネーム",
    masteryLedger: "五十音文字習得台帳",
    allSyllabary: "すべての音",
    coreSyllabary: "清音（五十音）",
    voicedSyllabary: "濁音",
    semiVoicedSyllabary: "半濁音",
    combosSyllabary: "拗音",
    settingsTitle: "魔導工房と環境設定",
    settingsSubtitle: "カラーパレット、音声合成、背景の魔法効果を設定します",
    colorAesthetic: "カラーテーマの選択",
    colorAestheticDesc: "あなたの学習フローに適したビジュアルエナジーを選んでください",
    languageTitle: "インターフェース言語",
    languageDesc: "魔導書の言語表示を設定します",
    voiceTitle: "音声合成アシスタント",
    voiceDesc: "発音チェックで利用する日本語の読み上げ音声を指定します",
    bgAnimTitle: "背景の魔法効果 FX",
    bgIntensityTitle: "魔法粒子の強度",
    bgBlurTitle: "背後のガラスのぼかし強度",
    bgOpacityTitle: "背景カードの不透明度",
    fontTitle: "文字タイポグラフィ / フォント",
    autoPronounceTitle: "クイズ自動発音",
    autoPronounceDesc: "文字を描くかクイズに答える際、音声を自動再生します",
    previewTitle: "カラーパレットのプレビュー",
    previewDesc: "選択したカラーテーマのリアルタイムな配色構造"
  }
};

interface ProfileScreenProps {
  profileAvatarInputRef: React.RefObject<HTMLInputElement | null>;
  progressUploadInputRef: React.RefObject<HTMLInputElement | null>;
  profileAvatar: string;
  profileNameInput: string;
  setProfileNameInput: React.Dispatch<React.SetStateAction<string>>;
  profileCharSet: ProfileCharSet;
  setProfileCharSet: React.Dispatch<React.SetStateAction<ProfileCharSet>>;
  profileError: string | null;
  isSavingProfile: boolean;
  friendUidInput: string;
  setFriendUidInput: React.Dispatch<React.SetStateAction<string>>;
  friendNameInput: string;
  setFriendNameInput: React.Dispatch<React.SetStateAction<string>>;
  addFriendError: string | null;
  isAddingFriend: boolean;
  friends: FriendRecord[];
  myUid: string | null;
  calendarOpen: boolean;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  badgesOpen: boolean;
  setBadgesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  calViewDate: CalViewDate;
  setCalViewDate: React.Dispatch<React.SetStateAction<CalViewDate>>;
  archiveFilter: ArchiveFilter;
  setArchiveFilter: React.Dispatch<React.SetStateAction<ArchiveFilter>>;
  stats: StudentStats;
  HIRAGANA_DATA: HiraganaItem[];
  KATAKANA_DATA: KatakanaItem[];
  KANJI_DATA: KanjiItem[];
  VOCABULARY_DATA: VocabularyItem[];
  currentUid: () => string | null;
  getFriendCode: () => string;
  getScholarRankTitle: (xp: number) => string;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  showToast: (message: string) => void;
  speakJapanese: (phrase: string) => void;
  handleRemoveAvatar: () => void;
  handleSaveProfile: () => void;
  handleDownloadProgress: () => void;
  handleAddFriend: () => void;
  handleInviteFriend: (friendUid: string) => void;
  handleRemoveFriend: (friendUid: string) => void;

  language: "en" | "ja";
  setLanguage: React.Dispatch<React.SetStateAction<"en" | "ja">>;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<any>>;
  bgAnimationType: "letters" | "rain" | "both" | "none";
  setBgAnimationType: React.Dispatch<React.SetStateAction<"letters" | "rain" | "both" | "none">>;
  bgIntensity: "low" | "medium" | "high";
  setBgIntensity: React.Dispatch<React.SetStateAction<"low" | "medium" | "high">>;
  bgBlur: number;
  setBgBlur: React.Dispatch<React.SetStateAction<number>>;
  bgOpacity: string;
  setBgOpacity: React.Dispatch<React.SetStateAction<any>>;
  fontStyle: "digital" | "written";
  setFontStyle: React.Dispatch<React.SetStateAction<"digital" | "written">>;
  autoPronounce: boolean;
  setAutoPronounce: React.Dispatch<React.SetStateAction<boolean>>;
  availableJapaneseVoices: SpeechSynthesisVoice[];
  selectedJapaneseVoiceURI: string;
  setSelectedJapaneseVoiceURI: (voiceURI: string) => void;
  activeBgScene: number;
  setActiveBgScene: React.Dispatch<React.SetStateAction<number>>;
}

export default function ProfileScreen({
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
}: ProfileScreenProps) {
  
  const [isAtmosphereExpanded, setIsAtmosphereExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="bg-natural-card/35 border-2 border-natural-border/30 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl hover:shadow-[0_20px_50px_rgba(188,163,240,0.15)] w-full flex flex-col gap-6 select-none transition-all duration-500 text-left"
    >
      {/* HEADER SECTION - IMMERSIVE LIQUID GLASS HEADER */}
      <div className="border-b border-natural-border/60 pb-5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentScreen("menu")}
              className="px-4 py-2 bg-natural-card/45 border border-natural-border/50 text-natural-forest hover:bg-natural-forest hover:text-natural-bg text-xs rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" /> {t.backBtn}
            </button>
          </div>
          
          <div className="text-left sm:text-right shrink-0">
            <h1 className="font-serif font-black text-2xl text-natural-forest leading-none flex items-center sm:justify-end gap-1.5">
              <span>{t.title}</span>
              <span className="text-xs bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold">Profile</span>
            </h1>
            <p className="text-[10px] font-mono text-natural-forest/60 uppercase tracking-widest mt-1 font-bold">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* CORE IDENTITY BLOCK - GLASSY PROFILE PANEL */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 pb-4 border-b border-white/5">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
            {/* Avatar upload wrapper with fancy status borders */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => profileAvatarInputRef.current?.click()}
                className="w-18 h-18 rounded-full bg-natural-card/30 border-2 border-natural-forest/40 hover:border-natural-forest overflow-hidden flex items-center justify-center text-natural-forest transition-all duration-300 shadow-md cursor-pointer relative"
                title="Upload avatar"
              >
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 opacity-75 group-hover:scale-110 transition-transform duration-300" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-[10px] text-white font-mono font-bold">
                  Change
                </div>
              </button>
              
              {profileAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 bg-natural-terracotta text-white p-1 rounded-full hover:scale-110 transition cursor-pointer shadow-sm border border-white/20"
                  title="Remove avatar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="min-w-0 text-left">
              <h4 className="font-serif font-black text-lg text-natural-forest flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-5 h-5 text-natural-clay animate-pulse" />
                <span>{t.identity}</span>
              </h4>
              <p className="text-[10px] text-natural-forest/60 font-mono mt-0.5 uppercase tracking-wider font-bold">
                {t.identityDesc}
              </p>
            </div>
          </div>

          {/* Copy Code button styled elegant */}
          {(myUid || currentUid()) && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(getFriendCode());
                showToast(language === "ja" ? "フレンドコードをコピーしました" : "Friend code copied");
              }}
              className="px-4 py-2 bg-natural-forest/15 border border-natural-forest/40 hover:bg-natural-forest hover:text-white rounded-xl text-xs font-mono font-black text-natural-forest transition-all duration-300 cursor-pointer flex items-center gap-2 shadow-xs group"
            >
              <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{t.copyCode}</span>
            </button>
          )}
        </div>

        {/* Name Input & Friend Code fields */}
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
              {t.displayName}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                maxLength={24}
                className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest/60 focus:ring-1 focus:ring-natural-forest/30 transition-all placeholder:text-natural-forest-light/40"
                placeholder={t.placeholderName}
              />
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !profileNameInput.trim()}
                className="px-4 py-2.5 bg-natural-forest text-natural-bg hover:bg-natural-forest-light rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{t.saveBtn}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
              {t.assignedCode}
            </label>
            <div className="px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-natural-charcoal/80 break-all min-h-[41px] flex items-center justify-between">
              <span>{getFriendCode() || "Registering companion status..."}</span>
            </div>
          </div>
        </div>

        {profileError && (
          <div className="flex items-center gap-1.5 text-xs text-natural-terracotta bg-natural-terracotta/10 border border-natural-terracotta/20 rounded-xl p-2.5 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        {/* Progress Export & Import buttons */}
        <div className="mt-1 pt-4 border-t border-white/5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadProgress}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-mono font-bold text-natural-forest transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportBtn}</span>
          </button>
          
          <button
            type="button"
            onClick={() => progressUploadInputRef.current?.click()}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-mono font-bold text-natural-forest transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>{t.importBtn}</span>
          </button>
        </div>
      </div>

      {/* ── WITCH'S GRIMOIRE WORKSHOP & ENVIRONMENT SETTINGS ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div 
            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            className="flex items-center gap-2.5 text-left cursor-pointer group flex-1"
          >
            <Sparkles className="w-5 h-5 text-natural-clay animate-pulse group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1">
              <h4 className="font-serif font-black text-sm text-natural-forest flex items-center gap-1.5 group-hover:text-natural-forest/80 transition-colors">
                <span>{t.settingsTitle}</span>
                <ChevronRight className={`w-4 h-4 text-natural-forest/70 transition-transform duration-300 ${isSettingsExpanded ? "rotate-90" : ""}`} />
              </h4>
              <p className="text-[10px] text-natural-forest/60 font-mono">
                {t.settingsSubtitle}
              </p>
            </div>
          </div>
          {/* Language pill toggles */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLanguage("en");
                showToast("Language set to English");
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                language === "en"
                  ? "bg-natural-forest text-natural-bg"
                  : "bg-white/5 text-natural-forest/60 hover:bg-white/10"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLanguage("ja");
                showToast("日本語に設定されました");
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                language === "ja"
                  ? "bg-natural-forest text-natural-bg"
                  : "bg-white/5 text-natural-forest/60 hover:bg-white/10"
              }`}
            >
              日本語
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isSettingsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 text-left pt-2">
                {/* Left Column: Color Aesthetics Preset Grid & Synth Options */}
                <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="leading-none">
                <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
                  {t.colorAesthetic}
                </label>
                <p className="text-[9px] text-natural-forest/50 font-mono mt-0.5">{t.colorAestheticDesc}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: "light",
                    title: "🌸 Washi Parchment",
                    desc: language === "ja" ? "和風の白砂と墨汁の美しいライト" : "Classic light cream scroll style",
                    colors: ["#FAF7F2", "#C0B8AC", "#E8B98A", "#F0967A"]
                  },
                  {
                    id: "dark-cosmic",
                    title: "🔮 Cosmic Witch",
                    desc: language === "ja" ? "宇宙魔女の夜空を飾るアメジスト" : "Glowing amethyst mystical violet",
                    colors: ["#120E1B", "#32264C", "#DF9BFF", "#FF7597"]
                  },
                  {
                    id: "dark-emerald",
                    title: "🎋 Emerald Jade",
                    desc: language === "ja" ? "静かな竹林の抹茶グリーン" : "Fresh matcha & bamboo green",
                    colors: ["#0D1612", "#1E3E30", "#34D399", "#FCD34D"]
                  },
                  {
                    id: "dark-maple",
                    title: "🍁 Autumn Maple",
                    desc: language === "ja" ? "紅葉の夕暮れを思わせる琥珀" : "Terracotta rust & sunset amber",
                    colors: ["#180F0E", "#4D2D2A", "#F0967A", "#F5B041"]
                  },
                  {
                    id: "dark-cyber",
                    title: "🌌 Cyber Tokyo",
                    desc: language === "ja" ? "ネオンに輝くサイバーパンク" : "Neon cyan & synth pink aura",
                    colors: ["#0B0E17", "#212E46", "#06B6D4", "#EC4899"]
                  }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTheme(preset.id);
                      document.documentElement.setAttribute("data-theme", preset.id);
                      showToast(language === "ja" ? `カラーを「${preset.title}」に変更しました` : `Aesthetic: ${preset.title}`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-20 hover:scale-[1.02] cursor-pointer ${
                      theme === preset.id
                        ? "bg-natural-forest/10 border-natural-forest shadow-sm"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-serif font-black text-natural-forest leading-tight">
                        {preset.title}
                      </p>
                      <p className="text-[8px] text-natural-forest/60 font-mono mt-0.5 leading-tight">
                        {preset.desc}
                      </p>
                    </div>
                    {/* Tiny Color chips */}
                    <div className="flex gap-1 mt-1">
                      {preset.colors.map((c, idx) => (
                        <span key={idx} className="w-3 h-3 rounded-full border border-white/10 shadow-xs" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voices and pronunciation check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
                    {t.voiceTitle}
                  </label>
                  <p className="text-[8px] text-natural-forest/50 font-mono leading-none mt-0.5">{t.voiceDesc}</p>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={selectedJapaneseVoiceURI}
                    onChange={(e) => setSelectedJapaneseVoiceURI(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-natural-charcoal rounded-xl text-xs font-mono outline-none focus:border-natural-forest/60 transition cursor-pointer"
                  >
                    <option value="" className="bg-natural-card text-natural-forest">Default System Voice</option>
                    {availableJapaneseVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI} className="bg-natural-card text-natural-forest">
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => speakJapanese("あきこ")}
                    className="p-2.5 bg-natural-forest/15 text-natural-forest border border-natural-forest/40 rounded-xl hover:bg-natural-forest hover:text-natural-bg transition cursor-pointer shrink-0"
                    title="Test Voice Speak"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
                    {t.autoPronounceTitle}
                  </label>
                  <p className="text-[8px] text-natural-forest/50 font-mono leading-none mt-0.5">{t.autoPronounceDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPronounce(!autoPronounce)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-left ${
                    autoPronounce
                      ? "bg-natural-forest/10 border-natural-forest text-natural-forest"
                      : "bg-white/5 border-white/10 text-natural-forest/60"
                  }`}
                >
                  <span className="text-xs font-bold">Auto-pronounce Voice</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${autoPronounce ? "bg-natural-forest" : "bg-white/20"}`}>
                    <span className={`w-3 h-3 rounded-full bg-natural-bg absolute top-0.5 transition-all ${autoPronounce ? "right-0.5" : "left-0.5"}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Typography selection */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
                {t.fontTitle}
              </label>
              <div className="flex gap-2">
                {[
                  { id: "digital", label: "📱 Noto Sans JP", desc: language === "ja" ? "デジタルゴシック" : "Digital Clean Pixel" },
                  { id: "written", label: "🖌 " + (language === "ja" ? "教科書体 Klee One" : "Klee One"), desc: language === "ja" ? "伝統的な筆ペン" : "Traditional Ink Brush" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFontStyle(opt.id as any);
                      showToast(language === "ja" ? `書体を変更しました` : `Font set to ${opt.label}`);
                    }}
                    className={`flex-1 p-3 rounded-xl border text-left transition cursor-pointer ${
                      fontStyle === opt.id
                        ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                        : "bg-white/5 border-white/10 text-natural-forest/60 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xs font-serif">{opt.label}</p>
                    <p className="text-[8px] opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Color Preview and Atmospheric Magic variables */}
          <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-white/5 lg:pl-6 pt-5 lg:pt-0">
            {/* Real-time Color Preview box mock card */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono font-bold text-natural-forest/75 uppercase tracking-wider">
                {t.previewTitle}
              </label>
              
              <div 
                className="rounded-2xl p-4 border border-white/15 shadow-xl relative overflow-hidden flex flex-col justify-between h-40 transition-all duration-300"
                style={{
                  backgroundColor: "var(--color-natural-bg)",
                  borderColor: "var(--color-natural-border)"
                }}
              >
                <div 
                  className="rounded-xl p-3 border border-white/10 backdrop-blur-md flex items-center justify-between"
                  style={{
                    backgroundColor: "var(--color-natural-card)"
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-2xl font-serif font-black transition-colors"
                      style={{ color: "var(--color-natural-forest)" }}
                    >
                      夢
                    </span>
                    <div className="leading-none text-left">
                      <p 
                        className="text-xs font-serif font-black"
                        style={{ color: "var(--color-natural-forest)" }}
                      >
                        {language === "ja" ? "夢 (ゆめ)" : "Yume"}
                      </p>
                      <p 
                        className="text-[8px] font-mono"
                        style={{ color: "var(--color-natural-forest-light)" }}
                      >
                        {language === "ja" ? "魔導書のプレビュー" : "Aesthetic Preview"}
                      </p>
                    </div>
                  </div>
                  
                  <span 
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shadow-xs"
                    style={{
                      backgroundColor: "var(--color-natural-forest)",
                      color: "var(--color-natural-bg)"
                    }}
                  >
                    N5 Active
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] font-mono">
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-natural-clay)" }} />
                      <span style={{ color: "var(--color-natural-forest-light)" }}>Clay</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-natural-terracotta)" }} />
                      <span style={{ color: "var(--color-natural-forest-light)" }}>Terracotta</span>
                    </span>
                  </div>
                  <span style={{ color: "var(--color-natural-forest-light)" }} className="text-[9px] uppercase tracking-wide">Ready</span>
                </div>
              </div>
            </div>

            {/* Atmosphere Advanced Settings Collapse Button */}
            <div className="border-t border-white/5 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setIsAtmosphereExpanded(!isAtmosphereExpanded)}
                className="w-full flex items-center justify-between cursor-pointer group py-1.5"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-natural-forest/80 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-natural-forest/80 uppercase tracking-wider">
                    {language === "ja" ? "雰囲気・背景の高度な設定" : "Atmosphere Advanced Settings"}
                  </span>
                </div>
                <div className="p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <ChevronRight className={`w-3.5 h-3.5 text-natural-forest transition-transform duration-300 ${isAtmosphereExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isAtmosphereExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {/* Backspace particles selection */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-natural-forest/70 uppercase tracking-wider">
                        {t.bgAnimTitle}
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: "letters" as const, label: language === "ja" ? "文字" : "Runes", desc: "Runes" },
                          { id: "rain" as const, label: language === "ja" ? "雨" : "Rain", desc: "Rain" },
                          { id: "both" as const, label: language === "ja" ? "両方" : "Both", desc: "Both" },
                          { id: "none" as const, label: language === "ja" ? "無し" : "None", desc: "None" }
                        ].map((anim) => (
                          <button
                            key={anim.id}
                            type="button"
                            onClick={() => setBgAnimationType(anim.id)}
                            className={`py-2 rounded-lg border text-center transition cursor-pointer flex flex-col justify-center items-center ${
                              bgAnimationType === anim.id
                                ? "bg-natural-forest text-natural-bg border-natural-forest font-bold"
                                : "bg-white/5 border-white/10 text-natural-forest/65 hover:bg-white/10"
                            }`}
                          >
                            <span className="text-[11px] font-semibold leading-none">{anim.label}</span>
                            <span className="text-[8px] opacity-75 mt-0.5 font-mono">{anim.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Particle Intensity */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-natural-forest/70 uppercase tracking-wider">
                        {t.bgIntensityTitle}
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "low" as const, label: language === "ja" ? "弱" : "Low" },
                          { id: "medium" as const, label: language === "ja" ? "中" : "Medium" },
                          { id: "high" as const, label: language === "ja" ? "強" : "High" }
                        ].map((inte) => (
                          <button
                            key={inte.id}
                            type="button"
                            onClick={() => setBgIntensity(inte.id)}
                            className={`py-1.5 rounded-lg border text-xs font-mono font-bold text-center transition cursor-pointer ${
                              bgIntensity === inte.id
                                ? "bg-natural-forest text-natural-bg border-natural-forest"
                                : "bg-white/5 border-white/10 text-natural-forest/65 hover:bg-white/10"
                            }`}
                          >
                            {inte.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card backing density select & blur slider */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-natural-forest/70 uppercase tracking-wider leading-none">
                          {t.bgBlurTitle}
                        </span>
                        <input 
                          type="range"
                          min="0"
                          max="24"
                          value={bgBlur}
                          onChange={(e) => setBgBlur(Number(e.target.value))}
                          className="w-full accent-natural-forest cursor-pointer bg-white/10 h-1 rounded-lg outline-none mt-1"
                        />
                        <span className="text-[8px] font-mono text-right text-natural-forest/50">{bgBlur}px</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-natural-forest/70 uppercase tracking-wider leading-none">
                          {t.bgOpacityTitle}
                        </span>
                        <select
                          value={bgOpacity}
                          onChange={(e) => setBgOpacity(e.target.value)}
                          className="px-2 py-1 bg-white/5 border border-white/10 text-natural-charcoal rounded-lg text-[10px] font-mono outline-none cursor-pointer focus:border-natural-forest/50 mt-1"
                        >
                          <option value="/5" className="bg-natural-card">5% {language === "ja" ? "不透明度" : "Density"}</option>
                          <option value="/10" className="bg-natural-card">10% {language === "ja" ? "不透明度" : "Density"}</option>
                          <option value="/15" className="bg-natural-card">15% {language === "ja" ? "不透明度" : "Density"}</option>
                          <option value="/25" className="bg-natural-card">25% {language === "ja" ? "不透明度" : "Density"}</option>
                          <option value="/40" className="bg-natural-card">40% {language === "ja" ? "不透明度" : "Density"}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BENCHMARK PROGRESS - XP BAR */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <Shield className="w-5 h-5 text-natural-forest animate-pulse" />
            <span className="text-[10px] font-mono text-natural-forest/80 uppercase tracking-wider font-extrabold">{t.xpProgress}</span>
          </div>
          <span className="text-xs font-serif font-black text-natural-clay bg-natural-clay/10 px-3 py-1 rounded-full border border-natural-clay/30 tracking-wide self-start sm:self-auto">
            {getScholarRankTitle(stats.xp)}
          </span>
        </div>
        
        {/* Glow-enhanced XP bar */}
        <div className="w-full h-4.5 bg-natural-border/20 rounded-full overflow-hidden p-[3px] border border-white/10 relative">
          <div
            className="h-full bg-gradient-to-r from-natural-forest via-natural-clay to-natural-terracotta rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(202,94,75,0.45)]"
            style={{ width: `${Math.min(100, (stats.xp / 1500) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-natural-forest/65 font-bold">
          <span>{stats.xp} {t.accumulatedXP}</span>
          <span>1500 {t.grandArchivist}</span>
        </div>
      </div>

      {/* FOUR BENTO BOX GRID CELL STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div className="bg-white/5 border border-white/10 hover:border-natural-forest/30 rounded-2xl p-4 text-center transition-all duration-300 shadow-sm flex flex-col justify-center items-center gap-1 hover:bg-white/10">
          <span className="text-[10px] text-natural-forest/65 font-mono uppercase tracking-wider font-extrabold">{t.totalXP}</span>
          <span className="text-3xl font-mono font-black text-natural-forest tracking-tight">
            {stats.xp}
          </span>
          <span className="text-[9px] text-natural-forest/45 font-mono">{t.archivalPoints}</span>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-natural-terracotta/30 rounded-2xl p-4 text-center transition-all duration-300 shadow-sm flex flex-col justify-center items-center gap-1 hover:bg-white/10">
          <span className="text-[10px] text-natural-forest/65 font-mono uppercase tracking-wider font-extrabold">{t.currentStreak}</span>
          <span className="text-3xl font-mono font-black text-natural-terracotta flex items-center gap-1 tracking-tight">
            <Flame className="w-6 h-6 fill-current text-natural-terracotta animate-bounce" />
            {stats.streakCount}
          </span>
          <span className="text-[9px] text-natural-forest/45 font-mono">{t.continuousDays}</span>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-natural-clay/30 rounded-2xl p-4 text-center transition-all duration-300 shadow-sm flex flex-col justify-center items-center gap-1 hover:bg-white/10">
          <span className="text-[10px] text-natural-forest/65 font-mono uppercase tracking-wider font-extrabold">{t.accuracyRate}</span>
          <span className="text-3xl font-mono font-black text-natural-clay tracking-tight">
            {stats.totalAttempts > 0
              ? `${Math.round((stats.correctCount / stats.totalAttempts) * 100)}%`
              : "100%"}
          </span>
          <span className="text-[9px] text-natural-forest/45 font-mono">{stats.correctCount} / {stats.totalAttempts} correct</span>
        </div>

        <div className="bg-white/5 border border-white/10 hover:border-natural-forest/30 rounded-2xl p-4 text-center transition-all duration-300 shadow-sm flex flex-col justify-center items-center gap-1 hover:bg-white/10">
          <span className="text-[10px] text-natural-forest/65 font-mono uppercase tracking-wider font-extrabold">{t.archivalRank}</span>
          <span className="text-xs font-serif font-black text-natural-forest mt-2 truncate max-w-full block bg-natural-forest/10 border border-natural-forest/20 px-2.5 py-1 rounded-xl">
            {getScholarRankTitle(stats.xp)}
          </span>
          <span className="text-[9px] text-natural-forest/45 font-mono mt-1">{t.levelN5}</span>
        </div>
      </div>

      {/* ── STREAK STUDY CALENDAR ── */}
      {(() => {
        const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const MONTH_NAMES_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
        const MONTH_NAMES = language === "ja" ? MONTH_NAMES_JA : MONTH_NAMES_EN;

        const { year: calYear, month: calMonth } = calViewDate;
        const firstDOW   = new Date(calYear, calMonth, 1).getDay();   // 0=Sun
        const daysInMon  = new Date(calYear, calMonth + 1, 0).getDate();
        const _now       = new Date();
        const todayIso   = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
        const studySet   = new Set(stats.studyDates || []);

        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 text-left">
            {/* Collapsible header button */}
            <button
              type="button"
              onClick={() => setCalendarOpen(!calendarOpen)}
              className="w-full flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-natural-forest" />
                <h4 className="font-serif font-black text-sm text-natural-forest">
                  {t.calendarTitle}
                </h4>
                <span className="text-[10px] font-mono font-bold bg-natural-forest/10 text-natural-forest border border-natural-forest/20 px-2 py-0.5 rounded-full">
                  {studySet.size} {t.activeDays}
                </span>
              </div>
              <div className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <ChevronRight className={`w-4 h-4 text-natural-forest transition-transform duration-300 ${calendarOpen ? "rotate-90" : ""}`} />
              </div>
            </button>

            {calendarOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-white/5 mt-3 flex flex-col gap-4 overflow-hidden"
              >
                {/* Visual Streak Highlights */}
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-2xl shadow-sm">
                    <Flame className="w-6 h-6 text-natural-terracotta fill-natural-terracotta animate-bounce" />
                    <div className="text-left">
                      <span className="block font-mono font-extrabold text-2xl text-natural-terracotta tabular-nums leading-none">
                        {stats.streakCount}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-natural-terracotta/70 uppercase tracking-widest leading-none">
                        {t.dayStreak}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-natural-forest/10 border border-natural-forest/30 rounded-2xl shadow-sm">
                    <Calendar className="w-6 h-6 text-natural-forest" />
                    <div className="text-left">
                      <span className="block font-mono font-extrabold text-2xl text-natural-forest tabular-nums leading-none">
                        {studySet.size}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-natural-forest/70 uppercase tracking-widest leading-none">
                        {t.totalDaysStudied}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calendar Navigation and Switcher */}
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10 max-w-sm mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => setCalViewDate(({ year, month }: { year: number; month: number }) => {
                      const d = new Date(year, month - 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="p-2 rounded-lg hover:bg-white/10 text-natural-forest transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-serif font-black text-sm text-natural-forest tracking-wide">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalViewDate(({ year, month }: { year: number; month: number }) => {
                      const d = new Date(year, month + 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })}
                    className="p-2 rounded-lg hover:bg-white/10 text-natural-forest transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid Month Panel */}
                <div className="max-w-md mx-auto w-full">
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                      <div key={d} className="text-center text-[10px] font-mono font-extrabold text-natural-forest/65 uppercase tracking-wider py-1 border-b border-white/5">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: firstDOW }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square opacity-0" />
                    ))}

                    {Array.from({ length: daysInMon }).map((_, i) => {
                      const day  = i + 1;
                      const iso  = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday   = iso === todayIso;
                      const hasStudy  = studySet.has(iso);
                      return (
                        <div
                          key={iso}
                          className={[
                            "aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-mono font-bold transition-all duration-300 relative",
                            hasStudy
                              ? "bg-natural-forest text-natural-bg shadow-sm scale-[1.02] font-extrabold ring-1 ring-natural-forest/20"
                              : "bg-white/5 hover:bg-white/10 text-natural-charcoal/70 border border-white/5",
                            isToday ? "ring-2 ring-natural-clay/70 ring-offset-1 font-black text-natural-clay scale-105" : "",
                          ].join(" ")}
                          title={hasStudy ? "Studied on this day!" : "No recorded practice."}
                        >
                          <span>{day}</span>
                          {hasStudy && <div className="w-1 h-1 bg-white rounded-full mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Legend Info */}
                <div className="flex items-center gap-5 mt-2 justify-center border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-lg bg-natural-forest" />
                    <span className="text-[10px] font-mono text-natural-forest/75 font-bold uppercase">{t.studiedLegend}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-lg bg-white/5 border-2 border-natural-clay" />
                    <span className="text-[10px] font-mono text-natural-forest/75 font-bold uppercase">{t.todayLegend}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      })()}

      {/* ── MASTERY BADGES UNLOCKED ── */}
      {(() => {
        const srsCardsList = Object.values(stats.srsCards || {});
        const vocabLearned = Object.keys(stats.vocabularyProgress || {}).filter(k => stats.vocabularyProgress[k]);
        const basicHiragana = HIRAGANA_DATA.filter(h => h.category === "basic");
        const hiraganaComplete = basicHiragana.every(h => (stats.characterProgress[h.kana]?.total || 0) >= 1);
        const kanjiStudied = KANJI_DATA.filter(k => (stats.characterProgress[k.kanji]?.total || 0) >= 1).length;

        const badges = [
          {
            emoji: "🌸", name: language === "ja" ? "第一歩" : "First Steps",
            desc: language === "ja" ? "最初のクイズを完了する" : "Complete your first quiz",
            earned: stats.totalAttempts > 0,
          },
          {
            emoji: "⚡", name: language === "ja" ? "サバイバー" : "Survivor",
            desc: language === "ja" ? "サバイバルモードで30点以上獲得" : "Score 30+ in survival mode",
            earned: (stats.survivalBestScore || 0) >= 30,
          },
          {
            emoji: "🔥", name: language === "ja" ? "修練の戦士" : "Week Warrior",
            desc: language === "ja" ? "学習を7日間継続する" : "Maintain a 7-day streak",
            earned: stats.streakCount >= 7,
          },
          {
            emoji: "💎", name: language === "ja" ? "不屈の精神" : "Streak Master",
            desc: language === "ja" ? "学習を30日間継続する" : "Maintain a 30-day streak",
            earned: stats.streakCount >= 30,
          },
          {
            emoji: "📦", name: language === "ja" ? "コレクター" : "Collector",
            desc: language === "ja" ? "SRSデッキに10枚のカードを追加" : "Add 10 cards to your SRS deck",
            earned: srsCardsList.length >= 10,
          },
          {
            emoji: "🏆", name: language === "ja" ? "復習の達人" : "Deck Master",
            desc: language === "ja" ? "累計50回SRSカードを復習する" : "Review 50 SRS cards total",
            earned: (stats.srsReviewedTotal || 0) >= 50,
          },
          {
            emoji: "🌊", name: language === "ja" ? "平仮名極めし者" : "Hiragana Complete",
            desc: language === "ja" ? "46文字の基礎的な平仮名を練習する" : "Practice all 46 basic hiragana",
            earned: hiraganaComplete,
          },
          {
            emoji: "⭐", name: language === "ja" ? "漢字の弟子" : "Kanji Apprentice",
            desc: language === "ja" ? "練習で25文字の漢字に出会う" : "Encounter 25 kanji in practice",
            earned: kanjiStudied >= 25,
          },
          {
            emoji: "📚", name: language === "ja" ? "ボキャブラリー" : "Word Collector",
            desc: language === "ja" ? "50個の単語を学習する" : "Learn 50 vocabulary words",
            earned: vocabLearned.length >= 50,
          },
          {
            emoji: "🎌", name: language === "ja" ? "N5言語学者" : "N5 Scholar",
            desc: language === "ja" ? `すべての${VOCABULARY_DATA.length}個の単語を習得する` : `Learn all ${VOCABULARY_DATA.length} vocabulary words`,
            earned: vocabLearned.length >= VOCABULARY_DATA.length,
          },
        ];

        const earnedCount = badges.filter(b => b.earned).length;

        return (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all duration-300 text-left">
            {/* Section collapsible button */}
            <button
              type="button"
              onClick={() => setBadgesOpen(!badgesOpen)}
              className="w-full flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-natural-forest" />
                <h4 className="font-serif font-black text-sm text-natural-forest">
                  {t.masteryBadges}
                </h4>
                <span className="text-[10px] font-mono font-bold text-natural-clay bg-natural-clay/15 border border-natural-clay/30 px-3 py-0.5 rounded-full">
                  {earnedCount} / {badges.length} {t.unlocked}
                </span>
              </div>
              <div className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <ChevronRight className={`w-4 h-4 text-natural-forest transition-transform duration-300 ${badgesOpen ? "rotate-90" : ""}`} />
              </div>
            </button>

            {badgesOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-4 border-t border-white/5 mt-3"
              >
                {badges.map((badge) => (
                  <div
                    key={badge.name}
                    className={[
                      "p-3.5 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all duration-300",
                      badge.earned
                        ? "bg-natural-card/55 border-natural-forest/45 shadow-[0_0_15px_rgba(167,136,255,0.15)] scale-[1.02] hover:shadow-[0_0_20px_rgba(167,136,255,0.3)] hover:scale-105"
                        : "bg-white/5 border-white/10 opacity-35 grayscale",
                    ].join(" ")}
                  >
                    <span className="text-3xl leading-none filter drop-shadow-md">{badge.emoji}</span>
                    <span className="font-serif font-black text-xs text-natural-forest leading-tight">
                      {badge.name}
                    </span>
                    <span className="text-[9px] font-mono text-natural-forest/60 leading-snug font-bold">
                      {badge.desc}
                    </span>
                    {!badge.earned && (
                      <span className="text-[8px] font-mono text-natural-forest/40 uppercase tracking-widest mt-1 font-bold">🔒 {t.locked}</span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        );
      })()}

      {/* ── FRIENDS & NETWORK DUEL SYSTEM ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md flex flex-col gap-4 text-left">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <User className="w-5 h-5 text-natural-forest" />
          <h4 className="font-serif font-black text-sm text-natural-forest">
            {t.companions} ({friends.length})
          </h4>
        </div>

        {/* Add Friend Form */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={friendUidInput}
            onChange={(e) => setFriendUidInput(e.target.value)}
            placeholder={t.companionPlaceholder}
            className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest/60 focus:ring-1 focus:ring-natural-forest/30 transition-all placeholder:text-natural-forest-light/40"
          />
          <input
            type="text"
            value={friendNameInput}
            onChange={(e) => setFriendNameInput(e.target.value)}
            placeholder={t.nicknamePlaceholder}
            className="w-full sm:w-32 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest/60 focus:ring-1 focus:ring-natural-forest/30 transition-all placeholder:text-natural-forest-light/40"
          />
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={!friendUidInput.trim() || isAddingFriend}
            className="px-4 py-2.5 bg-natural-forest text-natural-bg hover:bg-natural-forest-light rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            {isAddingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>{t.addCompanionBtn}</span>
          </button>
        </div>
        
        {addFriendError && (
          <p className="text-[10px] text-natural-terracotta bg-natural-terracotta/10 border border-natural-terracotta/20 rounded-lg p-2 font-mono font-bold">
            {addFriendError}
          </p>
        )}

        {/* Friends grid */}
        {friends.length === 0 ? (
          <p className="text-xs text-natural-forest/60 text-center py-5 font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/5 rounded-xl">
            {t.noCompanions}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-natural-forest/15 border border-natural-forest/30 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-natural-forest" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-serif font-black text-natural-charcoal truncate">{friend.name}</p>
                    <p className="text-[9px] font-mono text-natural-forest/50 truncate tracking-tight">{friend.uid?.slice(0, 16) ?? "unknown"}...</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleInviteFriend(friend.uid)}
                    className="p-2 rounded-xl bg-natural-clay/10 hover:bg-natural-clay hover:text-white border border-natural-clay/20 text-natural-clay transition cursor-pointer"
                    title="Invite to Sparring Duel Room"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(friend.uid)}
                    className="p-2 rounded-xl bg-natural-terracotta/10 hover:bg-natural-terracotta hover:text-white border border-natural-terracotta/20 text-natural-terracotta transition cursor-pointer"
                    title="Remove Companion"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHARACTER ARCHIVE MASTERY MAP ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-md flex flex-col gap-4 text-left">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-natural-forest animate-pulse" />
            <h4 className="font-serif font-black text-sm text-natural-forest">
              {t.masteryLedger}
            </h4>
          </div>
          
          {/* Active script toggle and statistics */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/15">
              {(["hiragana", "katakana"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProfileCharSet(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-serif font-black transition-all cursor-pointer capitalize ${profileCharSet === s
                    ? "bg-natural-forest text-natural-bg shadow-sm"
                    : "text-natural-forest/60 hover:text-natural-forest hover:bg-white/5"
                    }`}
                >
                  {s === "hiragana" ? "ひ Hiragana" : "カ Katakana"}
                </button>
              ))}
            </div>
            
            <span className="text-[10px] text-natural-forest/70 font-mono font-black uppercase tracking-wider bg-natural-forest/10 border border-natural-forest/20 px-2.5 py-1 rounded-lg">
              {profileCharSet === "hiragana"
                ? `${Object.keys(stats.characterProgress).filter(k => HIRAGANA_DATA.some(h => h.kana === k && stats.characterProgress[k]?.total > 0)).length} / ${HIRAGANA_DATA.length}`
                : `${Object.keys(stats.characterProgress).filter(k => KATAKANA_DATA.some(h => h.kana === k && stats.characterProgress[k]?.total > 0)).length} / ${KATAKANA_DATA.length}`}
            </span>
          </div>
        </div>

        {/* Filter categories tabs chips */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {[
            { id: "all", label: t.allSyllabary },
            { id: "basic", label: t.coreSyllabary },
            { id: "dakuon", label: t.voicedSyllabary },
            { id: "handakuon", label: t.semiVoicedSyllabary },
            { id: "yoon", label: t.combosSyllabary },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setArchiveFilter(chip.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-mono font-black tracking-wider transition-all cursor-pointer border ${archiveFilter === chip.id
                ? "bg-natural-forest text-natural-bg border-natural-forest shadow-sm"
                : "bg-white/5 border-white/10 text-natural-forest/65 hover:border-natural-forest/40 hover:bg-white/10"
                }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Dynamic character stamp card grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
          {(profileCharSet === "hiragana" ? HIRAGANA_DATA : KATAKANA_DATA)
            .filter((k) => archiveFilter === "all" || k.category === archiveFilter)
            .map((item) => {
              const data = stats.characterProgress[item.kana] || { correct: 0, total: 0 };

              let tierStyle = "border-white/5 bg-white/5 text-natural-forest-light/65 hover:bg-white/10 hover:border-white/20";
              let tierBadge = "";

              if (data.total > 0) {
                const accuracy = data.correct / data.total;
                if (accuracy >= 0.82 && data.total >= 4) {
                  tierStyle = "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
                  tierBadge = "Au"; // Gold stamp
                } else if (accuracy >= 0.6 && data.total >= 2) {
                  tierStyle = "border-slate-400/45 bg-slate-400/10 text-slate-600 dark:text-slate-300 shadow-[0_0_12px_rgba(148,163,184,0.15)]";
                  tierBadge = "Ag"; // Silver stamp
                } else {
                  tierStyle = "border-orange-500/35 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]";
                  tierBadge = "Cu"; // Bronze stamp
                }
              }

              return (
                <div
                  key={item.kana}
                  onClick={() => speakJapanese(item.kana)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center relative cursor-pointer group transition-all duration-300 hover:scale-105 ${tierStyle}`}
                  title={`${item.kana} (${item.romaji}) - Tries: ${data.total}, Correct: ${data.correct}`}
                >
                  {/* Glowing medal tier stamp indicator */}
                  {tierBadge && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-mono font-black tracking-tight leading-none scale-90 px-1 py-0.5 rounded-md bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity">
                      {tierBadge}
                    </span>
                  )}

                  {/* Kana Text pronunciation trigger */}
                  <span className="text-2xl font-serif font-black">{item.kana}</span>
                  
                  {/* Romaji read out */}
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-80 mt-1 font-bold">
                    {item.romaji}
                  </span>

                  {/* Diagnostic Fraction tracking footprint */}
                  <div className="flex items-center gap-0.5 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Volume2 className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-mono tracking-wider font-extrabold">
                      {data.correct} / {data.total}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
}
