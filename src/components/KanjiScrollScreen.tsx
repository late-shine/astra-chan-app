import type React from "react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { 
  BookOpenText, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Volume2, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Lightbulb, 
  Layers, 
  Compass, 
  ListPlus,
  BookmarkCheck
} from "lucide-react";
import DrawingCanvas from "./DrawingCanvas";
import KanjiWordFamilyPanel from "./KanjiWordFamilyPanel";
import { KANJI_WORD_FAMILIES } from "../kanjiWordFamilies";
import type { KanjiItem, KanjiWordEntry, SRSCard } from "../types";
import companionImg from "../assets/images/synthid-removed-Gemini_Generated_Image_csh1tcsh1tcsh1tc.png";

type CurrentScreen = "menu" | "quiz" | "kanji-scroll" | "profile" | "results" | "online-multiplayer" | "review-deck" | "vocab-quiz" | "kanji-quiz" | "charts" | "grammar-dojo";
type AnalysisResult = { score: number; feedbackTitle: string; advice: string } | null;

interface KanjiScrollScreenProps {
  currentKanjiIndex: number;
  kanjiData: KanjiItem[];
  isAnalyzing: boolean;
  analysisResult: AnalysisResult;
  analysisError: string | null;
  speakJapanese: (phrase: string) => void;
  setCurrentScreen: React.Dispatch<React.SetStateAction<CurrentScreen>>;
  hasCard: (itemKey: string) => boolean;
  addCard: (itemKey: string, type: "vocab" | "kanji" | "hiragana" | "katakana") => void;
  showToast: (message: string) => void;
  handleKanjiNav: (dir: "prev" | "next") => void;
  handleContemplateKanji: () => void;
  handleEvaluateKanjiDrawing: () => void;
}

interface KanjiRadical {
  char: string;
  meaning: string;
  role: string;
}

// ─── Radical Deconstruction Database ─────────────────────────────────────────
function getKanjiDeconstruction(kanji: string): { radicals: KanjiRadical[]; mnemonic: string } {
  const deconstructions: Record<string, { radicals: KanjiRadical[]; mnemonic: string }> = {
    "今": {
      radicals: [
        { char: "𠆢", meaning: "Roof / Gathering", role: "roof canopy" },
        { char: "一", meaning: "One", role: "horizontal divider" },
        { char: "フ", meaning: "Kneeling person", role: "subject" }
      ],
      mnemonic: "A gathering of people under one roof right NOW."
    },
    "生": {
      radicals: [
        { char: "𠂉", meaning: "Sprout", role: "ascending life" },
        { char: "土", meaning: "Soil / Earth", role: "earth base" }
      ],
      mnemonic: "A fresh green plant sprout breaking through the soil."
    },
    "上": {
      radicals: [
        { char: "卜", meaning: "Vertical post", role: "pointing line" },
        { char: "一", meaning: "Horizon", role: "base line" }
      ],
      mnemonic: "An indicator line mapped above a foundational horizon."
    },
    "下": {
      radicals: [
        { char: "一", meaning: "Horizon", role: "base line" },
        { char: "卜", meaning: "Vertical indicator", role: "pointing line" }
      ],
      mnemonic: "A suspended coordinate indicator pointing below the horizon shelf."
    },
    "中": {
      radicals: [
        { char: "口", meaning: "Box / Target", role: "outer shield" },
        { char: "丨", meaning: "Line / Needle", role: "center arrow" }
      ],
      mnemonic: "An arrow piercing directly through the exact center of a target."
    },
    "分": {
      radicals: [
        { char: "八", meaning: "Divide / Split", role: "separating halves" },
        { char: "刀", meaning: "Sword / Knife", role: "cutting tool" }
      ],
      mnemonic: "Using a sharp blade or knife to divide particles into separate fractions."
    },
    "気": {
      radicals: [
        { char: "气", meaning: "Steam / Breath", role: "rising vapors" },
        { char: "乂", meaning: "Energy / Rice crossing", role: "vital force" }
      ],
      mnemonic: "Warm vapor or steam rising up above hot boiling rice, representing spirit energy."
    },
    "会": {
      radicals: [
        { char: "𠆢", meaning: "Roof / Gathering", role: "canopy" },
        { char: "二", meaning: "Two", role: "people count" },
        { char: "ム", meaning: "Private room", role: "gathering chamber" }
      ],
      mnemonic: "People gathering together under a single large, protective roof."
    },
    "行": {
      radicals: [
        { char: "彳", meaning: "Left step", role: "pavement left" },
        { char: "亍", meaning: "Right step", role: "pavement right" }
      ],
      mnemonic: "Symmetrical footpaths forming the crossway of a busy crossroads street."
    },
    "電": {
      radicals: [
        { char: "雨", meaning: "Rain", role: "atmospheric trigger" },
        { char: "田", meaning: "Rice field", role: "earth ground" },
        { char: "乚", meaning: "Lightning hook", role: "electric surge" }
      ],
      mnemonic: "Flashes of energy or lightning falling through the rain clouds over rice fields."
    },
    "男": {
      radicals: [
        { char: "田", meaning: "Rice field", role: "work sector" },
        { char: "力", meaning: "Power / Muscle", role: "strength tool" }
      ],
      mnemonic: "Strong muscle and physical power working hard on active rice-plot fields."
    },
    "女": {
      radicals: [
        { char: "𡿨", meaning: "Graceful curve", role: "posture" },
        { char: "一", meaning: "Horizon / Balance", role: "stabilizer" }
      ],
      mnemonic: "A graceful kneeling figure bowing gently in respect."
    },
    "日": {
      radicals: [
        { char: "口", meaning: "Enclosure", role: "outer boundary" },
        { char: "一", meaning: "Inner ray", role: "solar split" }
      ],
      mnemonic: "A solid rectangular frame containing a radiant sun beam splitting its core."
    },
    "月": {
      radicals: [
        { char: "冂", meaning: "Chamber", role: "lunar sky" },
        { char: "二", meaning: "Two beams", role: "atmospheric stripes" }
      ],
      mnemonic: "A crescent moon shining down through dual inner atmospheric stripes."
    },
    "木": {
      radicals: [
        { char: "十", meaning: "Cross stem", role: "trunk & branches" },
        { char: "八", meaning: "Dual roots", role: "root support" }
      ],
      mnemonic: "A central branch and trunk sending deep supportive roots downwards."
    },
    "水": {
      radicals: [
        { char: "亅", meaning: "Central hook", role: "main current" },
        { char: "八", meaning: "Splashes", role: "ripples" }
      ],
      mnemonic: "A bubbling water current splashing droplets and ripples on both sides."
    },
    "金": {
      radicals: [
        { char: "𠆢", meaning: "Roof / Cover", role: "mine canopy" },
        { char: "土", meaning: "Earth / Soil", role: "deep ground" },
        { char: "丷", meaning: "Nuggets", role: "gleaming particles" }
      ],
      mnemonic: "Gleaming metal particles and nuggets safely buried inside the dark earth mine."
    },
    "土": {
      radicals: [
        { char: "十", meaning: "Sprout", role: "botanical stem" },
        { char: "一", meaning: "Ground", role: "packed floor level" }
      ],
      mnemonic: "A fresh botanical sprout bursting above the packed earth floor."
    },
    "語": {
      radicals: [
        { char: "言", meaning: "Speech", role: "spoken syllables" },
        { char: "五", meaning: "Five", role: "count scale" },
        { char: "口", meaning: "Mouth", role: "vocal organ" }
      ],
      mnemonic: "Spoken speech combined with the coordinated count of five active mouths."
    },
    "本": {
      radicals: [
        { char: "木", meaning: "Tree", role: "botanical body" },
        { char: "一", meaning: "Root marking", role: "origin baseline" }
      ],
      mnemonic: "A tree character with an extra horizontal root marking its base origin."
    },
    "車": {
      radicals: [
        { char: "十", meaning: "Axles", role: "top-to-bottom line" },
        { char: "田", meaning: "Chassis", role: "passenger box" }
      ],
      mnemonic: "A heavy cart chassis with multiple tracking axle lines piercing it."
    },
    "学": {
      radicals: [
        { char: "⺌", meaning: "Guiding hands / Claws", role: "guiding touch" },
        { char: "冖", meaning: "Roof", role: "school space canopy" },
        { char: "子", meaning: "Child", role: "student" }
      ],
      mnemonic: "A young child learning under a protective school roof guided by active mentoring hands. 📚"
    },
    "校": {
      radicals: [
        { char: "木", meaning: "Tree / Wood", role: "building material" },
        { char: "交", meaning: "Mix / Intersect", role: "social/exchange" }
      ],
      mnemonic: "A wooden structure where children meet, cross paths, and mix to learn together. 🏫"
    },
    "国": {
      radicals: [
        { char: "囗", meaning: "Border / Enclosure", role: "country boundary" },
        { char: "玉", meaning: "Jade / Treasure", role: "sovereign crown" }
      ],
      mnemonic: "A precious jade treasure safely guarded inside a country's wide borders. 🗺️"
    },
    "大": {
      radicals: [
        { char: "一", meaning: "One / Horizontal", role: "extended arms" },
        { char: "人", meaning: "Person", role: "physical body" }
      ],
      mnemonic: "A person stretching their arms out as wide as possible to show how big something is! 🙋"
    },
    "小": {
      radicals: [
        { char: "亅", meaning: "Hook", role: "center vertical" },
        { char: "ハ", meaning: "Two dots", role: "tiny fragments" }
      ],
      mnemonic: "A main vertical post divided by two tiny sparks on either side to denote smallness. 🐾"
    },
    "前": {
      radicals: [
        { char: "丷", meaning: "Horns / Marks", role: "indicators" },
        { char: "一", meaning: "One / Ground", role: "base line" },
        { char: "月", meaning: "Moon / Flesh", role: "time duration" },
        { char: "刂", meaning: "Knife / Sword", role: "cutting tool" }
      ],
      mnemonic: "Standing before a target with a sharp sword, slicing up time step-by-step. ⏱️"
    },
    "後": {
      radicals: [
        { char: "彳", meaning: "Step / Walk", role: "movement" },
        { char: "幺", meaning: "Thread", role: "connection" },
        { char: "夂", meaning: "Go slowly", role: "delayed walk" }
      ],
      mnemonic: "A person walking slowly, tied to a thread trailing behind them in time. 🚶‍♂️"
    },
    "先": {
      radicals: [
        { char: "牛", meaning: "Cow", role: "top leader" },
        { char: "儿", meaning: "Legs", role: "active walker" }
      ],
      mnemonic: "Active legs walking ahead like a strong cow leading the herd. 🐄"
    },
    "人": {
      radicals: [
        { char: "丿", meaning: "Left lean", role: "back support" },
        { char: "乀", meaning: "Right lean", role: "supporting leg" }
      ],
      mnemonic: "Two strokes leaning together, showing how bipedal people support each other to stand. 👥"
    },
    "子": {
      radicals: [
        { char: "了", meaning: "Baby body", role: "swaddled infant" },
        { char: "一", meaning: "Outstretched arms", role: "playful reach" }
      ],
      mnemonic: "A swaddled infant stretching its tiny arms wide to ask for a warm hug! 👶"
    },
    "手": {
      radicals: [
        { char: "丿", meaning: "Top slash", role: "thumb stroke" },
        { char: "二", meaning: "Two lines", role: "finger segments" },
        { char: "亅", meaning: "Hook", role: "wrist line" }
      ],
      mnemonic: "An outstretched hand showing finger joints and palm curves ready to grasp objects. 🖐️"
    },
    "山": {
      radicals: [
        { char: "山", meaning: "Mountain", role: "three peaks" }
      ],
      mnemonic: "Three physical peaks climbing high into the sky coordinates. ⛰️"
    },
    "川": {
      radicals: [
        { char: "川", meaning: "River", role: "flowing currents" }
      ],
      mnemonic: "Three vertical flowing streams of active water washing down valleys. 🌊"
    },
    "田": {
      radicals: [
        { char: "囗", meaning: "Outer border", role: "field boundary" },
        { char: "十", meaning: "Cross division", role: "plot dividers" }
      ],
      mnemonic: "A grid plot representing multiple irrigation sections of agricultural rice land. 🌾"
    },
    "天": {
      radicals: [
        { char: "一", meaning: "One / Limit", role: "celestial boundary" },
        { char: "大", meaning: "Big / Great", role: "giant figure" }
      ],
      mnemonic: "A giant figure reaching up way past the highest sky limits. 🌌"
    },
    "雨": {
      radicals: [
        { char: "一", meaning: "Sky", role: "canopy" },
        { char: "冂", meaning: "Cloud", role: "vapor container" },
        { char: "丶", meaning: "Droplets", role: "falling rain" }
      ],
      mnemonic: "Water droplets falling from clouds under the wide open sky canopy. 🌧️"
    }
  };

  return deconstructions[kanji] || {
    radicals: [
      { char: kanji, meaning: "Primary Character", role: "base visual block" }
    ],
    mnemonic: "Contemplate this character's balance, stroke density, and spatial layout."
  };
}

export default function KanjiScrollScreen({
  currentKanjiIndex,
  kanjiData,
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
}: KanjiScrollScreenProps) {
  const [isWordFamilyOpen, setIsWordFamilyOpen] = useState(false);
  const [isRecallMode, setIsRecallMode] = useState(false);
  
  // Recall individual state controls
  const [revealMeaning, setRevealMeaning] = useState(false);
  const [revealReadings, setRevealReadings] = useState(false);
  const [revealedVocab, setRevealedVocab] = useState<Record<number, boolean>>({});

  const currentKanji = kanjiData[currentKanjiIndex];

  // Auto-reset reveal state when moving between characters
  useEffect(() => {
    setRevealMeaning(false);
    setRevealReadings(false);
    setRevealedVocab({});
    setIsWordFamilyOpen(false);
  }, [currentKanjiIndex]);

  // Curated word-family data (grouped-by-reading source, powers the deep-dive panel)
  const curatedWordFamily: KanjiWordEntry[] = KANJI_WORD_FAMILIES[currentKanji.kanji] || [];
  const hasCuratedWordFamily = curatedWordFamily.length > 0;

  // Extract manually curated word family or parse from examples (quick on-card glance list)
  const rawWordFamily = curatedWordFamily;
  const wordFamily: KanjiWordEntry[] = rawWordFamily.length > 0 
    ? rawWordFamily 
    : (currentKanji.examples || []).map((ex) => {
        const match = ex.japanese.match(/^([^(（]+)(?:[(（]([^)）]+)[)）])?/);
        const word = match ? match[1].trim() : ex.japanese;
        const reading = match && match[2] ? match[2].trim() : "";
        return {
          word,
          reading,
          meaning: ex.english,
          kanjiReading: currentKanji.kanji,
          readingType: ex.japanese.includes(currentKanji.onyomi) ? "onyomi" : "kunyomi",
          commonness: "common"
        } as KanjiWordEntry;
      });

  const hasWordFamily = wordFamily.length > 0;
  const deconstruction = getKanjiDeconstruction(currentKanji.kanji);

  // Difficulty Star Calculator (Based on stroke count & index)
  const getStars = () => {
    const strokes = currentKanji.strokeCount || 5;
    if (strokes <= 3) return 1;
    if (strokes <= 5) return 2;
    if (strokes <= 7) return 3;
    if (strokes <= 10) return 4;
    return 5;
  };
  const difficultyStarsCount = getStars();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-6"
      >
        {/* Left Column: Traditional Premium Kanji Card & Radicals */}
        <div className="md:col-span-3 flex flex-col gap-5">
          
          {/* Header Action Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-natural-card border border-natural-border/70 px-4 py-3 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setCurrentScreen("menu")}
              className="px-3.5 py-1.5 bg-natural-bg/60 border border-natural-border text-natural-forest-light text-xs rounded-xl hover:border-natural-forest hover:text-natural-forest font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Exit to Dojo
            </button>

            {/* Quick-Flip Memorization Recall Mode Trigger */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-natural-forest-light font-bold">
                {isRecallMode ? "🧠 Recall mode active" : "👁️ Study Mode"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRecallMode(!isRecallMode);
                  showToast(isRecallMode ? "Switched to Learn Mode! 👁️" : "Recall Practice Mode Activated! 🧠 Try testing yourself!");
                }}
                className={`p-1.5 px-3 rounded-xl text-xs font-mono font-extrabold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isRecallMode 
                    ? "bg-natural-clay text-white border-transparent shadow-md" 
                    : "bg-natural-bg hover:bg-natural-clay/10 border-natural-border text-natural-clay"
                }`}
                title="Toggle Active Recall Flashcard Mode"
              >
                {isRecallMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {isRecallMode ? "FLIP TO STUDY" : "TEST RECALL"}
              </button>
            </div>
          </div>

          {/* 🏯 TRADITIONAL JAPANESE KANJI CARD CONTAINER */}
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-natural-border/70 bg-natural-card-light p-6 shadow-md md:p-8 flex flex-col gap-6 select-none">
            
            {/* Elegant Sun / Traditional Watermark Background under character */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
              <div className="w-[18rem] h-[18rem] rounded-full border-[10px] border-natural-forest-light flex items-center justify-center">
                <div className="w-[12rem] h-[12rem] rounded-full border-[4px] border-natural-forest-light"></div>
              </div>
            </div>

            {/* Card Header Stamp */}
            <div className="flex items-center justify-between border-b border-natural-border/50 pb-2 relative z-10">
              <span className="text-[10.5px] text-natural-forest-light/70 font-serif font-extrabold tracking-[0.18em] uppercase">
                Japanese Kanji Card
              </span>
              <span className="text-[10px] text-natural-clay font-mono tracking-widest uppercase font-extrabold">
                Card {currentKanjiIndex + 1} of {kanjiData.length}
              </span>
            </div>

            {/* Giant Central Serif Kanji */}
            <div className="flex flex-col items-center justify-center py-4 relative z-10">
              <motion.span 
                key={currentKanji.kanji}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[6.5rem] md:text-[8rem] font-serif font-black text-natural-charcoal leading-none select-text filter drop-shadow-sm tracking-normal"
                title="Hold or double click to highlight"
              >
                {currentKanji.kanji}
              </motion.span>
            </div>

            {/* Middle Divider: Double fine lines */}
            <div className="w-full border-t-2 border-double border-natural-border relative z-10"></div>

            {/* Readings and Meanings Block split vertically */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-natural-border/60 relative z-10">
              
              {/* Meaning Column */}
              <div className="flex flex-col items-center justify-center pb-3 md:pb-0 md:pr-4">
                <span className="text-[10px] text-natural-forest-light/60 font-mono uppercase tracking-wider block mb-1 font-extrabold">
                  Meaning
                </span>

                {isRecallMode && !revealMeaning ? (
                  <button
                    type="button"
                    onClick={() => setRevealMeaning(true)}
                    className="px-4 py-2 bg-natural-clay/10 border border-dashed border-natural-clay/40 text-natural-clay hover:bg-natural-clay/20 text-xs font-serif font-extrabold tracking-wide rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Lightbulb className="w-3.5 h-3.5 animate-pulse" />
                    Reveal Meaning
                  </button>
                ) : (
                  <motion.h3 
                    initial={{ opacity: isRecallMode ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl font-serif font-extrabold text-natural-charcoal text-center"
                  >
                    {currentKanji.meaning}
                  </motion.h3>
                )}
              </div>

              {/* Readings Column */}
              <div className="flex flex-col gap-3 justify-center pt-3 md:pt-0 md:pl-6 text-center md:text-left">
                {isRecallMode && !revealReadings ? (
                  <div className="flex justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={() => setRevealReadings(true)}
                      className="px-4 py-2 bg-natural-sage/10 border border-dashed border-natural-sage/40 text-natural-forest-light hover:bg-natural-sage/20 text-xs font-serif font-extrabold tracking-wide rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5 animate-pulse" />
                      Reveal Readings
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: isRecallMode ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-2 gap-4 text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-natural-clay font-mono uppercase tracking-wider block mb-0.5 font-bold">
                        On: {currentKanji.onyomiRomaji}
                      </span>
                      <span className="font-serif font-bold text-[15px] text-natural-charcoal">
                        {currentKanji.onyomi}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-natural-sage font-mono uppercase tracking-wider block mb-0.5 font-bold">
                        Kun: {currentKanji.kunyomiRomaji}
                      </span>
                      <span className="font-serif font-bold text-[15px] text-natural-forest">
                        {currentKanji.kunyomi}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* 📖 VOCABULARY COMPOUNDS GRID (Directly on the Card) */}
            {hasWordFamily && (
              <div className="flex flex-col gap-2.5 relative z-10 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-natural-forest-light/60 font-mono uppercase tracking-widest font-extrabold">
                    Vocabulary Compounds
                  </span>
                  <span className="h-px flex-1 bg-natural-border/50"></span>
                  {hasCuratedWordFamily && (
                    <button
                      type="button"
                      onClick={() => setIsWordFamilyOpen(true)}
                      className="px-2.5 py-1 bg-natural-clay/10 hover:bg-natural-clay/20 border border-natural-clay/30 rounded-lg text-[9px] font-mono font-extrabold uppercase tracking-wider text-natural-clay transition cursor-pointer flex items-center gap-1"
                      title="Open the full reading-grouped word family panel"
                    >
                      <Sparkles className="w-3 h-3" />
                      Word Family
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentKanji.kanji)}
                    className="p-1 hover:bg-natural-forest/10 rounded-lg text-natural-forest transition cursor-pointer"
                    title="Speak character"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-natural-bg/50 border border-natural-border/60 rounded-2xl p-2 md:p-3 divide-y divide-natural-border/30 max-h-[220px] overflow-y-auto">
                  {wordFamily.map((entry, idx) => {
                    const isMasked = isRecallMode && !revealedVocab[idx];
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between gap-3 py-2 px-1 hover:bg-natural-card/30 rounded-xl transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* native sound speaker */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(entry.word);
                            }}
                            className="p-1 bg-natural-bg hover:bg-natural-forest/10 rounded-lg text-natural-forest-light hover:text-natural-forest transition cursor-pointer shrink-0 border border-natural-border/50"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          
                          <div className="min-w-0">
                            <span className="font-serif font-extrabold text-[15px] text-natural-charcoal block leading-tight">
                              {entry.word}
                            </span>
                            <span className="text-[10px] text-natural-forest-light font-mono font-medium block">
                              ({entry.reading})
                            </span>
                          </div>
                        </div>

                        {/* Vocabulary Translation (Maskable in Active Recall Mode) */}
                        <div className="text-right shrink-0">
                          {isMasked ? (
                            <button
                              type="button"
                              onClick={() => setRevealedVocab(prev => ({ ...prev, [idx]: true }))}
                              className="px-2 py-0.5 bg-natural-clay/10 hover:bg-natural-clay/25 text-[10px] text-natural-clay font-mono font-extrabold rounded-lg border border-dashed border-natural-clay/30 transition cursor-pointer"
                            >
                              ? RECALL
                            </button>
                          ) : (
                            <span className="text-xs font-serif font-extrabold text-natural-charcoal">
                              {entry.meaning}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card Footer Details */}
            <div className="flex items-center justify-between border-t border-natural-border/50 pt-3 relative z-10 text-[11px] font-mono font-bold text-natural-forest-light/60">
              <span>JLPT N5</span>
              
              {/* Difficulty Stars */}
              <div className="flex items-center gap-0.5" title={`Difficulty Level ${difficultyStarsCount} of 5`}>
                <span className="text-[10px] uppercase font-bold text-natural-forest-light/50 mr-1 font-mono">Diff:</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`text-xs ${i < difficultyStarsCount ? "text-natural-clay" : "text-natural-border"}`}
                  >
                    ★
                  </span>
                ))}
              </div>

              <span className="font-semibold text-natural-clay/75 italic">astra-chan.dojo</span>
            </div>
          </div>

          {/* 🧩 ASTRA'S MEMORY KEY: RADICAL & MNEMONIC BREAKDOWN */}
          <div className="bg-natural-card border border-natural-border/70 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-natural-border pb-2">
              <Compass className="w-4 h-4 text-natural-clay" />
              <h4 className="text-xs font-serif font-extrabold text-natural-forest uppercase tracking-wider">
                Astra's Memory Keys & Radicals
              </h4>
            </div>

            {/* Radical Equation Blocks */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 py-1 bg-natural-bg/50 border border-natural-border/50 p-3 rounded-2xl">
              {deconstruction.radicals.map((rad, rIdx) => (
                <div key={rIdx} className="flex items-center gap-2">
                  <div className="flex flex-col items-center bg-natural-card-light border border-natural-border px-3 py-1.5 rounded-xl min-w-[55px] text-center shadow-xs">
                    <span className="text-lg font-serif font-bold text-natural-charcoal leading-none">
                      {rad.char}
                    </span>
                    <span className="text-[9px] text-natural-forest-light font-sans font-bold uppercase mt-1 leading-none">
                      {rad.meaning.split(" / ")[0]}
                    </span>
                  </div>
                  {rIdx < deconstruction.radicals.length - 1 && (
                    <span className="text-xs font-bold text-natural-sage font-sans">+</span>
                  )}
                </div>
              ))}
              
              <span className="text-xs font-bold text-natural-sage font-sans">=</span>
              
              <div className="bg-natural-forest/10 border border-natural-forest/20 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                <span className="text-lg font-serif font-bold text-natural-forest leading-none">
                  {currentKanji.kanji}
                </span>
                <span className="text-[9px] text-natural-forest font-sans font-bold uppercase mt-1 leading-none block">
                  {currentKanji.meaning}
                </span>
              </div>
            </div>

            {/* Mnemonic Device speech box */}
            <div className="p-3 bg-natural-bg border-l-4 border-natural-clay rounded-r-2xl">
              <span className="text-[9px] font-mono text-natural-clay uppercase tracking-widest font-bold block mb-1">
                Visual Composition Story (Mnemonic Device)
              </span>
              <p className="text-xs text-natural-charcoal font-serif font-bold italic leading-relaxed">
                "{deconstruction.mnemonic}"
              </p>
            </div>

            {/* Action buttons list */}
            <div className="flex flex-wrap gap-2.5 items-center justify-between pt-2 border-t border-natural-border/40 text-xs">
              
              {/* SRS Bookmark Add Deck button */}
              <button
                type="button"
                onClick={() => {
                  if (hasCard(currentKanji.kanji)) {
                    showToast("Already in your review schedule!");
                  } else {
                    addCard(currentKanji.kanji, "kanji");
                    showToast("Added Kanji card to Review Deck! ✨");
                  }
                }}
                className={`p-2 px-3 border rounded-xl font-mono text-xs font-extrabold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  hasCard(currentKanji.kanji)
                    ? "bg-natural-sage/10 border-natural-sage/30 text-natural-sage/70"
                    : "bg-natural-bg hover:bg-natural-clay/10 border-natural-border hover:border-natural-clay text-natural-forest-light hover:text-natural-clay"
                }`}
              >
                {hasCard(currentKanji.kanji) ? <BookmarkCheck className="w-3.5 h-3.5 text-natural-sage" /> : <ListPlus className="w-3.5 h-3.5" />}
                {hasCard(currentKanji.kanji) ? "SRS SCHEDULED" : "ADD TO REVIEW DECK"}
              </button>

              {/* Navigation Prior/Next */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleKanjiNav("prev")}
                  className="px-3 py-1.5 border border-natural-border rounded-xl text-xs hover:border-natural-forest hover:text-natural-forest transition flex items-center gap-1 font-bold text-natural-forest-light bg-natural-bg/50 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                <button
                  type="button"
                  onClick={handleContemplateKanji}
                  className="px-4 py-1.5 bg-natural-clay text-white hover:bg-natural-clay/90 rounded-xl text-xs font-serif font-extrabold tracking-wide transition shadow-sm cursor-pointer"
                >
                  Study (+40 XP)
                </button>

                <button
                  type="button"
                  onClick={() => handleKanjiNav("next")}
                  className="px-3 py-1.5 border border-natural-border rounded-xl text-xs hover:border-natural-forest hover:text-natural-forest transition flex items-center gap-1 font-bold text-natural-forest-light bg-natural-bg/50 cursor-pointer shadow-xs"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Calligraphy Workspace */}
        <div className="md:col-span-2 flex flex-col justify-start gap-4 animate-fade-in">
          <DrawingCanvas referenceChar={currentKanji.kanji} />

          {/* Astra-Chan Calligraphy Analysis Station */}
          <div className="bg-natural-card border border-natural-border/70 p-4 rounded-3xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-natural-border/40 pb-2">
              <span className="text-[10px] font-mono text-natural-clay uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-natural-clay" />
                ASTRA-CHAN'S INK STATION
              </span>
              <span className="text-[9px] font-mono text-natural-forest bg-natural-forest/10 px-2 py-0.5 rounded font-extrabold uppercase">
                AI Accuracy Engine
              </span>
            </div>

            {/* Submit Button or Loading State */}
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center p-6 bg-natural-bg/50 border border-dashed border-natural-border/80 rounded-2xl text-center gap-3">
                <RefreshCw className="w-8 h-8 text-natural-clay animate-spin" />
                <div>
                  <p className="text-xs font-serif font-bold text-natural-charcoal">Astra-chan is scanning your strokes...</p>
                  <p className="text-[10.5px] text-natural-forest-light mt-1 font-medium italic">"Checking brush weights, alignment, and spiritual canvas balance!"</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEvaluateKanjiDrawing}
                className="w-full py-3 bg-natural-forest text-natural-bg hover:bg-natural-forest/90 border border-transparent rounded-2xl text-xs font-serif font-extrabold tracking-wider transition hover:shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase animate-pulse"
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
                  onClick={handleEvaluateKanjiDrawing}
                  className="mt-1 py-2 bg-natural-forest/10 hover:bg-natural-forest/20 text-natural-forest border border-natural-forest/20 rounded-xl text-xs font-serif font-bold tracking-wider transition cursor-pointer"
                >
                  ↻ Retry with AI
                </button>
              </div>
            )}

            {/* Rendering Astra-chan's Success / Critique Report Card */}
            {analysisResult && (
              <div className="flex flex-col gap-3">
                {/* Score Badge Header */}
                <div className="flex items-center gap-3 p-3 bg-natural-bg rounded-2xl border border-natural-border/50">
                  <div className="w-12 h-12 rounded-full border-2 border-natural-clay flex items-center justify-center bg-natural-card font-mono text-base font-extrabold text-natural-charcoal shadow-inner shrink-0 relative">
                    {Number(analysisResult.score) || "?"}%
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[#D26E40] uppercase tracking-wider font-extrabold">VERDICT ACCURACY</span>
                    <h5 className="font-serif font-extrabold text-xs text-natural-forest leading-tight mt-0.5">
                      {analysisResult.feedbackTitle}
                    </h5>
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

            <p className="text-[10px] text-natural-forest-light text-center leading-normal italic px-2 font-medium">
              Tip: Be sure to draw inside the grid guidelines frame, trace accurately, and clear previous brushmarks before evaluating new ones!
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isWordFamilyOpen && hasCuratedWordFamily && (
          <KanjiWordFamilyPanel
            kanji={{ ...currentKanji, kanjiWords: curatedWordFamily }}
            onClose={() => setIsWordFamilyOpen(false)}
            speakJapanese={speakJapanese}
            hasCard={hasCard}
            addCard={addCard}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </>
  );
}
