import type React from "react";
import { motion } from "motion/react";
import { Award, Calendar, ChevronLeft, ChevronRight, Copy, Download, Flame, Loader2, Mail, Upload, User, UserMinus, UserPlus } from "lucide-react";
import type { HiraganaItem, KatakanaItem, KanjiItem, StudentStats, VocabularyItem } from "../types";
import type { FriendRecord } from "../multiplayerOnline";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type ProfileCharSet = "hiragana" | "katakana";
type ArchiveFilter = string;
type CalViewDate = { year: number; month: number };

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
}: ProfileScreenProps) {
  return (<motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-5 border-b border-natural-border pb-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen("menu")}
                  className="px-3 py-1 bg-natural-bg/40 border border-natural-border text-natural-forest-light text-xs rounded-lg hover:border-natural-forest hover:text-natural-forest font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="text-right">
                  <h3 className="font-serif font-extrabold text-natural-forest text-base tracking-wider uppercase">
                    My Progress
                  </h3>
                  <span className="text-[10px] text-natural-forest-light font-mono tracking-widest uppercase font-semibold">
                    Character mastery by stage
                  </span>
                </div>
              </div>

              {/* Public identity for friends and invites */}
              <div className="mb-5 p-4 bg-natural-bg border border-natural-border rounded-2xl">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => profileAvatarInputRef.current?.click()}
                      className="w-14 h-14 rounded-full bg-natural-card border border-natural-border overflow-hidden flex items-center justify-center text-natural-forest hover:border-natural-forest transition cursor-pointer shrink-0"
                      title="Upload avatar"
                    >
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </button>
                    <div className="min-w-0">
                    <h4 className="font-serif font-extrabold text-sm text-natural-forest flex items-center gap-2">
                      <User className="w-4 h-4" />
                      My Identity
                    </h4>
                    <p className="text-[10px] text-natural-forest-light font-mono mt-0.5">
                      Share your friend code so friends can add you.
                    </p>
                    {profileAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-[10px] font-bold text-natural-forest-light hover:text-natural-terracotta transition cursor-pointer"
                      >
                        Remove avatar
                      </button>
                    )}
                    </div>
                  </div>
                  {(myUid || currentUid()) && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getFriendCode());
                        showToast("Friend code copied");
                      }}
                      className="px-3 py-1.5 bg-natural-card border border-natural-border rounded-xl text-xs font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Code
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Display Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profileNameInput}
                        onChange={(e) => setProfileNameInput(e.target.value)}
                        maxLength={24}
                        className="flex-1 px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest"
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || !profileNameInput.trim()}
                        className="px-3 py-2 bg-natural-forest text-natural-bg rounded-xl text-xs font-bold transition hover:bg-natural-forest/90 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Friend Code
                    </label>
                    <div className="px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-mono text-natural-charcoal break-all min-h-[34px]">
                      {getFriendCode() || "Signing in..."}
                    </div>
                  </div>
                </div>
                {profileError && (
                  <p className="text-[10px] text-natural-terracotta font-medium mt-2">{profileError}</p>
                )}
                <div className="mt-3 pt-3 border-t border-natural-border/50 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadProgress}
                    className="px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => progressUploadInputRef.current?.click()}
                    className="px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-bold text-natural-forest hover:border-natural-forest transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Progress
                  </button>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-5 p-3 bg-natural-bg border border-natural-border rounded-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-natural-forest-light uppercase tracking-wider font-bold">XP Progress</span>
                  <span className="text-[10px] font-mono text-natural-clay font-bold">{getScholarRankTitle(stats.xp)}</span>
                </div>
                <div className="w-full h-3 bg-natural-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-natural-forest via-natural-clay to-natural-terracotta transition-all duration-700"
                    style={{ width: `${Math.min(100, (stats.xp / 1500) * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-natural-forest-light font-mono mt-1">{stats.xp} / 1500 XP to Grand Archivist</p>
              </div>

              {/* Profile statistics cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-natural-bg border border-natural-border rounded-xl text-center shadow-sm">
                  <span className="block text-natural-forest font-mono font-extrabold text-2xl">
                    {stats.xp}
                  </span>
                  <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block mt-1 font-bold">
                    XP
                  </span>
                </div>

                <div className="p-3 bg-natural-bg border border-natural-border rounded-xl text-center shadow-sm">
                  <span className="block text-natural-terracotta font-mono font-extrabold text-2xl flex items-center justify-center gap-1 leading-none">
                    <Flame className="w-5 h-5 fill-current text-natural-terracotta" />
                    {stats.streakCount}
                  </span>
                  <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block mt-1 font-bold">
                    Day Streak
                  </span>
                </div>

                <div className="p-3 bg-natural-bg border border-natural-border rounded-xl text-center shadow-sm">
                  <span className="block text-natural-clay font-mono font-extrabold text-2xl">
                    {stats.totalAttempts > 0
                      ? `${Math.round((stats.correctCount / stats.totalAttempts) * 100)}%`
                      : "100%"}
                  </span>
                  <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block mt-1 font-bold">
                    Success Rate
                  </span>
                </div>

                <div className="p-3 bg-natural-bg border border-natural-border rounded-xl text-center shadow-sm">
                  <span className="block text-natural-forest font-mono font-bold text-xs truncate mt-1">
                    {getScholarRankTitle(stats.xp)}
                  </span>
                  <span className="text-[9px] text-natural-forest-light font-mono uppercase tracking-wider block mt-1.5 font-bold">
                    Calligraphy Rank
                  </span>
                </div>
              </div>

              {/* ── FEATURE 1: STREAK CALENDAR ────────────────────────── */}
              {(() => {
                const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const { year: calYear, month: calMonth } = calViewDate;
                const firstDOW   = new Date(calYear, calMonth, 1).getDay();   // 0=Sun
                const daysInMon  = new Date(calYear, calMonth + 1, 0).getDate();
                // Use local date parts to avoid UTC timezone desync (e.g. early morning hours)
                const _now       = new Date();
                const todayIso   = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
                const studySet   = new Set(stats.studyDates || []);

                // Compute current streak from studyDates (longest consecutive run ending today or yesterday)
                const sortedDates = [...studySet].sort();
                let currentStreak = 0;
                if (sortedDates.length > 0) {
                  const check = new Date();
                  check.setHours(0, 0, 0, 0);
                  // Allow streak to count if last study was yesterday
                  const lastStudy = sortedDates[sortedDates.length - 1];
                  const yesterday = new Date(check);
                  yesterday.setDate(yesterday.getDate() - 1);
                  // Also use local date for yesterdayIso to stay consistent
                  const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
                  if (lastStudy === todayIso || lastStudy === yesterdayIso) {
                    for (let i = sortedDates.length - 1; i >= 0; i--) {
                      const expected = new Date(check);
                      expected.setDate(expected.getDate() - (sortedDates.length - 1 - i));
                      const expectedIso = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
                      if (sortedDates[i] === expectedIso) {
                        currentStreak++;
                      } else break;
                    }
                  }
                }

                return (
                  <div className="mb-5">
                    {/* Section header */}
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(o => !o)}
                      className="w-full flex items-center justify-between mb-3 cursor-pointer group"
                    >
                      <h4 className="font-serif font-extrabold text-sm text-natural-forest flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Study Calendar
                      </h4>
                      <ChevronRight className={`w-4 h-4 text-natural-forest-light transition-transform duration-200 ${calendarOpen ? "rotate-90" : ""}`} />
                    </button>

                    {calendarOpen && (
                      <div className="p-4 bg-natural-bg border border-natural-border rounded-2xl">
                        {/* Streak badge */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <div className="flex items-center gap-1.5 px-4 py-2 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-xl">
                            <Flame className="w-5 h-5 text-natural-terracotta fill-natural-terracotta" />
                            <span className="font-mono font-extrabold text-2xl text-natural-terracotta tabular-nums leading-none">
                              {stats.streakCount}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-natural-terracotta/70 uppercase tracking-wide leading-tight text-left">
                              day<br/>streak
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-4 py-2 bg-natural-card border border-natural-border rounded-xl">
                            <span className="font-mono font-extrabold text-2xl text-natural-forest tabular-nums leading-none">
                              {studySet.size}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wide leading-tight text-left">
                              days<br/>studied
                            </span>
                          </div>
                        </div>

                        {/* Month navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => setCalViewDate(({ year, month }: { year: number; month: number }) => {
                              const d = new Date(year, month - 1, 1);
                              return { year: d.getFullYear(), month: d.getMonth() };
                            })}
                            className="p-1.5 rounded-lg hover:bg-natural-card border border-transparent hover:border-natural-border transition cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 text-natural-forest-light" />
                          </button>
                          <span className="font-serif font-extrabold text-sm text-natural-forest tracking-wide">
                            {MONTH_NAMES[calMonth]} {calYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCalViewDate(({ year, month }: { year: number; month: number }) => {
                              const d = new Date(year, month + 1, 1);
                              return { year: d.getFullYear(), month: d.getMonth() };
                            })}
                            className="p-1.5 rounded-lg hover:bg-natural-card border border-transparent hover:border-natural-border transition cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4 text-natural-forest-light" />
                          </button>
                        </div>

                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                            <div key={d} className="text-center text-[9px] font-mono font-bold text-natural-forest-light uppercase tracking-wider py-0.5">
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Day squares */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* Leading empty cells */}
                          {Array.from({ length: firstDOW }).map((_, i) => (
                            <div key={`empty-${i}`} />
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
                                  "aspect-square flex items-center justify-center rounded-md text-[11px] font-mono font-bold transition",
                                  hasStudy
                                    ? "bg-natural-forest text-natural-bg"
                                    : "bg-natural-card/50 text-natural-charcoal",
                                  isToday ? "ring-2 ring-natural-clay ring-offset-1" : "",
                                ].join(" ")}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 justify-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-natural-forest" />
                            <span className="text-[10px] font-mono text-natural-forest-light font-bold">Studied</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-natural-card border border-natural-border ring-1 ring-natural-clay" />
                            <span className="text-[10px] font-mono text-natural-forest-light font-bold">Today</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── FEATURE 2: MASTERY BADGES ─────────────────────────── */}
              {(() => {
                const srsCardsList = Object.values(stats.srsCards || {});
                const vocabLearned = Object.keys(stats.vocabularyProgress || {}).filter(k => stats.vocabularyProgress[k]);
                const basicHiragana = HIRAGANA_DATA.filter(h => h.category === "basic");
                const hiraganaComplete = basicHiragana.every(h => (stats.characterProgress[h.kana]?.total || 0) >= 1);
                const kanjiStudied = KANJI_DATA.filter(k => (stats.characterProgress[k.kanji]?.total || 0) >= 1).length;

                const badges = [
                  {
                    emoji: "🌸", name: "First Steps",
                    desc: "Complete your first quiz",
                    earned: stats.totalAttempts > 0,
                  },
                  {
                    emoji: "⚡", name: "Survivor",
                    desc: "Score 30+ in survival mode",
                    earned: (stats.survivalBestScore || 0) >= 30,
                  },
                  {
                    emoji: "🔥", name: "Week Warrior",
                    desc: "Maintain a 7-day streak",
                    earned: stats.streakCount >= 7,
                  },
                  {
                    emoji: "💎", name: "Streak Master",
                    desc: "Maintain a 30-day streak",
                    earned: stats.streakCount >= 30,
                  },
                  {
                    emoji: "📦", name: "Collector",
                    desc: "Add 10 cards to your SRS deck",
                    earned: srsCardsList.length >= 10,
                  },
                  {
                    emoji: "🏆", name: "Deck Master",
                    desc: "Review 50 SRS cards total",
                    earned: (stats.srsReviewedTotal || 0) >= 50,
                  },
                  {
                    emoji: "🌊", name: "Hiragana Complete",
                    desc: "Practice all 46 basic hiragana",
                    earned: hiraganaComplete,
                  },
                  {
                    emoji: "⭐", name: "Kanji Apprentice",
                    desc: "Encounter 25 kanji in practice",
                    earned: kanjiStudied >= 25,
                  },
                  {
                    emoji: "📚", name: "Word Collector",
                    desc: "Learn 50 vocabulary words",
                    earned: vocabLearned.length >= 50,
                  },
                  {
                    emoji: "🎌", name: "N5 Scholar",
                    desc: `Learn all ${VOCABULARY_DATA.length} vocabulary words`,
                    earned: vocabLearned.length >= VOCABULARY_DATA.length,
                  },
                ];

                const earnedCount = badges.filter(b => b.earned).length;

                return (
                  <div className="mb-5">
                    {/* Section header */}
                    <button
                      type="button"
                      onClick={() => setBadgesOpen(o => !o)}
                      className="w-full flex items-center justify-between mb-3 cursor-pointer group"
                    >
                      <h4 className="font-serif font-extrabold text-sm text-natural-forest flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Mastery Badges
                        <span className="text-[10px] font-mono font-bold text-natural-clay bg-natural-clay/10 px-2 py-0.5 rounded-full">
                          {earnedCount}/{badges.length}
                        </span>
                      </h4>
                      <ChevronRight className={`w-4 h-4 text-natural-forest-light transition-transform duration-200 ${badgesOpen ? "rotate-90" : ""}`} />
                    </button>

                    {badgesOpen && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {badges.map((badge) => (
                          <div
                            key={badge.name}
                            className={[
                              "p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition",
                              badge.earned
                                ? "bg-natural-card border-natural-forest/40 shadow-sm"
                                : "bg-natural-card/40 border-natural-border/50 opacity-40 grayscale",
                            ].join(" ")}
                          >
                            <span className="text-2xl leading-none">{badge.emoji}</span>
                            <span className="font-serif font-extrabold text-xs text-natural-forest leading-tight">
                              {badge.name}
                            </span>
                            <span className="text-[9px] font-mono text-natural-forest-light leading-tight font-medium">
                              {badge.desc}
                            </span>
                            {!badge.earned && (
                              <span className="text-[9px] font-mono text-natural-forest-light/60 mt-0.5">🔒 Locked</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Friends Section in Full Profile */}
              <div className="mb-5 p-4 bg-natural-bg border border-natural-border rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif font-extrabold text-sm text-natural-forest flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Friends ({friends.length})
                  </h4>
                </div>

                {/* Add friend form */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={friendUidInput}
                    onChange={(e) => setFriendUidInput(e.target.value)}
                    placeholder="Enter friend code"
                    className="flex-1 px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest"
                  />
                  <input
                    type="text"
                    value={friendNameInput}
                    onChange={(e) => setFriendNameInput(e.target.value)}
                    placeholder="Name"
                    className="w-24 px-3 py-2 bg-natural-card border border-natural-border rounded-xl text-xs font-mono text-natural-charcoal outline-none focus:border-natural-forest"
                  />
                  <button
                    type="button"
                    onClick={handleAddFriend}
                    disabled={!friendUidInput.trim() || isAddingFriend}
                    className="px-3 py-2 bg-natural-forest text-natural-bg rounded-xl text-xs font-bold transition hover:bg-natural-forest/90 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    {isAddingFriend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Add
                  </button>
                </div>
                {addFriendError && (
                  <p className="text-[10px] text-natural-terracotta font-medium mb-2">{addFriendError}</p>
                )}

                {/* Friends list */}
                {friends.length === 0 ? (
                  <p className="text-xs text-natural-forest-light text-center py-3 font-mono">
                    No friends yet. Add friends by friend code to invite them to duels!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.uid}
                        className="flex items-center justify-between p-2.5 bg-natural-card rounded-xl group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-natural-forest/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-natural-forest" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold font-serif text-natural-charcoal truncate">{friend.name}</p>
                            <p className="text-[9px] font-mono text-natural-forest-light truncate">{friend.uid?.slice(0, 16) ?? "unknown"}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleInviteFriend(friend.uid)}
                            className="p-1.5 rounded-lg hover:bg-natural-clay/10 text-natural-clay transition cursor-pointer"
                            title="Invite to Room"
                          >
                            <Mail className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend.uid)}
                            className="p-1.5 rounded-lg hover:bg-natural-terracotta/10 text-natural-terracotta transition cursor-pointer"
                            title="Remove"
                          >
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stages filters chips */}
              <div className="flex flex-wrap gap-2 mb-4 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => setArchiveFilter("all")}
                  className={`p-1.5 px-3 rounded-lg text-xs font-mono tracking-wider transition font-bold cursor-pointer ${archiveFilter === "all"
                    ? "bg-natural-forest text-natural-bg"
                    : "bg-natural-bg border border-natural-border text-natural-forest-light hover:border-natural-forest"
                    }`}
                >
                  All Characters
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("basic")}
                  className={`p-1.5 px-3 rounded-lg text-xs font-mono tracking-wider transition font-bold cursor-pointer ${archiveFilter === "basic"
                    ? "bg-natural-forest text-natural-bg"
                    : "bg-natural-bg border border-natural-border text-natural-forest-light hover:border-natural-forest"
                    }`}
                >
                  Core
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("dakuon")}
                  className={`p-1.5 px-3 rounded-lg text-xs font-mono tracking-wider transition font-bold cursor-pointer ${archiveFilter === "dakuon"
                    ? "bg-natural-forest text-natural-bg"
                    : "bg-natural-bg border border-natural-border text-natural-forest-light hover:border-natural-forest"
                    }`}
                >
                  Voiced
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("handakuon")}
                  className={`p-1.5 px-3 rounded-lg text-xs font-mono tracking-wider transition font-bold cursor-pointer ${archiveFilter === "handakuon"
                    ? "bg-natural-forest text-natural-bg"
                    : "bg-natural-bg border border-natural-border text-natural-forest-light hover:border-natural-forest"
                    }`}
                >
                  Semi-voiced
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("yoon")}
                  className={`p-1.5 px-3 rounded-lg text-xs font-mono tracking-wider transition font-bold cursor-pointer ${archiveFilter === "yoon"
                    ? "bg-natural-forest text-natural-bg"
                    : "bg-natural-bg border border-natural-border text-natural-forest-light hover:border-natural-forest"
                    }`}
                >
                  Combos
                </button>
              </div>

              {/* Script selector: Hiragana / Katakana */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-natural-forest-light uppercase tracking-wider font-bold">Script:</span>
                <div className="flex gap-1 bg-natural-card/85 p-1 rounded-xl border border-natural-border/75">
                  {(["hiragana", "katakana"] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setProfileCharSet(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-serif font-bold transition cursor-pointer capitalize ${profileCharSet === s
                        ? "bg-natural-forest text-natural-bg shadow-sm"
                        : "text-natural-forest-light hover:text-natural-forest hover:bg-natural-bg/40"
                        }`}
                    >
                      {s === "hiragana" ? "ひ Hiragana" : "カ Katakana"}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-natural-forest-light font-mono italic">
                  {profileCharSet === "hiragana"
                    ? `${Object.keys(stats.characterProgress).filter(k => HIRAGANA_DATA.some(h => h.kana === k && stats.characterProgress[k]?.total > 0)).length}/${HIRAGANA_DATA.length} studied`
                    : `${Object.keys(stats.characterProgress).filter(k => KATAKANA_DATA.some(h => h.kana === k && stats.characterProgress[k]?.total > 0)).length}/${KATAKANA_DATA.length} studied`}
                </span>
              </div>

              {/* Master characters grid showing separate tries and mastery gold/silver/bronze icons */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-[400px] overflow-y-auto pr-2">
                {(profileCharSet === "hiragana" ? HIRAGANA_DATA : KATAKANA_DATA).filter((k) => archiveFilter === "all" || k.category === archiveFilter).map((item) => {
                  const data = stats.characterProgress[item.kana] || { correct: 0, total: 0 };

                  let tierColor = "border-natural-border bg-natural-bg/40 text-natural-forest-light/65";
                  let tierLabel = "";

                  if (data.total > 0) {
                    const accuracy = data.correct / data.total;
                    if (accuracy >= 0.82 && data.total >= 4) {
                      tierColor = "border-natural-clay/50 bg-natural-clay/10 text-natural-clay";
                      tierLabel = "Au (Gold)";
                    } else if (accuracy >= 0.6 && data.total >= 2) {
                      tierColor = "border-natural-forest/50 bg-natural-forest/10 text-natural-forest";
                      tierLabel = "Ag (Silver)";
                    } else {
                      tierColor = "border-natural-terracotta/40 bg-natural-terracotta/10 text-natural-terracotta";
                      tierLabel = "Cu (Bronze)";
                    }
                  }

                  return (
                    <div
                      key={item.kana}
                      onClick={() => speakJapanese(item.kana)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center relative cursor-pointer group transition duration-300 transform hover:scale-105 hover:bg-natural-card ${tierColor}`}
                      title={`${item.kana} (${item.romaji}) - Tries: ${data.total}, Successes: ${data.correct}`}
                    >
                      {/* Floating dynamic micro stamp badge */}
                      {tierLabel && (
                        <span className="absolute top-1 right-1 text-[8px] font-mono leading-none scale-90 opacity-60 group-hover:opacity-100 font-extrabold uppercase">
                          {tierLabel.slice(0, 2)}
                        </span>
                      )}

                      <span className="text-xl font-bold font-serif">{item.kana}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wide opacity-80 mt-1 font-bold">
                        {item.romaji}
                      </span>

                      {/* Diagnostic ratio footprint */}
                      <span className="text-[8px] font-mono tracking-wider opacity-60 mt-1 leading-none font-bold">
                        {data.correct}/{data.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

  );
}