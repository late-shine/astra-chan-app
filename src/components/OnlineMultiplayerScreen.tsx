import type React from "react";
import { motion } from "motion/react";
import { ArrowBigRight, ChevronLeft, Clock, Copy, Globe, Loader2, LogOut, Mail, Trophy, UserPlus, Volume2, Wifi } from "lucide-react";
import type { HiraganaItem, KatakanaItem } from "../types";
import type { FriendRecord, OnlineDifficulty, QuizMode, RoomState } from "../multiplayerOnline";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type OnlinePhase = "menu" | "config" | "join" | "lobby" | "playing" | "finished";
type OnlineRole = "host" | "guest" | null;
type OnlineAlphabet = "hiragana" | "katakana" | "mixed";
type OnlineMultiplayerMode = "competitive" | "parallel";
type OnlineAnswerStatus = "correct" | "incorrect" | null;

interface OnlineMultiplayerScreenProps {
  onlinePhase: OnlinePhase;
  setOnlinePhase: React.Dispatch<React.SetStateAction<OnlinePhase>>;
  onlineRoomCode: string;
  onlineRoomState: RoomState | null;
  onlineRole: OnlineRole;
  onlineHostNameInput: string;
  setOnlineHostNameInput: React.Dispatch<React.SetStateAction<string>>;
  onlineJoinCode: string;
  setOnlineJoinCode: React.Dispatch<React.SetStateAction<string>>;
  onlineJoinName: string;
  setOnlineJoinName: React.Dispatch<React.SetStateAction<string>>;
  onlineAnswerLocked: boolean;
  onlineQuestionChoices: string[];
  onlineAnswerStatus: OnlineAnswerStatus;
  onlineIsConnecting: boolean;
  onlineConnectionError: string | null;
  setOnlineConnectionError: React.Dispatch<React.SetStateAction<string | null>>;
  onlineDifficulty: OnlineDifficulty;
  setOnlineDifficulty: React.Dispatch<React.SetStateAction<OnlineDifficulty>>;
  onlineQuizMode: QuizMode;
  setOnlineQuizMode: React.Dispatch<React.SetStateAction<QuizMode>>;
  onlineTypedAnswer: string;
  setOnlineTypedAnswer: React.Dispatch<React.SetStateAction<string>>;
  onlineTimeLeft: number;
  onlineMultiplayerMode: OnlineMultiplayerMode;
  setOnlineMultiplayerMode: React.Dispatch<React.SetStateAction<OnlineMultiplayerMode>>;
  onlineTimerMax: number;
  onlineShowResult: boolean;
  onlineRomajiInputRef: React.RefObject<HTMLInputElement | null>;
  onlineQuestionPoolRef: React.RefObject<(HiraganaItem | KatakanaItem)[]>;
  onlineAlphabet: OnlineAlphabet;
  setOnlineAlphabet: React.Dispatch<React.SetStateAction<OnlineAlphabet>>;
  onlinePickerDeck: (HiraganaItem | KatakanaItem)[];
  onlinePickerSelectedChars: Set<string>;
  setOnlinePickerSelectedChars: React.Dispatch<React.SetStateAction<Set<string>>>;
  onlineQuestionCount: number;
  setOnlineQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  quizMode: QuizMode;
  friends: FriendRecord[];
  showToast: (message: string) => void;
  speakJapanese: (phrase: string) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  handleCreateOnlineRoom: () => void;
  handleJoinOnlineRoom: () => void;
  handleStartOnlineGame: () => void;
  handleOnlineSubmitAnswer: (answer: string) => void;
  handleLeaveOnlineRoom: () => void;
  handleInviteFriend: (friendUid: string) => void;
  getOnlinePlayerQuestionIndex: (room: RoomState, role: "host" | "guest") => number;
  getOnlinePlayerFinished: (room: RoomState, role: "host" | "guest") => boolean;
}

export default function OnlineMultiplayerScreen({
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
}: OnlineMultiplayerScreenProps) {
  return (<motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-natural-card border border-natural-border/70 p-6 rounded-3xl flex flex-col items-center shadow-lg backdrop-blur gap-5 min-h-[400px] justify-center"
            >
              {/* ── MENU PHASE ── */}
              {onlinePhase === "menu" && (
                <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                  <div className="text-center">
                    <p className="text-4xl mb-2">🌐</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Speed Duel</h3>
                    <p className="text-xs text-natural-forest-light font-mono mt-1">Race to answer first! Only the quickest mind scores.</p>
                  </div>

                  {onlineConnectionError && (
                    <div className="w-full p-3 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-xl text-xs text-natural-terracotta font-medium text-center">
                      {onlineConnectionError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => { setOnlinePhase("config"); setOnlineConnectionError(null); }}
                    className="w-full py-3 bg-natural-forest text-natural-bg rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-forest/90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wifi className="w-4 h-4" />
                    Host a Duel
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOnlinePhase("join"); setOnlineConnectionError(null); }}
                    className="w-full py-3 bg-natural-clay/10 border border-natural-clay/35 text-natural-clay rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-clay/20 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    Join a Duel
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentScreen("menu")}
                    className="text-xs text-natural-forest-light hover:text-natural-forest font-mono transition cursor-pointer"
                  >
                    ← Return to Menu
                  </button>
                </div>
              )}

              {/* ── CONFIG PHASE (Host sets difficulty & quiz mode) ── */}
              {onlinePhase === "config" && (
                <div className="flex flex-col items-center gap-5 w-full max-w-md">
                  <div className="text-center">
                    <p className="text-4xl mb-2">⚙️</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Duel Settings</h3>
                    <p className="text-xs text-natural-forest-light font-mono mt-1">Configure the match before your rival arrives.</p>
                  </div>

                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Your Wizard Name
                    </label>
                    <input
                      type="text"
                      value={onlineHostNameInput}
                      onChange={(e) => setOnlineHostNameInput(e.target.value)}
                      placeholder="Witch Host"
                      maxLength={16}
                      className="w-full p-2.5 bg-natural-bg text-center font-serif text-sm rounded-xl border border-natural-border focus:border-natural-forest outline-none text-natural-charcoal font-bold transition"
                    />
                  </div>

                  {/* Script / Alphabet selector */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Script
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "hiragana" as const, label: "Hiragana" },
                        { key: "katakana" as const, label: "Katakana" },
                        { key: "mixed" as const, label: "Mixed" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setOnlineAlphabet(opt.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${onlineAlphabet === opt.key
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                            : "bg-natural-bg border-natural-border/60 text-natural-charcoal hover:border-natural-forest/40"
                          }`}
                        >
                          <span className="block text-xs font-bold">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Character picker */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider">
                        Characters
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${onlinePickerSelectedChars.size < 3 ? "text-natural-terracotta" : "text-natural-forest"}`}>
                        {onlinePickerSelectedChars.size} selected
                      </span>
                    </div>
                    <div className="max-h-52 overflow-y-auto border border-natural-border rounded-xl p-3 bg-natural-bg/60 flex flex-col gap-4">
                      {(() => {
                        const groupOrder: string[] = [];
                        const groupMap: Record<string, (HiraganaItem | KatakanaItem)[]> = {};
                        for (const char of onlinePickerDeck) {
                          if (!groupMap[char.group]) {
                            groupOrder.push(char.group);
                            groupMap[char.group] = [];
                          }
                          groupMap[char.group].push(char);
                        }
                        return groupOrder.map((group) => {
                          const chars = groupMap[group];
                          const allSelected = chars.every((c) => onlinePickerSelectedChars.has(c.kana));
                          return (
                            <div key={group} className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-widest">
                                  {group}
                                </span>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setOnlinePickerSelectedChars((prev) => {
                                      const next = new Set(prev);
                                      chars.forEach((c) => next.add(c.kana));
                                      return next;
                                    })}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${allSelected
                                      ? "border-natural-forest bg-natural-forest/10 text-natural-forest"
                                      : "border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-forest hover:text-natural-forest"
                                    }`}
                                  >
                                    Select All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOnlinePickerSelectedChars((prev) => {
                                      const next = new Set(prev);
                                      chars.forEach((c) => next.delete(c.kana));
                                      return next;
                                    })}
                                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-natural-border bg-natural-card text-natural-forest-light hover:border-natural-terracotta/70 hover:text-natural-terracotta transition cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {chars.map((char) => {
                                  const isSelected = onlinePickerSelectedChars.has(char.kana);
                                  return (
                                    <button
                                      key={char.kana}
                                      type="button"
                                      title={char.romaji}
                                      onClick={() => setOnlinePickerSelectedChars((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(char.kana)) next.delete(char.kana);
                                        else next.add(char.kana);
                                        return next;
                                      })}
                                      className={`flex flex-col items-center justify-center w-12 h-14 rounded-xl border text-center transition-all duration-150 cursor-pointer select-none ${
                                        isSelected
                                          ? "bg-natural-forest border-natural-forest text-natural-bg shadow-sm scale-105"
                                          : "bg-natural-card border-natural-border text-natural-charcoal hover:border-natural-forest/50 hover:bg-natural-bg"
                                      }`}
                                    >
                                      <span className="text-lg font-bold font-serif leading-none">{char.kana}</span>
                                      <span className={`text-[8px] font-mono mt-0.5 tracking-wide ${isSelected ? "text-natural-bg/70" : "text-natural-forest-light"}`}>
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
                    {onlinePickerSelectedChars.size < 3 && (
                      <p className="text-[10px] text-natural-terracotta font-mono mt-1">Select at least 3 characters</p>
                    )}
                  </div>

                  {/* Question count */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider">
                        Questions
                      </label>
                      <span className="text-[10px] font-mono font-bold text-natural-forest">
                        {Math.min(onlineQuestionCount, onlinePickerSelectedChars.size)} rounds
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "10", count: 10 },
                        { label: "20", count: 20 },
                        { label: "30", count: 30 },
                        { label: "All", count: onlinePickerSelectedChars.size },
                      ].map((option) => {
                        const isAll = option.label === "All";
                        const cappedCount = Math.min(option.count, onlinePickerSelectedChars.size);
                        const isDisabled = onlinePickerSelectedChars.size < 3 || (!isAll && onlinePickerSelectedChars.size < option.count);
                        const isSelected = Math.min(onlineQuestionCount, onlinePickerSelectedChars.size) === cappedCount;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setOnlineQuestionCount(cappedCount)}
                            disabled={isDisabled}
                            title={isAll ? `Use all ${onlinePickerSelectedChars.size} selected characters` : `${option.count} questions`}
                            className={`p-2 rounded-xl border text-center transition cursor-pointer disabled:opacity-50 ${isSelected
                              ? "bg-natural-clay/10 border-natural-clay text-natural-clay font-bold"
                              : "bg-natural-bg border-natural-border/60 text-natural-charcoal hover:border-natural-clay/40"
                              }`}
                          >
                            <span className="block text-xs font-bold">{option.label}</span>
                            {isAll && <span className="text-[9px] font-mono opacity-70">{cappedCount}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Difficulty
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "easy" as const, label: "Easy", desc: "15s" },
                        { key: "medium" as const, label: "Medium", desc: "10s" },
                        { key: "hard" as const, label: "Hard", desc: "5s" },
                        { key: "superhard" as const, label: "Super Hard", desc: "3s" },
                      ].map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setOnlineDifficulty(d.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${onlineDifficulty === d.key
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                            : "bg-natural-bg border-natural-border/60 text-natural-charcoal hover:border-natural-forest/40"
                            }`}
                        >
                          <span className="block text-xs font-bold">{d.label}</span>
                          <span className="text-[10px] font-mono opacity-70">{d.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quiz Mode */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Quiz Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "choice" as const, label: "Multiple Choice", desc: "Pick from options" },
                        { key: "romaji" as const, label: "Type Romaji", desc: "Write the answer" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setOnlineQuizMode(m.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${onlineQuizMode === m.key
                            ? "bg-natural-clay/10 border-natural-clay text-natural-clay font-bold"
                            : "bg-natural-bg border-natural-border/60 text-natural-charcoal hover:border-natural-clay/40"
                            }`}
                        >
                          <span className="block text-xs font-bold">{m.label}</span>
                          <span className="text-[10px] font-mono opacity-70">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multiplayer Mode */}
                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Duel Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "competitive" as const, label: "⚔️ Competitive", desc: "Score stealing" },
                        { key: "parallel" as const, label: "🎯 Parallel", desc: "Solo race" },
                      ].map((mode) => (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={() => setOnlineMultiplayerMode(mode.key)}
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${onlineMultiplayerMode === mode.key
                            ? "bg-natural-forest/10 border-natural-forest text-natural-forest font-bold"
                            : "bg-natural-bg border-natural-border/60 text-natural-charcoal hover:border-natural-forest/40"
                            }`}
                        >
                          <span className="block text-xs font-bold">{mode.label}</span>
                          <span className="text-[10px] font-mono opacity-70">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {onlineConnectionError && (
                    <div className="w-full p-3 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-xl text-xs text-natural-terracotta font-medium text-center">
                      {onlineConnectionError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCreateOnlineRoom}
                    disabled={onlineIsConnecting || onlinePickerSelectedChars.size < 3}
                    className="w-full py-3 bg-natural-forest text-natural-bg rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-forest/90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {onlineIsConnecting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Wifi className="w-4 h-4" /> Create Room</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOnlinePhase("menu"); setOnlineConnectionError(null); }}
                    className="text-xs text-natural-forest-light hover:text-natural-forest font-mono transition cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* ── JOIN PHASE (Guest) ── */}
              {onlinePhase === "join" && (
                <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                  <div className="text-center">
                    <p className="text-4xl mb-2">🔑</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Join a Duel</h3>
                    <p className="text-xs text-natural-forest-light font-mono mt-1">Enter the room code from your host!</p>
                  </div>

                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Your Shadow Name
                    </label>
                    <input
                      type="text"
                      value={onlineJoinName}
                      onChange={(e) => setOnlineJoinName(e.target.value)}
                      placeholder="Shadow Guest"
                      maxLength={16}
                      className="w-full p-2.5 bg-natural-bg text-center font-serif text-sm rounded-xl border border-natural-border focus:border-natural-forest outline-none text-natural-charcoal font-bold transition"
                    />
                  </div>

                  <div className="w-full">
                    <label className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider block mb-1.5">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={onlineJoinCode}
                      onChange={(e) => setOnlineJoinCode(e.target.value.toUpperCase())}
                      placeholder="ABCDEF"
                      maxLength={6}
                      className="w-full p-2.5 bg-natural-bg text-center font-mono text-lg rounded-xl border border-natural-border focus:border-natural-forest outline-none text-natural-charcoal font-bold tracking-[0.3em] uppercase transition"
                    />
                  </div>

                  {onlineConnectionError && (
                    <div className="w-full p-3 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-xl text-xs text-natural-terracotta font-medium text-center">
                      {onlineConnectionError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleJoinOnlineRoom}
                    disabled={onlineIsConnecting || onlineJoinCode.length !== 6}
                    className="w-full py-3 bg-natural-clay text-natural-bg rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-clay/90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {onlineIsConnecting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                    ) : (
                      <><Globe className="w-4 h-4" /> Join Room</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOnlinePhase("menu"); setOnlineConnectionError(null); }}
                    className="text-xs text-natural-forest-light hover:text-natural-forest font-mono transition cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* ── LOBBY PHASE ── */}
              {onlinePhase === "lobby" && onlineRoomState && (
                <div className="flex flex-col items-center gap-5 w-full max-w-md">
                  <div className="text-center">
                    <p className="text-4xl mb-2">🏰</p>
                    <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">
                      {onlineRole === "host" ? "Your Duel Room" : "Joined Room"}
                    </h3>
                  </div>

                  {/* Room Code */}
                  <div className="w-full p-4 bg-natural-bg border border-natural-border rounded-2xl flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-natural-forest-light uppercase tracking-widest font-bold">Room Code</span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-mono font-extrabold text-natural-forest tracking-[0.2em]">{onlineRoomCode}</span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(onlineRoomCode); showToast("Copied!"); }}
                        className="p-1.5 bg-natural-card hover:bg-natural-forest/10 border border-natural-border rounded-lg transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-natural-forest" />
                      </button>
                    </div>
                    {onlineRole === "host" && (
                      <span className="text-[10px] text-natural-forest-light font-mono">Share this code with your rival</span>
                    )}
                  </div>

                  {/* Quick invite friends if host */}
                  {onlineRole === "host" && friends.length > 0 && (
                    <div className="w-full">
                      <p className="text-[10px] font-mono font-bold text-natural-forest-light uppercase tracking-wider mb-1.5">Invite Friends</p>
                      <div className="flex flex-wrap gap-1.5">
                        {friends.slice(0, 5).map((f) => (
                          <button
                            key={f.uid}
                            type="button"
                            onClick={() => handleInviteFriend(f.uid)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-natural-bg border border-natural-border rounded-lg text-[10px] font-bold font-mono text-natural-forest hover:border-natural-clay hover:bg-natural-clay/5 transition cursor-pointer"
                          >
                            <Mail className="w-2.5 h-2.5" />
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Settings summary */}
                  <div className="w-full flex gap-2 justify-center flex-wrap">
                    <span className="px-2 py-1 bg-natural-forest/10 border border-natural-forest/30 rounded-lg text-[10px] font-mono font-bold text-natural-forest uppercase">
                      {onlineRoomState.settings.quizMode === "choice" ? "Multiple Choice" : "Type Romaji"}
                    </span>
                    <span className="px-2 py-1 bg-natural-clay/10 border border-natural-clay/30 rounded-lg text-[10px] font-mono font-bold text-natural-clay uppercase">
                      {onlineRoomState.settings.difficulty}
                    </span>
                    <span className="px-2 py-1 bg-natural-bg border border-natural-border rounded-lg text-[10px] font-mono font-bold text-natural-forest-light uppercase">
                      {(onlineRoomState.settings.questionDuration / 1000).toFixed(0)}s
                    </span>
                    <span className="px-2 py-1 bg-natural-bg border border-natural-border rounded-lg text-[10px] font-mono font-bold text-natural-forest-light uppercase">
                      {onlineRoomState.settings.questionCount || 10} rounds
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase ${
                      (onlineRoomState.settings.multiplayerMode ?? "competitive") === "parallel"
                        ? "bg-natural-clay/10 border border-natural-clay/30 text-natural-clay"
                        : "bg-natural-forest/10 border border-natural-forest/30 text-natural-forest"
                    }`}>
                      {(onlineRoomState.settings.multiplayerMode ?? "competitive") === "parallel" ? "🎯 Parallel" : "⚔️ Competitive"}
                    </span>
                  </div>

                  {/* Players */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${onlineRoomState.hostId ? "bg-natural-forest/10 border-natural-forest/40" : "bg-natural-bg border-natural-border"}`}>
                      <div className="relative w-12 h-12 rounded-full border-2 border-natural-forest/40 bg-natural-bg overflow-hidden flex items-center justify-center text-lg font-serif font-bold text-natural-forest">
                        {onlineRoomState.hostAvatar ? (
                          <img src={onlineRoomState.hostAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(onlineRoomState.hostName || "H").charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-natural-card ${onlineRoomState.hostId ? "bg-green-500" : "bg-gray-400"}`} />
                      </div>
                      <span className="text-xs font-serif font-bold text-natural-forest">{onlineRoomState.hostName || "Waiting..."}</span>
                      <span className="text-[9px] font-mono text-natural-forest-light uppercase font-bold">Host</span>
                    </div>
                    <div className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${onlineRoomState.guestId ? "bg-natural-clay/10 border-natural-clay/40" : "bg-natural-bg border-natural-border"}`}>
                      <div className="relative w-12 h-12 rounded-full border-2 border-natural-clay/40 bg-natural-bg overflow-hidden flex items-center justify-center text-lg font-serif font-bold text-natural-clay">
                        {onlineRoomState.guestAvatar ? (
                          <img src={onlineRoomState.guestAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(onlineRoomState.guestName || "G").charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-natural-card ${onlineRoomState.guestId ? "bg-green-500" : "bg-gray-400"}`} />
                      </div>
                      <span className="text-xs font-serif font-bold text-natural-clay">{onlineRoomState.guestName || "Waiting..."}</span>
                      <span className="text-[9px] font-mono text-natural-forest-light uppercase font-bold">Guest</span>
                    </div>
                  </div>

                  {onlineRole === "host" ? (
                    <>
                      {!onlineRoomState.guestId ? (
                        <div className="flex flex-col items-center gap-2 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-natural-forest" />
                          <p className="text-xs text-natural-forest-light font-mono">Waiting for your rival...</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartOnlineGame}
                          className="w-full py-3 bg-natural-forest text-natural-bg rounded-2xl font-serif font-extrabold text-sm tracking-wider hover:bg-natural-forest/90 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          Start Speed Duel!
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-natural-clay" />
                      <p className="text-xs text-natural-forest-light font-mono">Waiting for the host to start...</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLeaveOnlineRoom}
                    className="text-xs text-natural-terracotta hover:text-natural-terracotta/80 font-mono transition cursor-pointer flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Leave Room
                  </button>
                </div>
              )}

              {/* ── PLAYING PHASE ── */}
              {onlinePhase === "playing" && onlineRoomState && (() => {
                const myRole = onlineRole;
                if (!myRole) return null;

                const isParallel = (onlineRoomState.settings.multiplayerMode ?? "competitive") === "parallel";
                const currentQIdx = getOnlinePlayerQuestionIndex(onlineRoomState, myRole);
                const totalQuestions = onlineRoomState.settings.questionCount || 10;
                const iFinished = getOnlinePlayerFinished(onlineRoomState, myRole) || currentQIdx >= totalQuestions;
                const opponentRole = myRole === "host" ? "guest" : "host";
                const opponentName = opponentRole === "host"
                  ? (onlineRoomState.hostName || "Host")
                  : (onlineRoomState.guestName || "Guest");

                if (isParallel && iFinished) {
                  return (
                    <div className="flex flex-col items-center gap-4 w-full text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-natural-clay" />
                      <div>
                        <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">Finished!</h3>
                        <p className="text-xs text-natural-forest-light font-mono mt-1">
                          Waiting for {opponentName} to finish their rounds...
                        </p>
                      </div>
                      <div className="w-full max-w-xs p-3 bg-natural-bg/70 border border-natural-border rounded-2xl text-[10px] font-mono text-natural-forest-light">
                        Your answers are saved. Results will appear when both players finish.
                      </div>
                    </div>
                  );
                }
                const question = onlineQuestionPoolRef.current[currentQIdx];
                if (!question) return null;

                const answers = onlineRoomState.answers?.[currentQIdx];
                const myTimeKey = myRole === "host" ? "hostTime" : "guestTime";
                const opponentAnswered = answers?.[opponentRole === "host" ? "hostTime" : "guestTime"] !== undefined;
                const iAnswered = answers?.[myTimeKey] !== undefined;
                const winnerName = answers?.winnerName || null;
                const isLocked = answers?.questionLocked || false;
                const quizMode = onlineRoomState.settings.quizMode || "choice";

                return (
                  <div className="flex flex-col items-center gap-4 w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between w-full border-b border-natural-border pb-3">
                      <button
                        type="button"
                        onClick={handleLeaveOnlineRoom}
                        className="px-3 py-1.5 rounded-lg border border-natural-border text-natural-terracotta text-xs hover:border-natural-terracotta hover:bg-natural-terracotta/10 bg-natural-bg/40 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" /> Forfeit
                      </button>

                      <span className="text-xs font-mono text-natural-forest font-bold">
                        {currentQIdx + 1} / {totalQuestions}
                      </span>

                      <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        {isParallel ? (
                          <span className="px-2 py-0.5 rounded-lg bg-natural-clay/15 text-natural-clay border border-natural-clay/30">
                            🎯 Solo Race
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-natural-forest text-natural-bg">
                            {(onlineRole === "host" ? onlineRoomState.hostName : onlineRoomState.guestName)?.slice(0, 8) || "You"}: {onlineRole === "host" ? onlineRoomState.scores.host : onlineRoomState.scores.guest}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timer bar */}
                    <div className="w-full bg-natural-bg h-3 rounded-full overflow-hidden border border-natural-border relative">
                      <div
                        className={`h-full transition-all duration-300 ease-linear ${onlineTimeLeft <= 3 ? "bg-natural-terracotta" : "bg-natural-forest"}`}
                        style={{ width: `${Math.max(0, (onlineTimeLeft / onlineTimerMax) * 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-extrabold text-natural-charcoal uppercase tracking-widest">
                        {onlineTimeLeft}s
                      </span>
                    </div>

                    {!isParallel && (
                      <div className={`w-full text-center py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${opponentAnswered ? "bg-natural-forest/10 text-natural-forest border border-natural-forest/30" : "bg-natural-bg border border-natural-border text-natural-forest-light"}`}>
                        {opponentAnswered ? `${opponentName} answered!` : `Waiting for ${opponentName}...`}
                      </div>
                    )}

                    {/* Kana card */}
                    <motion.div
                      key={`online-q-${currentQIdx}`}
                      animate={
                        onlineAnswerStatus === "correct"
                          ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
                          : onlineAnswerStatus === "incorrect"
                            ? { x: [-10, 10, -7, 7, 0] }
                            : {}
                      }
                      transition={{ duration: 0.4 }}
                      className={`w-44 h-44 border-2 rounded-3xl flex items-center justify-center bg-natural-bg/50 shadow-sm relative transition ${onlineAnswerStatus === "correct"
                        ? "border-natural-forest bg-natural-forest/10"
                        : onlineAnswerStatus === "incorrect"
                          ? "border-natural-terracotta bg-natural-terracotta/10"
                          : isLocked
                            ? "border-natural-clay/50 bg-natural-clay/5"
                            : "border-natural-border"
                        }`}
                    >
                      <span className="text-7xl font-bold font-serif text-natural-forest tracking-wider select-none">
                        {question.kana}
                      </span>
                      <span className="absolute bottom-3 text-[10px] text-natural-forest-light/60 font-mono tracking-widest uppercase font-semibold">
                        {question.group}
                      </span>
                    </motion.div>

                    {/* Winner / Result overlay */}
                    {onlineShowResult && !isParallel && winnerName && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-center py-3 bg-natural-forest/15 border border-natural-forest/40 rounded-xl"
                      >
                        <span className="text-sm font-serif font-extrabold text-natural-forest">
                          🏆 {winnerName} got it right!
                        </span>
                      </motion.div>
                    )}
                    {onlineShowResult && !isParallel && !winnerName && isLocked && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-center py-3 bg-natural-terracotta/10 border border-natural-terracotta/30 rounded-xl"
                      >
                        <span className="text-sm font-serif font-extrabold text-natural-terracotta">
                          ⏰ Time's up! No one scored.
                        </span>
                      </motion.div>
                    )}
                    {onlineShowResult && isParallel && isLocked && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-center py-3 bg-natural-forest/10 border border-natural-forest/30 rounded-xl"
                      >
                        <span className="text-sm font-serif font-extrabold text-natural-forest">
                          ⚡ Both answered! Next question...
                        </span>
                      </motion.div>
                    )}

                    {/* Answer input area */}
                    {isParallel && iAnswered ? (
                      <div className="w-full text-center py-3 px-4 bg-natural-forest/10 border border-natural-forest/30 rounded-xl">
                        <span className="text-sm font-serif font-extrabold text-natural-forest block">
                          {onlineAnswerStatus === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                        </span>
                        <span className="text-[10px] font-mono text-natural-forest-light mt-0.5 block">
                          Loading your next question...
                        </span>
                      </div>
                    ) : !isLocked ? (
                      quizMode === "choice" ? (
                        <div className={`grid gap-3 w-full max-w-md ${onlineQuestionChoices.length === 6 ? "grid-cols-3" : "grid-cols-2"}`}>
                          {onlineQuestionChoices.map((ch, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleOnlineSubmitAnswer(ch)}
                              disabled={onlineAnswerLocked}
                              className={`p-3 rounded-xl border font-mono text-base font-bold tracking-widest transition uppercase cursor-pointer bg-natural-bg/50 border-natural-border/70 hover:border-natural-forest text-natural-charcoal/80 disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full max-w-sm flex flex-col gap-3">
                          <input
                            type="text"
                            ref={onlineRomajiInputRef}
                            value={onlineTypedAnswer}
                            onChange={(e) => setOnlineTypedAnswer(e.target.value)}
                            placeholder="Type romaji..."
                            disabled={onlineAnswerLocked}
                            className="w-full p-3 bg-natural-bg text-center font-mono text-lg rounded-xl border border-natural-border focus:border-natural-forest outline-none text-natural-charcoal uppercase tracking-wider font-bold disabled:opacity-40"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && onlineTypedAnswer.trim()) {
                                handleOnlineSubmitAnswer(onlineTypedAnswer);
                              }
                            }}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => { if (onlineTypedAnswer.trim()) handleOnlineSubmitAnswer(onlineTypedAnswer); }}
                            disabled={onlineAnswerLocked || !onlineTypedAnswer.trim()}
                            className="w-full py-2.5 bg-natural-forest text-natural-bg rounded-xl font-bold tracking-wide transition shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                          >
                            Cast Answer <ArrowBigRight className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="w-full text-center py-3 bg-natural-bg border border-natural-border rounded-xl">
                        <span className="text-xs font-mono text-natural-forest-light font-bold">
                          {isParallel
                            ? "Both answered — next question incoming..."
                            : winnerName ? "Question locked — next question incoming..." : "No winner — next question incoming..."}
                        </span>
                      </div>
                    )}

                    {/* Pronounce helper */}
                    <button
                      type="button"
                      onClick={() => speakJapanese(question.kana)}
                      className="p-1.5 bg-natural-bg hover:bg-natural-forest/10 text-natural-forest border border-natural-border rounded-lg transition shadow-sm cursor-pointer"
                      title="Pronounce"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              {/* ── FINISHED PHASE ── */}
              {onlinePhase === "finished" && onlineRoomState && (() => {
                const { scores, hostName, guestName, settings, answers } = onlineRoomState;
                const isParallel = (settings.multiplayerMode ?? "competitive") === "parallel";

                // ── Parallel mode: compute per-player stats from raw answer data ──
                if (isParallel) {
                  const questionCount = settings.questionCount || 10;
                  const questionDuration = settings.questionDuration || 10000;

                  let hostCorrectCount = 0;
                  let guestCorrectCount = 0;
                  let hostSpeedSum = 0;
                  let guestSpeedSum = 0;
                  let hostSpeedN = 0;
                  let guestSpeedN = 0;
                  let hostMsSum = 0;
                  let guestMsSum = 0;

                  for (let i = 0; i < questionCount; i++) {
                    const ans = answers?.[i];
                    if (!ans) continue;
                    const qStart = ans.questionStartedAt;

                    if (ans.hostCorrect) {
                      hostCorrectCount++;
                      if (ans.hostTime !== undefined && qStart) {
                        const ms = ans.hostTime - qStart;
                        hostMsSum += ms;
                        hostSpeedSum += Math.max(0, Math.min(100, ((questionDuration - ms) / questionDuration) * 100));
                        hostSpeedN++;
                      }
                    }
                    if (ans.guestCorrect) {
                      guestCorrectCount++;
                      if (ans.guestTime !== undefined && qStart) {
                        const ms = ans.guestTime - qStart;
                        guestMsSum += ms;
                        guestSpeedSum += Math.max(0, Math.min(100, ((questionDuration - ms) / questionDuration) * 100));
                        guestSpeedN++;
                      }
                    }
                  }

                  const hostAccuracy = (hostCorrectCount / questionCount) * 100;
                  const guestAccuracy = (guestCorrectCount / questionCount) * 100;
                  const hostSpeedAvg = hostSpeedN > 0 ? hostSpeedSum / hostSpeedN : 0;
                  const guestSpeedAvg = guestSpeedN > 0 ? guestSpeedSum / guestSpeedN : 0;
                  const hostCombined = (hostAccuracy * 0.7) + (hostSpeedAvg * 0.3);
                  const guestCombined = (guestAccuracy * 0.7) + (guestSpeedAvg * 0.3);
                  const hostAvgSec = hostSpeedN > 0 ? (hostMsSum / hostSpeedN / 1000).toFixed(1) : "—";
                  const guestAvgSec = guestSpeedN > 0 ? (guestMsSum / guestSpeedN / 1000).toFixed(1) : "—";

                  const tied = Math.abs(hostCombined - guestCombined) <= 2;
                  const myRole = onlineRole;
                  const myCombined = myRole === "host" ? hostCombined : guestCombined;
                  const theirCombined = myRole === "host" ? guestCombined : hostCombined;
                  const iWon = !tied && myCombined > theirCombined;

                  const hostIsWinner = !tied && hostCombined > guestCombined;
                  const guestIsWinner = !tied && guestCombined > hostCombined;

                  return (
                    <div className="flex flex-col items-center gap-5 w-full relative overflow-hidden">
                      <span className="absolute text-[120px] font-serif text-natural-forest/5 select-none pointer-events-none top-1/2 -translate-y-1/2">道</span>

                      <div className="text-center relative z-10">
                        <p className="text-4xl mb-2">{tied ? "🤝" : iWon ? "🎉" : "📚"}</p>
                        <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">
                          {tied ? "It's a Tie!" : iWon ? "You Win!" : `${onlineRole === "host" ? (guestName || "Guest") : (hostName || "Host")} Wins!`}
                        </h3>
                        <p className="text-xs text-natural-forest-light font-mono mt-1">🎯 Parallel Race complete — {questionCount} rounds</p>
                      </div>

                      {/* Winner banner */}
                      {!tied && (
                        <div className={`w-full max-w-xs py-2 rounded-xl text-center text-xs font-mono font-bold uppercase tracking-wider ${hostIsWinner ? "bg-natural-forest/10 border border-natural-forest/30 text-natural-forest" : "bg-natural-clay/10 border border-natural-clay/30 text-natural-clay"}`}>
                          🏆 {hostIsWinner ? (hostName || "Host") : (guestName || "Guest")} wins by combined score
                        </div>
                      )}

                      {/* Score cards */}
                      <div className="grid grid-cols-2 gap-3 w-full max-w-sm relative z-10">
                        {/* Host card */}
                        <div className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition ${hostIsWinner ? "bg-natural-forest/10 border-natural-forest shadow-sm" : "bg-natural-bg border-natural-border"}`}>
                          {hostIsWinner && <Trophy className="w-4 h-4 text-natural-clay mb-0.5" />}
                          <span className="text-[9px] font-mono font-bold text-natural-forest-light uppercase tracking-widest">
                            {hostName || "Host"}
                          </span>
                          {/* Combined score — big */}
                          <span className={`text-2xl font-mono font-extrabold leading-none ${hostIsWinner ? "text-natural-forest" : "text-natural-charcoal"}`}>
                            {hostCombined.toFixed(1)}
                          </span>
                          <span className="text-[9px] text-natural-forest-light font-mono uppercase">combined</span>
                          {/* Breakdown */}
                          <div className="w-full mt-1.5 pt-1.5 border-t border-natural-border/60 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Accuracy</span>
                              <span className="font-bold text-natural-charcoal">{hostAccuracy.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Avg time</span>
                              <span className="font-bold text-natural-charcoal">{hostAvgSec}s</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Correct</span>
                              <span className="font-bold text-natural-charcoal">{hostCorrectCount}/{questionCount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Guest card */}
                        <div className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition ${guestIsWinner ? "bg-natural-clay/10 border-natural-clay shadow-sm" : "bg-natural-bg border-natural-border"}`}>
                          {guestIsWinner && <Trophy className="w-4 h-4 text-natural-clay mb-0.5" />}
                          <span className="text-[9px] font-mono font-bold text-natural-forest-light uppercase tracking-widest">
                            {guestName || "Guest"}
                          </span>
                          <span className={`text-2xl font-mono font-extrabold leading-none ${guestIsWinner ? "text-natural-clay" : "text-natural-charcoal"}`}>
                            {guestCombined.toFixed(1)}
                          </span>
                          <span className="text-[9px] text-natural-forest-light font-mono uppercase">combined</span>
                          <div className="w-full mt-1.5 pt-1.5 border-t border-natural-border/60 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Accuracy</span>
                              <span className="font-bold text-natural-charcoal">{guestAccuracy.toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Avg time</span>
                              <span className="font-bold text-natural-charcoal">{guestAvgSec}s</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-natural-forest-light">Correct</span>
                              <span className="font-bold text-natural-charcoal">{guestCorrectCount}/{questionCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scoring legend */}
                      <div className="w-full max-w-sm p-3 bg-natural-bg/60 border border-natural-border/60 rounded-2xl text-[10px] font-mono text-natural-forest-light relative z-10">
                        <span className="font-bold text-natural-clay uppercase tracking-wider block mb-1">Score Formula</span>
                        <span className="block">Combined = (Accuracy × 70%) + (Speed × 30%)</span>
                        <span className="block mt-0.5 opacity-70">Tie if within 2 points · Speed measured on correct answers only</span>
                      </div>

                      <div className="flex gap-3 flex-wrap justify-center relative z-10">
                        <button
                          type="button"
                          onClick={handleLeaveOnlineRoom}
                          className="px-6 py-2.5 bg-natural-forest text-natural-bg rounded-2xl text-sm font-serif font-extrabold tracking-wider hover:bg-natural-forest/90 transition shadow-sm cursor-pointer flex items-center gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Back to Menu
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Competitive mode (original) ──────────────────────────────────
                const tied = scores.host === scores.guest;
                const myScore = onlineRole === "host" ? scores.host : scores.guest;
                const theirScore = onlineRole === "host" ? scores.guest : scores.host;
                const opponentName = onlineRole === "host" ? (guestName || "Guest") : (hostName || "Host");
                const iWon = !tied && myScore > theirScore;

                return (
                  <div className="flex flex-col items-center gap-5 w-full relative overflow-hidden">
                    <span className="absolute text-[120px] font-serif text-natural-forest/5 select-none pointer-events-none top-1/2 -translate-y-1/2">勝</span>

                    <div className="text-center relative z-10">
                      <p className="text-4xl mb-2">{tied ? "🤝" : iWon ? "🎉" : "📚"}</p>
                      <h3 className="font-serif font-extrabold text-xl text-natural-forest tracking-wide">
                        {tied ? "It's a Tie!" : iWon ? "You Win!" : `${opponentName} Wins!`}
                      </h3>
                      <p className="text-xs text-natural-forest-light font-mono mt-1">Speed Duel complete — {settings.questionCount || 10} rounds</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-xs relative z-10">
                      <div className={`p-4 rounded-2xl border flex flex-col items-center gap-1 transition ${!tied && scores.host > scores.guest ? "bg-natural-forest/10 border-natural-forest shadow-sm" : "bg-natural-bg border-natural-border"}`}>
                        {!tied && scores.host > scores.guest && <Trophy className="w-4 h-4 text-natural-clay mb-0.5" />}
                        <span className={`text-3xl font-mono font-extrabold ${!tied && scores.host > scores.guest ? "text-natural-forest" : "text-natural-charcoal"}`}>
                          {scores.host}<span className="text-base text-natural-forest-light">/10</span>
                        </span>
                        <span className="text-xs font-serif font-bold mt-1 text-natural-forest-light">{hostName || "Host"}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border flex flex-col items-center gap-1 transition ${!tied && scores.guest > scores.host ? "bg-natural-clay/10 border-natural-clay shadow-sm" : "bg-natural-bg border-natural-border"}`}>
                        {!tied && scores.guest > scores.host && <Trophy className="w-4 h-4 text-natural-clay mb-0.5" />}
                        <span className={`text-3xl font-mono font-extrabold ${!tied && scores.guest > scores.host ? "text-natural-clay" : "text-natural-charcoal"}`}>
                          {scores.guest}<span className="text-base text-natural-forest-light">/10</span>
                        </span>
                        <span className="text-xs font-serif font-bold mt-1 text-natural-forest-light">{guestName || "Guest"}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap justify-center relative z-10">
                      <button
                        type="button"
                        onClick={handleLeaveOnlineRoom}
                        className="px-6 py-2.5 bg-natural-forest text-natural-bg rounded-2xl text-sm font-serif font-extrabold tracking-wider hover:bg-natural-forest/90 transition shadow-sm cursor-pointer flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Menu
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>

  );
}