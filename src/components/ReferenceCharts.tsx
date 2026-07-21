import React, { useState, useMemo, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  Volume2, 
  Search, 
  AlertTriangle, 
  Lightbulb, 
  Zap, 
  Sparkles, 
  X
} from "lucide-react";
import InteractiveWorkbench from "./InteractiveWorkbench";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferenceChartsProps {
  onBack: () => void;
  speakJapanese: (phrase: string) => void;
}

type TabId = "counters" | "numbers" | "time" | "verbs" | "adjectives" | "particles";

// ─── Speak Context ────────────────────────────────────────────────────────────
// SpeakButton is used inside several nested tab components (CountersTab,
// NumbersTab, etc). Rather than threading speakJapanese through every one of
// their prop interfaces, it's provided once here and read via context —
// avoids touching unrelated tab components' signatures.

const SpeakContext = createContext<(text: string) => void>(() => {});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakButton({ text }: { text: string }) {
  const speakJapanese = useContext(SpeakContext);
  return (
    <button
      type="button"
      onClick={() => speakJapanese(text)}
      className="p-1.5 rounded-lg bg-natural-bg/90 border border-natural-border hover:bg-natural-forest/10 hover:border-natural-forest text-natural-forest/60 hover:text-natural-forest transition shrink-0 shadow-xs cursor-pointer"
      title={`Hear pronunciation: ${text}`}
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-5">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-forest/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type Japanese, romaji reading, or English meaning to search..."
        className="w-full bg-natural-card border-2 border-natural-border rounded-2xl pl-10 pr-4 py-3 text-sm font-sans text-natural-charcoal placeholder:text-natural-charcoal/40 focus:outline-none focus:border-natural-forest transition shadow-sm"
      />
    </div>
  );
}

function CalloutBox({ type, children }: { type: "tip" | "warning" | "zap"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "bg-natural-forest/8 border-natural-forest/20", icon: <Lightbulb className="w-4 h-4 text-natural-forest shrink-0 mt-0.5" /> },
    warning: { bg: "bg-natural-clay/10 border-natural-clay/35", icon: <AlertTriangle className="w-4 h-4 text-natural-clay shrink-0 mt-0.5" /> },
    zap: { bg: "bg-natural-terracotta/8 border-natural-terracotta/25", icon: <Zap className="w-4 h-4 text-natural-terracotta shrink-0 mt-0.5" /> },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 ${s.bg} border rounded-2xl p-4 text-xs font-sans text-natural-charcoal leading-relaxed shadow-xs`}>
      {s.icon}
      <div>{children}</div>
    </div>
  );
}

// ─── TAB: COUNTERS ────────────────────────────────────────────────────────────

const COUNTERS = [
  { counter: "枚 (まい)", char: "枚", what: "Flat, thin objects", examples: "Paper, shirts, plates, tickets", nums: "1枚=いちまい、2枚=にまい、3枚=さんまい", notes: "Regular — no sound changes", isIrregular: false },
  { counter: "本 (ほん)", char: "本", what: "Long, cylindrical objects", examples: "Pens, bottles, rivers, umbrellas", nums: "1本=いっぽん、2本=にほん、3本=さんぼん", notes: "⚡ Sound changes: いっぽん (1), さんぼん (3), ろっぽん (6), はっぽん (8)", isIrregular: true },
  { counter: "匹 (ひき)", char: "匹", what: "Small-to-medium animals", examples: "Cats, dogs, fish, insects, frogs", nums: "1匹=いっぴき、2匹=にひき、3匹=さんびき", notes: "⚡ Sound changes: いっぴき (1), さんびき (3), ろっぴき (6), はっぴき (8)", isIrregular: true },
  { counter: "頭 (とう)", char: "頭", what: "Large animals", examples: "Cows, horses, elephants, bears", nums: "1頭=いっとう、2頭=にとう、3頭=さんとう", notes: "For heavy farm or zoo wildlife", isIrregular: false },
  { counter: "羽 (わ/ば/ぱ)", char: "羽", what: "Birds and rabbits", examples: "Birds, chickens, rabbits (historically counted as birds!)", nums: "1羽=いちわ、2羽=にわ、3羽=さんわ", notes: "Rabbits are traditionally counted here", isIrregular: false },
  { counter: "冊 (さつ)", char: "冊", what: "Bound objects", examples: "Books, notebooks, dictionaries", nums: "1冊=いっさつ、2冊=にさつ、3冊=さんさつ", notes: "⚡ いっさつ (double 's' sound)", isIrregular: true },
  { counter: "個 (こ)", char: "個", what: "Small round/modular objects", examples: "Apples, eggs, boxes, buttons", nums: "1個=いっこ、2個=にこ、3個=さんこ", notes: "Most versatile general counter for things with shapes", isIrregular: false },
  { counter: "台 (だい)", char: "台", what: "Mechanical appliances & vehicles", examples: "Cars, computers, bikes, televisions", nums: "1台=いちだい、2台=にだい、3台=さんだい", notes: "Regular — no sound changes", isIrregular: false },
  { counter: "人 (にん/り)", char: "人", what: "People", examples: "Friends, students, family members", nums: "1人=ひとり、2人=ふたり、3人=さんにん", notes: "⚡ Highly irregular for 1 and 2!", isIrregular: true },
  { counter: "階 (かい/がい)", char: "階", what: "Building floors", examples: "Floors, levels of a tower", nums: "1階=いっかい、2階=にかい、3階=さんかい", notes: "⚡ 1階=いっかい、6階=ろっかい、8階=はっかい、3階=さんがい", isIrregular: true },
  { counter: "歳 (さい)", char: "歳", what: "Age / Years old", examples: "How old someone is", nums: "1歳=いっさい、2歳=にさい、20歳=はたち", notes: "20 years old has a completely custom word: はたち", isIrregular: true },
  { counter: "つ (general)", char: "つ", what: "General native Japanese count", examples: "Anything of indefinite shape", nums: "1=ひとつ、2=ふたつ、3=みっつ、4=よっつ", notes: "Only goes up to 10 (とお). Crucial for N5", isIrregular: true },
];

const NATIVE_COUNTER = [
  ["1", "ひとつ"], ["2", "ふたつ"], ["3", "みっつ"], ["4", "よっつ"],
  ["5", "いつつ"], ["6", "むっつ"], ["7", "ななつ"], ["8", "やっつ"],
  ["9", "ここのつ"], ["10", "とお"],
];

function CountersTab() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return COUNTERS;
    const lq = q.toLowerCase();
    return COUNTERS.filter((r) =>
      [r.counter, r.what, r.examples, r.nums, r.notes].some((s) => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      <CalloutBox type="zap">
        <strong>The Euphonic Sound Change Rule:</strong> When counters starting with h/f/p sounds (e.g. 本 hon, 匹 hiki) combine with numbers <strong>1, 3, 6, 8, or 10</strong>, the sound softens into double-consonant stops (っ) or semi-voiced plosives (p/b).
      </CalloutBox>

      {/* Counters Grid instead of a standard boring table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div 
            key={item.counter} 
            className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 flex flex-col gap-3 relative overflow-hidden shadow-xs hover:border-natural-clay/40 transition duration-200"
          >
            {/* Hanko stamp watermark */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-[0.15]">
              <span className="font-serif font-black text-2xl text-natural-clay border border-natural-clay rounded-full p-1 w-10 h-10 flex items-center justify-center">
                {item.char}
              </span>
            </div>

            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-full bg-natural-forest/10 flex items-center justify-center font-serif text-xl font-bold text-natural-forest shrink-0 shadow-inner">
                {item.char}
              </div>
              <div>
                <h4 className="font-serif font-extrabold text-[15px] text-natural-charcoal leading-tight">
                  {item.counter}
                </h4>
                <span className="text-[10px] font-mono uppercase text-natural-forest-light tracking-wider font-extrabold block mt-0.5">
                  Used for: {item.what}
                </span>
              </div>
              <div className="ml-auto">
                <SpeakButton text={item.nums.split("=")[0]} />
              </div>
            </div>

            <div className="border-t border-natural-border/50 pt-2 flex flex-col gap-1 text-xs">
              <div>
                <span className="font-mono text-[9px] uppercase text-natural-clay block font-bold tracking-widest mb-0.5">Example readings</span>
                <p className="font-serif text-[13px] text-natural-charcoal font-bold">{item.nums}</p>
              </div>
              <div className="mt-1">
                <span className="font-mono text-[9px] uppercase text-natural-forest-light block font-bold tracking-widest mb-0.5">Grammar Notes</span>
                <p className={`font-sans text-[11px] leading-relaxed ${item.isIrregular ? "text-natural-clay font-semibold" : "text-natural-charcoal/60"}`}>
                  {item.notes}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* General Native Counter Box */}
      <div className="bg-natural-card border-2 border-natural-border/80 rounded-[2rem] p-5 shadow-xs mt-3">
        <div className="flex items-center gap-2 border-b border-natural-border/60 pb-2 mb-3">
          <Sparkles className="w-4 h-4 text-natural-clay" />
          <h4 className="font-serif font-black text-xs text-natural-forest uppercase tracking-wider">
            Native Japanese Counter つ (1–10)
          </h4>
        </div>
        
        <p className="text-xs text-natural-charcoal/70 mb-3 font-sans leading-relaxed">
          The most universal, indispensable counting system. Use this whenever you don't know the specific classifier, up to quantity 10.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {NATIVE_COUNTER.map(([num, reading]) => (
            <div key={num} className="bg-natural-bg/50 border border-natural-border/70 rounded-2xl p-2.5 text-center flex flex-col gap-1 hover:border-natural-clay/40 transition duration-150">
              <span className="font-mono text-[10px] text-natural-clay font-bold">{num}</span>
              <span className="font-serif text-[14px] text-natural-charcoal font-black">{reading}</span>
              <div className="flex justify-center mt-1">
                <SpeakButton text={reading} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: NUMBERS ─────────────────────────────────────────────────────────────

const DUAL_NUMBERS = [
  { num: "1", chinese: "いち", native: "ひとつ", nativeKanji: "一つ" },
  { num: "2", chinese: "に", native: "ふたつ", nativeKanji: "二つ" },
  { num: "3", chinese: "さん", native: "みっつ", nativeKanji: "三つ" },
  { num: "4", chinese: "し / よん", native: "よっつ", nativeKanji: "四つ" },
  { num: "5", chinese: "ご", native: "いつつ", nativeKanji: "五つ" },
  { num: "6", chinese: "ろく", native: "むっつ", nativeKanji: "六つ" },
  { num: "7", chinese: "しち / なな", native: "ななつ", nativeKanji: "七つ" },
  { num: "8", chinese: "はち", native: "やっつ", nativeKanji: "八つ" },
  { num: "9", chinese: "く / きゅう", native: "ここのつ", nativeKanji: "九つ" },
  { num: "10", chinese: "じゅう", native: "とお", nativeKanji: "十" },
];

const TRICKY = [
  { num: "4", opts: ["し", "よん"], use: "よん", reason: "し sounds exactly like 死 (death). It is avoided in telephone numbers, hotel floors, and most counting, making よん the dominant form." },
  { num: "7", opts: ["しち", "なな"], use: "なな", reason: "しち sounds very similar to いち (1) on static phone lines. なな is preferred to prevent errors." },
  { num: "9", opts: ["く", "きゅう"], use: "きゅう", reason: "く sounds like 苦 (suffering/pain). きゅう is preferred in standard contexts." },
];

function NumbersTab() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return DUAL_NUMBERS;
    const lq = q.toLowerCase();
    return DUAL_NUMBERS.filter((r) =>
      [r.num, r.chinese, r.native].some((s) => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      <CalloutBox type="tip">
        <strong>Dual counting stems:</strong> Sino-Japanese (いち, に) is the standard mathematics line. Native Japanese (ひとつ, ふたつ) is only used with its general classifier suffix and caps at 10.
      </CalloutBox>

      {/* Bento Grid of 1-10 Numbers */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-2 font-bold">1–10 Parallel Ledger</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <div 
              key={item.num} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-natural-clay/40 transition duration-150"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-natural-clay/70 bg-natural-bg/50 border border-natural-border/50 rounded-xl px-3 py-1">
                  {item.num}
                </span>
                <div>
                  <span className="font-serif text-lg font-black text-natural-charcoal block leading-none">
                    {item.chinese}
                  </span>
                  <span className="font-serif text-xs text-natural-forest-light mt-1 block">
                    Native: {item.native} ({item.nativeKanji})
                  </span>
                </div>
              </div>
              <SpeakButton text={item.chinese} />
            </div>
          ))}
        </div>
      </div>

      {/* Tricky Numbers Panel */}
      <div className="bg-natural-card border-2 border-natural-border/80 rounded-[2.2rem] p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-natural-border/60 pb-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-natural-clay" />
          <h4 className="font-serif font-black text-xs text-natural-forest uppercase tracking-wider">
            Tricky Calligraphy Phonetics
          </h4>
        </div>

        <div className="flex flex-col gap-3">
          {TRICKY.map((t) => (
            <div key={t.num} className="bg-natural-bg/50 border border-natural-border/50 rounded-2xl p-4 flex gap-4 items-start hover:border-natural-clay/30 transition">
              <span className="font-serif text-4xl text-natural-clay font-black shrink-0 w-10 text-center leading-none mt-1">
                {t.num}
              </span>
              <div className="flex-grow">
                <div className="flex gap-2 items-center flex-wrap">
                  {t.opts.map((o, i) => (
                    <React.Fragment key={o}>
                      <span className={`font-serif text-lg font-black ${o === t.use ? "text-natural-forest" : "text-natural-charcoal/40 line-through"}`}>
                        {o}
                      </span>
                      {i === 0 && <span className="text-natural-charcoal/30 text-xs font-serif font-bold">vs</span>}
                    </React.Fragment>
                  ))}
                  <span className="ml-auto text-[9px] bg-natural-forest/15 border border-natural-forest/20 text-natural-forest rounded-full px-2 py-0.5 font-mono font-extrabold uppercase tracking-wide">
                    Prefer: {t.use}
                  </span>
                </div>
                <p className="text-xs text-natural-charcoal/70 font-sans mt-1 leading-relaxed">
                  {t.reason}
                </p>
              </div>
              <div className="shrink-0 self-center">
                <SpeakButton text={t.use} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Large Numbers Ledger */}
      <div className="bg-natural-card border-2 border-natural-border/80 rounded-[2.2rem] p-5 shadow-xs">
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Large Ledger Scale</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["百", "ひゃく", "100", "One hundred"],
            ["千", "せん", "1,000", "One thousand"],
            ["万", "まん", "10,000", "Ten thousand ★"],
            ["億", "おく", "100,000,000", "One hundred million"]
          ].map(([kanji, reading, number, desc]) => (
            <div key={kanji} className="bg-natural-bg/40 border border-natural-border/70 rounded-2xl p-3 flex flex-col gap-1.5 text-center relative overflow-hidden">
              <span className="font-serif text-3xl text-natural-forest font-black block leading-none">{kanji}</span>
              <span className="font-serif text-xs text-natural-charcoal font-bold block">{reading}</span>
              <span className="font-mono text-[10px] text-natural-clay font-bold block">{number}</span>
              <span className="font-sans text-[10px] text-natural-charcoal/50 block">{desc}</span>
              <div className="flex justify-center mt-1">
                <SpeakButton text={reading} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 bg-natural-clay/5 border border-natural-clay/20 p-3 rounded-xl">
          <p className="text-[11px] text-natural-charcoal/80 font-sans leading-relaxed">
            ⚠️ <strong>Crucial Difference:</strong> While English chunks numbers by 3 digits (thousands), Japanese groups by <strong>4 digits (10,000 / 万)</strong>. For instance, $100,000 is read as <strong>十万 (じゅうまん)</strong> (ten units of ten-thousand).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: TIME ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { kanji: "月曜日", reading: "げつようび", english: "Monday", element: "Moon (月)", bg: "border-purple-200 bg-purple-50/10", text: "text-purple-700" },
  { kanji: "火曜日", reading: "かようび", english: "Tuesday", element: "Fire (火)", bg: "border-red-200 bg-red-50/10", text: "text-red-700" },
  { kanji: "水曜日", reading: "すいようび", english: "Wednesday", element: "Water (水)", bg: "border-blue-200 bg-blue-50/10", text: "text-blue-700" },
  { kanji: "木曜日", reading: "もくようび", english: "Thursday", element: "Wood / Tree (木)", bg: "border-amber-200 bg-amber-50/10", text: "text-amber-800" },
  { kanji: "金曜日", reading: "きんようび", english: "Friday", element: "Metal / Gold (金)", bg: "border-yellow-200 bg-yellow-50/10", text: "text-yellow-700" },
  { kanji: "土曜日", reading: "どようび", english: "Saturday", element: "Earth / Soil (土)", bg: "border-stone-200 bg-stone-50/10", text: "text-stone-700" },
  { kanji: "日曜日", reading: "にちようび", english: "Sunday", element: "Sun (日)", bg: "border-orange-200 bg-orange-50/10", text: "text-orange-700" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  num: i + 1,
  kanji: `${i + 1}月`,
  reading: ["いちがつ","にがつ","さんがつ","しがつ ★","ごがつ","ろくがつ","しちがつ ★","はちがつ","くがつ ★","じゅうがつ","じゅういちがつ","じゅうにがつ"][i],
  english: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  isSpecial: [3, 6, 8].includes(i), // April, July, September have critical sound shifts
}));

const DAYS_OF_MONTH = [
  { day: "1日", reading: "ついたち", note: "★ highly irregular" },
  { day: "2日", reading: "ふつか", note: "★ highly irregular" },
  { day: "3日", reading: "みっか", note: "★ highly irregular" },
  { day: "4日", reading: "よっか", note: "★ highly irregular" },
  { day: "5日", reading: "いつか", note: "★ highly irregular" },
  { day: "6日", reading: "むいか", note: "★ highly irregular" },
  { day: "7日", reading: "なのか", note: "★ highly irregular" },
  { day: "8日", reading: "ようか", note: "★ highly irregular" },
  { day: "9日", reading: "ここのか", note: "★ highly irregular" },
  { day: "10日", reading: "とおか", note: "★ highly irregular" },
  { day: "14日", reading: "じゅうよっか", note: "★ highly irregular" },
  { day: "20日", reading: "はつか", note: "★ highly irregular" },
  { day: "24日", reading: "にじゅうよっか", note: "★ highly irregular" },
];

const MINUTES = [
  { min: "1分", reading: "いっぷん", change: true },
  { min: "2分", reading: "にふん", change: false },
  { min: "3分", reading: "さんぷん", change: true },
  { min: "4分", reading: "よんぷん", change: true },
  { min: "5分", reading: "ごふん", change: false },
  { min: "6分", reading: "ろっぷん", change: true },
  { min: "7分", reading: "ななふん", change: false },
  { min: "8分", reading: "はっぷん", change: true },
  { min: "9分", reading: "きゅうふん", change: false },
  { min: "10分", reading: "じゅっぷん", change: true },
];

function TimeTab({ showRomaji }: { showRomaji: boolean }) {
  const [q, setQ] = useState("");
  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      {/* Days of Week - Circular aesthetic cards */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Days of the Week (曜日のサイクル)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAYS_OF_WEEK.filter(r => !q || [r.kanji, r.reading, r.english, r.element].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((day) => (
            <div 
              key={day.kanji} 
              className={`border-2 rounded-2xl p-4 flex items-center justify-between shadow-xs transition duration-150 ${day.bg}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-current bg-white flex items-center justify-center font-serif text-lg font-black leading-none">
                  {day.kanji[0]}
                </div>
                <div>
                  <h4 className="font-serif font-black text-base text-natural-charcoal leading-none">
                    {day.kanji}
                  </h4>
                  <p className="text-xs text-natural-charcoal/60 mt-1 font-sans font-medium">
                    {day.english} · <span className="italic font-bold">{day.element}</span>
                  </p>
                  {showRomaji && (
                    <span className="font-mono text-[9px] text-natural-forest-light uppercase tracking-wider block mt-0.5">{day.reading}</span>
                  )}
                </div>
              </div>
              <SpeakButton text={day.kanji} />
            </div>
          ))}
        </div>
      </div>

      {/* Months */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Calendar Months (月)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {MONTHS.filter(r => !q || [r.kanji, r.reading, r.english].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((m) => (
            <div 
              key={m.num} 
              className={`border-2 rounded-2xl p-3 text-center flex flex-col gap-1 relative overflow-hidden transition duration-150 ${
                m.isSpecial 
                  ? "bg-natural-clay/5 border-natural-clay/35" 
                  : "bg-natural-card border-natural-border/70"
              }`}
            >
              <span className="font-serif text-2xl text-natural-forest font-black block leading-none">{m.kanji}</span>
              <span className={`font-serif text-xs block ${m.isSpecial ? "text-natural-clay font-black" : "text-natural-charcoal font-bold"}`}>
                {m.reading}
              </span>
              <span className="font-sans text-[10px] text-natural-charcoal/40 block leading-none">{m.english}</span>
              <div className="flex justify-center mt-1">
                <SpeakButton text={m.reading} />
              </div>
            </div>
          ))}
        </div>
        <CalloutBox type="warning">
          <strong>Tricky Months Alert:</strong> Pay close attention to April <span className="font-serif font-black">しがつ</span> (NOT よんがつ), July <span className="font-serif font-black">しちがつ</span> (NOT なながつ), and September <span className="font-serif font-black">くがつ</span> (NOT きゅうがつ).
        </CalloutBox>
      </div>

      {/* Days of month */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Days of the Month — Critical Irregulars ★</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DAYS_OF_MONTH.filter(r => !q || [r.day, r.reading].some(s => s.toLowerCase().includes(q.toLowerCase()))).map((row) => (
            <div 
              key={row.day} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-2xl p-4 flex items-center justify-between hover:border-natural-clay/40 transition shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-serif text-xl font-black text-natural-clay border border-natural-clay/40 rounded-xl px-2.5 py-1 flex items-center justify-center min-w-[50px] bg-natural-clay/5">
                  {row.day}
                </span>
                <div>
                  <span className="font-serif text-base text-natural-charcoal font-bold block leading-none">{row.reading}</span>
                  <span className="text-[10px] font-mono text-natural-clay uppercase tracking-wider block mt-1 font-bold">irregular</span>
                </div>
              </div>
              <SpeakButton text={row.reading} />
            </div>
          ))}
        </div>
        <CalloutBox type="tip">
          While regular days follow [number] + にch, days 1–10, 14, 20, and 24 are fully irregular. Master these first!
        </CalloutBox>
      </div>

      {/* Minutes & Hours */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold font-bold">Minutes (分) — Pronunciation Shifts</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {MINUTES.map((m) => (
            <div 
              key={m.min} 
              className={`border-2 rounded-2xl p-3 text-center flex flex-col gap-1 transition ${
                m.change 
                  ? "bg-natural-terracotta/5 border-natural-terracotta/35" 
                  : "bg-natural-card border-natural-border/70"
              }`}
            >
              <span className="font-serif text-xl text-natural-forest font-black block leading-none">{m.min}</span>
              <span className={`font-serif text-xs block ${m.change ? "text-natural-terracotta font-black" : "text-natural-charcoal font-semibold"}`}>{m.reading}</span>
              <div className="flex justify-center mt-1">
                <SpeakButton text={m.reading} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-natural-card border-2 border-natural-border/80 rounded-[2.2rem] p-5 shadow-xs">
          <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Special Hours (時)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[["4時", "よじ (NOT よんじ/しじ)"], ["7時", "しちじ (NOT ななじ)"], ["9時", "くじ (NOT きゅうじ)"]].map(([k, r]) => (
              <div key={k} className="bg-natural-bg/50 border border-natural-border/50 rounded-xl p-3 flex items-center justify-between gap-2 hover:border-natural-clay/35 transition">
                <div>
                  <span className="font-serif text-lg text-natural-forest font-black block leading-none">{k}</span>
                  <span className="font-serif text-xs text-natural-charcoal block mt-1">{r}</span>
                </div>
                <SpeakButton text={r.split(" ")[0]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: VERB GROUPS ─────────────────────────────────────────────────────────

const G1_VERBS = [
  { dict: "書く", reading: "かく", te: "かいて", masu: "かきます", meaning: "to write" },
  { dict: "飲む", reading: "のむ", te: "のんで", masu: "のみます", meaning: "to drink" },
  { dict: "話す", reading: "はなす", te: "はなして", masu: "はなします", meaning: "to speak" },
  { dict: "聞く", reading: "きく", te: "きいて", masu: "ききます", meaning: "to listen / ask" },
  { dict: "読む", reading: "よむ", te: "よんで", masu: "よみます", meaning: "to read" },
  { dict: "行く", reading: "いく", te: "いって ★", masu: "いきます", meaning: "to go (irregular te-form!)" },
  { dict: "買う", reading: "かう", te: "かって", masu: "かいます", meaning: "to buy" },
  { dict: "待つ", reading: "まつ", te: "まって", masu: "まちます", meaning: "to wait" },
  { dict: "帰る", reading: "かえる", te: "かえって", masu: "かえります", meaning: "to return home (⚠️ looks Group 2, actually Group 1!)" },
];

const G2_VERBS = [
  { dict: "食べる", reading: "たべる", te: "たべて", masu: "たべます", meaning: "to eat" },
  { dict: "見る", reading: "みる", te: "みて", masu: "みます", meaning: "to see/watch" },
  { dict: "起きる", reading: "おきる", te: "おきて", masu: "おきます", meaning: "to wake up" },
  { dict: "寝る", reading: "ねる", te: "ねて", masu: "ねます", meaning: "to sleep" },
  { dict: "着る", reading: "きる", te: "きて", masu: "きます", meaning: "to wear (upper body)" },
  { dict: "開ける", reading: "あける", te: "あけて", masu: "あけます", meaning: "to open" },
  { dict: "教える", reading: "おしえる", te: "おしえて", masu: "おしえます", meaning: "to teach" },
];

function VerbsTab({ showRomaji }: { showRomaji: boolean }) {
  const [q, setQ] = useState("");
  const filterVerb = (verbs: typeof G1_VERBS) =>
    !q ? verbs : verbs.filter(r => [r.dict, r.reading, r.te, r.masu, r.meaning].some(s => s.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />
      
      <CalloutBox type="tip">
        <strong>The Verb Sorting Rule:</strong> Group 2 verbs always end with a vowel sound of E or I before the final る (e.g. tab<strong>e</strong>ru, m<strong>i</strong>ru). Group 1 encompasses all other dictionary stems.
      </CalloutBox>

      {/* Group 1 Card Scroll */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">Group 1 — Godan (五段動詞)</p>
        <div className="flex flex-col gap-3">
          {filterVerb(G1_VERBS).map((verb) => (
            <div 
              key={verb.dict} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-natural-clay/40 transition shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-serif text-2xl font-black text-natural-forest shrink-0 w-16">
                  {verb.dict}
                </span>
                <div>
                  <span className="font-serif text-xs text-natural-charcoal/50 block leading-none">Dict: {verb.reading}</span>
                  <p className="text-xs text-natural-charcoal mt-1.5 font-sans leading-relaxed">
                    Meaning: <strong className="font-medium">{verb.meaning}</strong>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                <span className="bg-natural-bg border border-natural-border px-2.5 py-1 rounded-xl text-xs font-serif font-bold text-natural-charcoal">
                  て: {verb.te}
                </span>
                <span className="bg-natural-bg border border-natural-border px-2.5 py-1 rounded-xl text-xs font-serif font-bold text-natural-charcoal">
                  ます: {verb.masu}
                </span>
                <SpeakButton text={verb.dict} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group 2 Card Scroll */}
      <div className="mt-2">
        <p className="text-[10px] font-mono text-natural-clay uppercase tracking-widest mb-3 font-bold">Group 2 — Ichidan (一段動詞)</p>
        <div className="flex flex-col gap-3">
          {filterVerb(G2_VERBS).map((verb) => (
            <div 
              key={verb.dict} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-natural-clay/40 transition shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-serif text-2xl font-black text-natural-clay shrink-0 w-16">
                  {verb.dict}
                </span>
                <div>
                  <span className="font-serif text-xs text-natural-charcoal/50 block leading-none">Dict: {verb.reading}</span>
                  <p className="text-xs text-natural-charcoal mt-1.5 font-sans leading-relaxed">
                    Meaning: <strong className="font-medium">{verb.meaning}</strong>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                <span className="bg-natural-bg border border-natural-border px-2.5 py-1 rounded-xl text-xs font-serif font-bold text-natural-charcoal">
                  て: {verb.te}
                </span>
                <span className="bg-natural-bg border border-natural-border px-2.5 py-1 rounded-xl text-xs font-serif font-bold text-natural-charcoal">
                  ます: {verb.masu}
                </span>
                <SpeakButton text={verb.dict} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group 3 */}
      <div className="mt-2">
        <p className="text-[10px] font-mono text-natural-terracotta uppercase tracking-widest mb-3 font-bold">Group 3 — Irregular (不規則動詞)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { dict: "する", te: "して", masu: "します", meaning: "to do", reading: "する" },
            { dict: "くる (来る)", te: "きて", masu: "きます", meaning: "to come", reading: "くる" },
          ].map((v) => (
            <div key={v.dict} className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 flex flex-col gap-3 hover:border-natural-clay/40 transition shadow-xs">
              <div className="flex justify-between items-center border-b border-natural-border/40 pb-2">
                <span className="font-serif text-2xl text-natural-forest font-black">{v.dict}</span>
                <SpeakButton text={v.reading} />
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <p className="font-serif text-natural-charcoal">て-form: <strong className="text-natural-clay font-bold">{v.te}</strong></p>
                <p className="font-serif text-natural-charcoal">ます-form: <strong className="text-natural-forest font-bold">{v.masu}</strong></p>
                <p className="text-natural-charcoal/60 mt-1 font-sans">Meaning: {v.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CalloutBox type="warning">
        <strong>Tricky Stems (Impostors):</strong> These verbs look exactly like Group 2 (-る ending preceded by i/e vowels) but conjugate as <strong>Group 1</strong>. Memorise them!
        <br />
        <span className="font-serif font-black">帰る (かえる - to return)</span> · <span className="font-serif font-black">切る (きる - to cut)</span> · <span className="font-serif font-black">知る (しる - to know)</span> · <span className="font-serif font-black">入る (はいる - to enter)</span>
      </CalloutBox>
    </div>
  );
}

// ─── TAB: ADJECTIVES ──────────────────────────────────────────────────────────

const I_ADJ = [
  { dict: "大きい", reading: "おおきい", neg: "大きくない", past: "大きかった", pastNeg: "大きくなかった", noun: "大きい+N", meaning: "big" },
  { dict: "小さい", reading: "ちいさい", neg: "小さくない", past: "小さかった", pastNeg: "小さくなかった", noun: "小さい+N", meaning: "small" },
  { dict: "高い", reading: "たかい", neg: "高くない", past: "高かった", pastNeg: "高くなかった", noun: "高い+N", meaning: "tall / expensive" },
  { dict: "安い", reading: "やすい", neg: "安くない", past: "安かった", pastNeg: "安くなかった", noun: "安い+N", meaning: "cheap" },
  { dict: "新しい", reading: "あたらしい", neg: "新しくない", past: "新しかった", pastNeg: "新しくなかった", noun: "新しい+N", meaning: "new" },
  { dict: "古い", reading: "ふるい", neg: "古くない", past: "古かった", pastNeg: "古くなかった", noun: "古い+N", meaning: "old (thing)" },
  { dict: "いい / 良い", reading: "いい / よい", neg: "よくない ★", past: "よかった ★", pastNeg: "よくなかった ★", noun: "いい+N", meaning: "good (special irregular!)" },
  { dict: "難しい", reading: "むずかしい", neg: "難しくない", past: "難しかった", pastNeg: "難しくなかった", noun: "難しい+N", meaning: "difficult" },
];

const NA_ADJ = [
  { dict: "静か", reading: "しずか", neg: "静かじゃない", past: "静かだった", pastNeg: "静かじゃなかった", noun: "静かな+N", meaning: "quiet" },
  { dict: "元気", reading: "げんき", neg: "元気じゃない", past: "元気だった", pastNeg: "元気じゃなかった", noun: "元気な+N", meaning: "healthy / energetic" },
  { dict: "便利", reading: "べんり", neg: "便利じゃない", past: "便利だった", pastNeg: "便利じゃなかった", noun: "便利な+N", meaning: "convenient" },
  { dict: "有名", reading: "ゆうめい", neg: "有名じゃない", past: "有名だった", pastNeg: "有名じゃなかった", noun: "有名な+N", meaning: "famous" },
  { dict: "好き", reading: "すき", neg: "好きじゃない", past: "好きだった", pastNeg: "好きじゃなかった", noun: "好きな+N", meaning: "liked / favorite" },
  { dict: "嫌い", reading: "きらい", neg: "嫌いじゃない", past: "嫌いだった", pastNeg: "嫌いじゃなかった", noun: "嫌いな+N", meaning: "disliked" },
];

function AdjectivesTab({ showRomaji }: { showRomaji: boolean }) {
  const [q, setQ] = useState("");
  const filterAdj = (adjs: typeof I_ADJ) =>
    !q ? adjs : adjs.filter(r => [r.dict, r.reading, r.meaning].some(s => s.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex flex-col gap-5">
      <SearchBar value={q} onChange={setQ} />

      {/* い-adj */}
      <div>
        <p className="text-[10px] font-mono text-natural-forest uppercase tracking-widest mb-3 font-bold">い-Adjectives (Keiyoushi)</p>
        <div className="flex flex-col gap-4">
          {filterAdj(I_ADJ).map((row) => (
            <div 
              key={row.dict} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 flex flex-col gap-3 hover:border-natural-clay/40 transition shadow-xs relative"
            >
              <div className="flex justify-between items-center border-b border-natural-border/40 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-2xl font-black text-natural-forest">{row.dict}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-natural-forest/10 border border-natural-forest/20 text-natural-forest rounded-md font-bold">
                    い-type
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-natural-charcoal/50 italic font-sans font-medium">{row.meaning}</span>
                  <SpeakButton text={row.dict} />
                </div>
              </div>

              {/* Conjugation breakdown table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-serif mt-1">
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Negative</span>
                  <strong className="text-natural-charcoal">{row.neg}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Past</span>
                  <strong className="text-natural-charcoal">{row.past}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Past Neg</span>
                  <strong className="text-natural-charcoal">{row.pastNeg}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Before Noun</span>
                  <strong className="text-natural-forest">{row.noun}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CalloutBox type="zap">
          <strong>The Irregular Adjective:</strong> いい (Good) conjugates entirely using its ancient root <strong>よい (良い)</strong> in all forms: <span className="font-serif">よくない (negative)</span>, <span className="font-serif">よかった (past)</span>, and <span className="font-serif">よくなかった (past negative)</span>.
        </CalloutBox>
      </div>

      {/* な-adj */}
      <div className="mt-2">
        <p className="text-[10px] font-mono text-natural-clay uppercase tracking-widest mb-3 font-bold font-bold">な-Adjectives (Keiyoudoushi)</p>
        <div className="flex flex-col gap-4">
          {filterAdj(NA_ADJ).map((row) => (
            <div 
              key={row.dict} 
              className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 flex flex-col gap-3 hover:border-natural-clay/40 transition shadow-xs relative"
            >
              <div className="flex justify-between items-center border-b border-natural-border/40 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-2xl font-black text-natural-clay">{row.dict}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-natural-clay/10 border border-natural-clay/20 text-natural-clay rounded-md font-bold">
                    な-type
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-natural-charcoal/50 italic font-sans font-medium">{row.meaning}</span>
                  <SpeakButton text={row.dict} />
                </div>
              </div>

              {/* Conjugation breakdown table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-serif mt-1">
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Negative</span>
                  <strong className="text-natural-charcoal">{row.neg}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Past</span>
                  <strong className="text-natural-charcoal">{row.past}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Past Neg</span>
                  <strong className="text-natural-charcoal">{row.pastNeg}</strong>
                </div>
                <div className="p-2 bg-natural-bg/50 border border-natural-border/45 rounded-xl text-center">
                  <span className="text-[9px] font-mono uppercase text-natural-forest-light tracking-wide block mb-0.5">Before Noun</span>
                  <strong className="text-natural-clay">{row.noun}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CalloutBox type="warning">
          <strong>The Traitorous Stems:</strong> These adjectives end in the letter <strong>い</strong> but are mathematically categorized as <strong>な-adjectives</strong>. Connect them with な!
          <br />
          <span className="font-serif font-black">きれい (pretty/clean)</span> · <span className="font-serif font-black">嫌い (disliked)</span> · <span className="font-serif font-black">有名 (famous)</span> · <span className="font-serif font-black">親切 (kind)</span>
        </CalloutBox>
      </div>
    </div>
  );
}

// ─── TAB: PARTICLES ───────────────────────────────────────────────────────────

const PARTICLES = [
  {
    particle: "は",
    reading: "wa",
    core: "Topic Marker",
    example: "私は学生です。",
    exReading: "わたしは がくせいです",
    exMeaning: "I am a student. (As for me, I'm a student.)",
    mistake: "Indicates the general topic of conversation. Written as 'ha' but pronounced 'wa'.",
  },
  {
    particle: "が",
    reading: "ga",
    core: "Subject Marker",
    example: "猫が好きです。",
    exReading: "ねこが すきです",
    exMeaning: "I like cats. (Cats are the ones that are liked.)",
    mistake: "Specifies the exact subject doing the action or receiving the liking/knowing. Highly paired with 好き/嫌い/わかる/ある/いる.",
  },
  {
    particle: "を",
    reading: "wo",
    core: "Direct Object Marker",
    example: "ご飯を食べます。",
    exReading: "ごはんを たべます",
    exMeaning: "I eat rice.",
    mistake: "Follows the noun that directly undergoes the physical action of the verb.",
  },
  {
    particle: "に",
    reading: "ni",
    core: "Target / Direction / Specific Time",
    example: "学校に行きます。3時に来ます。",
    exReading: "がっこうに いきます。さんじに きます。",
    exMeaning: "I go to school. / I will arrive at 3 o'clock.",
    mistake: "Marks static position, point-in-time boundaries, and the landing destination of travel.",
  },
  {
    particle: "で",
    reading: "de",
    core: "Active Location / Means / Tool",
    example: "学校で勉強します。バスで行きます。",
    exReading: "がっこうで べんきょうします。バスで いきます。",
    exMeaning: "I study at school. / I travel by bus.",
    mistake: "Identifies where an action occurs, or the physical tool/means used to execute it.",
  },
  {
    particle: "へ",
    reading: "e",
    core: "Direction of Journey",
    example: "東京へ行きます。",
    exReading: "とうきょうへ いきます",
    exMeaning: "I travel toward Tokyo.",
    mistake: "Focuses on the route and path of transit. Pronounced 'e'. Highly interchangeable with に for transit.",
  },
  {
    particle: "の",
    reading: "no",
    core: "Possession / Noun Link",
    example: "私の本です。",
    exReading: "わたしの ほんです",
    exMeaning: "It is my book.",
    mistake: "Glues two nouns together. The first noun modifies or owns the second.",
  },
  {
    particle: "と",
    reading: "to",
    core: "Complete List 'And' / Partner",
    example: "友達と行きます。",
    exReading: "ともだちと いきます",
    exMeaning: "I will go with a friend.",
    mistake: "Lists an exhaustive set of things, or defines who you are executing an action with.",
  },
  {
    particle: "も",
    reading: "mo",
    core: "Inclusive 'Also / Too'",
    example: "私も学生です。",
    exReading: "わたしも がくせいです",
    exMeaning: "I am also a student.",
    mistake: "Replaces standard は, が, or を particles to indicate inclusion. Never pair them together.",
  },
  {
    particle: "から",
    reading: "kara",
    core: "Starting Point / Because",
    example: "東京から来ました。",
    exReading: "とうきょうから きました",
    exMeaning: "I came from Tokyo.",
    mistake: "Marks the origin point of space or time, or serves as a casual causal 'because' connector.",
  },
  {
    particle: "まで",
    reading: "made",
    core: "Boundary 'Until / Up to'",
    example: "5時まで働きます。",
    exReading: "ごじまで はたらきます",
    exMeaning: "I will work until 5 o'clock.",
    mistake: "Identifies the terminal limit of space or time. Frequently paired with から.",
  },
];

function ParticlesTab({ showRomaji }: { showRomaji: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return PARTICLES;
    const lq = q.toLowerCase();
    return PARTICLES.filter(r =>
      [r.particle, r.reading, r.core, r.example, r.exMeaning, r.mistake].some(s => s.toLowerCase().includes(lq))
    );
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={q} onChange={setQ} />
      
      <CalloutBox type="tip">
        <strong>は vs が Mastery:</strong> は sets the general background topic ("as for me..."). が isolates the precise actor ("this person is the one who...").
        <br />
        <span className="font-serif">私は猫が好きです</span> (As for me, cats are liked).
      </CalloutBox>

      <div className="flex flex-col gap-5">
        {filtered.map((p) => (
          <div 
            key={p.particle} 
            className="bg-natural-card border-2 border-natural-border/70 rounded-[2rem] p-5 hover:border-natural-clay/40 transition shadow-xs flex flex-col md:flex-row gap-4 relative overflow-hidden"
          >
            {/* Ink hanko seal under particle */}
            <div className="absolute top-4 right-4 pointer-events-none opacity-[0.12]">
              <span className="font-serif font-black text-4xl text-natural-clay border-2 border-double border-natural-clay rounded px-2.5 py-0.5 inline-block rotate-12">
                印
              </span>
            </div>

            <div className="flex md:flex-col items-center justify-between md:justify-center shrink-0 border-b md:border-b-0 md:border-r border-natural-border/40 pb-3 md:pb-0 md:pr-4 min-w-[85px]">
              <div className="text-center flex flex-col items-center">
                <span className="font-serif text-4xl text-natural-forest font-black leading-none">{p.particle}</span>
                {showRomaji && (
                  <span className="font-mono text-[10px] text-natural-forest-light font-bold mt-1.5 uppercase tracking-wider">({p.reading})</span>
                )}
              </div>
              <div className="mt-2 flex justify-center">
                <SpeakButton text={p.particle} />
              </div>
            </div>

            <div className="flex-grow flex flex-col gap-2 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-natural-clay font-extrabold">{p.core}</span>
              
              {/* Calligraphy guideline box */}
              <div className="bg-natural-bg/50 border-2 border-dashed border-natural-border/60 rounded-2xl p-3 relative overflow-hidden">
                <span className="font-serif text-[15px] font-extrabold text-natural-charcoal block leading-relaxed">{p.example}</span>
                {showRomaji && (
                  <span className="font-sans text-[11px] text-natural-charcoal/50 block mt-0.5">{p.exReading}</span>
                )}
                <span className="font-sans text-xs text-natural-forest/80 italic block mt-1.5 font-medium">
                  {p.exMeaning}
                </span>
              </div>

              <p className="text-xs text-natural-charcoal/70 leading-relaxed font-sans mt-0.5">
                {p.mistake}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "counters", label: "Counters", emoji: "🔢" },
  { id: "numbers", label: "Numbers", emoji: "💯" },
  { id: "time", label: "Time & Date", emoji: "🕐" },
  { id: "verbs", label: "Verb Conjugations", emoji: "⚡" },
  { id: "adjectives", label: "Adjectives", emoji: "🎨" },
  { id: "particles", label: "Particles", emoji: "🔗" },
];

export default function ReferenceCharts({ onBack, speakJapanese }: ReferenceChartsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("counters");
  const [showSandbox, setShowSandbox] = useState<boolean>(false);

  // ── Romaji visibility (shared preference with Grammar Dojo) ────────────────
  const [showRomaji, setShowRomaji] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("astra_show_romaji");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (e) { }
    return true; // N5 beginners need it visible by default
  });

  useEffect(() => {
    try {
      localStorage.setItem("astra_show_romaji", String(showRomaji));
    } catch (e) { }
  }, [showRomaji]);

  const renderTab = () => {
    switch (activeTab) {
      case "counters": return <CountersTab />;
      case "numbers": return <NumbersTab />;
      case "time": return <TimeTab showRomaji={showRomaji} />;
      case "verbs": return <VerbsTab showRomaji={showRomaji} />;
      case "adjectives": return <AdjectivesTab showRomaji={showRomaji} />;
      case "particles": return <ParticlesTab showRomaji={showRomaji} />;
    }
  };

  return (
    <SpeakContext.Provider value={speakJapanese}>
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="bg-natural-card/35 border-2 border-natural-border/30 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl hover:shadow-[0_20px_50px_rgba(188,163,240,0.15)] w-full flex flex-col gap-5 select-none transition-all duration-500"
    >
      
      {/* Immersive Header inside the Panel */}
      <div className="border-b border-natural-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-natural-forest/80 hover:text-natural-forest hover:border-natural-forest/50 px-3 py-1.5 rounded-xl bg-natural-card border border-natural-border shadow-xs transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Exit Room
            </button>
            
            <button
              type="button"
              onClick={() => setShowRomaji((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-mono font-bold transition cursor-pointer shadow-xs ${
                showRomaji
                  ? "bg-natural-forest/15 border-natural-forest text-natural-forest"
                  : "bg-natural-card border-natural-border text-natural-charcoal/50 hover:border-natural-forest/50"
              }`}
              title={showRomaji ? "Hide romaji readings" : "Show romaji readings"}
            >
              {showRomaji ? "A Hide Romaji" : "ふ Show Romaji"}
            </button>

            <button
              type="button"
              onClick={() => setShowSandbox(true)}
              className="flex items-center gap-1.5 rounded-full bg-natural-clay/10 border-2 border-natural-clay/40 text-natural-clay hover:bg-natural-clay/20 px-3 py-1 text-xs font-mono font-black transition cursor-pointer shadow-xs animate-pulse-slow"
              title="Open Interactive Constructor Sandbox"
            >
              🛠️ Mastery Sandbox
            </button>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <h1 className="font-serif font-black text-2xl text-natural-forest leading-none flex items-center sm:justify-end gap-1.5">
              <span>参考図</span>
              <span className="text-xs bg-natural-clay/10 text-natural-clay border border-natural-clay/20 px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-extrabold">Reference</span>
            </h1>
            <p className="text-[10px] font-mono text-natural-forest/60 uppercase tracking-widest mt-1 font-bold">N5 Tables & Grammar Ledgers</p>
          </div>

        </div>

        {/* Gorgeous Wooden-Style Tab Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-mono font-extrabold whitespace-nowrap transition-all duration-300 shrink-0 border-2 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-natural-forest text-natural-bg border-natural-forest scale-102 shadow-[0_0_20px_rgba(167,136,255,0.65)] ring-2 ring-natural-forest/20 dark:shadow-[0_0_25px_rgba(167,136,255,0.85)]"
                  : "bg-natural-card/45 text-natural-charcoal border-natural-border/40 hover:border-natural-forest/40 hover:bg-natural-forest/10 shadow-xs"
              }`}
            >
              <span className="text-sm">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Immersive Scroll Content */}
      <div className="w-full flex flex-col gap-5">
        
        {/* INTERACTIVE WORKBENCH CALLOUT BANNER */}
        <div className="bg-natural-card/35 border-2 border-natural-border/30 backdrop-blur-md rounded-[2.5rem] p-5 relative overflow-hidden shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-natural-clay/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 text-left">
            <span className="text-2.5xl p-2.5 rounded-2xl bg-natural-clay/10 border border-natural-clay/20 text-natural-clay shrink-0 self-center">🛠️</span>
            <div>
              <h4 className="font-serif font-black text-sm text-natural-forest leading-tight">
                Want to practice these structures in real-time?
              </h4>
              <p className="text-xs text-natural-charcoal/70 font-sans mt-1 leading-relaxed">
                Open the interactive <strong>Mastery Sandbox</strong> to build custom counting quantities, practice verb conjugation shifts step-by-step, or view the complete 31-day ledger!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSandbox(true)}
            className="px-5 py-2.5 rounded-2xl bg-natural-clay text-natural-bg hover:bg-natural-clay-dark text-xs font-mono font-black tracking-wider shadow-md hover:shadow-lg transition cursor-pointer shrink-0 w-full sm:w-auto text-center"
          >
            Open Sandbox Workbench
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.18 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative Traditional Footer */}
      <div className="py-4 text-center border-t border-natural-border/40">
        <span className="text-[9px] font-mono text-natural-forest/45 uppercase tracking-widest block font-bold">
          🔊 Hear native pronunciation by clicking the speaker icon · Continuous review breeds mastery
        </span>
      </div>

      {/* Immersive Workbench Right Drawer */}
      <AnimatePresence>
        {showSandbox && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSandbox(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 180, damping: 28 }}
              className="fixed top-0 right-0 h-full z-50 w-[420px] max-w-[92vw] overflow-y-auto bg-white/5 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.35)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10"
            >
              <button
                type="button"
                onClick={() => setShowSandbox(false)}
                className="fixed top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/10 border border-white/10 text-natural-charcoal hover:bg-white/15 hover:text-natural-forest transition cursor-pointer flex items-center justify-center shadow-sm"
                title="Close Mastery Sandbox"
                aria-label="Close Mastery Sandbox"
              >
                <X className="h-4 w-4" />
              </button>
              <InteractiveWorkbench onClose={() => setShowSandbox(false)} speakJapanese={speakJapanese} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
    </SpeakContext.Provider>
  );
}
